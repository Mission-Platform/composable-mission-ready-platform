//! RSS-14 (GS1 DataBar Omnidirectional / Truncated / Stacked) row decoder.
//!
//! A faithful port of ZXing's `com.google.zxing.oned.rss.RSS14Reader`
//! (Apache-2.0). Operates on a single horizontal scan line represented as a run
//! of booleans (`true` = dark bar, `false` = light space) — the same convention
//! as the repo's other 1D module runs. See ISO/IEC 24724:2006.

use mission_platform_gs1_databar_common::{get_rss_value, parse_finder_value};

const OUTSIDE_EVEN_TOTAL_SUBSET: [i64; 5] = [1, 10, 34, 70, 126];
const INSIDE_ODD_TOTAL_SUBSET: [i64; 4] = [4, 20, 48, 81];
const OUTSIDE_GSUM: [i64; 5] = [0, 161, 961, 2015, 2715];
const INSIDE_GSUM: [i64; 4] = [0, 336, 1036, 1516];
const OUTSIDE_ODD_WIDEST: [i64; 5] = [8, 6, 4, 3, 1];
const INSIDE_ODD_WIDEST: [i64; 4] = [2, 4, 6, 8];

pub(crate) const FINDER_PATTERNS: [[u16; 4]; 9] = [
    [3, 8, 2, 1],
    [3, 5, 5, 1],
    [3, 3, 7, 1],
    [3, 1, 9, 1],
    [2, 7, 4, 1],
    [2, 5, 6, 1],
    [2, 3, 8, 1],
    [1, 5, 7, 1],
    [1, 3, 9, 1],
];

/// A decoded finder pattern occurrence: its 0..8 value and the `[start, end]`
/// element span (in the row's coordinates) it occupies.
#[derive(Clone, Copy)]
struct FinderPattern {
    value: i64,
    start_end: [usize; 2],
}

/// A decoded data character: its combinatorial value and checksum contribution.
#[derive(Clone, Copy)]
struct DataCharacter {
    value: i64,
    checksum_portion: i64,
}

/// A left or right half of the symbol: combined character value, checksum
/// portion and the finder that framed it.
#[derive(Clone, Copy)]
struct Pair {
    value: i64,
    checksum_portion: i64,
    finder: FinderPattern,
}

/// Decode a single RSS-14 scan line into its 14-digit GTIN, or `None`.
pub fn decode_row(row: &[bool]) -> Option<String> {
    let left = decode_pair(row, false);
    let reversed: Vec<bool> = row.iter().rev().copied().collect();
    let right = decode_pair(&reversed, true);
    let (left, right) = (left?, right?);
    if !check_checksum(&left, &right) {
        return None;
    }
    Some(construct_result(&left, &right))
}

fn construct_result(left: &Pair, right: &Pair) -> String {
    let symbol_value = 4_537_077i64 * left.value + right.value;
    let text = symbol_value.to_string();
    let mut buffer = String::with_capacity(14);
    for _ in 0..(13 - text.len() as i64).max(0) {
        buffer.push('0');
    }
    buffer.push_str(&text);
    let bytes = buffer.as_bytes();
    let mut check_digit = 0i64;
    for (i, b) in bytes.iter().enumerate().take(13) {
        let digit = (b - b'0') as i64;
        check_digit += if i & 1 == 0 { 3 * digit } else { digit };
    }
    check_digit = 10 - (check_digit % 10);
    if check_digit == 10 {
        check_digit = 0;
    }
    buffer.push((b'0' + check_digit as u8) as char);
    buffer
}

fn check_checksum(left: &Pair, right: &Pair) -> bool {
    let check_value = (left.checksum_portion + 16 * right.checksum_portion) % 79;
    let mut target = 9 * left.finder.value + right.finder.value;
    if target > 72 {
        target -= 1;
    }
    if target > 8 {
        target -= 1;
    }
    check_value == target
}

fn decode_pair(row: &[bool], right: bool) -> Option<Pair> {
    let (start_end, finder_counters) = find_finder_pattern(row, right)?;
    let pattern = parse_found_finder_pattern(row, start_end, finder_counters)?;
    let outside = decode_data_character(row, &pattern, true)?;
    let inside = decode_data_character(row, &pattern, false)?;
    Some(Pair {
        value: 1597 * outside.value + inside.value,
        checksum_portion: outside.checksum_portion + 4 * inside.checksum_portion,
        finder: pattern,
    })
}

/// Count runs of alternating colour into `counters`, starting at `start` and
/// moving right. Returns `false` if the row ends before all counters are filled
/// (ZXing's `OneDReader.recordPattern`).
fn record_pattern(row: &[bool], start: usize, counters: &mut [u16]) -> bool {
    let num = counters.len();
    counters.iter_mut().for_each(|c| *c = 0);
    let end = row.len();
    if start >= end {
        return false;
    }
    let mut is_white = !row[start];
    let mut pos = 0usize;
    let mut i = start;
    while i < end {
        if row[i] != is_white {
            counters[pos] += 1;
        } else {
            pos += 1;
            if pos == num {
                break;
            }
            counters[pos] = 1;
            is_white = !is_white;
        }
        i += 1;
    }
    pos == num || (pos == num - 1 && i == end)
}

/// Fill `counters` from the elements immediately to the *left* of `start`, in
/// left-to-right order (ZXing's `OneDReader.recordPatternInReverse`).
fn record_pattern_in_reverse(row: &[bool], start: usize, counters: &mut [u16]) -> bool {
    let mut transitions_left = counters.len() as i64;
    let mut last = row[start];
    let mut pos = start;
    while pos > 0 && transitions_left >= 0 {
        pos -= 1;
        if row[pos] != last {
            transitions_left -= 1;
            last = !last;
        }
    }
    if transitions_left >= 0 {
        return false;
    }
    record_pattern(row, pos + 1, counters)
}

/// The finder-ratio test from ISO/IEC 24724 §7.2.7 (ZXing's `isFinderPattern`).
fn is_finder_pattern(counters: &[u16; 4]) -> bool {
    const MIN_RATIO: f32 = 9.5 / 12.0;
    const MAX_RATIO: f32 = 12.5 / 14.0;
    let first_two = counters[0] as i64 + counters[1] as i64;
    let sum = first_two + counters[2] as i64 + counters[3] as i64;
    let ratio = first_two as f32 / sum as f32;
    if (MIN_RATIO..=MAX_RATIO).contains(&ratio) {
        let min = *counters.iter().min().unwrap() as i64;
        let max = *counters.iter().max().unwrap() as i64;
        return max < 10 * min;
    }
    false
}

/// Scan for the four-element finder pattern, returning its `[start, end]` span
/// plus the four element widths (ZXing's `RSS14Reader.findFinderPattern`). When
/// `right` is set the caller has already reversed the row.
fn find_finder_pattern(row: &[bool], right: bool) -> Option<([usize; 2], [u16; 4])> {
    let mut counters = [0u16; 4];
    let width = row.len();
    let mut is_white = false;
    let mut row_offset = 0usize;
    while row_offset < width {
        is_white = !row[row_offset];
        if right == is_white {
            break;
        }
        row_offset += 1;
    }
    if row_offset >= width {
        return None;
    }

    let mut counter_position = 0usize;
    let mut pattern_start = row_offset;
    let mut x = row_offset;
    while x < width {
        if row[x] != is_white {
            counters[counter_position] += 1;
        } else {
            if counter_position == 3 {
                if is_finder_pattern(&counters) {
                    return Some(([pattern_start, x], counters));
                }
                pattern_start += (counters[0] + counters[1]) as usize;
                counters[0] = counters[2];
                counters[1] = counters[3];
                counters[2] = 0;
                counters[3] = 0;
                counter_position -= 1;
            } else {
                counter_position += 1;
            }
            counters[counter_position] = 1;
            is_white = !is_white;
        }
        x += 1;
    }
    None
}

/// Locate element 1 to the left of the detected finder, prepend it, and match
/// the resulting four widths against [`FINDER_PATTERNS`] to get the finder value
/// (ZXing's `RSS14Reader.parseFoundFinderPattern`).
fn parse_found_finder_pattern(
    row: &[bool],
    start_end: [usize; 2],
    counters: [u16; 4],
) -> Option<FinderPattern> {
    let first_is_black = row[start_end[0]];
    let mut first_element_start = start_end[0] as i64 - 1;
    while first_element_start >= 0 && first_is_black != row[first_element_start as usize] {
        first_element_start -= 1;
    }
    first_element_start += 1;
    let first_counter = (start_end[0] as i64 - first_element_start) as u16;
    // Shift right by one and set element 1 as the new head: [c0,c1,c2,c3] ->
    // [firstCounter, c0, c1, c2].
    let shifted = [first_counter, counters[0], counters[1], counters[2]];
    let value = parse_finder_value(&shifted, &FINDER_PATTERNS)? as i64;
    Some(FinderPattern {
        value,
        start_end: [first_element_start as usize, start_end[1]],
    })
}

/// Increment the element with the largest positive rounding error.
fn increment(counts: &mut [u16], errors: &[f32]) {
    let mut index = 0;
    let mut biggest = errors[0];
    for i in 1..counts.len() {
        if errors[i] > biggest {
            biggest = errors[i];
            index = i;
        }
    }
    counts[index] += 1;
}

/// Decrement the element with the most negative rounding error.
fn decrement(counts: &mut [u16], errors: &[f32]) {
    let mut index = 0;
    let mut biggest = errors[0];
    for i in 1..counts.len() {
        if errors[i] < biggest {
            biggest = errors[i];
            index = i;
        }
    }
    counts[index] -= 1;
}

/// Decode one 8-element data character (outside = 16 modules, inside = 15) into
/// its combinatorial value and checksum portion (ZXing's `decodeDataCharacter`).
fn decode_data_character(
    row: &[bool],
    pattern: &FinderPattern,
    outside_char: bool,
) -> Option<DataCharacter> {
    let mut counters = [0u16; 8];
    if outside_char {
        if !record_pattern_in_reverse(row, pattern.start_end[0], &mut counters) {
            return None;
        }
    } else {
        if !record_pattern(row, pattern.start_end[1], &mut counters) {
            return None;
        }
        counters.reverse();
    }

    let num_modules = if outside_char { 16 } else { 15 };
    let sum: u32 = counters.iter().map(|&c| c as u32).sum();
    let element_width = sum as f32 / num_modules as f32;
    if element_width <= 0.0 {
        return None;
    }

    let mut odd_counts = [0u16; 4];
    let mut even_counts = [0u16; 4];
    let mut odd_errors = [0f32; 4];
    let mut even_errors = [0f32; 4];

    for (i, &counter) in counters.iter().enumerate() {
        let value = counter as f32 / element_width;
        let mut count = (value + 0.5) as i32;
        if count < 1 {
            count = 1;
        } else if count > 8 {
            count = 8;
        }
        let offset = i / 2;
        if i & 1 == 0 {
            odd_counts[offset] = count as u16;
            odd_errors[offset] = value - count as f32;
        } else {
            even_counts[offset] = count as u16;
            even_errors[offset] = value - count as f32;
        }
    }

    adjust_odd_even_counts(
        outside_char,
        num_modules,
        &mut odd_counts,
        &mut even_counts,
        &odd_errors,
        &even_errors,
    )?;

    let mut odd_sum = 0i64;
    let mut odd_checksum_portion = 0i64;
    for &c in odd_counts.iter().rev() {
        odd_checksum_portion = odd_checksum_portion * 9 + c as i64;
        odd_sum += c as i64;
    }
    let mut even_sum = 0i64;
    let mut even_checksum_portion = 0i64;
    for &c in even_counts.iter().rev() {
        even_checksum_portion = even_checksum_portion * 9 + c as i64;
        even_sum += c as i64;
    }
    let checksum_portion = odd_checksum_portion + 3 * even_checksum_portion;

    if outside_char {
        if odd_sum & 1 != 0 || odd_sum > 12 || odd_sum < 4 {
            return None;
        }
        let group = ((12 - odd_sum) / 2) as usize;
        let odd_widest = OUTSIDE_ODD_WIDEST[group];
        let even_widest = 9 - odd_widest;
        let v_odd = get_rss_value(&odd_counts, odd_widest, false);
        let v_even = get_rss_value(&even_counts, even_widest, true);
        let t_even = OUTSIDE_EVEN_TOTAL_SUBSET[group];
        let g_sum = OUTSIDE_GSUM[group];
        Some(DataCharacter {
            value: v_odd * t_even + v_even + g_sum,
            checksum_portion,
        })
    } else {
        if even_sum & 1 != 0 || even_sum > 10 || even_sum < 4 {
            return None;
        }
        let group = ((10 - even_sum) / 2) as usize;
        let odd_widest = INSIDE_ODD_WIDEST[group];
        let even_widest = 9 - odd_widest;
        let v_odd = get_rss_value(&odd_counts, odd_widest, true);
        let v_even = get_rss_value(&even_counts, even_widest, false);
        let t_odd = INSIDE_ODD_TOTAL_SUBSET[group];
        let g_sum = INSIDE_GSUM[group];
        Some(DataCharacter {
            value: v_even * t_odd + v_odd + g_sum,
            checksum_portion,
        })
    }
}

/// Nudge the rounded odd/even counts so their sums and parities are consistent
/// with the character's module total (ZXing's `adjustOddEvenCounts`). Returns
/// `None` on an inconsistency the nudges cannot repair.
fn adjust_odd_even_counts(
    outside_char: bool,
    num_modules: i64,
    odd_counts: &mut [u16; 4],
    even_counts: &mut [u16; 4],
    odd_errors: &[f32; 4],
    even_errors: &[f32; 4],
) -> Option<()> {
    let odd_sum: i64 = odd_counts.iter().map(|&c| c as i64).sum();
    let even_sum: i64 = even_counts.iter().map(|&c| c as i64).sum();

    let mut increment_odd = false;
    let mut decrement_odd = false;
    let mut increment_even = false;
    let mut decrement_even = false;

    if outside_char {
        if odd_sum > 12 {
            decrement_odd = true;
        } else if odd_sum < 4 {
            increment_odd = true;
        }
        if even_sum > 12 {
            decrement_even = true;
        } else if even_sum < 4 {
            increment_even = true;
        }
    } else {
        if odd_sum > 11 {
            decrement_odd = true;
        } else if odd_sum < 5 {
            increment_odd = true;
        }
        if even_sum > 10 {
            decrement_even = true;
        } else if even_sum < 4 {
            increment_even = true;
        }
    }

    let mismatch = odd_sum + even_sum - num_modules;
    let odd_parity_bad = (odd_sum & 1) == if outside_char { 1 } else { 0 };
    let even_parity_bad = (even_sum & 1) == 1;
    match mismatch {
        1 => {
            if odd_parity_bad {
                if even_parity_bad {
                    return None;
                }
                decrement_odd = true;
            } else {
                if !even_parity_bad {
                    return None;
                }
                decrement_even = true;
            }
        }
        -1 => {
            if odd_parity_bad {
                if even_parity_bad {
                    return None;
                }
                increment_odd = true;
            } else {
                if !even_parity_bad {
                    return None;
                }
                increment_even = true;
            }
        }
        0 => {
            if odd_parity_bad {
                if !even_parity_bad {
                    return None;
                }
                // Both bad.
                if odd_sum < even_sum {
                    increment_odd = true;
                    decrement_even = true;
                } else {
                    decrement_odd = true;
                    increment_even = true;
                }
            } else if even_parity_bad {
                return None;
            }
        }
        _ => return None,
    }

    if increment_odd {
        if decrement_odd {
            return None;
        }
        increment(odd_counts, odd_errors);
    }
    if decrement_odd {
        decrement(odd_counts, odd_errors);
    }
    if increment_even {
        if decrement_even {
            return None;
        }
        // NOTE: ZXing passes `oddRoundingErrors` here; preserved for fidelity.
        increment(even_counts, odd_errors);
    }
    if decrement_even {
        decrement(even_counts, even_errors);
    }
    Some(())
}
