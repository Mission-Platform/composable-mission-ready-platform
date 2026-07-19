//! Compact Aztec Code localisation and sampling.
//!
//! A compact Aztec symbol carries a central **bullseye**: concentric dark square
//! rings at Chebyshev distance 0, 2 and 4 (light rings between them), wrapped by
//! the distance-5 mode-message ring. A scan line through the exact centre
//! therefore crosses nine equal-width runs — dark/light/dark/…/dark, a
//! `1:1:1:1:1:1:1:1:1` ratio — which is as distinctive a finder as the QR
//! `1:1:3:1:1` eye. This locator finds that bullseye, recovers the module size
//! and the compact symbol dimension (15/19/23/27 → 1–4 layers) from it, and
//! samples an axis-aligned grid.
//!
//! The output is a packed `[size, ...modules]` buffer (row-major, `1` = dark);
//! the scanner re-headers it as the `[size, size, ...]` the `aztec` decoder in
//! `matrix-code-decode` expects.

use crate::image::Bitmap;

/// The located geometry of a compact Aztec symbol: the pixel-space centre, the
/// module count per side, the per-module pixel size and the bitmap it was
/// located in (borrowed for sampling).
struct AztecGeometry<'a> {
    center_x: f64,
    center_y: f64,
    size: usize,
    module: f64,
    bitmap: &'a Bitmap,
}

/// A bullseye-finder candidate: its centre in pixels and the estimated module
/// size (one ninth of the nine-run bullseye width).
#[derive(Debug, Clone, Copy)]
struct Bullseye {
    x: f64,
    y: f64,
    module: f64,
}

/// Match the nine-run bullseye signature `D L D L D L D L D` (all one module
/// wide), returning the estimated module size.
///
/// Only the **inner seven** runs (`runs[1..8]`) are trusted for the estimate and
/// the equal-width test: they sit wholly inside the bullseye, bounded by its own
/// rings. The two **outer** dark runs (`runs[0]`, `runs[8]`) touch the
/// distance-5 mode-message ring, whose modules may be dark and merge with them,
/// so they are only required to be *present* (at least a fraction of a module) —
/// never that they stay one module wide.
fn matches_bullseye(runs: [usize; 9]) -> Option<f64> {
    let inner: usize = runs[1..8].iter().sum();
    if inner < 7 {
        return None;
    }
    let module = inner as f64 / 7.0;
    let tolerance = (module * 0.6).max(1.0);
    for &run in &runs[1..8] {
        if (run as f64 - module).abs() > tolerance {
            return None;
        }
    }
    // The outer dark rings must exist but may be inflated by a touching
    // mode-message module.
    let outer_min = (module * 0.4).max(1.0);
    if (runs[0] as f64) < outer_min || (runs[8] as f64) < outer_min {
        return None;
    }
    Some(module)
}

/// The compact Aztec dimensions, one per layer count (1..=4). A located bullseye
/// fixes the centre and module size but not the layer count, so the scanner
/// samples each size and lets the decoder's own mode-message + Reed-Solomon
/// checks reject the wrong ones.
const COMPACT_SIZES: [usize; 4] = [15, 19, 23, 27];

/// Run-length encode a line of `len` samples into `(dark, start, length)` runs.
/// Adjacent runs always differ in colour, so a window that starts on a dark run
/// alternates dark/light/… by construction.
fn line_runs(len: usize, sample: impl Fn(usize) -> bool) -> Vec<(bool, usize, usize)> {
    let mut runs: Vec<(bool, usize, usize)> = Vec::new();
    if len == 0 {
        return runs;
    }
    let mut current = sample(0);
    let mut start = 0usize;
    for i in 1..len {
        let dark = sample(i);
        if dark != current {
            runs.push((current, start, i - start));
            current = dark;
            start = i;
        }
    }
    runs.push((current, start, len - start));
    runs
}

/// The lengths of nine consecutive runs as a fixed array.
fn window_lengths(window: &[(bool, usize, usize)]) -> [usize; 9] {
    [
        window[0].2,
        window[1].2,
        window[2].2,
        window[3].2,
        window[4].2,
        window[5].2,
        window[6].2,
        window[7].2,
        window[8].2,
    ]
}

/// Confirm a horizontal bullseye candidate at column `cx` by checking the
/// vertical nine-run signature down that column, returning the refined vertical
/// centre (the centre of the middle dark run straddling `cy`).
fn check_vertical(bitmap: &Bitmap, cx: i64, cy: i64) -> Option<f64> {
    let runs = line_runs(bitmap.height, |y| bitmap.get(cx, y as i64));
    for window in runs.windows(9) {
        if !window[0].0 {
            continue; // must start on a dark run
        }
        if matches_bullseye(window_lengths(window)).is_none() {
            continue;
        }
        let (_, start, length) = window[4];
        // The centre dark ring must straddle the row the horizontal hit came
        // from, so both scans agree on the same bullseye.
        if (start as i64) <= cy && cy < (start + length) as i64 {
            return Some(start as f64 + length as f64 / 2.0);
        }
    }
    None
}

/// Scan every row for the horizontal nine-run bullseye signature, verify each
/// hit vertically, and collect the confirmed candidates.
fn find_candidates(bitmap: &Bitmap) -> Vec<Bullseye> {
    let mut out = Vec::new();
    for y in 0..bitmap.height {
        let runs = line_runs(bitmap.width, |x| bitmap.get(x as i64, y as i64));
        for window in runs.windows(9) {
            if !window[0].0 {
                continue; // must start on a dark run (dark,light,…,dark)
            }
            let Some(module) = matches_bullseye(window_lengths(window)) else {
                continue;
            };
            let (_, start, length) = window[4];
            let cx = start as f64 + length as f64 / 2.0;
            if let Some(cy) = check_vertical(bitmap, cx.round() as i64, y as i64) {
                out.push(Bullseye {
                    x: cx,
                    y: cy,
                    module,
                });
            }
        }
    }
    out
}

/// Cluster candidate bullseyes whose centres lie within a couple of modules of
/// each other, averaging each cluster into one, and return them ordered by the
/// support they attracted (strongest first).
fn cluster(finders: &[Bullseye]) -> Vec<Bullseye> {
    let mut clusters: Vec<(f64, f64, f64, usize)> = Vec::new();
    for finder in finders {
        let mut merged = false;
        for cluster in &mut clusters {
            let tolerance = finder.module * 2.0;
            if (cluster.0 / cluster.3 as f64 - finder.x).abs() <= tolerance
                && (cluster.1 / cluster.3 as f64 - finder.y).abs() <= tolerance
            {
                cluster.0 += finder.x;
                cluster.1 += finder.y;
                cluster.2 += finder.module;
                cluster.3 += 1;
                merged = true;
                break;
            }
        }
        if !merged {
            clusters.push((finder.x, finder.y, finder.module, 1));
        }
    }
    let mut result: Vec<(Bullseye, usize)> = clusters
        .into_iter()
        .map(|(sx, sy, sm, n)| {
            (
                Bullseye {
                    x: sx / n as f64,
                    y: sy / n as f64,
                    module: sm / n as f64,
                },
                n,
            )
        })
        .collect();
    result.sort_by(|a, b| b.1.cmp(&a.1));
    result.into_iter().map(|(finder, _)| finder).collect()
}

/// Sample the module at grid cell `(col, row)` for a symbol of `size` modules
/// centred on the bullseye. A 3×3 majority vote over the cell's central half
/// makes the read robust to speckle and blur; tiny modules fall back to the
/// centre pixel (spreading the votes would stray into neighbours).
fn sample_module(geometry: &AztecGeometry, col: usize, row: usize) -> bool {
    let center = (geometry.size / 2) as f64;
    let cx = geometry.center_x + (col as f64 - center) * geometry.module;
    let cy = geometry.center_y + (row as f64 - center) * geometry.module;
    if geometry.module < 5.0 {
        return geometry_get(geometry, cx, cy);
    }
    let delta = geometry.module * 0.25;
    let mut dark = 0i32;
    let mut total = 0i32;
    for oy in [-delta, 0.0, delta] {
        for ox in [-delta, 0.0, delta] {
            total += 1;
            if geometry_get(geometry, cx + ox, cy + oy) {
                dark += 1;
            }
        }
    }
    dark * 2 > total
}

/// Read one pixel of the bitmap the geometry was located in.
#[inline]
fn geometry_get(geometry: &AztecGeometry, x: f64, y: f64) -> bool {
    geometry.bitmap.get(x.round() as i64, y.round() as i64)
}

/// Locate the strongest bullseye in `bitmap` and its module size, or `None` when
/// no bullseye is found.
#[tracing::instrument(skip_all)]
fn locate(bitmap: &Bitmap) -> Option<Bullseye> {
    let clusters = cluster(&find_candidates(bitmap));
    let best = clusters.into_iter().next()?;
    if best.module <= 0.0 {
        return None;
    }
    tracing::debug!(
        x = best.x,
        y = best.y,
        module = best.module,
        "aztec: located bullseye"
    );
    Some(best)
}

/// Order the compact sizes by how close each is to the extent estimate from the
/// dense ink bounds, so the most likely layer count is tried first.
fn ordered_sizes(bitmap: &Bitmap, module: f64) -> Vec<usize> {
    let mut sizes = COMPACT_SIZES.to_vec();
    if let Some((min_x, min_y, max_x, max_y)) = bitmap.dense_dark_bounds() {
        let extent = ((max_x - min_x + 1) + (max_y - min_y + 1)) as f64 / 2.0;
        let estimate = extent / module;
        sizes.sort_by(|&a, &b| {
            (a as f64 - estimate)
                .abs()
                .total_cmp(&(b as f64 - estimate).abs())
        });
    }
    sizes
}

/// Locate a compact Aztec symbol in `bitmap` and sample it into one packed
/// `[size, ...modules]` buffer per plausible compact size (best size estimate
/// first). The scanner tries each against the Aztec decoder, whose mode-message
/// and Reed-Solomon checks reject a wrong size. Empty when no bullseye is found.
#[tracing::instrument(skip_all)]
pub fn scan_candidates(bitmap: &Bitmap) -> Vec<Vec<u8>> {
    // The run-length bullseye finder is fragile to isolated speckle (a single
    // flipped pixel splits a ring into three runs), so it works on a
    // majority-filtered copy; sampling reads from the same cleaned bitmap.
    let cleaned = bitmap.denoised();
    let Some(bullseye) = locate(&cleaned) else {
        return Vec::new();
    };
    let sizes = ordered_sizes(&cleaned, bullseye.module);
    let mut candidates = Vec::with_capacity(sizes.len());
    for size in sizes {
        let geometry = AztecGeometry {
            center_x: bullseye.x,
            center_y: bullseye.y,
            size,
            module: bullseye.module,
            bitmap: &cleaned,
        };
        let mut packed = Vec::with_capacity(1 + size * size);
        packed.push(size as u8);
        for row in 0..size {
            for col in 0..size {
                packed.push(sample_module(&geometry, col, row) as u8);
            }
        }
        candidates.push(packed);
    }
    candidates
}
