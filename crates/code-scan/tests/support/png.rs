//! Dependency-free PNG → luma loader, generalized for the ZXING corpus.
//!
//! The corpus mixes many PNG encodings the original `real_world.rs` reader could
//! not handle: palette images (`color type 3`) at bit depths 1/2/4/8, low-depth
//! greyscale, plus the 8-bit grey/RGB/RGBA it already read. This module reads all
//! of them into the same Rec. 601 luma the JS façade feeds the wasm scanner, so
//! both the corpus harness and the real-world regression test share one loader.
//!
//! Scope matches the corpus: bit depths 1/2/4/8, colour types 0/2/3/4/6,
//! non-interlaced (the corpus contains no interlaced PNGs). Adam7 interlace and
//! 16-bit depth are explicitly rejected rather than silently mis-decoded.
//!
//! Only ever compiled into test binaries via `#[path = "support/png.rs"] mod png;`,
//! so no image crate is pulled into the shipped wasm build.
#![allow(dead_code)]

/// Paeth predictor (PNG filter type 4).
fn paeth(a: i32, b: i32, c: i32) -> i32 {
    let p = a + b - c;
    let pa = (p - a).abs();
    let pb = (p - b).abs();
    let pc = (p - c).abs();
    if pa <= pb && pa <= pc {
        a
    } else if pb <= pc {
        b
    } else {
        c
    }
}

/// Reverse one PNG scanline filter in place, given the already-reconstructed
/// previous row and the per-pixel byte stride (`bpp`, at least 1).
fn unfilter(filter: u8, line: &mut [u8], prev: &[u8], bpp: usize) {
    match filter {
        0 => {}
        1 => {
            for i in bpp..line.len() {
                line[i] = line[i].wrapping_add(line[i - bpp]);
            }
        }
        2 => {
            for i in 0..line.len() {
                line[i] = line[i].wrapping_add(prev[i]);
            }
        }
        3 => {
            for i in 0..line.len() {
                let a = if i >= bpp { line[i - bpp] as u32 } else { 0 };
                let b = prev[i] as u32;
                line[i] = line[i].wrapping_add(((a + b) / 2) as u8);
            }
        }
        4 => {
            for i in 0..line.len() {
                let a = if i >= bpp { line[i - bpp] as i32 } else { 0 };
                let b = prev[i] as i32;
                let c = if i >= bpp { prev[i - bpp] as i32 } else { 0 };
                line[i] = line[i].wrapping_add(paeth(a, b, c) as u8);
            }
        }
        other => panic!("unsupported PNG filter {other}"),
    }
}

/// The parsed IHDR fields plus the raw chunk payloads needed to reconstruct
/// pixels.
struct PngChunks {
    width: usize,
    height: usize,
    bit_depth: u8,
    color_type: u8,
    palette: Vec<[u8; 3]>,
    idat: Vec<u8>,
}

/// Parse the PNG container: split into chunks, capture IHDR, concatenate IDAT,
/// and read the palette (`PLTE`). `tRNS` is ignored — alpha does not affect luma.
fn parse_chunks(bytes: &[u8]) -> PngChunks {
    assert_eq!(
        &bytes[0..8],
        &[137, 80, 78, 71, 13, 10, 26, 10],
        "not a PNG"
    );
    let mut pos = 8usize;
    let (mut width, mut height) = (0usize, 0usize);
    let (mut bit_depth, mut color_type) = (0u8, 0u8);
    let mut palette: Vec<[u8; 3]> = Vec::new();
    let mut idat: Vec<u8> = Vec::new();
    while pos + 8 <= bytes.len() {
        let len = u32::from_be_bytes(bytes[pos..pos + 4].try_into().unwrap()) as usize;
        let ctype = &bytes[pos + 4..pos + 8];
        let data = &bytes[pos + 8..pos + 8 + len];
        match ctype {
            b"IHDR" => {
                width = u32::from_be_bytes(data[0..4].try_into().unwrap()) as usize;
                height = u32::from_be_bytes(data[4..8].try_into().unwrap()) as usize;
                bit_depth = data[8];
                color_type = data[9];
                assert_eq!(
                    data[12], 0,
                    "interlaced PNGs are not supported (none exist in the corpus)"
                );
            }
            b"PLTE" => {
                palette = data.chunks_exact(3).map(|c| [c[0], c[1], c[2]]).collect();
            }
            b"IDAT" => idat.extend_from_slice(data),
            b"IEND" => break,
            _ => {}
        }
        pos += 8 + len + 4; // length + type + data + CRC
    }
    PngChunks {
        width,
        height,
        bit_depth,
        color_type,
        palette,
        idat,
    }
}

/// Number of samples (channels) per pixel for a colour type.
fn channels_for(color_type: u8) -> usize {
    match color_type {
        0 => 1, // greyscale
        2 => 3, // RGB
        3 => 1, // palette index
        4 => 2, // grey + alpha
        6 => 4, // RGBA
        other => panic!("unsupported PNG colour type {other}"),
    }
}

/// Read the `i`-th sample (0-based) of `bit_depth` bits from a filtered scanline
/// `line`, MSB-first as PNG packs sub-byte samples.
fn read_sample(line: &[u8], index: usize, bit_depth: u8) -> u16 {
    match bit_depth {
        8 => line[index] as u16,
        1 | 2 | 4 => {
            let per_byte = (8 / bit_depth) as usize;
            let byte = line[index / per_byte];
            let shift = 8 - bit_depth as usize * (index % per_byte + 1);
            let mask = (1u16 << bit_depth) - 1;
            ((byte as u16) >> shift) & mask
        }
        other => panic!("unsupported PNG bit depth {other}"),
    }
}

/// Rec. 601 luma from an RGB triple.
#[inline]
fn luma601(r: u8, g: u8, b: u8) -> u8 {
    (0.299 * r as f64 + 0.587 * g as f64 + 0.114 * b as f64).round() as u8
}

/// Scale a low-depth greyscale sample (0..=2^depth-1) to a full 0..=255 byte.
#[inline]
fn scale_grey(value: u16, bit_depth: u8) -> u8 {
    let max = (1u16 << bit_depth) - 1;
    ((value as u32 * 255 + max as u32 / 2) / max as u32) as u8
}

/// Decode a non-interlaced PNG at `path` into a `(width, height, luma)` image,
/// collapsing colour with the Rec. 601 weights. Handles bit depths 1/2/4/8 and
/// colour types 0/2/3/4/6 (greyscale, RGB, palette, grey+alpha, RGBA).
pub fn load_png_luma(path: &str) -> (usize, usize, Vec<u8>) {
    let bytes = std::fs::read(path).unwrap_or_else(|e| panic!("read {path}: {e}"));
    let chunks = parse_chunks(&bytes);
    let PngChunks {
        width,
        height,
        bit_depth,
        color_type,
        palette,
        idat,
    } = chunks;

    assert!(
        matches!(bit_depth, 1 | 2 | 4 | 8),
        "unsupported PNG bit depth {bit_depth}"
    );
    let channels = channels_for(color_type);

    let raw = miniz_oxide::inflate::decompress_to_vec_zlib(&idat)
        .unwrap_or_else(|e| panic!("inflate IDAT: {e:?}"));

    // Bytes per scanline (ceil of bits) and the filter's per-pixel byte stride
    // (at least 1; sub-byte pixels always use 1).
    let bits_per_pixel = channels * bit_depth as usize;
    let stride = (width * bits_per_pixel + 7) / 8;
    let bpp = ((bits_per_pixel + 7) / 8).max(1);

    let mut prev = vec![0u8; stride];
    let mut luma = vec![0u8; width * height];
    let mut idx = 0usize;
    for row in 0..height {
        let filter = raw[idx];
        idx += 1;
        let mut line = raw[idx..idx + stride].to_vec();
        idx += stride;
        unfilter(filter, &mut line, &prev, bpp);
        for x in 0..width {
            let base = x * channels;
            luma[row * width + x] = match color_type {
                0 => {
                    // greyscale (possibly low depth)
                    let v = read_sample(&line, base, bit_depth);
                    if bit_depth == 8 {
                        v as u8
                    } else {
                        scale_grey(v, bit_depth)
                    }
                }
                4 => {
                    // grey + alpha (always 8-bit in the corpus)
                    line[base]
                }
                2 => luma601(line[base], line[base + 1], line[base + 2]),
                6 => luma601(line[base], line[base + 1], line[base + 2]),
                3 => {
                    let index = read_sample(&line, base, bit_depth) as usize;
                    let [r, g, b] = *palette
                        .get(index)
                        .unwrap_or_else(|| panic!("palette index {index} out of range"));
                    luma601(r, g, b)
                }
                other => panic!("unsupported PNG colour type {other}"),
            };
        }
        prev = line;
    }
    (width, height, luma)
}

/// Rotate a luma image 90° clockwise, returning `(new_width, new_height, luma)`.
/// A source pixel at `(x, y)` lands at `(height-1-y, x)` in the rotated frame,
/// matching ZXING's `rotateOneEighth`/quarter-turn source rotation used to build
/// its per-folder rotation thresholds.
pub fn rotate90(width: usize, height: usize, luma: &[u8]) -> (usize, usize, Vec<u8>) {
    let (nw, nh) = (height, width);
    let mut out = vec![0u8; nw * nh];
    for y in 0..height {
        for x in 0..width {
            let nx = height - 1 - y;
            let ny = x;
            out[ny * nw + nx] = luma[y * width + x];
        }
    }
    (nw, nh, out)
}

/// Rotate a luma image 180°.
pub fn rotate180(width: usize, height: usize, luma: &[u8]) -> (usize, usize, Vec<u8>) {
    let mut out = vec![0u8; width * height];
    for y in 0..height {
        for x in 0..width {
            out[(height - 1 - y) * width + (width - 1 - x)] = luma[y * width + x];
        }
    }
    (width, height, out)
}

/// Rotate a luma image 270° clockwise (i.e. 90° counter-clockwise).
pub fn rotate270(width: usize, height: usize, luma: &[u8]) -> (usize, usize, Vec<u8>) {
    let (nw, nh) = (height, width);
    let mut out = vec![0u8; nw * nh];
    for y in 0..height {
        for x in 0..width {
            let nx = y;
            let ny = width - 1 - x;
            out[ny * nw + nx] = luma[y * width + x];
        }
    }
    (nw, nh, out)
}

/// Apply the rotation for a ZXING rotation index (0/1/2/3 → 0°/90°/180°/270°).
pub fn rotate(index: u8, width: usize, height: usize, luma: &[u8]) -> (usize, usize, Vec<u8>) {
    match index {
        0 => (width, height, luma.to_vec()),
        1 => rotate90(width, height, luma),
        2 => rotate180(width, height, luma),
        3 => rotate270(width, height, luma),
        other => panic!("rotation index out of range: {other}"),
    }
}
