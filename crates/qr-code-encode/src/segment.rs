//! Shared multi-mode segmentation for the compact QR encoders.
//!
//! Both Micro QR and rMQR support numeric, alphanumeric and byte encoding modes
//! and gain capacity by splitting a payload into runs of the cheapest mode. This
//! module implements the exact-bit-cost dynamic program that finds the optimal
//! segmentation (ISO/IEC 18004 Annex J), parameterised by the per-mode header
//! size so it can serve either symbology.
//!
//! Kanji mode is intentionally not emitted: the public entry points take a UTF-8
//! string, and byte mode already covers every non-ASCII character losslessly.

/// A data encoding mode.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Mode {
    /// Digits `0`-`9`, 10 bits per 3 characters.
    Numeric,
    /// The 45-character alphanumeric set, 11 bits per 2 characters.
    Alphanumeric,
    /// Arbitrary bytes, 8 bits per byte.
    Byte,
}

/// The three modes emitted by the compact encoders, in canonical order.
pub const MODES: [Mode; 3] = [Mode::Numeric, Mode::Alphanumeric, Mode::Byte];

/// A contiguous run of the payload encoded in a single mode.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Segment {
    /// The mode this run is encoded in.
    pub mode: Mode,
    /// Start offset into the payload bytes.
    pub start: usize,
    /// Length of the run in bytes (= characters, since runs are ASCII unless byte mode).
    pub len: usize,
}

/// The alphanumeric character set (index = value used in encoding).
const ALNUM: &[u8; 45] = b"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";

/// The alphanumeric value of `b`, or `None` if it is not in the set.
#[tracing::instrument(skip_all)]
pub fn alnum_value(b: u8) -> Option<u32> {
    ALNUM.iter().position(|&c| c == b).map(|p| p as u32)
}

/// Number of data bits (excluding header) for a `len`-character run in `mode`.
#[tracing::instrument(skip_all)]
pub fn data_bits(mode: Mode, len: usize) -> u32 {
    match mode {
        Mode::Numeric => (10 * (len / 3) + [0, 4, 7][len % 3]) as u32,
        Mode::Alphanumeric => (11 * (len / 2) + 6 * (len % 2)) as u32,
        Mode::Byte => (8 * len) as u32,
    }
}

/// Compute the minimum-bit segmentation of `data` over the `allowed` modes.
///
/// `header_bits(mode)` returns the fixed per-segment overhead (mode indicator +
/// character-count indicator) for the target symbol. Returns the segment list in
/// payload order.
#[tracing::instrument(skip_all)]
pub fn optimal_segments(
    data: &[u8],
    allowed: &[Mode],
    header_bits: impl Fn(Mode) -> u32,
) -> Option<Vec<Segment>> {
    let n = data.len();
    if n == 0 {
        // Empty payload: a single empty byte segment keeps the bitstream valid.
        return Some(vec![Segment {
            mode: Mode::Byte,
            start: 0,
            len: 0,
        }]);
    }
    const INF: u32 = u32::MAX / 2;
    let mut dp = vec![INF; n + 1];
    let mut from = vec![(0usize, Mode::Byte); n + 1];
    dp[0] = 0;

    for i in 1..=n {
        let mut all_num = true;
        let mut all_aln = true;
        let mut j = i;
        while j > 0 {
            j -= 1;
            let b = data[j];
            all_num &= b.is_ascii_digit();
            all_aln &= alnum_value(b).is_some();
            let len = i - j;
            for &mode in allowed {
                let ok = match mode {
                    Mode::Numeric => all_num,
                    Mode::Alphanumeric => all_aln,
                    Mode::Byte => true,
                };
                if !ok {
                    continue;
                }
                if dp[j] == INF {
                    continue;
                }
                let cand = dp[j] + header_bits(mode) + data_bits(mode, len);
                if cand < dp[i] {
                    dp[i] = cand;
                    from[i] = (j, mode);
                }
            }
        }
    }

    if dp[n] == INF {
        return None; // no allowed mode can represent the payload
    }
    let mut segments = Vec::new();
    let mut i = n;
    while i > 0 {
        let (j, mode) = from[i];
        segments.push(Segment {
            mode,
            start: j,
            len: i - j,
        });
        i = j;
    }
    segments.reverse();
    Some(segments)
}

/// The total encoded bit length of `segments` for the given header sizes.
#[tracing::instrument(skip_all)]
pub fn total_bits(segments: &[Segment], header_bits: impl Fn(Mode) -> u32) -> u32 {
    segments
        .iter()
        .map(|s| header_bits(s.mode) + data_bits(s.mode, s.len))
        .sum()
}

/// Append the data bits (no header) of `data` encoded in `mode` to `bits`.
#[tracing::instrument(skip_all)]
pub fn append_data_bits(mode: Mode, data: &[u8], bits: &mut Vec<u8>) {
    match mode {
        Mode::Numeric => {
            for chunk in data.chunks(3) {
                let value: u32 = chunk
                    .iter()
                    .fold(0, |acc, &b| acc * 10 + u32::from(b - b'0'));
                let width = match chunk.len() {
                    3 => 10,
                    2 => 7,
                    _ => 4,
                };
                push_bits(value, width, bits);
            }
        }
        Mode::Alphanumeric => {
            for chunk in data.chunks(2) {
                if chunk.len() == 2 {
                    let value =
                        alnum_value(chunk[0]).unwrap() * 45 + alnum_value(chunk[1]).unwrap();
                    push_bits(value, 11, bits);
                } else {
                    push_bits(alnum_value(chunk[0]).unwrap(), 6, bits);
                }
            }
        }
        Mode::Byte => {
            for &b in data {
                push_bits(u32::from(b), 8, bits);
            }
        }
    }
}

/// Push the low `width` bits of `value` (most significant first) as `0`/`1`.
#[tracing::instrument(skip_all)]
pub fn push_bits(value: u32, width: u32, bits: &mut Vec<u8>) {
    for shift in (0..width).rev() {
        bits.push(((value >> shift) & 1) as u8);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn numeric_run_is_cheaper_as_numeric() {
        let segs = optimal_segments(b"12345", &MODES, |_| 4).unwrap();
        assert_eq!(segs.len(), 1);
        assert_eq!(segs[0].mode, Mode::Numeric);
    }

    #[test]
    fn unreachable_when_mode_restricted() {
        // Numeric-only allowed, but the payload has a letter.
        assert!(optimal_segments(b"12A", &[Mode::Numeric], |_| 3).is_none());
    }

    #[test]
    fn mixed_payload_splits_into_runs() {
        // A long digit run followed by lowercase (byte-only) text.
        let segs = optimal_segments(b"1234567890abcdef", &MODES, |_| 8).unwrap();
        assert_eq!(segs[0].mode, Mode::Numeric);
        assert_eq!(segs.last().unwrap().mode, Mode::Byte);
    }

    #[test]
    fn numeric_bit_lengths_match_spec() {
        assert_eq!(data_bits(Mode::Numeric, 3), 10);
        assert_eq!(data_bits(Mode::Numeric, 2), 7);
        assert_eq!(data_bits(Mode::Numeric, 1), 4);
        assert_eq!(data_bits(Mode::Alphanumeric, 2), 11);
        assert_eq!(data_bits(Mode::Alphanumeric, 1), 6);
    }
}
