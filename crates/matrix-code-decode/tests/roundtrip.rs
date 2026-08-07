//! Native encoder-to-decoder coverage for every Matrix Code dispatch path.

#![cfg(not(target_arch = "wasm32"))]

use mission_platform_matrix_code_decode::decode_matrix;
use mission_platform_matrix_code_encode::encode_modules;

fn round_trip(symbology: &str, payload: &str) {
    let encoded = encode_modules(symbology, payload).expect("payload should encode");
    let decoded = decode_matrix(symbology, &encoded).expect("encoded symbol should decode");
    assert_eq!(decoded, payload, "round-trip mismatch for {symbology}");
}

#[test]
fn round_trips_supported_symbologies() {
    round_trip("datamatrix", "MISSION-42");
    round_trip("gs1datamatrix", "0101234567890128");
    round_trip("datamatrixrectangular", "RECTANGULAR");
    round_trip("aztec", "AZTEC PAYLOAD");
}

#[test]
fn accepts_symbology_aliases() {
    let encoded = encode_modules("datamatrix", "ALIASED").expect("payload should encode");
    for alias in ["DataMatrix", "gs1-datamatrix", "gs1_datamatrix"] {
        let (payload, expected) = if alias == "DataMatrix" {
            (decode_matrix(alias, &encoded), "ALIASED")
        } else {
            let gs1 = encode_modules(alias, "0101234567890128").expect("GS1 payload should encode");
            (decode_matrix(alias, &gs1), "0101234567890128")
        };
        assert_eq!(
            payload.as_deref(),
            Some(expected),
            "alias {alias} should dispatch"
        );
    }
}

#[test]
fn rejects_unknown_truncated_and_noisy_inputs() {
    assert!(decode_matrix("pdf417", &[10, 10, 0, 1]).is_none());
    assert!(decode_matrix("datamatrix", &[10, 10, 0]).is_none());

    let mut noisy = encode_modules("datamatrix", "NOISE").expect("payload should encode");
    noisy[0] = noisy[0].saturating_add(1);
    assert!(decode_matrix("datamatrix", &noisy).is_none());
}
