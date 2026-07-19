//! Codeword-level round-trip: encode a payload with the sibling encoder, then
//! decode the resulting codeword array back. This exercises the byte-compaction
//! encoder, the GF(929) EC generator/corrector and the bit-stream parser without
//! going through an image (the image path is covered by the scanner's tests).

#![cfg(not(target_arch = "wasm32"))]

use mission_platform_pdf417_decode::decode_pdf417_codewords;
use mission_platform_pdf417_encode::encode_pdf417_codewords;

fn round_trip(data: &str, ec_level: usize) {
    let (_cols, _rows, full) = encode_pdf417_codewords(data, ec_level)
        .unwrap_or_else(|| panic!("encode failed for {data:?}"));
    let decoded = decode_pdf417_codewords(&full, ec_level)
        .unwrap_or_else(|| panic!("decode failed for {data:?}"));
    assert_eq!(decoded, data, "round-trip mismatch");
}

#[test]
fn round_trips_text_payloads() {
    for data in ["This is PDF417", "Hello, World!", "abcXYZ 123", "A"] {
        for ec in 0..=3 {
            round_trip(data, ec);
        }
    }
}

#[test]
fn round_trips_numeric_and_symbols() {
    round_trip("1234567890", 2);
    round_trip("0123456789012345678901234567890", 3);
    round_trip("mixed CASE 42 & punctuation!?", 2);
}

#[test]
fn corrects_a_single_error() {
    // Corrupt one codeword; EC level 2 (8 EC codewords) must recover it.
    let (_c, _r, mut full) = encode_pdf417_codewords("Recoverable", 2).unwrap();
    let victim = full.len() / 2;
    full[victim] = (full[victim] + 5) % 929;
    assert_eq!(
        decode_pdf417_codewords(&full, 2).as_deref(),
        Some("Recoverable")
    );
}
