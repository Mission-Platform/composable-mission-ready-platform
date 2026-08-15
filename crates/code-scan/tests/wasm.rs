//! `wasm-bindgen` tests exercising the scanner through its wasm-facing entry
//! points. Run with `wasm-pack test --node crates/code-scan` (wired into the
//! package's Turbo `test:wasm` task).
//!
//! These deliberately avoid the encoder crates: linking their wasm-bindgen
//! exports into one test binary would clash on shared symbols (`build_info`, …).
//! Encode→scan round-trips are covered by the native `roundtrip` integration
//! test instead.

#![cfg(target_arch = "wasm32")]

use mission_platform_code_scan::{
    scan, scan_and_decode, scan_and_decode_all, scan_and_decode_roi, scan_barcode, scan_matrix,
    scan_qr,
};
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
    assert!(scan_qr(8, 8, &[0, 0, 0]).is_none());
    assert!(scan_matrix(8, 8, &[0, 0, 0]).is_none());
    assert!(scan_barcode(8, 8, &[0, 0, 0]).is_none());
    assert!(scan(8, 8, &[0, 0, 0]).is_none());
    assert!(scan_and_decode(8, 8, &[0, 0, 0]).is_none());
    assert!(scan_and_decode_roi(8, 8, &[0, 0, 0], 0, 0, 2, 2).is_none());
    assert_eq!(scan_and_decode_all(8, 8, &[0, 0, 0]).length(), 0);
}

#[wasm_bindgen_test]
fn every_scanner_entry_point_rejects_invalid_frames() {
    let empty = [];
    assert!(scan_qr(0, 0, &empty).is_none());
    assert!(scan_matrix(0, 0, &empty).is_none());
    assert!(scan_barcode(0, 0, &empty).is_none());
    assert!(scan(0, 0, &empty).is_none());
    assert!(scan_and_decode(0, 0, &empty).is_none());
    assert_eq!(scan_and_decode_all(0, 0, &empty).length(), 0);
    assert!(scan_qr(0, 32, &empty).is_none());
    assert!(scan_matrix(32, 0, &empty).is_none());
    assert!(scan_barcode(0, 0, &empty).is_none());
    assert!(scan(32, 32, &empty).is_none());
    assert!(scan_and_decode(32, 32, &empty).is_none());
    assert!(scan_and_decode_roi(0, 32, &empty, 0, 0, 1, 1).is_none());

    assert!(scan_qr(32, 32, &[255]).is_none());
    assert!(scan_matrix(32, 32, &[255]).is_none());
    assert!(scan_barcode(32, 32, &[255]).is_none());
    assert!(scan(32, 32, &[255]).is_none());
    assert!(scan_and_decode(32, 32, &[255]).is_none());
    assert!(scan_and_decode_roi(32, 32, &[255], 0, 0, 1, 1).is_none());
    assert_eq!(scan_and_decode_all(32, 32, &[255]).length(), 0);
}

#[wasm_bindgen_test]
fn oversized_and_overflowing_frames_are_rejected() {
    let empty = [];
    assert!(scan_qr(usize::MAX, 2, &empty).is_none());
    assert!(scan_matrix(usize::MAX, 2, &empty).is_none());
    assert!(scan_barcode(usize::MAX, 2, &empty).is_none());
    assert!(scan(usize::MAX, 2, &empty).is_none());
    assert!(scan_and_decode(usize::MAX, 2, &empty).is_none());
    assert!(scan_and_decode_roi(usize::MAX, 2, &empty, 0, 0, 1, 1).is_none());
    assert_eq!(scan_and_decode_all(usize::MAX, 2, &empty).length(), 0);

    // This frame is within the per-frame budget but its region sweep would
    // exceed the aggregate multi-scan work budget.
    let luma = vec![255u8; 2_896 * 2_896];
    assert_eq!(scan_and_decode_all(2_896, 2_896, &luma).length(), 0);
}

#[wasm_bindgen_test]
fn invalid_roi_is_rejected_without_panicking() {
    let luma = vec![255u8; 32 * 32];
    assert!(scan_and_decode_roi(32, 32, &[255], 0, 0, 1, 1).is_none());
    assert!(scan_and_decode_roi(32, 32, &luma, 32, 0, 1, 1).is_none());
    assert!(scan_and_decode_roi(32, 32, &luma, 0, 32, 1, 1).is_none());
    assert!(scan_and_decode_roi(32, 32, &luma, 0, 0, 0, 1).is_none());
    assert!(scan_and_decode_roi(32, 32, &luma, usize::MAX, 0, usize::MAX, 1).is_none());
    assert!(scan_and_decode_roi(32, 32, &luma, 0, usize::MAX, 1, usize::MAX).is_none());
}
