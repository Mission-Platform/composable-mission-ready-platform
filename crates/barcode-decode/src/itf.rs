//! Interleaved 2 of 5 decoder. A four-element narrow start pattern and a
//! three-element stop pattern frame the payload; between them, digits come in
//! interleaved pairs (the first digit's five elements are the bars, the second's
//! are the spaces). The digit pattern table mirrors the encoder.

use crate::widths::{classify, Element};

/// Five-element narrow/wide pattern for each digit, indexed by value.
const PATTERNS: [&str; 10] = [
    "nnwwn", "wnnnw", "nwnnw", "wwnnn", "nnwnw", "wnwnn", "nwwnn", "nnnww", "wnnwn", "nwnwn",
];

/// The digit whose five-element pattern matches `pattern`, or `None`.
#[tracing::instrument(skip_all)]
fn digit_for(pattern: &str) -> Option<u8> {
    PATTERNS
        .iter()
        .position(|&candidate| candidate == pattern)
        .map(|value| value as u8)
}

/// Render the wide flags of five elements as an `n`/`w` string.
#[tracing::instrument(skip_all)]
fn five(elements: &[Element]) -> String {
    elements
        .iter()
        .map(|&(_, wide)| if wide { 'w' } else { 'n' })
        .collect()
}

/// Decode an Interleaved 2 of 5 module run into its digit string. Returns `None`
/// when the framing or any digit pair is invalid.
#[tracing::instrument(skip_all)]
pub fn decode(modules: &[u8]) -> Option<String> {
    let elements = classify(modules)?;
    // start (4) + groups of 10 (a digit pair) + stop (3).
    if elements.len() < 4 + 10 + 3 || (elements.len() - 7) % 10 != 0 {
        return None;
    }
    let body = &elements[4..elements.len() - 3];

    let mut digits = String::new();
    for group in body.chunks_exact(10) {
        // Bars are the even-indexed elements, spaces the odd-indexed ones.
        let bars: Vec<Element> = group.iter().step_by(2).copied().collect();
        let spaces: Vec<Element> = group.iter().skip(1).step_by(2).copied().collect();
        let first = digit_for(&five(&bars))?;
        let second = digit_for(&five(&spaces))?;
        digits.push((b'0' + first) as char);
        digits.push((b'0' + second) as char);
    }

    // ITF has no check digit and a trivial start/stop, so short runs decode into
    // spurious values from arbitrary texture (e.g. a scan line across a QR).
    // Mirror ZXing's `ITFReader` default and reject payloads shorter than six
    // digits; every legitimate ITF/ITF-14 is at least this long. This kills the
    // 2/4-digit false positives without rejecting any real symbol.
    if digits.len() < MIN_DIGITS {
        return None;
    }
    Some(digits)
}

/// Minimum ITF payload length accepted, matching the lower bound of ZXing's
/// `ITFReader::DEFAULT_ALLOWED_LENGTHS` (`{6, 8, 10, 12, 14}`). Shorter runs are
/// almost always false positives on non-ITF imagery.
const MIN_DIGITS: usize = 6;
