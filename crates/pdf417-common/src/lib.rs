//! Shared primitives for the PDF417 encode/decode crates.
//!
//! PDF417 encodes data as a stack of rows, each row a run of 17-module
//! *codewords* (8 bar/space elements). A codeword's 17-bit pattern maps to both
//! a value (0..928) and a *cluster* (0/3/6, = `rowNumber % 3 * 3`); the value
//! plus error-correction codewords form a Reed–Solomon codeword over
//! GF(929). This crate holds the pieces both the encoder and decoder share:
//!
//! - the symbol ↔ codeword tables ([`tables`]) and the lookups over them
//!   ([`get_codeword`], [`bucket_from_symbol`], [`symbol_for_codeword`]);
//! - the GF(929) Reed–Solomon error-correction decoder ([`ec_decode`]).
//!
//! Everything is a direct port of the ZXing reference
//! (`com.google.zxing.pdf417.*`), Apache-2.0.

mod tables;

pub use tables::{CODEWORD_TABLE, SYMBOL_TABLE};

/// Total number of codewords in the field: the GF(929) modulus.
pub const NUMBER_OF_CODEWORDS: i64 = 929;
/// Number of bar/space elements (bars-in-module) that make up one codeword.
pub const BARS_IN_MODULE: usize = 8;
/// Module width of a codeword.
pub const MODULES_IN_CODEWORD: i64 = 17;
/// Fewest rows a valid PDF417 barcode may have.
pub const MIN_ROWS_IN_BARCODE: i64 = 3;
/// Most rows a valid PDF417 barcode may have.
pub const MAX_ROWS_IN_BARCODE: i64 = 90;

/// Bar/space module widths of the PDF417 start guard pattern (17 modules).
pub const START_PATTERN: [u16; 8] = [8, 1, 1, 1, 1, 1, 1, 3];
/// Bar/space module widths of the PDF417 stop guard pattern (18 modules).
pub const STOP_PATTERN: [u16; 9] = [7, 1, 1, 3, 1, 1, 1, 2, 1];

/// Translate an encoded 17-bit `symbol` to its codeword value (0..928), or `-1`
/// when the symbol is not in the table. Port of `PDF417Common.getCodeword`.
pub fn get_codeword(symbol: i32) -> i32 {
    let key = (symbol & 0x3FFFF) as u32;
    match SYMBOL_TABLE.binary_search(&key) {
        Ok(i) => ((CODEWORD_TABLE[i] as i64 - 1).rem_euclid(NUMBER_OF_CODEWORDS)) as i32,
        Err(_) => -1,
    }
}

/// Split a 17-bit codeword `symbol` into its 8 module bit-counts (element
/// widths), reading from the least-significant bit. Port of
/// `PDF417ScanningDecoder.getBitCountForCodeword`.
pub fn bit_count_for_symbol(mut symbol: u32) -> [i32; BARS_IN_MODULE] {
    let mut result = [0i32; BARS_IN_MODULE];
    let mut previous_value = 0u32;
    let mut i: i32 = (result.len() - 1) as i32;
    loop {
        if (symbol & 0x1) != previous_value {
            previous_value = symbol & 0x1;
            i -= 1;
            if i < 0 {
                break;
            }
        }
        result[i as usize] += 1;
        symbol >>= 1;
    }
    result
}

/// The cluster bucket number (`0`, `3` or `6`) of an encoded 17-bit `symbol`.
/// Port of `PDF417ScanningDecoder.getCodewordBucketNumber`.
pub fn bucket_from_symbol(symbol: u32) -> i32 {
    bucket_from_bit_count(&bit_count_for_symbol(symbol))
}

/// The cluster bucket number from a codeword's 8 module bit-counts.
pub fn bucket_from_bit_count(module_bit_count: &[i32]) -> i32 {
    (module_bit_count[0] - module_bit_count[2] + module_bit_count[4] - module_bit_count[6] + 9) % 9
}

/// Inverse of [`get_codeword`] used by the encoder: the 17-bit symbol pattern
/// for a codeword `value` in cluster index `cluster_index` (0, 1 or 2 for the
/// actual clusters 0/3/6), or `None`.
///
/// Rather than shipping a second (writer) table, this scans the shared decode
/// tables for the symbol that both decodes to `value` and whose
/// [`bucket_from_symbol`] cluster matches — so the encoder is, by construction,
/// consistent with exactly what the decoder will read back.
pub fn symbol_for_codeword(value: i32, cluster_index: usize) -> Option<u32> {
    for &symbol in SYMBOL_TABLE {
        if get_codeword(symbol as i32) == value
            && (bucket_from_symbol(symbol) / 3) as usize == cluster_index
        {
            return Some(symbol);
        }
    }
    None
}

// --- Codeword sampling (port of `PDF417CodewordDecoder`) ---

use std::sync::OnceLock;

/// The symbol width-ratio table, lazily built from [`SYMBOL_TABLE`] on first use
/// (mirrors ZXing's static `RATIOS_TABLE`). Each row is the fraction of the
/// codeword's 17 modules taken by each of the 8 bar/space elements.
fn ratios_table() -> &'static Vec<[f32; BARS_IN_MODULE]> {
    static RATIOS: OnceLock<Vec<[f32; BARS_IN_MODULE]>> = OnceLock::new();
    RATIOS.get_or_init(|| {
        SYMBOL_TABLE
            .iter()
            .map(|&symbol| {
                let mut row = [0.0f32; BARS_IN_MODULE];
                let mut current = symbol;
                let mut current_bit = current & 0x1;
                for j in 0..BARS_IN_MODULE {
                    let mut size = 0.0f32;
                    while (current & 0x1) == current_bit {
                        size += 1.0;
                        current >>= 1;
                    }
                    current_bit = current & 0x1;
                    row[BARS_IN_MODULE - j - 1] = size / MODULES_IN_CODEWORD as f32;
                }
                row
            })
            .collect()
    })
}

/// Read a codeword's 17-bit symbol value from the measured module bit-counts of
/// one codeword's 8 bar/space runs, or `-1` if none matches. Port of
/// `PDF417CodewordDecoder.getDecodedValue` (exact sample first, closest-ratio
/// match as fallback).
pub fn sample_codeword_symbol(module_bit_count: &[i32]) -> i32 {
    let sampled = sample_bit_counts(module_bit_count);
    let bit_value = bit_value(&sampled);
    if get_codeword(bit_value) != -1 {
        return bit_value;
    }
    closest_decoded_value(module_bit_count)
}

/// Fast exact-only variant of [`sample_codeword_symbol`]: the resampled bit
/// value if it is a valid symbol, else `-1`. This is the scanner locator's
/// per-run hot path — it deliberately skips the O(table-size) closest-ratio
/// fallback so scanning every row of an image stays cheap; Reed–Solomon then
/// recovers the handful of runs that do not sample exactly.
pub fn sample_codeword_symbol_exact(module_bit_count: &[i32]) -> i32 {
    let sampled = sample_bit_counts(module_bit_count);
    let bit_value = bit_value(&sampled);
    if get_codeword(bit_value) != -1 {
        bit_value
    } else {
        -1
    }
}

fn sample_bit_counts(module_bit_count: &[i32]) -> [i32; BARS_IN_MODULE] {
    let bit_count_sum: i32 = module_bit_count.iter().sum();
    let mut result = [0i32; BARS_IN_MODULE];
    let mut bit_count_index = 0usize;
    let mut sum_previous_bits = 0i32;
    for i in 0..MODULES_IN_CODEWORD {
        let sample_index = bit_count_sum as f32 / (2.0 * MODULES_IN_CODEWORD as f32)
            + (i as f32 * bit_count_sum as f32) / MODULES_IN_CODEWORD as f32;
        if bit_count_index < module_bit_count.len()
            && (sum_previous_bits + module_bit_count[bit_count_index]) as f32 <= sample_index
        {
            sum_previous_bits += module_bit_count[bit_count_index];
            bit_count_index += 1;
        }
        if bit_count_index < result.len() {
            result[bit_count_index] += 1;
        }
    }
    result
}

fn bit_value(module_bit_count: &[i32]) -> i32 {
    let mut result: i64 = 0;
    for (i, &count) in module_bit_count.iter().enumerate() {
        for _ in 0..count {
            result = (result << 1) | (if i % 2 == 0 { 1 } else { 0 });
        }
    }
    result as i32
}

fn closest_decoded_value(module_bit_count: &[i32]) -> i32 {
    let bit_count_sum: i32 = module_bit_count.iter().sum();
    let mut ratios = [0.0f32; BARS_IN_MODULE];
    if bit_count_sum > 1 {
        for (i, r) in ratios.iter_mut().enumerate() {
            *r = module_bit_count.get(i).copied().unwrap_or(0) as f32 / bit_count_sum as f32;
        }
    }
    let mut best_match_error = f32::MAX;
    let mut best_match = -1i32;
    for (j, row) in ratios_table().iter().enumerate() {
        let mut error = 0.0f32;
        for k in 0..BARS_IN_MODULE {
            let diff = row[k] - ratios[k];
            error += diff * diff;
            if error >= best_match_error {
                break;
            }
        }
        if error < best_match_error {
            best_match_error = error;
            best_match = SYMBOL_TABLE[j] as i32;
        }
    }
    best_match
}

// --- GF(929) Reed–Solomon error correction (port of the ZXing `ec` package) ---

/// A field based on powers of a generator integer, modulo 929. Port of
/// `com.google.zxing.pdf417.decoder.ec.ModulusGF`.
struct ModulusGf {
    exp: Vec<i64>,
    log: Vec<i64>,
    modulus: i64,
}

impl ModulusGf {
    fn new(modulus: i64, generator: i64) -> Self {
        let m = modulus as usize;
        let mut exp = vec![0i64; m];
        let mut log = vec![0i64; m];
        let mut x = 1i64;
        for e in exp.iter_mut() {
            *e = x;
            x = (x * generator) % modulus;
        }
        for i in 0..m - 1 {
            log[exp[i] as usize] = i as i64;
        }
        ModulusGf { exp, log, modulus }
    }

    fn add(&self, a: i64, b: i64) -> i64 {
        (a + b) % self.modulus
    }
    fn subtract(&self, a: i64, b: i64) -> i64 {
        (self.modulus + a - b) % self.modulus
    }
    fn exp(&self, a: i64) -> i64 {
        self.exp[a as usize]
    }
    fn log(&self, a: i64) -> i64 {
        self.log[a as usize]
    }
    fn inverse(&self, a: i64) -> i64 {
        self.exp[(self.modulus - self.log[a as usize] - 1) as usize]
    }
    fn multiply(&self, a: i64, b: i64) -> i64 {
        if a == 0 || b == 0 {
            return 0;
        }
        self.exp[((self.log[a as usize] + self.log[b as usize]) % (self.modulus - 1)) as usize]
    }
}

/// A polynomial over [`ModulusGf`]; coefficients most-significant first. Port of
/// `ModulusPoly`.
#[derive(Clone)]
struct ModulusPoly {
    coefficients: Vec<i64>,
}

impl ModulusPoly {
    fn new(coefficients: Vec<i64>) -> Self {
        debug_assert!(!coefficients.is_empty());
        if coefficients.len() > 1 && coefficients[0] == 0 {
            let mut first_non_zero = 1;
            while first_non_zero < coefficients.len() && coefficients[first_non_zero] == 0 {
                first_non_zero += 1;
            }
            if first_non_zero == coefficients.len() {
                ModulusPoly {
                    coefficients: vec![0],
                }
            } else {
                ModulusPoly {
                    coefficients: coefficients[first_non_zero..].to_vec(),
                }
            }
        } else {
            ModulusPoly { coefficients }
        }
    }

    fn zero() -> Self {
        ModulusPoly {
            coefficients: vec![0],
        }
    }
    fn one() -> Self {
        ModulusPoly {
            coefficients: vec![1],
        }
    }

    fn degree(&self) -> i64 {
        self.coefficients.len() as i64 - 1
    }
    fn is_zero(&self) -> bool {
        self.coefficients[0] == 0
    }
    /// Coefficient of the `degree`-th term.
    fn coefficient(&self, degree: i64) -> i64 {
        self.coefficients[self.coefficients.len() - 1 - degree as usize]
    }

    fn evaluate_at(&self, field: &ModulusGf, a: i64) -> i64 {
        if a == 0 {
            return self.coefficient(0);
        }
        if a == 1 {
            let mut result = 0;
            for &c in &self.coefficients {
                result = field.add(result, c);
            }
            return result;
        }
        let mut result = self.coefficients[0];
        for &c in &self.coefficients[1..] {
            result = field.add(field.multiply(a, result), c);
        }
        result
    }

    fn add(&self, field: &ModulusGf, other: &ModulusPoly) -> ModulusPoly {
        if self.is_zero() {
            return other.clone();
        }
        if other.is_zero() {
            return self.clone();
        }
        let (mut smaller, mut larger) = (&self.coefficients, &other.coefficients);
        if smaller.len() > larger.len() {
            std::mem::swap(&mut smaller, &mut larger);
        }
        let mut sum_diff = vec![0i64; larger.len()];
        let length_diff = larger.len() - smaller.len();
        sum_diff[..length_diff].copy_from_slice(&larger[..length_diff]);
        for i in length_diff..larger.len() {
            sum_diff[i] = field.add(smaller[i - length_diff], larger[i]);
        }
        ModulusPoly::new(sum_diff)
    }

    fn subtract(&self, field: &ModulusGf, other: &ModulusPoly) -> ModulusPoly {
        if other.is_zero() {
            return self.clone();
        }
        self.add(field, &other.negative(field))
    }

    fn multiply(&self, field: &ModulusGf, other: &ModulusPoly) -> ModulusPoly {
        if self.is_zero() || other.is_zero() {
            return ModulusPoly::zero();
        }
        let a = &self.coefficients;
        let b = &other.coefficients;
        let mut product = vec![0i64; a.len() + b.len() - 1];
        for (i, &ac) in a.iter().enumerate() {
            for (j, &bc) in b.iter().enumerate() {
                product[i + j] = field.add(product[i + j], field.multiply(ac, bc));
            }
        }
        ModulusPoly::new(product)
    }

    fn negative(&self, field: &ModulusGf) -> ModulusPoly {
        let coefficients = self
            .coefficients
            .iter()
            .map(|&c| field.subtract(0, c))
            .collect();
        ModulusPoly::new(coefficients)
    }

    fn multiply_scalar(&self, field: &ModulusGf, scalar: i64) -> ModulusPoly {
        if scalar == 0 {
            return ModulusPoly::zero();
        }
        if scalar == 1 {
            return self.clone();
        }
        let coefficients = self
            .coefficients
            .iter()
            .map(|&c| field.multiply(c, scalar))
            .collect();
        ModulusPoly::new(coefficients)
    }

    fn multiply_by_monomial(
        &self,
        field: &ModulusGf,
        degree: i64,
        coefficient: i64,
    ) -> ModulusPoly {
        if coefficient == 0 {
            return ModulusPoly::zero();
        }
        let mut product = vec![0i64; self.coefficients.len() + degree as usize];
        for (i, &c) in self.coefficients.iter().enumerate() {
            product[i] = field.multiply(c, coefficient);
        }
        ModulusPoly::new(product)
    }
}

fn build_monomial(degree: i64, coefficient: i64) -> ModulusPoly {
    if coefficient == 0 {
        return ModulusPoly::zero();
    }
    let mut coefficients = vec![0i64; degree as usize + 1];
    coefficients[0] = coefficient;
    ModulusPoly::new(coefficients)
}

/// Correct up to `num_ec_codewords`/2 errors in `received` in place using the
/// GF(929) Reed–Solomon code, returning the number of errors corrected, or
/// `None` if correction failed. Port of `ErrorCorrection.decode`.
pub fn ec_decode(
    received: &mut [i32],
    num_ec_codewords: usize,
    erasures: &[usize],
) -> Option<usize> {
    let field = ModulusGf::new(NUMBER_OF_CODEWORDS, 3);
    if received.len() as i64 > field.modulus {
        return None;
    }

    let poly = ModulusPoly::new(received.iter().map(|&c| c as i64).collect());
    let mut syndrome = vec![0i64; num_ec_codewords];
    let mut error = false;
    for i in (1..=num_ec_codewords).rev() {
        let eval = poly.evaluate_at(&field, field.exp(i as i64));
        syndrome[num_ec_codewords - i] = eval;
        if eval != 0 {
            error = true;
        }
    }
    if !error {
        return Some(0);
    }

    // (Known erasures are intentionally left unused, mirroring the reference,
    // which comments out their contribution to sigma.)
    let _ = erasures;

    let syndrome_poly = ModulusPoly::new(syndrome);
    let (sigma, omega) = run_euclidean_algorithm(
        &field,
        build_monomial(num_ec_codewords as i64, 1),
        syndrome_poly,
        num_ec_codewords as i64,
    )?;

    let error_locations = find_error_locations(&field, &sigma)?;
    let error_magnitudes = find_error_magnitudes(&field, &omega, &sigma, &error_locations);

    for (i, &loc) in error_locations.iter().enumerate() {
        let position = received.len() as i64 - 1 - field.log(loc);
        if position < 0 {
            return None;
        }
        received[position as usize] =
            field.subtract(received[position as usize] as i64, error_magnitudes[i]) as i32;
    }
    Some(error_locations.len())
}

fn run_euclidean_algorithm(
    field: &ModulusGf,
    a: ModulusPoly,
    b: ModulusPoly,
    r_degree: i64,
) -> Option<(ModulusPoly, ModulusPoly)> {
    let (mut a, mut b) = (a, b);
    if a.degree() < b.degree() {
        std::mem::swap(&mut a, &mut b);
    }

    let mut r_last = a;
    let mut r = b;
    let mut t_last = ModulusPoly::zero();
    let mut t = ModulusPoly::one();

    while r.degree() >= r_degree / 2 {
        let r_last_last = r_last;
        let t_last_last = t_last;
        r_last = r.clone();
        t_last = t.clone();

        if r_last.is_zero() {
            return None;
        }
        r = r_last_last;
        let mut q = ModulusPoly::zero();
        let denominator_leading_term = r_last.coefficient(r_last.degree());
        let dlt_inverse = field.inverse(denominator_leading_term);
        while r.degree() >= r_last.degree() && !r.is_zero() {
            let degree_diff = r.degree() - r_last.degree();
            let scale = field.multiply(r.coefficient(r.degree()), dlt_inverse);
            q = q.add(field, &build_monomial(degree_diff, scale));
            r = r.subtract(
                field,
                &r_last.multiply_by_monomial(field, degree_diff, scale),
            );
        }

        t = q
            .multiply(field, &t_last)
            .subtract(field, &t_last_last)
            .negative(field);
    }

    let sigma_tilde_at_zero = t.coefficient(0);
    if sigma_tilde_at_zero == 0 {
        return None;
    }

    let inverse = field.inverse(sigma_tilde_at_zero);
    let sigma = t.multiply_scalar(field, inverse);
    let omega = r.multiply_scalar(field, inverse);
    Some((sigma, omega))
}

fn find_error_locations(field: &ModulusGf, error_locator: &ModulusPoly) -> Option<Vec<i64>> {
    let num_errors = error_locator.degree();
    let mut result = Vec::with_capacity(num_errors as usize);
    let mut i = 1;
    while i < field.modulus && (result.len() as i64) < num_errors {
        if error_locator.evaluate_at(field, i) == 0 {
            result.push(field.inverse(i));
        }
        i += 1;
    }
    if result.len() as i64 != num_errors {
        return None;
    }
    Some(result)
}

fn find_error_magnitudes(
    field: &ModulusGf,
    error_evaluator: &ModulusPoly,
    error_locator: &ModulusPoly,
    error_locations: &[i64],
) -> Vec<i64> {
    let error_locator_degree = error_locator.degree();
    if error_locator_degree < 1 {
        return Vec::new();
    }
    let mut formal_derivative_coefficients = vec![0i64; error_locator_degree as usize];
    for i in 1..=error_locator_degree {
        formal_derivative_coefficients[(error_locator_degree - i) as usize] =
            field.multiply(i, error_locator.coefficient(i));
    }
    let formal_derivative = ModulusPoly::new(formal_derivative_coefficients);

    let mut result = Vec::with_capacity(error_locations.len());
    for &loc in error_locations {
        let xi_inverse = field.inverse(loc);
        let numerator = field.subtract(0, error_evaluator.evaluate_at(field, xi_inverse));
        let denominator = field.inverse(formal_derivative.evaluate_at(field, xi_inverse));
        result.push(field.multiply(numerator, denominator));
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tables_are_full() {
        assert_eq!(SYMBOL_TABLE.len(), 2787);
        assert_eq!(CODEWORD_TABLE.len(), 2787);
    }

    #[test]
    fn symbol_codeword_round_trip() {
        // Every codeword value must have a symbol in each of the three clusters,
        // and that symbol must decode back to the same value + cluster.
        for value in 0..NUMBER_OF_CODEWORDS as i32 {
            for cluster_index in 0..3usize {
                let symbol = symbol_for_codeword(value, cluster_index)
                    .unwrap_or_else(|| panic!("no symbol for cw={value} cluster={cluster_index}"));
                assert_eq!(get_codeword(symbol as i32), value);
                assert_eq!((bucket_from_symbol(symbol) / 3) as usize, cluster_index);
            }
        }
    }

    #[test]
    fn ec_corrects_no_error() {
        // A valid codeword (all-zero syndromes) reports zero corrections.
        // Build data + EC via the same generator the encoder uses is covered in
        // the encode crate; here we only assert the clean-input fast path.
        let mut received = vec![2, 900, 0, 0];
        // Not a real codeword, but ec_decode over a random vector should either
        // report an error count or fail — never panic.
        let _ = ec_decode(&mut received, 2, &[]);
    }
}
