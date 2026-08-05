//! Data Matrix (ECC 200) localisation and sampling.
//!
//! Data Matrix symbols carry their own geometry markers: two solid edges form an
//! "L" finder (the left column and bottom row) and the opposite two edges carry
//! an alternating "timing" pattern (the top row and right column). For the
//! upright renders produced by file uploads and straight-on camera frames the
//! detector takes the *dense* bounding box of the ink (ignoring stray speckle),
//! recovers the symbol size from the mode of several timing-edge probes, then
//! samples an axis-aligned grid, reading each module by a small majority vote so
//! noise and blur do not flip it.
//!
//! The output is a packed `[size, ...modules]` buffer (row-major, `1` = dark) —
//! the input the `matrix-code-decode` crate / `@mission-platform/matrix-code`
//! decoder expects.

use crate::image::{Bitmap, Grey};

/// The located geometry of a Data Matrix symbol: the pixel-space top-left of the
/// dense ink bounds, the module count per side, and the per-module pixel size on
/// each axis. Shared by the hard-bitmap [`scan`] and the grey [`scan_with_confidence`].
struct DmGeometry {
    min_x: f64,
    min_y: f64,
    size: usize,
    module_w: f64,
    module_h: f64,
}

/// Collect the lengths of the runs of constant colour in `samples`. Each entry
/// is one maximal same-colour stretch, in order.
fn run_lengths(samples: impl Iterator<Item = bool>) -> Vec<usize> {
    let mut runs: Vec<usize> = Vec::new();
    let mut previous: Option<bool> = None;
    for dark in samples {
        if previous == Some(dark) {
            *runs.last_mut().expect("previous implies a run exists") += 1;
        } else {
            runs.push(1);
            previous = Some(dark);
        }
    }
    runs
}

/// Robustly infer the number of modules a run sequence spans along a Data Matrix
/// timing edge. The edge alternates every module, so naively the module count is
/// just the number of runs — but a camera capture peppers the edge with
/// sub-module specks (a binariser fleck, sensor noise, a compression artefact).
/// Each stray pixel splits or inserts a run, so the naive count over-reads and
/// pushes the inferred symbol size past the real one, mis-sampling the grid so
/// nothing decodes.
///
/// The insight that makes this speck-proof: the *total* length of the edge is
/// unchanged by a speck (it just re-partitions the same pixels), so the module
/// count is the total length divided by one module's width. A timing module is
/// one run wide, so the vast majority of runs are exactly one module and their
/// median is a solid estimate of that width — robust because specks are a
/// minority sitting below it, so they cannot drag the median down.
fn count_modules(runs: &[usize]) -> usize {
    if runs.is_empty() {
        return 0;
    }
    let mut sorted = runs.to_vec();
    sorted.sort_unstable();
    let unit = (sorted[sorted.len() / 2] as f64).max(1.0);
    let total: usize = runs.iter().sum();
    (total as f64 / unit).round() as usize
}

/// Count the modules along row `y` between `x0..=x1` (inclusive), inferring the
/// count speck-robustly so sensor noise does not inflate it.
fn count_runs_in_row(bitmap: &Bitmap, y: i64, x0: i64, x1: i64) -> usize {
    count_modules(&run_lengths((x0..=x1).map(|x| bitmap.get(x, y))))
}

/// Count the modules down column `x` between `y0..=y1` (inclusive) — the
/// vertical analogue of [`count_runs_in_row`], reading the right-hand timing
/// edge with the same speck-robust count.
fn count_runs_in_col(bitmap: &Bitmap, x: i64, y0: i64, y1: i64) -> usize {
    count_modules(&run_lengths((y0..=y1).map(|y| bitmap.get(x, y))))
}

/// Return the most common value in `counts` (ties broken towards the larger
/// value), or `None` for an empty slice. Used to pick a robust module count from
/// several noisy timing-edge samples instead of trusting a single line.
fn mode(counts: &[usize]) -> Option<usize> {
    let mut best = None;
    let mut best_freq = 0usize;
    for &candidate in counts {
        let freq = counts.iter().filter(|&&other| other == candidate).count();
        match best {
            Some(current) if freq < best_freq || (freq == best_freq && candidate <= current) => {}
            _ => {
                best = Some(candidate);
                best_freq = freq;
            }
        }
    }
    best
}

/// Sample the module at grid cell (`col`, `row`).
///
/// When the module is comfortably larger than a pixel, vote over a 3×3 grid
/// spanning its central half rather than trusting one centre pixel: that makes
/// the read robust to speckle, blur and sub-module misalignment — often the
/// difference between a symbol Reed-Solomon can repair and one it cannot. For
/// tiny modules (a few pixels wide, e.g. a heavily downscaled capture) the
/// spread would instead bleed into neighbouring cells, so a single centre
/// sample is more accurate and is used instead.
fn sample_module(
    bitmap: &Bitmap,
    min_x: f64,
    min_y: f64,
    col: usize,
    row: usize,
    module_w: f64,
    module_h: f64,
) -> bool {
    let cx = min_x + (col as f64 + 0.5) * module_w;
    let cy = min_y + (row as f64 + 0.5) * module_h;
    // Below ~5 px a module is too small to spread the samples without straying
    // into its neighbours, so read the centre pixel alone.
    if module_w < 5.0 || module_h < 5.0 {
        return bitmap.get(cx.round() as i64, cy.round() as i64);
    }
    // Offsets at ±1/4 of a module keep every sample well inside the cell.
    let dx = module_w * 0.25;
    let dy = module_h * 0.25;
    let mut dark = 0i32;
    let mut total = 0i32;
    for oy in [-dy, 0.0, dy] {
        for ox in [-dx, 0.0, dx] {
            total += 1;
            if bitmap.get((cx + ox).round() as i64, (cy + oy).round() as i64) {
                dark += 1;
            }
        }
    }
    dark * 2 > total
}

/// Locate a Data Matrix symbol in `bitmap` and sample it into a packed `[size,
/// ...modules]` buffer, or `None` when no plausible symbol is found.
#[tracing::instrument(skip_all)]
pub fn scan(bitmap: &Bitmap) -> Option<Vec<u8>> {
    let geometry = locate(bitmap)?;
    let size = geometry.size;
    let mut packed = Vec::with_capacity(1 + size * size);
    packed.push(size as u8);
    for r in 0..size {
        for c in 0..size {
            packed.push(sample_module(
                bitmap,
                geometry.min_x,
                geometry.min_y,
                c,
                r,
                geometry.module_w,
                geometry.module_h,
            ) as u8);
        }
    }
    Some(packed)
}

/// Locate a Data Matrix symbol and sample it from the **grey** image with
/// bilinear interpolation, returning the packed `[size, ...modules]` buffer *and*
/// a per-module erasure mask (`1` = low-confidence, length `size²`). A module is
/// flagged when its interpolated grey value sits within a narrow band of the
/// local decision threshold, so the decoder can treat it as a Reed-Solomon
/// erasure. Returns `None` when no symbol is located.
#[tracing::instrument(skip_all)]
pub fn scan_with_confidence(
    bitmap: &Bitmap,
    grey: &Grey,
    offset: (f64, f64),
) -> Option<(Vec<u8>, Vec<u8>)> {
    let geometry = locate(bitmap)?;
    let size = geometry.size;
    let radius = (geometry.module_w.max(geometry.module_h) * 1.5).round() as i64;
    let band = 18.0f64;

    let mut packed = Vec::with_capacity(1 + size * size);
    packed.push(size as u8);
    let mut erasures = vec![0u8; size * size];
    for r in 0..size {
        for c in 0..size {
            // `offset` nudges the whole grid by a fraction of a module, so the
            // retry loop can recover a symbol slightly off the estimated grid.
            let cx = geometry.min_x + (c as f64 + 0.5 + offset.0) * geometry.module_w;
            let cy = geometry.min_y + (r as f64 + 0.5 + offset.1) * geometry.module_h;
            let value = grey.sample(cx, cy);
            let threshold = grey.local_threshold(cx, cy, radius);
            packed.push((value <= threshold) as u8);
            if (value - threshold).abs() < band {
                erasures[r * size + c] = 1;
            }
        }
    }
    Some((packed, erasures))
}

/// Locate a Data Matrix symbol in `bitmap`, recovering its module grid geometry,
/// or `None` when no plausible symbol is found. Shared by [`scan`] and
/// [`scan_with_confidence`].
#[tracing::instrument(skip_all)]
fn locate(bitmap: &Bitmap) -> Option<DmGeometry> {
    // Localise from the *dense* ink bounds, which ignore sparse speckle. A
    // single stray dark pixel in the quiet zone would blow up the plain
    // bounding box this locator relies on; requiring a column/row to carry a
    // meaningful share of the symbol's ink rejects that noise without eroding
    // real modules (unlike a blur/median pass, which damages small symbols).
    let Some((min_x, min_y, max_x, max_y)) = bitmap.dense_dark_bounds() else {
        tracing::debug!("datamatrix: no dense ink region found");
        return None;
    };
    let width = (max_x - min_x + 1) as f64;
    let height = (max_y - min_y + 1) as f64;
    tracing::debug!(
        min_x,
        min_y,
        max_x,
        max_y,
        width,
        height,
        "datamatrix: dense bounds"
    );
    if width < 8.0 || height < 8.0 {
        tracing::debug!(
            width,
            height,
            "datamatrix: rejected — bounds too small for a symbol"
        );
        return None;
    }
    // Data Matrix square symbols have (near) 1:1 aspect ratio.
    let ratio = width / height;
    if !(0.75..=1.333).contains(&ratio) {
        tracing::debug!(ratio, "datamatrix: rejected — aspect ratio not ~square");
        return None;
    }

    // Recover the symbol size from the alternating timing edges (top row and
    // right column), whose run count equals the module count. A single scan
    // line is easily thrown off by one flipped pixel, so probe several lines
    // and take the mode: the noise has to agree on the *same* wrong count
    // across many lines to win, which speckle and blur almost never do. Each
    // probe stays inside the outermost module — `1/32` of the extent is below
    // one module even for the largest supported (26-module) symbol — so every
    // line reads the timing pattern rather than the data region behind it.
    let mut counts = Vec::new();
    let span_y = ((height / 32.0).round() as i64).max(1);
    for offset in 0..=span_y {
        counts.push(count_runs_in_row(
            bitmap,
            min_y as i64 + offset,
            min_x as i64,
            max_x as i64,
        ));
    }
    let span_x = ((width / 32.0).round() as i64).max(1);
    for offset in 0..=span_x {
        counts.push(count_runs_in_col(
            bitmap,
            max_x as i64 - offset,
            min_y as i64,
            max_y as i64,
        ));
    }
    let Some(mut size) = mode(&counts) else {
        tracing::debug!("datamatrix: rejected — no timing-edge run count found");
        return None;
    };
    tracing::debug!(
        ?counts,
        size,
        "datamatrix: timing-edge module count (mode of probes)"
    );

    // Data Matrix ECC 200 square symbols are even, 10..=144 modules per side.
    if size % 2 == 1 {
        size += 1;
    }
    if !(10..=144).contains(&size) {
        tracing::debug!(
            size,
            "datamatrix: rejected — inferred size outside 10..=144"
        );
        return None;
    }

    let module_w = width / size as f64;
    let module_h = height / size as f64;
    // Reject when the inferred module size disagrees wildly between axes.
    if (module_w - module_h).abs() > module_w.max(module_h) * 0.5 {
        tracing::debug!(
            module_w,
            module_h,
            "datamatrix: rejected — module size mismatch between axes"
        );
        return None;
    }
    tracing::debug!(size, module_w, module_h, "datamatrix: located module grid");

    Some(DmGeometry {
        min_x: min_x as f64,
        min_y: min_y as f64,
        size,
        module_w,
        module_h,
    })
}

/// A pixel-space corner point.
type Point = (f64, f64);

/// Euclidean distance between two points.
fn distance(a: Point, b: Point) -> f64 {
    let dx = a.0 - b.0;
    let dy = a.1 - b.1;
    (dx * dx + dy * dy).sqrt()
}

/// Find the four extreme corners of the dark ink inside `bounds` as
/// `(top_left, top_right, bottom_right, bottom_left)` of the (possibly rotated)
/// symbol. The extremes of `x + y` and `x − y` pick the corners of a rotated
/// quadrilateral: min/max `x+y` are the top-left/bottom-right corners, max/min
/// `x−y` the top-right/bottom-left. For an upright symbol these collapse to the
/// usual axis-aligned corners.
fn extreme_corners(bitmap: &Bitmap, bounds: (usize, usize, usize, usize)) -> Option<[Point; 4]> {
    let (min_x, min_y, max_x, max_y) = bounds;
    let mut tl = None::<(f64, Point)>;
    let mut br = None::<(f64, Point)>;
    let mut tr = None::<(f64, Point)>;
    let mut bl = None::<(f64, Point)>;
    for y in min_y..=max_y {
        for x in min_x..=max_x {
            if !bitmap.get(x as i64, y as i64) {
                continue;
            }
            let p = (x as f64, y as f64);
            let sum = x as f64 + y as f64;
            let diff = x as f64 - y as f64;
            if tl.is_none_or(|(best, _)| sum < best) {
                tl = Some((sum, p));
            }
            if br.is_none_or(|(best, _)| sum > best) {
                br = Some((sum, p));
            }
            if tr.is_none_or(|(best, _)| diff > best) {
                tr = Some((diff, p));
            }
            if bl.is_none_or(|(best, _)| diff < best) {
                bl = Some((diff, p));
            }
        }
    }
    Some([tl?.1, tr?.1, br?.1, bl?.1])
}

/// Sample a line parallel to the edge `a→b`, offset `inset` pixels along the
/// edge's inward normal (toward `centroid`) so it reads just inside the edge, and
/// count the modules along it (speck-robustly). A solid finder edge yields ~1; an
/// alternating timing edge yields the symbol's module count.
///
/// The offset is applied along the **edge normal** (a constant perpendicular
/// distance), not toward the centroid: a toward-centroid nudge curves the sample
/// line off a straight edge near the corners, corrupting the end runs and
/// under-counting the size. The ends are trimmed a little to skip the corner
/// modules where the timing and finder tracks meet.
fn edge_module_count(bitmap: &Bitmap, a: Point, b: Point, centroid: Point, inset: f64) -> usize {
    let ex = b.0 - a.0;
    let ey = b.1 - a.1;
    let edge_len = (ex * ex + ey * ey).sqrt().max(1e-6);
    // Inward normal: the perpendicular of the edge direction that points toward
    // the symbol centroid.
    let (mut nx, mut ny) = (-ey / edge_len, ex / edge_len);
    let mid = ((a.0 + b.0) / 2.0, (a.1 + b.1) / 2.0);
    if nx * (centroid.0 - mid.0) + ny * (centroid.1 - mid.1) < 0.0 {
        nx = -nx;
        ny = -ny;
    }

    let steps = 256usize;
    let mut samples = Vec::with_capacity(steps + 1);
    for i in 0..=steps {
        // Trim ~2% off each end so the corner cells (where the L finder meets the
        // timing track) do not distort the run count.
        let t = 0.02 + (i as f64 / steps as f64) * 0.96;
        let x = a.0 + ex * t + nx * inset;
        let y = a.1 + ey * t + ny * inset;
        samples.push(bitmap.get(x.round() as i64, y.round() as i64));
    }
    // The module count is the number of colour runs after folding away
    // sub-module specks: a solid finder edge is one run, an alternating timing
    // edge is one run per module. This run-count is stable under the blur a
    // rotated capture adds, where the total/median estimate drifts.
    let mut runs = run_lengths(samples.into_iter());
    let mut sorted = runs.clone();
    sorted.sort_unstable();
    let median = sorted[sorted.len() / 2] as f64;
    let threshold = (median * 0.4).max(1.0);
    loop {
        let smallest = runs
            .iter()
            .enumerate()
            .filter(|&(_, &len)| (len as f64) < threshold)
            .min_by_key(|&(_, &len)| len)
            .map(|(index, _)| index);
        let Some(index) = smallest else { break };
        if index > 0 && index + 1 < runs.len() {
            runs[index - 1] += runs[index] + runs[index + 1];
            runs.remove(index + 1);
            runs.remove(index);
        } else {
            runs.remove(index);
        }
    }
    runs.len()
}

/// Sample module `(col, row)` of an affine (rotated/sheared) grid whose origin
/// is `origin`, with per-module axis vectors `u` (columns) and `v` (rows). A 3×3
/// vote over the cell's central half makes the read robust; tiny modules fall
/// back to the centre.
#[allow(clippy::too_many_arguments)]
fn sample_affine(
    bitmap: &Bitmap,
    origin: Point,
    u: Point,
    v: Point,
    col: usize,
    row: usize,
    module_px: f64,
) -> bool {
    let base_x = origin.0 + (col as f64 + 0.5) * u.0 + (row as f64 + 0.5) * v.0;
    let base_y = origin.1 + (col as f64 + 0.5) * u.1 + (row as f64 + 0.5) * v.1;
    if module_px < 5.0 {
        return bitmap.get(base_x.round() as i64, base_y.round() as i64);
    }
    let mut dark = 0i32;
    let mut total = 0i32;
    for su in [-0.25, 0.0, 0.25] {
        for sv in [-0.25, 0.0, 0.25] {
            let px = base_x + su * u.0 + sv * v.0;
            let py = base_y + su * u.1 + sv * v.1;
            total += 1;
            if bitmap.get(px.round() as i64, py.round() as i64) {
                dark += 1;
            }
        }
    }
    dark * 2 > total
}

/// Rotate a packed `[size, ...modules]` grid 90° clockwise.
fn rotate_packed_cw(packed: &[u8]) -> Vec<u8> {
    let size = packed[0] as usize;
    let modules = &packed[1..];
    let mut out = Vec::with_capacity(packed.len());
    out.push(size as u8);
    let mut rotated = vec![0u8; size * size];
    for r in 0..size {
        for c in 0..size {
            // (r, c) in the rotated grid comes from (size-1-c, r) in the source.
            rotated[r * size + c] = modules[(size - 1 - c) * size + r];
        }
    }
    out.extend_from_slice(&rotated);
    out
}

/// Locate a Data Matrix symbol at **any rotation** (and mild shear) and sample
/// it into packed `[size, ...modules]` buffers — one per 90° orientation, since
/// the corner search fixes the symbol's square but not which corner holds the
/// solid "L" finder. The decoder's finder + Reed-Solomon checks pick the correct
/// orientation, so all four are returned as candidates. Empty when no plausible
/// square symbol is found.
///
/// Unlike the upright [`locate`] (which trusts the axis-aligned dense bounds),
/// this recovers the four rotated corners of the ink, derives independent column
/// and row axis vectors from them (so a sheared capture is handled too), reads
/// the module count off the timing edges and samples along those axes.
#[tracing::instrument(skip_all)]
pub fn scan_oriented_candidates(bitmap: &Bitmap) -> Vec<Vec<u8>> {
    // Speckle would corrupt the extreme-corner search, so work on a cleaned copy.
    let cleaned = bitmap.denoised();
    let Some(bounds) = cleaned.dense_dark_bounds() else {
        return Vec::new();
    };
    let Some(corners) = extreme_corners(&cleaned, bounds) else {
        return Vec::new();
    };

    // The four sides must be roughly equal (a square symbol) and non-degenerate.
    let longest = (0..4)
        .map(|i| distance(corners[i], corners[(i + 1) % 4]))
        .fold(0.0f64, f64::max);
    let shortest = (0..4)
        .map(|i| distance(corners[i], corners[(i + 1) % 4]))
        .fold(f64::INFINITY, f64::min);
    if longest < 8.0 || shortest < longest * 0.6 {
        return Vec::new();
    }

    let centroid = (
        corners.iter().map(|c| c.0).sum::<f64>() / 4.0,
        corners.iter().map(|c| c.1).sum::<f64>() / 4.0,
    );
    let inset = longest * 0.04;

    // Edge `i` runs from corner `i` to corner `i+1`. The solid "L" finder is two
    // adjacent edges (module count ~1); the timing edges opposite them alternate
    // and read the true module count.
    let edge_counts: [usize; 4] = std::array::from_fn(|i| {
        edge_module_count(&cleaned, corners[i], corners[(i + 1) % 4], centroid, inset)
    });

    // The "L" corner is the vertex whose two incident edges are both solid — it
    // minimises the larger of the two incident edge counts. The extreme-point
    // search reliably nails the L corner and its two neighbours (all on solid,
    // fully-dark edges); only the *opposite* corner can sit on a light timing
    // module and be pulled a module inward.
    let l_corner = (0..4)
        .min_by_key(|&v| edge_counts[v].max(edge_counts[(v + 3) % 4]))
        .unwrap_or(0);

    // Reconstruct the opposite corner from the other three by the parallelogram
    // rule and measure the size off the (now full-length) timing edges.
    let reconstructed = (
        corners[(l_corner + 1) % 4].0 + corners[(l_corner + 3) % 4].0 - corners[l_corner].0,
        corners[(l_corner + 1) % 4].1 + corners[(l_corner + 3) % 4].1 - corners[l_corner].1,
    );
    let mut size = edge_module_count(
        &cleaned,
        corners[(l_corner + 1) % 4],
        reconstructed,
        centroid,
        inset,
    )
    .max(edge_module_count(
        &cleaned,
        reconstructed,
        corners[(l_corner + 3) % 4],
        centroid,
        inset,
    ));
    if size % 2 == 1 {
        size += 1;
    }
    if !(10..=144).contains(&size) {
        return Vec::new();
    }

    // Build the sampling frame from the **L corner and its two solid-edge
    // neighbours** — all three are reliably on fully-dark edges, so the axes are
    // accurate. Using the (possibly inset) opposite corner as an axis end would
    // drift the grid across the whole symbol; the L frame avoids it entirely.
    let origin = corners[l_corner];
    let neighbour_a = corners[(l_corner + 1) % 4];
    let neighbour_b = corners[(l_corner + 3) % 4];
    let axis_a = (
        (neighbour_a.0 - origin.0) / size as f64,
        (neighbour_a.1 - origin.1) / size as f64,
    );
    let axis_b = (
        (neighbour_b.0 - origin.0) / size as f64,
        (neighbour_b.1 - origin.1) / size as f64,
    );
    let module_px = (axis_a.0 * axis_a.0 + axis_a.1 * axis_a.1).sqrt();

    let mut base = Vec::with_capacity(1 + size * size);
    base.push(size as u8);
    for row in 0..size {
        for col in 0..size {
            base.push(sample_affine(&cleaned, origin, axis_a, axis_b, col, row, module_px) as u8);
        }
    }

    // Return all four 90° orientations; the decoder selects the one whose L
    // finder and Reed-Solomon check out.
    let r1 = rotate_packed_cw(&base);
    let r2 = rotate_packed_cw(&r1);
    let r3 = rotate_packed_cw(&r2);
    vec![base, r1, r2, r3]
}

#[cfg(test)]
mod tests {
    use super::count_modules;

    #[test]
    fn counts_a_clean_alternating_edge() {
        // Twelve one-unit runs (a 12-module timing edge, each module 3 px wide).
        let runs = vec![3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3];
        assert_eq!(count_modules(&runs), 12);
    }

    #[test]
    fn a_speck_splitting_a_module_does_not_inflate_the_count() {
        // A stray light pixel splits the third dark module into `1, 1, 1`. The
        // naive run count would read 14 runs (an inflated size); folding the
        // sub-half-unit specks back into their neighbours restores 12.
        let runs = vec![3, 3, 1, 1, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3];
        assert_eq!(count_modules(&runs), 12);
    }

    #[test]
    fn a_leading_speck_is_dropped_not_counted() {
        // A lone speck at the very start has no left neighbour to merge with, so
        // it is simply dropped rather than counted as a module.
        let runs = vec![1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3];
        assert_eq!(count_modules(&runs), 12);
    }
}
