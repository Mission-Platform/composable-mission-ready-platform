//! Unit tests for the generalized corpus PNG loader (`tests/support/png.rs`).
//!
//! The original real-world reader only handled 8-bit grey/RGB/RGBA. The ZXING
//! corpus additionally uses palette images (colour type 3) at bit depths 1/2/4/8
//! and low-depth greyscale, so these tests load one real corpus image of each
//! awkward encoding and assert it decodes to a plausible luma image (correct
//! dimensions, and containing both clearly-dark and clearly-light pixels — a
//! barcode/QR always has both). Rotation helpers are checked on a hand-built
//! image with known corners.

#![cfg(not(target_arch = "wasm32"))]

#[path = "support/png.rs"]
mod png;

/// Root of the vendored ZXING blackbox corpus.
const CORPUS: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/tests/fixtures/zxing-blackbox");

/// Load a corpus image and assert it produced a non-empty luma buffer of the
/// reported size with real tonal variation — a constant buffer would mean the
/// palette / bit-depth was mis-decoded (some corpus scans are low-contrast, so
/// absolute dark/light thresholds are too strict; a wide min→max range is the
/// robust signal that pixels decoded to distinct values).
fn assert_loads(relative: &str) {
    let path = format!("{CORPUS}/{relative}");
    let (width, height, luma) = png::load_png_luma(&path);
    assert!(width > 0 && height > 0, "{relative}: empty dimensions");
    assert_eq!(luma.len(), width * height, "{relative}: luma size mismatch");
    let min = *luma.iter().min().unwrap();
    let max = *luma.iter().max().unwrap();
    assert!(
        max as i32 - min as i32 > 40,
        "{relative}: luma range {min}..={max} too flat — palette/depth mis-decoded"
    );
}

#[test]
fn loads_palette_depth1() {
    // 1-bit palette (colour type 3, bit depth 1).
    assert_loads("pdf417-2/24.png");
}

#[test]
fn loads_palette_depth2() {
    // 2-bit palette.
    assert_loads("pdf417-2/25.png");
}

#[test]
fn loads_palette_depth4() {
    // 4-bit palette.
    assert_loads("code128-1/7.png");
}

#[test]
fn loads_palette_depth8() {
    // 8-bit palette.
    assert_loads("pdf417-2/14.png");
}

#[test]
fn loads_greyscale_depth1() {
    // 1-bit greyscale (colour type 0, bit depth 1).
    assert_loads("pdf417-3/19.png");
}

#[test]
fn loads_greyscale_depth8() {
    assert_loads("qrcode-2/29.png");
}

#[test]
fn loads_rgb_depth8() {
    assert_loads("qrcode-2/28.png");
}

#[test]
fn loads_rgba_depth8() {
    assert_loads("qrcode-2/36.png");
}

#[test]
fn rotations_move_corners_predictably() {
    // A 3-wide, 2-high image with a unique marker in the top-left corner.
    //   10 20 30
    //   40 50 60
    let width = 3;
    let height = 2;
    let luma: Vec<u8> = vec![10, 20, 30, 40, 50, 60];

    // 90° clockwise: bottom-left of the source becomes top-left. New size 2x3.
    let (w90, h90, r90) = png::rotate90(width, height, &luma);
    assert_eq!((w90, h90), (2, 3));
    // Source (0,0)=10 lands at (height-1-0, 0) = (1, 0) → row 0, col 1.
    assert_eq!(r90[0 * w90 + 1], 10);

    // 180°: corners swap diagonally, size unchanged.
    let (w180, h180, r180) = png::rotate180(width, height, &luma);
    assert_eq!((w180, h180), (3, 2));
    assert_eq!(r180[0], 60); // was bottom-right
    assert_eq!(r180[w180 * h180 - 1], 10); // was top-left

    // 270° clockwise, size 2x3.
    let (w270, h270, _r270) = png::rotate270(width, height, &luma);
    assert_eq!((w270, h270), (2, 3));

    // Four 90° turns return to the original.
    let (_, _, once) = png::rotate90(width, height, &luma);
    let (_, _, twice) = png::rotate90(w90, h90, &once);
    let (_, _, thrice) = png::rotate90(3, 2, &twice);
    let (fw, fh, four) = png::rotate90(2, 3, &thrice);
    assert_eq!((fw, fh), (width, height));
    assert_eq!(four, luma);
}
