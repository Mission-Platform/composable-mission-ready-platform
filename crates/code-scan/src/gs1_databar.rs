//! GS1 DataBar (RSS-14) localisation.
//!
//! Unlike the fixed-glyph 1D symbologies handled by [`crate::barcode`], a DataBar
//! character is decoded combinatorially from the *ratios* of its element widths,
//! so the decoder ([`mission_platform_gs1_databar_decode`]) works directly off a
//! raw run of bar/space pixels and tolerates the varying module width of a
//! foreshortened capture. That means the locator's job here is deliberately
//! thin: pick promising horizontal scan lines and hand each one to the row
//! decoder, trusting the symbol's own strong checksum to reject anything that is
//! not actually a DataBar.
//!
//! Rows are tried busiest-first (most bar/space transitions), since a line that
//! crosses the bars flips colour at nearly every module edge while text or plain
//! background does not. The first row that decodes — its 14-digit GTIN validated
//! by the RSS-14 checksum — wins.

use crate::image::Bitmap;
use mission_platform_gs1_databar_decode::decode_databar_row;

/// The fewest colour transitions a row must have to be worth decoding. A full
/// RSS-14 scan line has ~46 elements (~45 transitions); this floor skips the
/// mostly-blank rows cheaply without missing a real symbol.
const MIN_ROW_TRANSITIONS: usize = 30;

/// Count dark↔light transitions along row `y`.
fn row_transitions(bitmap: &Bitmap, y: i64) -> usize {
    let mut count = 0;
    let mut previous = bitmap.get(0, y);
    for x in 1..bitmap.width as i64 {
        let dark = bitmap.get(x, y);
        if dark != previous {
            count += 1;
            previous = dark;
        }
    }
    count
}

/// Count dark↔light transitions down column `x`.
fn col_transitions(bitmap: &Bitmap, x: i64) -> usize {
    let mut count = 0;
    let mut previous = bitmap.get(x, 0);
    for y in 1..bitmap.height as i64 {
        let dark = bitmap.get(x, y);
        if dark != previous {
            count += 1;
            previous = dark;
        }
    }
    count
}

/// Read row `y` of the bitmap into a boolean scan line (`true` = dark bar), the
/// input [`decode_databar_row`] consumes.
fn row_bools(bitmap: &Bitmap, y: i64) -> Vec<bool> {
    (0..bitmap.width as i64).map(|x| bitmap.get(x, y)).collect()
}

/// Read column `x` of the bitmap into a boolean scan line (top-to-bottom). Lets
/// the locator read a symbol whose bars run vertically (a 90°/270° capture).
fn col_bools(bitmap: &Bitmap, x: i64) -> Vec<bool> {
    (0..bitmap.height as i64).map(|y| bitmap.get(x, y)).collect()
}

/// Locate and decode a GS1 DataBar (RSS-14) symbol in the binarised image,
/// returning its 14-digit GTIN, or `None`.
///
/// This first cut reads the linear DataBar Omnidirectional / Truncated symbol on
/// a single scan line. Stacked variants (which need multi-row assembly) are a
/// follow-up.
pub fn scan(bitmap: &Bitmap) -> Option<String> {
    let height = bitmap.height as i64;
    if height == 0 || bitmap.width == 0 {
        return None;
    }

    // Rank rows by transition density and try the busiest first, so a clean
    // scan line through the bars is attempted before noisier ones.
    let mut rows: Vec<(usize, i64)> = (0..height)
        .map(|y| (row_transitions(bitmap, y), y))
        .filter(|(t, _)| *t >= MIN_ROW_TRANSITIONS)
        .collect();
    rows.sort_by(|a, b| b.0.cmp(&a.0));
    for (_, y) in rows {
        let row = row_bools(bitmap, y);
        if let Some(value) = decode_databar_row(&row) {
            tracing::debug!(y, "gs1_databar: decoded RSS-14 on horizontal scan line");
            return Some(value);
        }
    }

    // No horizontal line read: the symbol's bars may run vertically (a 90°/270°
    // capture). Fall back to column scan lines, busiest first.
    let width = bitmap.width as i64;
    let mut cols: Vec<(usize, i64)> = (0..width)
        .map(|x| (col_transitions(bitmap, x), x))
        .filter(|(t, _)| *t >= MIN_ROW_TRANSITIONS)
        .collect();
    cols.sort_by(|a, b| b.0.cmp(&a.0));
    for (_, x) in cols {
        let col = col_bools(bitmap, x);
        if let Some(value) = decode_databar_row(&col) {
            tracing::debug!(x, "gs1_databar: decoded RSS-14 on vertical scan line");
            return Some(value);
        }
    }
    None
}
