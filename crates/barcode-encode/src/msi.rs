//! MSI (Modified Plessey): a continuous numeric symbology. Each digit is a
//! four-bit BCD value; every bit expands to three modules (`100` for a `0` bit,
//! `110` for a `1` bit). A `110` start pattern and a `1001` stop pattern frame
//! the symbol, and a single mod-10 (Luhn-style) check digit is appended.

/// Module bits for the start pattern.
const START: [u8; 3] = [1, 1, 0];
/// Module bits for the stop pattern.
const STOP: [u8; 4] = [1, 0, 0, 1];

/// Append the three module bits for one BCD bit: `110` for `1`, `100` for `0`.
#[tracing::instrument(skip_all)]
fn push_bit(bit: bool, modules: &mut Vec<u8>) {
    modules.extend(if bit { [1, 1, 0] } else { [1, 0, 0] });
}

/// Append the twelve module bits (four BCD bits) for one digit.
#[tracing::instrument(skip_all)]
fn push_digit(digit: u8, modules: &mut Vec<u8>) {
    for shift in (0..4).rev() {
        push_bit((digit >> shift) & 1 == 1, modules);
    }
}

/// Sum the decimal digits of `value * 2` without overflowing on long inputs.
#[tracing::instrument(skip_all)]
fn digit_sum_of_double(digits: &[u8]) -> u32 {
    let mut carry = 0u32;
    let mut sum = 0u32;
    for &digit in digits.iter().rev() {
        let doubled = digit as u32 * 2 + carry;
        sum += doubled % 10;
        carry = doubled / 10;
    }
    while carry > 0 {
        sum += carry % 10;
        carry /= 10;
    }
    sum
}

/// The MSI mod-10 check digit: double the odd-position digits (read as one
/// number), sum that product's digits, add the even-position digits.
#[tracing::instrument(skip_all)]
pub fn mod10_check(digits: &[u8]) -> u8 {
    let mut odd = Vec::new();
    let mut even_sum = 0u32;
    for (index, &digit) in digits.iter().enumerate() {
        let position_from_right = digits.len() - index;
        if position_from_right % 2 == 1 {
            odd.push(digit);
        } else {
            even_sum += digit as u32;
        }
    }
    let sum = digit_sum_of_double(&odd) + even_sum;
    ((10 - (sum % 10)) % 10) as u8
}

/// Encode `data` (digits only) as MSI with an appended mod-10 check digit.
/// Returns `None` for empty or non-digit input.
#[tracing::instrument(skip_all)]
pub fn encode(data: &str) -> Option<Vec<u8>> {
    if data.is_empty() {
        return None;
    }
    let mut digits: Vec<u8> = data
        .chars()
        .map(|character| character.to_digit(10).map(|value| value as u8))
        .collect::<Option<Vec<_>>>()?;
    digits.push(mod10_check(&digits));

    let mut modules = Vec::new();
    modules.extend(START);
    for &digit in &digits {
        push_digit(digit, &mut modules);
    }
    modules.extend(STOP);
    Some(modules)
}

#[cfg(test)]
mod tests {
    use super::{encode, mod10_check};

    #[test]
    #[tracing::instrument(skip_all)]
    fn matches_the_reference_check_digit() {
        // Wikipedia worked example: 1234567 -> check digit 4.
        assert_eq!(mod10_check(&[1, 2, 3, 4, 5, 6, 7]), 4);
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn frames_and_is_binary() {
        let modules = encode("1234").expect("valid MSI");
        // start(3) + 5 digits * 12 + stop(4) = 67.
        assert_eq!(modules.len(), 3 + 5 * 12 + 4);
        assert_eq!(modules[0], 1, "starts with a bar");
        assert!(modules.iter().all(|&bit| bit <= 1), "modules must be 0/1");
        assert!(encode("12a").is_none(), "non-digits are rejected");
        assert!(encode("").is_none(), "empty payload is rejected");
    }
}
