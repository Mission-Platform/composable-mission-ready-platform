//! Dependency-free GS1 DataBar (RSS) encoder, compiled to WebAssembly for
//! `@mission-platform/code-scanner` via `wasm-bindgen` / `wasm-pack`.
//!
//! The public surface is [`encode_databar`], which renders a symbology + payload
//! into a flat run of module bits (`1` = dark bar, `0` = light space), one entry
//! per unit-width module. This is the inverse of
//! `mission-platform-gs1-databar-decode` and seeds its round-trip tests.
//!
//! This first cut implements **RSS-14** (GS1 DataBar Omnidirectional); the value
//! is a 14-digit GTIN (an optional check digit is recomputed). The Expanded
//! family is tracked as the next iteration.

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

/// Encode `data` in the GS1 DataBar `symbology` as a flat run of module bits
/// (`1` = dark bar, `0` = light space). Returns `undefined` (JS) for an unknown
/// symbology or invalid payload.
///
/// The `wasm-bindgen` wrapper over [`encode_databar`]; gated behind `wasm-api`.
#[cfg(feature = "wasm-api")]
#[wasm_bindgen]
#[tracing::instrument(skip_all)]
pub fn encode(symbology: &str, data: &str) -> Option<Vec<u8>> {
    encode_databar(symbology, data)
}

/// Native entry point shared by [`encode`] and the round-trip tests.
///
/// Supported `symbology` values (case-insensitive): `databar`, `rss14`,
/// `databar14`, `databar-omni`.
#[tracing::instrument(skip_all)]
pub fn encode_databar(symbology: &str, data: &str) -> Option<Vec<u8>> {
    match symbology.to_ascii_lowercase().as_str() {
        "databar" | "rss14" | "databar14" | "databar-omni" | "databar-omnidirectional" => {
            rss14::encode(data)
        }
        _ => None,
    }
}
