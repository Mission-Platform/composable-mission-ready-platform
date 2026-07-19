//! Aztec Code decoder (compact symbols, 1–4 layers) — the inverse of the
//! `mission-platform-matrix-code-encode` Aztec encoder.
//!
//! The input is the same packed `[width, height, ...modules]` buffer the encoder
//! emits (row-major, `1` = dark, `width == height`), so no image processing is
//! needed. Decoding reverses the encoder pipeline: read the mode message from
//! the ring around the bullseye (recovering the layer count and data-word
//! count), read the data codewords out of the layer spiral, Reed-Solomon-correct
//! them over the layer's GF(2^m) field, un-stuff the bits, and reverse the
//! Binary-Shift high-level encoding back into the payload bytes.

use mission_platform_matrix_code_common::galois::Field;

/// The Chebyshev radius of the compact core (mirrors the encoder's constant).
const CORE_RADIUS: usize = 5;

/// The Binary-Shift escape code in the Upper table (5 bits).
const BINARY_SHIFT: u32 = 31;

/// Total data + check bits in a compact symbol of `layers` layers.
fn total_bits_in_layers(layers: usize) -> usize {
    (88 + 16 * layers) * layers
}

/// Codeword size (bits) for a compact symbol of `layers` layers.
fn word_size(layers: usize) -> usize {
    if layers <= 2 {
        6
    } else {
        8
    }
}

/// The Reed-Solomon field for a given codeword size (mirrors the encoder).
fn field_for(word_size: usize) -> Field {
    match word_size {
        4 => Field::new(0x13, 16),
        6 => Field::new(0x43, 64),
        _ => Field::new(0x12D, 256),
    }
}

/// Decode a packed compact Aztec symbol back into its bytes, or `None` when the
/// buffer is malformed, the symbol is not a supported compact size, or the
/// payload cannot be recovered.
#[tracing::instrument(skip_all)]
pub fn decode(matrix: &[u8]) -> Option<Vec<u8>> {
    let width = *matrix.first()? as usize;
    let height = *matrix.get(1)? as usize;
    if width != height || matrix.len() != 2 + width * height {
        return None;
    }
    let size = width;
    // Compact sizes are 15, 19, 23, 27 → 1..=4 layers.
    if size < 15 || (size - 11) % 4 != 0 {
        return None;
    }
    let size_layers = (size - 11) / 4;
    if !(1..=4).contains(&size_layers) {
        return None;
    }
    let modules = &matrix[2..];
    let get = |x: usize, y: usize| modules[y * size + x] != 0;

    // Recover the layer count and data-word count from the mode message.
    let (layers, data_words) = read_mode_message(size, &get)?;
    if layers != size_layers {
        return None;
    }

    let ws = word_size(layers);
    let total_bits = total_bits_in_layers(layers);
    let total_words = total_bits / ws;
    if data_words == 0 || data_words > total_words {
        return None;
    }

    // Read the data spiral into a bit stream, then group into codewords.
    let message = read_data(size, layers, &get);
    let start_pad = total_bits % ws;
    let mut words: Vec<u16> = Vec::with_capacity(total_words);
    for index in 0..total_words {
        let mut value = 0u16;
        for offset in 0..ws {
            value = (value << 1) | u16::from(message[start_pad + index * ws + offset]);
        }
        words.push(value);
    }

    // Reed-Solomon-correct, keep the data words, and reverse the encodation.
    let field = field_for(ws);
    let ecc = total_words - data_words;
    if !field.correct(&mut words, ecc) {
        return None;
    }
    words.truncate(data_words);

    let stuffed = words_to_bits(&words, ws);
    let bits = unstuff_bits(&stuffed, ws);
    reverse_high_level(&bits)
}

/// Read the 28-bit compact mode message off the distance-5 ring, Reed-Solomon
/// correct it over GF(16), and return `(layers, data_words)`.
#[tracing::instrument(skip_all)]
fn read_mode_message(size: usize, get: &impl Fn(usize, usize) -> bool) -> Option<(usize, usize)> {
    let center = size / 2;
    let r = CORE_RADIUS;
    let mut mode = [false; 28];
    for i in 0..7 {
        let offset = center - 3 + i;
        mode[i] = get(offset, center - r); // top row
        mode[i + 7] = get(center + r, offset); // right column
        mode[20 - i] = get(offset, center + r); // bottom row
        mode[27 - i] = get(center - r, offset); // left column
    }

    // 7 four-bit words: 2 data + 5 check over GF(16).
    let mut words: Vec<u16> = (0..7)
        .map(|index| {
            let mut value = 0u16;
            for offset in 0..4 {
                value = (value << 1) | u16::from(mode[index * 4 + offset]);
            }
            value
        })
        .collect();
    let field = field_for(4);
    if !field.correct(&mut words, 5) {
        return None;
    }

    // The two data words hold 8 bits: 2 (layers - 1) + 6 (data_words - 1).
    let data_bits = (words[0] << 4) | words[1];
    let layers = ((data_bits >> 6) & 0x3) as usize + 1;
    let data_words = (data_bits & 0x3F) as usize + 1;
    Some((layers, data_words))
}

/// Read the data-layer spiral into a `total_bits` bit stream — the inverse of
/// the encoder's `draw_data`, visiting the same layers/sides/dominoes.
#[tracing::instrument(skip_all)]
fn read_data(size: usize, layers: usize, get: &impl Fn(usize, usize) -> bool) -> Vec<bool> {
    let total_bits = total_bits_in_layers(layers);
    let mut message = vec![false; total_bits];
    let mut row_offset = 0usize;
    for i in 0..layers {
        let row_size = (layers - i) * 4 + 9;
        for j in 0..row_size {
            let column_offset = j * 2;
            for k in 0..2 {
                message[row_offset + column_offset + k] = get(i * 2 + k, i * 2 + j);
                message[row_offset + row_size * 2 + column_offset + k] =
                    get(i * 2 + j, size - 1 - i * 2 - k);
                message[row_offset + row_size * 4 + column_offset + k] =
                    get(size - 1 - i * 2 - k, size - 1 - i * 2 - j);
                message[row_offset + row_size * 6 + column_offset + k] =
                    get(size - 1 - i * 2 - j, i * 2 + k);
            }
        }
        row_offset += row_size * 8;
    }
    message
}

/// Expand codewords back into their bit stream (most-significant first).
#[tracing::instrument(skip_all)]
fn words_to_bits(words: &[u16], word_size: usize) -> Vec<bool> {
    let mut bits = Vec::with_capacity(words.len() * word_size);
    for &word in words {
        for shift in (0..word_size).rev() {
            bits.push((word >> shift) & 1 == 1);
        }
    }
    bits
}

/// Reverse the bit-stuffing: each stored `word_size`-bit word whose leading
/// `word_size - 1` bits are all-zero (or all-one) carries a single stuffed
/// complementary bit that is dropped. The inverse of the encoder's `stuff_bits`.
#[tracing::instrument(skip_all)]
fn unstuff_bits(stuffed: &[bool], word_size: usize) -> Vec<bool> {
    let mut out = Vec::new();
    let ones_prefix = (1u32 << (word_size - 1)) - 1;
    let mut index = 0;
    while index + word_size <= stuffed.len() {
        let mut word = 0u32;
        for offset in 0..word_size {
            word = (word << 1) | u32::from(stuffed[index + offset]);
        }
        let prefix = word >> 1;
        if prefix == 0 {
            out.extend(std::iter::repeat(false).take(word_size - 1));
        } else if prefix == ones_prefix {
            out.extend(std::iter::repeat(true).take(word_size - 1));
        } else {
            for offset in 0..word_size {
                out.push(stuffed[index + offset]);
            }
        }
        index += word_size;
    }
    out
}

/// Read `count` bits from `bits` starting at `*pos` (MSB first), advancing
/// `*pos`; `None` if the stream is exhausted.
#[tracing::instrument(skip_all)]
fn read_bits(bits: &[bool], pos: &mut usize, count: usize) -> Option<u32> {
    if *pos + count > bits.len() {
        return None;
    }
    let mut value = 0u32;
    for _ in 0..count {
        value = (value << 1) | u32::from(bits[*pos]);
        *pos += 1;
    }
    Some(value)
}

/// Reverse the Binary-Shift high-level encoding: a 5-bit Binary-Shift escape, a
/// length field (5-bit count, or `0` then an 11-bit count), then `count` bytes.
#[tracing::instrument(skip_all)]
fn reverse_high_level(bits: &[bool]) -> Option<Vec<u8>> {
    let mut pos = 0usize;
    if read_bits(bits, &mut pos, 5)? != BINARY_SHIFT {
        return None;
    }
    let short = read_bits(bits, &mut pos, 5)?;
    let count = if short != 0 {
        short as usize
    } else {
        read_bits(bits, &mut pos, 11)? as usize
    };
    let mut out = Vec::with_capacity(count);
    for _ in 0..count {
        out.push(read_bits(bits, &mut pos, 8)? as u8);
    }
    Some(out)
}

// Native-only round-trip tests (they link the encoder crate to build symbols).
#[cfg(all(test, not(target_arch = "wasm32")))]
mod tests {
    use super::decode;
    use mission_platform_matrix_code_encode::encode_modules;

    fn symbol_for(text: &str) -> Vec<u8> {
        encode_modules("aztec", text).expect("payload fits a compact symbol")
    }

    #[test]
    fn round_trips_short_payloads() {
        for text in ["A", "HELLO", "12345", "Order #42!", "https://mission-platform.dev"] {
            let decoded = decode(&symbol_for(text)).expect("should decode");
            assert_eq!(String::from_utf8(decoded).unwrap(), text, "round-trip {text:?}");
        }
    }

    #[test]
    fn round_trips_extended_bytes() {
        let text = "café — ☕";
        let decoded = decode(&symbol_for(text)).expect("should decode");
        assert_eq!(String::from_utf8(decoded).unwrap(), text);
    }

    #[test]
    fn round_trips_across_layer_sizes() {
        for length in [1usize, 8, 20, 35, 45] {
            let text = "X".repeat(length);
            let matrix = symbol_for(&text);
            let decoded = decode(&matrix).expect("should decode");
            assert_eq!(String::from_utf8(decoded).unwrap(), text, "length {length}");
        }
    }

    #[test]
    fn corrects_a_few_flipped_modules() {
        let text = "RESILIENT";
        let mut matrix = symbol_for(text);
        let size = matrix[0] as usize;
        // Flip a handful of interior modules; Reed-Solomon should recover them.
        matrix[2 + 1 * size + 1] ^= 1;
        matrix[2 + 1 * size + 2] ^= 1;
        let decoded = decode(&matrix).expect("should decode despite damage");
        assert_eq!(String::from_utf8(decoded).unwrap(), text);
    }

    #[test]
    fn rejects_malformed_buffers() {
        assert!(decode(&[]).is_none(), "empty");
        assert!(decode(&[15, 0, 1]).is_none(), "not square / wrong length");
        // A supported size but all-light modules cannot be corrected.
        let size = 15usize;
        let mut matrix = vec![0u8; 2 + size * size];
        matrix[0] = size as u8;
        matrix[1] = size as u8;
        assert!(decode(&matrix).is_none(), "uncorrectable");
    }
}
