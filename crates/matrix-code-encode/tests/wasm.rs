//! `wasm-bindgen` tests exercising the encoder through its wasm-facing entry
//! point. Run with `wasm-pack test --node crates/matrix-code-encode` (wired
//! into the package's Turbo `test:wasm` task).

#![cfg(target_arch = "wasm32")]

use mission_platform_matrix_code_encode::encode;
use wasm_bindgen_test::wasm_bindgen_test;

#[wasm_bindgen_test]
fn encodes_a_data_matrix_symbol() {
    let symbol = encode("datamatrix", "123456").expect("valid payload");
    let width = symbol[0] as usize;
    let height = symbol[1] as usize;
    assert_eq!(
        (width, height),
        (10, 10),
        "small numeric payload uses the 10x10 symbol"
    );
    assert_eq!(
        symbol.len(),
        2 + width * height,
        "module count matches width*height"
    );
}

#[wasm_bindgen_test]
fn rejects_unknown_symbology() {
    assert!(encode("pdf417", "HELLO").is_none());
}
