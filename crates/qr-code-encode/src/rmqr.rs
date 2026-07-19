//! Rectangular Micro QR (rMQR) encode entry point (ISO/IEC 23941).
//!
//! Picks the smallest rMQR symbol that fits the payload at the requested error
//! level (M or H), builds the multi-mode bit stream, splits it into
//! Reed-Solomon blocks, interleaves the final codeword sequence, computes the
//! BCH format information and draws the symbol with the shared [`RmqrBuilder`].

use mission_platform_qr_code_common::gf::{compute_divisor, compute_remainder};
use mission_platform_qr_code_common::rmqr::RmqrBuilder;

use crate::rmqr_versions::{Block, RmqrVersion, VERSIONS};
use crate::segment::{
    append_data_bits, optimal_segments, push_bits, total_bits, Mode, Segment, MODES,
};

/// The character-count-indicator length for `mode` in `version`.
#[tracing::instrument(skip_all)]
fn char_count_bits(version: &RmqrVersion, mode: Mode) -> u32 {
    let idx = match mode {
        Mode::Numeric => 0,
        Mode::Alphanumeric => 1,
        Mode::Byte => 2,
    };
    version.char_count_bits[idx]
}

/// The rMQR mode indicator value (numeric `001`, alphanumeric `010`, byte `011`).
#[tracing::instrument(skip_all)]
fn mode_value(mode: Mode) -> u32 {
    match mode {
        Mode::Numeric => 0b001,
        Mode::Alphanumeric => 0b010,
        Mode::Byte => 0b011,
    }
}

/// Per-segment header size (3-bit mode indicator + character-count indicator).
#[tracing::instrument(skip_all)]
fn header_bits(version: &RmqrVersion, mode: Mode) -> u32 {
    3 + char_count_bits(version, mode)
}

/// The (18-bit) format information for a version + error level.
///
/// Six data bits (5-bit version indicator, plus bit 5 set for level H) are
/// protected by a (18, 6) BCH code (ISO/IEC 23941 §7.9).
#[tracing::instrument(skip_all)]
fn format_information(version: &RmqrVersion, high: bool) -> u32 {
    let mut data = version.version_indicator;
    if high {
        data |= 1 << 5;
    }
    (data << 12) | compute_bch(data)
}

/// The BCH(18, 6) remainder for the 6-bit format data.
#[tracing::instrument(skip_all)]
fn compute_bch(data: u32) -> u32 {
    let g: u32 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | 1;
    let mut d = data << 12;
    while bit_length(d) >= 13 {
        d ^= g << (bit_length(d) - 13);
    }
    d
}

/// Number of significant bits in `n` (`0` for `n == 0`).
#[tracing::instrument(skip_all)]
fn bit_length(n: u32) -> u32 {
    32 - n.leading_zeros()
}

/// Encode `bytes` into an rMQR Code at the given error-correction ordinal.
///
/// rMQR supports only levels M and H, so `0`/`1` (L/M) map to M and `2`/`3`
/// (Q/H) map to H. Returns a packed buffer `[width, height, ...modules]`
/// (row-major, `1` = dark), or `None` when the payload fits no rMQR version.
#[tracing::instrument(skip_all)]
pub fn encode(bytes: &[u8], ecc: i32) -> Option<Vec<u8>> {
    let high = ecc >= 2;

    // Choose the fitting version with the smallest area (ties: smaller width).
    let mut best: Option<(&RmqrVersion, Vec<Segment>)> = None;
    for version in &VERSIONS {
        let capacity = if high {
            version.data_bits_h
        } else {
            version.data_bits_m
        };
        let Some(segments) = optimal_segments(bytes, &MODES, |m| header_bits(version, m)) else {
            continue;
        };
        if total_bits(&segments, |m| header_bits(version, m)) as usize > capacity {
            continue;
        }
        let area = version.width * version.height;
        let better = match &best {
            None => true,
            Some((cur, _)) => {
                let cur_area = cur.width * cur.height;
                area < cur_area || (area == cur_area && version.width < cur.width)
            }
        };
        if better {
            best = Some((version, segments));
        }
    }

    let (version, segments) = best?;
    Some(build(version, high, bytes, &segments))
}

/// Assemble the final bit stream for a fitting version and draw the symbol.
#[tracing::instrument(skip_all)]
fn build(version: &RmqrVersion, high: bool, bytes: &[u8], segments: &[Segment]) -> Vec<u8> {
    let blocks_def = if high {
        version.blocks_h
    } else {
        version.blocks_m
    };
    let capacity = if high {
        version.data_bits_h
    } else {
        version.data_bits_m
    };
    debug_assert_eq!(
        blocks_def.iter().map(|b| b.num * b.total).sum::<usize>(),
        version.total_codewords,
        "block totals must sum to the version's codeword count",
    );

    // 1. Data bit stream + optional 3-bit terminator.
    let mut bits: Vec<u8> = Vec::new();
    for seg in segments {
        push_bits(mode_value(seg.mode), 3, &mut bits);
        push_bits(
            seg.len as u32,
            char_count_bits(version, seg.mode),
            &mut bits,
        );
        append_data_bits(seg.mode, &bytes[seg.start..seg.start + seg.len], &mut bits);
    }
    if bits.len() + 3 <= capacity {
        bits.extend([0u8; 3]);
    }

    // 2. Pad the final partial codeword with zero bits, then convert to bytes.
    while !bits.len().is_multiple_of(8) {
        bits.push(0);
    }
    let mut data_codewords: Vec<i32> = bits
        .chunks(8)
        .map(|c| c.iter().fold(0i32, |acc, &b| (acc << 1) | b as i32))
        .collect();

    // 3. Pad with the alternating pad codewords until the data capacity is met.
    let data_cw: usize = blocks_def.iter().map(|b| b.num * b.data).sum();
    let mut pad = 0xecu8;
    while data_codewords.len() < data_cw {
        data_codewords.push(pad as i32);
        pad ^= 0xec ^ 0x11;
    }

    // 4. Split into Reed-Solomon blocks and compute the error-correction bytes.
    let mut data_blocks: Vec<Vec<i32>> = Vec::new();
    let mut ecc_blocks: Vec<Vec<i32>> = Vec::new();
    let mut idx = 0usize;
    for &Block { num, total, data } in blocks_def {
        let ecc_len = total - data;
        let divisor = compute_divisor(ecc_len);
        for _ in 0..num {
            let block = data_codewords[idx..idx + data].to_vec();
            idx += data;
            let ecc = compute_remainder(&block, &divisor);
            data_blocks.push(block);
            ecc_blocks.push(ecc);
        }
    }

    // 5. Interleave: data codewords column-wise, then ECC codewords column-wise.
    let mut final_codewords: Vec<i32> = Vec::new();
    let max_data = data_blocks.iter().map(Vec::len).max().unwrap_or(0);
    for i in 0..max_data {
        for block in &data_blocks {
            if let Some(&cw) = block.get(i) {
                final_codewords.push(cw);
            }
        }
    }
    let max_ecc = ecc_blocks.iter().map(Vec::len).max().unwrap_or(0);
    for i in 0..max_ecc {
        for block in &ecc_blocks {
            if let Some(&cw) = block.get(i) {
                final_codewords.push(cw);
            }
        }
    }

    // 6. Final message as a bit stream.
    let mut final_bits: Vec<u8> = Vec::with_capacity(final_codewords.len() * 8);
    for &cw in &final_codewords {
        push_bits(cw as u32, 8, &mut final_bits);
    }

    // 7. Draw the matrix: function patterns, format info, then data + mask.
    let mut builder = RmqrBuilder::new(version.width, version.height);
    builder.put_format_information(format_information(version, high));
    let modules = builder.put_data(&final_bits, version.remainder_bits);

    let mut out = Vec::with_capacity(2 + version.width * version.height);
    out.push(version.width as u8);
    out.push(version.height as u8);
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
    fn small_payload_fits_smallest_symbol() {
        let packed = encode(b"123456", 1).expect("fits");
        let (w, h) = (packed[0] as usize, packed[1] as usize);
        assert_eq!(packed.len(), 2 + w * h);
        // Smallest rMQR is R7x43 (43 wide, 7 tall) or R11x27 for balanced choice.
        assert!(h <= 11 && w <= 43, "small payload picks a compact symbol");
    }

    #[test]
    fn larger_payload_needs_larger_symbol() {
        let small = encode(b"1", 1).expect("fits");
        let large = encode(
            b"https://example.com/some/reasonably/long/path?with=query",
            1,
        )
        .expect("fits");
        let small_area = small[0] as usize * small[1] as usize;
        let large_area = large[0] as usize * large[1] as usize;
        assert!(large_area > small_area);
    }

    #[test]
    fn high_ecc_reduces_capacity() {
        // A payload that fits at M in a given size may need a bigger H symbol.
        let m = encode(b"HELLO WORLD 123456789", 1).expect("fits M");
        let h = encode(b"HELLO WORLD 123456789", 3).expect("fits H");
        let m_area = m[0] as usize * m[1] as usize;
        let h_area = h[0] as usize * h[1] as usize;
        assert!(h_area >= m_area);
    }

    #[test]
    fn rejects_overflow() {
        assert!(encode(&vec![b'x'; 400], 3).is_none());
    }

    #[test]
    fn all_modules_are_binary() {
        let packed = encode(b"rMQR test 123", 1).expect("fits");
        assert!(packed[2..].iter().all(|&m| m == 0 || m == 1));
    }

    #[test]
    fn bch_is_a_known_value() {
        // Version indicator 0 (R7x43) at level M -> data bits all zero -> BCH 0.
        assert_eq!(compute_bch(0), 0);
        // A non-trivial data value produces a 12-bit remainder.
        assert!(compute_bch(0b100001) < (1 << 12));
    }
}
