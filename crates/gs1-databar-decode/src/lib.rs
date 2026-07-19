//! GS1 DataBar (RSS) decoder for `@mission-platform/code-scanner`, compiled to
//! WebAssembly via `wasm-bindgen` / `wasm-pack`.
//!
//! Given a single horizontal scan line — a run of module bits (`1` = dark bar,
//! `0` = light space), the same convention as `mission-platform-barcode-decode`
//! — [`decode_databar_modules`] recognises a GS1 DataBar symbol on that line and
//! reconstructs its payload. Unlike the fixed-glyph 1D symbologies, DataBar
//! characters are decoded combinatorially from their element widths, so the
//! decoder measures run lengths directly off the line (tolerating the varying
//! module width of a perspective-warped capture) rather than trusting a single
//! global module unit.
//!
//! This first cut implements **RSS-14** (GS1 DataBar Omnidirectional / Truncated
//! / Stacked). The Expanded family is a separate, larger decoder tracked as the
//! next iteration.
//!
//! Building with the optional `console` feature installs a panic hook and a
//! `tracing-wasm` subscriber that routes `tracing` events to the browser
//! devtools console for debugging.

mod rss14;

#[cfg(feature = "wasm-api")]
use wasm_bindgen::prelude::*;

/// Initialise optional in-browser diagnostics (panic hook + `tracing-wasm`
/// subscriber) when the crate is built with the `console` feature. A no-op
/// otherwise.
#[cfg(all(feature = "wasm-api", feature = "console"))]
#[tracing::instrument(skip_all)]
#[wasm_bindgen(start)]
pub fn start() {
    mission_platform_console_panic_hook::set_once();
    tracing_wasm::set_as_global_default();
}

/// Decode a run of module bits (`1` = dark bar, `0` = light space) as a GS1
/// DataBar scan line, returning the payload or `undefined` (JS).
///
/// The `wasm-bindgen` wrapper over [`decode_databar_modules`]; gated behind the
/// `wasm-api` feature so the export is present in this crate's own wasm build but
/// absent when the crate is linked into another cdylib (e.g. the scanner), where
/// a duplicate `decode`/`start` export would clash.
#[cfg(feature = "wasm-api")]
#[wasm_bindgen]
#[tracing::instrument(skip_all)]
pub fn decode(modules: &[u8]) -> Option<String> {
    decode_databar_modules(modules)
}

/// Native entry point: decode a GS1 DataBar scan line given as module bits
/// (`1` = dark bar). Shared by [`decode`], the scanner and the round-trip tests.
#[tracing::instrument(skip_all)]
pub fn decode_databar_modules(modules: &[u8]) -> Option<String> {
    let row: Vec<bool> = modules.iter().map(|&b| b != 0).collect();
    decode_databar_row(&row)
}

/// Decode a GS1 DataBar scan line given as booleans (`true` = dark bar). This is
/// the natural entry point for an image locator, which measures pixel runs off a
/// row directly.
#[tracing::instrument(skip_all)]
pub fn decode_databar_row(row: &[bool]) -> Option<String> {
    rss14::decode_row(row)
}

#[cfg(all(test, not(target_arch = "wasm32")))]
mod tests {
    use super::*;

    #[test]
    fn rejects_empty_and_garbage() {
        assert!(decode_databar_modules(&[]).is_none());
        assert!(decode_databar_modules(&[1, 0, 1, 0, 1]).is_none());
        assert!(decode_databar_row(&[false; 100]).is_none());
    }
}
