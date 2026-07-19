//! Shared helpers for decoding the ratio-based (narrow / wide) linear
//! symbologies. A clean module run is first collapsed to element runs, then each
//! element is classified as narrow or wide relative to the symbol's own
//! narrowest element.

use mission_platform_barcode_common::modules_to_runs;

/// One classified element: its module bit (`1` = bar, `0` = space) and whether
/// it is a wide element.
pub type Element = (u8, bool);

/// Collapse `modules` into classified narrow / wide elements. An element is
/// "wide" when it is at least twice the narrowest element in the symbol (for the
/// clean 1:3 output of the encoder, narrow elements are `1` and wide are `3`).
/// Returns `None` for an empty run.
#[tracing::instrument(skip_all)]
pub fn classify(modules: &[u8]) -> Option<Vec<Element>> {
    let runs = modules_to_runs(modules);
    let narrow = runs.iter().map(|&(_, length)| length).min()?;
    Some(
        runs.into_iter()
            .map(|(bit, length)| (bit, length >= narrow * 2))
            .collect(),
    )
}

/// Render a slice of elements as an `n`/`w` pattern string (using the wide flag),
/// e.g. for matching against a per-symbology pattern table.
#[tracing::instrument(skip_all)]
pub fn nw_pattern(elements: &[Element]) -> String {
    elements
        .iter()
        .map(|&(_, wide)| if wide { 'w' } else { 'n' })
        .collect()
}
