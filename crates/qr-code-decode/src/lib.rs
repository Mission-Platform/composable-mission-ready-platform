//! Dependency-free QR Code decoder, compiled to WebAssembly for
//! `@mission-platform/qr-code` via `wasm-bindgen` / `wasm-pack`.
//!
//! The public surface is the `wasm-bindgen` function [`decode`]; wasm-bindgen
//! generates the JS runtime that marshals the byte buffer and string, so the
//! TypeScript package imports that runtime directly (from `generated/decode`).
//! The shared spec tables, Galois-field arithmetic and matrix builder live in
//! the `mission-platform-qr-code-common` crate.
//!
//! Building with the optional `console` feature installs a panic hook and a
//! `tracing-wasm` subscriber that routes `tracing` events to the browser
//! devtools console for debugging.

mod decode;

#[cfg(feature = "wasm-api")]
use wasm_bindgen::prelude::*;

// Build-time metadata captured by `shadow-rs` (see `build.rs`): crate version,
// git commit, build timestamp, Rust toolchain, …
shadow_rs::shadow!(build);

/// Initialise optional in-browser diagnostics (panic hook + `tracing-wasm`
/// subscriber) when the crate is built with the `console` feature. A no-op
/// otherwise.
#[cfg(all(feature = "wasm-api", feature = "console"))]
#[wasm_bindgen(start)]
#[tracing::instrument(skip_all)]
pub fn start() {
    mission_platform_console_panic_hook::set_once();
    tracing_wasm::set_as_global_default();
}

/// Decode a packed `[size, ...modules]` matrix (row-major, `1` = dark) back into
/// its original text. The dependency-free native entry point, shared by the
/// `wasm-bindgen` [`decode`] export and by in-process callers such as
/// `mission-platform-code-scan` (which links this crate directly to decode a
/// located symbol without crossing the wasm↔JS boundary). Returns `None` when
/// the matrix cannot be decoded.
#[tracing::instrument(skip_all)]
pub fn decode_qr(matrix: &[u8]) -> Option<String> {
    tracing::debug!(
        "decode_qr: {}-module matrix",
        matrix.first().copied().unwrap_or(0)
    );
    let text = decode::decode(matrix).and_then(|bytes| String::from_utf8(bytes).ok());
    tracing::trace!(
        "decode_qr: {}",
        if text.is_some() {
            "recovered payload"
        } else {
            "undecodable"
        }
    );
    text
}

/// Decode a packed `[size, ...modules]` matrix, treating the modules flagged in
/// `erasures` (a per-module mask, row-major, `1` = erased, length `size²`) as
/// **known** low-confidence reads. Handing the scanner's low-confidence grey
/// modules in as Reed-Solomon erasures recovers symbols that blind error
/// correction cannot. An `erasures` slice whose length does not match `size²` is
/// ignored, making this identical to [`decode_qr`].
#[tracing::instrument(skip_all)]
pub fn decode_qr_with_erasures(matrix: &[u8], erasures: &[u8]) -> Option<String> {
    tracing::debug!(
        "decode_qr_with_erasures: {}-module matrix, {} erasure flags",
        matrix.first().copied().unwrap_or(0),
        erasures.len()
    );
    decode::decode_with_erasures(matrix, erasures).and_then(|bytes| String::from_utf8(bytes).ok())
}

/// Decode a packed `[size, ...modules]` matrix (row-major, `1` = dark) back
/// into its original text. Returns `undefined` (JS) when the matrix cannot be
/// decoded.
///
/// The `wasm-bindgen` wrapper over [`decode_qr`]; gated behind the `wasm-api`
/// feature so the export is present in this crate's own wasm build but absent
/// when the crate is linked into another cdylib (e.g. the scanner), where a
/// duplicate `decode` export would clash.
#[cfg(feature = "wasm-api")]
#[wasm_bindgen]
#[tracing::instrument(skip_all)]
pub fn decode(matrix: &[u8]) -> Option<String> {
    decode_qr(matrix)
}
