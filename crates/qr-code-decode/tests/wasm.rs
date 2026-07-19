//! `wasm-bindgen` tests exercising the decoder through its wasm-facing entry
//! point. Run with `wasm-pack test --node crates/qr-code-decode` (wired into
//! the package's Turbo `test:wasm` task).
//!
//! These deliberately avoid the encoder crate: linking both the encoder's and
//! decoder's wasm-bindgen exports into one test binary would clash on shared
//! symbols (`build_info`, …). Encode→decode round-trips are covered by the
//! native `roundtrip` integration test instead.

#![cfg(target_arch = "wasm32")]

use mission_platform_qr_code_decode::decode;
use wasm_bindgen_test::wasm_bindgen_test;

#[wasm_bindgen_test]
fn rejects_a_garbage_matrix_without_panicking() {
    let size = 21usize;
    let mut matrix = vec![0u8; 1 + size * size];
    matrix[0] = size as u8;
    // Must return a value (or `None`) rather than panicking.
    let _ = decode(&matrix);
}

#[wasm_bindgen_test]
fn rejects_an_empty_matrix() {
    assert!(decode(&[]).is_none());
}
