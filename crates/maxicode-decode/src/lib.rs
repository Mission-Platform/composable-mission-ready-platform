//! MaxiCode decoder for `@mission-platform/code-scanner`, compiled to
//! WebAssembly via `wasm-bindgen` / `wasm-pack`.
//!
//! The image-side work — locating the central bullseye and sampling the 30×33
//! hexagonal module grid — lives in the scanner crate's `maxicode` locator,
//! which reduces a symbol to a flat `30 × 33` array of module bits (`1` = dark,
//! row-major). [`decode_maxicode_modules`] takes that array, reads the 144
//! six-bit codewords via the shared [`mission_platform_maxicode_common::BITNR`]
//! map, applies the mode-appropriate GF(64) Reed-Solomon correction, and runs
//! the high-level bit-stream parser to recover the payload.
//!
//! Building with the optional `console` feature installs a panic hook and a
//! `tracing-wasm` subscriber.

mod bitstream;

use mission_platform_maxicode_common::{correct, read_codewords, HEIGHT, TOTAL_CODEWORDS, WIDTH};

#[cfg(feature = "wasm-api")]
use wasm_bindgen::prelude::*;

/// Reed-Solomon correction mode for a codeword block: every codeword, or only
/// the even/odd interleave.
const ALL: usize = 0;
const EVEN: usize = 1;
const ODD: usize = 2;

/// Initialise optional in-browser diagnostics when built with the `console`
/// feature. A no-op otherwise.
#[cfg(all(feature = "wasm-api", feature = "console"))]
#[tracing::instrument(skip_all)]
#[wasm_bindgen(start)]
pub fn start() {
    mission_platform_console_panic_hook::set_once();
    tracing_wasm::set_as_global_default();
}

/// Decode a MaxiCode `30 × 33` module-bit grid (`1` = dark, row-major),
/// returning the payload or `undefined` (JS). The `wasm-bindgen` wrapper over
/// [`decode_maxicode_modules`]; gated behind `wasm-api` so it is absent when the
/// crate is linked into another cdylib (e.g. the scanner).
#[cfg(feature = "wasm-api")]
#[wasm_bindgen]
#[tracing::instrument(skip_all)]
pub fn decode(modules: &[u8]) -> Option<String> {
    decode_maxicode_modules(modules)
}

/// Decode a MaxiCode symbol from its `WIDTH × HEIGHT` (30 × 33) grid of module
/// bits (`modules[y * WIDTH + x]`, non-zero = dark), returning the payload
/// string, or `None` when the grid is the wrong size or error correction /
/// parsing fails.
#[tracing::instrument(skip_all)]
pub fn decode_maxicode_modules(modules: &[u8]) -> Option<String> {
    if modules.len() != WIDTH * HEIGHT {
        return None;
    }
    let bits: Vec<bool> = modules.iter().map(|&m| m != 0).collect();
    let mut codewords = read_codewords(&bits);
    decode_codewords(&mut codewords)
}

/// Correct and decode the 144 six-bit codewords of a MaxiCode symbol. Port of
/// ZXing `Decoder.decode`.
fn decode_codewords(codewords: &mut [u8; TOTAL_CODEWORDS]) -> Option<String> {
    // Primary message block: 10 data + 10 EC, corrected as a whole.
    correct_errors(codewords, 0, 10, 10, ALL)?;
    let mode = (codewords[0] & 0x0F) as usize;

    let data_len = match mode {
        2 | 3 | 4 => {
            // Secondary block: 84 data + 40 EC, interleaved even/odd.
            correct_errors(codewords, 20, 84, 40, EVEN)?;
            correct_errors(codewords, 20, 84, 40, ODD)?;
            94
        }
        5 => {
            correct_errors(codewords, 20, 68, 56, EVEN)?;
            correct_errors(codewords, 20, 68, 56, ODD)?;
            78
        }
        _ => return None,
    };

    // Assemble the datawords: primary 10 codewords, then the secondary data.
    let mut datawords = vec![0u8; data_len];
    datawords[..10].copy_from_slice(&codewords[..10]);
    datawords[10..].copy_from_slice(&codewords[20..20 + (data_len - 10)]);

    bitstream::decode(&datawords, mode)
}

/// Correct a codeword block in place. Port of ZXing `Decoder.correctErrors`:
/// gather the codewords selected by `mode` (all, or the even/odd interleave)
/// into one Reed-Solomon codeword, correct it, and copy the data portion back.
/// Returns `None` when the block is uncorrectable.
fn correct_errors(
    codewords: &mut [u8],
    start: usize,
    data_codewords: usize,
    ec_codewords: usize,
    mode: usize,
) -> Option<usize> {
    let total = data_codewords + ec_codewords;
    let divisor = if mode == ALL { 1 } else { 2 };

    let mut block: Vec<u8> = Vec::with_capacity(total / divisor);
    for i in 0..total {
        if mode == ALL || i % 2 == (mode - 1) {
            block.push(codewords[i + start]);
        }
    }

    let corrected = correct(&mut block, ec_codewords / divisor)?;

    // Copy only the data portion back (errors in EC codewords don't matter).
    for i in 0..data_codewords {
        if mode == ALL || i % 2 == (mode - 1) {
            codewords[i + start] = block[i / divisor];
        }
    }
    Some(corrected)
}

#[cfg(all(test, not(target_arch = "wasm32")))]
mod tests {
    use super::*;

    #[test]
    fn rejects_wrong_size_grid() {
        assert!(decode_maxicode_modules(&[0u8; 10]).is_none());
        assert!(decode_maxicode_modules(&[]).is_none());
    }
}
