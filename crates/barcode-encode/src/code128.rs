//! Code 128: a high-density symbology whose 108 symbols are each eleven
//! modules wide (three bars + three spaces) except the thirteen-module stop
//! pattern. This encoder uses Code B for the full printable-ASCII range and a
//! Code C fast path for even-length all-digit payloads (double the density).

/// The 108 Code 128 element-width patterns, indexed by symbol value. Each entry
/// is six element widths (bar, space, bar, space, bar, space) summing to eleven,
/// except index 106 (the stop pattern) which is seven elements / thirteen modules.
const PATTERNS: [&str; 107] = [
    "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212",
    "221213", "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221",
    "223211", "221132", "221231", "213212", "223112", "312131", "311222", "321122", "321221",
    "312212", "322112", "322211", "212123", "212321", "232121", "111323", "131123", "131321",
    "112313", "132113", "132311", "211313", "231113", "231311", "112133", "112331", "132131",
    "113123", "113321", "133121", "313121", "211331", "231131", "213113", "213311", "213131",
    "311123", "311321", "331121", "312113", "312311", "332111", "314111", "221411", "431111",
    "111224", "111422", "121124", "121421", "141122", "141221", "112214", "112412", "122114",
    "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", "111242",
    "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
    "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311",
    "113141", "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
];

const START_B: usize = 104;
const START_C: usize = 105;
const STOP: usize = 106;
/// The FNC1 function character. As the first symbol after the start code it
/// marks a GS1-128 symbol (a GS1 Application Identifier stream).
const FNC1: usize = 102;

/// Append the module bits for one symbol value to `modules`.
#[tracing::instrument(skip_all)]
fn push_symbol(value: usize, modules: &mut Vec<u8>) {
    let mut bar = true;
    for width in PATTERNS[value].chars() {
        let count = width.to_digit(10).unwrap_or(0);
        let bit = if bar { 1 } else { 0 };
        for _ in 0..count {
            modules.push(bit);
        }
        bar = !bar;
    }
}

/// Turn a list of symbol values (start … data) into module bits, appending the
/// modulo-103 checksum and stop pattern.
#[tracing::instrument(skip_all)]
fn render(values: &[usize]) -> Vec<u8> {
    let checksum = values
        .iter()
        .enumerate()
        .map(|(index, &value)| if index == 0 { value } else { value * index })
        .sum::<usize>()
        % 103;

    let mut modules = Vec::new();
    for &value in values {
        push_symbol(value, &mut modules);
    }
    push_symbol(checksum, &mut modules);
    push_symbol(STOP, &mut modules);
    modules
}

/// Encode `bytes` after the given `prefix` (start code, plus an optional leading
/// FNC1), choosing the Code C digit-pair fast path or Code B. Returns `None`
/// when a Code B byte is outside the printable ASCII range (0x20–0x7E).
#[tracing::instrument(skip_all)]
fn encode_with_prefix(prefix_start_c: &[usize], prefix_start_b: &[usize], bytes: &[u8]) -> Option<Vec<u8>> {
    // Code C fast path: an even number of digits packs two per symbol.
    if bytes.len().is_multiple_of(2) && bytes.iter().all(u8::is_ascii_digit) {
        let mut values = prefix_start_c.to_vec();
        for pair in bytes.chunks_exact(2) {
            let high = (pair[0] - b'0') as usize;
            let low = (pair[1] - b'0') as usize;
            values.push(high * 10 + low);
        }
        return Some(render(&values));
    }

    // Code B: every printable ASCII character maps to value `byte - 32`.
    if !bytes.iter().all(|&byte| (0x20..=0x7e).contains(&byte)) {
        return None;
    }
    let mut values = prefix_start_b.to_vec();
    for &byte in bytes {
        values.push((byte - 0x20) as usize);
    }
    Some(render(&values))
}

/// Encode `data` as Code 128. Returns `None` when the payload contains a
/// character outside the printable ASCII range (0x20–0x7E).
#[tracing::instrument(skip_all)]
pub fn encode(data: &str) -> Option<Vec<u8>> {
    let bytes = data.as_bytes();
    if bytes.is_empty() {
        return None;
    }
    encode_with_prefix(&[START_C], &[START_B], bytes)
}

/// Encode `data` as GS1-128 (UCC/EAN-128): Code 128 with a leading FNC1 that
/// flags the payload as a stream of GS1 Application Identifiers. Returns `None`
/// for empty or (in Code B) non-printable-ASCII input.
#[tracing::instrument(skip_all)]
pub fn encode_gs1_128(data: &str) -> Option<Vec<u8>> {
    let bytes = data.as_bytes();
    if bytes.is_empty() {
        return None;
    }
    encode_with_prefix(&[START_C, FNC1], &[START_B, FNC1], bytes)
}

#[cfg(test)]
mod tests {
    use super::{encode, encode_gs1_128};

    #[test]
    #[tracing::instrument(skip_all)]
    fn code_b_path_for_mixed_ascii() {
        // Code B for mixed printable ASCII.
        let text = encode("AB").expect("valid Code 128 B");
        // start(11) + 2 data(11 each) + checksum(11) + stop(13) = 57.
        assert_eq!(text.len(), 57);
        assert!(text.iter().all(|&bit| bit <= 1), "modules must be 0/1");
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn code_c_path_for_even_digit_strings() {
        // Code C for an even-length digit string is denser than Code B would be.
        let digits = encode("1234").expect("valid Code 128 C");
        // start + 2 pair symbols + checksum = 4 symbols(11) + stop(13) = 57.
        assert_eq!(digits.len(), 57);
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn rejects_empty_input() {
        assert!(encode("").is_none());
        assert!(encode_gs1_128("").is_none());
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn gs1_128_adds_a_leading_fnc1_symbol() {
        // Same payload: GS1-128 is one extra symbol (FNC1) wider than plain Code 128.
        let plain = encode("1234").expect("valid Code 128 C");
        let gs1 = encode_gs1_128("1234").expect("valid GS1-128");
        assert_eq!(gs1.len(), plain.len() + 11, "GS1-128 adds one 11-module FNC1 symbol");
        assert!(gs1.iter().all(|&bit| bit <= 1), "modules must be 0/1");
    }
}
