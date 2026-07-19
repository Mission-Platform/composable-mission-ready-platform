//! Code 39 decoder. Each character is nine narrow/wide elements separated by a
//! narrow-space gap, framed by the `*` start/stop delimiter. The `(char, n/w
//! pattern)` table mirrors `mission-platform-barcode-encode`'s Code 39 encoder.

use crate::widths::{classify, nw_pattern};
use mission_platform_barcode_common::full_ascii;

/// `(character, nine-element n/w pattern)` for the full Code 39 alphabet,
/// including the `*` start/stop delimiter. Mirrors the encoder's table.
const TABLE: [(char, &str); 44] = [
    ('0', "nnnwwnwnn"),
    ('1', "wnnwnnnnw"),
    ('2', "nnwwnnnnw"),
    ('3', "wnwwnnnnn"),
    ('4', "nnnwwnnnw"),
    ('5', "wnnwwnnnn"),
    ('6', "nnwwwnnnn"),
    ('7', "nnnwnnwnw"),
    ('8', "wnnwnnwnn"),
    ('9', "nnwwnnwnn"),
    ('A', "wnnnnwnnw"),
    ('B', "nnwnnwnnw"),
    ('C', "wnwnnwnnn"),
    ('D', "nnnnwwnnw"),
    ('E', "wnnnwwnnn"),
    ('F', "nnwnwwnnn"),
    ('G', "nnnnnwwnw"),
    ('H', "wnnnnwwnn"),
    ('I', "nnwnnwwnn"),
    ('J', "nnnnwwwnn"),
    ('K', "wnnnnnnww"),
    ('L', "nnwnnnnww"),
    ('M', "wnwnnnnwn"),
    ('N', "nnnnwnnww"),
    ('O', "wnnnwnnwn"),
    ('P', "nnwnwnnwn"),
    ('Q', "nnnnnnwww"),
    ('R', "wnnnnnwwn"),
    ('S', "nnwnnnwwn"),
    ('T', "nnnnwnwwn"),
    ('U', "wwnnnnnnw"),
    ('V', "nwwnnnnnw"),
    ('W', "wwwnnnnnn"),
    ('X', "nwnnwnnnw"),
    ('Y', "wwnnwnnnn"),
    ('Z', "nwwnwnnnn"),
    ('-', "nwnnnnwnw"),
    ('.', "wwnnnnwnn"),
    (' ', "nwwnnnwnn"),
    ('$', "nwnwnwnnn"),
    ('/', "nwnwnnnwn"),
    ('+', "nwnnnwnwn"),
    ('%', "nnnwnwnwn"),
    ('*', "nwnnwnwnn"),
];

/// The character whose nine-element pattern matches `pattern`, or `None`.
#[tracing::instrument(skip_all)]
fn character_for(pattern: &str) -> Option<char> {
    TABLE
        .iter()
        .find(|&&(_, candidate)| candidate == pattern)
        .map(|&(character, _)| character)
}

/// Decode a Code 39 module run. When `extended` is set the framed characters are
/// folded back through the full-ASCII shift table. Returns `None` when the
/// framing or any character pattern is invalid.
#[tracing::instrument(skip_all)]
pub fn decode(modules: &[u8], extended: bool) -> Option<String> {
    let elements = classify(modules)?;
    // N characters of nine elements each, joined by (N - 1) single-gap spaces.
    if (elements.len() + 1) % 10 != 0 {
        return None;
    }

    let mut framed = String::new();
    let mut index = 0;
    while index + 9 <= elements.len() {
        let pattern = nw_pattern(&elements[index..index + 9]);
        framed.push(character_for(&pattern)?);
        index += 9;
        // Skip the inter-character gap (a single narrow space) if present.
        if index < elements.len() {
            index += 1;
        }
    }

    // Strip the `*` start/stop frame.
    let inner = framed.strip_prefix('*')?.strip_suffix('*')?;
    if inner.contains('*') {
        return None;
    }

    if extended {
        full_ascii::decode_sequence(inner)
    } else {
        Some(inner.to_string())
    }
}
