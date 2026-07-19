//! Round-trip tests: encode a payload into a MaxiCode module grid with the
//! sibling encoder, then decode it back and assert the payload survives.

use mission_platform_maxicode_decode::decode_maxicode_modules;
use mission_platform_maxicode_encode::{encode_maxicode_modules, DEFAULT_MODE};

fn round_trip(payload: &str, mode: usize) {
    let modules = encode_maxicode_modules(payload, mode)
        .unwrap_or_else(|| panic!("encode failed for {payload:?}"));
    let decoded = decode_maxicode_modules(&modules)
        .unwrap_or_else(|| panic!("decode failed for {payload:?}"));
    assert_eq!(decoded, payload, "round-trip mismatch (mode {mode})");
}

#[test]
fn mode4_set_a_round_trips() {
    round_trip("THIS IS A MAXICODE TEST 1234567890", DEFAULT_MODE);
}

#[test]
fn mode4_mixed_sets_round_trips() {
    // Forces latches between set A (upper) and set B (lower/punctuation).
    round_trip("Hello World mixed CASE 42!", DEFAULT_MODE);
}

#[test]
fn mode5_round_trips() {
    round_trip("MODE5 PAYLOAD abc XYZ 99", 5);
}

#[test]
fn recovers_from_module_errors() {
    // MaxiCode's Reed-Solomon should repair a handful of flipped modules.
    let mut modules = encode_maxicode_modules("ERROR CORRECTION 7", DEFAULT_MODE).unwrap();
    // Flip a few data modules scattered across the grid.
    for &i in &[100usize, 250, 400, 550] {
        modules[i] ^= 1;
    }
    let decoded = decode_maxicode_modules(&modules).expect("EC should recover a few flips");
    assert_eq!(decoded, "ERROR CORRECTION 7");
}
