//! Byte-mode QR encode entry point. Ported from the AssemblyScript reference.

use mission_platform_qr_code_common::builder::QrBuilder;
use mission_platform_qr_code_common::tables::{
    byte_mode_char_count_bits, num_data_codewords, MAX_VERSION, MIN_VERSION,
};

#[tracing::instrument(skip_all)]
fn append_bits(value: i32, length: i32, bits: &mut Vec<i32>) {
    for index in (0..length).rev() {
        bits.push((value >> index) & 1);
    }
}

/// Encode `bytes` at the given error-correction ordinal (`0` = L … `3` = H).
///
/// Returns a packed buffer `[version, size, ...modules]` (row-major, `1` = dark),
/// or `None` when the payload is too long to fit the largest version.
#[tracing::instrument(skip_all)]
pub fn encode(bytes: &[u8], ecc: i32) -> Option<Vec<u8>> {
    // Smallest version that fits a single byte-mode segment.
    let mut version = MIN_VERSION;
    let mut data_capacity_bits = 0;
    let mut fits = false;
    while version <= MAX_VERSION {
        data_capacity_bits = num_data_codewords(version, ecc) * 8;
        let used_bits = 4 + byte_mode_char_count_bits(version) + bytes.len() as i32 * 8;
        if used_bits <= data_capacity_bits {
            fits = true;
            break;
        }
        version += 1;
    }
    if !fits {
        return None;
    }

    let mut bits: Vec<i32> = Vec::new();
    append_bits(0x4, 4, &mut bits); // Byte-mode indicator.
    append_bits(
        bytes.len() as i32,
        byte_mode_char_count_bits(version),
        &mut bits,
    );
    for &byte in bytes {
        append_bits(byte as i32, 8, &mut bits);
    }

    // Terminator + bit/byte padding.
    let terminator = data_capacity_bits - bits.len() as i32;
    append_bits(0, terminator.min(4), &mut bits);
    append_bits(0, (8 - (bits.len() as i32 % 8)) % 8, &mut bits);

    // Pad bytes alternate 0xEC / 0x11.
    let mut pad = 0xeci32;
    while (bits.len() as i32) < data_capacity_bits {
        append_bits(pad, 8, &mut bits);
        pad ^= 0xec ^ 0x11;
    }

    let mut data_codewords = vec![0i32; bits.len() >> 3];
    for (index, &bit) in bits.iter().enumerate() {
        data_codewords[index >> 3] |= bit << (7 - (index & 7));
    }

    let mut builder = QrBuilder::new(version, ecc);
    builder.build(&data_codewords);

    let size = builder.size;
    let mut out = Vec::<u8>::with_capacity(2 + (size * size) as usize);
    out.push(version as u8);
    out.push(size as u8);
    for y in 0..size as usize {
        for x in 0..size as usize {
            out.push(if builder.modules[y][x] { 1 } else { 0 });
        }
    }
    Some(out)
}

#[cfg(test)]
mod tests {
    use super::encode;

    #[test]
    #[tracing::instrument(skip_all)]
    fn packs_version_and_size_header() {
        // The packed buffer is `[version, size, ...modules]` of `size * size`.
        let packed = encode(b"HELLO", 1).expect("payload fits");
        let version = packed[0] as usize;
        let size = packed[1] as usize;
        assert!((1..=40).contains(&version), "version in range");
        assert_eq!(size, 17 + 4 * version, "size follows version formula");
        assert_eq!(packed.len(), 2 + size * size, "module count matches size^2");
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn version_and_size_grow_with_payload() {
        let small = encode(b"short", 1).expect("fits");
        let large = encode(&vec![b'x'; 400], 1).expect("fits");
        assert!(large[0] > small[0], "version grows");
        assert!(large[1] > small[1], "size grows");
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn rejects_payload_larger_than_the_biggest_version() {
        assert!(encode(&vec![b'x'; 8000], 0).is_none());
    }
}
