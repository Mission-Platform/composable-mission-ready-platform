//! MSI (Modified Plessey) decoder. A `110` start and a `1001` stop frame the
//! symbol; between them each digit is four BCD bits, every bit drawn as three
//! modules (`110` for a `1` bit, `100` for a `0` bit). The trailing mod-10 check
//! digit is stripped from the returned payload.

/// Start / stop module patterns.
const START: [u8; 3] = [1, 1, 0];
const STOP: [u8; 4] = [1, 0, 0, 1];

/// Decode one three-module group into its BCD bit: `110` -> `1`, `100` -> `0`.
#[tracing::instrument(skip_all)]
fn bit_for(group: &[u8]) -> Option<u8> {
    match group {
        [1, 1, 0] => Some(1),
        [1, 0, 0] => Some(0),
        _ => None,
    }
}

/// Decode an MSI module run into its digit string (excluding the check digit).
/// Returns `None` when the framing or any digit group is invalid.
#[tracing::instrument(skip_all)]
pub fn decode(modules: &[u8]) -> Option<String> {
    let body = modules.strip_prefix(&START)?.strip_suffix(&STOP)?;
    if body.is_empty() || body.len() % 12 != 0 {
        return None;
    }

    let mut digits = String::new();
    for digit_group in body.chunks_exact(12) {
        let mut value = 0u8;
        for bit_group in digit_group.chunks_exact(3) {
            value = (value << 1) | bit_for(bit_group)?;
        }
        if value > 9 {
            return None;
        }
        digits.push((b'0' + value) as char);
    }

    // The final digit is the mod-10 check digit; drop it from the payload.
    digits.pop()?;
    Some(digits)
}
