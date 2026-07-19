//! Dependency-free image/frame code scanner, compiled to WebAssembly for
//! `@mission-platform/code-scanner` via `wasm-bindgen` / `wasm-pack`.
//!
//! The scanner bridges the gap between a raw image (a decoded file upload or a
//! live camera frame) and the matrix/bit decoders shipped by the other
//! packages. It takes a single-channel **luma** buffer (`0` = black, `255` =
//! white, row-major `width * height` bytes), binarises it, then runs the
//! per-symbology locators in [`qr`], [`datamatrix`] and [`barcode`]. Each
//! locator produces exactly the buffer its matching decoder expects, so the JS
//! wrapper can hand the result straight to `@mission-platform/qr-code`,
//! `@mission-platform/matrix-code` or `@mission-platform/barcode`.
//!
//! The public surface is the `wasm-bindgen` functions below. wasm-bindgen
//! generates the JS runtime that marshals the byte buffers, so the TypeScript
//! package imports that runtime directly (from `generated/scan`).
//!
//! Building with the optional `console` feature installs a panic hook and a
//! `tracing-wasm` subscriber that routes `tracing` events to the browser
//! devtools console for debugging.

mod aztec;
mod barcode;
mod barcode_row;
mod datamatrix;
mod gs1_databar;
mod image;
mod maxicode;
mod pdf417;
mod qr;

use image::{Bitmap, Grey};
use mission_platform_barcode_decode::decode_modules as decode_barcode_modules;
use mission_platform_matrix_code_decode::{decode_matrix, decode_matrix_with_erasures};
use mission_platform_qr_code_decode::{decode_qr, decode_qr_with_erasures};
use wasm_bindgen::prelude::*;

/// Sub-module grid nudges (in module units) the retry loop re-samples a located
/// symbol at. `(0, 0)` is the estimated grid; the ±¼-module shifts recover a
/// symbol whose true module centres sit slightly off it (sub-pixel drift from
/// perspective, rounding or a coarse locate).
const SAMPLE_OFFSETS: [(f64, f64); 5] = [
    (0.0, 0.0),
    (0.25, 0.0),
    (-0.25, 0.0),
    (0.0, 0.25),
    (0.0, -0.25),
];

/// Every 1D symbology the barcode decoder is asked to try, in precedence order
/// (the first that reads wins). Mirrors `BARCODE_SYMBOLOGIES` in the JS spec.
/// The winning `(symbology, value)` is post-processed by
/// [`disambiguate_symbology`] to resolve the UPC-A/EAN-13 overlap.
const BARCODE_SYMBOLOGIES: [&str; 7] = [
    "code128", "code39", "ean13", "ean8", "upca", "itf", "codabar",
];

// Build-time metadata captured by `shadow-rs` (see `build.rs`): crate version,
// git commit, build timestamp, Rust toolchain, …
shadow_rs::shadow!(build);

/// Format tag prefixed to the buffer returned by [`scan`], identifying which
/// locator matched.
pub const FORMAT_QR: u8 = 0;
/// Data Matrix format tag (see [`FORMAT_QR`]).
pub const FORMAT_DATA_MATRIX: u8 = 1;
/// 1D barcode format tag (see [`FORMAT_QR`]).
pub const FORMAT_BARCODE: u8 = 2;
/// Compact Aztec format tag (see [`FORMAT_QR`]).
pub const FORMAT_AZTEC: u8 = 3;
/// PDF417 format tag (see [`FORMAT_QR`]).
pub const FORMAT_PDF417: u8 = 4;
/// GS1 DataBar (RSS-14) format tag (see [`FORMAT_QR`]).
pub const FORMAT_DATABAR: u8 = 5;
/// MaxiCode format tag (see [`FORMAT_QR`]).
pub const FORMAT_MAXICODE: u8 = 6;

/// Separator byte between the successive 1D-barcode candidate module runs packed
/// into a single [`FORMAT_BARCODE`] payload. Module bits are only `0`/`1`, so `2`
/// is unambiguous; the JS decode stage splits on it and tries each candidate
/// scan line in turn until one decodes.
pub const BARCODE_CANDIDATE_SEPARATOR: u8 = 2;

/// Initialise optional in-browser diagnostics (panic hook + `tracing-wasm`
/// subscriber) when the crate is built with the `console` feature. A no-op
/// otherwise.
#[cfg(feature = "console")]
#[wasm_bindgen(start)]
#[tracing::instrument(skip_all)]
pub fn start() {
    mission_platform_console_panic_hook::set_once();
    tracing_wasm::set_as_global_default();
}

/// A human-readable build stamp: `"<version> (<commit>) built <time> with <rustc>"`.
/// Sourced from `shadow-rs` build-time information.
#[wasm_bindgen()]
#[tracing::instrument(skip_all)]
pub fn build_info() -> String {
    format!(
        "{} ({}) built {} with {}",
        build::PKG_VERSION,
        build::SHORT_COMMIT,
        build::BUILD_TIME,
        build::RUST_VERSION,
    )
}

/// Locate and sample a QR symbol in the `width`×`height` luma image, returning
/// the packed `[size, ...modules]` matrix (row-major, `1` = dark) that the QR
/// decoder consumes, or `undefined` (JS) when no symbol is found.
#[wasm_bindgen]
#[tracing::instrument(skip_all)]
pub fn scan_qr(width: usize, height: usize, luma: &[u8]) -> Option<Vec<u8>> {
    let bitmap = image::binarize(width, height, luma)?;
    qr::scan(&bitmap)
}

/// Locate and sample a Data Matrix symbol in the `width`×`height` luma image,
/// returning the packed `[size, ...modules]` matrix (row-major, `1` = dark) that
/// the matrix-code decoder consumes, or `undefined` (JS) when none is found.
#[wasm_bindgen]
#[tracing::instrument(skip_all)]
pub fn scan_matrix(width: usize, height: usize, luma: &[u8]) -> Option<Vec<u8>> {
    let bitmap = image::binarize(width, height, luma)?;
    datamatrix::scan(&bitmap)
}

/// Locate and sample a 1D barcode in the `width`×`height` luma image, returning
/// the flat run of module bits (`1` = bar, `0` = space) that the barcode decoder
/// consumes, or `undefined` (JS) when none is found.
#[wasm_bindgen]
#[tracing::instrument(skip_all)]
pub fn scan_barcode(width: usize, height: usize, luma: &[u8]) -> Option<Vec<u8>> {
    let bitmap = image::binarize(width, height, luma)?;
    barcode::scan(&bitmap)
}

/// Try every locator in turn (QR → Data Matrix → 1D barcode) and return the
/// first match as a tagged buffer: `[format, ...payload]`, where `format` is one
/// of [`FORMAT_QR`], [`FORMAT_DATA_MATRIX`] or [`FORMAT_BARCODE`] and `payload`
/// is that locator's own buffer. Returns `undefined` (JS) when nothing matches.
///
/// Binarisation runs once and the resulting bitmap is shared across the
/// locators, so a combined scan is cheaper than calling the three helpers
/// separately.
#[wasm_bindgen]
#[tracing::instrument(skip_all)]
pub fn scan(width: usize, height: usize, luma: &[u8]) -> Option<Vec<u8>> {
    tracing::debug!(
        width,
        height,
        luma_len = luma.len(),
        "scan: begin combined scan"
    );
    let Some(bitmap) = image::binarize(width, height, luma) else {
        tracing::debug!("scan: binarize rejected the buffer (empty or size mismatch)");
        return None;
    };
    if let Some(payload) = qr::scan(&bitmap) {
        tracing::debug!(modules = payload.len(), "scan: matched QR");
        return Some(tagged(FORMAT_QR, payload));
    }
    if let Some(payload) = datamatrix::scan(&bitmap) {
        tracing::debug!(bytes = payload.len(), "scan: matched Data Matrix");
        return Some(tagged(FORMAT_DATA_MATRIX, payload));
    }
    let candidates = barcode::scan_candidates(&bitmap);
    if !candidates.is_empty() {
        tracing::debug!(
            candidates = candidates.len(),
            "scan: matched 1D barcode (candidate scan lines)"
        );
        return Some(tagged(FORMAT_BARCODE, join_barcode_candidates(&candidates)));
    }
    tracing::debug!("scan: no locator matched this frame");
    None
}

/// The result of [`scan_and_decode`]: the located symbol's `format` tag (one of
/// [`FORMAT_QR`], [`FORMAT_DATA_MATRIX`], [`FORMAT_BARCODE`]) and its decoded
/// `value`. `value` is `undefined` (JS) when the symbol was located and sampled
/// but its payload could not be decoded — the "located but undecodable" case.
#[wasm_bindgen]
#[derive(Clone)]
pub struct ScanOutcome {
    format: u8,
    value: Option<String>,
}

#[wasm_bindgen]
impl ScanOutcome {
    /// The located symbol's format tag.
    #[wasm_bindgen(getter)]
    pub fn format(&self) -> u8 {
        self.format
    }

    /// The decoded payload, or `undefined` when the symbol could not be decoded.
    #[wasm_bindgen(getter)]
    pub fn value(&self) -> Option<String> {
        self.value.clone()
    }
}

/// Locate **and decode** the first supported code (QR → Data Matrix → 1D
/// barcode) in the `width`×`height` luma image, entirely in Rust — the whole
/// pipeline (binarise → locate → sample → decode) runs in one call, so the
/// located modules never cross back into JS to be decoded by a second wasm
/// module.
///
/// Returns the [`ScanOutcome`] for the first located symbol (its `value` is
/// `undefined` when it was located but could not be decoded), or `undefined`
/// (JS) when no locator matched. Binarisation runs once and its bitmap is shared
/// across the locators.
#[wasm_bindgen]
#[tracing::instrument(skip_all)]
pub fn scan_and_decode(width: usize, height: usize, luma: &[u8]) -> Option<ScanOutcome> {
    tracing::debug!(
        width,
        height,
        luma_len = luma.len(),
        "scan_and_decode: begin"
    );
    locate_and_decode_first(width, height, luma)
}

/// Locate **and decode** the first supported code in a `width`×`height` luma
/// image, or `None` when nothing is located. The plain-Rust core shared by the
/// `wasm-bindgen` [`scan_and_decode`] export, the ROI entry point
/// [`scan_and_decode_roi`] and the multi-symbol sweep [`scan_and_decode_all`].
#[tracing::instrument(skip_all)]
fn locate_and_decode_first(width: usize, height: usize, luma: &[u8]) -> Option<ScanOutcome> {
    // A grey view for sub-pixel (bilinear) module sampling and per-module
    // confidence, shared across every attempt below.
    let grey = Grey::new(width, height, luma);

    // Binarisation attempts, cheapest first: a fast global-Otsu threshold, then
    // a local adaptive one that survives glare and lighting gradients. The retry
    // loop tries the whole locate→sample→decode pipeline against each.
    let mut bitmaps: Vec<Bitmap> = Vec::new();
    if let Some(bitmap) = image::binarize(width, height, luma) {
        bitmaps.push(bitmap);
    }
    if let Some(bitmap) = image::binarize_adaptive(width, height, luma) {
        bitmaps.push(bitmap);
    }
    if bitmaps.is_empty() {
        tracing::debug!("scan_and_decode: binarize rejected the buffer (empty or size mismatch)");
        return None;
    }

    // The first *decoded* symbol wins immediately; a symbol that is located but
    // undecodable on every attempt is remembered and returned only if nothing
    // decodes (preserving the "located but undecodable" outcome).
    let mut first_located: Option<ScanOutcome> = None;

    for bitmap in &bitmaps {
        // Try each format in precedence order, evaluated lazily so a decode
        // short-circuits the rest of this bitmap's work.
        let attempts: [(u8, &dyn Fn() -> DecodeAttempt); 7] = [
            (FORMAT_QR, &|| try_decode_qr(bitmap, grey.as_ref())),
            (FORMAT_DATA_MATRIX, &|| {
                try_decode_matrix(bitmap, grey.as_ref(), width, height, luma)
            }),
            (FORMAT_AZTEC, &|| try_decode_aztec(bitmap)),
            (FORMAT_PDF417, &|| try_decode_pdf417(bitmap)),
            (FORMAT_DATABAR, &|| try_decode_databar(bitmap)),
            (FORMAT_MAXICODE, &|| try_decode_maxicode(bitmap)),
            (FORMAT_BARCODE, &|| try_decode_barcode(bitmap, width, height, luma)),
        ];
        for (format, attempt) in attempts {
            match attempt() {
                // Located and decoded — done.
                Some(Some(value)) => {
                    tracing::debug!(format, "scan_and_decode: decoded a symbol");
                    return Some(ScanOutcome {
                        format,
                        value: Some(value),
                    });
                }
                // Located but undecodable — remember the first such outcome.
                Some(None) => {
                    first_located.get_or_insert(ScanOutcome {
                        format,
                        value: None,
                    });
                }
                // Not located on this bitmap.
                None => {}
            }
        }
    }

    if first_located.is_none() {
        tracing::debug!("scan_and_decode: no locator matched this frame");
    }
    first_located
}

/// Locate **and decode** the first supported code inside the rectangular region
/// of interest `[roi_x, roi_x + roi_w) × [roi_y, roi_y + roi_h)` of the
/// `width`×`height` luma image, entirely in Rust.
///
/// The crop happens **before** binarisation, so surrounding clutter (packaging,
/// a hand, background text) never reaches Otsu's histogram or the ink-bounding
/// locators — the single biggest win for the 1D-barcode and Data Matrix locators
/// on a live camera frame, where a reticle marks where the user aimed. A ROI
/// that is empty or falls entirely outside the frame yields `undefined` (JS);
/// one that overhangs an edge is clamped to the image. Passing the whole frame
/// is identical to [`scan_and_decode`].
#[wasm_bindgen]
#[tracing::instrument(skip_all)]
pub fn scan_and_decode_roi(
    width: usize,
    height: usize,
    luma: &[u8],
    roi_x: usize,
    roi_y: usize,
    roi_w: usize,
    roi_h: usize,
) -> Option<ScanOutcome> {
    let (cw, ch, cropped) = crop_luma(width, height, luma, roi_x, roi_y, roi_w, roi_h)?;
    tracing::debug!(
        roi_x,
        roi_y,
        cw,
        ch,
        "scan_and_decode_roi: scanning cropped region"
    );
    locate_and_decode_first(cw, ch, &cropped)
}

/// A list of [`ScanOutcome`]s returned by [`scan_and_decode_all`], exposed to JS
/// with `length` + indexed `get` accessors (a plain `Vec<ScanOutcome>` cannot
/// cross the wasm-bindgen boundary because `ScanOutcome` owns a JS handle).
#[wasm_bindgen]
pub struct ScanOutcomeList {
    items: Vec<ScanOutcome>,
}

#[wasm_bindgen]
impl ScanOutcomeList {
    /// How many symbols were decoded.
    #[wasm_bindgen(getter)]
    pub fn length(&self) -> usize {
        self.items.len()
    }

    /// The `index`-th decoded symbol (a fresh [`ScanOutcome`]), or `undefined`
    /// (JS) when `index` is out of range.
    pub fn get(&self, index: usize) -> Option<ScanOutcome> {
        self.items.get(index).cloned()
    }
}

/// Locate and decode **every** distinct code in the `width`×`height` luma image
/// (not just the first), returning them in discovery order with duplicates
/// removed.
///
/// A single locate commits to one symbol per format, so several codes in one
/// frame (e.g. a QR beside a barcode, or two labels in shot) would otherwise
/// lose all but the first. This sweeps a small set of regions — the whole frame,
/// then overlapping halves and quadrants — decoding each in Rust and
/// deduplicating by `(format, value)`. Overlapping tiles mean a symbol straddling
/// a split is still caught whole by a coarser region, and the per-region crop
/// doubles as clutter rejection. Only successfully decoded symbols are returned.
#[wasm_bindgen]
#[tracing::instrument(skip_all)]
pub fn scan_and_decode_all(width: usize, height: usize, luma: &[u8]) -> ScanOutcomeList {
    let mut items: Vec<ScanOutcome> = Vec::new();
    let mut seen: Vec<(u8, String)> = Vec::new();

    for (rx, ry, rw, rh) in scan_regions(width, height) {
        let Some((cw, ch, cropped)) = crop_luma(width, height, luma, rx, ry, rw, rh) else {
            continue;
        };
        let Some(outcome) = locate_and_decode_first(cw, ch, &cropped) else {
            continue;
        };
        // Only decoded symbols are useful to a multi-scan caller; a located but
        // undecodable region carries no payload to deduplicate on.
        let Some(value) = outcome.value.clone() else {
            continue;
        };
        let key = (outcome.format, value);
        if seen.contains(&key) {
            continue;
        }
        seen.push(key);
        items.push(outcome);
    }

    tracing::debug!(count = items.len(), "scan_and_decode_all: symbols decoded");
    ScanOutcomeList { items }
}

/// The regions [`scan_and_decode_all`] scans, coarsest first: the whole frame,
/// the two half-splits on each axis, then the four quadrants. Every sub-region
/// is inflated by [`REGION_OVERLAP`] on each side so a symbol sitting on a split
/// line still falls wholly inside at least one region.
fn scan_regions(width: usize, height: usize) -> Vec<(usize, usize, usize, usize)> {
    if width == 0 || height == 0 {
        return Vec::new();
    }
    let mut regions = vec![(0, 0, width, height)];
    let hw = width / 2;
    let hh = height / 2;
    // Only subdivide an axis that is large enough for the halves to be useful.
    let split_x = width >= 32;
    let split_y = height >= 32;
    let ox = (width as f64 * REGION_OVERLAP) as usize;
    let oy = (height as f64 * REGION_OVERLAP) as usize;

    if split_x {
        regions.push((0, 0, hw + ox, height));
        regions.push((hw.saturating_sub(ox), 0, width - hw + ox, height));
    }
    if split_y {
        regions.push((0, 0, width, hh + oy));
        regions.push((0, hh.saturating_sub(oy), width, height - hh + oy));
    }
    if split_x && split_y {
        for &(qx, qw) in &[(0usize, hw + ox), (hw.saturating_sub(ox), width - hw + ox)] {
            for &(qy, qh) in &[(0usize, hh + oy), (hh.saturating_sub(oy), height - hh + oy)] {
                regions.push((qx, qy, qw, qh));
            }
        }
    }
    regions
}

/// Fraction of each axis a subdivided [`scan_regions`] tile overlaps its
/// neighbour, so a symbol on a split line is still framed whole by one tile.
const REGION_OVERLAP: f64 = 0.15;

/// Copy the rectangular region `[x, x + w) × [y, y + h)` out of a `width`×`height`
/// luma buffer into its own contiguous `(w', h', luma)` image, clamped to the
/// frame. Returns `None` when the buffer size is wrong or the clamped region is
/// empty (entirely outside the frame).
fn crop_luma(
    width: usize,
    height: usize,
    luma: &[u8],
    x: usize,
    y: usize,
    w: usize,
    h: usize,
) -> Option<(usize, usize, Vec<u8>)> {
    if width == 0 || height == 0 || luma.len() != width * height {
        return None;
    }
    let x0 = x.min(width);
    let y0 = y.min(height);
    let x1 = (x + w).min(width);
    let y1 = (y + h).min(height);
    if x1 <= x0 || y1 <= y0 {
        return None;
    }
    // The whole frame needs no copy-shuffle; hand the buffer straight through.
    if x0 == 0 && y0 == 0 && x1 == width && y1 == height {
        return Some((width, height, luma.to_vec()));
    }
    let cw = x1 - x0;
    let ch = y1 - y0;
    let mut cropped = vec![0u8; cw * ch];
    for row in 0..ch {
        let src = (y0 + row) * width + x0;
        cropped[row * cw..(row + 1) * cw].copy_from_slice(&luma[src..src + cw]);
    }
    Some((cw, ch, cropped))
}

/// The result of one per-format decode attempt: `None` = the symbol was not
/// located, `Some(None)` = located but undecodable, `Some(Some(value))` =
/// located and decoded.
type DecodeAttempt = Option<Option<String>>;

/// Locate and decode a QR symbol across the cooperating retry strategies: the
/// fast hard-bitmap sample first, then grey-level (sub-pixel) sampling at each
/// [`SAMPLE_OFFSETS`] nudge, trying erasure-aware decoding (low-confidence
/// modules as Reed-Solomon erasures) before a blind decode.
#[tracing::instrument(skip_all)]
fn try_decode_qr(bitmap: &Bitmap, grey: Option<&Grey>) -> DecodeAttempt {
    let mut located = false;

    // Fast path: hard-bitmap sample, blind decode.
    if let Some(packed) = qr::scan(bitmap) {
        located = true;
        if let Some(value) = decode_qr(&packed) {
            return Some(Some(value));
        }
    }

    // Refined path: grey sub-pixel sampling with confidence, across grid nudges.
    if let Some(grey) = grey {
        for &offset in &SAMPLE_OFFSETS {
            let Some((packed, erasures)) = qr::scan_with_confidence(bitmap, grey, offset) else {
                continue;
            };
            located = true;
            if erasures.iter().any(|&e| e != 0) {
                if let Some(value) = decode_qr_with_erasures(&packed, &erasures) {
                    return Some(Some(value));
                }
            }
            if let Some(value) = decode_qr(&packed) {
                return Some(Some(value));
            }
        }
    }

    located.then_some(None)
}

/// Locate and decode a Data Matrix symbol across the retry strategies — the
/// mirror of [`try_decode_qr`] for square Data Matrix — including the rotation
/// fallbacks. `width`/`height`/`luma` are the frame the `bitmap` was binarised
/// from, needed to straighten a steeply rotated symbol.
///
/// This lives entirely in the Data Matrix precedence slot (before Aztec/1D) so a
/// rotated matrix is recovered here rather than being mis-claimed by a later
/// format's locator on the same frame.
#[tracing::instrument(skip_all)]
fn try_decode_matrix(
    bitmap: &Bitmap,
    grey: Option<&Grey>,
    width: usize,
    height: usize,
    luma: &[u8],
) -> DecodeAttempt {
    // Upright + affine (rotation/shear) attempts on the frame as given.
    match decode_matrix_upright(bitmap, grey) {
        Some(Some(value)) => return Some(Some(value)),
        upright => {
            // Straighten-and-retry fallback for a steeply rotated symbol, whose
            // corner geometry is too noisy for the affine sampler: recover the
            // rotation from the solid finder edge, rotate the whole frame upright
            // and re-run the tuned upright pipeline (both ± signs, since the
            // detected edge fixes the angle only up to handedness).
            if let Some(angle) = bitmap.orientation() {
                if angle.abs() > 0.05 {
                    for correction in [-angle, angle] {
                        let (rw, rh, rotated) = image::rotate_luma(width, height, luma, correction);
                        let rgrey = Grey::new(rw, rh, &rotated);
                        for rbitmap in [
                            image::binarize(rw, rh, &rotated),
                            image::binarize_adaptive(rw, rh, &rotated),
                        ]
                        .into_iter()
                        .flatten()
                        {
                            if let Some(Some(value)) =
                                decode_matrix_upright(&rbitmap, rgrey.as_ref())
                            {
                                tracing::debug!(
                                    correction,
                                    "try_decode_matrix: decoded a straightened symbol"
                                );
                                return Some(Some(value));
                            }
                        }
                    }
                }
            }
            upright
        }
    }
}

/// The upright + affine Data Matrix attempts on a single (already binarised)
/// frame: fast hard-bitmap sample, grey sub-pixel sampling with Reed-Solomon
/// erasures across grid nudges, then the corner-based oriented locator (which
/// handles moderate rotation and shear). Returns the [`DecodeAttempt`]; the
/// straighten-and-retry step in [`try_decode_matrix`] wraps this.
#[tracing::instrument(skip_all)]
fn decode_matrix_upright(bitmap: &Bitmap, grey: Option<&Grey>) -> DecodeAttempt {
    let mut located = false;

    if let Some(sampled) = datamatrix::scan(bitmap) {
        located = true;
        if let Some(value) = decode_scanned_matrix(&sampled, &[]) {
            return Some(Some(value));
        }
    }

    if let Some(grey) = grey {
        for &offset in &SAMPLE_OFFSETS {
            let Some((sampled, erasures)) = datamatrix::scan_with_confidence(bitmap, grey, offset)
            else {
                continue;
            };
            located = true;
            if erasures.iter().any(|&e| e != 0) {
                if let Some(value) = decode_scanned_matrix(&sampled, &erasures) {
                    return Some(Some(value));
                }
            }
            if let Some(value) = decode_scanned_matrix(&sampled, &[]) {
                return Some(Some(value));
            }
        }
    }

    // Rotation/shear fallback: the upright locators trust the axis-aligned dense
    // bounds, which a rotated symbol overflows. The corner-based locator recovers
    // the symbol at any angle and returns each 90° orientation; the decoder's own
    // finder + Reed-Solomon checks accept only the correct one.
    for sampled in datamatrix::scan_oriented_candidates(bitmap) {
        located = true;
        if let Some(value) = decode_scanned_matrix(&sampled, &[]) {
            return Some(Some(value));
        }
    }

    located.then_some(None)
}

/// Locate and decode a 1D barcode, including a rotation fallback.
/// `width`/`height`/`luma` are the frame the `bitmap` was binarised from, used to
/// straighten a tilted barcode so the horizontal scan lines cross its bars.
///
/// When a meaningful tilt is detected the straightened read is tried **first**: a
/// horizontal scan line across a tilted barcode leaves the bar band partway and
/// can partially decode to a spurious short value (which a self-checking
/// symbology's checksum may still accept), so the full straightened read must win
/// over that partial. A near-upright frame decodes directly, with straightening
/// kept as a fallback (e.g. bars running vertically read as a ~0° band that only
/// a +90° turn resolves).
#[tracing::instrument(skip_all)]
fn try_decode_barcode(
    bitmap: &Bitmap,
    width: usize,
    height: usize,
    luma: &[u8],
) -> DecodeAttempt {
    let angle = bitmap.orientation();

    // Detected tilt beyond a few degrees: straighten before trusting the frame.
    if let Some(angle) = angle {
        if angle.abs() > 0.05 {
            if let Some(value) = decode_barcode_straightened(angle, width, height, luma) {
                return Some(Some(value));
            }
        }
    }

    match decode_barcode_frame(bitmap) {
        Some(Some(value)) => Some(Some(value)),
        upright => {
            if let Some(angle) = angle {
                if let Some(value) = decode_barcode_straightened(angle, width, height, luma) {
                    return Some(Some(value));
                }
            }
            upright
        }
    }
}

/// Straighten the frame by the recovered barcode `angle` and decode.
///
/// The orientation is only known modulo 90° and up to handedness, and a linear
/// symbology is read in a fixed direction (a 180° flip reverses the bars), so the
/// bars must end up vertical *and* running the right way. This tries both signs
/// of the angle across all four 90° quadrants — the full set of axis-aligning
/// rotations — and returns the first correct-direction full decode. Rotations are
/// deduplicated to the nearest degree; a near-zero correction is skipped (the
/// caller already tried the frame as-is).
#[tracing::instrument(skip_all)]
fn decode_barcode_straightened(
    angle: f64,
    width: usize,
    height: usize,
    luma: &[u8],
) -> Option<String> {
    use std::f64::consts::FRAC_PI_2;
    let mut tried: Vec<i64> = Vec::new();
    for base in [-angle, angle] {
        for quadrant in 0..4 {
            let correction = base + quadrant as f64 * FRAC_PI_2;
            // Deduplicate near-identical rotations (to the nearest degree, mod 360).
            let key = (correction.to_degrees().round() as i64).rem_euclid(360);
            if correction.abs() < 0.05 || tried.contains(&key) {
                continue;
            }
            tried.push(key);
            let (rw, rh, rotated) = image::rotate_luma(width, height, luma, correction);
            for rbitmap in [
                image::binarize(rw, rh, &rotated),
                image::binarize_adaptive(rw, rh, &rotated),
            ]
            .into_iter()
            .flatten()
            {
                if let Some(Some(value)) = decode_barcode_frame(&rbitmap) {
                    tracing::debug!(correction, "decode_barcode_straightened: decoded");
                    return Some(value);
                }
            }
        }
    }
    None
}

/// The 1D-barcode attempts on a single (already binarised) frame: sample the
/// ranked candidate scan lines and try each against every symbology. Returns the
/// [`DecodeAttempt`]; the straighten-and-retry step in [`try_decode_barcode`]
/// wraps this.
#[tracing::instrument(skip_all)]
fn decode_barcode_frame(bitmap: &Bitmap) -> DecodeAttempt {
    let candidates = barcode::scan_candidates(bitmap);
    let located = !candidates.is_empty();

    // First the fast grid decoder: quantise each candidate scan line to whole
    // modules and match against every symbology. Exact on a clean upload.
    if let Some(value) = decode_any_barcode(&candidates) {
        return Some(Some(value));
    }

    // Fallback: the ZXing-style per-digit run-width reader recovers the UPC/EAN
    // family from a camera photo whose module width drifts across the symbol —
    // the "located but not decoded" case the single-unit grid quantiser cannot
    // handle. Its checksum makes every read self-validating, so it cannot add a
    // false positive. It runs its own band detection, so it is tried even when
    // the grid locator found no candidate scan line.
    if let Some((symbology, value)) = barcode_row::scan(bitmap) {
        return Some(Some(disambiguate_symbology(symbology, value)));
    }

    // Located by the grid locator but decoded by neither path: preserve the
    // "located but undecodable" outcome. Nothing located at all: report a miss.
    if located {
        Some(None)
    } else {
        None
    }
}

/// Locate and decode a compact Aztec symbol: the bullseye locator fixes the
/// centre and module size but not the layer count, so it samples one buffer per
/// candidate compact size; each is tried against the Aztec decoder (whose
/// mode-message + Reed-Solomon checks reject the wrong sizes) until one reads.
#[tracing::instrument(skip_all)]
fn try_decode_aztec(bitmap: &Bitmap) -> DecodeAttempt {
    let candidates = aztec::scan_candidates(bitmap);
    if candidates.is_empty() {
        return None;
    }
    for sampled in &candidates {
        if let Some(value) = decode_scanned_aztec(sampled) {
            return Some(Some(value));
        }
    }
    Some(None)
}

/// Locate and decode a GS1 DataBar (RSS-14) symbol. The row decoder validates
/// every read with the symbol's own checksum, so a match is authoritative;
/// there is no cheap "located but undecodable" signal, so this reports either a
/// decoded value or nothing (which keeps the false-positive guard clean).
#[tracing::instrument(skip_all)]
fn try_decode_databar(bitmap: &Bitmap) -> DecodeAttempt {
    gs1_databar::scan(bitmap).map(Some)
}

/// Locate and decode a PDF417 symbol. The locator assembles the codeword matrix
/// from the row indicators and hands it to the Reed–Solomon-checked decoder, so
/// a returned value is authoritative; like DataBar there is no useful "located
/// but undecodable" signal, so this reports a decoded value or nothing.
#[tracing::instrument(skip_all)]
fn try_decode_pdf417(bitmap: &Bitmap) -> DecodeAttempt {
    pdf417::scan(bitmap).map(Some)
}

/// Locate and decode a MaxiCode symbol. The pure-bits sampler always produces a
/// 30×33 grid for any inked image, but the decoder's three GF(64) Reed–Solomon
/// blocks reject anything that is not a real MaxiCode, so a returned value is
/// authoritative; there is no useful "located but undecodable" signal, so this
/// reports a decoded value or nothing (keeping the false-positive guard clean).
#[tracing::instrument(skip_all)]
fn try_decode_maxicode(bitmap: &Bitmap) -> DecodeAttempt {
    maxicode::scan(bitmap).map(Some)
}

/// Decode a compact Aztec symbol sampled by [`aztec::scan_candidates`] as a
/// `[size, ...modules]` buffer. The Aztec decoder expects the `[width, height,
/// ...modules]` header shared by the matrix symbologies, so the square size is
/// repeated.
fn decode_scanned_aztec(sampled: &[u8]) -> Option<String> {
    let size = *sampled.first()?;
    let mut repacked = Vec::with_capacity(sampled.len() + 1);
    repacked.push(size);
    repacked.push(size);
    repacked.extend_from_slice(&sampled[1..]);
    decode_matrix("aztec", &repacked)
}

/// Decode a Data Matrix symbol sampled by [`datamatrix::scan`] as a
/// `[size, ...modules]` buffer, optionally with a per-module `erasures` mask
/// (length `size²`, `1` = low-confidence). The matrix decoder expects a
/// `[width, height, ...modules]` header, so the square size is repeated.
fn decode_scanned_matrix(sampled: &[u8], erasures: &[u8]) -> Option<String> {
    let size = *sampled.first()?;
    let mut repacked = Vec::with_capacity(sampled.len() + 1);
    repacked.push(size);
    repacked.push(size);
    repacked.extend_from_slice(&sampled[1..]);
    decode_matrix_with_erasures("datamatrix", &repacked, erasures)
}

/// Try each candidate scan-line sampling (best first) against every symbology in
/// [`BARCODE_SYMBOLOGIES`] precedence, returning the first payload that decodes
/// (after [`disambiguate_symbology`] resolves the UPC-A/EAN-13 overlap).
fn decode_any_barcode(candidates: &[Vec<u8>]) -> Option<String> {
    for modules in candidates {
        for symbology in BARCODE_SYMBOLOGIES {
            if let Some(value) = decode_barcode_modules(symbology, modules) {
                return Some(disambiguate_symbology(symbology, value));
            }
        }
    }
    None
}

/// Resolve the UPC-A / EAN-13 overlap by the **number-system digit** (§2 item 5
/// of the accuracy plan). EAN-13 is the canonical 1D-digit decoder and reads
/// both, but an EAN-13 whose number-system digit is `0` *is* a UPC-A symbol
/// (UPC-A is EAN-13 with a leading zero). In that case the 12-digit UPC-A form
/// — the EAN-13 value with its leading zero stripped — is what a scanner should
/// report. A genuine EAN-13 (non-zero number system) is returned unchanged.
fn disambiguate_symbology(symbology: &str, value: String) -> String {
    if symbology == "ean13" && value.len() == 13 && value.starts_with('0') {
        return value[1..].to_string();
    }
    value
}

/// Pack several 1D-barcode candidate module runs into one payload, separated by
/// [`BARCODE_CANDIDATE_SEPARATOR`]. The JS decode stage splits them back out and
/// tries each until one decodes.
fn join_barcode_candidates(candidates: &[Vec<u8>]) -> Vec<u8> {
    let mut out = Vec::new();
    for (index, candidate) in candidates.iter().enumerate() {
        if index > 0 {
            out.push(BARCODE_CANDIDATE_SEPARATOR);
        }
        out.extend_from_slice(candidate);
    }
    out
}

/// Prefix `payload` with its `format` tag.
fn tagged(format: u8, payload: Vec<u8>) -> Vec<u8> {
    let mut out = Vec::with_capacity(1 + payload.len());
    out.push(format);
    out.extend_from_slice(&payload);
    out
}
