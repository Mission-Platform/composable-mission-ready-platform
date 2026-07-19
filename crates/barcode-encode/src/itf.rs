//! Interleaved 2 of 5 (ITF): a compact numeric symbology that encodes digits in
//! pairs — the first digit's five elements become bars, the second's become the
//! interleaved spaces. Requires an even number of digits.

use mission_platform_barcode_common::widths_to_modules;

const NARROW: u8 = 1;
const WIDE: u8 = 3;

/// Five-element narrow/wide width pattern for each digit.
const PATTERNS: [&str; 10] = [
    "nnwwn", "wnnnw", "nwnnw", "wwnnn", "nnwnw", "wnwnn", "nwwnn", "nnnww", "wnnwn", "nwnwn",
];

#[tracing::instrument(skip_all)]
fn width(marker: char) -> u8 {
    if marker == 'w' {
        WIDE
    } else {
        NARROW
    }
}

/// The mod-10 check digit for `digits` using the ITF-14 / GTIN weighting (the
/// right-most data digit is weighted `3`, then alternating `1`/`3`).
#[tracing::instrument(skip_all)]
fn gtin_check(digits: &[usize]) -> usize {
    let mut sum = 0usize;
    let mut weight = 3usize;
    for &digit in digits.iter().rev() {
        sum += digit * weight;
        weight = if weight == 3 { 1 } else { 3 };
    }
    (10 - (sum % 10)) % 10
}

/// Render an even-length run of digit values as Interleaved 2 of 5 module bits.
#[tracing::instrument(skip_all)]
fn encode_digits(digits: &[usize]) -> Vec<u8> {
    // Start pattern: narrow bar, narrow space, narrow bar, narrow space.
    let mut widths = vec![NARROW, NARROW, NARROW, NARROW];
    for pair in digits.chunks_exact(2) {
        let bars: Vec<char> = PATTERNS[pair[0]].chars().collect();
        let spaces: Vec<char> = PATTERNS[pair[1]].chars().collect();
        for index in 0..5 {
            widths.push(width(bars[index]));
            widths.push(width(spaces[index]));
        }
    }
    // Stop pattern: wide bar, narrow space, narrow bar.
    widths.push(WIDE);
    widths.push(NARROW);
    widths.push(NARROW);

    widths_to_modules(&widths, true)
}

/// Encode `data` as Interleaved 2 of 5. Returns `None` for non-digit input or an
/// odd digit count.
#[tracing::instrument(skip_all)]
pub fn encode(data: &str) -> Option<Vec<u8>> {
    let digits: Vec<usize> = data
        .chars()
        .map(|character| character.to_digit(10).map(|value| value as usize))
        .collect::<Option<Vec<_>>>()?;
    if digits.is_empty() || !digits.len().is_multiple_of(2) {
        return None;
    }
    Some(encode_digits(&digits))
}

/// Encode `data` as ITF-14 (a fixed 14-digit GTIN-14 in Interleaved 2 of 5).
/// Accepts 13 digits (the check digit is computed) or 14 digits (the trailing
/// check digit is verified). Returns `None` otherwise.
#[tracing::instrument(skip_all)]
pub fn encode_itf14(data: &str) -> Option<Vec<u8>> {
    let mut digits: Vec<usize> = data
        .chars()
        .map(|character| character.to_digit(10).map(|value| value as usize))
        .collect::<Option<Vec<_>>>()?;
    match digits.len() {
        13 => digits.push(gtin_check(&digits)),
        14 => {
            if digits[13] != gtin_check(&digits[..13]) {
                return None;
            }
        }
        _ => return None,
    }
    Some(encode_digits(&digits))
}

#[cfg(test)]
mod tests {
    use super::{encode, encode_itf14};

    #[test]
    #[tracing::instrument(skip_all)]
    fn requires_an_even_digit_count() {
        let modules = encode("1234").expect("even digit count");
        assert!(modules.iter().all(|&bit| bit <= 1), "modules must be 0/1");
        assert!(encode("123").is_none(), "odd digit count is rejected");
        assert!(encode("12ab").is_none(), "non-digits are rejected");
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn itf14_computes_and_verifies_the_check_digit() {
        let computed = encode_itf14("1234567890123").expect("13 digits, check computed");
        let verified = encode_itf14("12345678901231").expect("14 digits, check verified");
        assert_eq!(computed, verified, "check digit should match");
        assert!(encode_itf14("12345678901239").is_none(), "bad check digit is rejected");
        assert!(encode_itf14("123").is_none(), "wrong length is rejected");
    }
}
