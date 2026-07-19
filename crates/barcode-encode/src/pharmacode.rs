//! Pharmacode (Laetus): a binary pharmaceutical packing code with no start,
//! stop or check characters. A numeric value in `3..=131070` is encoded as a
//! run of narrow / wide bars separated by single-width spaces; a narrow bar is a
//! binary `0`, a wide bar a binary `1`, read most-significant bar first.

use mission_platform_barcode_common::widths_to_modules;

/// Narrow / wide bar widths (a 1:3 ratio keeps the two classes clearly
/// separable when the module run is decoded).
const NARROW: u8 = 1;
const WIDE: u8 = 3;

/// The inclusive value range a Pharmacode can represent.
pub const MIN_VALUE: u32 = 3;
pub const MAX_VALUE: u32 = 131_070;

/// Encode `data` (a decimal string in `3..=131070`) as Pharmacode. Returns
/// `None` for non-numeric input or a value outside the representable range.
#[tracing::instrument(skip_all)]
pub fn encode(data: &str) -> Option<Vec<u8>> {
    let mut value: u32 = data.parse().ok()?;
    if !(MIN_VALUE..=MAX_VALUE).contains(&value) {
        return None;
    }

    // Peel bars off from the least-significant end, then reverse so the symbol
    // is drawn most-significant bar first (matching the decoder's fold).
    let mut bars = Vec::new();
    while value > 0 {
        if value % 2 == 0 {
            bars.push(WIDE);
            value = (value - 2) / 2;
        } else {
            bars.push(NARROW);
            value = (value - 1) / 2;
        }
    }
    bars.reverse();

    // Interleave a single-width space between adjacent bars.
    let mut widths = Vec::new();
    for (index, &bar) in bars.iter().enumerate() {
        if index > 0 {
            widths.push(NARROW);
        }
        widths.push(bar);
    }
    Some(widths_to_modules(&widths, true))
}

#[cfg(test)]
mod tests {
    use super::encode;

    #[test]
    #[tracing::instrument(skip_all)]
    fn encodes_the_minimum_value_as_two_narrow_bars() {
        // 3 -> two narrow bars separated by a narrow space: bar, space, bar.
        assert_eq!(encode("3"), Some(vec![1, 0, 1]));
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn rejects_out_of_range_and_non_numeric() {
        assert!(encode("2").is_none(), "below the minimum");
        assert!(encode("131071").is_none(), "above the maximum");
        assert!(encode("12x").is_none(), "non-numeric");
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn is_binary() {
        let modules = encode("1234").expect("valid Pharmacode");
        assert!(modules.iter().all(|&bit| bit <= 1), "modules must be 0/1");
        assert_eq!(modules[0], 1, "starts with a bar");
    }
}
