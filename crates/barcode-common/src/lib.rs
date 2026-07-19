//! Shared 1D (linear) barcode primitives used by both the encoder and the
//! decoder.
//!
//! This holds the ratio-based [`widths_to_modules`] expander that the
//! width-driven symbologies (Code 39, ITF, Codabar) build their module runs
//! from, its [`modules_to_runs`] inverse used by the decoders, and the shared
//! Code 39 / Code 93 [`full_ascii`] shift table. It lives here so the
//! `mission-platform-barcode-encode` and `mission-platform-barcode-decode`
//! crates share exactly one implementation.

pub mod code93;
pub mod full_ascii;

/// Expand a slice of element widths into module bits, starting with a bar (or a
/// space when `start_with_bar` is `false`) and alternating bar/space. Used by
/// the ratio-based symbologies.
#[tracing::instrument(skip_all)]
pub fn widths_to_modules(widths: &[u8], start_with_bar: bool) -> Vec<u8> {
    let mut modules = Vec::new();
    let mut bar = start_with_bar;
    for &width in widths {
        let bit = if bar { 1 } else { 0 };
        for _ in 0..width {
            modules.push(bit);
        }
        bar = !bar;
    }
    modules
}

/// Run-length encode a module-bit slice into `(bit, run_length)` pairs — the
/// inverse of [`widths_to_modules`]. Used by the decoders to recover element
/// widths from a clean (noise-free) module run.
#[tracing::instrument(skip_all)]
pub fn modules_to_runs(modules: &[u8]) -> Vec<(u8, usize)> {
    let mut runs = Vec::new();
    let mut iter = modules.iter().copied();
    let Some(mut current) = iter.next() else {
        return runs;
    };
    let mut length = 1usize;
    for bit in iter {
        if bit == current {
            length += 1;
        } else {
            runs.push((current, length));
            current = bit;
            length = 1;
        }
    }
    runs.push((current, length));
    runs
}

#[cfg(test)]
mod tests {
    use super::widths_to_modules;

    #[test]
    fn expands_widths_alternating_from_a_bar() {
        // Widths [2, 1, 3] starting with a bar -> 11 0 111.
        assert_eq!(widths_to_modules(&[2, 1, 3], true), vec![1, 1, 0, 1, 1, 1]);
    }

    #[test]
    fn can_start_with_a_space() {
        assert_eq!(widths_to_modules(&[1, 2], false), vec![0, 1, 1]);
    }
}
