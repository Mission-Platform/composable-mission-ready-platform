//! Data Matrix ECC 200 decoder — the inverse of the `mission-platform-matrix-code-encode`
//! encoder (square symbols with a single data region).
//!
//! The input is the same packed `[size, ...modules]` buffer the encoder emits
//! (row-major, `1` = dark), so no image processing or perspective correction is
//! needed: the modules are already perfectly registered. Decoding reverses the
//! encoder pipeline — strip the finder / timing pattern to recover the data
//! region, un-place the codewords with the ECC 200 placement algorithm,
//! Reed-Solomon-correct the `data || ecc` block, drop the padding, and reverse
//! the ASCII encodation back into the original bytes.
//!
//! Only the single-data-region square symbols the encoder produces (10×10 …
//! 26×26) are supported.

use mission_platform_matrix_code_common::datamatrix_layout::Layout;
use mission_platform_matrix_code_common::reed_solomon;

/// A supported square symbol: full `size` (incl. finder), and the data / error
/// codeword counts for ECC 200. Mirrors the encoder's table.
#[derive(Debug)]
struct Symbol {
    /// Full symbol edge length in modules (data region + 2-module finder).
    size: usize,
    /// Number of data codewords the symbol carries.
    data: usize,
    /// Number of Reed-Solomon error-correction codewords.
    ecc: usize,
}

/// Single-data-region square symbols, keyed by full edge length (ISO/IEC 16022
/// ECC 200). Identical to the encoder's table.
const SYMBOLS: [Symbol; 9] = [
    Symbol {
        size: 10,
        data: 3,
        ecc: 5,
    },
    Symbol {
        size: 12,
        data: 5,
        ecc: 7,
    },
    Symbol {
        size: 14,
        data: 8,
        ecc: 10,
    },
    Symbol {
        size: 16,
        data: 12,
        ecc: 12,
    },
    Symbol {
        size: 18,
        data: 18,
        ecc: 14,
    },
    Symbol {
        size: 20,
        data: 22,
        ecc: 18,
    },
    Symbol {
        size: 22,
        data: 30,
        ecc: 20,
    },
    Symbol {
        size: 24,
        data: 36,
        ecc: 24,
    },
    Symbol {
        size: 26,
        data: 44,
        ecc: 28,
    },
];

/// A supported rectangular symbol (ISO/IEC 16022 ECC 200). Mirrors the
/// encoder's `RectSymbol` table.
#[derive(Debug)]
struct RectSymbol {
    region_rows: usize,
    region_cols: usize,
    grid_cols: usize,
    data: usize,
    ecc: usize,
}

impl RectSymbol {
    /// The [`Layout`] describing this symbol's data-region grid.
    #[tracing::instrument(skip_all)]
    fn layout(&self) -> Layout {
        Layout {
            region_rows: self.region_rows,
            region_cols: self.region_cols,
            grid_rows: 1,
            grid_cols: self.grid_cols,
        }
    }
}

/// The six standard rectangular symbols (8×18 … 16×48). Identical to the
/// encoder's table.
const RECT_SYMBOLS: [RectSymbol; 6] = [
    RectSymbol {
        region_rows: 6,
        region_cols: 16,
        grid_cols: 1,
        data: 5,
        ecc: 7,
    }, // 8×18
    RectSymbol {
        region_rows: 6,
        region_cols: 14,
        grid_cols: 2,
        data: 10,
        ecc: 11,
    }, // 8×32
    RectSymbol {
        region_rows: 10,
        region_cols: 24,
        grid_cols: 1,
        data: 16,
        ecc: 14,
    }, // 12×26
    RectSymbol {
        region_rows: 10,
        region_cols: 16,
        grid_cols: 2,
        data: 22,
        ecc: 18,
    }, // 12×36
    RectSymbol {
        region_rows: 14,
        region_cols: 16,
        grid_cols: 2,
        data: 32,
        ecc: 24,
    }, // 16×36
    RectSymbol {
        region_rows: 14,
        region_cols: 22,
        grid_cols: 2,
        data: 49,
        ecc: 28,
    }, // 16×48
];

/// Decode a packed `[size, ...modules]` Data Matrix symbol back into its
/// original bytes, or `None` when the buffer is malformed, the symbol size is
/// unsupported, or the payload cannot be recovered.
#[tracing::instrument(skip_all)]
pub fn decode(matrix: &[u8]) -> Option<Vec<u8>> {
    decode_with_erasures(matrix, &[])
}

/// Decode a packed `[size, ...modules]` square Data Matrix symbol, treating the
/// modules flagged in `erasures` (a per-module mask over the full symbol grid,
/// row-major, `1` = erased, length `size²`) as **known** low-confidence reads.
/// Any codeword whose modules include an erased one is handed to the Reed-Solomon
/// corrector as an erasure, worth twice a blind error — the payoff of grey-level
/// sampling in the scanner. An `erasures` slice whose length does not match
/// `size²` is ignored, making this identical to [`decode`].
#[tracing::instrument(skip_all)]
pub fn decode_with_erasures(matrix: &[u8], erasures: &[u8]) -> Option<Vec<u8>> {
    let width = *matrix.first()? as usize;
    let height = *matrix.get(1)? as usize;
    if width != height {
        tracing::trace!("datamatrix: {width}x{height} is not a square symbol");
        return None;
    }
    let size = width;
    if matrix.len() != 2 + size * size {
        tracing::trace!("datamatrix: buffer length {} != 2 + {size}²", matrix.len());
        return None;
    }
    let symbol = SYMBOLS.iter().find(|candidate| candidate.size == size)?;
    let region = size - 2;
    let use_erasures = erasures.len() == size * size;
    tracing::debug!(
        "datamatrix: {size}x{size} symbol ({} data + {} ecc codewords)",
        symbol.data,
        symbol.ecc
    );

    // Strip the finder / timing frame: the data region is the interior, offset
    // by one module on each edge (top timing + left finder). The erasure mask is
    // stripped the same way so each data cell keeps its confidence flag.
    let modules = &matrix[2..];
    let mut bits = vec![false; region * region];
    let mut erased_bits = vec![false; region * region];
    for y in 0..region {
        for x in 0..region {
            bits[y * region + x] = modules[(y + 1) * size + (x + 1)] != 0;
            if use_erasures {
                erased_bits[y * region + x] = erasures[(y + 1) * size + (x + 1)] != 0;
            }
        }
    }

    // Un-place the codewords (inverse of the ECC 200 placement sweep), carrying
    // the erasure flags to per-codeword erasure positions.
    let total = symbol.data + symbol.ecc;
    let (mut block, erased) = UnPlacement::new(&bits, &erased_bits, region, region, total).run();
    let erasure_positions: Vec<usize> = erased
        .iter()
        .enumerate()
        .filter_map(|(pos, &e)| e.then_some(pos))
        .collect();

    // Reed-Solomon-correct the `data || ecc` block, then keep the data half.
    if !reed_solomon::correct_with_erasures(&mut block, symbol.ecc, &erasure_positions) {
        tracing::trace!("datamatrix: uncorrectable Reed-Solomon block");
        return None;
    }
    block.truncate(symbol.data);

    decode_ascii(&block)
}

/// Decode a packed `[width, height, ...modules]` rectangular Data Matrix symbol
/// (8×18 … 16×48) back into its original bytes. Shares the ECC 200 un-placement,
/// Reed-Solomon correction and ASCII decodation with the square [`decode`]; only
/// the border-stripping (via the shared [`Layout`]) and symbol table differ.
#[tracing::instrument(skip_all)]
pub fn decode_rectangular(matrix: &[u8]) -> Option<Vec<u8>> {
    let width = *matrix.first()? as usize;
    let height = *matrix.get(1)? as usize;
    let symbol = RECT_SYMBOLS.iter().find(|candidate| {
        let layout = candidate.layout();
        layout.width() == width && layout.height() == height
    })?;
    if matrix.len() != 2 + width * height {
        tracing::trace!(
            "datamatrix: buffer length {} != 2 + {width}*{height}",
            matrix.len()
        );
        return None;
    }
    let layout = symbol.layout();
    tracing::debug!(
        "datamatrix: {width}x{height} rectangular symbol ({} data + {} ecc codewords)",
        symbol.data,
        symbol.ecc
    );

    // Read the data cells out of each region, skipping the finder / timing
    // borders via the shared layout mapping.
    let modules = &matrix[2..];
    let mapping_rows = layout.mapping_rows();
    let mapping_cols = layout.mapping_cols();
    let mut bits = vec![false; mapping_rows * mapping_cols];
    for mapping_row in 0..mapping_rows {
        for mapping_col in 0..mapping_cols {
            let (x, y) = layout.cell(mapping_row, mapping_col);
            bits[mapping_row * mapping_cols + mapping_col] = modules[y * width + x] != 0;
        }
    }

    let total = symbol.data + symbol.ecc;
    // Rectangular symbols are produced by the encoder but not (yet) located by
    // the scanner, so they carry no erasure mask: pass an empty one.
    let (mut block, _erased) =
        UnPlacement::new(&bits, &[], mapping_rows, mapping_cols, total).run();

    if !reed_solomon::correct(&mut block, symbol.ecc) {
        tracing::trace!("datamatrix: uncorrectable Reed-Solomon block");
        return None;
    }
    block.truncate(symbol.data);

    decode_ascii(&block)
}

/// Reverse the Data Matrix ASCII encodation, stopping at the first pad codeword
/// (`129`, end-of-data). Returns `None` on a codeword this encoder never emits.
#[tracing::instrument(skip_all)]
fn decode_ascii(codewords: &[u8]) -> Option<Vec<u8>> {
    let mut out = Vec::new();
    let mut index = 0;
    while index < codewords.len() {
        let codeword = codewords[index];
        match codeword {
            // End-of-data pad: the remaining codewords are randomised padding.
            129 => break,
            // FNC1 (GS1 Data Matrix flag / field separator): not part of the
            // literal payload, so it is skipped. The encoder only emits it as
            // the leading codeword of a GS1 symbol.
            232 => {
                index += 1;
            }
            // Printable ASCII maps to `byte + 1` (values 1..=128 → 0..=127).
            1..=128 => {
                out.push(codeword - 1);
                index += 1;
            }
            // A digit pair packed as `value + 130`, re-expanded to two digits.
            130..=229 => {
                let value = codeword - 130;
                out.push(b'0' + value / 10);
                out.push(b'0' + value % 10);
                index += 1;
            }
            // Upper Shift: the next codeword is `(byte - 128) + 1`.
            235 => {
                let shifted = *codewords.get(index + 1)?;
                if shifted == 0 || shifted > 128 {
                    return None;
                }
                out.push((shifted - 1) + 128);
                index += 2;
            }
            // Any other codeword is outside this encoder's ASCII scheme.
            _ => return None,
        }
    }
    Some(out)
}

/// Reads codeword bits back out of a placed data region, reversing the ECC 200
/// module-placement algorithm (ISO/IEC 16022 Annex F). It mirrors the encoder's
/// `Placement` traversal exactly so the `filled` bookkeeping — and therefore the
/// visiting order — matches bit for bit.
#[derive(Debug)]
struct UnPlacement<'a> {
    bits: &'a [bool],
    /// Per-cell low-confidence flag, same layout as `bits`; empty when unused.
    erased_bits: &'a [bool],
    rows: usize,
    cols: usize,
    /// `true` once a module has been consumed; keeps the sweep in lock-step with
    /// the encoder's placement.
    filled: Vec<bool>,
    /// Recovered codewords, MSB-first, indexed by placement position.
    codewords: Vec<u8>,
    /// `true` for a codeword drawing any bit from an erased (low-confidence)
    /// cell, indexed by placement position.
    codeword_erased: Vec<bool>,
}

impl<'a> UnPlacement<'a> {
    #[tracing::instrument(skip_all)]
    fn new(
        bits: &'a [bool],
        erased_bits: &'a [bool],
        rows: usize,
        cols: usize,
        total: usize,
    ) -> Self {
        UnPlacement {
            bits,
            erased_bits,
            rows,
            cols,
            filled: vec![false; rows * cols],
            codewords: vec![0u8; total],
            codeword_erased: vec![false; total],
        }
    }

    /// Whether the module at (`col`, `row`) has already been consumed.
    #[tracing::instrument(skip_all)]
    fn has_bit(&self, col: usize, row: usize) -> bool {
        self.filled[row * self.cols + col]
    }

    /// Read one bit of codeword `pos`, wrapping coordinates around the region
    /// edges per the placement algorithm. `bit` is 1..=8 (MSB first).
    #[tracing::instrument(skip_all)]
    fn module(&mut self, mut row: isize, mut col: isize, pos: usize, bit: u8) {
        let rows = self.rows as isize;
        let cols = self.cols as isize;
        if row < 0 {
            row += rows;
            col += 4 - ((rows + 4) % 8);
        }
        if col < 0 {
            col += cols;
            row += 4 - ((cols + 4) % 8);
        }
        let (col, row) = (col as usize, row as usize);
        let index = row * self.cols + col;
        self.filled[index] = true;
        if self.bits[index] {
            self.codewords[pos] |= 1 << (8 - bit);
        }
        if self.erased_bits.get(index).copied().unwrap_or(false) {
            self.codeword_erased[pos] = true;
        }
    }

    /// Read all eight bits of codeword `pos` in the standard "utah" L shape.
    #[tracing::instrument(skip_all)]
    fn utah(&mut self, row: isize, col: isize, pos: usize) {
        self.module(row - 2, col - 2, pos, 1);
        self.module(row - 2, col - 1, pos, 2);
        self.module(row - 1, col - 2, pos, 3);
        self.module(row - 1, col - 1, pos, 4);
        self.module(row - 1, col, pos, 5);
        self.module(row, col - 2, pos, 6);
        self.module(row, col - 1, pos, 7);
        self.module(row, col, pos, 8);
    }

    #[tracing::instrument(skip_all)]
    fn corner1(&mut self, pos: usize) {
        let rows = self.rows as isize;
        let cols = self.cols as isize;
        self.module(rows - 1, 0, pos, 1);
        self.module(rows - 1, 1, pos, 2);
        self.module(rows - 1, 2, pos, 3);
        self.module(0, cols - 2, pos, 4);
        self.module(0, cols - 1, pos, 5);
        self.module(1, cols - 1, pos, 6);
        self.module(2, cols - 1, pos, 7);
        self.module(3, cols - 1, pos, 8);
    }

    #[tracing::instrument(skip_all)]
    fn corner2(&mut self, pos: usize) {
        let rows = self.rows as isize;
        let cols = self.cols as isize;
        self.module(rows - 3, 0, pos, 1);
        self.module(rows - 2, 0, pos, 2);
        self.module(rows - 1, 0, pos, 3);
        self.module(0, cols - 4, pos, 4);
        self.module(0, cols - 3, pos, 5);
        self.module(0, cols - 2, pos, 6);
        self.module(0, cols - 1, pos, 7);
        self.module(1, cols - 1, pos, 8);
    }

    #[tracing::instrument(skip_all)]
    fn corner3(&mut self, pos: usize) {
        let rows = self.rows as isize;
        let cols = self.cols as isize;
        self.module(rows - 3, 0, pos, 1);
        self.module(rows - 2, 0, pos, 2);
        self.module(rows - 1, 0, pos, 3);
        self.module(0, cols - 2, pos, 4);
        self.module(0, cols - 1, pos, 5);
        self.module(1, cols - 1, pos, 6);
        self.module(2, cols - 1, pos, 7);
        self.module(3, cols - 1, pos, 8);
    }

    #[tracing::instrument(skip_all)]
    fn corner4(&mut self, pos: usize) {
        let rows = self.rows as isize;
        let cols = self.cols as isize;
        self.module(rows - 1, 0, pos, 1);
        self.module(rows - 1, cols - 1, pos, 2);
        self.module(0, cols - 3, pos, 3);
        self.module(0, cols - 2, pos, 4);
        self.module(0, cols - 1, pos, 5);
        self.module(1, cols - 3, pos, 6);
        self.module(1, cols - 2, pos, 7);
        self.module(1, cols - 1, pos, 8);
    }

    /// Sweep the region diagonally, reading codewords per the ECC 200 algorithm,
    /// and return the recovered `data || ecc` codewords alongside a per-codeword
    /// erasure flag.
    #[tracing::instrument(skip_all)]
    fn run(mut self) -> (Vec<u8>, Vec<bool>) {
        let rows = self.rows as isize;
        let cols = self.cols as isize;
        let mut pos = 0usize;
        let mut row: isize = 4;
        let mut col: isize = 0;

        loop {
            // Corner cases handled before the regular diagonal sweeps.
            if row == rows && col == 0 {
                self.corner1(pos);
                pos += 1;
            }
            if row == rows - 2 && col == 0 && cols % 4 != 0 {
                self.corner2(pos);
                pos += 1;
            }
            if row == rows - 2 && col == 0 && cols % 8 == 4 {
                self.corner3(pos);
                pos += 1;
            }
            if row == rows + 4 && col == 2 && cols % 8 == 0 {
                self.corner4(pos);
                pos += 1;
            }

            // Sweep upwards and to the right.
            loop {
                if row < rows && col >= 0 && !self.has_bit(col as usize, row as usize) {
                    self.utah(row, col, pos);
                    pos += 1;
                }
                row -= 2;
                col += 2;
                if row < 0 || col >= cols {
                    break;
                }
            }
            row += 1;
            col += 3;

            // Sweep downwards and to the left.
            loop {
                if row >= 0 && col < cols && !self.has_bit(col as usize, row as usize) {
                    self.utah(row, col, pos);
                    pos += 1;
                }
                row += 2;
                col -= 2;
                if row >= rows || col < 0 {
                    break;
                }
            }
            row += 3;
            col += 1;

            if row >= rows && col >= cols {
                break;
            }
        }

        (self.codewords, self.codeword_erased)
    }
}

// Native-only: these tests use the separate encoder crate to build matrices.
// Excluded from the wasm target so `wasm-pack test` doesn't link the encoder's
// wasm-bindgen exports alongside the decoder's (which would collide).
#[cfg(all(test, not(target_arch = "wasm32")))]
mod tests {
    use super::{decode, decode_rectangular, decode_with_erasures};
    use mission_platform_matrix_code_encode::encode_modules;

    /// Encode `text` as a square Data Matrix and yield the decoder's
    /// `[width, height, ...modules]` input shape.
    #[tracing::instrument(skip_all)]
    fn matrix_for(text: &str) -> Vec<u8> {
        encode_modules("datamatrix", text).expect("payload fits a supported symbol")
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn round_trips_a_numeric_payload() {
        let decoded = decode(&matrix_for("123456")).expect("should decode");
        assert_eq!(String::from_utf8(decoded).unwrap(), "123456");
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn round_trips_letters_and_symbols() {
        for text in [
            "HELLO",
            "https://mission-platform.dev",
            "A1B2C3",
            "Order #42!",
        ] {
            let decoded = decode(&matrix_for(text)).expect("should decode");
            assert_eq!(
                String::from_utf8(decoded).unwrap(),
                text,
                "round-trip {text:?}"
            );
        }
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn round_trips_extended_bytes() {
        // A byte >= 128 encodes via the Upper-Shift escape and must round-trip.
        let text = "café";
        let decoded = decode(&matrix_for(text)).expect("should decode");
        assert_eq!(String::from_utf8(decoded).unwrap(), text);
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn round_trips_gs1_data_matrix() {
        // A GS1 Data Matrix leads with an FNC1 codeword, which is skipped on
        // decode, so the literal payload round-trips unchanged.
        let text = "0102345678901234";
        let matrix = encode_modules("gs1datamatrix", text).expect("valid GS1 payload");
        let decoded = decode(&matrix).expect("should decode");
        assert_eq!(String::from_utf8(decoded).unwrap(), text);
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn corrects_errors_within_ecc_capacity() {
        // The 10×10 symbol has 5 ECC codewords, so up to 2 corrupted codewords
        // are recoverable. Flip two interior modules and confirm recovery.
        let mut matrix = matrix_for("123456");
        let size = matrix[0] as usize;
        matrix[2 + 3 * size + 3] ^= 1;
        matrix[2 + 4 * size + 4] ^= 1;
        let decoded = decode(&matrix).expect("should decode despite damage");
        assert_eq!(String::from_utf8(decoded).unwrap(), "123456");
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn erasures_recover_damage_a_blind_decode_cannot() {
        // A larger symbol with more ECC headroom: damage more codewords than the
        // blind path can repair, then mark exactly those modules as erasures.
        let text = "A".repeat(20);
        let clean = matrix_for(&text);
        let size = clean[0] as usize;

        let mut damaged = clean.clone();
        let mut mask = vec![0u8; size * size];
        // Damage a block of interior data modules beyond blind ECC capacity.
        for y in 3..8 {
            for x in 1..(size - 1) {
                damaged[2 + y * size + x] ^= 1;
                mask[y * size + x] = 1;
            }
        }

        assert!(
            decode(&damaged).is_none(),
            "blind decode should fail on damage beyond its capacity"
        );
        let decoded = decode_with_erasures(&damaged, &mask).expect("erasure decode should recover");
        assert_eq!(String::from_utf8(decoded).unwrap(), text);
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn round_trips_rectangular_symbols() {
        for text in ["123456", "HELLO", "Order #42!", "café", &"A".repeat(24)] {
            let matrix = encode_modules("datamatrixrectangular", text).expect("fits a symbol");
            assert_ne!(matrix[0], matrix[1], "rectangular symbol is not square");
            let decoded = decode_rectangular(&matrix).expect("should decode");
            assert_eq!(
                String::from_utf8(decoded).unwrap(),
                text,
                "round-trip {text:?}"
            );
        }
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn corrects_errors_in_a_two_region_rectangular_symbol() {
        // The 16×36 symbol has 24 ECC codewords across two data regions; flip a
        // few modules and confirm Reed-Solomon still recovers the payload.
        let text = "A".repeat(24);
        let mut matrix = encode_modules("datamatrixrectangular", &text).expect("fits");
        let width = matrix[0] as usize;
        matrix[2 + 4 * width + 5] ^= 1;
        matrix[2 + 6 * width + 20] ^= 1;
        let decoded = decode_rectangular(&matrix).expect("should decode despite damage");
        assert_eq!(String::from_utf8(decoded).unwrap(), text);
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn rejects_a_non_square_buffer_as_square() {
        // A rectangular buffer is refused by the square decoder.
        let matrix = encode_modules("datamatrixrectangular", "123456").expect("fits");
        assert!(
            decode(&matrix).is_none(),
            "square decoder rejects rectangular"
        );
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn rejects_a_malformed_buffer() {
        assert!(decode(&[]).is_none(), "empty buffer");
        assert!(decode(&[10, 0, 1]).is_none(), "length does not match size²");
        // A supported size but all-light modules cannot be corrected.
        let size = 10usize;
        let mut matrix = vec![0u8; 2 + size * size];
        matrix[0] = size as u8;
        matrix[1] = size as u8;
        assert!(decode(&matrix).is_none(), "uncorrectable matrix");
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn rejects_an_unsupported_size() {
        // 11 is not one of the supported square symbols.
        let size = 11usize;
        let mut matrix = vec![0u8; 2 + size * size];
        matrix[0] = size as u8;
        matrix[1] = size as u8;
        assert!(decode(&matrix).is_none());
    }
}
