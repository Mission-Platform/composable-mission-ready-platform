//! `wasm-bindgen` tests exercising the decoder through its wasm-facing entry
//! point. Run with `wasm-pack test --node crates/matrix-code-decode` (wired into
//! the package's Turbo `test:wasm` task).
//!
//! The encoder crate is deliberately not linked here (its `wasm-bindgen`
//! exports would collide with the decoder's), so the fixture below is a
//! precomputed `[width, height, ...modules]` Data Matrix symbol for the payload
//! `"123456"` produced by `mission-platform-matrix-code-encode`.

#![cfg(target_arch = "wasm32")]

use mission_platform_matrix_code_decode::decode;
use wasm_bindgen_test::wasm_bindgen_test;

/// A 10×10 Data Matrix symbol encoding `"123456"` (`[width, height, ...modules]`).
const SYMBOL_123456: [u8; 102] = [
    10, 10, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 0,
    0, 1, 1, 0, 0, 0, 1, 1, 1, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1,
    1, 1, 0, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 0, 0, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1,
];

#[wasm_bindgen_test]
fn decodes_a_data_matrix_symbol() {
    assert_eq!(
        decode("datamatrix", &SYMBOL_123456).as_deref(),
        Some("123456")
    );
}

#[wasm_bindgen_test]
fn rejects_unknown_symbology() {
    assert!(decode("pdf417", &SYMBOL_123456).is_none());
}

#[wasm_bindgen_test]
fn rejects_a_malformed_matrix() {
    assert!(decode("datamatrix", &[10, 0, 1]).is_none());
}
