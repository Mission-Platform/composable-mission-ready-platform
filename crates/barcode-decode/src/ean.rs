//! EAN-13 / EAN-8 / UPC-A / UPC-E decoder. Each digit is a seven-module cell;
//! guard patterns frame and split the halves. EAN-13 recovers its implicit
//! leading digit from the left-half L/G parity pattern; UPC-E recovers its
//! number system and check digit likewise. The code tables mirror the encoder.

/// Left-hand odd-parity (L) digit encodings.
const L_CODES: [&str; 10] = [
    "0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011",
    "0110111", "0001011",
];
/// Left-hand even-parity (G) digit encodings.
const G_CODES: [&str; 10] = [
    "0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001",
    "0001001", "0010111",
];
/// Right-hand (R) digit encodings.
const R_CODES: [&str; 10] = [
    "1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100",
    "1001000", "1110100",
];

/// EAN-13 leading-digit parity pattern (`true` = even / G) for each first digit.
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

/// UPC-E parity pattern (number system `0`) for each check digit.
const UPCE_PARITY: [[bool; 6]; 10] = [
    [true, true, true, false, false, false],
    [true, true, false, true, false, false],
    [true, true, false, false, true, false],
    [true, true, false, false, false, true],
    [true, false, true, true, false, false],
    [true, false, false, true, true, false],
    [true, false, false, false, true, true],
    [true, false, true, false, true, false],
    [true, false, true, false, false, true],
    [true, false, false, true, false, true],
];

/// Render a seven-module cell as a `0`/`1` string.
#[tracing::instrument(skip_all)]
fn cell_string(cell: &[u8]) -> String {
    cell.iter()
        .map(|&bit| if bit == 1 { '1' } else { '0' })
        .collect()
}

/// Match a left-half cell against the L and G tables, returning the digit and
/// whether it used even (G) parity.
#[tracing::instrument(skip_all)]
fn left_cell(cell: &[u8]) -> Option<(u8, bool)> {
    let pattern = cell_string(cell);
    if let Some(value) = L_CODES.iter().position(|&code| code == pattern) {
        return Some((value as u8, false));
    }
    G_CODES
        .iter()
        .position(|&code| code == pattern)
        .map(|value| (value as u8, true))
}

/// Match a right-half cell against the R table.
#[tracing::instrument(skip_all)]
fn right_cell(cell: &[u8]) -> Option<u8> {
    let pattern = cell_string(cell);
    R_CODES
        .iter()
        .position(|&code| code == pattern)
        .map(|value| value as u8)
}

/// Decode EAN-13 (95 modules): `101` + six L/G cells + `01010` + six R cells + `101`.
#[tracing::instrument(skip_all)]
pub fn decode_ean13(modules: &[u8]) -> Option<String> {
    if modules.len() != 95 {
        return None;
    }
    let mut parity = [false; 6];
    let mut digits = String::new();
    for index in 0..6 {
        let start = 3 + index * 7;
        let (value, even) = left_cell(&modules[start..start + 7])?;
        parity[index] = even;
        digits.push((b'0' + value) as char);
    }
    let first = PARITY.iter().position(|candidate| *candidate == parity)? as u8;

    let mut right = String::new();
    for index in 0..6 {
        let start = 50 + index * 7;
        right.push((b'0' + right_cell(&modules[start..start + 7])?) as char);
    }
    Some(format!("{first}{digits}{right}"))
}

/// Decode UPC-A (95 modules): `101` + six L cells + `01010` + six R cells + `101`.
#[tracing::instrument(skip_all)]
pub fn decode_upca(modules: &[u8]) -> Option<String> {
    if modules.len() != 95 {
        return None;
    }
    let mut digits = String::new();
    for index in 0..6 {
        let start = 3 + index * 7;
        let (value, _) = left_cell(&modules[start..start + 7])?;
        digits.push((b'0' + value) as char);
    }
    for index in 0..6 {
        let start = 50 + index * 7;
        digits.push((b'0' + right_cell(&modules[start..start + 7])?) as char);
    }
    Some(digits)
}

/// Decode EAN-8 (67 modules): `101` + four L cells + `01010` + four R cells + `101`.
#[tracing::instrument(skip_all)]
pub fn decode_ean8(modules: &[u8]) -> Option<String> {
    if modules.len() != 67 {
        return None;
    }
    let mut digits = String::new();
    for index in 0..4 {
        let start = 3 + index * 7;
        let (value, _) = left_cell(&modules[start..start + 7])?;
        digits.push((b'0' + value) as char);
    }
    for index in 0..4 {
        let start = 36 + index * 7;
        digits.push((b'0' + right_cell(&modules[start..start + 7])?) as char);
    }
    Some(digits)
}

/// Decode UPC-E (51 modules): `101` + six L/G cells + `010101`. Returns the
/// eight-digit `number system + six digits + check digit` form.
#[tracing::instrument(skip_all)]
pub fn decode_upce(modules: &[u8]) -> Option<String> {
    if modules.len() != 51 {
        return None;
    }
    let mut parity = [false; 6];
    let mut digits = String::new();
    for index in 0..6 {
        let start = 3 + index * 7;
        let (value, even) = left_cell(&modules[start..start + 7])?;
        parity[index] = even;
        digits.push((b'0' + value) as char);
    }

    // Number system 0 uses the parity table directly; number system 1 inverts it.
    let inverted: [bool; 6] = std::array::from_fn(|index| !parity[index]);
    let (number_system, check) = if let Some(check) = UPCE_PARITY.iter().position(|c| *c == parity)
    {
        (0u8, check as u8)
    } else if let Some(check) = UPCE_PARITY.iter().position(|c| *c == inverted) {
        (1u8, check as u8)
    } else {
        return None;
    };

    Some(format!("{number_system}{digits}{check}"))
}
