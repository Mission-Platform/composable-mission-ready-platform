//! Dependency-free QR Code encoder, compiled to WebAssembly for
//! `@mission-platform/qr-code` via `wasm-bindgen` / `wasm-pack`.
//!
//! The public surface is the `wasm-bindgen` function [`encode`]; wasm-bindgen
//! generates the JS runtime that marshals the string and byte buffer, so the
//! TypeScript package imports that runtime directly (from `generated/encode`).
//! The shared spec tables, Galois-field arithmetic and matrix builder live in
//! the `mission-platform-qr-code-common` crate.
//!
//! Building with the optional `console` feature installs a panic hook and a
//! `tracing-wasm` subscriber that routes `tracing` events to the browser
//! devtools console for debugging.

mod encode;
mod micro_qr;
mod rmqr;
mod rmqr_versions;
mod segment;

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

/// Encode UTF-8 `text` into a packed `[version, size, ...modules]` matrix
/// (row-major, `1` = dark) at the error-correction ordinal `ecc`
/// (`0` = L, `1` = M, `2` = Q, `3` = H).
///
/// Returns `undefined` (JS) when the payload is too long to fit the largest
/// QR version.
#[wasm_bindgen]
#[tracing::instrument(skip_all)]
pub fn encode(text: &str, ecc: u8) -> Option<Vec<u8>> {
    tracing::debug!("encode: {} byte(s) at ecc level {ecc}", text.len());
    let packed = encode::encode(text.as_bytes(), ecc as i32);
    tracing::trace!(
        "encode: {}",
        packed.as_ref().map_or_else(
            || "payload did not fit".to_string(),
            |data| format!("version {}", data[0])
        ),
    );
    packed
}

/// Encode UTF-8 `text` into a packed `[width, height, ...modules]` **Micro QR**
/// matrix (row-major, `1` = dark). Micro QR supports error-correction levels L,
/// M and Q (`ecc` = `0`, `1`, `2`); H (`3`) is rejected. `width == height` since
/// Micro QR symbols are square (11, 13, 15 or 17 modules).
///
/// Returns `undefined` (JS) when the payload is too long for any Micro QR
/// version at the requested level.
#[wasm_bindgen]
#[tracing::instrument(skip_all)]
pub fn encode_micro_qr(text: &str, ecc: u8) -> Option<Vec<u8>> {
    tracing::debug!("encode_micro_qr: {} byte(s) at ecc level {ecc}", text.len());
    micro_qr::encode(text.as_bytes(), ecc as i32)
}

/// Encode UTF-8 `text` into a packed `[width, height, ...modules]` **rMQR**
/// (Rectangular Micro QR) matrix (row-major, `1` = dark). rMQR supports error
/// levels M and H only, so `ecc` `0`/`1` select M and `2`/`3` select H.
///
/// Returns `undefined` (JS) when the payload is too long for any rMQR version at
/// the requested level.
#[wasm_bindgen]
#[tracing::instrument(skip_all)]
pub fn encode_rmqr(text: &str, ecc: u8) -> Option<Vec<u8>> {
    tracing::debug!("encode_rmqr: {} byte(s) at ecc level {ecc}", text.len());
    rmqr::encode(text.as_bytes(), ecc as i32)
}
