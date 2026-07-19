//! Project-level integration tests exercising the public crate API
//! (`encode_modules`) end-to-end, independent of the per-file unit tests.

use mission_platform_matrix_code_encode::encode_modules;

/// Every symbol is a packed `[width, height, ...modules]` buffer of
/// `width * height` binary modules; return `(width, height, modules)` after
/// validating that invariant.
fn decode_symbol(symbol: &[u8]) -> (usize, usize, &[u8]) {
    let width = symbol[0] as usize;
    let height = symbol[1] as usize;
    let modules = &symbol[2..];
    assert_eq!(modules.len(), width * height, "module count matches width*height");
    assert!(modules.iter().all(|&bit| bit <= 1), "modules are 0/1");
    (width, height, modules)
}

#[test]
fn encodes_a_data_matrix_symbol() {
    let symbol = encode_modules("datamatrix", "123456").expect("valid payload");
    let (width, height, _) = decode_symbol(&symbol);
    assert_eq!((width, height), (10, 10), "small numeric payload uses the 10x10 symbol");
}

#[test]
fn encodes_a_rectangular_data_matrix_symbol() {
    let symbol = encode_modules("datamatrixrectangular", "123456").expect("valid payload");
    let (width, height, _) = decode_symbol(&symbol);
    assert_eq!((width, height), (18, 8), "small numeric payload uses the 8x18 symbol");
}

#[test]
fn encodes_a_url_payload() {
    let symbol = encode_modules("datamatrix", "https://example.com").expect("valid payload");
    let (width, height, _) = decode_symbol(&symbol);
    // 19 characters exceed the smallest symbols; a mid-size square symbol is chosen.
    assert_eq!(width, height, "square symbol");
    assert!((10..=26).contains(&width));
}

#[test]
fn is_deterministic() {
    let first = encode_modules("datamatrix", "DETERMINISTIC").expect("valid payload");
    let second = encode_modules("datamatrix", "DETERMINISTIC").expect("valid payload");
    assert_eq!(first, second, "encoding is reproducible");
}

#[test]
fn rejects_unknown_symbology_and_empty_payload() {
    assert!(encode_modules("pdf417", "123456").is_none());
    assert!(encode_modules("datamatrix", "").is_none());
}
