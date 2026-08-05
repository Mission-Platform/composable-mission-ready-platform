//! Code 93 decoder: the inverse of `mission-platform-barcode-encode`'s Code 93
//! encoder. Code 93 is continuous with a fixed nine-module pattern per
//! character, so the (clean) module run splits cleanly into nine-bit chunks
//! framed by the start/stop delimiter and closed by a single termination bar.

use mission_platform_barcode_common::code93::{
    base_char, shift_char, weighted_check, PATTERNS, START_STOP,
};
use mission_platform_barcode_common::full_ascii;

/// Turn a slice of module bits into a `0`/`1` string.
#[tracing::instrument(skip_all)]
fn bit_string(modules: &[u8]) -> String {
    modules
        .iter()
        .map(|&bit| if bit == 1 { '1' } else { '0' })
        .collect()
}

/// Decode a Code 93 module run into its payload. When `extended` is set the
/// decoded base characters are folded back through the full-ASCII shift table.
/// Returns `None` when the framing, patterns or check characters are invalid.
#[tracing::instrument(skip_all)]
pub fn decode(modules: &[u8], extended: bool) -> Option<String> {
    // Drop the trailing termination bar, then split into nine-bit characters.
    let body = modules.strip_suffix(&[1])?;
    if body.len() % 9 != 0 || body.len() < 27 {
        return None;
    }

    let mut values = Vec::new();
    for chunk in body.chunks_exact(9) {
        let pattern = bit_string(chunk);
        if pattern == START_STOP {
            values.push(usize::MAX); // Sentinel for the start/stop delimiter.
        } else {
            values.push(
                PATTERNS
                    .iter()
                    .position(|&candidate| candidate == pattern)?,
            );
        }
    }

    // The first and last characters must be the start/stop delimiter.
    if values.first() != Some(&usize::MAX) || values.last() != Some(&usize::MAX) {
        return None;
    }
    let inner = &values[1..values.len() - 1];
    if inner.len() < 2 || inner.iter().any(|&value| value == usize::MAX) {
        return None;
    }

    // Verify the two trailing check characters (C then K).
    let (data, checks) = inner.split_at(inner.len() - 2);
    if weighted_check(data, 20) != checks[0] {
        return None;
    }
    if weighted_check(&inner[..inner.len() - 1], 15) != checks[1] {
        return None;
    }

    // Map data values back to characters.
    let mut base = String::new();
    for &value in data {
        let character = if value <= 42 {
            base_char(value)?
        } else {
            shift_char(value)?
        };
        base.push(character);
    }

    if extended {
        full_ascii::decode_sequence(&base)
    } else {
        Some(base)
    }
}
