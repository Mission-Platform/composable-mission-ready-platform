//! PDF417 decoder for `@mission-platform/code-scanner`, compiled to WebAssembly
//! via `wasm-bindgen` / `wasm-pack`.
//!
//! The image-side work — locating the symbol, clustering rows and sampling each
//! codeword — lives in the scanner crate's `pdf417` locator, which reduces a
//! symbol to a flat codeword array (`codewords[0]` = data codeword count, data
//! then error-correction codewords). [`decode_pdf417_codewords`] takes that
//! array, applies GF(929) Reed–Solomon correction, and runs the high-level
//! bit-stream parser (Text / Byte / Numeric compaction) to recover the payload.
//!
//! Building with the optional `console` feature installs a panic hook and a
//! `tracing-wasm` subscriber.

mod bitstream;

use mission_platform_pdf417_common::ec_decode;

#[cfg(feature = "wasm-api")]
use wasm_bindgen::prelude::*;

/// Initialise optional in-browser diagnostics when built with the `console`
/// feature. A no-op otherwise.
#[cfg(all(feature = "wasm-api", feature = "console"))]
#[tracing::instrument(skip_all)]
#[wasm_bindgen(start)]
pub fn start() {
    mission_platform_console_panic_hook::set_once();
    tracing_wasm::set_as_global_default();
}

/// Decode a PDF417 codeword array at error-correction `ec_level` (0..8),
/// returning the payload or `undefined` (JS). The `wasm-bindgen` wrapper over
/// [`decode_pdf417_codewords`]; gated behind `wasm-api` so it is absent when the
/// crate is linked into another cdylib (e.g. the scanner).
#[cfg(feature = "wasm-api")]
#[wasm_bindgen]
#[tracing::instrument(skip_all)]
pub fn decode(codewords: &[i32], ec_level: u8) -> Option<String> {
    decode_pdf417_codewords(codewords, ec_level as usize)
}

/// Correct and decode a full PDF417 codeword array (`full[0]` = data codeword
/// count; data codewords then `1 << (ec_level + 1)` EC codewords), returning the
/// payload string, or `None` if error correction or parsing fails.
#[tracing::instrument(skip_all)]
pub fn decode_pdf417_codewords(full: &[i32], ec_level: usize) -> Option<String> {
    if ec_level > 8 || full.len() < 4 {
        return None;
    }
    let num_ec = 1usize << (ec_level + 1);
    if num_ec >= full.len() {
        return None;
    }
    let mut codewords = full.to_vec();
    // Reed–Solomon correction over GF(929) (in place); reject if uncorrectable.
    ec_decode(&mut codewords, num_ec, &[])?;
    verify_codeword_count(&mut codewords, num_ec)?;
    bitstream::decode(&codewords)
}

/// Sanity-check the symbol length descriptor. Port of
/// `PDF417ScanningDecoder.verifyCodewordCount`.
fn verify_codeword_count(codewords: &mut [i32], num_ec: usize) -> Option<()> {
    if codewords.len() < 4 {
        return None;
    }
    let n = codewords[0];
    if n as usize > codewords.len() {
        return None;
    }
    if n == 0 {
        if num_ec < codewords.len() {
            codewords[0] = (codewords.len() - num_ec) as i32;
        } else {
            return None;
        }
    }
    Some(())
}

#[cfg(all(test, not(target_arch = "wasm32")))]
mod tests {
    use super::*;

    #[test]
    fn rejects_short_input() {
        assert!(decode_pdf417_codewords(&[1, 2, 3], 2).is_none());
        assert!(decode_pdf417_codewords(&[], 2).is_none());
    }
}
