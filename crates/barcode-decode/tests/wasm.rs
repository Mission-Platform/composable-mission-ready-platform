//! `wasm-bindgen` tests for the decoder's wasm-facing entry point. Run with
//! `wasm-pack test --node crates/barcode-decode` (wired into the package's Turbo
//! `test:wasm` task). The native round-trip tests (which link the encoder) live
//! in `src/lib.rs`; here we only smoke-test the wasm surface with hand-built
//! module runs.

#![cfg(target_arch = "wasm32")]

use mission_platform_barcode_decode::decode;
use wasm_bindgen_test::wasm_bindgen_test;

#[wasm_bindgen_test]
fn decodes_a_minimal_pharmacode() {
    // Pharmacode value 3 is two narrow bars separated by a narrow space.
    assert_eq!(decode("pharmacode", &[1, 0, 1]).as_deref(), Some("3"));
}

#[wasm_bindgen_test]
fn rejects_invalid_and_unknown_input() {
    assert!(decode("code128", &[1, 0, 1, 1, 0]).is_none());
    assert!(decode("datamatrix", &[1, 0, 1]).is_none());
}
