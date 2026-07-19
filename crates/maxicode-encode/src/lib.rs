//! Dependency-free MaxiCode encoder, compiled to WebAssembly for
//! `@mission-platform/code-scanner` via `wasm-bindgen` / `wasm-pack`.
//!
//! [`encode_maxicode`] renders a payload into a MaxiCode symbol as a packed
//! module matrix: a `[width_lo, width_hi, height_lo, height_hi, ...bits]` buffer
//! where each `bit` is `1` (dark module) or `0` (light), row-major over the fixed
//! `30 × 33` grid. This is the inverse of `mission-platform-maxicode-decode` and
//! seeds its round-trip tests.
//!
//! Scope: the encoder targets MaxiCode **mode 4** (standard symbol, no
//! structured carrier message) and **mode 5** (mode 4 with the higher
//! error-correction level), using the primary character sets A and B — enough to
//! encode ASCII payloads and prove the decoder round-trips. The decoder handles
//! ZXing's full mode 2–5 / five-set stream, so it reads real-world symbols
//! regardless.

use mission_platform_maxicode_common::{
    error_correction, place_codewords, HEIGHT, TOTAL_CODEWORDS, WIDTH,
};

#[cfg(feature = "wasm-api")]
use wasm_bindgen::prelude::*;

/// Codeword value of the latch that returns to / enters character set A or B.
/// In both set A and set B the latch to the *other* primary set is the last
/// (index 63) entry, so a single value flips between them.
const LATCH: u8 = 63;
/// Codeword value of the PAD character in set A (used to fill the tail).
const PAD_A: u8 = 33;

/// Initialise optional in-browser diagnostics when built with the `console`
/// feature. A no-op otherwise.
#[cfg(all(feature = "wasm-api", feature = "console"))]
#[tracing::instrument(skip_all)]
#[wasm_bindgen(start)]
pub fn start() {
    mission_platform_console_panic_hook::set_once();
    tracing_wasm::set_as_global_default();
}

/// Encode `data` as a MaxiCode symbol, returning the packed module matrix
/// (`[width_lo, width_hi, height_lo, height_hi, ...bits]`), or `undefined` (JS)
/// for an unknown symbology or unencodable payload. The `wasm-bindgen` wrapper
/// over [`encode_maxicode`]; gated behind `wasm-api`.
#[cfg(feature = "wasm-api")]
#[wasm_bindgen]
#[tracing::instrument(skip_all)]
pub fn encode(symbology: &str, data: &str) -> Option<Vec<u8>> {
    encode_maxicode(symbology, data)
}

/// The default MaxiCode mode generated symbols use (mode 4: standard symbol).
pub const DEFAULT_MODE: usize = 4;

/// Native entry point shared by [`encode`] and the round-trip tests. Supported
/// `symbology` values (case-insensitive): `maxicode`, `maxi-code`.
#[tracing::instrument(skip_all)]
pub fn encode_maxicode(symbology: &str, data: &str) -> Option<Vec<u8>> {
    match symbology.to_ascii_lowercase().as_str() {
        "maxicode" | "maxi-code" | "maxi_code" => {
            let modules = encode_maxicode_modules(data, DEFAULT_MODE)?;
            let mut out = Vec::with_capacity(4 + modules.len());
            out.extend_from_slice(&(WIDTH as u16).to_le_bytes());
            out.extend_from_slice(&(HEIGHT as u16).to_le_bytes());
            out.extend(modules);
            Some(out)
        }
        _ => None,
    }
}

/// Encode `data` at the given `mode` (4 or 5) into the fixed `WIDTH × HEIGHT`
/// (30 × 33) grid of module bits (`1` = dark, row-major) — exactly the array
/// `mission-platform-maxicode-decode::decode_maxicode_modules` consumes, so it
/// seeds the decoder's round-trip tests. Returns `None` for an unsupported mode
/// or a payload that does not fit / cannot be encoded in sets A/B.
pub fn encode_maxicode_modules(data: &str, mode: usize) -> Option<Vec<u8>> {
    let codewords = encode_codewords(data, mode)?;
    let bits = place_codewords(&codewords);
    Some(bits.into_iter().map(|b| u8::from(b)).collect())
}

/// Encode `data` at `mode` into the full 144-codeword array (primary block, its
/// EC, secondary block, its interleaved EC), ready for [`place_codewords`].
fn encode_codewords(data: &str, mode: usize) -> Option<[u8; TOTAL_CODEWORDS]> {
    // Mode-specific block geometry: (dataword count, secondary data, secondary
    // EC). The primary block is always 10 data + 10 EC.
    let (data_len, sec_data, sec_ec) = match mode {
        4 => (94usize, 84usize, 40usize),
        5 => (78usize, 68usize, 56usize),
        _ => return None,
    };

    // High-level encode the message into datawords: [mode] then the set A/B
    // stream, padded with set-A PAD to fill the block.
    let message = encode_message(data)?;
    if message.len() > data_len - 1 {
        return None;
    }
    let mut datawords = vec![0u8; data_len];
    datawords[0] = mode as u8;
    for (i, &cw) in message.iter().enumerate() {
        datawords[1 + i] = cw;
    }
    for cw in datawords.iter_mut().skip(1 + message.len()) {
        *cw = PAD_A;
    }

    let mut codewords = [0u8; TOTAL_CODEWORDS];
    // Primary block: 10 data + 10 EC.
    codewords[..10].copy_from_slice(&datawords[..10]);
    let primary_ec = error_correction(&datawords[..10], 10);
    codewords[10..20].copy_from_slice(&primary_ec);

    // Secondary block: `sec_data` data codewords, then `sec_ec` EC codewords
    // interleaved even/odd (each interleave RS-coded independently).
    let secondary = &datawords[10..10 + sec_data];
    codewords[20..20 + sec_data].copy_from_slice(secondary);

    let even_data: Vec<u8> = secondary.iter().step_by(2).copied().collect();
    let odd_data: Vec<u8> = secondary.iter().skip(1).step_by(2).copied().collect();
    let half_ec = sec_ec / 2;
    let even_ec = error_correction(&even_data, half_ec);
    let odd_ec = error_correction(&odd_data, half_ec);

    let ec_start = 20 + sec_data;
    for k in 0..half_ec {
        codewords[ec_start + 2 * k] = even_ec[k];
        codewords[ec_start + 2 * k + 1] = odd_ec[k];
    }

    Some(codewords)
}

/// High-level encode `data` into a MaxiCode message-codeword stream using the
/// primary character sets A and B, inserting a latch when the active set changes.
/// Returns `None` if a character is not encodable in either primary set.
fn encode_message(data: &str) -> Option<Vec<u8>> {
    let (rev_a, rev_b) = reverse_sets();
    let mut out: Vec<u8> = Vec::new();
    let mut set_a = true; // symbols start in set A
    for ch in data.chars() {
        // Prefer the currently active set to avoid a needless latch.
        let (target_a, idx) = if set_a {
            if let Some(&i) = rev_a.get(&ch) {
                (true, i)
            } else if let Some(&i) = rev_b.get(&ch) {
                (false, i)
            } else {
                return None;
            }
        } else if let Some(&i) = rev_b.get(&ch) {
            (false, i)
        } else if let Some(&i) = rev_a.get(&ch) {
            (true, i)
        } else {
            return None;
        };
        if target_a != set_a {
            out.push(LATCH);
            set_a = target_a;
        }
        out.push(idx);
    }
    Some(out)
}

/// Build reverse maps (character → codeword index) for primary sets A and B,
/// keyed only by real output characters (control tokens and structured-message
/// separators are skipped, so they never round-trip through the encoder).
fn reverse_sets() -> (
    std::collections::HashMap<char, u8>,
    std::collections::HashMap<char, u8>,
) {
    let mut rev_a = std::collections::HashMap::new();
    let mut rev_b = std::collections::HashMap::new();
    for (idx, ch) in set_a_chars().into_iter().enumerate() {
        if let Some(ch) = ch {
            rev_a.entry(ch).or_insert(idx as u8);
        }
    }
    for (idx, ch) in set_b_chars().into_iter().enumerate() {
        if let Some(ch) = ch {
            rev_b.entry(ch).or_insert(idx as u8);
        }
    }
    (rev_a, rev_b)
}

/// Set A (64 slots): the real output characters, `None` for control slots that
/// the encoder must not target. Mirrors the decoder's `SETS[0]` layout.
fn set_a_chars() -> [Option<char>; 64] {
    let mut s: [Option<char>; 64] = [None; 64];
    // 0: CR
    s[0] = Some('\r');
    // 1..=26: A..Z
    for (n, c) in ('A'..='Z').enumerate() {
        s[1 + n] = Some(c);
    }
    // 27..31: ECI, FS, GS, RS, NS (control) -> None
    // 32: space
    s[32] = Some(' ');
    // 33: PAD (control) -> None
    // 34..: "#$%&'()*+,-./0123456789:
    let tail = "\"#$%&'()*+,-./0123456789:";
    for (n, c) in tail.chars().enumerate() {
        s[34 + n] = Some(c);
    }
    // 59..63: SHIFTB, SHIFTC, SHIFTD, SHIFTE, LATCHB (control) -> None
    s
}

/// Set B (64 slots): the real output characters, `None` for control slots.
/// Mirrors the decoder's `SETS[1]` layout.
fn set_b_chars() -> [Option<char>; 64] {
    let mut s: [Option<char>; 64] = [None; 64];
    // 0: backtick
    s[0] = Some('`');
    // 1..=26: a..z
    for (n, c) in ('a'..='z').enumerate() {
        s[1 + n] = Some(c);
    }
    // 27..31: ECI, FS, GS, RS, NS (control) -> None
    // 32: '{'
    s[32] = Some('{');
    // 33: PAD (control) -> None
    // 34..: "}~\u007F;<=>?[\]^_ ,./:@!|"
    let tail = "}~\u{007F};<=>?[\\]^_ ,./:@!|";
    for (n, c) in tail.chars().enumerate() {
        s[34 + n] = Some(c);
    }
    // remaining slots after the tail up to 63 are control -> None
    s
}

#[cfg(all(test, not(target_arch = "wasm32")))]
mod tests {
    use super::*;

    #[test]
    fn rejects_unknown_symbology() {
        assert!(encode_maxicode("nope", "HELLO").is_none());
    }

    #[test]
    fn produces_a_full_grid() {
        let out = encode_maxicode("maxicode", "THIS IS A TEST 42").unwrap();
        // 4-byte header + 30*33 module bits.
        assert_eq!(out.len(), 4 + WIDTH * HEIGHT);
        assert_eq!(u16::from_le_bytes([out[0], out[1]]) as usize, WIDTH);
        assert_eq!(u16::from_le_bytes([out[2], out[3]]) as usize, HEIGHT);
    }

    #[test]
    fn set_layouts_have_expected_anchors() {
        let a = set_a_chars();
        assert_eq!(a[1], Some('A'));
        assert_eq!(a[26], Some('Z'));
        assert_eq!(a[32], Some(' '));
        assert_eq!(a[48], Some('0'));
        let b = set_b_chars();
        assert_eq!(b[1], Some('a'));
        assert_eq!(b[26], Some('z'));
    }
}
