//! End-to-end pipeline tests: encode -> render a synthetic (optionally degraded)
//! luma image -> locate & sample with the scanner -> decode with the real
//! decoder, asserting the payload survives the whole round-trip.
//!
//! Unlike `roundtrip.rs` (which compares the scanner's raw buffer against the
//! encoder's), these run the actual decoders, so they exercise the full "does a
//! located code actually decode?" path — the behaviour that regressed for noisy
//! Data Matrix and 1D-barcode captures.
//!
//! Native-only: they pull in the encoder *and* decoder crates, whose
//! wasm-bindgen exports would clash if linked into one wasm test binary.

#![cfg(not(target_arch = "wasm32"))]

use mission_platform_barcode_decode::decode_modules as decode_barcode;
use mission_platform_barcode_encode::encode_modules as encode_barcode;
use mission_platform_code_scan::{
    scan, scan_and_decode, scan_and_decode_all, scan_and_decode_roi, scan_barcode, scan_matrix,
    scan_qr, BARCODE_CANDIDATE_SEPARATOR, FORMAT_AZTEC, FORMAT_BARCODE, FORMAT_DATA_MATRIX,
    FORMAT_PDF417, FORMAT_QR,
};
use mission_platform_matrix_code_decode::decode_matrix;
use mission_platform_matrix_code_encode::encode_modules as encode_matrix;
use mission_platform_pdf417_encode::encode_pdf417;
use mission_platform_qr_code_decode::decode_qr;
use mission_platform_qr_code_encode::encode as encode_qr;

/// Module pixel size and quiet-zone width used when rendering test images.
const SCALE: usize = 8;
const QUIET: usize = 4;

/// Render a `[width, height, ...modules]` matrix (the encoder's 2-byte-header
/// buffer) into a `(width, height, luma)` image: each module becomes a
/// `SCALE`×`SCALE` block surrounded by a `QUIET`-module light border.
fn render_matrix(packed: &[u8]) -> (usize, usize, Vec<u8>) {
    let width = packed[0] as usize;
    let height = packed[1] as usize;
    let modules = &packed[2..];
    let out_w = (width + 2 * QUIET) * SCALE;
    let out_h = (height + 2 * QUIET) * SCALE;
    let mut luma = vec![255u8; out_w * out_h];
    for row in 0..height {
        for col in 0..width {
            if modules[row * width + col] == 0 {
                continue;
            }
            let x0 = (col + QUIET) * SCALE;
            let y0 = (row + QUIET) * SCALE;
            for y in y0..y0 + SCALE {
                for x in x0..x0 + SCALE {
                    luma[y * out_w + x] = 0;
                }
            }
        }
    }
    (out_w, out_h, luma)
}

/// Render a flat run of 1D module bits (`1` = bar) into a `(width, height, luma)`
/// image: each module is `SCALE` px wide, bars run the full height, with a
/// `QUIET * SCALE` px light margin on every side.
fn render_barcode(bits: &[u8]) -> (usize, usize, Vec<u8>) {
    let bar_height = SCALE * 10;
    let width = (bits.len() + 2 * QUIET) * SCALE;
    let height = bar_height + 2 * QUIET * SCALE;
    let mut luma = vec![255u8; width * height];
    for (index, &bit) in bits.iter().enumerate() {
        if bit == 0 {
            continue;
        }
        let x0 = (index + QUIET) * SCALE;
        for y in QUIET * SCALE..QUIET * SCALE + bar_height {
            for x in x0..x0 + SCALE {
                luma[y * width + x] = 0;
            }
        }
    }
    (width, height, luma)
}

/// Downscale (nearest-neighbour) by a fractional factor, simulating a camera
/// capture whose modules no longer land on integer pixel boundaries.
fn downscale(w: usize, h: usize, luma: &[u8], factor: f64) -> (usize, usize, Vec<u8>) {
    let nw = (w as f64 / factor) as usize;
    let nh = (h as f64 / factor) as usize;
    let mut out = vec![255u8; nw * nh];
    for y in 0..nh {
        for x in 0..nw {
            let sx = (x as f64 * factor) as usize;
            let sy = (y as f64 * factor) as usize;
            out[y * nw + x] = luma[sy.min(h - 1) * w + sx.min(w - 1)];
        }
    }
    (nw, nh, out)
}

/// Rotate a `(w, h, luma)` image `degrees` clockwise about its centre onto a
/// larger white canvas (so nothing is clipped), sampling the source bilinearly.
/// Simulates a symbol photographed at an angle.
fn rotate(w: usize, h: usize, luma: &[u8], degrees: f64) -> (usize, usize, Vec<u8>) {
    let rad = degrees.to_radians();
    let (sin, cos) = rad.sin_cos();
    let nw = ((w as f64 * cos.abs()) + (h as f64 * sin.abs())).ceil() as usize + 2;
    let nh = ((w as f64 * sin.abs()) + (h as f64 * cos.abs())).ceil() as usize + 2;
    let mut out = vec![255u8; nw * nh];
    let (cx, cy) = (w as f64 / 2.0, h as f64 / 2.0);
    let (ncx, ncy) = (nw as f64 / 2.0, nh as f64 / 2.0);
    for oy in 0..nh {
        for ox in 0..nw {
            let dx = ox as f64 - ncx;
            let dy = oy as f64 - ncy;
            // Inverse rotation maps the output pixel back into the source.
            let sx = cos * dx + sin * dy + cx;
            let sy = -sin * dx + cos * dy + cy;
            if sx < 0.0 || sy < 0.0 || sx >= (w - 1) as f64 || sy >= (h - 1) as f64 {
                continue;
            }
            let x0 = sx.floor() as usize;
            let y0 = sy.floor() as usize;
            let fx = sx - x0 as f64;
            let fy = sy - y0 as f64;
            let p00 = luma[y0 * w + x0] as f64;
            let p10 = luma[y0 * w + x0 + 1] as f64;
            let p01 = luma[(y0 + 1) * w + x0] as f64;
            let p11 = luma[(y0 + 1) * w + x0 + 1] as f64;
            let top = p00 + (p10 - p00) * fx;
            let bottom = p01 + (p11 - p01) * fx;
            out[oy * nw + ox] = (top + (bottom - top) * fy).round() as u8;
        }
    }
    (nw, nh, out)
}

/// Add deterministic salt-and-pepper speckle to roughly `1 / every` pixels,
/// simulating sensor noise / JPEG artefacts on a captured symbol.
fn speckle(luma: &mut [u8], every: usize) {
    let mut seed = 0x9e3779b9usize;
    for pixel in luma.iter_mut() {
        seed = seed.wrapping_mul(1103515245).wrapping_add(12345);
        if (seed >> 16) % every == 0 {
            *pixel = if *pixel > 127 { 0 } else { 255 };
        }
    }
}

/// Decode a scanner Data Matrix buffer (`[size, ...modules]`) through the real
/// decoder, mimicking the JS bridge that re-packs it as `[size, size, ...]`.
fn decode_scanned_matrix(scanned: &[u8]) -> Option<String> {
    let size = scanned[0];
    let mut repacked = vec![size, size];
    repacked.extend_from_slice(&scanned[1..]);
    decode_matrix("datamatrix", &repacked)
}

#[test]
fn matrix_clean() {
    for text in ["HELLO", "Data Matrix 123", "mission-platform", "123456"] {
        let packed = encode_matrix("datamatrix", text).expect("encode");
        let (w, h, luma) = render_matrix(&packed);
        let scanned = scan_matrix(w, h, &luma).expect("located");
        assert_eq!(
            decode_scanned_matrix(&scanned).as_deref(),
            Some(text),
            "clean {text:?}"
        );
    }
}

#[test]
fn matrix_downscaled() {
    let packed = encode_matrix("datamatrix", "HELLO").expect("encode");
    let (w, h, luma) = render_matrix(&packed);
    let (w, h, luma) = downscale(w, h, &luma, 2.6);
    let scanned = scan_matrix(w, h, &luma).expect("located");
    assert_eq!(decode_scanned_matrix(&scanned).as_deref(), Some("HELLO"));
}

#[test]
fn matrix_with_margin_clutter() {
    // A few stray dark specks in the quiet zone (e.g. neighbouring text / an
    // object edge) used to blow up the whole-ink bounding box, leaving the
    // symbol located-but-undecodable. The density-based bounds must ignore them.
    let packed = encode_matrix("datamatrix", "HELLO").expect("encode");
    let (w, h, mut luma) = render_matrix(&packed);
    luma[2 * w + 2] = 0;
    luma[5 * w + (w - 3)] = 0;
    luma[(h - 3) * w + 4] = 0;
    let scanned = scan_matrix(w, h, &luma).expect("located despite clutter");
    assert_eq!(decode_scanned_matrix(&scanned).as_deref(), Some("HELLO"));
}

#[test]
fn matrix_speckled() {
    // Moderate sensor-style noise: the majority-window module read plus the
    // mode-of-many-lines size inference must keep it inside Reed-Solomon range.
    let packed = encode_matrix("datamatrix", "HELLO").expect("encode");
    let (w, h, mut luma) = render_matrix(&packed);
    speckle(&mut luma, 140);
    let scanned = scan_matrix(w, h, &luma).expect("located");
    assert_eq!(decode_scanned_matrix(&scanned).as_deref(), Some("HELLO"));
}

#[test]
fn matrix_speckled_downscaled() {
    // A realistic camera capture: the symbol is downscaled so its modules no
    // longer land on pixel boundaries *and* peppered with sub-module specks.
    // Each speck used to insert/split a run on the alternating timing edge,
    // inflating the inferred symbol size (e.g. 14 for a 12-module symbol) so the
    // module grid was mis-sampled and every attempt decoded to `null`. The
    // speck-robust module count must fold those away and recover the true size.
    let packed = encode_matrix("datamatrix", "HELLO").expect("encode");
    let (w, h, luma) = render_matrix(&packed);
    let (w, h, mut luma) = downscale(w, h, &luma, 1.7);
    speckle(&mut luma, 80);
    let scanned = scan_matrix(w, h, &luma).expect("located");
    assert_eq!(
        scanned[0], 12,
        "the true symbol size must survive the noise"
    );
    assert_eq!(decode_scanned_matrix(&scanned).as_deref(), Some("HELLO"));
}

#[test]
fn barcode_clean() {
    for (sym, data, expected) in [
        ("code128", "ABC-123", "ABC-123"),
        ("code39", "HELLO", "HELLO"),
        ("ean13", "590123412345", "5901234123457"),
    ] {
        let bits = encode_barcode(sym, data).expect("encode");
        let (w, h, luma) = render_barcode(&bits);
        let scanned = scan_barcode(w, h, &luma).expect("located");
        assert_eq!(
            decode_barcode(sym, &scanned).as_deref(),
            Some(expected),
            "clean {sym}"
        );
    }
}

#[test]
fn barcode_downscaled() {
    let bits = encode_barcode("code128", "ABC-123").expect("encode");
    let (w, h, luma) = render_barcode(&bits);
    let (w, h, luma) = downscale(w, h, &luma, 2.6);
    let scanned = scan_barcode(w, h, &luma).expect("located");
    assert_eq!(
        decode_barcode("code128", &scanned).as_deref(),
        Some("ABC-123")
    );
}

#[test]
fn barcode_speckled() {
    // Sensor-style salt-and-pepper noise peppers the bars and spaces with lone
    // sub-module specks. Each one used to collapse the module-unit estimate to a
    // single pixel, inflating the sampled run (the field report: 350 modules for
    // a symbol that has far fewer) so every symbology decoded to `null`. The
    // robust unit estimate must fold those specks away and still decode.
    let bits = encode_barcode("code128", "ABC-123").expect("encode");
    let (w, h, mut luma) = render_barcode(&bits);
    speckle(&mut luma, 140);
    let scanned = scan_barcode(w, h, &luma).expect("located");
    assert_eq!(
        decode_barcode("code128", &scanned).as_deref(),
        Some("ABC-123")
    );
}

#[test]
fn barcode_camera_like_capture() {
    // A realistic live-camera frame: a *long* symbol shrunk so it spans the
    // frame at only a few pixels per module. The field report located 142
    // modules across a 448px frame (~3px/module) yet nothing decoded: at that
    // density the narrowest run is an integer-pixel sample of a fractional-width
    // module, so the old "smallest run is the unit" estimate snapped the module
    // grid to a whole pixel that was off by up to a third, the per-element
    // rounding drifted off a valid Code 128 length and every symbology returned
    // `null`. The sub-pixel unit estimate must recover the exact module run and
    // decode. `SCALE / 2.5 = 3.2` px/module mirrors the reported capture.
    let data = "MISSION-PLATFORM-CONTROL-9";
    let bits = encode_barcode("code128", data).expect("encode");
    let (w, h, luma) = render_barcode(&bits);
    let (w, h, luma) = downscale(w, h, &luma, 2.5);
    let scanned = scan_barcode(w, h, &luma).expect("located");
    assert_eq!(decode_barcode("code128", &scanned).as_deref(), Some(data));
}

#[test]
fn barcode_with_margin_clutter() {
    // A stray speck above/below the bars used to widen the scan-line's dark
    // bounds; density-based bounds reject it so the bars still decode.
    let bits = encode_barcode("code128", "ABC-123").expect("encode");
    let (w, h, mut luma) = render_barcode(&bits);
    luma[2 * w + 2] = 0;
    luma[(h - 3) * w + (w - 4)] = 0;
    let scanned = scan_barcode(w, h, &luma).expect("located despite clutter");
    assert_eq!(
        decode_barcode("code128", &scanned).as_deref(),
        Some("ABC-123")
    );
}

/// Decode a combined-`scan` buffer as a 1D barcode, mimicking the JS decode
/// stage: split the payload into its candidate module runs on the sentinel and
/// try each against the symbology until one reads.
fn decode_scanned_barcode(scanned: &[u8], sym: &str) -> Option<String> {
    assert_eq!(scanned[0], FORMAT_BARCODE, "expected a barcode match");
    scanned[1..]
        .split(|&byte| byte == BARCODE_CANDIDATE_SEPARATOR)
        .filter(|run| !run.is_empty())
        .find_map(|modules| decode_barcode(sym, modules))
}

/// Composite a rendered barcode into a larger, cluttered "camera frame": a solid
/// dark object to the left of the bars (a hand/shadow/packaging edge) and a row
/// of human-readable digit glyphs printed below them. Returns `(w, h, luma)`.
fn cluttered_frame(
    bar_w: usize,
    bar_h: usize,
    bar_luma: &[u8],
    x_off: usize,
    y_off: usize,
) -> (usize, usize, Vec<u8>) {
    let w = bar_w + x_off + 40;
    let h = bar_h + y_off + 90;
    let mut luma = vec![255u8; w * h];

    // Blit the barcode.
    for y in 0..bar_h {
        for x in 0..bar_w {
            luma[(y + y_off) * w + (x + x_off)] = bar_luma[y * bar_w + x];
        }
    }

    // The bars occupy rows [QUIET*SCALE, QUIET*SCALE + bar_height) within the
    // rendered image; mirror them here so the clutter lands beside/below them.
    let bar_top = y_off + QUIET * SCALE;
    let bar_bottom = bar_top + SCALE * 10;

    // A big solid dark block hugging the bars' left — the whole-frame bounds
    // used to swallow this and drag the scan line through it; the segment split
    // must discard it.
    for y in bar_top..bar_bottom {
        for x in 8..8 + 130 {
            luma[y * w + x] = 0;
        }
    }

    // A row of "digit" glyphs below the bars (the human-readable text): short,
    // well-separated dark blocks. Their row is far less edge-dense than the
    // bars, so the transition-band detector must skip it.
    let text_top = bar_bottom + 24;
    for glyph in 0..10 {
        let gx = x_off + QUIET * SCALE + glyph * 3 * SCALE;
        for y in text_top..text_top + 2 * SCALE {
            for x in gx..gx + SCALE {
                if x < w {
                    luma[y * w + x] = 0;
                }
            }
        }
    }

    (w, h, luma)
}

#[test]
fn barcode_camera_frame_with_object_and_text_clutter() {
    // The real-photo failure the improved locator targets: the bars are one
    // block inside a busy scene. A whole-frame ink bounding box balloons onto
    // the dark object beside the bars and the digit row below, so the scan line
    // never crosses the bars and every symbology returned `null`. The
    // transition-band detector must lock onto the bars vertically and the
    // per-scanline segment split must discard the object horizontally, so the
    // symbol decodes straight through the product `scan` path.
    for (sym, data, expected) in [
        ("code128", "ABC-123", "ABC-123"),
        ("ean13", "590123412345", "5901234123457"),
    ] {
        let bits = encode_barcode(sym, data).expect("encode");
        let (bw, bh, bluma) = render_barcode(&bits);
        let (w, h, luma) = cluttered_frame(bw, bh, &bluma, 170, 12);
        let scanned = scan(w, h, &luma).expect("located in a cluttered frame");
        assert_eq!(
            decode_scanned_barcode(&scanned, sym).as_deref(),
            Some(expected),
            "cluttered {sym}"
        );
    }
}

/// Re-header a QR encoder buffer (`[version, size, ...modules]`) as the square
/// `[size, size, ...modules]` matrix `render_matrix` expects, then render it.
fn render_qr(packed: &[u8]) -> (usize, usize, Vec<u8>) {
    let size = packed[1];
    let mut squared = vec![size, size];
    squared.extend_from_slice(&packed[2..]);
    render_matrix(&squared)
}

#[test]
fn scan_and_decode_reads_qr_end_to_end() {
    // The whole pipeline — binarise, locate, sample *and decode* — runs in one
    // Rust call, so a QR image resolves straight to its payload with no
    // JS round-trip.
    for text in ["HELLO", "https://mission-platform.dev", "Mission 42"] {
        let packed = encode_qr(text, 1).expect("encode qr");
        let (w, h, luma) = render_qr(&packed);
        let outcome = scan_and_decode(w, h, &luma).expect("located and decoded");
        assert_eq!(outcome.format(), FORMAT_QR, "qr {text:?}");
        assert_eq!(outcome.value().as_deref(), Some(text), "qr {text:?}");
    }
}

#[test]
fn scan_and_decode_reads_data_matrix_end_to_end() {
    for text in ["HELLO", "Data Matrix 123", "mission-platform"] {
        let packed = encode_matrix("datamatrix", text).expect("encode");
        let (w, h, luma) = render_matrix(&packed);
        let outcome = scan_and_decode(w, h, &luma).expect("located and decoded");
        assert_eq!(outcome.format(), FORMAT_DATA_MATRIX, "dm {text:?}");
        assert_eq!(outcome.value().as_deref(), Some(text), "dm {text:?}");
    }
}

#[test]
fn scan_and_decode_reads_barcode_end_to_end() {
    for (sym, data, expected) in [
        ("code128", "ABC-123", "ABC-123"),
        ("code39", "HELLO", "HELLO"),
        ("ean13", "590123412345", "5901234123457"),
    ] {
        let bits = encode_barcode(sym, data).expect("encode");
        let (w, h, luma) = render_barcode(&bits);
        let outcome = scan_and_decode(w, h, &luma).expect("located and decoded");
        assert_eq!(outcome.format(), FORMAT_BARCODE, "barcode {sym}");
        assert_eq!(outcome.value().as_deref(), Some(expected), "barcode {sym}");
    }
}

#[test]
fn scan_and_decode_survives_a_degraded_capture() {
    // A downscaled + speckled Data Matrix (a realistic camera frame) still
    // resolves to its payload through the single call.
    let packed = encode_matrix("datamatrix", "HELLO").expect("encode");
    let (w, h, luma) = render_matrix(&packed);
    let (w, h, mut luma) = downscale(w, h, &luma, 1.7);
    speckle(&mut luma, 80);
    let outcome = scan_and_decode(w, h, &luma).expect("located and decoded");
    assert_eq!(outcome.format(), FORMAT_DATA_MATRIX);
    assert_eq!(outcome.value().as_deref(), Some("HELLO"));
}

/// Apply a strong, uneven-lighting gradient to a rendered (bilevel) image so a
/// **single global threshold can no longer separate ink from background**: the
/// source is first flattened to a low-contrast ink/background pair, then the
/// left side is darkened by a ramp. After this the *ink on the bright (right)
/// side is lighter than the background on the dark (left) side*, so any one
/// global cut either floods the dark side or drops the bright side — exactly the
/// failure the Phase 2 adaptive (local mean-C) binariser is meant to escape.
fn lighting_gradient(w: usize, h: usize, luma: &[u8]) -> Vec<u8> {
    // Low-contrast levels: ink 40, background 215.
    const INK: i32 = 40;
    const BG: i32 = 215;
    // Left edge is darkened by up to `RAMP`; the right edge is untouched.
    const RAMP: f64 = 185.0;
    let mut out = vec![0u8; w * h];
    for y in 0..h {
        for x in 0..w {
            let base = if luma[y * w + x] == 0 { INK } else { BG };
            let ramp = ((w - 1 - x) as f64 / (w - 1) as f64 * RAMP) as i32;
            out[y * w + x] = (base - ramp).clamp(0, 255) as u8;
        }
    }
    out
}

#[test]
fn scan_and_decode_reads_a_qr_under_a_lighting_gradient() {
    // Phase 2: a QR under a lighting gradient that a single global threshold
    // cannot binarise. The old global-Otsu-only path fails to decode it, while
    // the adaptive threshold + grey sub-pixel sampling recover it.
    let text = "GRADIENT QR";
    let packed = encode_qr(text, 1).expect("encode qr");
    let (w, h, base) = render_qr(&packed);
    let luma = lighting_gradient(w, h, &base);

    // The global-only path (single Otsu threshold, hard sample) cannot read it.
    let global_only = scan_qr(w, h, &luma).and_then(|modules| decode_qr(&modules));
    assert!(
        global_only.is_none(),
        "a single global threshold should not separate this gradient"
    );

    // The Phase 2 pipeline recovers the payload via adaptive binarisation.
    let outcome = scan_and_decode(w, h, &luma).expect("recovered via adaptive binarisation");
    assert_eq!(outcome.format(), FORMAT_QR);
    assert_eq!(outcome.value().as_deref(), Some(text));
}

#[test]
fn scan_and_decode_disambiguates_upca_from_ean13() {
    // Phase 3 (§2 item 5): a UPC-A symbol must report its 12-digit UPC-A value,
    // not the 13-digit leading-zero EAN-13 it shares a 95-module run with.
    let modules = encode_barcode("upca", "03600029145").expect("encode upca");
    let expected = decode_barcode("upca", &modules).expect("decodes as upca");
    assert_eq!(expected.len(), 12, "UPC-A is 12 digits");

    let (w, h, luma) = render_barcode(&modules);
    let outcome = scan_and_decode(w, h, &luma).expect("located and decoded");
    assert_eq!(outcome.format(), FORMAT_BARCODE);
    assert_eq!(
        outcome.value().as_deref(),
        Some(expected.as_str()),
        "scanner reports the 12-digit UPC-A value"
    );

    // The same module run *also* reads as a 13-digit EAN-13; the scanner must
    // not report that longer form.
    let ean = decode_barcode("ean13", &modules).expect("also reads as ean13");
    assert_eq!(ean.len(), 13, "the EAN-13 alias is 13 digits");
    assert_ne!(
        outcome.value().as_deref(),
        Some(ean.as_str()),
        "UPC-A must not be reported as its EAN-13 alias"
    );
}

#[test]
fn scan_and_decode_still_reads_a_genuine_ean13() {
    // A real EAN-13 (non-zero number system) is unaffected by the upca-first
    // precedence — the UPC-A decoder rejects its parity pattern, so it falls
    // through to EAN-13 and still reports all 13 digits.
    let modules = encode_barcode("ean13", "5901234123457").expect("encode ean13");
    let expected = decode_barcode("ean13", &modules).expect("decodes as ean13");
    assert_eq!(expected.len(), 13);

    let (w, h, luma) = render_barcode(&modules);
    let outcome = scan_and_decode(w, h, &luma).expect("located and decoded");
    assert_eq!(outcome.format(), FORMAT_BARCODE);
    assert_eq!(outcome.value().as_deref(), Some(expected.as_str()));
}

#[test]
fn scan_and_decode_returns_none_for_a_blank_frame() {
    let luma = vec![255u8; 64 * 64];
    assert!(scan_and_decode(64, 64, &luma).is_none());
}

#[test]
fn scan_and_decode_reads_aztec_end_to_end() {
    // Phase 3 (§2 item 6): the encoder produces compact Aztec, and the new
    // bullseye locator lets the scanner read it straight through `scan_and_decode`
    // across the compact layer sizes (a short payload is 1-layer 15×15, longer
    // ones grow to 19/23/27).
    for text in ["A", "HELLO", "Order #42!", "mission-platform-9", &"X".repeat(30)] {
        let packed = encode_matrix("aztec", text).expect("encode aztec");
        let (w, h, luma) = render_matrix(&packed);
        let outcome = scan_and_decode(w, h, &luma).expect("located and decoded");
        assert_eq!(outcome.format(), FORMAT_AZTEC, "aztec {text:?}");
        assert_eq!(outcome.value().as_deref(), Some(text), "aztec {text:?}");
    }
}

#[test]
fn scan_and_decode_reads_a_rotated_data_matrix() {
    // Phase 3 (§2 item 4): a Data Matrix photographed at an angle. The upright
    // locator's axis-aligned dense bounds overflow a rotated symbol, so the
    // corner-based locator must recover it at every angle and orientation.
    for degrees in [8.0, 20.0, 33.0, 45.0, 90.0, 135.0, 200.0, 315.0] {
        let packed = encode_matrix("datamatrix", "ROTATED-DM").expect("encode");
        let (w, h, luma) = render_matrix(&packed);
        let (rw, rh, rluma) = rotate(w, h, &luma, degrees);
        let outcome = scan_and_decode(rw, rh, &rluma).expect("located and decoded");
        assert_eq!(outcome.format(), FORMAT_DATA_MATRIX, "dm @ {degrees}°");
        assert_eq!(
            outcome.value().as_deref(),
            Some("ROTATED-DM"),
            "dm @ {degrees}°"
        );
    }
}

#[test]
fn scan_and_decode_reads_a_rotated_barcode() {
    // Phase 3 (§2 item 4): a 1D barcode photographed at an angle. The horizontal
    // scan lines miss a tilted barcode, so the orientation must be recovered and
    // the frame straightened before sampling.
    for degrees in [7.0, 18.0, 30.0, 62.0, 90.0, 118.0] {
        let bits = encode_barcode("code128", "TILT-42").expect("encode");
        let (w, h, luma) = render_barcode(&bits);
        let (rw, rh, rluma) = rotate(w, h, &luma, degrees);
        let outcome = scan_and_decode(rw, rh, &rluma).expect("located and decoded");
        assert_eq!(outcome.format(), FORMAT_BARCODE, "barcode @ {degrees}°");
        assert_eq!(
            outcome.value().as_deref(),
            Some("TILT-42"),
            "barcode @ {degrees}°"
        );
    }
}

#[test]
fn scan_and_decode_reads_a_speckled_aztec() {
    // Sensor-style salt-and-pepper noise on an Aztec symbol: the bullseye finder
    // tolerance and the majority-window module read must keep it inside the
    // Aztec Reed-Solomon budget.
    let packed = encode_matrix("aztec", "RESILIENT").expect("encode aztec");
    let (w, h, mut luma) = render_matrix(&packed);
    speckle(&mut luma, 160);
    let outcome = scan_and_decode(w, h, &luma).expect("located and decoded");
    assert_eq!(outcome.format(), FORMAT_AZTEC);
    assert_eq!(outcome.value().as_deref(), Some("RESILIENT"));
}

/// Paste a `sw`×`sh` source image into a `cw`-wide canvas at `(x, y)`.
fn paste(canvas: &mut [u8], cw: usize, src: &[u8], sw: usize, sh: usize, x: usize, y: usize) {
    for row in 0..sh {
        for col in 0..sw {
            canvas[(y + row) * cw + (x + col)] = src[row * sw + col];
        }
    }
}

/// Composite two rendered symbols side by side (a `gap` of white between them)
/// into a single `(w, h, luma)` frame.
fn side_by_side(
    left: &(usize, usize, Vec<u8>),
    right: &(usize, usize, Vec<u8>),
    gap: usize,
) -> (usize, usize, Vec<u8>) {
    let (lw, lh, lluma) = left;
    let (rw, rh, rluma) = right;
    let cw = lw + gap + rw;
    let ch = (*lh).max(*rh);
    let mut canvas = vec![255u8; cw * ch];
    paste(&mut canvas, cw, lluma, *lw, *lh, 0, 0);
    paste(&mut canvas, cw, rluma, *rw, *rh, lw + gap, 0);
    (cw, ch, canvas)
}

#[test]
fn scan_and_decode_all_reads_two_symbols_in_one_frame() {
    // Phase 3 (§2 item 7): two distinct codes in one frame. A single locate
    // commits to one symbol, so `scan_and_decode` returns only one of them; the
    // region sweep must recover *both*.
    let left = render_qr(&encode_qr("LEFT-CODE", 1).expect("encode"));
    let right = render_qr(&encode_qr("RIGHT-CODE", 1).expect("encode"));
    let (cw, ch, canvas) = side_by_side(&left, &right, 48);

    let list = scan_and_decode_all(cw, ch, &canvas);
    let mut values: Vec<String> = (0..list.length())
        .filter_map(|i| list.get(i).and_then(|o| o.value()))
        .collect();
    values.sort();
    assert_eq!(
        values,
        vec!["LEFT-CODE".to_string(), "RIGHT-CODE".to_string()],
        "the sweep decodes both symbols exactly once each"
    );
}

#[test]
fn scan_and_decode_all_mixes_formats_and_deduplicates() {
    // A QR beside a 1D barcode: different formats, both must come back, and the
    // whole-frame + region overlap must not report either twice.
    let qr = render_qr(&encode_qr("MIX-QR", 1).expect("encode"));
    let barcode = render_barcode(&encode_barcode("code128", "MIX-BAR").expect("encode"));
    let (cw, ch, canvas) = side_by_side(&qr, &barcode, 48);

    let list = scan_and_decode_all(cw, ch, &canvas);
    let mut pairs: Vec<(u8, String)> = (0..list.length())
        .filter_map(|i| list.get(i).and_then(|o| o.value().map(|v| (o.format(), v))))
        .collect();
    pairs.sort();
    let mut expected = vec![
        (FORMAT_QR, "MIX-QR".to_string()),
        (FORMAT_BARCODE, "MIX-BAR".to_string()),
    ];
    expected.sort();
    assert_eq!(pairs, expected, "both formats decode, with no duplicates");
}

#[test]
fn scan_and_decode_roi_targets_a_chosen_region() {
    // With two codes in shot, a ROI over one half must return *that* code — the
    // reticle-aimed selection a live scanner needs.
    let left = render_qr(&encode_qr("LEFT-CODE", 1).expect("encode"));
    let right = render_qr(&encode_qr("RIGHT-CODE", 1).expect("encode"));
    let lw = left.0;
    let gap = 48;
    let (cw, ch, canvas) = side_by_side(&left, &right, gap);

    let left_roi = scan_and_decode_roi(cw, ch, &canvas, 0, 0, lw, ch).expect("left roi decodes");
    assert_eq!(left_roi.value().as_deref(), Some("LEFT-CODE"));

    let right_roi =
        scan_and_decode_roi(cw, ch, &canvas, lw + gap, 0, cw - lw - gap, ch).expect("right roi");
    assert_eq!(right_roi.value().as_deref(), Some("RIGHT-CODE"));
}

#[test]
fn scan_and_decode_roi_rejects_neighbouring_clutter() {
    // A Data Matrix with a solid dark block beside it. The whole-frame dense
    // bounds span both, so the upright DM locator sees a ~2:1 (non-square) region
    // and bails; cropping to the ROI removes the clutter before binarisation so
    // the symbol decodes.
    let packed = encode_matrix("datamatrix", "ROICODE").expect("encode");
    let (dw, dh, dluma) = render_matrix(&packed);
    let gap = 30;
    let cw = dw + gap + dw;
    let ch = dh;
    let mut canvas = vec![255u8; cw * ch];
    paste(&mut canvas, cw, &dluma, dw, dh, 0, 0);
    // A solid dark clutter block filling the right third.
    for y in 0..ch {
        for x in dw + gap..cw {
            canvas[y * cw + x] = 0;
        }
    }

    // The whole frame does not resolve the Data Matrix (the clutter defeats it).
    assert_ne!(
        scan_and_decode(cw, ch, &canvas).and_then(|o| o.value()).as_deref(),
        Some("ROICODE"),
        "whole-frame scan is defeated by the neighbouring clutter"
    );

    // A ROI around the symbol crops the clutter away and it decodes.
    let roi = scan_and_decode_roi(cw, ch, &canvas, 0, 0, dw, dh).expect("roi decodes the dm");
    assert_eq!(roi.format(), FORMAT_DATA_MATRIX);
    assert_eq!(roi.value().as_deref(), Some("ROICODE"));
}

/// Render a packed PDF417 symbol (`[w_lo, w_hi, h_lo, h_hi, ...bits]`, the
/// encoder's little-endian 4-byte header) into a `(width, height, luma)` image:
/// each module becomes a `SCALE`-wide × `ROW_SCALE`-tall block with a
/// `QUIET`-module light border, so each stacked row is tall enough to scan.
fn render_pdf417(packed: &[u8]) -> (usize, usize, Vec<u8>) {
    const ROW_SCALE: usize = SCALE * 3;
    let width = u16::from_le_bytes([packed[0], packed[1]]) as usize;
    let height = u16::from_le_bytes([packed[2], packed[3]]) as usize;
    let modules = &packed[4..];
    let out_w = width * SCALE + 2 * QUIET * SCALE;
    let out_h = height * ROW_SCALE + 2 * QUIET * SCALE;
    let mut luma = vec![255u8; out_w * out_h];
    for row in 0..height {
        for col in 0..width {
            if modules[row * width + col] == 0 {
                continue;
            }
            let x0 = QUIET * SCALE + col * SCALE;
            let y0 = QUIET * SCALE + row * ROW_SCALE;
            for y in y0..y0 + ROW_SCALE {
                for x in x0..x0 + SCALE {
                    luma[y * out_w + x] = 0;
                }
            }
        }
    }
    (out_w, out_h, luma)
}

#[test]
fn pdf417_round_trips_through_the_pipeline() {
    // The full image path: encode a PDF417 symbol, render it, and read it back
    // via the single `scan_and_decode` call (locate rows -> assemble codeword
    // matrix -> Reed-Solomon correct -> parse).
    for payload in ["This is PDF417", "1234567890", "Mixed 42 text!"] {
        let packed = encode_pdf417("pdf417", payload).expect("encode pdf417");
        let (w, h, luma) = render_pdf417(&packed);
        let outcome = scan_and_decode(w, h, &luma)
            .unwrap_or_else(|| panic!("located+decoded pdf417 {payload:?}"));
        assert_eq!(outcome.format(), FORMAT_PDF417, "reported as PDF417");
        assert_eq!(outcome.value().as_deref(), Some(payload), "payload survives");
    }
}

#[test]
fn pdf417_reads_upside_down() {
    // A 180deg-rotated symbol must still decode via the reversed-row pass.
    let packed = encode_pdf417("pdf417", "UPSIDE DOWN 417").expect("encode");
    let (w, h, luma) = render_pdf417(&packed);
    let (rw, rh, rotated) = rotate(w, h, &luma, 180.0);
    let outcome = scan_and_decode(rw, rh, &rotated).expect("decodes upside down");
    assert_eq!(outcome.format(), FORMAT_PDF417);
    assert_eq!(outcome.value().as_deref(), Some("UPSIDE DOWN 417"));
}

// The generalised corpus PNG loader (also used by `blackbox.rs`), so the
// regression test below can read real camera-photo fixtures.
#[path = "support/png.rs"]
mod png;

/// Root of the vendored ZXING blackbox corpus.
const CORPUS: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/tests/fixtures/zxing-blackbox");

#[test]
fn row_decoder_reads_camera_upc_ean_photos() {
    // Real ZXING camera-photo fixtures that the single-global-unit grid quantiser
    // locates but cannot decode (its module unit drifts under perspective/blur).
    // The ZXing-style per-digit run-width reader (`barcode_row`) recovers them,
    // each validated by its own checksum. UPC-E in particular has *no* grid path
    // at all (it is absent from `BARCODE_SYMBOLOGIES`), so its reads prove the new
    // reader outright. UPC-A is reported as its 12-digit form (leading-zero EAN-13
    // disambiguation).
    let cases: [(&str, &str); 4] = [
        // UPC-E (8-digit): brand-new capability.
        ("upce-1/1.png", "01234565"),
        ("upce-1/2.png", "00123457"),
        // EAN-13 camera photo previously located-but-not-decoded.
        ("ean13-3/01.png", "9780764544200"),
        // EAN-8 camera photo.
        ("ean8-1/1.png", "48512343"),
    ];
    for (relative, expected) in cases {
        let path = format!("{CORPUS}/{relative}");
        let (w, h, luma) = png::load_png_luma(&path);
        let outcome = scan_and_decode(w, h, &luma)
            .unwrap_or_else(|| panic!("{relative}: located+decoded"));
        assert_eq!(outcome.format(), FORMAT_BARCODE, "{relative}: reported as 1D barcode");
        assert_eq!(
            outcome.value().as_deref(),
            Some(expected),
            "{relative}: decoded value"
        );
    }
}

#[test]
fn row_decoder_keeps_the_false_positive_guard_clean() {
    // A representative negative-folder image (no barcode present) must still not
    // decode: the trailing-quiet-zone requirement and the multi-row consensus for
    // the short symbologies keep the row reader from inventing a checksum-valid
    // value out of clutter.
    for relative in ["falsepositives/02.png", "falsepositives-2/04.png"] {
        let path = format!("{CORPUS}/{relative}");
        let (w, h, luma) = png::load_png_luma(&path);
        let decoded = scan_and_decode(w, h, &luma).and_then(|o| o.value());
        assert_eq!(decoded, None, "{relative}: must not produce a false positive");
    }
}
