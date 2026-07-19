//! Encode → decode round-trip tests for GS1 DataBar (RSS-14).
//!
//! Each GTIN is rendered to module bits by the sibling encoder and read back by
//! this crate; the recovered 14-digit value must match. This proves the two
//! crates agree on the symbol layout, checksum and combinatorial character
//! coding without needing any image fixtures.

#![cfg(not(target_arch = "wasm32"))]

use mission_platform_gs1_databar_decode::decode_databar_modules;
use mission_platform_gs1_databar_encode::encode_databar;

/// A spread of GTINs (leading zeros, small and large values, real corpus
/// samples) must each survive an encode→decode round-trip.
#[test]
fn rss14_round_trips() {
    let gtins = [
        "04412345678909",
        "20012345678909",
        "00012345678905",
        "00075678164125",
        "00821935106427",
        "12345678901231",
        "00000000000000",
    ];
    for gtin in gtins {
        let modules = encode_databar("databar", gtin).unwrap_or_else(|| panic!("encode {gtin}"));
        let decoded = decode_databar_modules(&modules);
        assert_eq!(
            decoded.as_deref(),
            Some(gtin),
            "round-trip mismatch for {gtin}"
        );
    }
}

/// The alternate symbology aliases resolve to the same RSS-14 encoder.
#[test]
fn symbology_aliases() {
    for alias in ["databar", "rss14", "databar14", "DataBar-Omni"] {
        let modules = encode_databar(alias, "04412345678909")
            .unwrap_or_else(|| panic!("encode via alias {alias}"));
        assert_eq!(
            decode_databar_modules(&modules).as_deref(),
            Some("04412345678909")
        );
    }
}
