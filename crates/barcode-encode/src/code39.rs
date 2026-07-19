//! Code 39 (Code 3 of 9): a self-checking alphanumeric symbology. Each
//! character is nine elements (five bars, four spaces) of which exactly three
//! are wide; a narrow space separates adjacent characters. The `*` character
//! frames the payload as the start/stop delimiter.

use mission_platform_barcode_common::full_ascii;
use mission_platform_barcode_common::widths_to_modules;

/// Narrow / wide element ratio (3:1 is the common default).
const NARROW: u8 = 1;
const WIDE: u8 = 3;

/// Map a supported character to its nine-element `n`/`w` width pattern, or
/// `None` when the character is outside the Code 39 alphabet.
#[tracing::instrument(skip_all)]
fn pattern(character: char) -> Option<&'static str> {
    Some(match character {
        '0' => "nnnwwnwnn",
        '1' => "wnnwnnnnw",
        '2' => "nnwwnnnnw",
        '3' => "wnwwnnnnn",
        '4' => "nnnwwnnnw",
        '5' => "wnnwwnnnn",
        '6' => "nnwwwnnnn",
        '7' => "nnnwnnwnw",
        '8' => "wnnwnnwnn",
        '9' => "nnwwnnwnn",
        'A' => "wnnnnwnnw",
        'B' => "nnwnnwnnw",
        'C' => "wnwnnwnnn",
        'D' => "nnnnwwnnw",
        'E' => "wnnnwwnnn",
        'F' => "nnwnwwnnn",
        'G' => "nnnnnwwnw",
        'H' => "wnnnnwwnn",
        'I' => "nnwnnwwnn",
        'J' => "nnnnwwwnn",
        'K' => "wnnnnnnww",
        'L' => "nnwnnnnww",
        'M' => "wnwnnnnwn",
        'N' => "nnnnwnnww",
        'O' => "wnnnwnnwn",
        'P' => "nnwnwnnwn",
        'Q' => "nnnnnnwww",
        'R' => "wnnnnnwwn",
        'S' => "nnwnnnwwn",
        'T' => "nnnnwnwwn",
        'U' => "wwnnnnnnw",
        'V' => "nwwnnnnnw",
        'W' => "wwwnnnnnn",
        'X' => "nwnnwnnnw",
        'Y' => "wwnnwnnnn",
        'Z' => "nwwnwnnnn",
        '-' => "nwnnnnwnw",
        '.' => "wwnnnnwnn",
        ' ' => "nwwnnnwnn",
        '$' => "nwnwnwnnn",
        '/' => "nwnwnnnwn",
        '+' => "nwnnnwnwn",
        '%' => "nnnwnwnwn",
        '*' => "nwnnwnwnn",
        _ => return None,
    })
}

/// Expand a `n`/`w` pattern string into element widths.
#[tracing::instrument(skip_all)]
fn widths(pattern: &str) -> Vec<u8> {
    pattern
        .chars()
        .map(|c| if c == 'w' { WIDE } else { NARROW })
        .collect()
}

/// Frame `symbols` with the `*` start/stop delimiter and render its module
/// bits, inserting a narrow-space gap between characters. Returns `None` when a
/// character is outside the Code 39 alphabet.
#[tracing::instrument(skip_all)]
fn frame_and_render(symbols: &str) -> Option<Vec<u8>> {
    let framed = format!("*{symbols}*");
    let count = framed.chars().count();
    let mut modules = Vec::new();
    for (index, character) in framed.chars().enumerate() {
        let pattern = pattern(character)?;
        modules.extend(widths_to_modules(&widths(pattern), true));
        // Narrow-space inter-character gap after every character except the last.
        if index + 1 < count {
            modules.push(0);
        }
    }
    Some(modules)
}

/// Encode `data` (upper-cased automatically) as Code 39. Returns `None` when
/// the payload contains an unsupported character. The `*` delimiter is added
/// automatically and must not appear in `data`.
#[tracing::instrument(skip_all)]
pub fn encode(data: &str) -> Option<Vec<u8>> {
    let upper = data.to_ascii_uppercase();
    if upper.contains('*') {
        return None;
    }
    frame_and_render(&upper)
}

/// Encode `data` as full-ASCII ("extended") Code 39, mapping every 7-bit ASCII
/// byte to one or two base characters via the shared shift table. Returns `None`
/// for an empty payload or a byte outside the 7-bit ASCII range.
#[tracing::instrument(skip_all)]
pub fn encode_extended(data: &str) -> Option<Vec<u8>> {
    if data.is_empty() {
        return None;
    }
    let mut symbols = String::new();
    for &byte in data.as_bytes() {
        symbols.push_str(full_ascii::encode_byte(byte)?);
    }
    frame_and_render(&symbols)
}

#[cfg(test)]
mod tests {
    use super::encode;

    #[test]
    #[tracing::instrument(skip_all)]
    fn frames_and_is_binary() {
        let modules = encode("ABC-123").expect("valid Code 39");
        assert!(!modules.is_empty());
        assert_eq!(modules[0], 1, "starts with a bar");
        assert_eq!(*modules.last().unwrap(), 1, "ends with a bar");
        assert!(modules.iter().all(|&bit| bit <= 1), "modules must be 0/1");
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn upper_cases_input_and_reserves_the_star_delimiter() {
        let upper = encode("ABC-123").expect("valid Code 39");
        assert_eq!(encode("abc-123"), Some(upper), "lower-case is upper-cased");
        assert!(encode("a*b").is_none(), "`*` is reserved for the frame");
    }
}
