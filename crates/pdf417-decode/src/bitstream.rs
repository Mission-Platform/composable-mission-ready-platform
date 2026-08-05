//! PDF417 high-level bit-stream parser: converts a corrected codeword array into
//! its decoded string. Port of ZXing's `DecodedBitStreamParser` covering the
//! Text, Byte and Numeric compaction modes (the modes the corpus uses).

const TEXT_COMPACTION_MODE_LATCH: i32 = 900;
const BYTE_COMPACTION_MODE_LATCH: i32 = 901;
const NUMERIC_COMPACTION_MODE_LATCH: i32 = 902;
const BYTE_COMPACTION_MODE_LATCH_6: i32 = 924;
const MODE_SHIFT_TO_BYTE_COMPACTION_MODE: i32 = 913;
const MAX_NUMERIC_CODEWORDS: usize = 15;

const PL: i32 = 25;
const LL: i32 = 27;
const AS: i32 = 27;
const ML: i32 = 28;
const AL: i32 = 28;
const PS: i32 = 29;
const PAL: i32 = 29;

const PUNCT_CHARS: &[u8] = b";<>@[\\]_`~!\r\t,:\n-.$/\"|*()?{}'";
const MIXED_CHARS: &[u8] = b"0123456789&\r\t,:#-.$/+%*=^";

#[derive(Clone, Copy, PartialEq)]
enum Mode {
    Alpha,
    Lower,
    Mixed,
    Punct,
    AlphaShift,
    PunctShift,
}

/// Decode a corrected codeword array (`codewords[0]` = data codeword count) to
/// its string payload, or `None` on a malformed stream.
pub fn decode(codewords: &[i32]) -> Option<String> {
    let count = *codewords.first()? as usize;
    if count == 0 || count > codewords.len() {
        return None;
    }
    let mut result = String::new();
    let mut code_index = text_compaction(codewords, 1, count, &mut result);
    while code_index < count {
        let code = codewords[code_index];
        code_index += 1;
        match code {
            TEXT_COMPACTION_MODE_LATCH => {
                code_index = text_compaction(codewords, code_index, count, &mut result);
            }
            BYTE_COMPACTION_MODE_LATCH | BYTE_COMPACTION_MODE_LATCH_6 => {
                code_index = byte_compaction(code, codewords, code_index, count, &mut result)?;
            }
            MODE_SHIFT_TO_BYTE_COMPACTION_MODE => {
                if code_index >= count {
                    return None;
                }
                result.push(codewords[code_index] as u8 as char);
                code_index += 1;
            }
            NUMERIC_COMPACTION_MODE_LATCH => {
                code_index = numeric_compaction(codewords, code_index, count, &mut result)?;
            }
            _ => {
                // Default to text compaction (some symbols omit the start mode).
                // `text_compaction` returns without consuming when the codeword
                // at this position is an unhandled high value (e.g. a corrupted
                // stream), so bail if it makes no progress — otherwise the outer
                // loop would spin forever re-reading the same codeword.
                let start = code_index - 1;
                code_index = text_compaction(codewords, start, count, &mut result);
                if code_index <= start {
                    return None;
                }
            }
        }
    }
    if result.is_empty() {
        return None;
    }
    Some(result)
}

fn text_compaction(
    codewords: &[i32],
    mut code_index: usize,
    count: usize,
    result: &mut String,
) -> usize {
    let mut text_data: Vec<i32> = Vec::new();
    let mut byte_data: Vec<i32> = Vec::new();
    let mut end = false;
    let mut sub_mode = Mode::Alpha;
    while code_index < count && !end {
        let code = codewords[code_index];
        code_index += 1;
        if code < TEXT_COMPACTION_MODE_LATCH {
            text_data.push(code / 30);
            byte_data.push(0);
            text_data.push(code % 30);
            byte_data.push(0);
        } else {
            match code {
                TEXT_COMPACTION_MODE_LATCH => {
                    text_data.push(TEXT_COMPACTION_MODE_LATCH);
                    byte_data.push(0);
                }
                BYTE_COMPACTION_MODE_LATCH
                | BYTE_COMPACTION_MODE_LATCH_6
                | NUMERIC_COMPACTION_MODE_LATCH => {
                    code_index -= 1;
                    end = true;
                }
                MODE_SHIFT_TO_BYTE_COMPACTION_MODE => {
                    text_data.push(MODE_SHIFT_TO_BYTE_COMPACTION_MODE);
                    if code_index >= count {
                        end = true;
                    } else {
                        byte_data.push(codewords[code_index]);
                        code_index += 1;
                    }
                }
                _ => {
                    code_index -= 1;
                    end = true;
                }
            }
        }
    }
    decode_text_compaction(&text_data, &byte_data, result, sub_mode, &mut sub_mode);
    code_index
}

fn decode_text_compaction(
    text_data: &[i32],
    byte_data: &[i32],
    result: &mut String,
    start_mode: Mode,
    _latched_out: &mut Mode,
) {
    let mut sub_mode = start_mode;
    let mut prior_to_shift = start_mode;
    let mut i = 0;
    while i < text_data.len() {
        let sub_ch = text_data[i];
        let mut ch: u8 = 0;
        match sub_mode {
            Mode::Alpha => {
                if sub_ch < 26 {
                    ch = b'A' + sub_ch as u8;
                } else if sub_ch == 26 {
                    ch = b' ';
                } else if sub_ch == LL {
                    sub_mode = Mode::Lower;
                } else if sub_ch == ML {
                    sub_mode = Mode::Mixed;
                } else if sub_ch == PS {
                    prior_to_shift = sub_mode;
                    sub_mode = Mode::PunctShift;
                } else if sub_ch == MODE_SHIFT_TO_BYTE_COMPACTION_MODE {
                    result.push(byte_data[i] as u8 as char);
                } else if sub_ch == TEXT_COMPACTION_MODE_LATCH {
                    sub_mode = Mode::Alpha;
                }
            }
            Mode::Lower => {
                if sub_ch < 26 {
                    ch = b'a' + sub_ch as u8;
                } else if sub_ch == 26 {
                    ch = b' ';
                } else if sub_ch == AS {
                    prior_to_shift = sub_mode;
                    sub_mode = Mode::AlphaShift;
                } else if sub_ch == ML {
                    sub_mode = Mode::Mixed;
                } else if sub_ch == PS {
                    prior_to_shift = sub_mode;
                    sub_mode = Mode::PunctShift;
                } else if sub_ch == MODE_SHIFT_TO_BYTE_COMPACTION_MODE {
                    result.push(byte_data[i] as u8 as char);
                } else if sub_ch == TEXT_COMPACTION_MODE_LATCH {
                    sub_mode = Mode::Alpha;
                }
            }
            Mode::Mixed => {
                if sub_ch < PL {
                    ch = MIXED_CHARS[sub_ch as usize];
                } else if sub_ch == PL {
                    sub_mode = Mode::Punct;
                } else if sub_ch == 26 {
                    ch = b' ';
                } else if sub_ch == LL {
                    sub_mode = Mode::Lower;
                } else if sub_ch == AL || sub_ch == TEXT_COMPACTION_MODE_LATCH {
                    sub_mode = Mode::Alpha;
                } else if sub_ch == PS {
                    prior_to_shift = sub_mode;
                    sub_mode = Mode::PunctShift;
                } else if sub_ch == MODE_SHIFT_TO_BYTE_COMPACTION_MODE {
                    result.push(byte_data[i] as u8 as char);
                }
            }
            Mode::Punct => {
                if sub_ch < PAL {
                    ch = PUNCT_CHARS[sub_ch as usize];
                } else if sub_ch == PAL || sub_ch == TEXT_COMPACTION_MODE_LATCH {
                    sub_mode = Mode::Alpha;
                } else if sub_ch == MODE_SHIFT_TO_BYTE_COMPACTION_MODE {
                    result.push(byte_data[i] as u8 as char);
                }
            }
            Mode::AlphaShift => {
                sub_mode = prior_to_shift;
                if sub_ch < 26 {
                    ch = b'A' + sub_ch as u8;
                } else if sub_ch == 26 {
                    ch = b' ';
                } else if sub_ch == TEXT_COMPACTION_MODE_LATCH {
                    sub_mode = Mode::Alpha;
                }
            }
            Mode::PunctShift => {
                sub_mode = prior_to_shift;
                if sub_ch < PAL {
                    ch = PUNCT_CHARS[sub_ch as usize];
                } else if sub_ch == PAL || sub_ch == TEXT_COMPACTION_MODE_LATCH {
                    sub_mode = Mode::Alpha;
                } else if sub_ch == MODE_SHIFT_TO_BYTE_COMPACTION_MODE {
                    result.push(byte_data[i] as u8 as char);
                }
            }
        }
        if ch != 0 {
            result.push(ch as char);
        }
        i += 1;
    }
}

fn byte_compaction(
    mode: i32,
    codewords: &[i32],
    mut code_index: usize,
    count: usize,
    result: &mut String,
) -> Option<usize> {
    let mut end = false;
    let mut bytes: Vec<u8> = Vec::new();
    while code_index < count && !end {
        if code_index >= count || codewords[code_index] >= TEXT_COMPACTION_MODE_LATCH {
            end = true;
        } else {
            let mut value: u64 = 0;
            let mut n = 0;
            loop {
                value = 900 * value + codewords[code_index] as u64;
                code_index += 1;
                n += 1;
                if !(n < 5
                    && code_index < count
                    && codewords[code_index] < TEXT_COMPACTION_MODE_LATCH)
                {
                    break;
                }
            }
            if n == 5
                && (mode == BYTE_COMPACTION_MODE_LATCH_6
                    || (code_index < count && codewords[code_index] < TEXT_COMPACTION_MODE_LATCH))
            {
                for i in 0..6 {
                    bytes.push((value >> (8 * (5 - i))) as u8);
                }
            } else {
                code_index -= n;
                while code_index < count && !end {
                    let code = codewords[code_index];
                    code_index += 1;
                    if code < TEXT_COMPACTION_MODE_LATCH {
                        bytes.push(code as u8);
                    } else {
                        code_index -= 1;
                        end = true;
                    }
                }
            }
        }
    }
    for &b in &bytes {
        result.push(b as char);
    }
    Some(code_index)
}

fn numeric_compaction(
    codewords: &[i32],
    mut code_index: usize,
    count: usize,
    result: &mut String,
) -> Option<usize> {
    let mut n = 0;
    let mut end = false;
    let mut numeric: [i32; MAX_NUMERIC_CODEWORDS] = [0; MAX_NUMERIC_CODEWORDS];
    while code_index < count && !end {
        let code = codewords[code_index];
        code_index += 1;
        if code_index == count {
            end = true;
        }
        if code < TEXT_COMPACTION_MODE_LATCH {
            numeric[n] = code;
            n += 1;
        } else if matches!(
            code,
            TEXT_COMPACTION_MODE_LATCH | BYTE_COMPACTION_MODE_LATCH | BYTE_COMPACTION_MODE_LATCH_6
        ) {
            code_index -= 1;
            end = true;
        }
        if (n % MAX_NUMERIC_CODEWORDS == 0 || code == NUMERIC_COMPACTION_MODE_LATCH || end) && n > 0
        {
            result.push_str(&decode_base900_to_base10(&numeric[..n])?);
            n = 0;
        }
    }
    Some(code_index)
}

/// Convert `count` base-900 numeric codewords to their base-10 digit string.
/// Uses u128 (enough for 15 codewords: max ~44 digits fits comfortably below
/// the 15-codeword grouping ZXing enforces).
fn decode_base900_to_base10(codewords: &[i32]) -> Option<String> {
    let mut result: u128 = 0;
    for &c in codewords {
        result = result.checked_mul(900)?.checked_add(c as u128)?;
    }
    let s = result.to_string();
    if !s.starts_with('1') {
        return None;
    }
    Some(s[1..].to_string())
}
