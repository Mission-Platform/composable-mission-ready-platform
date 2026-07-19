//! Generated round-trip tests for **every encodable code type**.
//!
//! For each symbology the `@mission-platform` encoders can produce, this renders
//! the symbol with the encoder and reads it back with the matching decoder,
//! asserting the payload survives. It complements `pipeline.rs` (which also runs
//! the *scanner* locate/sample stage) by covering the code types the scanner
//! cannot yet locate — rectangular Data Matrix, Aztec, and the 1D symbologies
//! outside the scanner's precedence list (Code 93, GS1-128, UPC-E, ITF-14, MSI,
//! Pharmacode) — so the encode↔decode contract is exercised end-to-end for the
//! whole catalogue.
//!
//! The general assertion is **re-encode equality**: `encode(decode(encode(x)))
//! == encode(x)`. This proves the decoder is the faithful inverse of the encoder
//! without hard-coding per-symbology normalisation (check digits, GS1 FNC1
//! handling, case folding, code-set selection), which a literal string compare
//! would get wrong. QR and plain Data Matrix additionally assert the exact
//! payload, since those round-trip verbatim.
//!
//! Native-only: it links the encoder *and* decoder crates, whose wasm-bindgen
//! exports would clash in one wasm test binary.

#![cfg(not(target_arch = "wasm32"))]

use mission_platform_barcode_decode::decode_modules as decode_barcode;
use mission_platform_barcode_encode::encode_modules as encode_barcode;
use mission_platform_gs1_databar_decode::decode_databar_modules;
use mission_platform_gs1_databar_encode::encode_databar;
use mission_platform_matrix_code_decode::decode_matrix;
use mission_platform_matrix_code_encode::encode_modules as encode_matrix;
use mission_platform_maxicode_decode::decode_maxicode_modules;
use mission_platform_maxicode_encode::{encode_maxicode_modules, DEFAULT_MODE};
use mission_platform_pdf417_decode::decode_pdf417_codewords;
use mission_platform_pdf417_encode::encode_pdf417_codewords;
use mission_platform_qr_code_decode::decode_qr;
use mission_platform_qr_code_encode::encode as encode_qr;

/// Every 1D symbology the encoder can produce, paired with a payload valid for
/// it. The decoder supports all of these, so each must round-trip.
const BARCODE_CASES: &[(&str, &str)] = &[
    ("code128", "ABC-123"),
    ("gs1-128", "0112345678901231"),
    ("code39", "HELLO 123"),
    ("code39ext", "Hello!"),
    ("code93", "CODE93"),
    ("code93ext", "Code93!"),
    ("ean13", "5901234123457"),
    ("ean8", "96385074"),
    ("upca", "036000291452"),
    ("upce", "01234565"),
    ("itf", "1234567890"),
    ("itf14", "00012345678905"),
    ("codabar", "40156"),
    ("msi", "1234567"),
    ("pharmacode", "1234"),
];

#[test]
fn every_encodable_barcode_round_trips() {
    for &(symbology, payload) in BARCODE_CASES {
        let modules = encode_barcode(symbology, payload)
            .unwrap_or_else(|| panic!("encode {symbology} {payload:?}"));
        let decoded = decode_barcode(symbology, &modules)
            .unwrap_or_else(|| panic!("decode {symbology} {payload:?}"));
        assert!(!decoded.is_empty(), "{symbology}: decoded an empty payload");
        // The decoded payload must re-encode to the identical module run — proof
        // the decoder inverted the encoder (accounting for check digits, GS1
        // normalisation, case folding, etc.).
        let re_encoded = encode_barcode(symbology, &decoded)
            .unwrap_or_else(|| panic!("re-encode {symbology} {decoded:?}"));
        assert_eq!(
            re_encoded, modules,
            "{symbology}: decode is not the faithful inverse of encode ({payload:?} -> {decoded:?})"
        );
    }
}

/// Every 2D matrix symbology the encoder can produce. The decoder supports all
/// four, so each must round-trip.
const MATRIX_SYMBOLOGIES: &[&str] = &[
    "datamatrix",
    "gs1datamatrix",
    "datamatrixrectangular",
    "aztec",
];

#[test]
fn every_encodable_matrix_symbology_round_trips() {
    for &symbology in MATRIX_SYMBOLOGIES {
        for payload in ["HELLO", "Order #42!", "mission-platform", "12345678"] {
            let modules = encode_matrix(symbology, payload)
                .unwrap_or_else(|| panic!("encode {symbology} {payload:?}"));
            let decoded = decode_matrix(symbology, &modules)
                .unwrap_or_else(|| panic!("decode {symbology} {payload:?}"));
            assert!(!decoded.is_empty(), "{symbology}: decoded an empty payload");
            let re_encoded = encode_matrix(symbology, &decoded)
                .unwrap_or_else(|| panic!("re-encode {symbology} {decoded:?}"));
            assert_eq!(
                re_encoded, modules,
                "{symbology}: decode is not the faithful inverse of encode ({payload:?})"
            );
        }
    }
}

#[test]
fn plain_data_matrix_round_trips_verbatim() {
    // Non-GS1 Data Matrix (square + rectangular) and Aztec carry the payload
    // verbatim, so assert the exact string too.
    for symbology in ["datamatrix", "datamatrixrectangular", "aztec"] {
        for payload in ["HELLO", "Order #42!", "café"] {
            let modules = encode_matrix(symbology, payload).expect("encode");
            let decoded = decode_matrix(symbology, &modules).expect("decode");
            assert_eq!(decoded, payload, "{symbology} verbatim round-trip");
        }
    }
}

#[test]
fn gs1_databar_rss14_round_trips() {
    // GS1 DataBar (RSS-14) is decoded combinatorially from element widths rather
    // than a glyph table, so a round-trip proves the encoder and decoder agree on
    // the symbol layout, checksum and character coding.
    for gtin in [
        "04412345678909",
        "00075678164125",
        "12345678901231",
        "00000000000000",
    ] {
        let modules = encode_databar("databar", gtin)
            .unwrap_or_else(|| panic!("encode databar {gtin:?}"));
        let decoded = decode_databar_modules(&modules)
            .unwrap_or_else(|| panic!("decode databar {gtin:?}"));
        assert_eq!(decoded, gtin, "databar rss-14 round-trip");
    }
}

#[test]
fn pdf417_codewords_round_trip() {
    // PDF417 encodes via byte compaction and protects the codeword stream with
    // GF(929) Reed–Solomon; a codeword-level round-trip proves the encoder, the
    // EC generator and the decoder's EC correction + bit-stream parser all agree.
    for payload in [
        "This is PDF417",
        "1234567890",
        "Mixed CASE 42 & text!",
        "A",
    ] {
        for ec in 0..=3 {
            let (_cols, _rows, full) = encode_pdf417_codewords(payload, ec)
                .unwrap_or_else(|| panic!("encode pdf417 ec={ec} {payload:?}"));
            let decoded = decode_pdf417_codewords(&full, ec)
                .unwrap_or_else(|| panic!("decode pdf417 ec={ec} {payload:?}"));
            assert_eq!(decoded, payload, "pdf417 ec={ec} round-trip");
        }
    }
}

#[test]
fn maxicode_modules_round_trip() {
    // MaxiCode packs 144 six-bit codewords into a fixed 30×33 hexagonal grid and
    // protects them with three GF(64) Reed–Solomon blocks (primary + even/odd
    // interleaved secondary). A module-grid round-trip proves the encoder's
    // set-A/B stream, the shared BITNR bit map and the decoder's block
    // correction + bit-stream parser all agree.
    for (payload, mode) in [
        ("THIS IS A MAXICODE TEST 1234567890", DEFAULT_MODE),
        ("Mixed CASE text 42!", DEFAULT_MODE),
        ("MODE5 abc XYZ 99", 5),
    ] {
        let modules = encode_maxicode_modules(payload, mode)
            .unwrap_or_else(|| panic!("encode maxicode {payload:?}"));
        let decoded = decode_maxicode_modules(&modules)
            .unwrap_or_else(|| panic!("decode maxicode {payload:?}"));
        assert_eq!(decoded, payload, "maxicode mode {mode} round-trip");
    }
}

#[test]
fn every_qr_error_correction_level_round_trips() {
    // QR across all four ECC levels (0 = L … 3 = H) and a spread of payloads.
    for ecc in 0..=3 {
        for payload in [
            "HELLO",
            "https://mission-platform.dev",
            "Mission 42",
            "café ☕ unicode",
        ] {
            let packed = encode_qr(payload, ecc)
                .unwrap_or_else(|| panic!("encode qr ecc={ecc} {payload:?}"));
            // The encoder prepends a version byte; the decoder wants
            // `[size, ...modules]`.
            let matrix = &packed[1..];
            let decoded =
                decode_qr(matrix).unwrap_or_else(|| panic!("decode qr ecc={ecc} {payload:?}"));
            assert_eq!(decoded, payload, "qr ecc={ecc} round-trip");
        }
    }
}
