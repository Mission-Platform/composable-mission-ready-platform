//! Micro QR Code encode entry point (ISO/IEC 18004).
//!
//! Selects the smallest Micro QR version (M1–M4) and error-correction level that
//! fits the payload at or above the requested level, builds the multi-mode
//! bit stream with optimal segmentation, appends Reed-Solomon error correction,
//! and hands the interleaved bit stream to the shared [`MicroBuilder`].

use mission_platform_qr_code_common::gf::{compute_divisor, compute_remainder};
use mission_platform_qr_code_common::micro_qr::{MicroBuilder, M1, M3, SIZES};

use crate::segment::{
    append_data_bits, optimal_segments, push_bits, total_bits, Mode, Segment, MODES,
};

/// A candidate Micro QR symbol: a version + error-correction level pairing with
/// its capacity, block sizes and the modes it may use.
struct Variant {
    /// Version index (`0` = M1 … `3` = M4).
    version: usize,
    /// Format-information symbol number (encodes version + level).
    symbol_number: usize,
    /// Error-correction rank used for level selection (`0` = L/detection … `2` = Q).
    ecc_rank: u8,
    /// Total codewords in the (single) block.
    total_codewords: usize,
    /// Data codewords in the block.
    data_codewords: usize,
    /// Data capacity in bits.
    capacity_bits: usize,
    /// Modes permitted by this version.
    allowed: &'static [Mode],
}

const NUM: &[Mode] = &[Mode::Numeric];
const NUM_ALNUM: &[Mode] = &[Mode::Numeric, Mode::Alphanumeric];

/// Candidate symbols ordered by symbol size ascending, then error-correction
/// rank ascending — so the first fitting variant is the smallest symbol at the
/// lowest acceptable level (i.e. the largest capacity for that size).
const VARIANTS: &[Variant] = &[
    // M1 offers error *detection* only; treated as rank 0 for selection.
    Variant {
        version: 0,
        symbol_number: 0,
        ecc_rank: 0,
        total_codewords: 5,
        data_codewords: 3,
        capacity_bits: 20,
        allowed: NUM,
    },
    // M2
    Variant {
        version: 1,
        symbol_number: 1,
        ecc_rank: 0,
        total_codewords: 10,
        data_codewords: 5,
        capacity_bits: 40,
        allowed: NUM_ALNUM,
    },
    Variant {
        version: 1,
        symbol_number: 2,
        ecc_rank: 1,
        total_codewords: 10,
        data_codewords: 4,
        capacity_bits: 32,
        allowed: NUM_ALNUM,
    },
    // M3
    Variant {
        version: 2,
        symbol_number: 3,
        ecc_rank: 0,
        total_codewords: 17,
        data_codewords: 11,
        capacity_bits: 84,
        allowed: &MODES,
    },
    Variant {
        version: 2,
        symbol_number: 4,
        ecc_rank: 1,
        total_codewords: 17,
        data_codewords: 9,
        capacity_bits: 68,
        allowed: &MODES,
    },
    // M4
    Variant {
        version: 3,
        symbol_number: 5,
        ecc_rank: 0,
        total_codewords: 24,
        data_codewords: 16,
        capacity_bits: 128,
        allowed: &MODES,
    },
    Variant {
        version: 3,
        symbol_number: 6,
        ecc_rank: 1,
        total_codewords: 24,
        data_codewords: 14,
        capacity_bits: 112,
        allowed: &MODES,
    },
    Variant {
        version: 3,
        symbol_number: 7,
        ecc_rank: 2,
        total_codewords: 24,
        data_codewords: 10,
        capacity_bits: 80,
        allowed: &MODES,
    },
];

/// Bits in the mode indicator for a Micro QR version (M1 has none).
#[tracing::instrument(skip_all)]
fn mode_indicator_bits(version: usize) -> u32 {
    version as u32
}

/// The Micro QR mode indicator value (numeric `0`, alphanumeric `1`, byte `2`).
#[tracing::instrument(skip_all)]
fn mode_value(mode: Mode) -> u32 {
    match mode {
        Mode::Numeric => 0,
        Mode::Alphanumeric => 1,
        Mode::Byte => 2,
    }
}

/// Character-count-indicator length for a version + mode (ISO/IEC 18004 Table 3).
#[tracing::instrument(skip_all)]
fn char_count_bits(version: usize, mode: Mode) -> u32 {
    match mode {
        Mode::Numeric => [3, 4, 5, 6][version],
        Mode::Alphanumeric => [0, 3, 4, 5][version],
        Mode::Byte => [0, 0, 4, 5][version],
    }
}

/// Terminator length for a Micro QR version (M1 `3` … M4 `9`).
#[tracing::instrument(skip_all)]
fn terminator_bits(version: usize) -> usize {
    2 * version + 3
}

/// Per-segment header size for the segmentation optimiser.
#[tracing::instrument(skip_all)]
fn header_bits(version: usize, mode: Mode) -> u32 {
    mode_indicator_bits(version) + char_count_bits(version, mode)
}

/// Encode `bytes` into a Micro QR Code at the given error-correction ordinal
/// (`0` = L, `1` = M, `2` = Q; `3`/H is unsupported by Micro QR).
///
/// Returns a packed buffer `[width, height, ...modules]` (row-major, `1` = dark),
/// or `None` when the payload does not fit any Micro QR version at the requested
/// level.
#[tracing::instrument(skip_all)]
pub fn encode(bytes: &[u8], ecc: i32) -> Option<Vec<u8>> {
    let requested_rank = ecc as u8;
    for variant in VARIANTS {
        if variant.ecc_rank < requested_rank {
            continue;
        }
        let segments =
            match optimal_segments(bytes, variant.allowed, |m| header_bits(variant.version, m)) {
                Some(segments) => segments,
                None => continue,
            };
        if total_bits(&segments, |m| header_bits(variant.version, m)) as usize
            > variant.capacity_bits
        {
            continue;
        }
        return Some(build(variant, bytes, &segments));
    }
    None
}

/// Assemble the final bit stream for a fitting `variant` and draw the symbol.
#[tracing::instrument(skip_all)]
fn build(variant: &Variant, bytes: &[u8], segments: &[Segment]) -> Vec<u8> {
    let version = variant.version;

    // 1. Data bit stream: per-segment mode indicator + count + payload bits.
    let mut bits: Vec<u8> = Vec::new();
    for seg in segments {
        push_bits(
            mode_value(seg.mode),
            mode_indicator_bits(version),
            &mut bits,
        );
        push_bits(
            seg.len as u32,
            char_count_bits(version, seg.mode),
            &mut bits,
        );
        append_data_bits(seg.mode, &bytes[seg.start..seg.start + seg.len], &mut bits);
    }

    // 2. Terminator (as many of the version's terminator bits as still fit).
    let cap = variant.capacity_bits;
    let terminator = terminator_bits(version).min(cap - bits.len());
    bits.resize(bits.len() + terminator, 0);

    // 3. Pad to the codeword boundary and fill remaining capacity.
    let is_short = version == M1 || version == M3;
    if !is_short {
        while !bits.len().is_multiple_of(8) {
            bits.push(0);
        }
        // Alternating pad codewords 0xEC / 0x11.
        let mut pad = 0xecu32;
        while bits.len() < cap {
            push_bits(pad, 8, &mut bits);
            pad ^= 0xec ^ 0x11;
        }
    } else {
        // M1 / M3: the final data codeword is 4 bits, so simply pad with zeros.
        while bits.len() < cap {
            bits.push(0);
        }
    }

    // 4. Group the data bits into codewords (the M1/M3 tail nibble is placed in
    //    the high nibble of its byte, matching the RS input the spec expects).
    let mut data_codewords: Vec<i32> = Vec::with_capacity(variant.data_codewords);
    let mut i = 0;
    while i < bits.len() {
        let remaining = bits.len() - i;
        if remaining >= 8 {
            let mut value = 0i32;
            for b in 0..8 {
                value = (value << 1) | bits[i + b] as i32;
            }
            data_codewords.push(value);
            i += 8;
        } else {
            // Final 4-bit nibble (M1/M3): high nibble = data, low nibble = 0.
            let mut value = 0i32;
            for b in 0..4 {
                value = (value << 1) | bits[i + b] as i32;
            }
            data_codewords.push(value << 4);
            i += 4;
        }
    }

    // 5. Reed-Solomon error-correction codewords over the single block.
    let ecc_len = variant.total_codewords - variant.data_codewords;
    let divisor = compute_divisor(ecc_len);
    let ecc_codewords = compute_remainder(&data_codewords, &divisor);

    // 6. Final message bits: data codewords (M1/M3 tail as 4 bits) then ECC.
    let mut final_bits: Vec<u8> = Vec::new();
    for (idx, &cw) in data_codewords.iter().enumerate() {
        if is_short && idx == data_codewords.len() - 1 {
            push_bits((cw >> 4) as u32, 4, &mut final_bits);
        } else {
            push_bits(cw as u32, 8, &mut final_bits);
        }
    }
    for &cw in &ecc_codewords {
        push_bits(cw as u32, 8, &mut final_bits);
    }

    // 7. Draw the matrix.
    let modules = MicroBuilder::new(version).build(version, variant.symbol_number, &final_bits);

    let size = SIZES[version] as u8;
    let mut out = Vec::with_capacity(2 + (size as usize) * (size as usize));
    out.push(size); // width
    out.push(size); // height
    for row in &modules {
        for &m in row {
            out.push(u8::from(m));
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tiny_numeric_uses_m1() {
        let packed = encode(b"01234", 0).expect("fits M1");
        assert_eq!(packed[0], 11, "M1 is 11x11");
        assert_eq!(packed[1], 11);
        assert_eq!(packed.len(), 2 + 11 * 11);
    }

    #[test]
    fn version_grows_with_payload() {
        let small = encode(b"1", 0).expect("fits");
        let large = encode(b"HELLO WORLD", 0).expect("fits");
        assert!(large[0] > small[0], "larger payload needs a bigger symbol");
    }

    #[test]
    fn non_numeric_skips_m1() {
        // Letters cannot go in M1 (numeric only) -> at least M2 (13x13).
        let packed = encode(b"ABC", 0).expect("fits");
        assert!(packed[0] >= 13);
    }

    #[test]
    fn rejects_overflow() {
        // Far more than the 35-numeric M4 capacity.
        assert!(encode(&[b'1'; 60], 0).is_none());
    }

    #[test]
    fn high_ecc_not_supported() {
        // Micro QR has no H level.
        assert!(encode(b"1", 3).is_none());
    }

    #[test]
    fn all_modules_are_binary() {
        let packed = encode(b"HELLO123", 0).expect("fits");
        assert!(packed[2..].iter().all(|&m| m == 0 || m == 1));
    }
}
