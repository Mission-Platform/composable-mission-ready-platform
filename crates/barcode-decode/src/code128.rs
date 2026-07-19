//! Code 128 / GS1-128 decoder. Every symbol is eleven modules wide (the stop
//! pattern is thirteen), so the module run splits into fixed-width symbols whose
//! six element widths identify the symbol value. The mod-103 checksum is
//! verified, then Code B / Code C are expanded (a leading or embedded FNC1 —
//! the GS1 flag — is dropped from the payload). The pattern table mirrors the
//! encoder.

use mission_platform_barcode_common::modules_to_runs;

/// The 107 Code 128 element-width patterns, indexed by symbol value.
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
const FNC1: usize = 102;

/// Identify the symbol value of one eleven-module block by its element widths.
#[tracing::instrument(skip_all)]
fn symbol_value(block: &[u8]) -> Option<usize> {
    let widths: String = modules_to_runs(block)
        .into_iter()
        .map(|(_, length)| char::from_digit(length as u32, 10).unwrap_or('x'))
        .collect();
    PATTERNS[..STOP].iter().position(|&pattern| pattern == widths)
}

/// Decode a Code 128 / GS1-128 module run into its payload. Returns `None` when
/// the framing, any symbol, the start code or the checksum is invalid.
#[tracing::instrument(skip_all)]
pub fn decode(modules: &[u8]) -> Option<String> {
    // k data/start/checksum symbols of eleven modules, then the 13-module stop.
    if modules.len() < 11 + 13 || (modules.len() - 13) % 11 != 0 {
        return None;
    }
    let symbol_region = &modules[..modules.len() - 13];

    let mut values = Vec::new();
    for block in symbol_region.chunks_exact(11) {
        values.push(symbol_value(block)?);
    }
    if values.len() < 2 {
        return None;
    }

    // Verify the mod-103 checksum (the last symbol before the stop pattern).
    let checksum = *values.last()?;
    let expected = values[..values.len() - 1]
        .iter()
        .enumerate()
        .map(|(index, &value)| if index == 0 { value } else { value * index })
        .sum::<usize>()
        % 103;
    if checksum != expected {
        return None;
    }

    let start = values[0];
    let data = &values[1..values.len() - 1];

    let mut out = String::new();
    match start {
        START_B => {
            for &value in data {
                if value == FNC1 {
                    continue;
                }
                if value > 95 {
                    return None;
                }
                out.push((value as u8 + 0x20) as char);
            }
        }
        START_C => {
            for &value in data {
                if value == FNC1 {
                    continue;
                }
                if value > 99 {
                    return None;
                }
                out.push_str(&format!("{value:02}"));
            }
        }
        _ => return None,
    }
    Some(out)
}
