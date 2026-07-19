//! 1D (linear) barcode localisation and sampling.
//!
//! Linear symbologies encode data as a run of parallel bars and spaces of
//! varying width, all the same height. Straight-on file uploads are easy — the
//! symbol fills a clean frame — but a live-camera photo is not: the bars are one
//! block inside a cluttered scene (the packaging, the human-readable digits
//! printed under the bars, a hand, a busy background), and a whole-frame ink
//! bounding box balloons onto all of it, so the scan line runs through the
//! wrong pixels and nothing decodes.
//!
//! The detector instead isolates the bars in two stages. Vertically, it finds
//! the *transition band* — the tallest run of rows that are densely striped with
//! bar/space edges — which locks onto the bars and rejects the text and plain
//! background around them. Horizontally, on each probed scan line it keeps only
//! the densest **segment** of alternating narrow elements, split away from the
//! quiet zones and any wide background blobs on either side. Each segment is
//! run-length encoded and normalised to whole modules against a speck-robust
//! unit width; the cleanest line — the one whose runs quantise closest to whole
//! modules — wins. The result is a flat run of module bits (`1` = bar,
//! `0` = space) — the input the `barcode-decode` crate /
//! `@mission-platform/barcode` decoder expects.

use crate::image::Bitmap;

/// A `(dark, length)` run along the scan-line.
struct Run {
    dark: bool,
    length: usize,
}

/// The fewest alternating runs a window must hold to be considered a barcode
/// segment. Even the shortest symbologies (EAN-8, a short Code 39) clear this
/// comfortably, while a stray patch of textured background does not.
const MIN_SEGMENT_RUNS: usize = 12;

/// A run wider than `SEPARATOR_FACTOR` × the local module unit cannot be a
/// barcode element (the widest element in any linear symbology is 4 modules), so
/// it marks a quiet zone or a chunk of background — a boundary between the
/// barcode and the clutter around it. Comfortably above 4 so intra-symbol
/// elements are never mistaken for a separator.
const SEPARATOR_FACTOR: f64 = 6.5;

/// Count dark↔light transitions along row `y` across the full image width. The
/// bars of a barcode flip colour at every module edge, so a row crossing them
/// has far more transitions than one crossing text or plain background — the
/// signal [`barcode_band`] uses to find the bars' vertical extent.
fn row_transitions(bitmap: &Bitmap, y: i64) -> usize {
    let mut count = 0;
    let mut previous = bitmap.get(0, y);
    for x in 1..bitmap.width as i64 {
        let dark = bitmap.get(x, y);
        if dark != previous {
            count += 1;
            previous = dark;
        }
    }
    count
}

/// Locate the barcode's vertical extent as the tallest contiguous band of rows
/// whose transition count reaches half that of the busiest row, bridging short
/// dips (a nick or a blurred line). This locks onto the bars — which stripe
/// every one of their rows with edges — and excludes the human-readable digit
/// row and plain background, which transition far less. Falls back to `None`
/// when no row looks striped enough to be a barcode.
pub(crate) fn barcode_band(bitmap: &Bitmap) -> Option<(i64, i64)> {
    let height = bitmap.height as i64;
    if height == 0 {
        return None;
    }
    let transitions: Vec<usize> = (0..height).map(|y| row_transitions(bitmap, y)).collect();
    let max_transitions = *transitions.iter().max()?;
    // A barcode needs several bars; a nearly plain frame never qualifies.
    if max_transitions < 2 * MIN_SEGMENT_RUNS {
        return None;
    }
    let threshold = (max_transitions / 2).max(1);
    // Bridge dips of up to a few rows so a single nicked/blurred line does not
    // sever the band.
    let max_gap = (height / 50).max(2);

    let mut best: Option<(i64, i64)> = None;
    let mut start: Option<i64> = None;
    let mut gap = 0i64;
    for y in 0..height {
        if transitions[y as usize] >= threshold {
            if start.is_none() {
                start = Some(y);
            }
            gap = 0;
        } else if let Some(band_start) = start {
            gap += 1;
            if gap > max_gap {
                let band_end = y - gap;
                let taller = best.is_none_or(|(a, b)| band_end - band_start > b - a);
                if taller {
                    best = Some((band_start, band_end));
                }
                start = None;
                gap = 0;
            }
        }
    }
    if let Some(band_start) = start {
        let band_end = height - 1 - gap;
        let taller = best.is_none_or(|(a, b)| band_end - band_start > b - a);
        if taller {
            best = Some((band_start, band_end));
        }
    }
    best
}

/// Run-length encode the full width of row `y`.
fn scanline_runs(bitmap: &Bitmap, y: i64) -> Vec<Run> {
    let mut runs = Vec::new();
    let mut current = bitmap.get(0, y);
    let mut length = 1usize;
    for x in 1..bitmap.width as i64 {
        let dark = bitmap.get(x, y);
        if dark == current {
            length += 1;
        } else {
            runs.push(Run {
                dark: current,
                length,
            });
            current = dark;
            length = 1;
        }
    }
    runs.push(Run {
        dark: current,
        length,
    });
    runs
}

/// Isolate the barcode from clutter on a scan line: split the row's runs at
/// *separators* — runs too wide to be a barcode element (a quiet zone or a slab
/// of background) — and keep the segment holding the most alternating runs. A
/// tightly-cropped upload has no separators, so the whole row is returned
/// unchanged; a busy camera frame is trimmed down to just the bars.
fn barcode_segment(runs: Vec<Run>) -> Vec<Run> {
    // A rough unit from the whole row is enough to size the separator test; the
    // real (sub-pixel) unit is measured later on the isolated segment.
    let Some(unit) = estimate_unit(&runs) else {
        return runs;
    };
    let separator = (unit * SEPARATOR_FACTOR).max(unit + 1.0);

    let mut segments: Vec<Vec<Run>> = Vec::new();
    let mut current: Vec<Run> = Vec::new();
    for run in runs {
        if run.length as f64 > separator {
            if !current.is_empty() {
                segments.push(std::mem::take(&mut current));
            }
        } else {
            current.push(run);
        }
    }
    if !current.is_empty() {
        segments.push(current);
    }

    segments
        .into_iter()
        .max_by_key(|segment| segment.len())
        .unwrap_or_default()
}

/// The most candidate scan-line samplings a single locate emits. Enough to
/// cover a photo where only a few rows of the bars quantise to a decodable
/// symbol (glare, a fold, perspective), while bounding the payload handed to JS
/// and the decode work done per frame.
const MAX_CANDIDATES: usize = 24;

/// Locate a 1D barcode in `bitmap` and sample it into a flat run of module bits
/// (`1` = bar, `0` = space), or `None` when no plausible barcode is found.
///
/// This returns the single cleanest scan line; [`scan_candidates`] returns the
/// ranked shortlist the decode stage tries in turn.
#[tracing::instrument(skip_all)]
pub fn scan(bitmap: &Bitmap) -> Option<Vec<u8>> {
    scan_candidates(bitmap).into_iter().next()
}

/// Locate a 1D barcode and sample *several* candidate scan lines, best (lowest
/// quantisation error) first, deduplicated and capped at [`MAX_CANDIDATES`].
///
/// A single "cleanest" line is a poor proxy for a *decodable* one: on a real
/// photo the row with the lowest quantisation error is often not the row whose
/// modules match a valid symbol (a rigid EAN/UPC cell grid rejects a single
/// mis-sized module), while a slightly noisier row a few pixels away decodes
/// perfectly. Emitting the ranked shortlist lets the decode stage try each row
/// until one reads, which is how a linear symbol is robustly recovered from a
/// captured frame.
#[tracing::instrument(skip_all)]
pub fn scan_candidates(bitmap: &Bitmap) -> Vec<Vec<u8>> {
    // Prefer the *transition band* — the tallest stripe of edge-dense rows — so
    // on a cluttered camera frame the scan lines land on the bars, not the
    // human-readable digits or background. Fall back to the dense ink bounds for
    // a plain frame with too little striping to band-detect (a small/blurred
    // symbol), where the whole ink region is the barcode anyway.
    let Some((min_y, max_y)) = barcode_band(bitmap).or_else(|| {
        bitmap
            .dense_dark_bounds()
            .map(|(_, min_y, _, max_y)| (min_y as i64, max_y as i64))
    }) else {
        tracing::debug!("barcode: no vertical band found");
        return Vec::new();
    };
    tracing::debug!(min_y, max_y, "barcode: vertical band");

    // Probe a spread of scan lines across the bar height. A single line is
    // easily spoiled by a nick, a printing gap or local blur, and — on a photo —
    // only a fraction of rows sample cleanly enough to decode, so sample densely
    // (roughly every other pixel, capped) rather than trusting a handful.
    let height = max_y - min_y + 1;
    let stride = (height / 32).max(1);
    let mut rows: Vec<i64> = (min_y..=max_y).step_by(stride as usize).collect();
    // Bias the search toward the middle, which is least likely to clip a bar,
    // by trying it first (its sampling wins ties).
    rows.sort_by_key(|&y| (y - (min_y + max_y) / 2).abs());

    tracing::debug!(scan_lines = rows.len(), "barcode: probing scan lines");
    let mut scored: Vec<(f64, Vec<u8>)> = Vec::new();
    for y in rows {
        if let Some((error, modules)) = sample_scanline(bitmap, y) {
            // Skip a line that sampled to the exact same module run as one we
            // already have — it adds decode work without adding coverage.
            if scored.iter().any(|(_, existing)| *existing == modules) {
                continue;
            }
            scored.push((error, modules));
        }
    }
    // Rank by quantisation error (cleanest first) and keep the shortlist.
    scored.sort_by(|a, b| a.0.total_cmp(&b.0));
    scored.truncate(MAX_CANDIDATES);

    tracing::debug!(
        candidates = scored.len(),
        best_modules = scored.first().map(|(_, m)| m.len()),
        "barcode: candidate scan lines sampled"
    );
    scored.into_iter().map(|(_, modules)| modules).collect()
}

/// Estimate the single-module (unit) width of a scan line's runs, resilient to
/// sub-module specks *and* to sub-pixel (fractional-pixel) module widths.
///
/// The raw minimum run width is fragile in two ways. First, a single stray
/// dark/light pixel (a binariser fleck, a scratch, a compression artefact) forms
/// a 1px run that collapses the unit to one pixel, so every genuine module is
/// then emitted as *many* modules and the sampled run is unusable (the field
/// report: 350 modules for a symbol that has far fewer). We guard that by
/// treating anything narrower than a quarter of the *median* run as noise, not
/// the unit.
///
/// Second — the failure that defeated live-camera reads — the narrowest run is
/// only an *integer-pixel* sample of a module whose true width is fractional. At
/// a few pixels per module (a barcode filling a low-resolution frame) a
/// one-module element lands on 3px on one line and 4px on the next, so trusting
/// the single smallest run snaps the unit to a whole pixel that is off by up to
/// ~30%; every element then rounds against a wrong grid and the total drifts off
/// a valid symbol length, so nothing decodes. Averaging the *whole cluster* of
/// one-module elements (every run within 1.5× of the narrowest, which excludes
/// genuine two-module elements) recovers a sub-pixel unit — e.g. 3.15px rather
/// than 3 or 4 — so per-element rounding lands on the right module count and the
/// symbol decodes down to ~2px per module instead of failing below ~5.
fn estimate_unit(runs: &[Run]) -> Option<f64> {
    let mut lengths: Vec<usize> = runs.iter().map(|run| run.length).collect();
    lengths.sort_unstable();
    let median = lengths[lengths.len() / 2] as f64;
    let floor = (median / 4.0).max(1.0);

    // How often each width occurs. A genuine module width recurs — a barcode has
    // many one-module elements — whereas a lone speck or scratch appears once or
    // twice. Require a candidate unit to be at least a quarter as frequent as the
    // most common width, so a rare narrow run cannot set the unit and inflate a
    // 95-module symbol into hundreds of modules (the real-photo failure the
    // median floor alone could not catch when the true unit is only a few px).
    let max_length = *lengths.last()?;
    let mut counts = vec![0usize; max_length + 1];
    for &length in &lengths {
        counts[length] += 1;
    }
    let max_count = counts.iter().copied().max()?;
    let min_significant = (max_count / 4).max(2);

    let narrowest = lengths
        .iter()
        .copied()
        .find(|&length| length as f64 >= floor && counts[length] >= min_significant)?
        as f64;
    // The one-module cluster is every run around the narrowest (0.6×..1.5×),
    // averaging it yields a sub-pixel unit instead of a jittery whole-pixel one.
    // The lower bound tracks the narrowest (not the median floor) so a rare
    // sub-narrowest speck cannot drag the average down.
    let ceiling = narrowest * 1.5;
    let cluster_floor = (narrowest * 0.6).max(floor);
    let cluster: Vec<f64> = lengths
        .iter()
        .map(|&length| length as f64)
        .filter(|&length| length >= cluster_floor && length <= ceiling)
        .collect();
    let unit = cluster.iter().sum::<f64>() / cluster.len() as f64;
    Some(unit.max(1.0))
}

/// Fold sub-module specks out of a run sequence. Any run narrower than half a
/// `unit` is noise: it is removed and its two (same-coloured) neighbours are
/// coalesced into one run whose length absorbs the speck. This reconstructs a
/// genuine element that a stray pixel had split in two (e.g. a 1px white fleck
/// inside a bar), rather than losing it to rounding. Specks at the very ends are
/// simply dropped. The smallest speck is always merged first so a cluster of
/// flecks resolves cleanly.
fn fold_specks(mut runs: Vec<Run>, unit: f64) -> Vec<Run> {
    let threshold = (unit * 0.5).max(1.0);
    loop {
        let candidate = runs
            .iter()
            .enumerate()
            .filter(|(_, run)| (run.length as f64) < threshold)
            .min_by_key(|(_, run)| run.length)
            .map(|(index, _)| index);
        let Some(index) = candidate else {
            break;
        };
        if index > 0 && index + 1 < runs.len() {
            let merged = runs[index - 1].length + runs[index].length + runs[index + 1].length;
            runs[index - 1].length = merged;
            runs.remove(index + 1);
            runs.remove(index);
        } else {
            runs.remove(index);
        }
    }
    runs
}

/// Sample one horizontal scan line at row `y` into a flat module run together
/// with a quantisation-error score (mean distance of each run from a whole
/// number of modules; lower is cleaner), or `None` when it does not look like a
/// linear symbol at all (too few bars).
fn sample_scanline(bitmap: &Bitmap, y: i64) -> Option<(f64, Vec<u8>)> {
    // Isolate the densest alternating segment of the row, dropping the quiet
    // zones and any wide background slabs on either side of the bars.
    let runs = barcode_segment(scanline_runs(bitmap, y));
    // A real linear barcode has many alternating bars/spaces; require enough to
    // reject a stray textured patch that survived the segmentation.
    if runs.len() < MIN_SEGMENT_RUNS {
        return None;
    }

    // Estimate the unit robustly, fold away sub-module specks, then refine the
    // unit on the cleaned runs (fragments a speck had carved off a genuine
    // element are now merged back, so the second estimate is sharper).
    let unit = estimate_unit(&runs)?;
    let runs = fold_specks(runs, unit);
    if runs.len() < 6 {
        return None;
    }
    let unit = estimate_unit(&runs)?;
    let runs = fold_specks(runs, unit);
    if runs.len() < 6 {
        return None;
    }
    let unit = estimate_unit(&runs)?;

    let mut modules = Vec::new();
    let mut error = 0.0;
    for run in &runs {
        let scaled = run.length as f64 / unit;
        // Specks are already folded away, so every remaining run is a genuine
        // element of at least one module — clamp to guard the rounding boundary.
        let count = (scaled.round() as usize).max(1);
        error += (scaled - count as f64).abs();
        for _ in 0..count {
            modules.push(run.dark as u8);
        }
    }

    // A decoder expects the run to start and end on a bar. Folding away an edge
    // speck can leave a leading/trailing space (its quiet zone), so trim back to
    // the outermost bars.
    let first_bar = modules.iter().position(|&bit| bit == 1)?;
    let last_bar = modules.iter().rposition(|&bit| bit == 1)?;
    let trimmed = modules[first_bar..=last_bar].to_vec();

    Some((error / runs.len() as f64, trimmed))
}
