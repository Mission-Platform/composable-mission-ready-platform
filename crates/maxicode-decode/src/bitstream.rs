//! MaxiCode high-level bit-stream parser: turns the corrected six-bit datawords
//! back into text. Faithful port of ZXing `DecodedBitStreamParser`.

// Control tokens live in the Unicode private-use area so they can share the
// `char` type with real output characters in the `SETS` tables.
const SHIFTA: char = '\u{FFF0}';
const SHIFTB: char = '\u{FFF1}';
const SHIFTC: char = '\u{FFF2}';
const SHIFTD: char = '\u{FFF3}';
const SHIFTE: char = '\u{FFF4}';
const TWOSHIFTA: char = '\u{FFF5}';
const THREESHIFTA: char = '\u{FFF6}';
const LATCHA: char = '\u{FFF7}';
const LATCHB: char = '\u{FFF8}';
const LOCK: char = '\u{FFF9}';
const ECI: char = '\u{FFFA}';
const NS: char = '\u{FFFB}';
const PAD: char = '\u{FFFC}';
const FS: char = '\u{001C}';
const GS: char = '\u{001D}';
const RS: char = '\u{001E}';

const COUNTRY_BYTES: [usize; 10] = [53, 54, 43, 44, 45, 46, 47, 48, 37, 38];
const SERVICE_CLASS_BYTES: [usize; 10] = [55, 56, 57, 58, 59, 60, 49, 50, 51, 52];
const POSTCODE_2_LENGTH_BYTES: [usize; 6] = [39, 40, 41, 42, 31, 32];
const POSTCODE_2_BYTES: [usize; 30] = [
    33, 34, 35, 36, 25, 26, 27, 28, 29, 30, 19, 20, 21, 22, 23, 24, 13, 14, 15, 16, 17, 18, 7, 8,
    9, 10, 11, 12, 1, 2,
];
const POSTCODE_3_BYTES: [[usize; 6]; 6] = [
    [39, 40, 41, 42, 31, 32],
    [33, 34, 35, 36, 25, 26],
    [27, 28, 29, 30, 19, 20],
    [21, 22, 23, 24, 13, 14],
    [15, 16, 17, 18, 7, 8],
    [9, 10, 11, 12, 1, 2],
];

/// Build the five 64-entry character sets from the ZXing string literals.
fn sets() -> [Vec<char>; 5] {
    let set0: Vec<char> = format!(
        "\rABCDEFGHIJKLMNOPQRSTUVWXYZ{ECI}{FS}{GS}{RS}{NS} {PAD}\"#$%&'()*+,-./0123456789:{SHIFTB}{SHIFTC}{SHIFTD}{SHIFTE}{LATCHB}"
    )
    .chars()
    .collect();
    let set1: Vec<char> = format!(
        "`abcdefghijklmnopqrstuvwxyz{ECI}{FS}{GS}{RS}{NS}{{{PAD}}}~\u{007F};<=>?[\\]^_ ,./:@!|{PAD}{TWOSHIFTA}{THREESHIFTA}{PAD}{SHIFTA}{SHIFTC}{SHIFTD}{SHIFTE}{LATCHA}"
    )
    .chars()
    .collect();
    let set2: Vec<char> = format!(
        "\u{00C0}\u{00C1}\u{00C2}\u{00C3}\u{00C4}\u{00C5}\u{00C6}\u{00C7}\u{00C8}\u{00C9}\u{00CA}\u{00CB}\u{00CC}\u{00CD}\u{00CE}\u{00CF}\u{00D0}\u{00D1}\u{00D2}\u{00D3}\u{00D4}\u{00D5}\u{00D6}\u{00D7}\u{00D8}\u{00D9}\u{00DA}{ECI}{FS}{GS}{RS}{NS}\u{00DB}\u{00DC}\u{00DD}\u{00DE}\u{00DF}\u{00AA}\u{00AC}\u{00B1}\u{00B2}\u{00B3}\u{00B5}\u{00B9}\u{00BA}\u{00BC}\u{00BD}\u{00BE}\u{0080}\u{0081}\u{0082}\u{0083}\u{0084}\u{0085}\u{0086}\u{0087}\u{0088}\u{0089}{LATCHA} {LOCK}{SHIFTD}{SHIFTE}{LATCHB}"
    )
    .chars()
    .collect();
    let set3: Vec<char> = format!(
        "\u{00E0}\u{00E1}\u{00E2}\u{00E3}\u{00E4}\u{00E5}\u{00E6}\u{00E7}\u{00E8}\u{00E9}\u{00EA}\u{00EB}\u{00EC}\u{00ED}\u{00EE}\u{00EF}\u{00F0}\u{00F1}\u{00F2}\u{00F3}\u{00F4}\u{00F5}\u{00F6}\u{00F7}\u{00F8}\u{00F9}\u{00FA}{ECI}{FS}{GS}{RS}{NS}\u{00FB}\u{00FC}\u{00FD}\u{00FE}\u{00FF}\u{00A1}\u{00A8}\u{00AB}\u{00AF}\u{00B0}\u{00B4}\u{00B7}\u{00B8}\u{00BB}\u{00BF}\u{008A}\u{008B}\u{008C}\u{008D}\u{008E}\u{008F}\u{0090}\u{0091}\u{0092}\u{0093}\u{0094}{LATCHA} {SHIFTC}{LOCK}{SHIFTE}{LATCHB}"
    )
    .chars()
    .collect();
    let set4: Vec<char> = format!(
        "\u{0000}\u{0001}\u{0002}\u{0003}\u{0004}\u{0005}\u{0006}\u{0007}\u{0008}\u{0009}\n\u{000B}\u{000C}\r\u{000E}\u{000F}\u{0010}\u{0011}\u{0012}\u{0013}\u{0014}\u{0015}\u{0016}\u{0017}\u{0018}\u{0019}\u{001A}{ECI}{PAD}{PAD}\u{001B}{NS}{FS}{GS}{RS}\u{001F}\u{009F}\u{00A0}\u{00A2}\u{00A3}\u{00A4}\u{00A5}\u{00A6}\u{00A7}\u{00A9}\u{00AD}\u{00AE}\u{00B6}\u{0095}\u{0096}\u{0097}\u{0098}\u{0099}\u{009A}\u{009B}\u{009C}\u{009D}\u{009E}{LATCHA} {SHIFTC}{SHIFTD}{LOCK}{LATCHB}"
    )
    .chars()
    .collect();
    [set0, set1, set2, set3, set4]
}

/// Decode the corrected `datawords` (six-bit values) at `mode` (2..5) into the
/// payload string, or `None` on a malformed stream.
pub fn decode(datawords: &[u8], mode: usize) -> Option<String> {
    let sets = sets();
    let mut result = String::new();
    match mode {
        2 | 3 => {
            let postcode = if mode == 2 {
                let pc = get_int(datawords, &POSTCODE_2_BYTES);
                let len = get_int(datawords, &POSTCODE_2_LENGTH_BYTES) as usize;
                if len > 10 {
                    return None;
                }
                format!("{:0width$}", pc, width = len)
            } else {
                get_post_code_3(datawords, &sets)
            };
            let country = format!("{:03}", get_int(datawords, &COUNTRY_BYTES));
            let service = format!("{:03}", get_int(datawords, &SERVICE_CLASS_BYTES));
            result.push_str(&get_message(datawords, 10, 84, &sets)?);
            let prefix = format!("[)>{RS}01{GS}");
            let insert = format!("{postcode}{GS}{country}{GS}{service}{GS}");
            if result.starts_with(&prefix) {
                if result.chars().count() < 9 {
                    return None;
                }
                insert_at_char(&mut result, 9, &insert);
            } else {
                result.insert_str(0, &insert);
            }
        }
        4 => result.push_str(&get_message(datawords, 1, 93, &sets)?),
        5 => result.push_str(&get_message(datawords, 1, 77, &sets)?),
        _ => return None,
    }
    Some(result)
}

/// Read a single bit (1-based `bit` index) out of the six-bit datawords.
fn get_bit(bit: usize, bytes: &[u8]) -> u32 {
    let bit = bit - 1;
    let byte = bytes.get(bit / 6).copied().unwrap_or(0);
    if byte & (1 << (5 - (bit % 6))) == 0 {
        0
    } else {
        1
    }
}

/// Read a big-endian integer out of the given bit positions.
fn get_int(bytes: &[u8], positions: &[usize]) -> u32 {
    let mut val = 0u32;
    let n = positions.len();
    for (i, &p) in positions.iter().enumerate() {
        val += get_bit(p, bytes) << (n - i - 1);
    }
    val
}

fn get_post_code_3(bytes: &[u8], sets: &[Vec<char>; 5]) -> String {
    let mut s = String::new();
    for p3 in POSTCODE_3_BYTES.iter() {
        s.push(sets[0][get_int(bytes, p3) as usize]);
    }
    s
}

/// Insert `insert` after `char_index` characters of `s` (character-aware, since
/// MaxiCode text can contain multi-byte UTF-8).
fn insert_at_char(s: &mut String, char_index: usize, insert: &str) {
    let byte_index = s
        .char_indices()
        .nth(char_index)
        .map(|(i, _)| i)
        .unwrap_or(s.len());
    s.insert_str(byte_index, insert);
}

/// Port of ZXing `DecodedBitStreamParser.getMessage`: walk `len` datawords from
/// `start`, applying latches/shifts across the five character sets.
fn get_message(bytes: &[u8], start: usize, len: usize, sets: &[Vec<char>; 5]) -> Option<String> {
    let mut sb = String::new();
    let mut shift: i32 = -1;
    let mut set = 0usize;
    let mut lastset = 0usize;
    let mut i = start;
    while i < start + len {
        let idx = *bytes.get(i)? as usize;
        let c = *sets[set].get(idx)?;
        match c {
            LATCHA => {
                set = 0;
                shift = -1;
            }
            LATCHB => {
                set = 1;
                shift = -1;
            }
            SHIFTA | SHIFTB | SHIFTC | SHIFTD | SHIFTE => {
                lastset = set;
                set = (c as u32 - SHIFTA as u32) as usize;
                shift = 1;
            }
            TWOSHIFTA => {
                lastset = set;
                set = 0;
                shift = 2;
            }
            THREESHIFTA => {
                lastset = set;
                set = 0;
                shift = 3;
            }
            NS => {
                if i + 5 >= start + len {
                    return None;
                }
                let mut nsval: i64 = 0;
                nsval += (*bytes.get(i + 1)? as i64) << 24;
                nsval += (*bytes.get(i + 2)? as i64) << 18;
                nsval += (*bytes.get(i + 3)? as i64) << 12;
                nsval += (*bytes.get(i + 4)? as i64) << 6;
                nsval += *bytes.get(i + 5)? as i64;
                i += 5;
                sb.push_str(&format!("{:09}", nsval));
            }
            LOCK => {
                shift = -1;
            }
            _ => sb.push(c),
        }
        // Decrement, matching Java's `shift-- == 0` (post-decrement).
        let was = shift;
        shift -= 1;
        if was == 0 {
            set = lastset;
        }
        i += 1;
    }
    while sb.ends_with(PAD) {
        sb.pop();
    }
    Some(sb)
}
