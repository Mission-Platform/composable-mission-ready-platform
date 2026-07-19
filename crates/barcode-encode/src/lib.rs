//! Dependency-free 1D (linear) barcode encoder, compiled to WebAssembly for
//! `@mission-platform/barcode` via `wasm-bindgen` / `wasm-pack`.
//!
//! The public surface is the `wasm-bindgen` function [`encode`], which renders
//! a symbology + payload into a flat run of module bits (`1` = bar, `0` =
//! space), one entry per unit-width module. The TypeScript wrapper (importing
//! `generated/encode`) turns that run into an SVG. Shared width-expansion
//! helpers live in the `mission-platform-barcode-common` crate.
//!
//! Building with the optional `console` feature installs a panic hook and a
//! `tracing-wasm` subscriber that routes `tracing` events to the browser
//! devtools console for debugging.

mod codabar;
mod code128;
mod code39;
mod code93;
mod ean;
mod itf;
mod msi;
mod pharmacode;

use wasm_bindgen::prelude::*;

// Build-time metadata captured by `shadow-rs` (see `build.rs`): crate version,
// git commit, build timestamp, Rust toolchain, …
shadow_rs::shadow!(build);

/// Initialise optional in-browser diagnostics (panic hook + `tracing-wasm`
/// subscriber) when the crate is built with the `console` feature. A no-op
/// otherwise.
#[cfg(feature = "console")]
#[wasm_bindgen(start)]
#[tracing::instrument(skip_all)]
pub fn start() {
    mission_platform_console_panic_hook::set_once();
    tracing_wasm::set_as_global_default();
}

/// A human-readable build stamp: `"<version> (<commit>) built <time> with <rustc>"`.
/// Sourced from `shadow-rs` build-time information.
#[wasm_bindgen]
#[tracing::instrument(skip_all)]
pub fn build_info() -> String {
    format!(
        "{} ({}) built {} with {}",
        build::PKG_VERSION,
        build::SHORT_COMMIT,
        build::BUILD_TIME,
        build::RUST_VERSION,
    )
}

/// Encode `data` into the linear `symbology` as a flat run of module bits
/// (`1` = bar, `0` = space), one entry per unit-width module (no quiet zone).
///
/// Supported `symbology` values (case-insensitive): `code128`, `gs1-128`,
/// `code39`, `code39ext`, `code93`, `code93ext`, `ean13`, `ean8`, `upca`,
/// `upce`, `itf`, `itf14`, `codabar`, `msi`, `pharmacode`.
///
/// Returns `undefined` (JS) when the symbology is unknown or the payload is
/// invalid for it (bad characters, wrong length, …).
#[wasm_bindgen]
#[tracing::instrument(skip_all)]
pub fn encode(symbology: &str, data: &str) -> Option<Vec<u8>> {
    encode_modules(symbology, data)
}

/// Native entry point shared by [`encode`] and the unit tests.
#[tracing::instrument(skip_all)]
pub fn encode_modules(symbology: &str, data: &str) -> Option<Vec<u8>> {
    let normalised = symbology.to_ascii_lowercase();
    tracing::debug!(
        "encode_modules: symbology={normalised:?} data_len={}",
        data.len()
    );
    let modules = match normalised.as_str() {
        "code128" => code128::encode(data),
        "gs1-128" | "gs1128" | "ean128" => code128::encode_gs1_128(data),
        "code39" => code39::encode(data),
        "code39ext" | "code39extended" => code39::encode_extended(data),
        "code93" => code93::encode(data),
        "code93ext" | "code93extended" => code93::encode_extended(data),
        "ean13" => ean::encode_ean13(data),
        "ean8" => ean::encode_ean8(data),
        "upca" => ean::encode_upca(data),
        "upce" => ean::encode_upce(data),
        "itf" => itf::encode(data),
        "itf14" => itf::encode_itf14(data),
        "codabar" => codabar::encode(data),
        "msi" => msi::encode(data),
        "pharmacode" => pharmacode::encode(data),
        other => {
            tracing::trace!("encode_modules: unknown symbology {other:?}");
            None
        }
    };
    tracing::trace!(
        "encode_modules: produced {} module(s)",
        modules.as_ref().map_or(0, Vec::len)
    );
    modules
}

#[cfg(test)]
mod tests {
    use super::encode_modules;

    #[test]
    #[tracing::instrument(skip_all)]
    fn unknown_symbology_returns_none() {
        assert!(encode_modules("qr", "hello").is_none());
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn symbology_matching_is_case_insensitive() {
        let lower = encode_modules("code39", "ABC").expect("lowercase symbology");
        let upper = encode_modules("CODE39", "ABC").expect("upper-case symbology");
        assert_eq!(lower, upper);
    }
}
