//! Codabar decoder. Each character is seven narrow/wide elements separated by a
//! narrow-space gap, framed by an `A` start/stop character. The `(char, wide
//! bitmask)` table mirrors the encoder (bit set = wide element).

use crate::widths::{classify, Element};

/// `(character, seven-element wide bitmask)` for every Codabar character.
const TABLE: [(char, &str); 20] = [
    ('0', "0000011"),
    ('1', "0000110"),
    ('2', "0001001"),
    ('3', "1100000"),
    ('4', "0010010"),
    ('5', "1000010"),
    ('6', "0100001"),
    ('7', "0100100"),
    ('8', "0110000"),
    ('9', "1000100"),
    ('-', "0001100"),
    ('$', "0011000"),
    (':', "1000101"),
    ('/', "1010001"),
    ('.', "1010100"),
    ('+', "0010011"),
    ('A', "0011010"),
    ('B', "0101001"),
    ('C', "0001011"),
    ('D', "0001110"),
];

/// The character whose wide bitmask matches `mask`, or `None`.
#[tracing::instrument(skip_all)]
fn character_for(mask: &str) -> Option<char> {
    TABLE
        .iter()
        .find(|&&(_, candidate)| candidate == mask)
        .map(|&(character, _)| character)
}

/// Render seven elements as a wide bitmask string (`1` = wide, `0` = narrow).
#[tracing::instrument(skip_all)]
fn mask(elements: &[Element]) -> String {
    elements
        .iter()
        .map(|&(_, wide)| if wide { '1' } else { '0' })
        .collect()
}

/// Decode a Codabar module run, stripping the `A` start/stop frame. Returns
/// `None` when the framing or any character pattern is invalid.
#[tracing::instrument(skip_all)]
pub fn decode(modules: &[u8]) -> Option<String> {
    let elements = classify(modules)?;
    // N characters of seven elements each, joined by (N - 1) single-gap spaces.
    if (elements.len() + 1) % 8 != 0 {
        return None;
    }

    let mut framed = String::new();
    let mut index = 0;
    while index + 7 <= elements.len() {
        framed.push(character_for(&mask(&elements[index..index + 7]))?);
        index += 7;
        if index < elements.len() {
            index += 1; // Skip the inter-character gap.
        }
    }

    let inner = framed.strip_prefix('A')?.strip_suffix('A')?;
    Some(inner.to_string())
}
