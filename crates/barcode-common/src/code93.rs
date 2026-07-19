//! Shared Code 93 tables and helpers, used by both the encoder and the decoder.
//!
//! Code 93 draws each character as a fixed nine-module pattern (three bars +
//! three spaces), so — unlike the ratio-based symbologies — its module bits map
//! one-to-one onto binary pattern strings. Two modulo-47 check characters (`C`
//! then `K`) are appended before the start/stop delimiter, which itself is
//! followed by a single termination bar.
//!
//! The four "special" characters (values `43..=46`) are the shift characters
//! used by the full-ASCII (extended) variant. They map onto the `$ % / +` shift
//! markers of the shared [`crate::full_ascii`] table in that order, matching the
//! de-facto ZXing convention (`a`/`b`/`c`/`d`).

/// Nine-module (`1` = bar, `0` = space) pattern for each Code 93 value `0..=46`.
pub const PATTERNS: [&str; 47] = [
    "100010100", "101001000", "101000100", "101000010", "100101000", // 0..4
    "100100100", "100100010", "101010000", "100010010", "100001010", // 5..9
    "110101000", "110100100", "110100010", "110010100", "110010010", // A..E (10..14)
    "110001010", "101101000", "101100100", "101100010", "100110100", // F..J (15..19)
    "100011010", "101011000", "101001100", "101000110", "100101100", // K..O (20..24)
    "100010110", "110110100", "110110010", "110101100", "110100110", // P..T (25..29)
    "110010110", "110011010", "101101100", "101100110", "100110110", // U..Y (30..34)
    "100111010", "100101110", "111010100", "111010010", "111001010", // Z,-,.,space,$ (35..39)
    "101101110", "101110110", "110101110", "100100110", "111011010", // /,+,%,(a),(b) (40..44)
    "111010110", "100110010", // (c),(d) (45..46)
];

/// The start/stop delimiter pattern (`*`).
pub const START_STOP: &str = "101011110";

/// A single terminating bar module appended after the trailing stop delimiter.
pub const TERMINATION_BAR: u8 = 1;

/// The base alphabet: `ALPHABET[value]` for values `0..=42` (the four special
/// shift characters `43..=46` are handled separately).
pub const ALPHABET: &str = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%";

/// Map a base-alphabet character to its value `0..=42`, or `None`.
#[tracing::instrument(skip_all)]
pub fn base_value(character: char) -> Option<usize> {
    ALPHABET.chars().position(|candidate| candidate == character)
}

/// Map a value `0..=42` to its base-alphabet character, or `None`.
#[tracing::instrument(skip_all)]
pub fn base_char(value: usize) -> Option<char> {
    ALPHABET.chars().nth(value)
}

/// Map a full-ASCII shift marker (`$ % / +`) to its special value `43..=46`.
#[tracing::instrument(skip_all)]
pub fn shift_value(shift: char) -> Option<usize> {
    match shift {
        '$' => Some(43),
        '%' => Some(44),
        '/' => Some(45),
        '+' => Some(46),
        _ => None,
    }
}

/// Map a special value `43..=46` back to its full-ASCII shift marker.
#[tracing::instrument(skip_all)]
pub fn shift_char(value: usize) -> Option<char> {
    match value {
        43 => Some('$'),
        44 => Some('%'),
        45 => Some('/'),
        46 => Some('+'),
        _ => None,
    }
}

/// The modulo-47 weighted check character for `values`, weighting the right-most
/// value `1` and cycling the weight up to `max_weight` before wrapping. `C` uses
/// `max_weight = 20`; `K` (which includes `C`) uses `max_weight = 15`.
#[tracing::instrument(skip_all)]
pub fn weighted_check(values: &[usize], max_weight: usize) -> usize {
    let mut sum = 0usize;
    for (index, &value) in values.iter().rev().enumerate() {
        let weight = (index % max_weight) + 1;
        sum += value * weight;
    }
    sum % 47
}

/// Append both the `C` and `K` check characters to `values`.
#[tracing::instrument(skip_all)]
pub fn push_check_characters(values: &mut Vec<usize>) {
    let c = weighted_check(values, 20);
    values.push(c);
    let k = weighted_check(values, 15);
    values.push(k);
}
