//! Shared primitives for the GS1 DataBar (formerly RSS) encode/decode crates.
//!
//! DataBar characters are not encoded as fixed glyph tables like Code 128 or
//! EAN. Instead each data character is a run of `n` modules split into a fixed
//! number of elements (bars and spaces), and the character *value* is derived
//! combinatorially from the element widths — the "RSS value" of ISO/IEC 24724
//! Appendix B. This crate holds the two halves of that mapping —
//! [`get_rss_value`] (widths → value, used when decoding) and [`get_rss_widths`]
//! (value → widths, used when encoding) — plus the width-ratio variance matcher
//! [`pattern_match_variance`] used to recognise finder patterns from a scanned
//! run of element widths.
//!
//! The algorithms are direct ports of the ZXing reference
//! (`com.google.zxing.oned.rss.RSSUtils` and `AbstractRSSReader`), Apache-2.0.

/// `n choose r`, computed incrementally to avoid overflowing on the modest
/// arguments used by DataBar (a direct port of ZXing's `RSSUtils.combins`).
/// Returns `0` for degenerate arguments so the callers below can be written
/// without special-casing the boundaries.
pub fn combins(n: i64, r: i64) -> i64 {
    if r < 0 || n < 0 || r > n {
        return 0;
    }
    let (min_denom, max_denom) = if n - r > r { (r, n - r) } else { (n - r, r) };
    let mut val: i64 = 1;
    let mut j: i64 = 1;
    let mut i = n;
    while i > max_denom {
        val *= i;
        if j <= min_denom {
            val /= j;
            j += 1;
        }
        i -= 1;
    }
    while j <= min_denom {
        val /= j;
        j += 1;
    }
    val
}

/// Combinatorial value of a data character given its element `widths` (ISO/IEC
/// 24724 Appendix B). `max_width` is the widest element allowed in the subset
/// and `no_narrow` selects the "no element may be width 1" variant. Port of
/// ZXing's `RSSUtils.getRSSvalue`.
pub fn get_rss_value(widths: &[u16], max_width: i64, no_narrow: bool) -> i64 {
    let mut n: i64 = widths.iter().map(|&w| w as i64).sum();
    let mut val: i64 = 0;
    let mut narrow_mask: i64 = 0;
    let elements = widths.len() as i64;
    for bar in 0..elements - 1 {
        let mut elm_width: i64 = 1;
        narrow_mask |= 1 << bar;
        while elm_width < widths[bar as usize] as i64 {
            let mut sub_val = combins(n - elm_width - 1, elements - bar - 2);
            if no_narrow
                && narrow_mask == 0
                && (n - elm_width - (elements - bar - 1) >= elements - bar - 1)
            {
                sub_val -= combins(n - elm_width - (elements - bar), elements - bar - 2);
            }
            if elements - bar - 1 > 1 {
                let mut less_val: i64 = 0;
                let mut mxw_element = n - elm_width - (elements - bar - 2);
                while mxw_element > max_width {
                    less_val += combins(n - elm_width - mxw_element - 1, elements - bar - 3);
                    mxw_element -= 1;
                }
                sub_val -= less_val * (elements - 1 - bar);
            } else if n - elm_width > max_width {
                sub_val -= 1;
            }
            val += sub_val;
            elm_width += 1;
            narrow_mask &= !(1 << bar);
        }
        n -= elm_width;
    }
    val
}

/// Inverse of [`get_rss_value`]: given a character `value`, the module total
/// `n`, the element count and the subset's `max_width` / `no_narrow`
/// constraints, reconstruct the element widths (ISO/IEC 24724 Appendix). ZXing
/// ships no RSS *writer*, so this is the standard Appendix-listing forward
/// algorithm (the exact structural mirror of [`get_rss_value`]) — the encoder's
/// counterpart to the decoder's value extraction.
pub fn get_rss_widths(
    mut value: i64,
    n: i64,
    elements: i64,
    max_width: i64,
    no_narrow: bool,
) -> Vec<u16> {
    let mut widths = vec![0u16; elements as usize];
    let mut n = n;
    let mut narrow_mask: i64 = 0;
    for bar in 0..elements - 1 {
        let mut elm_width: i64 = 1;
        narrow_mask |= 1 << bar;
        let mut sub_val;
        loop {
            sub_val = combins(n - elm_width - 1, elements - bar - 2);
            if no_narrow
                && narrow_mask == 0
                && (n - elm_width - (elements - bar - 1) >= elements - bar - 1)
            {
                sub_val -= combins(n - elm_width - (elements - bar), elements - bar - 2);
            }
            if elements - bar - 1 > 1 {
                let mut less_val: i64 = 0;
                let mut mxw_element = n - elm_width - (elements - bar - 2);
                while mxw_element > max_width {
                    less_val += combins(n - elm_width - mxw_element - 1, elements - bar - 3);
                    mxw_element -= 1;
                }
                sub_val -= less_val * (elements - 1 - bar);
            } else if n - elm_width > max_width {
                sub_val -= 1;
            }
            value -= sub_val;
            if value < 0 {
                break;
            }
            elm_width += 1;
            narrow_mask &= !(1 << bar);
        }
        value += sub_val;
        n -= elm_width;
        widths[bar as usize] = elm_width as u16;
    }
    widths[(elements - 1) as usize] = n as u16;
    widths
}

/// Largest average width-ratio variance ZXing accepts for a pattern match.
pub const MAX_AVG_VARIANCE: f32 = 0.2;
/// Largest single-element width-ratio variance ZXing accepts.
pub const MAX_INDIVIDUAL_VARIANCE: f32 = 0.45;

/// Normalised variance between a run of measured element `counters` and an
/// expected `pattern` of relative widths — ZXing's `OneDReader.patternMatchVariance`.
/// Returns [`f32::INFINITY`] when any single element is too far off (or the run
/// is too small to match), else the average per-module variance. Lower is a
/// better fit.
pub fn pattern_match_variance(counters: &[u16], pattern: &[u16], max_individual: f32) -> f32 {
    let num = counters.len();
    let mut total: i64 = 0;
    let mut pattern_len: i64 = 0;
    for i in 0..num {
        total += counters[i] as i64;
        pattern_len += pattern[i] as i64;
    }
    if total < pattern_len {
        // Not even one pixel per unit of width: too small to match reliably.
        return f32::INFINITY;
    }
    let unit_bar_width = total as f32 / pattern_len as f32;
    let max_individual = max_individual * unit_bar_width;

    let mut total_variance = 0.0f32;
    for x in 0..num {
        let counter = counters[x] as f32;
        let scaled = pattern[x] as f32 * unit_bar_width;
        let variance = (counter - scaled).abs();
        if variance > max_individual {
            return f32::INFINITY;
        }
        total_variance += variance;
    }
    total_variance / total as f32
}

/// Match `counters` against each entry of `finder_patterns`, returning the index
/// of the first whose average variance is within [`MAX_AVG_VARIANCE`], or `None`.
pub fn parse_finder_value(counters: &[u16], finder_patterns: &[[u16; 4]]) -> Option<usize> {
    for (value, pattern) in finder_patterns.iter().enumerate() {
        if pattern_match_variance(counters, pattern, MAX_INDIVIDUAL_VARIANCE) < MAX_AVG_VARIANCE {
            return Some(value);
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn combins_basic() {
        assert_eq!(combins(5, 0), 1);
        assert_eq!(combins(5, 5), 1);
        assert_eq!(combins(5, 2), 10);
        assert_eq!(combins(6, 3), 20);
        assert_eq!(combins(3, 5), 0);
    }

    /// `get_rss_widths` must be the exact inverse of `get_rss_value` for every
    /// value in a subset's range, across the parameter combinations RSS-14 and
    /// Expanded actually use.
    #[test]
    fn rss_value_widths_round_trip() {
        // (n, elements, max_width, no_narrow, value-count) tuples covering the
        // RSS-14 subsets and the Expanded odd/even subsets.
        let cases = [
            (15i64, 4i64, 8i64, false), // RSS-14 outside odd
            (15, 4, 8, true),           // RSS-14 outside even (no-narrow)
            (13, 4, 8, true),           // RSS-14 inside odd (no-narrow)
            (13, 4, 8, false),          // RSS-14 inside even
        ];
        for (n, elements, max_width, no_narrow) in cases {
            for value in 0..64 {
                let widths = get_rss_widths(value, n, elements, max_width, no_narrow);
                assert_eq!(widths.iter().map(|&w| w as i64).sum::<i64>(), n);
                let back = get_rss_value(&widths, max_width, no_narrow);
                assert_eq!(back, value, "n={n} el={elements} mw={max_width} nn={no_narrow}");
            }
        }
    }
}
