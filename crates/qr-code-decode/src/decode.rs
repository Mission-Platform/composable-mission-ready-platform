//! From-scratch QR decode: recover the payload from a module matrix.
//!
//! Input is a packed `[size, ...modules]` buffer (row-major, `1` = dark). The
//! decoder recovers the format info (ECC level + data mask), unmasks the data
//! region, reads the codewords back in the encoder's zig-zag order,
//! de-interleaves the Reed-Solomon blocks, corrects errors, and parses the
//! byte-mode segment. Returns the decoded UTF-8 bytes, or `None` on failure.

use mission_platform_qr_code_common::builder::{mask_condition, QrBuilder};
use mission_platform_qr_code_common::gf::correct_block_with_erasures;
use mission_platform_qr_code_common::tables::{
    byte_mode_char_count_bits, num_raw_data_modules, ECC_CODEWORDS_PER_BLOCK, ECC_FORMAT_BITS,
    NUM_ERROR_CORRECTION_BLOCKS,
};

/// The 15 module coordinates of the primary format-info copy, in bit order
/// (matching the encoder's `draw_format_bits`).
const FORMAT_COORDS: [(i32, i32); 15] = [
    (8, 0),
    (8, 1),
    (8, 2),
    (8, 3),
    (8, 4),
    (8, 5),
    (8, 7),
    (8, 8),
    (7, 8),
    (5, 8),
    (4, 8),
    (3, 8),
    (2, 8),
    (1, 8),
    (0, 8),
];

#[tracing::instrument(skip_all)]
fn format_pattern(ecc: i32, mask: i32) -> u32 {
    let data = (ECC_FORMAT_BITS[ecc as usize] << 3) | mask;
    let mut rem = data;
    for _ in 0..10 {
        rem = (rem << 1) ^ (((rem >> 9) & 1) * 0x537);
    }
    (((data << 10) | rem) ^ 0x5412) as u32
}

/// Recover `(ecc, mask)` from the format-info modules using the BCH code's
/// error-correcting distance (up to 3 bit errors).
#[tracing::instrument(skip_all)]
fn read_format(modules: &[Vec<bool>]) -> Option<(i32, i32)> {
    let mut fmt = 0u32;
    for (i, &(x, y)) in FORMAT_COORDS.iter().enumerate() {
        if modules[y as usize][x as usize] {
            fmt |= 1 << i;
        }
    }
    let mut best: Option<(i32, i32)> = None;
    let mut best_distance = u32::MAX;
    for ecc in 0..4 {
        for mask in 0..8 {
            let distance = (fmt ^ format_pattern(ecc, mask)).count_ones();
            if distance < best_distance {
                best_distance = distance;
                best = Some((ecc, mask));
            }
        }
    }
    if best_distance <= 3 {
        best
    } else {
        None
    }
}

/// A most-significant-bit-first reader over a codeword byte stream.
#[derive(Debug)]
struct BitReader<'a> {
    data: &'a [u8],
    position: usize,
}

impl<'a> BitReader<'a> {
    #[tracing::instrument(skip_all)]
    fn new(data: &'a [u8]) -> Self {
        BitReader { data, position: 0 }
    }

    #[tracing::instrument(skip_all)]
    fn remaining(&self) -> usize {
        self.data.len() * 8 - self.position
    }

    #[tracing::instrument(skip_all)]
    fn read(&mut self, count: usize) -> Option<u32> {
        if self.remaining() < count {
            return None;
        }
        let mut value = 0u32;
        for _ in 0..count {
            let byte = self.data[self.position >> 3];
            let bit = (byte >> (7 - (self.position & 7))) & 1;
            value = (value << 1) | bit as u32;
            self.position += 1;
        }
        Some(value)
    }
}

/// De-interleave the raw codewords into blocks and Reed-Solomon-correct each,
/// returning the concatenated data codewords in block order.
///
/// `erased` is a per-raw-codeword flag (same order and length as `codewords`);
/// `true` marks a codeword whose modules were sampled with low confidence, so
/// its position is handed to the corrector as a Reed-Solomon **erasure** (worth
/// twice an unknown error). An all-`false` (or empty) slice reduces to blind
/// error correction.
#[tracing::instrument(skip_all)]
fn deinterleave_and_correct(
    codewords: &[u8],
    erased: &[bool],
    version: i32,
    ecc: i32,
) -> Option<Vec<u8>> {
    let number_blocks = NUM_ERROR_CORRECTION_BLOCKS[ecc as usize][version as usize] as usize;
    let block_ecc_length = ECC_CODEWORDS_PER_BLOCK[ecc as usize][version as usize] as usize;
    let raw_codewords = (num_raw_data_modules(version) / 8) as usize;
    let number_short_blocks = number_blocks - (raw_codewords % number_blocks);
    let short_block_length = raw_codewords / number_blocks;
    let columns = short_block_length + 1;

    // Reverse the interleave: fill `blocks[block][column]`, skipping the pad
    // cell short blocks carry at column `short_block_length - block_ecc_length`.
    // `block_erased` follows the exact same scatter so each codeword keeps its
    // erasure flag.
    let mut blocks = vec![vec![0u8; columns]; number_blocks];
    let mut block_erased = vec![vec![false; columns]; number_blocks];
    let pad_column = short_block_length - block_ecc_length;
    let mut stream = 0usize;
    for index in 0..columns {
        for block_index in 0..number_blocks {
            let skip = index == pad_column && block_index < number_short_blocks;
            if !skip {
                if stream >= codewords.len() {
                    return None;
                }
                blocks[block_index][index] = codewords[stream];
                block_erased[block_index][index] = erased.get(stream).copied().unwrap_or(false);
                stream += 1;
            }
        }
    }

    let mut data: Vec<u8> = Vec::new();
    for block_index in 0..number_blocks {
        let is_short = block_index < number_short_blocks;
        // Assemble the RS codeword (data || ecc), dropping the pad column, and
        // collect the erasure positions (index into the assembled codeword).
        let mut codeword: Vec<u8> = Vec::with_capacity(columns);
        let mut erasures: Vec<usize> = Vec::new();
        for index in 0..columns {
            if is_short && index == pad_column {
                continue;
            }
            if block_erased[block_index][index] {
                erasures.push(codeword.len());
            }
            codeword.push(blocks[block_index][index]);
        }
        if !correct_block_with_erasures(&mut codeword, block_ecc_length, &erasures) {
            return None;
        }
        let data_length = codeword.len() - block_ecc_length;
        data.extend_from_slice(&codeword[..data_length]);
    }
    Some(data)
}

/// Parse a single byte-mode segment from the corrected data codewords.
#[tracing::instrument(skip_all)]
fn parse_bytes(data: &[u8], version: i32) -> Option<Vec<u8>> {
    let mut reader = BitReader::new(data);
    let mode = reader.read(4)?;
    if mode != 0x4 {
        // Only byte mode is emitted by this encoder.
        return None;
    }
    let count = reader.read(byte_mode_char_count_bits(version) as usize)? as usize;
    if reader.remaining() < count * 8 {
        return None;
    }
    let mut out = Vec::with_capacity(count);
    for _ in 0..count {
        out.push(reader.read(8)? as u8);
    }
    Some(out)
}

/// Decode a packed `[size, ...modules]` matrix into the original UTF-8 bytes.
#[tracing::instrument(skip_all)]
pub fn decode(input: &[u8]) -> Option<Vec<u8>> {
    decode_with_erasures(input, &[])
}

/// Decode a packed `[size, ...modules]` matrix, treating the modules flagged in
/// `erasures` (a per-module mask, row-major, `1` = erased, length `size²`) as
/// **known** low-confidence reads. Any data codeword that draws even one of its
/// eight bits from an erased module is handed to the Reed-Solomon corrector as
/// an erasure, which repairs at twice the rate of a blind error — the payoff of
/// grey-level (sub-pixel) sampling in the scanner. An empty `erasures` slice is
/// exactly the blind [`decode`].
#[tracing::instrument(skip_all)]
pub fn decode_with_erasures(input: &[u8], erasures: &[u8]) -> Option<Vec<u8>> {
    if input.is_empty() {
        return None;
    }
    let size = input[0] as i32;
    if size < 21 || (size - 17) % 4 != 0 {
        return None;
    }
    let version = (size - 17) / 4;
    let expected = 1 + (size * size) as usize;
    if input.len() < expected {
        return None;
    }
    let use_erasures = erasures.len() == (size * size) as usize;

    let mut modules = vec![vec![false; size as usize]; size as usize];
    let mut erased_module = vec![vec![false; size as usize]; size as usize];
    let mut p = 1usize;
    for y in 0..size as usize {
        for x in 0..size as usize {
            modules[y][x] = input[p] != 0;
            if use_erasures {
                erased_module[y][x] = erasures[p - 1] != 0;
            }
            p += 1;
        }
    }

    let (ecc, mask) = read_format(&modules)?;
    let is_function = QrBuilder::function_map(version);

    // Undo the data mask over the non-function modules.
    for y in 0..size {
        for x in 0..size {
            if !is_function[y as usize][x as usize] && mask_condition(mask, x, y) {
                let cell = &mut modules[y as usize][x as usize];
                *cell = !*cell;
            }
        }
    }

    // Read the data modules back in the encoder's zig-zag order, carrying each
    // module's erasure flag alongside its bit.
    let raw_codewords = (num_raw_data_modules(version) / 8) as usize;
    let total_bits = raw_codewords * 8;
    let mut bits: Vec<u8> = Vec::with_capacity(total_bits);
    let mut bit_erased: Vec<bool> = Vec::with_capacity(total_bits);
    let mut right = size - 1;
    'outer: while right >= 1 {
        if right == 6 {
            right = 5;
        }
        for vert in 0..size {
            for index2 in 0..2 {
                let x = right - index2;
                let upward = ((right + 1) & 2) == 0;
                let y = if upward { size - 1 - vert } else { vert };
                if !is_function[y as usize][x as usize] {
                    if bits.len() >= total_bits {
                        break 'outer;
                    }
                    bits.push(if modules[y as usize][x as usize] {
                        1
                    } else {
                        0
                    });
                    bit_erased.push(erased_module[y as usize][x as usize]);
                }
            }
        }
        right -= 2;
    }
    if bits.len() < total_bits {
        return None;
    }

    let mut codewords = vec![0u8; raw_codewords];
    // A codeword byte is erased if any of the eight modules feeding it was a
    // low-confidence read.
    let mut codeword_erased = vec![false; raw_codewords];
    for (i, &bit) in bits.iter().enumerate() {
        codewords[i >> 3] |= bit << (7 - (i & 7));
        if bit_erased[i] {
            codeword_erased[i >> 3] = true;
        }
    }

    let data = deinterleave_and_correct(&codewords, &codeword_erased, version, ecc)?;
    parse_bytes(&data, version)
}

// Native-only: these tests use the separate encoder crate to build matrices.
// Excluded from the wasm target so `wasm-pack test` doesn't link the encoder's
// wasm-bindgen exports alongside the decoder's (which would collide).
#[cfg(all(test, not(target_arch = "wasm32")))]
mod tests {
    use super::{decode, decode_with_erasures};
    use mission_platform_qr_code_encode::encode;

    /// Encode `text` and strip the leading `version` byte, yielding the
    /// decoder's `[size, ...modules]` input shape.
    #[tracing::instrument(skip_all)]
    fn matrix_for(text: &str, ecc: i32) -> Vec<u8> {
        encode(text, ecc as u8).expect("payload fits")[1..].to_vec()
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn recovers_an_encoded_payload() {
        let matrix = matrix_for("DECODE ME", 1);
        let decoded = decode(&matrix).expect("should decode");
        assert_eq!(String::from_utf8(decoded).unwrap(), "DECODE ME");
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn corrects_errors_up_to_ecc_capacity() {
        // High ECC ('H' = 3) tolerates ~30% damage; flip interior modules and
        // confirm the decoder still recovers the payload.
        let text = "ERROR CORRECTION";
        let mut matrix = matrix_for(text, 3);
        let size = matrix[0] as usize;
        for y in (size / 2)..(size / 2 + 4) {
            for x in (size / 2)..(size / 2 + 3) {
                matrix[1 + y * size + x] ^= 1;
            }
        }
        let decoded = decode(&matrix).expect("should decode despite damage");
        assert_eq!(String::from_utf8(decoded).unwrap(), text);
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn erasures_recover_damage_a_blind_decode_cannot() {
        // Damage a strip so wide that blind error correction is overwhelmed,
        // then mark exactly those modules as erasures. Because an erasure costs
        // half an error, flagging the damaged region lets the same symbol decode
        // where the blind path fails — the grey-sampling payoff.
        let text = "ERASURE RECOVERY";
        let clean = matrix_for(text, 3);
        let size = clean[0] as usize;

        let mut damaged = clean.clone();
        let mut mask = vec![0u8; size * size];
        // A block of interior modules, larger than blind ECC can repair.
        for y in (size / 3)..(size / 3 + 7) {
            for x in 1..(size - 1) {
                damaged[1 + y * size + x] ^= 1;
                mask[y * size + x] = 1;
            }
        }

        // Blind decode is overwhelmed by this much damage.
        assert!(
            decode(&damaged).is_none(),
            "blind decode should fail on damage beyond its capacity"
        );
        // With the damage marked as erasures, the payload is recovered.
        let decoded = decode_with_erasures(&damaged, &mask).expect("erasure decode should recover");
        assert_eq!(String::from_utf8(decoded).unwrap(), text);
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn rejects_a_garbage_matrix_without_panicking() {
        let size = 21usize;
        let mut matrix = vec![0u8; 1 + size * size];
        matrix[0] = size as u8;
        for (i, cell) in matrix.iter_mut().enumerate().skip(1) {
            *cell = ((i * 2_654_435_761) >> 13 & 1) as u8;
        }
        // Must return `None` (or a value) rather than panicking.
        let _ = decode(&matrix);
    }
}
