//! Project-level integration tests exercising the public crate API
//! (`encode` + `decode`) end-to-end across ECC levels and payload types,
//! independent of the per-file unit tests.
//!
//! Native-only: this pulls in the separate encoder crate, so it is excluded
//! from the wasm target where `wasm-pack test` would otherwise link the
//! encoder's wasm-bindgen exports alongside the decoder's (a symbol clash).

#![cfg(not(target_arch = "wasm32"))]

use mission_platform_qr_code_decode::decode;
use mission_platform_qr_code_encode::encode;

/// Encode `text` at `ecc`, strip the leading `version` byte to get the
/// decoder's `[size, ...modules]` input, and assert it decodes back to `text`.
fn roundtrip(text: &str, ecc: u8) {
    let packed = encode(text, ecc).expect("payload should fit");
    let matrix = &packed[1..];
    let decoded = decode(matrix).expect("should decode");
    assert_eq!(decoded, text, "ecc={ecc}");
}

#[test]
fn roundtrips_across_ecc_levels() {
    for ecc in 0..4 {
        roundtrip("HELLO WORLD", ecc);
        roundtrip("https://mission-platform.dev", ecc);
        roundtrip("", ecc);
    }
}

#[test]
fn roundtrips_utf8_payloads() {
    roundtrip("héllo — wörld 🚀", 1);
    roundtrip("日本語のテスト", 2);
}

#[test]
fn roundtrips_longer_multi_block_payload() {
    // Long enough to force a higher version with multiple RS blocks.
    let text = "The quick brown fox jumps over the lazy dog. ".repeat(6);
    roundtrip(&text, 1);
}

#[test]
fn rejects_too_long_payload() {
    let long: String = "x".repeat(8000);
    assert!(encode(&long, 0).is_none());
}
