//! Project-level integration tests exercising the public crate API
//! (`encode_modules`) across every supported linear symbology, independent of
//! the per-file unit tests.

use mission_platform_barcode_encode::encode_modules;

/// Validate that a symbol is a non-empty run of binary module bits.
fn assert_symbol(symbol: &[u8]) {
    assert!(!symbol.is_empty(), "symbol has modules");
    assert!(symbol.iter().all(|&bit| bit <= 1), "modules are 0/1");
}

#[test]
fn encodes_each_supported_symbology() {
    let cases: [(&str, &str); 15] = [
        ("code128", "ABC-123"),
        ("gs1-128", "0102345678901234"),
        ("code39", "HELLO-39"),
        ("code39ext", "Hello, World!"),
        ("code93", "CODE93"),
        ("code93ext", "Hello, World!"),
        ("ean13", "5901234123457"),
        ("ean8", "9638507"),
        ("upca", "03600029145"),
        ("upce", "0123456"),
        ("itf", "123456"),
        ("itf14", "1234567890123"),
        ("codabar", "123-456"),
        ("msi", "1234567"),
        ("pharmacode", "1234"),
    ];
    for (symbology, data) in cases {
        let symbol = encode_modules(symbology, data).unwrap_or_else(|| panic!("valid {symbology}"));
        assert_symbol(&symbol);
    }
}

#[test]
fn fixed_width_retail_symbologies_have_known_widths() {
    assert_eq!(encode_modules("ean13", "5901234123457").unwrap().len(), 95);
    assert_eq!(encode_modules("ean8", "9638507").unwrap().len(), 67);
    assert_eq!(encode_modules("upca", "03600029145").unwrap().len(), 95);
}

#[test]
fn is_deterministic() {
    let first = encode_modules("code128", "DETERMINISTIC").expect("valid payload");
    let second = encode_modules("code128", "DETERMINISTIC").expect("valid payload");
    assert_eq!(first, second, "encoding is reproducible");
}

#[test]
fn rejects_unknown_symbology_and_invalid_payloads() {
    assert!(encode_modules("datamatrix", "123").is_none());
    assert!(encode_modules("ean13", "5901234123450").is_none());
    assert!(encode_modules("itf", "123").is_none());
}
