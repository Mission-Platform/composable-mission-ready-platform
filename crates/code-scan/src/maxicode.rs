//! MaxiCode localisation.
//!
//! A MaxiCode symbol is a fixed 30-column × 33-row grid of hexagonal modules,
//! with odd rows offset by half a module and a central bullseye finder. ZXing's
//! `MaxiCodeReader` reads it as a *pure* barcode: it never rotation- or
//! perspective-corrects, it just takes the enclosing rectangle of the dark
//! pixels and samples the fixed grid over it, shifting the sample x-position by
//! half a module on odd rows to follow the hexagonal offset. That is faithful to
//! the clean, upright corpus renders, so this locator mirrors it:
//!
//! 1. Find the bounding box of the dark pixels (the symbol + its bullseye reach
//!    the outer modules, so the box is the symbol extent).
//! 2. Sample the 30×33 grid over that box with the odd-row half-module shift,
//!    producing a flat module-bit array for
//!    [`mission_platform_maxicode_decode`], whose Reed–Solomon checks reject any
//!    non-MaxiCode image sampled this way (so the false-positive guard stays
//!    clean).

use crate::image::Bitmap;
use mission_platform_maxicode_common::{HEIGHT, WIDTH};
use mission_platform_maxicode_decode::decode_maxicode_modules;

/// Locate and decode a MaxiCode symbol in the binarised image, returning its
/// payload, or `None`.
pub fn scan(bitmap: &Bitmap) -> Option<String> {
    let modules = sample_pure_bits(bitmap)?;
    decode_maxicode_modules(&modules)
}

/// Sample the fixed 30×33 MaxiCode grid out of the image's dark-pixel bounding
/// box, returning `WIDTH * HEIGHT` module bits (`1` = dark, row-major), or `None`
/// when the box is missing or too far from square to be a MaxiCode symbol.
///
/// Port of ZXing `MaxiCodeReader.extractPureBits`.
fn sample_pure_bits(bitmap: &Bitmap) -> Option<Vec<u8>> {
    let (left, top, width, height) = dark_bounds(bitmap)?;

    // A MaxiCode symbol is very nearly square; reject wildly non-square regions
    // (a 1D barcode, a tall label) cheaply before sampling and running RS.
    let (w, h) = (width as f64, height as f64);
    let aspect = w / h;
    if !(0.6..=1.6).contains(&aspect) {
        return None;
    }
    // Need at least roughly one image pixel per module to sample meaningfully.
    if width < WIDTH || height < HEIGHT {
        return None;
    }

    let mut modules = vec![0u8; WIDTH * HEIGHT];
    for y in 0..HEIGHT {
        let iy = top + ((y * height + height / 2) / HEIGHT).min(height - 1);
        for x in 0..WIDTH {
            // The odd-row half-module x-shift follows the hexagonal offset.
            let ix = left + ((x * width + width / 2 + (y & 1) * width / 2) / WIDTH).min(width - 1);
            if bitmap.get(ix as i64, iy as i64) {
                modules[y * WIDTH + x] = 1;
            }
        }
    }
    Some(modules)
}

/// Bounding box `(left, top, width, height)` of every dark pixel in the image,
/// or `None` when the image carries no ink. Mirrors ZXing
/// `BitMatrix.getEnclosingRectangle`.
fn dark_bounds(bitmap: &Bitmap) -> Option<(usize, usize, usize, usize)> {
    if bitmap.width == 0 || bitmap.height == 0 {
        return None;
    }
    let (mut min_x, mut min_y) = (bitmap.width, bitmap.height);
    let (mut max_x, mut max_y) = (0usize, 0usize);
    let mut any = false;
    for y in 0..bitmap.height {
        for x in 0..bitmap.width {
            if bitmap.get(x as i64, y as i64) {
                any = true;
                if x < min_x {
                    min_x = x;
                }
                if x > max_x {
                    max_x = x;
                }
                if y < min_y {
                    min_y = y;
                }
                if y > max_y {
                    max_y = y;
                }
            }
        }
    }
    if !any {
        return None;
    }
    Some((min_x, min_y, max_x - min_x + 1, max_y - min_y + 1))
}
