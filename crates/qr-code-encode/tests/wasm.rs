//! `wasm-bindgen` tests exercising the encoder through its wasm-facing entry
//! point. Run with `wasm-pack test --node crates/qr-code-encode` (wired into
//! the package's Turbo `test:wasm` task).

#![cfg(target_arch = "wasm32")]

use mission_platform_qr_code_encode::encode;
use wasm_bindgen_test::wasm_bindgen_test;

#[wasm_bindgen_test]
fn encodes_a_payload_into_a_packed_matrix() {
    let packed = encode("HELLO WORLD", 1).expect("payload fits");
    let version = packed[0] as usize;
    let size = packed[1] as usize;
    assert!((1..=40).contains(&version), "version in range");
    assert_eq!(size, 17 + 4 * version, "size follows the version formula");
    assert_eq!(packed.len(), 2 + size * size, "module count matches size^2");
}

#[wasm_bindgen_test]
fn rejects_an_over_long_payload() {
    let long = "x".repeat(8000);
    assert!(encode(&long, 0).is_none());
}
