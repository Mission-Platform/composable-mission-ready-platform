//! Code 93: a compact, self-checking alphanumeric symbology. Each character is
//! a fixed nine-module pattern; two modulo-47 check characters (`C` then `K`)
//! precede the start/stop delimiter, and a single termination bar closes the
//! symbol. The full-ASCII ("extended") variant encodes any 7-bit ASCII byte via
//! the four shift characters.

use mission_platform_barcode_common::code93::{
    base_value, push_check_characters, shift_value, PATTERNS, START_STOP, TERMINATION_BAR,
};
use mission_platform_barcode_common::full_ascii;

/// Append a `0`/`1` pattern string to `modules` as module bits.
#[tracing::instrument(skip_all)]
fn push_pattern(pattern: &str, modules: &mut Vec<u8>) {
    for bit in pattern.chars() {
        modules.push(if bit == '1' { 1 } else { 0 });
    }
}

/// Render a sequence of data values (no check characters yet) into module bits:
/// start delimiter, data, the `C`/`K` checks, stop delimiter, termination bar.
#[tracing::instrument(skip_all)]
fn render(mut values: Vec<usize>) -> Vec<u8> {
    push_check_characters(&mut values);

    let mut modules = Vec::new();
    push_pattern(START_STOP, &mut modules);
    for &value in &values {
        push_pattern(PATTERNS[value], &mut modules);
    }
    push_pattern(START_STOP, &mut modules);
    modules.push(TERMINATION_BAR);
    modules
}

/// Encode `data` as standard Code 93 (upper-cased automatically). Returns `None`
/// when the payload is empty or contains a character outside the base alphabet.
#[tracing::instrument(skip_all)]
pub fn encode(data: &str) -> Option<Vec<u8>> {
    if data.is_empty() {
        return None;
    }
    let upper = data.to_ascii_uppercase();
    let mut values = Vec::new();
    for character in upper.chars() {
        values.push(base_value(character)?);
    }
    Some(render(values))
}

/// Encode `data` as full-ASCII ("extended") Code 93. Returns `None` when the
/// payload is empty or contains a byte outside the 7-bit ASCII range.
#[tracing::instrument(skip_all)]
pub fn encode_extended(data: &str) -> Option<Vec<u8>> {
    if data.is_empty() {
        return None;
    }
    let mut values = Vec::new();
    for &byte in data.as_bytes() {
        let sequence = full_ascii::encode_byte(byte)?;
        for character in sequence.chars() {
            let value = shift_value(character).or_else(|| base_value(character))?;
            values.push(value);
        }
    }
    Some(render(values))
}

#[cfg(test)]
mod tests {
    use super::{encode, encode_extended};

    #[test]
    #[tracing::instrument(skip_all)]
    fn frames_and_is_binary() {
        let modules = encode("CODE93").expect("valid Code 93");
        assert!(!modules.is_empty());
        assert_eq!(modules[0], 1, "starts with a bar");
        assert_eq!(*modules.last().unwrap(), 1, "ends with the termination bar");
        assert!(modules.iter().all(|&bit| bit <= 1), "modules must be 0/1");
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn upper_cases_input_and_rejects_unknown_characters() {
        assert_eq!(encode("code93"), encode("CODE93"), "lower-case is upper-cased");
        assert!(encode("a*b").is_none(), "`*` is not in the base alphabet");
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn extended_accepts_lower_case_and_symbols() {
        assert!(encode_extended("Hello, World!").is_some());
        assert!(encode("Hello, World!").is_none(), "standard rejects lower-case punctuation set");
        assert!(encode_extended("").is_none(), "empty payload is rejected");
    }
}
