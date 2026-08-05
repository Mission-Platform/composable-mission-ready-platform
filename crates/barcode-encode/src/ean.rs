//! EAN-13, EAN-8 and UPC-A: the fixed-length retail digit symbologies. Each
//! digit is seven modules; guard bars frame and split the halves. A trailing
//! check digit (mod-10) is computed and appended when the caller omits it.

/// Left-hand "odd parity" (L) digit encodings, seven modules each.
const L_CODES: [&str; 10] = [
    "0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011",
    "0110111", "0001011",
];

/// Left-hand "even parity" (G) digit encodings (EAN-13 uses these to encode the
/// first digit implicitly).
const G_CODES: [&str; 10] = [
    "0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001",
    "0001001", "0010111",
];

/// Right-hand (R) digit encodings, seven modules each (the L-code complement).
const R_CODES: [&str; 10] = [
    "1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100",
    "1001000", "1110100",
];

/// For each leading digit, the L/G parity pattern of the six left-hand digits
/// (`false` = L / odd, `true` = G / even).
const PARITY: [[bool; 6]; 10] = [
    [false, false, false, false, false, false],
    [false, false, true, false, true, true],
    [false, false, true, true, false, true],
    [false, false, true, true, true, false],
    [false, true, false, false, true, true],
    [false, true, true, false, false, true],
    [false, true, true, true, false, false],
    [false, true, false, true, false, true],
    [false, true, false, true, true, false],
    [false, true, true, false, true, false],
];

/// Parse `data` into its digit values, rejecting any non-digit character.
#[tracing::instrument(skip_all)]
fn digits(data: &str) -> Option<Vec<u8>> {
    data.chars()
        .map(|character| character.to_digit(10).map(|value| value as u8))
        .collect()
}

/// The mod-10 check digit for `values` using the alternating weight sequence,
/// where the right-most data digit takes `first_weight` (3 for EAN, so the
/// weighting is anchored to the check position).
#[tracing::instrument(skip_all)]
fn check_digit(values: &[u8], first_weight: u32) -> u8 {
    let mut sum = 0u32;
    let mut weight = first_weight;
    for &value in values.iter().rev() {
        sum += value as u32 * weight;
        weight = if weight == 3 { 1 } else { 3 };
    }
    ((10 - (sum % 10)) % 10) as u8
}

/// Append a `0`/`1` pattern string to `modules`.
#[tracing::instrument(skip_all)]
fn push(pattern: &str, modules: &mut Vec<u8>) {
    for bit in pattern.chars() {
        modules.push(if bit == '1' { 1 } else { 0 });
    }
}

/// Encode EAN-13 from 12 digits (check computed) or 13 digits (check verified).
#[tracing::instrument(skip_all)]
pub fn encode_ean13(data: &str) -> Option<Vec<u8>> {
    let mut values = digits(data)?;
    match values.len() {
        12 => values.push(check_digit(&values, 3)),
        13 => {
            let expected = check_digit(&values[..12], 3);
            if values[12] != expected {
                return None;
            }
        }
        _ => return None,
    }

    let parity = PARITY[values[0] as usize];
    let mut modules = Vec::new();
    push("101", &mut modules); // Start guard.
    for (index, &digit) in values[1..7].iter().enumerate() {
        let code = if parity[index] {
            G_CODES[digit as usize]
        } else {
            L_CODES[digit as usize]
        };
        push(code, &mut modules);
    }
    push("01010", &mut modules); // Centre guard.
    for &digit in &values[7..13] {
        push(R_CODES[digit as usize], &mut modules);
    }
    push("101", &mut modules); // End guard.
    Some(modules)
}

/// Encode UPC-A from 11 digits (check computed) or 12 digits (check verified).
#[tracing::instrument(skip_all)]
pub fn encode_upca(data: &str) -> Option<Vec<u8>> {
    let mut values = digits(data)?;
    match values.len() {
        11 => values.push(check_digit(&values, 3)),
        12 => {
            let expected = check_digit(&values[..11], 3);
            if values[11] != expected {
                return None;
            }
        }
        _ => return None,
    }

    let mut modules = Vec::new();
    push("101", &mut modules); // Start guard.
    for &digit in &values[0..6] {
        push(L_CODES[digit as usize], &mut modules);
    }
    push("01010", &mut modules); // Centre guard.
    for &digit in &values[6..12] {
        push(R_CODES[digit as usize], &mut modules);
    }
    push("101", &mut modules); // End guard.
    Some(modules)
}

/// Encode EAN-8 from 7 digits (check computed) or 8 digits (check verified).
#[tracing::instrument(skip_all)]
pub fn encode_ean8(data: &str) -> Option<Vec<u8>> {
    let mut values = digits(data)?;
    match values.len() {
        7 => values.push(check_digit(&values, 3)),
        8 => {
            let expected = check_digit(&values[..7], 3);
            if values[7] != expected {
                return None;
            }
        }
        _ => return None,
    }

    let mut modules = Vec::new();
    push("101", &mut modules); // Start guard.
    for &digit in &values[0..4] {
        push(L_CODES[digit as usize], &mut modules);
    }
    push("01010", &mut modules); // Centre guard.
    for &digit in &values[4..8] {
        push(R_CODES[digit as usize], &mut modules);
    }
    push("101", &mut modules); // End guard.
    Some(modules)
}

/// UPC-E parity pattern (number system `0`) for each check digit: `true` = even
/// parity (G code), `false` = odd parity (L code). Number system `1` inverts
/// each entry.
const UPCE_PARITY: [[bool; 6]; 10] = [
    [true, true, true, false, false, false], // 0: EEEOOO
    [true, true, false, true, false, false], // 1: EEOEOO
    [true, true, false, false, true, false], // 2: EEOOEO
    [true, true, false, false, false, true], // 3: EEOOOE
    [true, false, true, true, false, false], // 4: EOEEOO
    [true, false, false, true, true, false], // 5: EOOEEO
    [true, false, false, false, true, true], // 6: EOOOEE
    [true, false, true, false, true, false], // 7: EOEOEO
    [true, false, true, false, false, true], // 8: EOEOOE
    [true, false, false, true, false, true], // 9: EOOEOE
];

/// Expand a UPC-E number system (`0`/`1`) and six digits into the equivalent
/// eleven-digit UPC-A body (number system followed by ten digits), ready for a
/// check-digit computation.
#[tracing::instrument(skip_all)]
fn upce_to_upca_body(number_system: u8, x: &[u8; 6]) -> [u8; 11] {
    let mut body = [0u8; 11];
    body[0] = number_system;
    match x[5] {
        0..=2 => {
            body[1] = x[0];
            body[2] = x[1];
            body[3] = x[5];
            body[7] = x[2];
            body[8] = x[3];
            body[9] = x[4];
        }
        3 => {
            body[1] = x[0];
            body[2] = x[1];
            body[3] = x[2];
            body[8] = x[3];
            body[9] = x[4];
        }
        4 => {
            body[1] = x[0];
            body[2] = x[1];
            body[3] = x[2];
            body[4] = x[3];
            body[9] = x[4];
        }
        _ => {
            body[1] = x[0];
            body[2] = x[1];
            body[3] = x[2];
            body[4] = x[3];
            body[5] = x[4];
            body[10] = x[5];
        }
    }
    body
}

/// Encode UPC-E from 6 digits (number system `0`, check computed), 7 digits
/// (number system + 6, check computed) or 8 digits (number system + 6 + check,
/// verified). The number system must be `0` or `1`. Returns `None` otherwise.
#[tracing::instrument(skip_all)]
pub fn encode_upce(data: &str) -> Option<Vec<u8>> {
    let values = digits(data)?;
    let (number_system, x, supplied_check): (u8, [u8; 6], Option<u8>) = match values.len() {
        6 => (0, values[0..6].try_into().ok()?, None),
        7 => {
            let system = values[0];
            (system, values[1..7].try_into().ok()?, None)
        }
        8 => {
            let system = values[0];
            (system, values[1..7].try_into().ok()?, Some(values[7]))
        }
        _ => return None,
    };
    if number_system > 1 {
        return None;
    }

    let body = upce_to_upca_body(number_system, &x);
    let check = check_digit(&body, 3);
    if let Some(supplied) = supplied_check {
        if supplied != check {
            return None;
        }
    }

    let pattern = UPCE_PARITY[check as usize];
    let mut modules = Vec::new();
    push("101", &mut modules); // Start guard.
    for (index, &digit) in x.iter().enumerate() {
        // Number system 1 inverts the parity of every position.
        let even = pattern[index] ^ (number_system == 1);
        let code = if even {
            G_CODES[digit as usize]
        } else {
            L_CODES[digit as usize]
        };
        push(code, &mut modules);
    }
    push("010101", &mut modules); // End guard.
    Some(modules)
}

#[cfg(test)]
mod tests {
    use super::{encode_ean13, encode_ean8, encode_upca, encode_upce};

    /// Every module bit must be 0 or 1.
    #[tracing::instrument(skip_all)]
    fn assert_binary(modules: &[u8]) {
        assert!(modules.iter().all(|&bit| bit <= 1), "modules must be 0/1");
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn ean13_computes_check_digit_and_length() {
        // Known valid EAN-13 whose check digit is 7.
        let with_check = encode_ean13("5901234123457").expect("valid EAN-13");
        let without_check = encode_ean13("590123412345").expect("check appended");
        assert_eq!(
            with_check, without_check,
            "check digit should be recomputed"
        );
        assert_eq!(with_check.len(), 95, "EAN-13 is 95 modules wide");
        assert_eq!(with_check[0], 1, "starts with a bar guard");
        assert_binary(&with_check);
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn ean13_rejects_bad_check_digit_and_bad_input() {
        assert!(encode_ean13("5901234123450").is_none());
        assert!(encode_ean13("notdigits0000").is_none());
        assert!(encode_ean13("123").is_none());
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn ean8_and_upca_lengths() {
        let ean8 = encode_ean8("9638507").expect("valid EAN-8");
        assert_eq!(ean8.len(), 67, "EAN-8 is 67 modules wide");
        assert_binary(&ean8);
        let upca = encode_upca("03600029145").expect("valid UPC-A");
        assert_eq!(upca.len(), 95, "UPC-A is 95 modules wide");
        assert_binary(&upca);
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn upce_length_and_forms() {
        // 6 digits (number system 0, check computed).
        let short = encode_upce("123456").expect("valid UPC-E");
        // start(3) + 6 * 7 + end guard(6) = 51 modules.
        assert_eq!(short.len(), 51, "UPC-E is 51 modules wide");
        assert_binary(&short);
        // 8-digit form (number system + 6 + check) must agree with the 7-digit form.
        let seven = encode_upce("0123456").expect("valid 7-digit UPC-E");
        assert_eq!(short, seven, "number system 0 is the default");
        assert!(
            encode_upce("2123456").is_none(),
            "number system must be 0 or 1"
        );
        assert!(encode_upce("123").is_none(), "wrong length is rejected");
    }
}
