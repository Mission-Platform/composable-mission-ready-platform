//! Pharmacode decoder. The symbol is a run of narrow / wide bars separated by
//! single-width spaces, with no start, stop or check characters. A narrow bar is
//! a binary `0` and a wide bar a binary `1`, folded most-significant bar first.

use crate::widths::classify;

/// Decode a Pharmacode module run into its decimal value string. Returns `None`
/// for an empty run or a decoded value outside the representable range.
#[tracing::instrument(skip_all)]
pub fn decode(modules: &[u8]) -> Option<String> {
    let elements = classify(modules)?;

    // Bars are the module runs (bit == 1); spaces are the separators.
    let mut value: u64 = 0;
    let mut bars = 0usize;
    for &(bit, wide) in &elements {
        if bit != 1 {
            continue;
        }
        bars += 1;
        value = if wide { value * 2 + 2 } else { value * 2 + 1 };
        if value > u32::MAX as u64 {
            return None;
        }
    }

    if bars == 0 || !(3..=131_070).contains(&value) {
        return None;
    }
    Some(value.to_string())
}
