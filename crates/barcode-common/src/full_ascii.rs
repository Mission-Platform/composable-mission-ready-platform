//! The Code 39 / Code 93 "full ASCII" shift table.
//!
//! Both extended symbologies encode the 128 ASCII code points as sequences of
//! base characters (`0`–`9`, `A`–`Z`, space, `-`, `.`) optionally prefixed by
//! one of four shift characters (`$`, `%`, `/`, `+`). The mapping is identical
//! for both symbologies; only the way the four shift characters are drawn
//! differs (Code 39 uses the printable glyphs directly, Code 93 uses its four
//! `(a)`–`(d)` control patterns). Keeping the table here lets the encoder and
//! decoder — and both symbologies — share exactly one definition.

/// For each ASCII byte `0..=127`, the one- or two-character shift sequence that
/// represents it. Entries use only the base alphabet plus the four shift
/// characters `$ % / +`.
pub const FULL_ASCII: [&str; 128] = [
    "%U", "$A", "$B", "$C", "$D", "$E", "$F", "$G", // 0..7
    "$H", "$I", "$J", "$K", "$L", "$M", "$N", "$O", // 8..15
    "$P", "$Q", "$R", "$S", "$T", "$U", "$V", "$W", // 16..23
    "$X", "$Y", "$Z", "%A", "%B", "%C", "%D", "%E", // 24..31
    " ", "/A", "/B", "/C", "/D", "/E", "/F", "/G", // 32..39
    "/H", "/I", "/J", "/K", "/L", "-", ".", "/O", // 40..47
    "0", "1", "2", "3", "4", "5", "6", "7", // 48..55
    "8", "9", "/Z", "%F", "%G", "%H", "%I", "%J", // 56..63
    "%V", "A", "B", "C", "D", "E", "F", "G", // 64..71
    "H", "I", "J", "K", "L", "M", "N", "O", // 72..79
    "P", "Q", "R", "S", "T", "U", "V", "W", // 80..87
    "X", "Y", "Z", "%K", "%L", "%M", "%N", "%O", // 88..95
    "%W", "+A", "+B", "+C", "+D", "+E", "+F", "+G", // 96..103
    "+H", "+I", "+J", "+K", "+L", "+M", "+N", "+O", // 104..111
    "+P", "+Q", "+R", "+S", "+T", "+U", "+V", "+W", // 112..119
    "+X", "+Y", "+Z", "%P", "%Q", "%R", "%S", "%T", // 120..127
];

/// Encode a single ASCII byte into its full-ASCII shift sequence, or `None` when
/// the byte is outside the 7-bit ASCII range.
#[tracing::instrument(skip_all)]
pub fn encode_byte(byte: u8) -> Option<&'static str> {
    FULL_ASCII.get(byte as usize).copied()
}

/// Fold a run of decoded base characters (as produced by a Code 39 / Code 93
/// decoder) back into the original ASCII string, applying the shift characters.
/// Returns `None` when a shift character is dangling or forms an invalid pair.
#[tracing::instrument(skip_all)]
pub fn decode_sequence(base: &str) -> Option<String> {
    let mut out = String::new();
    let mut chars = base.chars();
    while let Some(character) = chars.next() {
        if matches!(character, '$' | '%' | '/' | '+') {
            let follower = chars.next()?;
            let pair = [character, follower];
            let target: String = pair.iter().collect();
            let byte = FULL_ASCII
                .iter()
                .position(|&sequence| sequence == target)?;
            out.push(byte as u8 as char);
        } else {
            let single = character.to_string();
            let byte = FULL_ASCII
                .iter()
                .position(|&sequence| sequence == single)?;
            out.push(byte as u8 as char);
        }
    }
    Some(out)
}

#[cfg(test)]
mod tests {
    use super::{decode_sequence, encode_byte};

    #[test]
    fn round_trips_every_ascii_byte() {
        for byte in 0u8..=127 {
            let sequence = encode_byte(byte).expect("ascii byte encodes");
            let decoded = decode_sequence(sequence).expect("sequence decodes");
            assert_eq!(decoded.as_bytes(), &[byte], "byte {byte} round-trips");
        }
    }

    #[test]
    fn rejects_non_ascii() {
        assert!(encode_byte(200).is_none());
    }

    #[test]
    fn rejects_dangling_shift() {
        assert!(decode_sequence("$").is_none());
    }
}
