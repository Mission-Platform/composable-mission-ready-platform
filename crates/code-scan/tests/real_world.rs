//! Real-world capture regression tests.
//!
//! Unlike `pipeline.rs` (which renders *synthetic* encoder output and degrades
//! it programmatically), these load an actual photograph — a phone screen held
//! up to a webcam, shot at an angle with glare and a cluttered background — and
//! assert the whole `scan_and_decode` pipeline reads it. This is the end-to-end
//! test for the kind of frame a live scanner really sees, where the symbol is a
//! small, perspective-distorted patch inside a busy scene.
//!
//! Native-only: it links the decoders through `mission-platform-code-scan` and
//! decodes `img.png` with a tiny in-test PNG reader (zlib inflate via
//! `miniz_oxide`), so no image crate is pulled into the wasm build.

#![cfg(not(target_arch = "wasm32"))]

use mission_platform_code_scan::{
    scan, scan_and_decode, BARCODE_CANDIDATE_SEPARATOR, FORMAT_BARCODE,
};

#[path = "support/png.rs"]
mod png;
use png::load_png_luma;

/// Absolute path to the checked-in real-world capture at the workspace root.
const IMG_PNG: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/../../img.png");

/// The barcode visible in `img.png`: an EAN-8 whose printed digits are
/// `01234567` (the classic generator sample — its trailing digit is the encoded
/// eighth digit, not a recomputed mod-10 check).
const EXPECTED_VALUE: &str = "01234567";

#[test]
#[ignore]
fn debug_dump_candidates() {
    let (width, height, luma) = load_png_luma(IMG_PNG);
    eprintln!("image {width}x{height}");
    let tagged = scan(width, height, &luma);
    match tagged {
        None => eprintln!("scan: nothing located"),
        Some(buf) => {
            eprintln!("scan: format={} payload_len={}", buf[0], buf.len());
            let payload = &buf[1..];
            let candidates: Vec<&[u8]> = payload
                .split(|&b| b == BARCODE_CANDIDATE_SEPARATOR)
                .collect();
            eprintln!("candidates: {}", candidates.len());
            for (i, c) in candidates.iter().enumerate().take(12) {
                // Run-length summary of the module bits.
                let mut runs: Vec<(u8, usize)> = Vec::new();
                for &b in c.iter() {
                    if let Some(last) = runs.last_mut() {
                        if last.0 == b {
                            last.1 += 1;
                            continue;
                        }
                    }
                    runs.push((b, 1));
                }
                eprintln!(
                    "  cand{i}: modules={} runs={} widths={:?}",
                    c.len(),
                    runs.len(),
                    runs.iter().map(|(_, n)| *n).collect::<Vec<_>>()
                );
            }
        }
    }
}

// NOTE: This end-to-end assertion is a *known non-compliant* case, not a
// regression. Step 7 added a ZXing-style per-digit run-width 1D reader
// (`barcode_row`) that decodes the camera-photo UPC/EAN corpus at scale, and it
// now *locates* this symbol cleanly too. But `img.png` encodes the classic
// generator sample `01234567`, whose trailing digit is **not** a valid mod-10
// check (`0123456` checksums to `5`, giving `01234565`). A spec-compliant reader
// — this one, and ZXing itself — rejects a barcode that fails its own checksum,
// so the pipeline returns no value here *by design* (dropping the checksum guard
// to read it would re-open the false positives that guard eliminates). It is
// kept `#[ignore]` as documentation of that intentional rejection, run explicitly
// with `--ignored`; it never masks a regression.
#[test]
#[ignore = "img.png encodes a checksum-invalid EAN-8 (01234567); a compliant reader rejects it — see note"]
fn scan_and_decode_reads_the_real_world_barcode_photo() {
    let (width, height, luma) = load_png_luma(IMG_PNG);
    assert!(width > 0 && height > 0, "empty image");

    let outcome = scan_and_decode(width, height, &luma)
        .expect("a barcode should be located and decoded in the real-world photo");
    assert_eq!(
        outcome.format(),
        FORMAT_BARCODE,
        "the symbol in img.png is a 1D barcode"
    );
    assert_eq!(
        outcome.value().as_deref(),
        Some(EXPECTED_VALUE),
        "img.png encodes EAN-8 {EXPECTED_VALUE}"
    );
}
