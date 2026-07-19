//! `wasm-bindgen` tests exercising the scanner through its wasm-facing entry
//! points. Run with `wasm-pack test --node crates/code-scan` (wired into the
//! package's Turbo `test:wasm` task).
//!
//! These deliberately avoid the encoder crates: linking their wasm-bindgen
//! exports into one test binary would clash on shared symbols (`build_info`, …).
//! Encode→scan round-trips are covered by the native `roundtrip` integration
//! test instead.

#![cfg(target_arch = "wasm32")]

use mission_platform_code_scan::{scan, scan_barcode, scan_matrix, scan_qr};
use wasm_bindgen_test::wasm_bindgen_test;

#[wasm_bindgen_test]
fn a_blank_image_yields_no_match() {
    let luma = vec![255u8; 32 * 32];
    assert!(scan_qr(32, 32, &luma).is_none());
    assert!(scan_matrix(32, 32, &luma).is_none());
    assert!(scan_barcode(32, 32, &luma).is_none());
    assert!(scan(32, 32, &luma).is_none());
}

#[wasm_bindgen_test]
fn a_mismatched_buffer_is_rejected_without_panicking() {
    // Buffer length does not match width * height.
    assert!(scan(8, 8, &[0, 0, 0]).is_none());
}
