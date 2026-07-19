//! Project-level integration tests: render a real encoder's output into a
//! synthetic luma image, then assert the scanner locates and samples it back to
//! the exact module data the matching decoder expects.
//!
//! Native-only: these pull in the separate encoder crates, so they are excluded
//! from the wasm target where `wasm-pack test` would otherwise link several
//! encoders' wasm-bindgen exports into one binary (a symbol clash). See
//! `tests/wasm.rs` for the wasm-facing smoke tests.

#![cfg(not(target_arch = "wasm32"))]

use mission_platform_barcode_encode::encode_modules as encode_barcode;
use mission_platform_code_scan::{scan, scan_barcode, scan_matrix, scan_qr, FORMAT_QR};
use mission_platform_matrix_code_encode::encode_modules as encode_matrix;
use mission_platform_qr_code_encode::encode as encode_qr;

/// Module pixel size and quiet-zone width used when rendering test images.
const SCALE: usize = 8;
const QUIET: usize = 4;

/// Render a packed `[size, ...modules]` matrix (row-major, `1` = dark) into a
/// `(width, height, luma)` image: each module becomes a `SCALE`×`SCALE` block
/// (`0` = black, `255` = white) surrounded by a `QUIET`-module light border.
fn render_matrix(packed: &[u8]) -> (usize, usize, Vec<u8>) {
    let size = packed[0] as usize;
    let modules = &packed[1..];
    let side = (size + 2 * QUIET) * SCALE;
    let mut luma = vec![255u8; side * side];
    for row in 0..size {
        for col in 0..size {
            if modules[row * size + col] == 0 {
                continue;
            }
            let x0 = (col + QUIET) * SCALE;
            let y0 = (row + QUIET) * SCALE;
            for y in y0..y0 + SCALE {
                for x in x0..x0 + SCALE {
                    luma[y * side + x] = 0;
                }
            }
        }
    }
    (side, side, luma)
}

/// Rotate a square luma image 90° clockwise.
fn rotate90(width: usize, height: usize, luma: &[u8]) -> (usize, usize, Vec<u8>) {
    let mut out = vec![255u8; width * height];
    for y in 0..height {
        for x in 0..width {
            // (x, y) -> (height - 1 - y, x) in the rotated frame (new width = height).
            let nx = height - 1 - y;
            let ny = x;
            out[ny * height + nx] = luma[y * width + x];
        }
    }
    (height, width, out)
}

/// Render a flat run of 1D module bits (`1` = bar) into a `(width, height,
/// luma)` image: each module is `SCALE` px wide, bars run the full height, with
/// a `QUIET * SCALE` px light margin on every side.
fn render_barcode(bits: &[u8]) -> (usize, usize, Vec<u8>) {
    let bar_height = SCALE * 10;
    let width = (bits.len() + 2 * QUIET) * SCALE;
    let height = bar_height + 2 * QUIET * SCALE;
    let mut luma = vec![255u8; width * height];
    for (index, &bit) in bits.iter().enumerate() {
        if bit == 0 {
            continue;
        }
        let x0 = (index + QUIET) * SCALE;
        for y in QUIET * SCALE..QUIET * SCALE + bar_height {
            for x in x0..x0 + SCALE {
                luma[y * width + x] = 0;
            }
        }
    }
    (width, height, luma)
}

/// Encode `text` at `ecc`, render it, and assert `scan_qr` recovers the exact
/// `[size, ...modules]` matrix (the encoder's output minus its `version` byte).
fn qr_roundtrip(text: &str, ecc: u8) {
    let packed = encode_qr(text, ecc).expect("payload should fit");
    let matrix = &packed[1..];
    let (width, height, luma) = render_matrix(matrix);
    let scanned = scan_qr(width, height, &luma).expect("QR should be located");
    assert_eq!(scanned, matrix, "ecc={ecc} text={text:?}");
}

#[test]
fn scans_qr_across_ecc_levels() {
    for ecc in 0..4 {
        qr_roundtrip("HELLO WORLD", ecc);
        qr_roundtrip("https://mission-platform.dev", ecc);
    }
}

#[test]
fn scans_qr_utf8_and_longer_payloads() {
    qr_roundtrip("héllo — wörld 🚀", 1);
    qr_roundtrip("The quick brown fox jumps over the lazy dog. 0123456789", 2);
}

#[test]
fn scans_a_rotated_qr() {
    // The affine sampler keys off the three finder centres, so a 90°-rotated
    // capture still resolves to the canonical (unrotated) matrix.
    let packed = encode_qr("ROTATED", 1).expect("payload should fit");
    let matrix = &packed[1..];
    let (width, height, luma) = render_matrix(matrix);
    let (width, height, luma) = rotate90(width, height, &luma);
    let scanned = scan_qr(width, height, &luma).expect("rotated QR should be located");
    assert_eq!(scanned, matrix);
}

#[test]
fn scans_data_matrix() {
    for text in ["HELLO", "Data Matrix 123", "mission-platform"] {
        // The matrix encoder emits a 2-byte `[width, height, ...modules]` header
        // (square, so width == height); the scanner emits the 1-byte
        // `[size, ...modules]` form (the same shape as QR, which the JS bridge
        // re-expands to `[size, size, ...]` for the decoder). Convert the
        // encoder buffer to that 1-byte form so both `render_matrix` (which
        // expects it) and the comparison speak the scanner's contract.
        let encoded = encode_matrix("datamatrix", text).expect("payload should encode");
        let size = encoded[0];
        let expected: Vec<u8> = std::iter::once(size)
            .chain(encoded[2..].iter().copied())
            .collect();
        let (width, height, luma) = render_matrix(&expected);
        let scanned = scan_matrix(width, height, &luma).expect("Data Matrix should be located");
        assert_eq!(scanned, expected, "text={text:?}");
    }
}

#[test]
fn scans_linear_barcodes() {
    for (symbology, data) in [
        ("code128", "ABC-123"),
        ("code39", "HELLO"),
        ("ean13", "590123412345"),
    ] {
        let bits = encode_barcode(symbology, data).expect("payload should encode");
        let (width, height, luma) = render_barcode(&bits);
        let scanned = scan_barcode(width, height, &luma).expect("barcode should be located");
        assert_eq!(scanned, bits, "symbology={symbology}");
    }
}

#[test]
fn scans_a_linear_barcode_despite_a_stray_speckle() {
    // A real capture routinely picks up a single stray dark pixel (a binariser
    // artefact, a scratch, a compression fleck) sitting in an otherwise light
    // space. That lone 1px run must NOT collapse the module-unit estimate and
    // inflate the sampled run — the scanner should still recover the exact bits.
    let bits = encode_barcode("code128", "ABC-123").expect("payload should encode");
    let (width, height, mut luma) = render_barcode(&bits);

    // Paint a 1px-wide, full-height dark stripe through a light space so every
    // scan line sees a spurious 1px run (the pathological input from the field).
    let stripe_x = QUIET * SCALE / 2; // a lone speck out in the left quiet zone
    for y in 0..height {
        luma[y * width + stripe_x] = 0;
    }

    let scanned = scan_barcode(width, height, &luma).expect("barcode should be located");
    assert_eq!(
        scanned, bits,
        "a lone speckle must not inflate the sampled run"
    );
}

#[test]
fn combined_scan_tags_and_returns_the_qr_payload() {
    let packed = encode_qr("TAGGED", 0).expect("payload should fit");
    let matrix = &packed[1..];
    let (width, height, luma) = render_matrix(matrix);
    let tagged = scan(width, height, &luma).expect("combined scan should locate the QR");
    assert_eq!(tagged[0], FORMAT_QR);
    assert_eq!(&tagged[1..], matrix);
}

#[test]
fn returns_none_for_a_blank_image() {
    let luma = vec![255u8; 64 * 64];
    assert!(scan_qr(64, 64, &luma).is_none());
    assert!(scan(64, 64, &luma).is_none());
}
