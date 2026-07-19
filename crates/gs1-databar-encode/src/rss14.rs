//! RSS-14 (GS1 DataBar Omnidirectional) encoder — value → module bits.
//!
//! Constructs the symbol as element widths in exactly the order/polarity the
//! sibling `mission-platform-gs1-databar-decode` reads them, so the two crates
//! round-trip. The four data characters (two outer "outside" and two inner
//! "inside") are derived from the GTIN value, and the two finders from the
//! symbol checksum, mirroring ISO/IEC 24724 §7.

use mission_platform_gs1_databar_common::get_rss_widths;

const OUTSIDE_EVEN_TOTAL_SUBSET: [i64; 5] = [1, 10, 34, 70, 126];
const INSIDE_ODD_TOTAL_SUBSET: [i64; 4] = [4, 20, 48, 81];
const OUTSIDE_GSUM: [i64; 5] = [0, 161, 961, 2015, 2715];
const INSIDE_GSUM: [i64; 4] = [0, 336, 1036, 1516];
const OUTSIDE_ODD_WIDEST: [i64; 5] = [8, 6, 4, 3, 1];
const INSIDE_ODD_WIDEST: [i64; 4] = [2, 4, 6, 8];

/// The five-element finder patterns (element 5 is always a single module),
/// indexed by finder value 0..8. The first four elements match the decoder's
/// `FINDER_PATTERNS`; the trailing `1` is the module the decoder detects but
/// does not use for the value.
const FINDER_PATTERNS: [[u16; 5]; 9] = [
    [3, 8, 2, 1, 1],
    [3, 5, 5, 1, 1],
    [3, 3, 7, 1, 1],
    [3, 1, 9, 1, 1],
    [2, 7, 4, 1, 1],
    [2, 5, 6, 1, 1],
    [2, 3, 8, 1, 1],
    [1, 5, 7, 1, 1],
    [1, 3, 9, 1, 1],
];

/// Parse the payload into a 13-digit numeric value (any 14th check digit is
/// recomputed/ignored). Returns `None` for non-numeric or over-long input.
fn parse_value(data: &str) -> Option<u64> {
    if data.is_empty() || data.len() > 14 || !data.bytes().all(|b| b.is_ascii_digit()) {
        return None;
    }
    // Use the leading 13 digits as the information value (drop a supplied check
    // digit); a 13-or-fewer-digit input is taken verbatim.
    let digits = if data.len() == 14 { &data[..13] } else { data };
    digits.parse::<u64>().ok()
}

/// Element widths (8) of one outside character, in decoder read order.
fn outside_widths(value: i64) -> Option<[u16; 8]> {
    // Invert construct: value = v_odd * t_even + v_even + g_sum, grouped by the
    // odd-sum. Search the group whose g_sum range contains `value`.
    for group in (0..5).rev() {
        if value >= OUTSIDE_GSUM[group] {
            let rel = value - OUTSIDE_GSUM[group];
            let t_even = OUTSIDE_EVEN_TOTAL_SUBSET[group];
            let v_odd = rel / t_even;
            let v_even = rel % t_even;
            let odd_widest = OUTSIDE_ODD_WIDEST[group];
            let even_widest = 9 - odd_widest;
            // odd sum = 12 - 2*group ; even sum = 16 - odd_sum
            let odd_sum = 12 - 2 * group as i64;
            let even_sum = 16 - odd_sum;
            let odd = get_rss_widths(v_odd, odd_sum, 4, odd_widest, false);
            let even = get_rss_widths(v_even, even_sum, 4, even_widest, true);
            return Some(interleave(&odd, &even));
        }
    }
    None
}

/// Element widths (8) of one inside character, in decoder read order.
fn inside_widths(value: i64) -> Option<[u16; 8]> {
    for group in (0..4).rev() {
        if value >= INSIDE_GSUM[group] {
            let rel = value - INSIDE_GSUM[group];
            let t_odd = INSIDE_ODD_TOTAL_SUBSET[group];
            let v_even = rel / t_odd;
            let v_odd = rel % t_odd;
            let odd_widest = INSIDE_ODD_WIDEST[group];
            let even_widest = 9 - odd_widest;
            let even_sum = 10 - 2 * group as i64;
            let odd_sum = 15 - even_sum;
            let odd = get_rss_widths(v_odd, odd_sum, 4, odd_widest, true);
            let even = get_rss_widths(v_even, even_sum, 4, even_widest, false);
            return Some(interleave(&odd, &even));
        }
    }
    None
}

/// Interleave the four odd and four even element widths into the 8-element
/// counter order (`odd0, even0, odd1, even1, ...`).
fn interleave(odd: &[u16], even: &[u16]) -> [u16; 8] {
    let mut out = [0u16; 8];
    for i in 0..4 {
        out[2 * i] = odd[i];
        out[2 * i + 1] = even[i];
    }
    out
}

/// Checksum portion of one 8-element character (interleaved `odd0,even0,...`),
/// matching the decoder: `oddChecksum + 3*evenChecksum`, each a base-9 number
/// read high element to low.
fn checksum_portion(widths: &[u16; 8]) -> i64 {
    let odd = [widths[0], widths[2], widths[4], widths[6]];
    let even = [widths[1], widths[3], widths[5], widths[7]];
    let mut odd_cs = 0i64;
    for &c in odd.iter().rev() {
        odd_cs = odd_cs * 9 + c as i64;
    }
    let mut even_cs = 0i64;
    for &c in even.iter().rev() {
        even_cs = even_cs * 9 + c as i64;
    }
    odd_cs + 3 * even_cs
}

/// Select `(left_finder, right_finder)` whose checksum target matches
/// `check_value`, inverting the decoder's `check_checksum` adjustment.
fn select_finders(check_value: i64) -> Option<(usize, usize)> {
    for lf in 0..9usize {
        for rf in 0..9usize {
            let mut target = 9 * lf as i64 + rf as i64;
            if target > 72 {
                target -= 1;
            }
            if target > 8 {
                target -= 1;
            }
            if target == check_value {
                return Some((lf, rf));
            }
        }
    }
    None
}

/// Render a sequence of element widths as module bits, alternating bar/space and
/// starting with a bar (`1` = dark bar, `0` = light space).
fn render(elements: &[u16]) -> Vec<u8> {
    let mut out = Vec::new();
    let mut bar = true;
    for &w in elements {
        out.extend(std::iter::repeat(if bar { 1u8 } else { 0u8 }).take(w as usize));
        bar = !bar;
    }
    out
}

/// Encode a GTIN payload as an RSS-14 module run (`1` = dark bar).
///
/// The symbol is laid out in exactly the order the decoder reads: a left pair
/// (`outsideL`, `finderL`, reversed `insideL`) followed by the mirror image of
/// the right pair, so `decode_row` recovers it. Rendered as a strict
/// bar/space alternation starting with a bar (plus a single-module quiet zone on
/// each side).
pub fn encode(data: &str) -> Option<Vec<u8>> {
    let v = parse_value(data)? as i64;
    let left = v / 4_537_077;
    let right = v % 4_537_077;
    let outside_l = outside_widths(left / 1597)?;
    let inside_l = inside_widths(left % 1597)?;
    let outside_r = outside_widths(right / 1597)?;
    let inside_r = inside_widths(right % 1597)?;

    let left_checksum = checksum_portion(&outside_l) + 4 * checksum_portion(&inside_l);
    let right_checksum = checksum_portion(&outside_r) + 4 * checksum_portion(&inside_r);
    let check_value = (left_checksum + 16 * right_checksum).rem_euclid(79);
    let (lf, rf) = select_finders(check_value)?;

    let mut elements: Vec<u16> = Vec::with_capacity(43);
    // Leading guard bar: one dark module that seats the outside character's first
    // (light) element on the correct colour parity, matching real symbols.
    elements.push(1);
    // Left pair, left-to-right: outside, finder, then the inside character in the
    // reversed order the decoder records it.
    elements.extend_from_slice(&outside_l);
    elements.extend_from_slice(&FINDER_PATTERNS[lf]);
    elements.extend(inside_l.iter().rev().copied());
    // Right pair, mirror image: insideR, reversed finderR, reversed outsideR.
    elements.extend_from_slice(&inside_r);
    elements.extend(FINDER_PATTERNS[rf].iter().rev().copied());
    elements.extend(outside_r.iter().rev().copied());

    let mut modules = vec![0u8]; // leading quiet-zone module
    modules.extend(render(&elements));
    modules.push(0); // trailing quiet-zone module
    Some(modules)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_non_numeric() {
        assert!(encode("").is_none());
        assert!(encode("12A4").is_none());
        assert!(encode("123456789012345").is_none()); // too long
    }

    #[test]
    fn encodes_known_gtin_length() {
        // A 14-digit GTIN renders to a fixed-width symbol (guard + 42 elements +
        // two quiet-zone modules).
        let modules = encode("04412345678909").expect("encode");
        assert!(modules.len() > 40);
        // First and last modules are quiet-zone (light).
        assert_eq!(modules[0], 0);
        assert_eq!(*modules.last().unwrap(), 0);
    }
}
