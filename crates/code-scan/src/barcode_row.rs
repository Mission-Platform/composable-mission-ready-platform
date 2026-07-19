//! ZXing-style per-digit run-width decoder for the UPC/EAN family.
//!
//! The default 1D path in [`barcode`](crate::barcode) samples a scan line into a
//! flat run of module bits by quantising every run against a **single global
//! module unit**, then hands those bits to `barcode-decode`. On a clean upload
//! that is exact, but on a camera photo the module width is not constant across
//! the symbol — perspective, blur and uneven printing stretch it — so one global
//! unit rounds many elements against the wrong grid and the rigid EAN/UPC cell
//! decoder rejects the result: the symbol is *located but not decoded*.
//!
//! ZXing avoids this by never quantising to a global grid. It walks the scan
//! line pattern-by-pattern and, for **each digit independently**, normalises that
//! digit's four run widths to the seven-module cell before matching it against
//! the L/G/R width tables (`patternMatchVariance`). Because every digit carries
//! its own local unit, gradual drift across the symbol no longer defeats the
//! read. This module ports that reader for EAN-13 / UPC-A (via EAN-13),
//! EAN-8 and UPC-E, operating directly on the binarised rows in the located
//! barcode band, and is used as a fallback after the grid decoder fails.

use crate::image::Bitmap;

/// L (odd-parity) digit patterns as run-width **counters** (bar/space widths
/// summing to the seven-module cell). Shared with the right (R) half, whose
/// digits have identical widths but start on a bar rather than a space, and — via
/// [`l_and_g_patterns`] — with the even-parity (G) half, whose widths are the
/// reverse of these.
const L_PATTERNS: [[u32; 4]; 10] = [
    [3, 2, 1, 1],
    [2, 2, 2, 1],
    [2, 1, 2, 2],
    [1, 4, 1, 1],
    [1, 1, 3, 2],
    [1, 2, 3, 1],
    [1, 1, 1, 4],
    [1, 3, 1, 2],
    [1, 2, 1, 3],
    [3, 1, 1, 2],
];

/// EAN-13 leading-digit parity pattern (`true` = even / G) for each first digit.
/// Mirrors `PARITY` in `barcode-decode`.
const PARITY: [[bool; 6]; 10] = [
    [false, false, false, false, false, false],
    [false, false, true, false, true, true],
    [false, false, true, true, false, true],
    [false, false, true, true, true, false],
    [false, true, false, false, true, true],
    [false, true, true, false, false, true],
    [false, true, true, true, false, false],
    [false, true, false, true, false, true],
    [false, true, false, true, true, false],
    [false, true, true, false, true, false],
];

/// UPC-E parity pattern (number system `0`) for each check digit. Mirrors
/// `UPCE_PARITY` in `barcode-decode`.
const UPCE_PARITY: [[bool; 6]; 10] = [
    [true, true, true, false, false, false],
    [true, true, false, true, false, false],
    [true, true, false, false, true, false],
    [true, true, false, false, false, true],
    [true, false, true, true, false, false],
    [true, false, false, true, true, false],
    [true, false, false, false, true, true],
    [true, false, true, false, true, false],
    [true, false, true, false, false, true],
    [true, false, false, true, false, true],
];

/// The 20-entry left-half table: the 10 L (odd) patterns followed by the 10 G
/// (even) patterns, each G being the reverse of the matching L pattern. A left
/// digit index `>= 10` decoded against this table means the cell used G parity.
fn l_and_g_patterns() -> [[u32; 4]; 20] {
    let mut table = [[0u32; 4]; 20];
    for (digit, pattern) in L_PATTERNS.iter().enumerate() {
        table[digit] = *pattern;
        table[digit + 10] = [pattern[3], pattern[2], pattern[1], pattern[0]];
    }
    table
}

/// The three-element `1:1:1` start/end guard (`bar space bar`, or its inverse at
/// the end).
const START_END_PATTERN: [u32; 3] = [1, 1, 1];
/// The five-element `1:1:1:1:1` centre guard splitting the two halves.
const MIDDLE_PATTERN: [u32; 5] = [1, 1, 1, 1, 1];
/// The six-element `1:1:1:1:1:1` UPC-E terminator.
const END_PATTERN: [u32; 6] = [1, 1, 1, 1, 1, 1];

/// Maximum acceptable *average* per-module variance for a run-width window to
/// match a pattern (ZXing `MAX_AVG_VARIANCE`).
const MAX_AVG_VARIANCE: f64 = 0.48;
/// Maximum acceptable *individual* per-element variance (ZXing
/// `MAX_INDIVIDUAL_VARIANCE`); a single grossly wrong element rejects the window
/// outright.
const MAX_INDIVIDUAL_VARIANCE: f64 = 0.7;

/// A single binarised scan line (`get(x)` = `true` when the pixel is dark/bar),
/// the ZXing `BitArray` equivalent the reader walks.
struct Row<'a> {
    bitmap: &'a Bitmap,
    y: i64,
    width: usize,
}

impl Row<'_> {
    #[inline]
    fn get(&self, x: usize) -> bool {
        self.bitmap.get(x as i64, self.y)
    }

    /// The first `x >= from` whose pixel is dark (a bar), or the width when none.
    fn next_set(&self, from: usize) -> usize {
        let mut x = from;
        while x < self.width && !self.get(x) {
            x += 1;
        }
        x
    }

    /// The first `x >= from` whose pixel is light (a space), or the width when none.
    fn next_unset(&self, from: usize) -> usize {
        let mut x = from;
        while x < self.width && self.get(x) {
            x += 1;
        }
        x
    }

    /// Whether every pixel in `[from, to)` is the `dark` colour requested.
    fn is_range(&self, from: usize, to: usize, dark: bool) -> bool {
        (from..to).all(|x| self.get(x) == dark)
    }
}

/// How closely a window of measured run `counters` matches an ideal `pattern`,
/// as the mean per-module deviation once the window is normalised to the
/// pattern's total width. Lower is better; [`f64::MAX`] means "no match"
/// (the window is smaller than the pattern, or a single element deviates beyond
/// `max_individual`). This is the local normalisation that makes each digit
/// tolerant of the neighbouring modules' drift.
fn pattern_match_variance(counters: &[u32], pattern: &[u32], max_individual: f64) -> f64 {
    let total: u32 = counters.iter().sum();
    let pattern_length: u32 = pattern.iter().sum();
    if total < pattern_length {
        // If we don't even have one pixel per unit there is no way this is a
        // valid match against a pattern that expects at least that many.
        return f64::MAX;
    }
    let unit = total as f64 / pattern_length as f64;
    let max_individual = max_individual * unit;

    let mut total_variance = 0.0;
    for (&counter, &expected) in counters.iter().zip(pattern.iter()) {
        let scaled = expected as f64 * unit;
        let variance = (counter as f64 - scaled).abs();
        if variance > max_individual {
            return f64::MAX;
        }
        total_variance += variance;
    }
    total_variance / total as f64
}

/// Read `counters.len()` consecutive runs from the row starting at `start`,
/// filling `counters` with their pixel widths. Returns `None` when the row ends
/// before the requested number of runs is complete.
fn record_pattern(row: &Row, start: usize, counters: &mut [u32]) -> Option<()> {
    let num = counters.len();
    counters.iter_mut().for_each(|c| *c = 0);
    if start >= row.width {
        return None;
    }
    // The colour of the run beginning at `start`. `dark` mirrors ZXing's
    // `isWhite` inverted: a pixel belongs to the current run while its colour
    // equals `dark`.
    let mut dark = row.get(start);
    let mut position = 0usize;
    let mut x = start;
    while x < row.width {
        if row.get(x) == dark {
            counters[position] += 1;
        } else {
            position += 1;
            if position == num {
                break;
            }
            counters[position] = 1;
            dark = !dark;
        }
        x += 1;
    }
    // Accept when all runs were filled, or the final run ran cleanly to the row
    // edge (ZXing's terminal condition).
    if position == num || (position == num - 1 && x == row.width) {
        Some(())
    } else {
        None
    }
}

/// Decode one digit at `offset` by matching its four measured runs against every
/// entry in `patterns`, returning the best-matching index and the pixel width it
/// consumed. `None` when no pattern matches within [`MAX_AVG_VARIANCE`].
fn decode_digit(row: &Row, offset: usize, patterns: &[[u32; 4]]) -> Option<(usize, usize)> {
    let mut counters = [0u32; 4];
    record_pattern(row, offset, &mut counters)?;

    let mut best_variance = MAX_AVG_VARIANCE;
    let mut best_match: Option<usize> = None;
    for (index, pattern) in patterns.iter().enumerate() {
        let variance = pattern_match_variance(&counters, pattern, MAX_INDIVIDUAL_VARIANCE);
        if variance < best_variance {
            best_variance = variance;
            best_match = Some(index);
        }
    }
    best_match.map(|index| (index, counters.iter().sum::<u32>() as usize))
}

/// Slide a window across the row from `offset` looking for the run pattern
/// `pattern`, starting on a light run when `white_first`. Returns the
/// `[start, end)` pixel range of the first match, mirroring ZXing's
/// `findGuardPattern`.
fn find_guard_pattern(
    row: &Row,
    offset: usize,
    white_first: bool,
    pattern: &[u32],
) -> Option<(usize, usize)> {
    let length = pattern.len();
    let mut counters = vec![0u32; length];
    // A "light-first" search begins at the next space, otherwise the next bar.
    let mut is_dark = !white_first;
    let mut x = if white_first {
        row.next_unset(offset)
    } else {
        row.next_set(offset)
    };
    let mut position = 0usize;
    let mut pattern_start = x;
    counters[0] = 0;
    while x < row.width {
        if row.get(x) == is_dark {
            counters[position] += 1;
        } else {
            if position == length - 1 {
                if pattern_match_variance(&counters, pattern, MAX_INDIVIDUAL_VARIANCE)
                    < MAX_AVG_VARIANCE
                {
                    return Some((pattern_start, x));
                }
                // Advance the window by two runs and keep scanning.
                pattern_start += (counters[0] + counters[1]) as usize;
                counters.copy_within(2.., 0);
                counters[length - 2] = 0;
                counters[length - 1] = 0;
                position -= 1;
            } else {
                position += 1;
            }
            counters[position] = 1;
            is_dark = !is_dark;
        }
        x += 1;
    }
    None
}

/// Find the start guard (`1:1:1` bar/space/bar) preceded by a quiet zone at
/// least as wide as the guard itself, returning its `[start, end)` range. The
/// quiet-zone requirement rejects a spurious `1:1:1` inside packaging clutter.
fn find_start_guard(row: &Row) -> Option<(usize, usize)> {
    let mut next_start = 0usize;
    loop {
        let (start, end) = find_guard_pattern(row, next_start, false, &START_END_PATTERN)?;
        next_start = end;
        let guard_width = end - start;
        if start >= guard_width && row.is_range(start - guard_width, start, false) {
            return Some((start, end));
        }
        if next_start >= row.width {
            return None;
        }
    }
}

/// Whether the region after an end guard `[guard_start, guard_end)` holds a
/// trailing quiet zone at least as wide as the guard. ZXing requires this after
/// the terminator; without it a `1:1:1` run *inside* an unrelated symbol frames a
/// spurious "barcode", which — combined with a coincidentally valid checksum —
/// produces the false positives seen on the negative corpus folders.
fn trailing_quiet_ok(row: &Row, guard_start: usize, guard_end: usize) -> bool {
    let guard_width = guard_end - guard_start;
    let quiet_end = guard_end + guard_width;
    quiet_end <= row.width && row.is_range(guard_end, quiet_end, false)
}

/// The standard UPC/EAN modulo-10 checksum digit for the data string `digits`
/// (everything except the trailing check digit), weighting from the right by
/// alternating 3 and 1.
fn standard_checksum(digits: &[u8]) -> u32 {
    let mut sum = 0u32;
    // Odd positions from the right (immediately left of the check) are weighted 3.
    let mut i = digits.len() as isize - 1;
    let mut odd = 0u32;
    while i >= 0 {
        odd += digits[i as usize] as u32;
        i -= 2;
    }
    sum += odd * 3;
    let mut i = digits.len() as isize - 2;
    while i >= 0 {
        sum += digits[i as usize] as u32;
        i -= 2;
    }
    (1000 - sum) % 10
}

/// Whether `value` (all ASCII digits, including its trailing check digit) has a
/// correct standard UPC/EAN checksum.
fn checksum_ok(value: &str) -> bool {
    let bytes: Vec<u8> = value.bytes().map(|b| b - b'0').collect();
    if bytes.len() < 2 {
        return false;
    }
    let (data, check) = bytes.split_at(bytes.len() - 1);
    standard_checksum(data) == check[0] as u32
}

/// Recover the EAN-13 leading digit from the six left-half parity bits (`true`
/// where the cell used even/G parity), or `None` when no first digit produces
/// that parity pattern.
fn determine_first_digit(lg_pattern: u32) -> Option<u8> {
    let parity: [bool; 6] = std::array::from_fn(|x| (lg_pattern >> (5 - x)) & 1 == 1);
    PARITY.iter().position(|p| *p == parity).map(|d| d as u8)
}

/// Decode an EAN-13 (also the carrier for UPC-A) symbol from `row`, validated by
/// its checksum. Returns the 13 digits, or `None` when the row does not frame a
/// checksum-valid EAN-13.
fn decode_ean13(row: &Row) -> Option<String> {
    let (_, start_end) = find_start_guard(row)?;
    let lg_table = l_and_g_patterns();

    let mut digits = String::new();
    let mut offset = start_end;
    let mut lg_pattern = 0u32;
    for x in 0..6 {
        let (best, width) = decode_digit(row, offset, &lg_table)?;
        digits.push((b'0' + (best % 10) as u8) as char);
        offset += width;
        if best >= 10 {
            lg_pattern |= 1 << (5 - x);
        }
    }
    let first = determine_first_digit(lg_pattern)?;

    let (_, middle_end) = find_guard_pattern(row, offset, true, &MIDDLE_PATTERN)?;
    offset = middle_end;
    for _ in 0..6 {
        let (best, width) = decode_digit(row, offset, &L_PATTERNS)?;
        digits.push((b'0' + best as u8) as char);
        offset += width;
    }

    // Require a well-formed end guard *and* a trailing quiet zone so a partial
    // read across clutter cannot pass.
    let (end_start, end_end) = find_guard_pattern(row, offset, false, &START_END_PATTERN)?;
    if !trailing_quiet_ok(row, end_start, end_end) {
        return None;
    }

    let value = format!("{first}{digits}");
    checksum_ok(&value).then_some(value)
}

/// Decode an EAN-8 symbol from `row`, validated by its checksum. Returns the 8
/// digits, or `None`.
fn decode_ean8(row: &Row) -> Option<String> {
    let (_, start_end) = find_start_guard(row)?;

    let mut digits = String::new();
    let mut offset = start_end;
    for _ in 0..4 {
        let (best, width) = decode_digit(row, offset, &L_PATTERNS)?;
        digits.push((b'0' + best as u8) as char);
        offset += width;
    }

    let (_, middle_end) = find_guard_pattern(row, offset, true, &MIDDLE_PATTERN)?;
    offset = middle_end;
    for _ in 0..4 {
        let (best, width) = decode_digit(row, offset, &L_PATTERNS)?;
        digits.push((b'0' + best as u8) as char);
        offset += width;
    }

    let (end_start, end_end) = find_guard_pattern(row, offset, false, &START_END_PATTERN)?;
    if !trailing_quiet_ok(row, end_start, end_end) {
        return None;
    }

    checksum_ok(&digits).then_some(digits)
}

/// Expand a UPC-E value (`number system + 6 digits + check`) into its 12-digit
/// UPC-A equivalent, so the shared UPC/EAN checksum can validate it.
fn upce_to_upca(upce: &str) -> Option<String> {
    let bytes = upce.as_bytes();
    if bytes.len() != 8 {
        return None;
    }
    let d: Vec<char> = upce.chars().collect();
    let ns = d[0];
    let check = d[7];
    let m = &d[1..7]; // the six payload digits
    let mut middle = String::new();
    match m[5] {
        '0' | '1' | '2' => {
            middle.push(m[0]);
            middle.push(m[1]);
            middle.push(m[5]);
            middle.push_str("0000");
            middle.push(m[2]);
            middle.push(m[3]);
            middle.push(m[4]);
        }
        '3' => {
            middle.push(m[0]);
            middle.push(m[1]);
            middle.push(m[2]);
            middle.push_str("00000");
            middle.push(m[3]);
            middle.push(m[4]);
        }
        '4' => {
            middle.push(m[0]);
            middle.push(m[1]);
            middle.push(m[2]);
            middle.push(m[3]);
            middle.push_str("00000");
            middle.push(m[4]);
        }
        _ => {
            middle.push(m[0]);
            middle.push(m[1]);
            middle.push(m[2]);
            middle.push(m[3]);
            middle.push(m[4]);
            middle.push_str("0000");
            middle.push(m[5]);
        }
    }
    Some(format!("{ns}{middle}{check}"))
}

/// Decode a UPC-E symbol from `row`, validated by expanding to UPC-A and
/// checking the standard checksum. Returns the 8-digit UPC-E form
/// (`number system + 6 digits + check`), or `None`.
fn decode_upce(row: &Row) -> Option<String> {
    let (_, start_end) = find_start_guard(row)?;
    let lg_table = l_and_g_patterns();

    let mut digits = String::new();
    let mut offset = start_end;
    let mut lg_pattern = 0u32;
    for x in 0..6 {
        let (best, width) = decode_digit(row, offset, &lg_table)?;
        digits.push((b'0' + (best % 10) as u8) as char);
        offset += width;
        if best >= 10 {
            lg_pattern |= 1 << (5 - x);
        }
    }

    // UPC-E ends with a six-element `1:1:1:1:1:1` guard, light-first, followed by
    // a trailing quiet zone.
    let (end_start, end_end) = find_guard_pattern(row, offset, true, &END_PATTERN)?;
    if !trailing_quiet_ok(row, end_start, end_end) {
        return None;
    }

    // The parity of the six cells encodes both the number system and the check
    // digit (number system 0 uses the table directly; 1 inverts it).
    let parity: [bool; 6] = std::array::from_fn(|x| (lg_pattern >> (5 - x)) & 1 == 1);
    let inverted: [bool; 6] = std::array::from_fn(|x| !parity[x]);
    let (number_system, check) =
        if let Some(check) = UPCE_PARITY.iter().position(|c| *c == parity) {
            (0u8, check as u8)
        } else if let Some(check) = UPCE_PARITY.iter().position(|c| *c == inverted) {
            (1u8, check as u8)
        } else {
            return None;
        };

    let value = format!("{number_system}{digits}{check}");
    let upca = upce_to_upca(&value)?;
    checksum_ok(&upca).then_some(value)
}

/// The most rows a single locate probes for a checksum-valid read. Enough to
/// cover a photo where only a fraction of the bar height samples cleanly, while
/// bounding the work per frame.
const MAX_ROWS: usize = 32;

/// How many distinct scan rows must independently decode to the *same*
/// short-symbology (EAN-8 / UPC-E) value before it is accepted. A genuine
/// barcode decodes on many rows of its bar height, whereas a fluke checksum-valid
/// read in unrelated clutter almost always appears on a single row — so this
/// consensus requirement drives the negative-folder false positives to zero
/// without materially lowering the read-rate on real short symbols (their bars
/// are tall enough that several rows decode). The 13-digit EAN-13 / UPC-A are far
/// less prone to a coincidental checksum-valid framing (12 data digits plus the
/// parity-derived leading digit), so they are accepted from a single row.
const SHORT_CONSENSUS: usize = 2;

/// Locate a UPC/EAN-family barcode in `bitmap` and decode it with the ZXing-style
/// per-digit run-width reader, returning `(symbology, value)`, or `None`. Every
/// returned value is validated by the symbol's own checksum; the short
/// symbologies additionally require [`SHORT_CONSENSUS`] agreeing rows, so this
/// does not introduce a false positive on the negative corpus folders.
#[tracing::instrument(skip_all)]
pub fn scan(bitmap: &Bitmap) -> Option<(&'static str, String)> {
    if bitmap.width < 3 {
        return None;
    }
    // Reuse the shared band detector so the probed rows land on the bars, not the
    // human-readable digits or background; fall back to the dense-ink bounds.
    let (min_y, max_y) = crate::barcode::barcode_band(bitmap).or_else(|| {
        bitmap
            .dense_dark_bounds()
            .map(|(_, min_y, _, max_y)| (min_y as i64, max_y as i64))
    })?;

    let height = max_y - min_y + 1;
    let stride = (height / MAX_ROWS as i64).max(1);
    let mut rows: Vec<i64> = (min_y..=max_y).step_by(stride as usize).collect();
    // Bias toward the middle of the band, least likely to clip a bar.
    let mid = (min_y + max_y) / 2;
    rows.sort_by_key(|&y| (y - mid).abs());

    // EAN-13 / UPC-A first: the strong 13-digit check accepts the first reading
    // row outright.
    for &y in &rows {
        let row = Row {
            bitmap,
            y,
            width: bitmap.width,
        };
        if let Some(value) = decode_ean13(&row) {
            return Some(("ean13", value));
        }
    }

    // Short symbologies (EAN-8 / UPC-E) need consensus across rows; tally each
    // value and accept the most agreed-upon once it clears the threshold.
    let mut short_hits: Vec<(&'static str, String, usize)> = Vec::new();
    for &y in &rows {
        let row = Row {
            bitmap,
            y,
            width: bitmap.width,
        };
        let hit = decode_ean8(&row)
            .map(|v| ("ean8", v))
            .or_else(|| decode_upce(&row).map(|v| ("upce", v)));
        if let Some((symbology, value)) = hit {
            if let Some(entry) = short_hits
                .iter_mut()
                .find(|(s, v, _)| *s == symbology && *v == value)
            {
                entry.2 += 1;
            } else {
                short_hits.push((symbology, value, 1));
            }
        }
    }
    short_hits
        .into_iter()
        .filter(|(_, _, count)| *count >= SHORT_CONSENSUS)
        .max_by_key(|(_, _, count)| *count)
        .map(|(symbology, value, _)| (symbology, value))
}
