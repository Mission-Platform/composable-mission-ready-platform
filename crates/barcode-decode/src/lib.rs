//! 1D (linear) barcode decoder for `@mission-platform/barcode`, compiled to
//! WebAssembly via `wasm-bindgen` / `wasm-pack`.
//!
//! Given a clean (noise-free) run of module bits (`1` = bar, `0` = space) and a
//! symbology, [`decode`] reconstructs the original payload — the inverse of
//! `mission-platform-barcode-encode`. Each symbology has a dedicated module that
//! mirrors the encoder's tables, reusing the shared primitives from
//! `mission-platform-barcode-common` (run-length collapse, the Code 93 tables
//! and the full-ASCII shift table).
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
mod widths;

#[cfg(feature = "wasm-api")]
use wasm_bindgen::prelude::*;

// Build-time metadata captured by `shadow-rs` (see `build.rs`): crate version,
// git commit, build timestamp, Rust toolchain, …
shadow_rs::shadow!(build);

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

/// A human-readable build stamp: `"<version> (<commit>) built <time> with <rustc>"`.
/// Sourced from `shadow-rs` build-time information.
// #[wasm_bindgen]
// #[tracing::instrument(skip_all)]
// pub fn build_info() -> String {
//     format!(
//         "{} ({}) built {} with {}",
//         build::PKG_VERSION,
//         build::SHORT_COMMIT,
//         build::BUILD_TIME,
//         build::RUST_VERSION,
//     )
// }

/// Decode a run of module bits (`1` = bar, `0` = space) of the linear
/// `symbology` back into its payload.
///
/// Supported `symbology` values (case-insensitive): `code128`, `gs1-128`,
/// `code39`, `code39ext`, `code93`, `code93ext`, `ean13`, `ean8`, `upca`,
/// `upce`, `itf`, `itf14`, `codabar`, `msi`, `pharmacode`.
///
/// Returns `undefined` (JS) when the symbology is unknown or the module run is
/// not a valid symbol of that symbology (bad framing, patterns or check).
///
/// The `wasm-bindgen` wrapper over [`decode_modules`]; gated behind the
/// `wasm-api` feature so the export is present in this crate's own wasm build
/// but absent when the crate is linked into another cdylib (e.g. the scanner),
/// where a duplicate `decode`/`start` export would clash.
#[cfg(feature = "wasm-api")]
#[wasm_bindgen]
#[tracing::instrument(skip_all)]
pub fn decode(symbology: &str, modules: &[u8]) -> Option<String> {
    decode_modules(symbology, modules)
}

/// Native entry point shared by [`decode`] and the unit / round-trip tests.
#[tracing::instrument(skip_all)]
pub fn decode_modules(symbology: &str, modules: &[u8]) -> Option<String> {
    let normalised = symbology.to_ascii_lowercase();
    tracing::debug!(
        "decode_modules: symbology={normalised:?} module_len={}",
        modules.len()
    );
    match normalised.as_str() {
        "code128" | "gs1-128" | "gs1128" | "ean128" => code128::decode(modules),
        "code39" => code39::decode(modules, false),
        "code39ext" | "code39extended" => code39::decode(modules, true),
        "code93" => code93::decode(modules, false),
        "code93ext" | "code93extended" => code93::decode(modules, true),
        "ean13" => ean::decode_ean13(modules),
        "ean8" => ean::decode_ean8(modules),
        "upca" => ean::decode_upca(modules),
        "upce" => ean::decode_upce(modules),
        "itf" | "itf14" => itf::decode(modules),
        "codabar" => codabar::decode(modules),
        "msi" => msi::decode(modules),
        "pharmacode" => pharmacode::decode(modules),
        other => {
            tracing::trace!("decode_modules: unknown symbology {other:?}");
            None
        }
    }
}

#[cfg(all(test, not(target_arch = "wasm32")))]
mod tests {
    use super::decode_modules;
    use mission_platform_barcode_encode::encode_modules;

    /// Encode `data` in `symbology`, decode the module run back, and assert that
    /// re-encoding the decoded payload reproduces the original modules. This
    /// verifies the decoder is a true inverse up to the symbology's canonical
    /// form (recomputed check digits, upper-casing, default number systems, …).
    fn assert_round_trips(symbology: &str, data: &str) {
        let modules = encode_modules(symbology, data)
            .unwrap_or_else(|| panic!("encode {symbology} {data:?}"));
        let decoded = decode_modules(symbology, &modules)
            .unwrap_or_else(|| panic!("decode {symbology} {data:?}"));
        let re_encoded = encode_modules(symbology, &decoded)
            .unwrap_or_else(|| panic!("re-encode {symbology} {decoded:?}"));
        assert_eq!(
            modules, re_encoded,
            "{symbology}: decoded {decoded:?} must re-encode to the same modules"
        );
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn round_trips_every_supported_symbology() {
        let cases: [(&str, &str); 15] = [
            ("code128", "ABC-123"),
            ("gs1-128", "0102345678901234"),
            ("code39", "HELLO-39"),
            ("code39ext", "Hello, World!"),
            ("code93", "CODE93"),
            ("code93ext", "Hello, World!"),
            ("ean13", "5901234123457"),
            ("ean8", "9638507"),
            ("upca", "03600029145"),
            ("upce", "0123456"),
            ("itf", "123456"),
            ("itf14", "1234567890123"),
            ("codabar", "123-456"),
            ("msi", "1234567"),
            ("pharmacode", "1234"),
        ];
        for (symbology, data) in cases {
            assert_round_trips(symbology, data);
        }
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn code39_extended_recovers_exact_text() {
        let modules = encode_modules("code39ext", "Mission-42!").expect("encode");
        assert_eq!(decode_modules("code39ext", &modules).as_deref(), Some("Mission-42!"));
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn ean13_recovers_all_thirteen_digits() {
        let modules = encode_modules("ean13", "5901234123457").expect("encode");
        assert_eq!(
            decode_modules("ean13", &modules).as_deref(),
            Some("5901234123457")
        );
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn rejects_unknown_symbology_and_garbage() {
        assert!(decode_modules("datamatrix", &[1, 0, 1]).is_none());
        assert!(decode_modules("code128", &[1, 0, 1, 1, 0]).is_none());
        assert!(decode_modules("ean13", &[1; 40]).is_none());
    }

    /// ITF has no check digit and a trivial start/stop, so a short run trivially
    /// "decodes" to a spurious value — the source of the corpus false positives
    /// where a scan line across a QR/other symbol produced a 2- or 4-digit ITF.
    /// A well-formed but too-short ITF must now be rejected, while a legitimate
    /// six-digit (or longer) ITF still decodes. See `itf::MIN_DIGITS`.
    #[test]
    #[tracing::instrument(skip_all)]
    fn itf_rejects_runs_shorter_than_six_digits() {
        for short in ["12", "1234"] {
            let modules = encode_modules("itf", short).expect("encode short itf");
            assert!(
                decode_modules("itf", &modules).is_none(),
                "{short:?}: a sub-six-digit ITF must be rejected as a likely false positive"
            );
        }
        // The smallest legitimate ITF length still reads back exactly.
        let modules = encode_modules("itf", "123456").expect("encode itf");
        assert_eq!(decode_modules("itf", &modules).as_deref(), Some("123456"));
    }
}
