//! Reed-Solomon error correction over GF(256) with primitive polynomial
//! `0x11D` and generator `2`.
//!
//! The encoder side (divisor + remainder) mirrors the AssemblyScript reference
//! exactly. The decoder side (syndromes, Berlekamp-Massey, Chien search, Forney)
//! is a from-scratch error-and-erasure-free corrector used by the QR decoder.

use crate::tables::{num_raw_data_modules, ECC_CODEWORDS_PER_BLOCK, NUM_ERROR_CORRECTION_BLOCKS};

/// Precomputed exponentiation / logarithm tables for GF(256).
struct GfTables {
    exp: [u8; 512],
    log: [u8; 256],
}

#[tracing::instrument(skip_all)]
fn build_tables() -> GfTables {
    let mut exp = [0u8; 512];
    let mut log = [0u8; 256];
    let mut x: u16 = 1;
    for i in 0..255 {
        exp[i] = x as u8;
        log[x as usize] = i as u8;
        x <<= 1;
        if x & 0x100 != 0 {
            x ^= 0x11d;
        }
    }
    for i in 255..512 {
        exp[i] = exp[i - 255];
    }
    GfTables { exp, log }
}

#[tracing::instrument(skip_all)]
fn tables() -> &'static GfTables {
    // Built once; wasm is single-threaded so a static OnceCell-free init is fine.
    use std::sync::OnceLock;
    static TABLES: OnceLock<GfTables> = OnceLock::new();
    TABLES.get_or_init(build_tables)
}

/// Multiply two field elements. Bit-for-bit identical to the reference's
/// `reedSolomonMultiply` (used on the encode path for byte-exact parity).
#[tracing::instrument(skip_all)]
pub fn multiply(x: i32, y: i32) -> i32 {
    let mut z = 0i32;
    for index in (0..8).rev() {
        z = (z << 1) ^ (((z >> 7) & 1) * 0x11d);
        z ^= ((y >> index) & 1) * x;
    }
    z & 0xff
}

#[tracing::instrument(skip_all)]
fn mul(a: u8, b: u8) -> u8 {
    if a == 0 || b == 0 {
        return 0;
    }
    let t = tables();
    t.exp[t.log[a as usize] as usize + t.log[b as usize] as usize]
}

#[tracing::instrument(skip_all)]
fn inv(a: u8) -> u8 {
    let t = tables();
    t.exp[255 - t.log[a as usize] as usize]
}

/// `α^power`, wrapping the exponent into the multiplicative cycle.
#[inline]
fn gf_pow(power: usize) -> u8 {
    tables().exp[power % 255]
}

/// Multiply two polynomials (low-degree-first coefficient order).
#[tracing::instrument(skip_all)]
fn poly_mul(a: &[u8], b: &[u8]) -> Vec<u8> {
    let mut out = vec![0u8; a.len() + b.len() - 1];
    for (i, &ai) in a.iter().enumerate() {
        if ai == 0 {
            continue;
        }
        for (j, &bj) in b.iter().enumerate() {
            out[i + j] ^= mul(ai, bj);
        }
    }
    out
}

/// The generator (divisor) polynomial of the given degree.
#[tracing::instrument(skip_all)]
pub fn compute_divisor(degree: usize) -> Vec<i32> {
    let mut result = vec![0i32; degree];
    result[degree - 1] = 1;
    let mut root = 1i32;
    for _ in 0..degree {
        for j in 0..result.len() {
            result[j] = multiply(result[j], root);
            if j + 1 < result.len() {
                result[j] ^= result[j + 1];
            }
        }
        root = multiply(root, 0x02);
    }
    result
}

/// The Reed-Solomon remainder of `data` divided by `divisor`.
#[tracing::instrument(skip_all)]
pub fn compute_remainder(data: &[i32], divisor: &[i32]) -> Vec<i32> {
    let mut result = vec![0i32; divisor.len()];
    for &value in data {
        let factor = value ^ result.remove(0);
        result.push(0);
        for index in 0..result.len() {
            result[index] ^= multiply(divisor[index], factor);
        }
    }
    result
}

/// Split data codewords into blocks, append EC codewords, and interleave.
/// Mirrors the reference `addEccAndInterleave`.
#[tracing::instrument(skip_all)]
pub fn add_ecc_and_interleave(data: &[i32], version: i32, ecc: i32) -> Vec<i32> {
    let number_blocks = NUM_ERROR_CORRECTION_BLOCKS[ecc as usize][version as usize];
    let block_ecc_length = ECC_CODEWORDS_PER_BLOCK[ecc as usize][version as usize];
    let raw_codewords = num_raw_data_modules(version) / 8;
    let number_short_blocks = number_blocks - (raw_codewords % number_blocks);
    let short_block_length = raw_codewords / number_blocks;

    let mut blocks: Vec<Vec<i32>> = Vec::new();
    let rs_div = compute_divisor(block_ecc_length as usize);
    let mut k = 0usize;
    for index in 0..number_blocks {
        let dat_length =
            short_block_length - block_ecc_length + if index < number_short_blocks { 0 } else { 1 };
        let mut dat = data[k..k + dat_length as usize].to_vec();
        k += dat_length as usize;
        let ecc_codewords = compute_remainder(&dat, &rs_div);
        if index < number_short_blocks {
            dat.push(0);
        }
        dat.extend_from_slice(&ecc_codewords);
        blocks.push(dat);
    }

    let mut result: Vec<i32> = Vec::new();
    for index in 0..blocks[0].len() {
        for (block_index, block) in blocks.iter().enumerate() {
            if index as i32 != short_block_length - block_ecc_length
                || block_index as i32 >= number_short_blocks
            {
                result.push(block[index]);
            }
        }
    }
    result
}

/// Decode a single Reed-Solomon block in place, correcting up to
/// `ecc_len / 2` symbol errors. Returns `false` if the block is uncorrectable.
///
/// `block` holds `data || ecc` codewords (most-significant coefficient first).
#[tracing::instrument(skip_all)]
pub fn correct_block(block: &mut [u8], ecc_len: usize) -> bool {
    correct_block_with_erasures(block, ecc_len, &[])
}

/// Decode a single Reed-Solomon block in place, treating the codeword indices in
/// `erasures` (0 = highest-degree coefficient) as **known** damaged positions.
/// Errors-and-erasures decoding repairs any mix satisfying the Singleton bound
/// `2·errors + erasures ≤ ecc_len`, so a QR symbol whose unreadable modules are
/// flagged as erasures (via low-confidence grey sampling) recovers at up to
/// twice the rate of blind error correction.
///
/// Passing an empty `erasures` slice is exactly the blind corrector
/// [`correct_block`]. `erasures` indices outside the block are ignored.
///
/// `block` holds `data || ecc` codewords (most-significant coefficient first).
#[tracing::instrument(skip_all)]
pub fn correct_block_with_erasures(block: &mut [u8], ecc_len: usize, erasures: &[usize]) -> bool {
    let n = block.len();
    // Syndromes S_1..S_ecc_len; the codeword is treated as a polynomial with the
    // first element as the highest-degree coefficient.
    let mut syndromes = vec![0u8; ecc_len];
    let mut all_zero = true;
    for i in 0..ecc_len {
        let mut s = 0u8;
        let t = tables();
        let alpha = t.exp[i]; // evaluate at alpha^i (generator fcr = 0)
        for &coeff in block.iter() {
            s = mul(s, alpha) ^ coeff;
        }
        syndromes[i] = s;
        if s != 0 {
            all_zero = false;
        }
    }
    if all_zero {
        return true; // no errors
    }

    // Deduplicate and bound-check the erasure positions.
    let mut erasure_positions: Vec<usize> =
        erasures.iter().copied().filter(|&p| p < n).collect();
    erasure_positions.sort_unstable();
    erasure_positions.dedup();
    let erasure_count = erasure_positions.len();
    if erasure_count > ecc_len {
        return false;
    }

    // Erasure locator Λ0(x) = ∏(1 + X_e·x), X_e = α^(degree of the erasure).
    let mut erasure_locator = vec![1u8];
    for &position in &erasure_positions {
        let x = gf_pow(n - 1 - position);
        erasure_locator = poly_mul(&erasure_locator, &[1, x]);
    }

    // Forney syndromes strip the erasures out so Berlekamp-Massey locates only
    // the *unknown* errors.
    let mut forney = syndromes.clone();
    for &position in &erasure_positions {
        let x = gf_pow(n - 1 - position);
        for j in 0..forney.len().saturating_sub(1) {
            forney[j] = mul(forney[j], x) ^ forney[j + 1];
        }
    }

    // Berlekamp-Massey over the Forney syndromes to find the (unknown) error
    // locator `lambda`. Only `ecc_len - erasure_count` syndromes carry errors.
    let rounds = ecc_len - erasure_count;
    let mut lambda = vec![1u8];
    let mut b = vec![1u8];
    let mut l = 0usize;
    let mut m = 1usize;
    let mut bb = 1u8;
    for r in 0..rounds {
        // Discrepancy.
        let mut delta = forney[r];
        for i in 1..=l {
            if i < lambda.len() {
                delta ^= mul(lambda[i], forney[r - i]);
            }
        }
        if delta == 0 {
            m += 1;
        } else if 2 * l <= r {
            let t = lambda.clone();
            let scale = mul(delta, inv(bb));
            // lambda = lambda - delta/bb * x^m * b
            grow(&mut lambda, m + b.len());
            for i in 0..b.len() {
                lambda[i + m] ^= mul(scale, b[i]);
            }
            b = t;
            l = r + 1 - l;
            bb = delta;
            m = 1;
        } else {
            let scale = mul(delta, inv(bb));
            grow(&mut lambda, m + b.len());
            for i in 0..b.len() {
                lambda[i + m] ^= mul(scale, b[i]);
            }
            m += 1;
        }
    }

    let errors = l;
    if 2 * errors + erasure_count > ecc_len {
        return false;
    }

    // Combine the (unknown) error locator with the erasure locator into the full
    // errata locator Σ(x) = Λ(x)·Λ0(x), whose roots mark both errors and
    // erasures.
    let sigma = poly_mul(&lambda, &erasure_locator);
    let total_positions = errors + erasure_count;

    // Chien search: find roots of Σ -> errata positions.
    let t = tables();
    let mut positions: Vec<usize> = Vec::new();
    for i in 0..n {
        // Evaluate Σ at alpha^(-i) = exp[255 - i%255].
        let xinv = t.exp[(255 - (i % 255)) % 255];
        let mut sum = 0u8;
        let mut power = 1u8;
        for &c in sigma.iter() {
            sum ^= mul(c, power);
            power = mul(power, xinv);
        }
        if sum == 0 {
            // Errata at codeword index (n-1-i) counting from the highest degree.
            positions.push(n - 1 - i);
        }
    }
    if positions.len() != total_positions {
        return false;
    }

    // Forney: errata magnitudes. Omega = S(x) * Σ(x) mod x^ecc_len.
    let mut omega = vec![0u8; ecc_len];
    for i in 0..ecc_len {
        let mut sum = 0u8;
        for j in 0..=i {
            if j < sigma.len() {
                sum ^= mul(sigma[j], syndromes[i - j]);
            }
        }
        omega[i] = sum;
    }

    for &pos in &positions {
        // xi = alpha^i where i is the position from the highest degree.
        let i_from_high = n - 1 - pos;
        let xi = t.exp[i_from_high % 255];
        let xi_inv = inv(xi);
        // Evaluate omega at xi_inv.
        let mut omega_val = 0u8;
        let mut power = 1u8;
        for &c in omega.iter() {
            omega_val ^= mul(c, power);
            power = mul(power, xi_inv);
        }
        // Evaluate formal derivative of Σ at xi_inv (odd-index terms).
        let mut deriv = 0u8;
        let mut xpow = 1u8; // xi_inv^0
        for idx in 1..sigma.len() {
            if idx % 2 == 1 {
                deriv ^= mul(sigma[idx], xpow);
            }
            xpow = mul(xpow, xi_inv);
        }
        if deriv == 0 {
            return false;
        }
        let magnitude = mul(mul(xi, omega_val), inv(deriv));
        block[pos] ^= magnitude;
    }

    // Verify by recomputing syndromes.
    for i in 0..ecc_len {
        let mut s = 0u8;
        let alpha = t.exp[i];
        for &coeff in block.iter() {
            s = mul(s, alpha) ^ coeff;
        }
        if s != 0 {
            return false;
        }
    }
    true
}

#[tracing::instrument(skip_all)]
fn grow(v: &mut Vec<u8>, len: usize) {
    if v.len() < len {
        v.resize(len, 0);
    }
}

#[cfg(test)]
mod tests {
    use super::{
        compute_divisor, compute_remainder, correct_block, correct_block_with_erasures, multiply,
    };

    /// Build a `data || ecc` codeword with `ecc_len` parity symbols.
    fn codeword(data: &[i32], ecc_len: usize) -> Vec<u8> {
        let divisor = compute_divisor(ecc_len);
        let ecc = compute_remainder(data, &divisor);
        data.iter().chain(ecc.iter()).map(|&c| c as u8).collect()
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn multiplication_obeys_field_laws() {
        assert_eq!(multiply(0, 123), 0, "0 is absorbing");
        assert_eq!(multiply(1, 123), 123, "1 is the identity");
        assert_eq!(multiply(3, 7), multiply(7, 3), "multiplication commutes");
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn divisor_has_expected_degree() {
        // A degree-n generator polynomial has n coefficients.
        assert_eq!(compute_divisor(10).len(), 10);
        assert_eq!(compute_divisor(7).len(), 7);
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn remainder_of_a_valid_codeword_is_zero() {
        // Appending the RS remainder to the data yields a codeword divisible by
        // the generator, so re-dividing must leave a zero remainder.
        let divisor = compute_divisor(5);
        let data = [32, 91, 11, 120, 209, 114, 220, 77, 67, 64];
        let ecc = compute_remainder(&data, &divisor);
        let mut codeword = data.to_vec();
        codeword.extend_from_slice(&ecc);
        assert!(compute_remainder(&codeword, &divisor)
            .iter()
            .all(|&c| c == 0));
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn corrects_a_single_symbol_error() {
        let divisor = compute_divisor(6);
        let data = [10i32, 20, 30, 40, 50, 60];
        let ecc = compute_remainder(&data, &divisor);
        let mut block: Vec<u8> = data.iter().chain(ecc.iter()).map(|&c| c as u8).collect();
        let expected = block.clone();
        // Corrupt one symbol, then confirm it is recovered.
        block[2] ^= 0x5a;
        assert!(correct_block(&mut block, 6), "block is correctable");
        assert_eq!(block, expected, "original codeword recovered");
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn corrects_pure_erasures_up_to_the_ecc_count() {
        // Known positions let the code repair one erasure per ECC symbol — 6
        // erasures over 6 parity symbols, twice the blind error capacity.
        let expected = codeword(&[10, 20, 30, 40, 50, 60], 6);
        let mut block = expected.clone();
        let erased = [0usize, 1, 4, 7, 9, 11];
        for &position in &erased {
            block[position] ^= 0x5a;
        }
        assert!(
            correct_block_with_erasures(&mut block, 6, &erased),
            "six erasures are within the erasure capacity"
        );
        assert_eq!(block, expected, "original codeword recovered from erasures");
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn corrects_a_mix_of_errors_and_erasures() {
        // 2·errors + erasures ≤ ecc_len: one unknown error (2) + two known
        // erasures (2) fits inside 6 parity symbols.
        let expected = codeword(&[10, 20, 30, 40, 50, 60], 6);
        let mut block = expected.clone();
        block[3] ^= 0x11; // unknown error
        block[8] ^= 0x22; // known erasure
        block[10] ^= 0x33; // known erasure
        assert!(
            correct_block_with_erasures(&mut block, 6, &[8, 10]),
            "one error + two erasures is within capacity"
        );
        assert_eq!(block, expected, "original codeword recovered");
    }

    #[test]
    #[tracing::instrument(skip_all)]
    fn empty_erasures_match_the_blind_corrector() {
        let expected = codeword(&[10, 20, 30, 40, 50, 60], 6);
        let mut block = expected.clone();
        block[2] ^= 0x5a;
        assert!(correct_block_with_erasures(&mut block, 6, &[]));
        assert_eq!(block, expected);
    }
}
