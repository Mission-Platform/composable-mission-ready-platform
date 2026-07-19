//! Micro QR Code matrix builder and spec tables (ISO/IEC 18004).
//!
//! Micro QR Codes come in four versions — M1 (11×11), M2 (13×13), M3 (15×15)
//! and M4 (17×17) — each with a single finder pattern in the top-left corner,
//! timing patterns along the top row and left column, and a 15-bit format
//! information region. Unlike full QR Codes there are no alignment patterns and
//! only four data masks. The tables and layout here are ported from the ISO
//! spec (cross-checked against the `segno` reference encoder).

/// Micro QR version M1 (index into the per-version tables).
pub const M1: usize = 0;
/// Micro QR version M2.
pub const M2: usize = 1;
/// Micro QR version M3.
pub const M3: usize = 2;
/// Micro QR version M4.
pub const M4: usize = 3;

/// Side length (in modules) of each Micro QR version.
pub const SIZES: [usize; 4] = [11, 13, 15, 17];

/// The four data mask reference patterns for Micro QR Codes.
///
/// These correspond to full-QR masks 1, 4, 6 and 7 (ISO/IEC 18004 Table 10);
/// `i` is the row and `j` the column, `(0, 0)` at the top-left corner.
#[tracing::instrument(skip_all)]
pub fn mask_condition(mask: usize, i: i32, j: i32) -> bool {
    match mask {
        0 => i % 2 == 0,
        1 => (i / 2 + j / 3) % 2 == 0,
        2 => ((i * j) % 2 + (i * j) % 3) % 2 == 0,
        3 => (((i + j) % 2) + (i * j) % 3) % 2 == 0,
        _ => false,
    }
}

/// Valid 15-bit format information sequences, indexed by
/// `(symbol_number << 2) | mask` (ISO/IEC 18004 Table C.2). The symbol number
/// encodes the version + error-correction level; the low two bits are the mask.
pub const FORMAT_INFO: [u16; 32] = [
    0x4445, 0x4172, 0x4e2b, 0x4b1c, 0x55ae, 0x5099, 0x5fc0, 0x5af7, 0x6793, 0x62a4, 0x6dfd, 0x68ca,
    0x7678, 0x734f, 0x7c16, 0x7921, 0x06de, 0x03e9, 0x0cb0, 0x0987, 0x1735, 0x1202, 0x1d5b, 0x186c,
    0x2508, 0x203f, 0x2f66, 0x2a51, 0x34e3, 0x31d4, 0x3e8d, 0x3bba,
];

/// A Micro QR matrix under construction. Modules hold `0`/`1` once set and the
/// sentinel `EMPTY` while unwritten; `is_function` marks the finder, timing and
/// format-information cells that data must skip and masking must not touch.
#[derive(Debug)]
pub struct MicroBuilder {
    /// Side length in modules.
    pub size: usize,
    modules: Vec<Vec<u8>>,
    is_function: Vec<Vec<bool>>,
}

/// Sentinel value for a module that has not been assigned yet.
const EMPTY: u8 = 2;

impl MicroBuilder {
    /// Create a builder for the given version index (`M1`..`M4`) and draw the
    /// finder pattern, timing patterns and format-information reservation.
    #[tracing::instrument(skip_all)]
    pub fn new(version: usize) -> Self {
        let size = SIZES[version];
        let mut builder = MicroBuilder {
            size,
            modules: vec![vec![EMPTY; size]; size],
            is_function: vec![vec![false; size]; size],
        };
        builder.reserve_format_area();
        builder.draw_timing_patterns();
        builder.draw_finder_pattern();
        builder
    }

    #[tracing::instrument(skip_all)]
    fn set_function(&mut self, x: usize, y: usize, dark: bool) {
        self.modules[y][x] = u8::from(dark);
        self.is_function[y][x] = true;
    }

    /// Reserve column 8 (rows 0-8) and row 8 (cols 0-8) for format information.
    #[tracing::instrument(skip_all)]
    fn reserve_format_area(&mut self) {
        for i in 0..9 {
            self.set_function(8, i, false);
            self.set_function(i, 8, false);
        }
    }

    /// Timing runs along the top row and left column, starting at index 8.
    #[tracing::instrument(skip_all)]
    fn draw_timing_patterns(&mut self) {
        let mut bit = true;
        for i in 8..self.size {
            self.set_function(0, i, bit); // left column
            self.set_function(i, 0, bit); // top row
            bit = !bit;
        }
    }

    /// The single 7×7 finder (with separators) in the top-left 8×8 block.
    #[tracing::instrument(skip_all)]
    fn draw_finder_pattern(&mut self) {
        // Rows 0-7, cols 0-7: the finder plus its right/bottom separators.
        const FINDER: [[u8; 8]; 8] = [
            [1, 1, 1, 1, 1, 1, 1, 0],
            [1, 0, 0, 0, 0, 0, 1, 0],
            [1, 0, 1, 1, 1, 0, 1, 0],
            [1, 0, 1, 1, 1, 0, 1, 0],
            [1, 0, 1, 1, 1, 0, 1, 0],
            [1, 0, 0, 0, 0, 0, 1, 0],
            [1, 1, 1, 1, 1, 1, 1, 0],
            [0, 0, 0, 0, 0, 0, 0, 0],
        ];
        for (y, row) in FINDER.iter().enumerate() {
            for (x, &cell) in row.iter().enumerate() {
                self.set_function(x, y, cell == 1);
            }
        }
    }

    /// Place the final message bit stream (data + error correction, most
    /// significant bit first) in the two-module columns, alternating up/down
    /// from the right edge. `version` selects the M1/M3 upper-right start.
    #[tracing::instrument(skip_all)]
    fn place_codewords(&mut self, version: usize, bits: &[u8]) {
        let size = self.size as i32;
        // M1 and M3 begin in the upper-right corner (data modules are not an
        // exact multiple of the column height), the others in the lower-right.
        let inc = if version == M1 || version == M3 { 2 } else { 0 };
        let mut idx = 0usize;
        let mut right = size - 1;
        while right > 0 {
            for vertical in 0..size {
                for z in 0..2 {
                    let j = right - z;
                    let upwards = ((right + inc) & 2) == 0;
                    let i = if upwards {
                        size - 1 - vertical
                    } else {
                        vertical
                    };
                    let (xi, yi) = (j as usize, i as usize);
                    if self.modules[yi][xi] == EMPTY && idx < bits.len() {
                        self.modules[yi][xi] = bits[idx];
                        idx += 1;
                    }
                }
            }
            right -= 2;
        }
    }

    /// Micro QR mask evaluation (ISO/IEC 18004 §7.8.3.2): scores the darkness of
    /// the bottom row and right column; the *highest* score wins.
    #[tracing::instrument(skip_all)]
    fn evaluate(&self) -> i32 {
        let n = self.size;
        let mut sum1 = 0i32; // right column
        let mut sum2 = 0i32; // bottom row
        for i in 1..n {
            sum1 += i32::from(self.modules[i][n - 1]);
            sum2 += i32::from(self.modules[n - 1][i]);
        }
        if sum1 <= sum2 {
            sum1 * 16 + sum2
        } else {
            sum2 * 16 + sum1
        }
    }

    /// Toggle every data module according to `mask` (function cells untouched).
    #[tracing::instrument(skip_all)]
    fn apply_mask(&mut self, mask: usize) {
        for y in 0..self.size {
            for x in 0..self.size {
                if !self.is_function[y][x] && mask_condition(mask, y as i32, x as i32) {
                    self.modules[y][x] ^= 1;
                }
            }
        }
    }

    /// Write the 15 format-information bits for `symbol_number` + `mask` into the
    /// reserved column 8 / row 8 cells.
    #[tracing::instrument(skip_all)]
    fn draw_format_info(&mut self, symbol_number: usize, mask: usize) {
        let format = FORMAT_INFO[(symbol_number << 2) | mask];
        for i in 0..8 {
            let vbit = ((format >> i) & 1) as u8;
            let hbit = ((format >> (14 - i)) & 1) as u8;
            self.modules[i + 1][8] = vbit;
            self.modules[8][i + 1] = hbit;
        }
    }

    /// Build the final module matrix: place the data, pick the best of the four
    /// masks, and stamp the format information. `bits` is the interleaved
    /// data + error-correction bit stream produced by the encoder.
    #[tracing::instrument(skip_all)]
    pub fn build(mut self, version: usize, symbol_number: usize, bits: &[u8]) -> Vec<Vec<bool>> {
        self.place_codewords(version, bits);

        let base = self.modules.clone();
        let mut best_mask = 0usize;
        let mut best_score = -1i32;
        for mask in 0..4 {
            self.apply_mask(mask);
            let score = self.evaluate();
            if score > best_score {
                best_score = score;
                best_mask = mask;
            }
            self.modules.clone_from(&base); // undo
        }
        self.apply_mask(best_mask);
        self.draw_format_info(symbol_number, best_mask);

        self.modules
            .iter()
            .map(|row| row.iter().map(|&m| m == 1).collect())
            .collect()
    }
}
