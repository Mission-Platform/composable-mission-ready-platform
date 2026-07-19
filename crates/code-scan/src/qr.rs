//! QR Code localisation and sampling.
//!
//! The detector finds the three finder ("eye") patterns by their distinctive
//! `1:1:3:1:1` dark/light run ratio (checked both horizontally and vertically),
//! groups the candidate centres, and infers the symbol geometry from them. The
//! three centres define an affine basis (they sit at fixed module coordinates),
//! so the grid can be sampled even when the code is rotated or mildly skewed —
//! not just perfectly axis-aligned.
//!
//! The output is a packed `[size, ...modules]` buffer (row-major, `1` = dark),
//! exactly the input the `qr-code-decode` crate / `@mission-platform/qr-code`
//! decoder expects.

use crate::image::{Bitmap, Grey};

/// The located geometry of a QR symbol: its module count and the pixel-space
/// origin (top-left finder centre) plus per-module basis vectors. Shared by the
/// hard-bitmap [`scan`] and the grey-level [`scan_with_confidence`].
struct QrGeometry {
    size: usize,
    origin: (f64, f64),
    right: (f64, f64),
    down: (f64, f64),
    /// The averaged finder module size in pixels — the scale for sub-pixel
    /// sampling and confidence windows.
    module: f64,
}

/// A finder-pattern candidate: its centre in pixels and the estimated module
/// size (one seventh of the finder width).
#[derive(Debug, Clone, Copy)]
struct Finder {
    x: f64,
    y: f64,
    module: f64,
}

/// The five-run `1:1:3:1:1` window matches when each 1-unit run is within
/// tolerance of the estimated module and the centre run is within tolerance of
/// three modules. Returns the estimated module size on success.
fn matches_ratio(runs: [usize; 5]) -> Option<f64> {
    let total: usize = runs.iter().sum();
    if total < 7 {
        return None;
    }
    let module = total as f64 / 7.0;
    let tolerance = module / 2.0;
    let expected = [module, module, module * 3.0, module, module];
    for (run, want) in runs.iter().zip(expected) {
        if (*run as f64 - want).abs() > tolerance * if want > module { 3.0 } else { 1.0 } {
            return None;
        }
    }
    Some(module)
}

/// Confirm a horizontal candidate by checking the vertical `1:1:3:1:1` run
/// through its centre column, returning the refined vertical centre.
fn check_vertical(bitmap: &Bitmap, cx: i64, cy: i64, module: f64) -> Option<f64> {
    let max_span = (module * 7.0) as i64 + 4;
    // Walk up while dark to find the centre run's top, then measure five runs.
    let mut up = 0;
    while up < max_span && bitmap.get(cx, cy - up - 1) {
        up += 1;
    }
    let mut down = 0;
    while down < max_span && bitmap.get(cx, cy + down + 1) {
        down += 1;
    }
    let centre_run = (up + down + 1) as f64;
    if (centre_run - module * 3.0).abs() > module * 1.5 {
        return None;
    }
    // The two light + two outer dark runs above and below.
    let mut top = cy - up - 1;
    let mut light_top = 0;
    while light_top < max_span && !bitmap.get(cx, top) {
        light_top += 1;
        top -= 1;
    }
    let mut dark_top = 0;
    while dark_top < max_span && bitmap.get(cx, top) {
        dark_top += 1;
        top -= 1;
    }
    let mut bottom = cy + down + 1;
    let mut light_bottom = 0;
    while light_bottom < max_span && !bitmap.get(cx, bottom) {
        light_bottom += 1;
        bottom += 1;
    }
    let mut dark_bottom = 0;
    while dark_bottom < max_span && bitmap.get(cx, bottom) {
        dark_bottom += 1;
        bottom += 1;
    }
    if light_top == 0 || dark_top == 0 || light_bottom == 0 || dark_bottom == 0 {
        return None;
    }
    let ok = [dark_top, light_top, light_bottom, dark_bottom]
        .iter()
        .all(|&run| (run as f64 - module).abs() <= module);
    if !ok {
        return None;
    }
    let centre = cy as f64 + (down as f64 - up as f64) / 2.0;
    Some(centre)
}

/// Scan every row for the horizontal `1:1:3:1:1` finder signature, verify each
/// hit vertically, and collect the confirmed candidates.
fn find_candidates(bitmap: &Bitmap) -> Vec<Finder> {
    let mut finders = Vec::new();
    for y in 0..bitmap.height {
        let mut runs = [0usize; 5];
        let mut count = 0usize;
        let mut last = false;
        let mut run_start = 0i64;
        for x in 0..=bitmap.width {
            let dark = x < bitmap.width && bitmap.get(x as i64, y as i64);
            if x == 0 {
                last = dark;
                run_start = 0;
                // Skip a leading light run so runs[0] is always dark.
                if !dark {
                    continue;
                }
            }
            if dark == last {
                continue;
            }
            // Colour transition at column `x`: the run [run_start, x) just ended.
            let length = x as i64 - run_start;
            // Shift the five-run window and append the finished run.
            runs.copy_within(1..5, 0);
            runs[4] = length as usize;
            if count < 5 {
                count += 1;
            }
            // A finished window ends on a dark→light transition (runs[4] dark).
            if count >= 5 && last {
                if let Some(module) = matches_ratio(runs) {
                    let centre_end = x as i64;
                    let centre_start =
                        centre_end - runs[4] as i64 - runs[3] as i64 - runs[2] as i64;
                    let cx = (centre_start + centre_end - runs[4] as i64 - runs[3] as i64) / 2;
                    // Centre of the middle (3-module) run.
                    let cx = cx.max(0);
                    if let Some(cy) = check_vertical(bitmap, cx, y as i64, module) {
                        finders.push(Finder {
                            x: cx as f64,
                            y: cy,
                            module,
                        });
                    }
                }
            }
            run_start = x as i64;
            last = dark;
        }
    }
    finders
}

/// Cluster candidates whose centres lie within a module of each other, then
/// average each cluster into a single finder.
fn cluster(finders: &[Finder]) -> Vec<Finder> {
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
    let mut result: Vec<(Finder, usize)> = clusters
        .into_iter()
        .map(|(sx, sy, sm, n)| {
            (
                Finder {
                    x: sx / n as f64,
                    y: sy / n as f64,
                    module: sm / n as f64,
                },
                n,
            )
        })
        .collect();
    // Keep the best-supported clusters first.
    result.sort_by(|a, b| b.1.cmp(&a.1));
    result.into_iter().map(|(finder, _)| finder).collect()
}

/// Squared Euclidean distance between two finder centres.
fn distance_sq(a: &Finder, b: &Finder) -> f64 {
    let dx = a.x - b.x;
    let dy = a.y - b.y;
    dx * dx + dy * dy
}

/// Order three finder centres into `(top_left, top_right, bottom_left)`. The two
/// centres furthest apart are the diagonal (top-right + bottom-left); the third
/// is the top-left corner. A cross-product picks which diagonal end is which.
fn orient(a: Finder, b: Finder, c: Finder) -> (Finder, Finder, Finder) {
    let ab = distance_sq(&a, &b);
    let ac = distance_sq(&a, &c);
    let bc = distance_sq(&b, &c);
    // The top-left is opposite the longest edge (the diagonal).
    let (tl, p, q) = if ab >= ac && ab >= bc {
        (c, a, b)
    } else if ac >= ab && ac >= bc {
        (b, a, c)
    } else {
        (a, b, c)
    };
    // `right` should be 90° clockwise from `down` in image space (y grows down),
    // giving a positive cross product; otherwise swap the two diagonal ends.
    let right = (p.x - tl.x, p.y - tl.y);
    let down = (q.x - tl.x, q.y - tl.y);
    let cross = right.0 * down.1 - right.1 * down.0;
    if cross < 0.0 {
        (tl, q, p)
    } else {
        (tl, p, q)
    }
}

/// Locate a QR symbol in `bitmap`, recovering its module grid geometry, or
/// `None` when no symbol can be found. Shared by [`scan`] and
/// [`scan_with_confidence`].
#[tracing::instrument(skip_all)]
fn locate(bitmap: &Bitmap) -> Option<QrGeometry> {
    let clusters = cluster(&find_candidates(bitmap));
    if clusters.len() < 3 {
        return None;
    }
    let (tl, tr, bl) = orient(clusters[0], clusters[1], clusters[2]);

    // Distance between finder centres spans `size - 7` modules. Average the two
    // legs and the finder-derived module estimate for a stable size.
    let module = (tl.module + tr.module + bl.module) / 3.0;
    if module <= 0.0 {
        return None;
    }
    let span_x = (distance_sq(&tl, &tr)).sqrt();
    let span_y = (distance_sq(&tl, &bl)).sqrt();
    let size_est = (((span_x + span_y) / 2.0) / module).round() as i64 + 7;
    // QR symbols are 21..=177 modules (versions 1..=40), always `4v + 17`.
    if !(21..=177).contains(&size_est) || (size_est - 17) % 4 != 0 {
        return None;
    }
    let size = size_est as usize;

    // Per-module basis vectors from the finder centres. Each finder centre sits
    // at module coordinate 3.5 from its corner, so the step between centres
    // covers `size - 7` modules.
    let legs = (size - 7) as f64;
    let right = ((tr.x - tl.x) / legs, (tr.y - tl.y) / legs);
    let down = ((bl.x - tl.x) / legs, (bl.y - tl.y) / legs);
    Some(QrGeometry {
        size,
        origin: (tl.x, tl.y),
        right,
        down,
        module,
    })
}

impl QrGeometry {
    /// Pixel-space centre of module `(c, r)`, nudged by `offset` module-units
    /// along the grid basis. The top-left finder centre sits at module
    /// coordinate (3, 3); a non-zero `offset` shifts the whole sampling grid,
    /// which the retry loop uses to recover a symbol whose true centres sit
    /// slightly off the estimated grid.
    #[inline]
    fn module_center(&self, c: usize, r: usize, offset: (f64, f64)) -> (f64, f64) {
        let mc = c as f64 - 3.0 + offset.0;
        let mr = r as f64 - 3.0 + offset.1;
        (
            self.origin.0 + mc * self.right.0 + mr * self.down.0,
            self.origin.1 + mc * self.right.1 + mr * self.down.1,
        )
    }
}

/// Locate a QR symbol in `bitmap` and sample it into a packed `[size,
/// ...modules]` buffer, or `None` when no symbol can be found.
#[tracing::instrument(skip_all)]
pub fn scan(bitmap: &Bitmap) -> Option<Vec<u8>> {
    let geometry = locate(bitmap)?;
    let size = geometry.size;
    let mut packed = Vec::with_capacity(1 + size * size);
    packed.push(size as u8);
    for r in 0..size {
        for c in 0..size {
            let (px, py) = geometry.module_center(c, r, (0.0, 0.0));
            packed.push(bitmap.get(px.round() as i64, py.round() as i64) as u8);
        }
    }
    Some(packed)
}

/// Locate a QR symbol and sample it from the **grey** image with bilinear
/// interpolation, returning the packed `[size, ...modules]` buffer *and* a
/// per-module erasure mask (`1` = low-confidence). A module is flagged when its
/// interpolated grey value sits within a narrow band of the local decision
/// threshold — exactly the modules most likely to have been read wrong — so the
/// decoder can treat them as Reed-Solomon erasures. Returns `None` when no
/// symbol is located.
#[tracing::instrument(skip_all)]
pub fn scan_with_confidence(
    bitmap: &Bitmap,
    grey: &Grey,
    offset: (f64, f64),
) -> Option<(Vec<u8>, Vec<u8>)> {
    let geometry = locate(bitmap)?;
    let size = geometry.size;
    // Confidence window and band scale with the module size. The band is the
    // half-width around the threshold inside which a read is deemed unreliable.
    let radius = (geometry.module * 1.5).round() as i64;
    let band = 18.0f64;

    let mut packed = Vec::with_capacity(1 + size * size);
    packed.push(size as u8);
    let mut erasures = vec![0u8; size * size];
    for r in 0..size {
        for c in 0..size {
            let (px, py) = geometry.module_center(c, r, offset);
            let value = grey.sample(px, py);
            let threshold = grey.local_threshold(px, py, radius);
            packed.push((value <= threshold) as u8);
            if (value - threshold).abs() < band {
                erasures[r * size + c] = 1;
            }
        }
    }
    Some((packed, erasures))
}
