//! PDF417 localisation.
//!
//! PDF417 is a *stacked* linear symbology: each row is an independent scan line
//! of 17-module codewords bracketed by a fixed start and stop guard pattern, and
//! every row carries a left/right *row indicator* codeword encoding the symbol's
//! geometry (row number, column count, row count and error-correction level).
//! That lets the locator work a row at a time — no 2D perspective model needed
//! for the clean, upright captures in the corpus:
//!
//! 1. On each image row, find the start guard pattern, then read successive
//!    codewords (8 bar/space runs each) up to the stop guard pattern, decoding
//!    each to its `(value, cluster)` via the shared tables.
//! 2. The first codeword of a row is its left row indicator; a vote across rows
//!    recovers the column count, row count and EC level.
//! 3. The remaining codewords are laid into a `rows × cols` matrix (keyed by the
//!    row-indicator's row number, majority-voted per cell), then handed to
//!    [`mission_platform_pdf417_decode`] for Reed–Solomon correction + parsing.
//!
//! A second pass reads every row right-to-left so a 180°-rotated symbol still
//! decodes; steeper rotations are covered by the harness rotating the frame.

use std::collections::HashMap;

use crate::image::Bitmap;
use mission_platform_pdf417_common::{
    bucket_from_symbol, get_codeword, sample_codeword_symbol_exact, START_PATTERN, STOP_PATTERN,
};
use mission_platform_pdf417_decode::decode_pdf417_codewords;

/// Largest average width-ratio variance accepted for a guard-pattern match
/// (ZXing `Detector.MAX_AVG_VARIANCE`).
const MAX_AVG_VARIANCE: f32 = 0.42;
/// Largest single-element width-ratio variance accepted (ZXing
/// `Detector.MAX_INDIVIDUAL_VARIANCE`).
const MAX_INDIVIDUAL_VARIANCE: f32 = 0.8;

/// One decoded image scan line: the row-indicator row number, its cluster index
/// (0/1/2) and the codewords read across it (`[left indicator, data.., right
/// indicator]`).
struct RowRead {
    row_number: usize,
    codewords: Vec<i32>,
}

/// Locate and decode a PDF417 symbol in the binarised image, returning its
/// payload, or `None`. Tries a normal (left-to-right) pass, then a reversed pass
/// that catches a 180°-rotated symbol.
pub fn scan(bitmap: &Bitmap) -> Option<String> {
    if bitmap.width == 0 || bitmap.height == 0 {
        return None;
    }
    if let Some(value) = decode_oriented(bitmap, false) {
        return Some(value);
    }
    decode_oriented(bitmap, true)
}

/// Read one bitmap row into a boolean scan line (`true` = dark), optionally
/// reversed (to read a 180°-rotated symbol left-to-right).
fn row_bools(bitmap: &Bitmap, y: usize, reversed: bool) -> Vec<bool> {
    let w = bitmap.width as i64;
    let mut row: Vec<bool> = (0..w).map(|x| bitmap.get(x, y as i64)).collect();
    if reversed {
        row.reverse();
    }
    row
}

/// Decode a PDF417 symbol reading every row in one direction.
fn decode_oriented(bitmap: &Bitmap, reversed: bool) -> Option<String> {
    let mut reads: Vec<RowRead> = Vec::new();
    // Metadata votes across all rows.
    let mut col_votes: HashMap<i32, usize> = HashMap::new();
    let mut upper_votes: HashMap<i32, usize> = HashMap::new();
    let mut lower_votes: HashMap<i32, usize> = HashMap::new();
    let mut ec_votes: HashMap<i32, usize> = HashMap::new();

    for y in 0..bitmap.height {
        let row = row_bools(bitmap, y, reversed);
        let Some(read) = read_row(&row) else {
            continue;
        };
        // Row-indicator metadata: derive from this row's left indicator value.
        let left_value = read.codewords[0];
        let residue = read.row_number % 3;
        let indicator = left_value % 30;
        match residue {
            0 => *upper_votes.entry(indicator * 3 + 1).or_default() += 1,
            1 => {
                *ec_votes.entry(indicator / 3).or_default() += 1;
                *lower_votes.entry(indicator % 3).or_default() += 1;
            }
            _ => *col_votes.entry(indicator + 1).or_default() += 1,
        }
        reads.push(read);
    }

    let cols = argmax(&col_votes)?;
    let upper = argmax(&upper_votes)?;
    let lower = argmax(&lower_votes)?;
    let ec_level = argmax(&ec_votes)?;
    if cols < 1 || !(3..=90).contains(&(upper + lower)) || !(0..=8).contains(&ec_level) {
        return None;
    }
    let cols = cols as usize;
    let rows = (upper + lower) as usize;
    let ec_level = ec_level as usize;

    // Vote each codeword cell (row, col) across every read row.
    let mut cell_votes: Vec<HashMap<i32, usize>> = vec![HashMap::new(); rows * cols];
    for read in &reads {
        if read.row_number >= rows || read.codewords.len() < cols + 2 {
            continue;
        }
        // Data codewords sit between the left and right row indicators; skip
        // holes (`-1`) so they do not out-vote a real codeword.
        for c in 0..cols {
            let value = read.codewords[1 + c];
            if value >= 0 {
                *cell_votes[read.row_number * cols + c]
                    .entry(value)
                    .or_default() += 1;
            }
        }
    }

    // Assemble the full codeword array (row-major); a cell with no votes is a
    // *hole* filled with 0 and left for Reed–Solomon to (maybe) recover.
    let mut full: Vec<i32> = Vec::with_capacity(rows * cols);
    let mut holes = 0usize;
    for cell in &cell_votes {
        match argmax(cell) {
            Some(v) => full.push(v),
            None => {
                full.push(0);
                holes += 1;
            }
        }
    }

    // Each hole is an unknown codeword that Reed–Solomon must treat as an error;
    // with `num_ec` EC codewords it can fix at most `num_ec / 2`. Beyond that the
    // "correction" is untrustworthy and, on high-EC symbols, happily fabricates a
    // valid-but-wrong codeword (a false positive). Refuse to decode in that case.
    let num_ec = 1usize << (ec_level + 1);
    if holes > num_ec / 2 {
        return None;
    }

    let value = decode_pdf417_codewords(&full, ec_level)?;
    tracing::debug!(reversed, cols, rows, ec_level, "pdf417: decoded a symbol");
    Some(value)
}

/// Read the codewords of a single scan line: locate the start guard, read
/// codewords until the stop guard, and return them with the derived row number,
/// or `None` if this line does not carry a clean PDF417 row.
fn read_row(row: &[bool]) -> Option<RowRead> {
    let (start, end) = find_guard_pattern(row, 0, &START_PATTERN)?;
    // The start guard spans 17 modules; its width sets the expected codeword
    // width for the skew check below.
    let module_width = (end - start) as f32 / 17.0;
    if module_width < 0.6 {
        return None;
    }
    let expected = module_width * 17.0;

    // Codewords across the row; a run that does not sample to an exact symbol is
    // recorded as `-1` (a hole) so column alignment is preserved and other scan
    // lines / Reed–Solomon can fill it.
    let mut codewords: Vec<i32> = Vec::new();
    let mut cluster_index: Option<usize> = None;
    let mut valid = 0usize;
    let mut x = end;
    while x < row.len() {
        // Stop guard reached: the row is complete.
        if matches_pattern_at(row, x, &STOP_PATTERN) {
            break;
        }
        let (counters, next) = read_runs_at(row, x, 8)?;
        let width: i32 = counters.iter().sum();
        // Reject a run whose width drifts too far from a codeword (e.g. we ran
        // off the symbol into a neighbour or the quiet zone).
        if (width as f32) < expected * 0.65 || (width as f32) > expected * 1.35 {
            break;
        }
        let symbol = sample_codeword_symbol_exact(&counters);
        if symbol >= 0 {
            let cw = get_codeword(symbol);
            let ci = (bucket_from_symbol(symbol as u32) / 3) as usize;
            match cluster_index {
                None => cluster_index = Some(ci),
                Some(existing) if existing != ci => {
                    // Cluster drift within a row: treat as a hole rather than
                    // trusting a codeword from the wrong cluster.
                    codewords.push(-1);
                    x = next;
                    continue;
                }
                _ => {}
            }
            codewords.push(cw);
            valid += 1;
        } else {
            codewords.push(-1);
        }
        x = next;
    }

    // A usable row needs its left indicator plus a couple of data codewords.
    if valid < 3 || codewords.first().copied().unwrap_or(-1) < 0 {
        return None;
    }
    let cluster_index = cluster_index?;
    let left_value = codewords[0];
    let row_number = (left_value as usize / 30) * 3 + cluster_index;
    Some(RowRead {
        row_number,
        codewords,
    })
}

/// The key with the highest vote count, or `None` if empty.
fn argmax(votes: &HashMap<i32, usize>) -> Option<i32> {
    votes
        .iter()
        .max_by_key(|&(_, &count)| count)
        .map(|(&value, _)| value)
}

/// Read `n` alternating bar/space runs starting with a bar (dark) at `start`,
/// returning the run lengths and the index just past them. Port of
/// `PDF417ScanningDecoder.getModuleBitCount`.
fn read_runs_at(row: &[bool], start: usize, n: usize) -> Option<(Vec<i32>, usize)> {
    let mut counters = vec![0i32; n];
    let mut module = 0usize;
    let mut previous = true; // expect a bar first
    let mut x = start;
    while x < row.len() && module < n {
        if row[x] == previous {
            counters[module] += 1;
            x += 1;
        } else {
            module += 1;
            if module < n {
                previous = !previous;
            }
        }
    }
    if module == n || (x == row.len() && module == n - 1) {
        Some((counters, x))
    } else {
        None
    }
}

/// Whether the guard `pattern`'s bar/space runs match those starting at `x`.
fn matches_pattern_at(row: &[bool], x: usize, pattern: &[u16]) -> bool {
    // Only a bar can start a guard pattern.
    if x >= row.len() || !row[x] {
        return false;
    }
    let Some((counters, _)) = read_runs_at(row, x, pattern.len()) else {
        return false;
    };
    pattern_match_variance(&counters, pattern) < MAX_AVG_VARIANCE
}

/// Slide `pattern` across `row` from `from`, returning the `(start, end)` pixel
/// span of the first match. Port of `Detector.findGuardPattern`.
fn find_guard_pattern(row: &[bool], from: usize, pattern: &[u16]) -> Option<(usize, usize)> {
    let width = row.len();
    let len = pattern.len();
    let mut counters = vec![0i32; len];
    let mut pattern_start = from;
    let mut x = from;
    let mut counter_position = 0usize;
    let mut is_white = false;
    while x < width {
        let pixel = row[x];
        if pixel != is_white {
            counters[counter_position] += 1;
        } else {
            if counter_position == len - 1 {
                if pattern_match_variance(&counters, pattern) < MAX_AVG_VARIANCE {
                    return Some((pattern_start, x));
                }
                pattern_start += (counters[0] + counters[1]) as usize;
                counters.copy_within(2.., 0);
                counters[len - 2] = 0;
                counters[len - 1] = 0;
                counter_position -= 1;
            } else {
                counter_position += 1;
            }
            counters[counter_position] = 1;
            is_white = !is_white;
        }
        x += 1;
    }
    if counter_position == len - 1 && pattern_match_variance(&counters, pattern) < MAX_AVG_VARIANCE
    {
        return Some((pattern_start, x));
    }
    None
}

/// Normalised variance between measured run `counters` and an expected guard
/// `pattern`, or [`f32::INFINITY`] when any element is too far off. Port of
/// `Detector.patternMatchVariance`.
fn pattern_match_variance(counters: &[i32], pattern: &[u16]) -> f32 {
    let total: i32 = counters.iter().sum();
    let pattern_length: i32 = pattern.iter().map(|&p| p as i32).sum();
    if total < pattern_length {
        return f32::INFINITY;
    }
    let unit = total as f32 / pattern_length as f32;
    let max_individual = MAX_INDIVIDUAL_VARIANCE * unit;
    let mut total_variance = 0.0f32;
    for (i, &c) in counters.iter().enumerate() {
        let scaled = pattern[i] as f32 * unit;
        let variance = (c as f32 - scaled).abs();
        if variance > max_individual {
            return f32::INFINITY;
        }
        total_variance += variance;
    }
    total_variance / total as f32
}
