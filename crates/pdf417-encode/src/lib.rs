//! Dependency-free PDF417 encoder, compiled to WebAssembly for
//! `@mission-platform/code-scanner` via `wasm-bindgen` / `wasm-pack`.
//!
//! [`encode_pdf417`] renders a payload into a PDF417 symbol as a packed module
//! matrix: a `[width_lo, width_hi, height_lo, height_hi, ...bits]` buffer where
//! each `bit` is `1` (dark module) or `0` (light), row-major over the
//! `width × height` grid. This is the inverse of
//! `mission-platform-pdf417-decode` and seeds its round-trip tests.
//!
//! The high-level encoder uses **Byte Compaction** (ISO/IEC 15438 §4.4.3),
//! which round-trips any byte payload exactly; the decoder handles ZXing's full
//! text/byte/numeric compaction, so it reads real-world symbols regardless.

mod ec_coefficients;

use ec_coefficients::EC_COEFFICIENTS;
use mission_platform_pdf417_common::{
    symbol_for_codeword, MAX_ROWS_IN_BARCODE, MIN_ROWS_IN_BARCODE, START_PATTERN, STOP_PATTERN,
};

#[cfg(feature = "wasm-api")]
use wasm_bindgen::prelude::*;

/// Initialise optional in-browser diagnostics when built with the `console`
/// feature. A no-op otherwise.
#[cfg(all(feature = "wasm-api", feature = "console"))]
#[tracing::instrument(skip_all)]
#[wasm_bindgen(start)]
pub fn start() {
    mission_platform_console_panic_hook::set_once();
    tracing_wasm::set_as_global_default();
}

/// Encode `data` as a PDF417 symbol, returning the packed module matrix
/// (`[width_lo, width_hi, height_lo, height_hi, ...bits]`), or `undefined` (JS)
/// for an unknown symbology or unencodable payload. The `wasm-bindgen` wrapper
/// over [`encode_pdf417`]; gated behind `wasm-api`.
#[cfg(feature = "wasm-api")]
#[wasm_bindgen]
#[tracing::instrument(skip_all)]
pub fn encode(symbology: &str, data: &str) -> Option<Vec<u8>> {
    encode_pdf417(symbology, data)
}

/// Native entry point shared by [`encode`] and the round-trip tests. Supported
/// `symbology` values (case-insensitive): `pdf417`, `pdf-417`.
#[tracing::instrument(skip_all)]
pub fn encode_pdf417(symbology: &str, data: &str) -> Option<Vec<u8>> {
    match symbology.to_ascii_lowercase().as_str() {
        "pdf417" | "pdf-417" | "pdf_417" => {
            let (w, h, bits) = encode_pdf417_bits(data, DEFAULT_EC_LEVEL)?;
            let mut out = Vec::with_capacity(4 + bits.len());
            out.extend_from_slice(&(w as u16).to_le_bytes());
            out.extend_from_slice(&(h as u16).to_le_bytes());
            out.extend(bits);
            Some(out)
        }
        _ => None,
    }
}

/// A modest default error-correction level for generated symbols (2 → 8 EC
/// codewords), enough to seed round-trip tests without inflating the symbol.
pub const DEFAULT_EC_LEVEL: usize = 2;

/// Encode `data` at the given `ec_level` (0..8) into the flat PDF417 codeword
/// array (`[0]` = data codeword count; data codewords then EC codewords, in
/// row-major reading order), returning `(cols, rows, full)`. This is exactly the
/// array `mission-platform-pdf417-decode::decode_pdf417_codewords` consumes, so
/// it seeds the decoder's round-trip tests without going through an image.
pub fn encode_pdf417_codewords(data: &str, ec_level: usize) -> Option<(usize, usize, Vec<i32>)> {
    if data.is_empty() || ec_level > 8 {
        return None;
    }
    let payload = encode_binary(data.as_bytes());
    let ec_count = 1usize << (ec_level + 1);

    let (cols, rows) = choose_dimensions(payload.len(), ec_count)?;
    let total = rows * cols;
    let data_count = total - ec_count;

    // Data codeword region: symbol length descriptor, payload, then 900 pads.
    let mut data_codewords: Vec<i32> = Vec::with_capacity(data_count);
    data_codewords.push(data_count as i32); // SLD counts data codewords (incl. itself)
    data_codewords.extend_from_slice(&payload);
    while data_codewords.len() < data_count {
        data_codewords.push(900); // pad (latch-to-text, a benign no-op tail)
    }

    let ec = generate_error_correction(&data_codewords, ec_level);
    let mut full = data_codewords;
    full.extend(ec);
    debug_assert_eq!(full.len(), total);
    Some((cols, rows, full))
}

/// Encode `data` at the given `ec_level` (0..8), returning `(width, height,
/// modules)` — a `width × height` row-major grid of module bits (`1` = dark).
/// Returns `None` when the payload does not fit a valid PDF417 symbol.
pub fn encode_pdf417_bits(data: &str, ec_level: usize) -> Option<(usize, usize, Vec<u8>)> {
    let (cols, rows, full) = encode_pdf417_codewords(data, ec_level)?;

    // Lay the codeword matrix out into module bits.
    let start_bits = pattern_bits(&START_PATTERN);
    let stop_bits = pattern_bits(&STOP_PATTERN);
    let row_width = start_bits.len() + 17 * (cols + 2) + stop_bits.len();
    let mut modules = Vec::with_capacity(row_width * rows);

    for r in 0..rows {
        let cluster = r % 3;
        let left = 30 * (r / 3) as i32 + left_indicator(r, rows, cols, ec_level);
        let right = 30 * (r / 3) as i32 + right_indicator(r, rows, cols, ec_level);

        let mut row_bits: Vec<u8> = Vec::with_capacity(row_width);
        row_bits.extend_from_slice(&start_bits);
        // left indicator, data codewords for this row, right indicator
        append_symbol(&mut row_bits, left, cluster)?;
        for c in 0..cols {
            append_symbol(&mut row_bits, full[r * cols + c], cluster)?;
        }
        append_symbol(&mut row_bits, right, cluster)?;
        row_bits.extend_from_slice(&stop_bits);
        debug_assert_eq!(row_bits.len(), row_width);
        modules.extend_from_slice(&row_bits);
    }

    Some((row_width, rows, modules))
}

/// Choose `(cols, rows)` for a symbol holding `payload_len` payload codewords
/// plus one symbol-length descriptor and `ec_count` EC codewords, keeping rows
/// in `[3, 90]` and columns in `[1, 30]`. Prefers the fewest columns (a compact,
/// tall symbol) that fits.
fn choose_dimensions(payload_len: usize, ec_count: usize) -> Option<(usize, usize)> {
    let min_codewords = 1 + payload_len + ec_count;
    for cols in 1..=30usize {
        let rows = ((min_codewords + cols - 1) / cols).max(MIN_ROWS_IN_BARCODE as usize);
        if rows as i64 <= MAX_ROWS_IN_BARCODE && rows * cols >= min_codewords {
            return Some((cols, rows));
        }
    }
    None
}

/// Byte Compaction (ISO/IEC 15438 §4.4.3), port of
/// `PDF417HighLevelEncoder.encodeBinary`: a leading latch (924 when the byte
/// count is a multiple of 6, else 901), then base-256→base-900 "six-packs", then
/// any trailing `<6` bytes verbatim.
fn encode_binary(bytes: &[u8]) -> Vec<i32> {
    let count = bytes.len();
    let mut out = Vec::new();
    out.push(if count % 6 == 0 { 924 } else { 901 });

    let mut idx = 0;
    if count >= 6 {
        while count - idx >= 6 {
            let mut t: u64 = 0;
            for i in 0..6 {
                t = (t << 8) + bytes[idx + i] as u64;
            }
            let mut chars = [0i32; 5];
            for c in chars.iter_mut() {
                *c = (t % 900) as i32;
                t /= 900;
            }
            for &c in chars.iter().rev() {
                out.push(c);
            }
            idx += 6;
        }
    }
    for &b in &bytes[idx..] {
        out.push(b as i32);
    }
    out
}

/// Generate `ec_count = 1 << (ec_level + 1)` error-correction codewords for
/// `data_codewords`. Port of `PDF417ErrorCorrection.generateErrorCorrection`.
fn generate_error_correction(data_codewords: &[i32], ec_level: usize) -> Vec<i32> {
    let k = 1usize << (ec_level + 1);
    let coeffs = EC_COEFFICIENTS[ec_level];
    let mut e = vec![0i32; k];
    for &d in data_codewords {
        let t1 = (d + e[k - 1]).rem_euclid(929);
        for j in (1..k).rev() {
            let t2 = (t1 * coeffs[j]).rem_euclid(929);
            let t3 = 929 - t2;
            e[j] = (e[j - 1] + t3).rem_euclid(929);
        }
        let t2 = (t1 * coeffs[0]).rem_euclid(929);
        let t3 = 929 - t2;
        e[0] = t3.rem_euclid(929);
    }
    let mut result = Vec::with_capacity(k);
    for j in (0..k).rev() {
        if e[j] != 0 {
            e[j] = 929 - e[j];
        }
        result.push(e[j]);
    }
    result
}

/// Left row-indicator codeword value (before the `30 * (r/3)` base) for row `r`.
fn left_indicator(r: usize, rows: usize, cols: usize, ec_level: usize) -> i32 {
    match r % 3 {
        0 => ((rows - 1) / 3) as i32,
        1 => (3 * ec_level + (rows - 1) % 3) as i32,
        _ => (cols - 1) as i32,
    }
}

/// Right row-indicator codeword value (before the `30 * (r/3)` base) for row `r`.
fn right_indicator(r: usize, rows: usize, cols: usize, ec_level: usize) -> i32 {
    match r % 3 {
        0 => (cols - 1) as i32,
        1 => ((rows - 1) / 3) as i32,
        _ => (3 * ec_level + (rows - 1) % 3) as i32,
    }
}

/// Append the 17 module bits of codeword `value` in `cluster_index` (0/1/2) to
/// `row`, MSB first. Returns `None` if no symbol exists (should not happen for a
/// valid value/cluster).
fn append_symbol(row: &mut Vec<u8>, value: i32, cluster_index: usize) -> Option<()> {
    let symbol = symbol_for_codeword(value, cluster_index)?;
    for bit in (0..17).rev() {
        row.push(((symbol >> bit) & 1) as u8);
    }
    Some(())
}

/// Expand a bar/space guard `pattern` (module widths, starting with a bar) into
/// module bits (`1` = dark bar).
fn pattern_bits(pattern: &[u16]) -> Vec<u8> {
    let mut bits = Vec::new();
    for (i, &w) in pattern.iter().enumerate() {
        let bar = if i % 2 == 0 { 1u8 } else { 0u8 };
        for _ in 0..w {
            bits.push(bar);
        }
    }
    bits
}

#[cfg(all(test, not(target_arch = "wasm32")))]
mod tests {
    use super::*;

    #[test]
    fn rejects_empty() {
        assert!(encode_pdf417("pdf417", "").is_none());
        assert!(encode_pdf417("nope", "hello").is_none());
    }

    #[test]
    fn produces_a_grid() {
        let (w, h, bits) = encode_pdf417_bits("This is PDF417", 2).unwrap();
        assert_eq!(bits.len(), w * h);
        assert!(h >= 3);
        // Every row begins with the start pattern's 8 dark modules.
        for r in 0..h {
            assert_eq!(&bits[r * w..r * w + 8], &[1u8; 8]);
        }
    }
}
