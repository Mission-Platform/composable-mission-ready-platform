//! `wasm-bindgen` tests exercising the encoder through its wasm-facing entry
//! point. Run with `wasm-pack test --node crates/barcode-encode` (wired into
//! the package's Turbo `test:wasm` task).

#![cfg(target_arch = "wasm32")]

use mission_platform_barcode_encode::encode;
use wasm_bindgen_test::wasm_bindgen_test;

#[wasm_bindgen_test]
fn encodes_a_code128_payload() {
    let modules = encode("code128", "ABC-123").expect("valid Code 128");
    assert!(!modules.is_empty(), "produced modules");
    assert!(modules.iter().all(|&bit| bit <= 1), "modules are 0/1");
}

#[wasm_bindgen_test]
fn rejects_an_unknown_symbology() {
    assert!(encode("qr", "hello").is_none());
}
