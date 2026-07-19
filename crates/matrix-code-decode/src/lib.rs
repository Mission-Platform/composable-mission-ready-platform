//! 2D matrix barcode decoder for `@mission-platform/matrix-code`, compiled to
//! WebAssembly via `wasm-bindgen` / `wasm-pack`.
//!
//! The public surface is the `wasm-bindgen` function [`decode`], the inverse of
//! the `mission-platform-matrix-code-encode` encoder: it takes the packed
//! `[size, ...modules]` buffer the encoder emits and recovers the original
//! payload. The Data Matrix decoding algorithm lives in [`datamatrix`], reusing
//! the shared Reed-Solomon arithmetic from `mission-platform-matrix-code-common`.
//!
//! Building with the optional `console` feature installs a panic hook and a
//! `tracing-wasm` subscriber that routes `tracing` events to the browser
//! devtools console for debugging.

mod aztec;
mod datamatrix;

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

/// Decode a packed `[width, height, ...modules]` matrix (row-major, `1` = dark)
/// of the 2D `symbology` back into its payload. The dependency-free native
/// entry point, shared by the `wasm-bindgen` [`decode`] export and by in-process
/// callers such as `mission-platform-code-scan` (which links this crate directly
/// to decode a located symbol without crossing the wasm↔JS boundary).
///
/// Supported `symbology` values (case-insensitive): `datamatrix`,
/// `gs1datamatrix`, `datamatrixrectangular`, `aztec`. Returns `None` when the
/// symbology is unknown, the buffer is malformed, or the symbol is too damaged
/// to recover.
#[tracing::instrument(skip_all)]
pub fn decode_matrix(symbology: &str, matrix: &[u8]) -> Option<String> {
    tracing::debug!(
        "decode_matrix: symbology={symbology:?} matrix_len={}",
        matrix.len()
    );
    let bytes = decode_bytes(symbology, matrix)?;
    let text = String::from_utf8(bytes).ok();
    tracing::trace!(
        "decode_matrix: {}",
        if text.is_some() {
            "recovered payload"
        } else {
            "undecodable"
        }
    );
    text
}

/// Decode a packed `[size, ...modules]` **square** Data Matrix symbol, treating
/// the modules flagged in `erasures` (a per-module mask over the full symbol
/// grid, row-major, `1` = erased, length `size²`) as **known** low-confidence
/// reads and correcting them as Reed-Solomon erasures — worth twice a blind
/// error, the payoff of the scanner's grey-level sampling.
///
/// Only `datamatrix` / `gs1datamatrix` are erasure-aware (the symbologies the
/// scanner locates); any other `symbology`, or an `erasures` length that does
/// not match `size²`, falls back to the blind [`decode_matrix`].
#[tracing::instrument(skip_all)]
pub fn decode_matrix_with_erasures(
    symbology: &str,
    matrix: &[u8],
    erasures: &[u8],
) -> Option<String> {
    match symbology.to_ascii_lowercase().as_str() {
        "datamatrix" | "gs1datamatrix" | "gs1-datamatrix" | "gs1_datamatrix" => {
            datamatrix::decode_with_erasures(matrix, erasures)
                .and_then(|bytes| String::from_utf8(bytes).ok())
        }
        _ => decode_matrix(symbology, matrix),
    }
}

/// Decode a packed `[width, height, ...modules]` matrix (row-major, `1` = dark)
/// of the 2D `symbology` back into its payload. Returns `undefined` (JS) when
/// the symbology is unknown, the buffer is malformed, or the symbol is too
/// damaged to recover.
///
/// The `wasm-bindgen` wrapper over [`decode_matrix`]; gated behind the
/// `wasm-api` feature so the export is present in this crate's own wasm build
/// but absent when the crate is linked into another cdylib (e.g. the scanner),
/// where a duplicate `decode`/`start` export would clash.
#[cfg(feature = "wasm-api")]
#[wasm_bindgen]
#[tracing::instrument(skip_all)]
pub fn decode(symbology: &str, matrix: &[u8]) -> Option<String> {
    decode_matrix(symbology, matrix)
}

/// Dispatch to the decoder for `symbology`, returning the recovered raw bytes.
/// Shared by [`decode`] and the unit tests.
#[tracing::instrument(skip_all)]
fn decode_bytes(symbology: &str, matrix: &[u8]) -> Option<Vec<u8>> {
    match symbology.to_ascii_lowercase().as_str() {
        "datamatrix" | "gs1datamatrix" | "gs1-datamatrix" | "gs1_datamatrix" => {
            datamatrix::decode(matrix)
        }
        "datamatrixrectangular"
        | "datamatrix-rectangular"
        | "datamatrix_rectangular"
        | "rectangulardatamatrix" => datamatrix::decode_rectangular(matrix),
        "aztec" => aztec::decode(matrix),
        other => {
            tracing::trace!("decode: unknown symbology {other:?}");
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::decode_bytes;

    #[test]
    #[tracing::instrument(skip_all)]
    fn returns_none_for_unknown_symbology() {
        assert!(decode_bytes("pdf417", &[10, 0, 1, 1, 0]).is_none());
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn returns_none_for_a_malformed_matrix() {
        assert!(decode_bytes("datamatrix", &[10, 0, 1]).is_none());
    }
}
