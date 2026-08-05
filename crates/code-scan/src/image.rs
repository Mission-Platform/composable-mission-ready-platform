//! Grayscale → binary conversion shared by every detector.
//!
//! The scanner works on a single-channel luma buffer (`0` = black, `255` =
//! white), row-major, `width * height` bytes. [`Bitmap`] holds the binarised
//! result where `true` = a dark ("ink") pixel. Binarisation uses Otsu's method
//! to pick a global threshold, which is robust for the clean, high-contrast
//! renders produced by file uploads and straight-on camera frames.

/// A binarised image: `true` = dark (ink) pixel, `false` = light (background).
#[derive(Debug, Clone)]
pub struct Bitmap {
    pub width: usize,
    pub height: usize,
    dark: Vec<bool>,
}

impl Bitmap {
    /// Sample the pixel at `(x, y)`; out-of-bounds coordinates read as light
    /// (`false`), so callers can sample slightly outside the image safely.
    #[inline]
    pub fn get(&self, x: i64, y: i64) -> bool {
        if x < 0 || y < 0 || x as usize >= self.width || y as usize >= self.height {
            return false;
        }
        self.dark[y as usize * self.width + x as usize]
    }

    /// The bounding box of the *ink-dense* region as `(min_x, min_y, max_x,
    /// max_y)` (inclusive), or `None` when the image carries no meaningful ink.
    ///
    /// A naive box over *every* dark pixel is thrown to the whole frame by a
    /// single stray dark pixel; this instead keeps only the rows and columns
    /// whose dark-pixel count reaches a fraction of the densest row/column.
    /// Sparse salt noise in the quiet zone (a handful of pixels per line) falls
    /// below that bar, so the box collapses back onto the real symbol — the
    /// localisation the Data Matrix and 1D-barcode locators need to survive
    /// noisy captures. A genuine symbol's outer edges (the solid finder, the
    /// alternating timing pattern, or the bars of a barcode) are all far denser
    /// than the threshold, so they are retained.
    pub fn dense_dark_bounds(&self) -> Option<(usize, usize, usize, usize)> {
        if self.width == 0 || self.height == 0 {
            return None;
        }
        let mut row_counts = vec![0usize; self.height];
        let mut col_counts = vec![0usize; self.width];
        for y in 0..self.height {
            for x in 0..self.width {
                if self.dark[y * self.width + x] {
                    row_counts[y] += 1;
                    col_counts[x] += 1;
                }
            }
        }

        // A line joins the symbol only if it carries at least a tenth of the
        // densest line's ink (and at least two pixels, so a lone speck never
        // qualifies). One tenth sits comfortably below a Data Matrix timing
        // edge (~half the modules are dark) yet well above scattered noise.
        let row_threshold = (row_counts.iter().copied().max()? / 10).max(2);
        let col_threshold = (col_counts.iter().copied().max()? / 10).max(2);

        let min_y = (0..self.height).find(|&y| row_counts[y] >= row_threshold)?;
        let max_y = (0..self.height)
            .rev()
            .find(|&y| row_counts[y] >= row_threshold)?;
        let min_x = (0..self.width).find(|&x| col_counts[x] >= col_threshold)?;
        let max_x = (0..self.width)
            .rev()
            .find(|&x| col_counts[x] >= col_threshold)?;
        Some((min_x, min_y, max_x, max_y))
    }

    /// Estimate the in-plane rotation of the ink region as the angle (in
    /// `[-π/4, π/4]`) that straightens it, or `None` when there is no dense ink.
    ///
    /// Sweeps a quarter turn and keeps the angle whose axis-aligned bounding box
    /// over the dark pixels is smallest: a rectangle (a rotated Data Matrix
    /// square, or the bar band of a linear barcode) has its tightest enclosing
    /// box exactly when the box aligns with it, so the minimising angle is the
    /// symbol's rotation modulo 90°. Robust at the 45° family, where extreme-point
    /// corner detection degenerates. The dark pixels are sub-sampled so the sweep
    /// stays cheap on a large frame.
    pub fn orientation(&self) -> Option<f64> {
        use std::f64::consts::{FRAC_PI_2, FRAC_PI_4};

        let cleaned = self.denoised();
        let (min_x, min_y, max_x, max_y) = cleaned.dense_dark_bounds()?;

        let span = (max_x - min_x + 1).max(max_y - min_y + 1);
        let stride = (span / 128).max(1) as i64;
        let mut points: Vec<(f64, f64)> = Vec::new();
        let mut y = min_y as i64;
        while y <= max_y as i64 {
            let mut x = min_x as i64;
            while x <= max_x as i64 {
                if cleaned.get(x, y) {
                    points.push((x as f64, y as f64));
                }
                x += stride;
            }
            y += stride;
        }
        if points.len() < 16 {
            return None;
        }

        let steps = 90usize;
        let mut best_angle = 0.0f64;
        let mut best_area = f64::INFINITY;
        for i in 0..steps {
            let theta = FRAC_PI_2 * (i as f64 / steps as f64);
            let (sin, cos) = theta.sin_cos();
            let mut min_u = f64::INFINITY;
            let mut max_u = f64::NEG_INFINITY;
            let mut min_v = f64::INFINITY;
            let mut max_v = f64::NEG_INFINITY;
            for &(px, py) in &points {
                let u = px * cos + py * sin;
                let v = -px * sin + py * cos;
                min_u = min_u.min(u);
                max_u = max_u.max(u);
                min_v = min_v.min(v);
                max_v = max_v.max(v);
            }
            let area = (max_u - min_u) * (max_v - min_v);
            if area < best_area {
                best_area = area;
                best_angle = theta;
            }
        }

        let mut angle = best_angle;
        while angle > FRAC_PI_4 {
            angle -= FRAC_PI_2;
        }
        while angle < -FRAC_PI_4 {
            angle += FRAC_PI_2;
        }
        Some(angle)
    }

    /// A copy with isolated salt-and-pepper speckle removed by a 3×3 majority
    /// (median) filter: each pixel takes the majority colour of its eight
    /// neighbours plus itself. A lone flipped pixel (five-plus of nine
    /// neighbours disagree) is corrected, while genuine module edges — where the
    /// neighbourhood is already split along the edge — are preserved.
    ///
    /// The run-length finders (notably the Aztec bullseye) fragment when a
    /// single flipped pixel splits a ring into three runs; cleaning the bitmap
    /// first keeps those runs intact without touching module-scale features.
    pub fn denoised(&self) -> Bitmap {
        let mut out = vec![false; self.dark.len()];
        for y in 0..self.height {
            for x in 0..self.width {
                let mut dark_neighbours = 0i32;
                let mut counted = 0i32;
                for dy in -1..=1i64 {
                    for dx in -1..=1i64 {
                        let nx = x as i64 + dx;
                        let ny = y as i64 + dy;
                        if nx < 0
                            || ny < 0
                            || nx as usize >= self.width
                            || ny as usize >= self.height
                        {
                            continue;
                        }
                        counted += 1;
                        if self.dark[ny as usize * self.width + nx as usize] {
                            dark_neighbours += 1;
                        }
                    }
                }
                out[y * self.width + x] = dark_neighbours * 2 > counted;
            }
        }
        Bitmap {
            width: self.width,
            height: self.height,
            dark: out,
        }
    }
}

/// Compute Otsu's global threshold over a luma histogram, returning the value
/// `t` such that pixels with `luma <= t` are considered dark.
#[tracing::instrument(skip_all)]
fn otsu_threshold(luma: &[u8]) -> u8 {
    let mut histogram = [0u64; 256];
    for &value in luma {
        histogram[value as usize] += 1;
    }
    let total = luma.len() as f64;
    if total == 0.0 {
        return 128;
    }
    let sum: f64 = (0..256).map(|i| i as f64 * histogram[i] as f64).sum();
    let mut sum_background = 0.0;
    let mut weight_background = 0.0;
    let mut best_threshold = 0u8;
    let mut best_variance = 0.0;
    for t in 0..256 {
        weight_background += histogram[t] as f64;
        if weight_background == 0.0 {
            continue;
        }
        let weight_foreground = total - weight_background;
        if weight_foreground == 0.0 {
            break;
        }
        sum_background += t as f64 * histogram[t] as f64;
        let mean_background = sum_background / weight_background;
        let mean_foreground = (sum - sum_background) / weight_foreground;
        let between = weight_background
            * weight_foreground
            * (mean_background - mean_foreground)
            * (mean_background - mean_foreground);
        if between > best_variance {
            best_variance = between;
            best_threshold = t as u8;
        }
    }
    best_threshold
}

/// Binarise a luma buffer into a [`Bitmap`]. Returns `None` when the buffer size
/// does not match `width * height` or the image is empty.
#[tracing::instrument(skip_all)]
pub fn binarize(width: usize, height: usize, luma: &[u8]) -> Option<Bitmap> {
    if width == 0 || height == 0 || luma.len() != width * height {
        return None;
    }
    let threshold = otsu_threshold(luma);
    let dark: Vec<bool> = luma.iter().map(|&value| value <= threshold).collect();
    let dark_pixels = dark.iter().filter(|&&d| d).count();
    tracing::debug!(
        width,
        height,
        threshold,
        dark_pixels,
        dark_fraction = dark_pixels as f64 / dark.len() as f64,
        "binarize: Otsu threshold chosen"
    );
    Some(Bitmap {
        width,
        height,
        dark,
    })
}

/// Rotate a luma buffer `angle` radians **clockwise** about its centre onto a
/// larger canvas sized so nothing is clipped, sampling the source bilinearly and
/// filling everything outside it with white (`255`).
///
/// Used to straighten a rotated symbol before handing it to the axis-aligned
/// locators: recovering the rotation and re-sampling upright reuses the tuned,
/// accurate upright pipeline instead of chasing sub-pixel corner precision on the
/// rotated grid. Returns `(new_width, new_height, luma)`.
#[tracing::instrument(skip_all)]
pub fn rotate_luma(
    width: usize,
    height: usize,
    luma: &[u8],
    angle: f64,
) -> (usize, usize, Vec<u8>) {
    if width == 0 || height == 0 || luma.len() != width * height {
        return (width, height, luma.to_vec());
    }
    let (sin, cos) = angle.sin_cos();
    let new_width = ((width as f64 * cos.abs()) + (height as f64 * sin.abs())).ceil() as usize + 2;
    let new_height = ((width as f64 * sin.abs()) + (height as f64 * cos.abs())).ceil() as usize + 2;
    let mut out = vec![255u8; new_width * new_height];
    let (cx, cy) = (width as f64 / 2.0, height as f64 / 2.0);
    let (ncx, ncy) = (new_width as f64 / 2.0, new_height as f64 / 2.0);
    for oy in 0..new_height {
        for ox in 0..new_width {
            let dx = ox as f64 - ncx;
            let dy = oy as f64 - ncy;
            // Inverse (counter-clockwise) rotation maps the output pixel back
            // into the source.
            let sx = cos * dx + sin * dy + cx;
            let sy = -sin * dx + cos * dy + cy;
            if sx < 0.0 || sy < 0.0 || sx >= (width - 1) as f64 || sy >= (height - 1) as f64 {
                continue;
            }
            let x0 = sx.floor() as usize;
            let y0 = sy.floor() as usize;
            let fx = sx - x0 as f64;
            let fy = sy - y0 as f64;
            let p00 = luma[y0 * width + x0] as f64;
            let p10 = luma[y0 * width + x0 + 1] as f64;
            let p01 = luma[(y0 + 1) * width + x0] as f64;
            let p11 = luma[(y0 + 1) * width + x0 + 1] as f64;
            let top = p00 + (p10 - p00) * fx;
            let bottom = p01 + (p11 - p01) * fx;
            out[oy * new_width + ox] = (top + (bottom - top) * fy).round() as u8;
        }
    }
    (new_width, new_height, out)
}

/// A prefix-sum (integral image) over the luma buffer, so the mean of any
/// rectangular window is an O(1) lookup. Used by [`binarize_adaptive`] and by
/// [`Grey`]'s local-threshold confidence.
struct Integral {
    width: usize,
    height: usize,
    /// `(width + 1) × (height + 1)` sums; `sum[y][x]` is the total of all luma
    /// above-and-left of `(x, y)`.
    sum: Vec<u64>,
}

impl Integral {
    #[tracing::instrument(skip_all)]
    fn new(width: usize, height: usize, luma: &[u8]) -> Self {
        let stride = width + 1;
        let mut sum = vec![0u64; stride * (height + 1)];
        for y in 0..height {
            let mut row_acc = 0u64;
            for x in 0..width {
                row_acc += luma[y * width + x] as u64;
                sum[(y + 1) * stride + (x + 1)] = sum[y * stride + (x + 1)] + row_acc;
            }
        }
        Integral { width, height, sum }
    }

    /// Mean luma over the window of half-size `radius` centred on `(cx, cy)`,
    /// clamped to the image. Returns `128.0` for a degenerate window.
    ///
    /// Not `tracing`-instrumented: it is called once per pixel (binarisation)
    /// and per module (confidence), so a span here floods the wasm tracer.
    #[inline]
    fn window_mean(&self, cx: i64, cy: i64, radius: i64) -> f64 {
        let x0 = (cx - radius).clamp(0, self.width as i64) as usize;
        let x1 = (cx + radius + 1).clamp(0, self.width as i64) as usize;
        let y0 = (cy - radius).clamp(0, self.height as i64) as usize;
        let y1 = (cy + radius + 1).clamp(0, self.height as i64) as usize;
        let area = ((x1 - x0) * (y1 - y0)) as f64;
        if area == 0.0 {
            return 128.0;
        }
        let stride = self.width + 1;
        let total = self.sum[y1 * stride + x1] + self.sum[y0 * stride + x0]
            - self.sum[y0 * stride + x1]
            - self.sum[y1 * stride + x0];
        total as f64 / area
    }
}

/// Binarise a luma buffer with a **local adaptive** threshold: each pixel is
/// judged against the mean of a window around it, minus a small bias. This keeps
/// glare, lighting gradients and uneven exposure on camera frames from merging
/// dark modules into the background — the failure a single global Otsu cannot
/// escape. It is the retry-loop's second attempt after the fast global path.
///
/// Returns `None` when the buffer size does not match `width * height` or the
/// image is empty.
#[tracing::instrument(skip_all)]
pub fn binarize_adaptive(width: usize, height: usize, luma: &[u8]) -> Option<Bitmap> {
    if width == 0 || height == 0 || luma.len() != width * height {
        return None;
    }
    let integral = Integral::new(width, height, luma);
    // A window a good deal larger than a module but smaller than the lighting
    // gradients we want to cancel. Tied to the frame size so it scales.
    let radius = (width.min(height) / 16).max(8) as i64;
    // Bias below the local mean: a pixel must be clearly darker than its
    // surround to count as ink, which suppresses noise in flat regions.
    const BIAS: f64 = 6.0;

    let mut dark = vec![false; width * height];
    let mut sum_threshold = 0f64;
    for y in 0..height {
        for x in 0..width {
            let mean = integral.window_mean(x as i64, y as i64, radius);
            let threshold = mean - BIAS;
            sum_threshold += threshold;
            dark[y * width + x] = (luma[y * width + x] as f64) <= threshold;
        }
    }
    // A representative threshold (mean local threshold) for grey confidence.
    let threshold = (sum_threshold / (width * height) as f64).clamp(0.0, 255.0) as u8;
    let dark_pixels = dark.iter().filter(|&&d| d).count();
    tracing::debug!(
        width,
        height,
        radius,
        threshold,
        dark_pixels,
        "binarize_adaptive: local mean-C threshold"
    );
    Some(Bitmap {
        width,
        height,
        dark,
    })
}

/// A grey (luma) view of the frame with sub-pixel sampling and local-threshold
/// confidence, used to refine the hard-bitmap module reads: sampling module
/// centres from the *grey* image (bilinear) recovers a value even when the
/// centre pixel straddles an edge, and the distance of that value from the local
/// decision threshold gives a per-module confidence. Low-confidence modules are
/// reported to the decoders as Reed-Solomon **erasures**, which they repair at
/// twice the rate of unknown errors.
pub struct Grey<'a> {
    width: usize,
    height: usize,
    luma: &'a [u8],
    integral: Integral,
}

impl<'a> Grey<'a> {
    /// Build a grey view over a `width × height` luma buffer, or `None` when the
    /// buffer size does not match.
    #[tracing::instrument(skip_all)]
    pub fn new(width: usize, height: usize, luma: &'a [u8]) -> Option<Self> {
        if width == 0 || height == 0 || luma.len() != width * height {
            return None;
        }
        Some(Grey {
            width,
            height,
            luma,
            integral: Integral::new(width, height, luma),
        })
    }

    /// Read the luma at integer `(x, y)`, clamping to the image edges.
    #[inline]
    fn at(&self, x: i64, y: i64) -> f64 {
        let x = x.clamp(0, self.width as i64 - 1) as usize;
        let y = y.clamp(0, self.height as i64 - 1) as usize;
        self.luma[y * self.width + x] as f64
    }

    /// Bilinearly interpolate the luma at the real-valued point `(x, y)`.
    /// Not `tracing`-instrumented — it runs per module.
    pub fn sample(&self, x: f64, y: f64) -> f64 {
        let x0 = x.floor();
        let y0 = y.floor();
        let fx = x - x0;
        let fy = y - y0;
        let (x0, y0) = (x0 as i64, y0 as i64);
        let top = self.at(x0, y0) * (1.0 - fx) + self.at(x0 + 1, y0) * fx;
        let bottom = self.at(x0, y0 + 1) * (1.0 - fx) + self.at(x0 + 1, y0 + 1) * fx;
        top * (1.0 - fy) + bottom * fy
    }

    /// Local decision threshold around `(x, y)` — the mean of a window of
    /// half-size `radius`, minus a small bias — matching [`binarize_adaptive`].
    /// Not `tracing`-instrumented — it runs per module.
    pub fn local_threshold(&self, x: f64, y: f64, radius: i64) -> f64 {
        self.integral
            .window_mean(x.round() as i64, y.round() as i64, radius.max(1))
            - 6.0
    }
}

#[cfg(test)]
mod tests {
    use super::{binarize, binarize_adaptive, Grey};

    #[test]
    fn rejects_a_mismatched_buffer() {
        assert!(binarize(2, 2, &[0, 0, 0]).is_none());
        assert!(binarize(0, 0, &[]).is_none());
    }

    #[test]
    fn splits_a_bimodal_image_into_dark_and_light() {
        // Two black pixels, two white: Otsu should separate them cleanly.
        let bitmap = binarize(2, 2, &[0, 0, 255, 255]).expect("valid buffer");
        assert!(bitmap.get(0, 0));
        assert!(bitmap.get(1, 0));
        assert!(!bitmap.get(0, 1));
        assert!(!bitmap.get(1, 1));
        // Out-of-bounds reads are light.
        assert!(!bitmap.get(-1, 0));
        assert!(!bitmap.get(0, 5));
    }

    /// Build a bitmap from a `width`×`height` slice of `0`/`1` bytes (`1` dark).
    fn bitmap_of(width: usize, height: usize, dark: &[u8]) -> super::Bitmap {
        let luma: Vec<u8> = dark.iter().map(|&d| if d == 1 { 0 } else { 255 }).collect();
        binarize(width, height, &luma).expect("valid buffer")
    }

    #[test]
    fn dense_bounds_ignore_a_stray_speck_in_the_margin() {
        // A solid 4×4 block in the middle of a 10×10 frame, plus one lone dark
        // speck near the top-left corner. The plain bounding box would stretch
        // to that speck; the dense box must snap to the block (rows/cols 3..=6).
        let mut dark = vec![0u8; 10 * 10];
        for y in 3..7 {
            for x in 3..7 {
                dark[y * 10 + x] = 1;
            }
        }
        dark[1 * 10 + 1] = 1; // stray speck
        let bitmap = bitmap_of(10, 10, &dark);
        assert_eq!(bitmap.dense_dark_bounds(), Some((3, 3, 6, 6)));
    }

    #[test]
    fn dense_bounds_are_none_for_a_blank_image() {
        let bitmap = bitmap_of(4, 4, &[0u8; 16]);
        assert_eq!(bitmap.dense_dark_bounds(), None);
    }

    #[test]
    fn adaptive_binarise_survives_a_lighting_gradient() {
        // A dark square sitting on a strong left-to-right brightness ramp: on the
        // bright side the square's luma (90) still exceeds a *global* mid
        // threshold, so global Otsu would drop it, but the local mean-C threshold
        // keeps it dark.
        let (w, h) = (40usize, 20usize);
        let mut luma = vec![0u8; w * h];
        for y in 0..h {
            for x in 0..w {
                // Background ramps 40 → 250 across the width.
                luma[y * w + x] = (40 + (x * 210 / w)) as u8;
            }
        }
        // A dark square (luma 90) on the bright right-hand side.
        for y in 6..14 {
            for x in 28..36 {
                luma[y * w + x] = 90;
            }
        }
        let bitmap = binarize_adaptive(w, h, &luma).expect("valid buffer");
        // The square is darker than its local surround, so it reads as ink.
        assert!(bitmap.get(31, 10), "dark square on the bright side is kept");
        // Its bright surround is not ink.
        assert!(!bitmap.get(24, 10), "bright background is not ink");
    }

    #[test]
    fn grey_sample_interpolates_between_pixels() {
        // A 2×1 ramp from 0 to 100: the midpoint reads ~50.
        let grey = Grey::new(2, 1, &[0, 100]).expect("valid buffer");
        assert_eq!(grey.sample(0.0, 0.0), 0.0);
        assert_eq!(grey.sample(1.0, 0.0), 100.0);
        assert!((grey.sample(0.5, 0.0) - 50.0).abs() < 1e-9);
    }
}
