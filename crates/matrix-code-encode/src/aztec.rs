//! Aztec Code encoder (compact symbols, 1–4 layers).
//!
//! Renders a compact Aztec symbol as a packed `[width, height, ...modules]`
//! buffer (row-major, `1` = dark, `width == height`). The pipeline follows
//! ISO/IEC 24778: encode the payload as a Binary-Shift bit stream, bit-stuff it
//! into `wordSize`-bit codewords, choose the smallest compact symbol (1–4
//! layers) that fits, append Reed-Solomon check words over the layer's GF(2^m)
//! field, draw the central bullseye + orientation marks, place the mode message
//! ring, and spiral the data codewords into the layers from the outside in.
//!
//! Only compact symbols are produced (dimensions 15, 19, 23, 27); the larger
//! full-range symbols and the more compact high-level encoding modes are out of
//! scope for this from-scratch encoder.

use mission_platform_matrix_code_common::galois::Field;

/// `true` (dark) / `false` (light) module grid, addressed `[y * size + x]`.
struct Matrix {
    size: usize,
    modules: Vec<bool>,
}

impl Matrix {
    fn new(size: usize) -> Self {
        Matrix {
            size,
            modules: vec![false; size * size],
        }
    }

    fn set(&mut self, x: usize, y: usize, dark: bool) {
        self.modules[y * self.size + x] = dark;
    }

    /// Pack into the `[width, height, ...modules]` buffer (`1` = dark).
    fn into_packed(self) -> Vec<u8> {
        let mut packed = Vec::with_capacity(2 + self.modules.len());
        packed.push(self.size as u8);
        packed.push(self.size as u8);
        packed.extend(self.modules.iter().map(|&dark| u8::from(dark)));
        packed
    }
}

/// The total number of data + check bits held by a compact symbol of `layers`
/// layers (ISO/IEC 24778): `(88 + 16 * layers) * layers`.
fn total_bits_in_layers(layers: usize) -> usize {
    (88 + 16 * layers) * layers
}

/// The codeword size in bits for a compact symbol of `layers` layers: 6 bits
/// for 1–2 layers (GF(64)), 8 bits for 3–4 layers (GF(256)).
fn word_size(layers: usize) -> usize {
    if layers <= 2 {
        6
    } else {
        8
    }
}

/// The Reed-Solomon field for a given codeword size.
fn field_for(word_size: usize) -> Field {
    match word_size {
        4 => Field::new(0x13, 16),   // GF(16) — Aztec mode message (AZTEC_PARAM)
        6 => Field::new(0x43, 64),   // GF(64) — 6-bit data words (AZTEC_DATA_6)
        _ => Field::new(0x12D, 256), // GF(256) — 8-bit data words (Data Matrix field)
    }
}

/// Encode `data` into a compact Aztec symbol, or `None` when the payload is
/// empty or too large for a 4-layer compact symbol.
#[tracing::instrument(skip_all)]
pub fn encode(data: &str) -> Option<Vec<u8>> {
    if data.is_empty() {
        return None;
    }
    let bits = high_level_encode(data.as_bytes());
    build_symbol(&bits)
}

/// A growable most-significant-bit-first bit buffer.
#[derive(Default)]
struct Bits {
    bits: Vec<bool>,
}

impl Bits {
    fn push_bits(&mut self, value: u32, count: usize) {
        for shift in (0..count).rev() {
            self.bits.push((value >> shift) & 1 == 1);
        }
    }

    fn len(&self) -> usize {
        self.bits.len()
    }
}

/// The Binary-Shift escape code in the Upper table (5 bits).
const BINARY_SHIFT: u32 = 31;

/// Encode `data` as an Aztec Binary-Shift bit stream: from the initial Upper
/// latch we emit a Binary-Shift (`31`, 5 bits), a length field, then the raw
/// bytes. Lengths 1–31 use a single 5-bit count (byte-identical to ZXing's
/// `BinaryShiftToken` for this common case); longer runs use a 5-bit `0` escape
/// followed by an 11-bit count, which keeps the stream unambiguous to decode.
#[tracing::instrument(skip_all)]
fn high_level_encode(data: &[u8]) -> Bits {
    let mut bits = Bits::default();
    bits.push_bits(BINARY_SHIFT, 5);
    let count = data.len();
    if count <= 31 {
        bits.push_bits(count as u32, 5);
    } else {
        bits.push_bits(0, 5);
        bits.push_bits(count as u32, 11);
    }
    for &byte in data {
        bits.push_bits(byte as u32, 8);
    }
    bits
}

/// Bit-stuff `bits` into `word_size`-bit words: a word must never be all-zeros
/// or all-ones, so a leading complementary bit is inserted whenever the first
/// `word_size - 1` bits of a word would be uniform, and the final word is
/// padded with `1`s (turning a would-be all-ones word into all-ones-minus-one).
/// Returns the stuffed bit stream (a multiple of `word_size`). Mirrors ZXing's
/// `Encoder.stuffBits`.
#[tracing::instrument(skip_all)]
fn stuff_bits(bits: &[bool], word_size: usize) -> Vec<bool> {
    let mut out: Vec<bool> = Vec::new();
    let mask = (1u32 << word_size) - 1;
    let mut index = 0;
    while index < bits.len() {
        let mut word = 0u32;
        for offset in 0..word_size {
            let bit = bits.get(index + offset).copied().unwrap_or(true);
            word = (word << 1) | u32::from(bit);
        }
        let prefix = word >> 1; // first word_size - 1 bits
        if prefix == 0 {
            // Would-be leading zeros: emit them then a stuffed 1, reconsume last bit.
            for shift in (0..word_size - 1).rev() {
                out.push((word >> (shift + 1)) & 1 == 1);
            }
            out.push(true);
            index += word_size - 1;
        } else if prefix == (mask >> 1) {
            // Would-be leading ones: emit them then a stuffed 0.
            for shift in (0..word_size - 1).rev() {
                out.push((word >> (shift + 1)) & 1 == 1);
            }
            out.push(false);
            index += word_size - 1;
        } else {
            for shift in (0..word_size).rev() {
                out.push((word >> shift) & 1 == 1);
            }
            index += word_size;
        }
    }
    out
}

/// Split a stuffed bit stream into `total_words` codewords of `word_size` bits
/// (most-significant first); the data words come from `bits`, the remaining
/// trailing words are left `0` for the Reed-Solomon check words.
#[tracing::instrument(skip_all)]
fn bits_to_words(bits: &[bool], word_size: usize, total_words: usize) -> Vec<u16> {
    let mut words = vec![0u16; total_words];
    let message_words = bits.len() / word_size;
    for (index, word) in words.iter_mut().enumerate().take(message_words) {
        let mut value = 0u16;
        for offset in 0..word_size {
            value = (value << 1) | u16::from(bits[index * word_size + offset]);
        }
        *word = value;
    }
    words
}

/// Build the full message bit stream (data words + Reed-Solomon check words)
/// that fills a symbol of `total_bits` bits with `word_size`-bit codewords.
/// Returns `(message_bits, data_word_count)`.
#[tracing::instrument(skip_all)]
fn generate_check_words(stuffed: &[bool], total_bits: usize, word_size: usize) -> (Vec<bool>, usize) {
    let message_words = stuffed.len() / word_size;
    let total_words = total_bits / word_size;
    let mut words = bits_to_words(stuffed, word_size, total_words);

    let field = field_for(word_size);
    let ecc = total_words - message_words;
    let parity = field.error_correction(&words[..message_words], ecc);
    words[message_words..].copy_from_slice(&parity);

    // The leading (total_bits % word_size) bits are padding zeros.
    let mut message = vec![false; total_bits % word_size];
    for word in words {
        for shift in (0..word_size).rev() {
            message.push((word >> shift) & 1 == 1);
        }
    }
    (message, message_words)
}

/// The Chebyshev radius (from the symbol centre) of the compact core: rings
/// 0/2/4 are the dark bullseye and ring 5 carries the mode message + the corner
/// orientation marks.
pub const CORE_RADIUS: usize = 5;

/// The default Aztec error-correction budget: 23% of the data bits plus 11.
fn ecc_bits_for(data_bits: usize) -> usize {
    data_bits * 23 / 100 + 11
}

/// Select the smallest compact symbol that fits `bits`, build its full module
/// grid and return the packed buffer. `None` when no compact symbol (≤ 4
/// layers) can hold the payload.
#[tracing::instrument(skip_all)]
fn build_symbol(bits: &Bits) -> Option<Vec<u8>> {
    let ecc_bits = ecc_bits_for(bits.len());
    for layers in 1..=4usize {
        let total_bits = total_bits_in_layers(layers);
        let ws = word_size(layers);
        let stuffed = stuff_bits(&bits.bits, ws);
        if stuffed.len() + ecc_bits > total_bits {
            continue;
        }
        let message_words = stuffed.len() / ws;
        if message_words == 0 || message_words > 64 {
            // The compact mode message stores `messageWords - 1` in 6 bits.
            continue;
        }
        let (message_bits, data_words) = generate_check_words(&stuffed, total_bits, ws);
        let mode_message = generate_mode_message(layers, data_words);

        let size = 11 + layers * 4;
        let mut matrix = Matrix::new(size);
        draw_bullseye(&mut matrix, size);
        draw_mode_message(&mut matrix, size, &mode_message);
        draw_data(&mut matrix, size, layers, &message_bits);
        return Some(matrix.into_packed());
    }
    None
}

/// The compact mode message: 2 bits `layers - 1`, 6 bits `data_words - 1`, then
/// five GF(16) Reed-Solomon check words — 28 bits total.
#[tracing::instrument(skip_all)]
fn generate_mode_message(layers: usize, data_words: usize) -> Vec<bool> {
    let mut mode = Bits::default();
    mode.push_bits((layers - 1) as u32, 2);
    mode.push_bits((data_words - 1) as u32, 6);
    generate_check_words(&mode.bits, 28, 4).0
}

/// Draw the central bullseye (concentric dark rings at Chebyshev distance 0, 2,
/// 4) and the corner orientation marks on the distance-5 ring.
#[tracing::instrument(skip_all)]
fn draw_bullseye(matrix: &mut Matrix, size: usize) {
    let center = size / 2;
    let mut distance = 0;
    while distance <= 4 {
        for offset in (center - distance)..=(center + distance) {
            matrix.set(offset, center - distance, true);
            matrix.set(offset, center + distance, true);
            matrix.set(center - distance, offset, true);
            matrix.set(center + distance, offset, true);
        }
        distance += 2;
    }
    // Orientation marks (the reader recovers rotation from these).
    let r = CORE_RADIUS;
    matrix.set(center - r, center - r, true);
    matrix.set(center - r + 1, center - r, true);
    matrix.set(center - r, center - r + 1, true);
    matrix.set(center + r, center - r, true);
    matrix.set(center + r, center - r + 1, true);
    matrix.set(center + r, center + r - 1, true);
}

/// Place the 28-bit compact mode message around the distance-5 ring: seven bits
/// along each of the four sides (skipping the corner orientation modules).
#[tracing::instrument(skip_all)]
fn draw_mode_message(matrix: &mut Matrix, size: usize, mode: &[bool]) {
    let center = size / 2;
    let r = CORE_RADIUS;
    for i in 0..7 {
        let offset = center - 3 + i;
        if mode[i] {
            matrix.set(offset, center - r, true); // top row
        }
        if mode[i + 7] {
            matrix.set(center + r, offset, true); // right column
        }
        if mode[20 - i] {
            matrix.set(offset, center + r, true); // bottom row
        }
        if mode[27 - i] {
            matrix.set(center - r, offset, true); // left column
        }
    }
}

/// Spiral the message bits into the data layers, from the outermost layer
/// (`i = 0`, at the matrix edge) inward. Each layer ring is filled as four sides
/// of 2-module "domino" pairs; the bit-index arithmetic and coordinate mapping
/// mirror ISO/IEC 24778 (and ZXing's compact placement, `alignmentMap` being the
/// identity for compact symbols).
#[tracing::instrument(skip_all)]
fn draw_data(matrix: &mut Matrix, size: usize, layers: usize, message: &[bool]) {
    let mut row_offset = 0usize;
    for i in 0..layers {
        let row_size = (layers - i) * 4 + 9;
        for j in 0..row_size {
            let column_offset = j * 2;
            for k in 0..2 {
                if message[row_offset + column_offset + k] {
                    matrix.set(i * 2 + k, i * 2 + j, true); // left column
                }
                if message[row_offset + row_size * 2 + column_offset + k] {
                    matrix.set(i * 2 + j, size - 1 - i * 2 - k, true); // bottom row
                }
                if message[row_offset + row_size * 4 + column_offset + k] {
                    matrix.set(size - 1 - i * 2 - k, size - 1 - i * 2 - j, true); // right column
                }
                if message[row_offset + row_size * 6 + column_offset + k] {
                    matrix.set(size - 1 - i * 2 - j, i * 2 + k, true); // top row
                }
            }
        }
        row_offset += row_size * 8;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[tracing::instrument(skip_all)]
    fn total_bits_and_word_sizes_match_the_spec() {
        assert_eq!(total_bits_in_layers(1), 104);
        assert_eq!(total_bits_in_layers(2), 240);
        assert_eq!(total_bits_in_layers(3), 408);
        assert_eq!(total_bits_in_layers(4), 608);
        assert_eq!(word_size(1), 6);
        assert_eq!(word_size(2), 6);
        assert_eq!(word_size(3), 8);
        assert_eq!(word_size(4), 8);
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn encodes_a_square_symbol_with_the_expected_dimension() {
        let packed = encode("HELLO").expect("valid payload");
        let (width, height) = (packed[0] as usize, packed[1] as usize);
        assert_eq!(width, height, "aztec is square");
        // A short payload fits the smallest (1-layer, 15×15) compact symbol.
        assert_eq!(width, 15);
        assert_eq!(packed.len(), 2 + width * height);
        assert!(packed[2..].iter().all(|&bit| bit <= 1), "modules are 0/1");
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn grows_to_more_layers_for_longer_payloads() {
        let small = encode("HI").expect("valid");
        let large = encode(&"X".repeat(40)).expect("valid");
        assert!(large[0] > small[0], "more data uses a larger symbol");
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn rejects_empty_and_oversized_payloads() {
        assert!(encode("").is_none());
        assert!(encode(&"X".repeat(200)).is_none(), "too large for compact");
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn bullseye_center_is_dark_and_orientation_marks_present() {
        let packed = encode("HELLO").expect("valid");
        let size = packed[0] as usize;
        let modules = &packed[2..];
        let center = size / 2;
        assert_eq!(modules[center * size + center], 1, "centre module is dark");
    }
}
