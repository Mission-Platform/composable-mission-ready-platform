//! Data Matrix ECC 200 encoder (square symbols with a single data region).
//!
//! The pipeline mirrors the ISO/IEC 16022 reference: encode the payload into
//! codewords with the ASCII encodation scheme, select the smallest square
//! symbol that fits, pad with the 253-state randomising algorithm, append
//! Reed-Solomon error-correction codewords, place the codewords into the data
//! region with the ECC 200 placement algorithm, and finally wrap the region in
//! its finder / timing pattern.
//!
//! Only single-data-region square symbols (10×10 … 26×26, up to 44 data
//! codewords) are supported; larger symbols split into multiple data regions
//! and are intentionally out of scope for this from-scratch encoder.
//!
use mission_platform_matrix_code_common::datamatrix_layout::Layout;
use mission_platform_matrix_code_common::reed_solomon;

/// A supported square symbol: full `size` (incl. finder), data-region width, and
/// the data / error codeword counts for ECC 200.
#[derive(Debug)]
struct Symbol {
    /// Full symbol edge length in modules (data region + 2-module finder).
    size: usize,
    /// Number of data codewords the symbol carries.
    data: usize,
    /// Number of Reed-Solomon error-correction codewords.
    ecc: usize,
}

/// Single-data-region square symbols, smallest first (ISO/IEC 16022 ECC 200).
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

/// A supported rectangular symbol (ISO/IEC 16022 ECC 200). The wider sizes lay
/// two identical data regions side by side, separated by an internal finder /
/// timing column; `grid_cols` is that region count.
#[derive(Debug)]
struct RectSymbol {
    /// Height of one data region, in modules.
    region_rows: usize,
    /// Width of one data region, in modules.
    region_cols: usize,
    /// Number of data regions placed horizontally (1 or 2).
    grid_cols: usize,
    /// Number of data codewords the symbol carries.
    data: usize,
    /// Number of Reed-Solomon error-correction codewords.
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

/// The six standard rectangular symbols (8×18 … 16×48), smallest first.
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

/// The FNC1 codeword. As the first data codeword it flags a GS1 Data Matrix
/// symbol (a stream of GS1 Application Identifiers).
const FNC1: u8 = 232;

/// Encode `data` into a Data Matrix symbol, returning a packed
/// `[size, ...modules]` buffer (row-major, `1` = dark). Returns `None` when the
/// payload is empty or too large for the supported single-region symbols.
#[tracing::instrument(skip_all)]
pub fn encode(data: &str) -> Option<Vec<u8>> {
    if data.is_empty() {
        return None;
    }
    encode_codewords(encode_ascii(data.as_bytes()))
}

/// Encode `data` into a GS1 Data Matrix symbol: an ordinary Data Matrix whose
/// first data codeword is FNC1, marking the payload as a stream of GS1
/// Application Identifiers. Returns `None` under the same conditions as
/// [`encode`].
#[tracing::instrument(skip_all)]
pub fn encode_gs1(data: &str) -> Option<Vec<u8>> {
    if data.is_empty() {
        return None;
    }
    let mut codewords = vec![FNC1];
    codewords.extend(encode_ascii(data.as_bytes()));
    encode_codewords(codewords)
}

/// Shared back half of the encoder: select the smallest fitting symbol, pad and
/// add error correction, place and render, returning the packed buffer.
#[tracing::instrument(skip_all)]
fn encode_codewords(codewords: Vec<u8>) -> Option<Vec<u8>> {
    tracing::trace!("datamatrix: {} codeword(s)", codewords.len());
    let symbol = SYMBOLS
        .iter()
        .find(|candidate| candidate.data >= codewords.len())?;
    let (size, data_cw, ecc_cw) = (symbol.size, symbol.data, symbol.ecc);
    tracing::debug!(
        "datamatrix: selected {size}x{size} symbol ({data_cw} data + {ecc_cw} ecc codewords)"
    );

    let message = pad_and_ecc(codewords, symbol.data, symbol.ecc);
    let region = symbol.size - 2;
    let bits = place(&message, region);
    let matrix = render(&bits, region, symbol.size);

    let mut packed = Vec::with_capacity(2 + matrix.len());
    packed.push(symbol.size as u8); // width
    packed.push(symbol.size as u8); // height (square)
    packed.extend(matrix);
    Some(packed)
}

/// Encode `data` into a rectangular Data Matrix symbol (8×18 … 16×48), returning
/// a packed `[width, height, ...modules]` buffer (row-major, `1` = dark).
/// Returns `None` when the payload is empty or too large for the rectangular
/// symbols. Shares the ASCII encodation, padding, Reed-Solomon and ECC 200
/// module placement with the square encoder; only the finder / timing render and
/// symbol table differ.
#[tracing::instrument(skip_all)]
pub fn encode_rectangular(data: &str) -> Option<Vec<u8>> {
    if data.is_empty() {
        return None;
    }
    let codewords = encode_ascii(data.as_bytes());
    let symbol = RECT_SYMBOLS
        .iter()
        .find(|candidate| candidate.data >= codewords.len())?;
    let layout = symbol.layout();
    tracing::debug!(
        "datamatrix: selected {}x{} rectangular symbol ({} data + {} ecc codewords)",
        layout.width(),
        layout.height(),
        symbol.data,
        symbol.ecc
    );

    let message = pad_and_ecc(codewords, symbol.data, symbol.ecc);
    let bits = place_matrix(&message, layout.mapping_rows(), layout.mapping_cols());
    let matrix = render_layout(&bits, &layout);

    let mut packed = Vec::with_capacity(2 + matrix.len());
    packed.push(layout.width() as u8);
    packed.push(layout.height() as u8);
    packed.extend(matrix);
    Some(packed)
}

/// Encode bytes with the Data Matrix ASCII encodation scheme: digit pairs pack
/// into a single codeword, printable ASCII maps to `byte + 1`, and extended
/// bytes use an Upper-Shift (235) escape.
#[tracing::instrument(skip_all)]
fn encode_ascii(data: &[u8]) -> Vec<u8> {
    let mut codewords = Vec::new();
    let mut index = 0;
    while index < data.len() {
        let byte = data[index];
        let next_is_digit = index + 1 < data.len() && data[index + 1].is_ascii_digit();
        if byte.is_ascii_digit() && next_is_digit {
            // Two consecutive digits pack into one codeword (value + 130).
            let pair = (byte - b'0') * 10 + (data[index + 1] - b'0');
            codewords.push(pair + 130);
            index += 2;
        } else if byte < 128 {
            codewords.push(byte + 1);
            index += 1;
        } else {
            // Upper Shift, then the low-7-bit character (+1).
            codewords.push(235);
            codewords.push(byte - 128 + 1);
            index += 1;
        }
    }
    codewords
}

/// Pad `codewords` to the symbol's data capacity (first pad `129`, the rest via
/// the 253-state randomising algorithm) then append the Reed-Solomon codewords.
#[tracing::instrument(skip_all)]
fn pad_and_ecc(mut codewords: Vec<u8>, data: usize, ecc: usize) -> Vec<u8> {
    if codewords.len() < data {
        codewords.push(129); // First pad codeword (EOD).
        while codewords.len() < data {
            // `position` is the 1-based codeword position within the symbol.
            let position = codewords.len() + 1;
            let pseudo = ((149 * position) % 253) + 1;
            let value = 129 + pseudo;
            codewords.push((if value <= 254 { value } else { value - 254 }) as u8);
        }
    }

    let parity = reed_solomon::error_correction(&codewords, ecc);
    tracing::trace!(
        "datamatrix: appended {} Reed-Solomon codeword(s)",
        parity.len()
    );
    codewords.extend(parity);
    codewords
}

/// The ECC 200 codeword placement matrix. `region` is the data-region edge; the
/// returned buffer is `region * region` booleans (`true` = dark), row-major.
#[tracing::instrument(skip_all)]
fn place(codewords: &[u8], region: usize) -> Vec<bool> {
    place_matrix(codewords, region, region)
}

/// The ECC 200 codeword placement over a general `rows × cols` mapping matrix
/// (rectangular symbols), returning `rows * cols` booleans (`true` = dark),
/// row-major.
#[tracing::instrument(skip_all)]
fn place_matrix(codewords: &[u8], rows: usize, cols: usize) -> Vec<bool> {
    let mut placement = Placement::new(codewords, rows, cols);
    placement.run();
    placement.bits
}

/// State for the ISO/IEC 16022 Annex F ("de facto") module-placement algorithm.
#[derive(Debug)]
struct Placement<'a> {
    codewords: &'a [u8],
    rows: usize,
    cols: usize,
    /// `true` once a module has been assigned; parallel to `bits`.
    filled: Vec<bool>,
    bits: Vec<bool>,
}

impl<'a> Placement<'a> {
    #[tracing::instrument(skip_all)]
    fn new(codewords: &'a [u8], rows: usize, cols: usize) -> Self {
        Placement {
            codewords,
            rows,
            cols,
            filled: vec![false; rows * cols],
            bits: vec![false; rows * cols],
        }
    }

    /// Whether the module at (`col`, `row`) has already been assigned.
    #[tracing::instrument(skip_all)]
    fn has_bit(&self, col: usize, row: usize) -> bool {
        self.filled[row * self.cols + col]
    }

    /// Assign bit `value` at (`col`, `row`).
    #[tracing::instrument(skip_all)]
    fn set_bit(&mut self, col: usize, row: usize, value: bool) {
        let offset = row * self.cols + col;
        self.filled[offset] = true;
        self.bits[offset] = value;
    }

    /// Place one bit of codeword `pos`, wrapping the coordinates around the
    /// region edges per the placement algorithm. `bit` is 1..=8 (MSB first).
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
        let value = (self.codewords[pos] >> (8 - bit)) & 1 == 1;
        self.set_bit(col as usize, row as usize, value);
    }

    /// Place all eight bits of codeword `pos` in the standard "utah" L shape.
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

    /// Sweep the region diagonally, placing codewords per the ECC 200 algorithm.
    #[tracing::instrument(skip_all)]
    fn run(&mut self) {
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

        // Bottom-right corner module, if it was left unfilled.
        let last = (self.rows - 1, self.cols - 1);
        if !self.has_bit(last.1, last.0) {
            self.set_bit(self.cols - 1, self.rows - 1, true);
            self.set_bit(self.cols - 2, self.rows - 2, true);
        }
    }
}

/// Wrap the placed data region (`region × region` bits) in its ECC 200 finder /
/// timing pattern, producing the full `size × size` symbol as row-major bytes
/// (`1` = dark).
///
/// The construction follows the ISO/IEC 16022 low-level layout: the left and
/// bottom edges of the region form the solid "L" finder, while the top and
/// right edges are the alternating timing pattern.
#[tracing::instrument(skip_all)]
fn render(bits: &[bool], region: usize, size: usize) -> Vec<u8> {
    let mut matrix = vec![0u8; size * size];
    let mut set = |x: usize, y: usize, dark: bool| {
        matrix[y * size + x] = u8::from(dark);
    };

    let mut matrix_y = 0usize;
    for y in 0..region {
        // Top edge: alternating timing (dark on even columns), full width.
        if y == 0 {
            for x in 0..size {
                set(x, matrix_y, x % 2 == 0);
            }
            matrix_y += 1;
        }

        let mut matrix_x = 0usize;
        for x in 0..region {
            // Left edge: solid dark finder.
            if x == 0 {
                set(matrix_x, matrix_y, true);
                matrix_x += 1;
            }
            set(matrix_x, matrix_y, bits[y * region + x]);
            matrix_x += 1;
            // Right edge: alternating timing (dark on even data rows).
            if x == region - 1 {
                set(matrix_x, matrix_y, y % 2 == 0);
                matrix_x += 1;
            }
        }
        matrix_y += 1;

        // Bottom edge: solid dark finder, full width.
        if y == region - 1 {
            for x in 0..size {
                set(x, matrix_y, true);
            }
            matrix_y += 1;
        }
    }

    matrix
}

/// Wrap a placed mapping matrix in the finder / timing borders described by
/// `layout`, producing the full `width × height` symbol as row-major bytes
/// (`1` = dark). Handles the multi-region rectangular symbols by drawing each
/// region's border in turn; the border phase is internal to this crate (the
/// decoder strips the borders and reads only the data cells via the same
/// [`Layout`]), so it need only be self-consistent.
#[tracing::instrument(skip_all)]
fn render_layout(bits: &[bool], layout: &Layout) -> Vec<u8> {
    let width = layout.width();
    let height = layout.height();
    let mut matrix = vec![0u8; width * height];
    let mut set = |x: usize, y: usize, dark: bool| {
        matrix[y * width + x] = u8::from(dark);
    };

    // Draw the finder "L" (solid left + bottom) and timing (top + right) around
    // every data region.
    for region_row in 0..layout.grid_rows {
        for region_col in 0..layout.grid_cols {
            let x0 = region_col * (layout.region_cols + 2);
            let y0 = region_row * (layout.region_rows + 2);
            let right = x0 + layout.region_cols + 1;
            let bottom = y0 + layout.region_rows + 1;
            for y in y0..=bottom {
                set(x0, y, true); // left finder (solid)
                set(right, y, (y - y0) % 2 == 1); // right timing
            }
            for x in x0..=right {
                set(x, y0, (x - x0) % 2 == 0); // top timing
                set(x, bottom, true); // bottom finder (solid)
            }
        }
    }

    // Fill the data cells from the placed mapping matrix.
    let mapping_cols = layout.mapping_cols();
    for mapping_row in 0..layout.mapping_rows() {
        for mapping_col in 0..mapping_cols {
            let (x, y) = layout.cell(mapping_row, mapping_col);
            set(x, y, bits[mapping_row * mapping_cols + mapping_col]);
        }
    }

    matrix
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Read the module at (`x`, `y`) from a packed `[width, height, ...modules]`
    /// symbol of the given `width`.
    #[tracing::instrument(skip_all)]
    fn module(symbol: &[u8], width: usize, x: usize, y: usize) -> u8 {
        symbol[2 + y * width + x]
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn ascii_encodation_packs_digit_pairs() {
        // "123456" → three digit-pair codewords (value + 130).
        assert_eq!(encode_ascii(b"123456"), vec![142, 164, 186]);
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn ascii_encodation_maps_letters_and_odd_digit() {
        // Letters map to `byte + 1`; a trailing lone digit stays single.
        assert_eq!(encode_ascii(b"A1"), vec![b'A' + 1, b'1' + 1]);
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn ascii_encodation_escapes_extended_bytes() {
        // Bytes >= 128 use the Upper-Shift (235) escape.
        assert_eq!(encode_ascii(&[0xE9]), vec![235, 0xE9 - 128 + 1]);
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn empty_payload_is_rejected() {
        assert!(encode("").is_none());
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn oversized_payload_is_rejected() {
        // More than 44 data codewords cannot fit the supported single-region
        // symbols, so encoding fails rather than truncating.
        let long = "A".repeat(45);
        assert!(encode(&long).is_none());
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn selects_smallest_fitting_symbol() {
        // Three codewords fit the smallest (10×10) symbol.
        let symbol = encode("123456").expect("valid payload");
        let width = symbol[0] as usize;
        let height = symbol[1] as usize;
        assert_eq!((width, height), (10, 10));
        assert_eq!(symbol.len(), 2 + width * height);
        assert!(symbol[2..].iter().all(|&bit| bit <= 1), "modules are 0/1");
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn grows_to_a_larger_symbol_when_needed() {
        // Twelve letters (12 codewords) need the 16×16 symbol (data = 12).
        let symbol = encode("ABCDEFGHIJKL").expect("valid payload");
        assert_eq!((symbol[0], symbol[1]), (16, 16));
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn rectangular_selects_smallest_fitting_symbol() {
        // Three codewords fit the smallest (8×18) rectangular symbol.
        let symbol = encode_rectangular("123456").expect("valid payload");
        let width = symbol[0] as usize;
        let height = symbol[1] as usize;
        assert_eq!((width, height), (18, 8), "width × height header");
        assert_eq!(symbol.len(), 2 + width * height);
        assert!(symbol[2..].iter().all(|&bit| bit <= 1), "modules are 0/1");
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn rectangular_grows_and_uses_two_regions() {
        // 16 data codewords need the 12×26 (single-region) symbol; 24 need the
        // 16×36 two-region symbol.
        let symbol = encode_rectangular(&"A".repeat(16)).expect("valid payload");
        assert_eq!((symbol[0], symbol[1]), (26, 12));
        let bigger = encode_rectangular(&"A".repeat(24)).expect("valid payload");
        assert_eq!((bigger[0], bigger[1]), (36, 16));
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn rectangular_rejects_empty_and_oversized() {
        assert!(encode_rectangular("").is_none());
        assert!(encode_rectangular(&"A".repeat(50)).is_none());
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn finder_and_timing_pattern_are_correct() {
        let symbol = encode("123456").expect("valid payload");
        let size = symbol[0] as usize;

        for coordinate in 0..size {
            // Left edge and bottom edge are the solid "L" finder.
            assert_eq!(module(&symbol, size, 0, coordinate), 1, "left edge solid");
            assert_eq!(
                module(&symbol, size, coordinate, size - 1),
                1,
                "bottom edge solid"
            );
            // Top edge and right edge are the alternating timing pattern.
            assert_eq!(
                module(&symbol, size, coordinate, 0),
                u8::from(coordinate % 2 == 0),
                "top timing"
            );
            assert_eq!(
                module(&symbol, size, size - 1, coordinate),
                u8::from((size - 1 - coordinate) % 2 == 0),
                "right timing",
            );
        }
    }
}
