use wasm_bindgen::prelude::*;

/// Scalar arithmetic-reduce matching the shared i32 divide-and-conquer kernel.
#[wasm_bindgen]
pub fn arithmetic_reduce(n: i32, multiplier: i32, offset: i32, seed: i32) -> i32 {
    fn range_sum(lo: i32, hi: i32, mult: i32, seed: i32) -> i32 {
        if lo >= hi {
            return 0;
        }
        if lo + 1 == hi {
            let idx = lo.wrapping_add(1);
            let raw = idx
                .wrapping_mul(1_103_515_245)
                .wrapping_add(seed)
                .wrapping_add(12_345);
            // Toward-zero remainder matches Wasm i32.rem_s and JavaScript `%`.
            let term = (raw % 2001).wrapping_sub(1000);
            return term.wrapping_mul(mult);
        }
        let mid = lo.wrapping_add(hi);
        let half = mid / 2;
        range_sum(lo, half, mult, seed).wrapping_add(range_sum(half, hi, mult, seed))
    }

    offset.wrapping_add(range_sum(0, n, multiplier, seed))
}

/// Prefix check + suffix doubling-repeat (no Unicode case folding).
#[wasm_bindgen]
pub fn string_transform(value: &str, prefix: &str, suffix: &str, repeat: i32) -> String {
    fn repeat_str(piece: &str, n: i32) -> String {
        if n <= 0 {
            return String::new();
        }
        if n == 1 {
            return piece.to_owned();
        }
        let half = repeat_str(piece, n / 2);
        let mut doubled = String::with_capacity(half.len() * 2 + piece.len());
        doubled.push_str(&half);
        doubled.push_str(&half);
        if n % 2 == 0 {
            doubled
        } else {
            doubled.push_str(piece);
            doubled
        }
    }

    let mut output = if value.starts_with(prefix) {
        value.to_owned()
    } else {
        let mut combined = String::with_capacity(value.len() + prefix.len());
        combined.push_str(value);
        combined.push_str(prefix);
        combined
    };
    output.push_str(&repeat_str(suffix, repeat));
    output
}

/// Byte scan/reduction: each byte >= threshold contributes `byte + 1`.
#[wasm_bindgen]
pub fn dataset_scan(data: &[u8], threshold: i32) -> i32 {
    fn scan(data: &[u8], lo: usize, hi: usize, threshold: i32) -> i32 {
        if lo >= hi {
            return 0;
        }
        if lo + 1 == hi {
            let byte = i32::from(data[lo]);
            return if byte >= threshold {
                byte.wrapping_add(1)
            } else {
                0
            };
        }
        let mid = lo + hi;
        let half = mid / 2;
        scan(data, lo, half, threshold).wrapping_add(scan(data, half, hi, threshold))
    }

    scan(data, 0, data.len(), threshold)
}
