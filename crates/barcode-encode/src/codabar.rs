//! Codabar (a.k.a. NW-7): a self-checking symbology for digits and a handful of
//! symbols (`-$:/.+`). Each character is seven elements (four bars, three
//! spaces); the payload is framed by `A`/`B`/`C`/`D` start-stop characters. This
//! encoder frames automatically with an `A` start and stop.

use mission_platform_barcode_common::widths_to_modules;

const NARROW: u8 = 1;
const WIDE: u8 = 3;

/// Seven-element wide/narrow bitmask for each supported character (bit set =
/// wide), element order bar, space, bar, space, bar, space, bar.
#[tracing::instrument(skip_all)]
fn pattern(character: char) -> Option<&'static str> {
    Some(match character {
        '0' => "0000011",
        '1' => "0000110",
        '2' => "0001001",
        '3' => "1100000",
        '4' => "0010010",
        '5' => "1000010",
        '6' => "0100001",
        '7' => "0100100",
        '8' => "0110000",
        '9' => "1000100",
        '-' => "0001100",
        '$' => "0011000",
        ':' => "1000101",
        '/' => "1010001",
        '.' => "1010100",
        '+' => "0010011",
        'A' => "0011010",
        'B' => "0101001",
        'C' => "0001011",
        'D' => "0001110",
        _ => return None,
    })
}

/// Encode `data` as Codabar, framing it with `A` start/stop characters. Returns
/// `None` when the payload contains an unsupported character.
#[tracing::instrument(skip_all)]
pub fn encode(data: &str) -> Option<Vec<u8>> {
    if data.is_empty() {
        return None;
    }
    let framed = format!("A{}A", data.to_ascii_uppercase());
    let length = framed.chars().count();

    let mut modules = Vec::new();
    for (index, character) in framed.chars().enumerate() {
        // Only digits and symbols are valid payload; A–D are the frame only.
        if index != 0 && index + 1 != length && matches!(character, 'A'..='D') {
            return None;
        }
        let widths: Vec<u8> = pattern(character)?
            .chars()
            .map(|bit| if bit == '1' { WIDE } else { NARROW })
            .collect();
        modules.extend(widths_to_modules(&widths, true));
        if index + 1 < length {
            modules.push(0); // Narrow-space inter-character gap.
        }
    }
    Some(modules)
}

#[cfg(test)]
mod tests {
    use super::encode;

    #[test]
    #[tracing::instrument(skip_all)]
    fn frames_and_validates() {
        let modules = encode("123-456").expect("valid Codabar");
        assert!(!modules.is_empty());
        assert!(modules.iter().all(|&bit| bit <= 1), "modules must be 0/1");
        assert!(
            encode("12#34").is_none(),
            "unsupported characters are rejected"
        );
        assert!(encode("").is_none(), "empty payload is rejected");
    }
}
