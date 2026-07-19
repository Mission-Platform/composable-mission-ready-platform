//! Dependency-free 2D matrix barcode encoder, compiled to WebAssembly for
//! `@mission-platform/matrix-code` via `wasm-bindgen` / `wasm-pack`.
//!
//! The public surface is the `wasm-bindgen` function [`encode`], which renders
//! a 2D symbology + payload into a packed `[width, height, ...modules]` buffer
//! (row-major, `1` = dark). The TypeScript wrapper (importing `generated/encode`)
//! turns that into an SVG. Shared Reed-Solomon arithmetic lives in the
//! `mission-platform-matrix-code-common` crate.
//!
//! Supported symbologies are Data Matrix (ECC 200) — both the square symbols
//! (10×10 … 26×26) and the rectangular symbols (8×18 … 16×48), plus the GS1
//! Data Matrix variant — and Aztec Code (compact, 1–4 layers).
//!
//! Building with the optional `console` feature installs a panic hook and a
//! `tracing-wasm` subscriber that routes `tracing` events to the browser
//! devtools console for debugging.

mod aztec;
mod datamatrix;

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

/// Encode `data` into the 2D `symbology` as a packed `[width, height, ...modules]`
/// buffer (row-major, `1` = dark), where `width`/`height` are the symbol's edge
/// lengths in modules (no quiet zone; equal for the square symbologies).
///
/// Supported `symbology` values (case-insensitive): `datamatrix`,
/// `gs1datamatrix`, `datamatrixrectangular`, `aztec`.
///
/// Returns `undefined` (JS) when the symbology is unknown or the payload is
/// invalid for it (empty, or too large for the supported symbols).
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
    match normalised.as_str() {
        "datamatrix" => datamatrix::encode(data),
        "gs1datamatrix" | "gs1-datamatrix" | "gs1_datamatrix" => datamatrix::encode_gs1(data),
        "datamatrixrectangular"
        | "datamatrix-rectangular"
        | "datamatrix_rectangular"
        | "rectangulardatamatrix" => datamatrix::encode_rectangular(data),
        "aztec" => aztec::encode(data),
        other => {
            tracing::trace!("encode_modules: unknown symbology {other:?}");
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::encode_modules;

    #[test]
    #[tracing::instrument(skip_all)]
    fn dispatches_datamatrix_case_insensitively() {
        let lower = encode_modules("datamatrix", "HELLO").expect("lowercase symbology");
        let mixed = encode_modules("DataMatrix", "HELLO").expect("mixed-case symbology");
        assert_eq!(lower, mixed, "symbology matching is case-insensitive");
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn dispatches_rectangular_data_matrix() {
        // The rectangular Data Matrix header is width ≠ height.
        let rectangular = encode_modules("datamatrixrectangular", "HELLO").expect("rectangular");
        assert_ne!(rectangular[0], rectangular[1], "rectangular symbol is not square");
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn dispatches_aztec_as_a_square_symbol() {
        // Aztec is square (width == height).
        let aztec = encode_modules("aztec", "HELLO").expect("aztec");
        assert_eq!(aztec[0], aztec[1], "aztec symbol is square");
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn returns_none_for_unknown_symbology() {
        assert!(encode_modules("pdf417", "HELLO").is_none());
        assert!(encode_modules("", "HELLO").is_none());
    }
}
