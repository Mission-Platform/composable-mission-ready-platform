//! Version/capacity tables and derived sizing helpers from the QR
//! specification (ISO/IEC 18004). Ported from the AssemblyScript reference
//! (itself a port of Project Nayuki's public-domain generator).

pub const MIN_VERSION: i32 = 1;
pub const MAX_VERSION: i32 = 40;

/// Format bits per error-correction ordinal (L, M, Q, H).
pub const ECC_FORMAT_BITS: [i32; 4] = [1, 0, 3, 2];

/// Number of error-correction codewords per block, indexed `[ecc][version]`
/// (index 0 is an unused sentinel so versions map to their natural index).
pub const ECC_CODEWORDS_PER_BLOCK: [[i32; 41]; 4] = [
    [
        -1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28,
        30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
    ],
    [
        -1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28,
        28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28,
    ],
    [
        -1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30,
        30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
    ],
    [
        -1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24,
        30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
    ],
];

/// Number of error-correction blocks, indexed `[ecc][version]`.
pub const NUM_ERROR_CORRECTION_BLOCKS: [[i32; 41]; 4] = [
    [
        -1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12,
        13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25,
    ],
    [
        -1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21,
        23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49,
    ],
    [
        -1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27,
        29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68,
    ],
    [
        -1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32,
        35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81,
    ],
];

/// Number of bits in a byte-mode character-count field for the given version.
#[tracing::instrument(skip_all)]
pub fn byte_mode_char_count_bits(version: i32) -> i32 {
    if version <= 9 {
        8
    } else {
        16
    }
}

/// Total number of raw data + EC modules (before dividing into codewords).
#[tracing::instrument(skip_all)]
pub fn num_raw_data_modules(version: i32) -> i32 {
    let mut result = (16 * version + 128) * version + 64;
    if version >= 2 {
        let number_align = version / 7 + 2;
        result -= (25 * number_align - 10) * number_align - 55;
        if version >= 7 {
            result -= 36;
        }
    }
    result
}

/// Number of 8-bit data codewords (excluding EC codewords) for a version + ECC.
#[tracing::instrument(skip_all)]
pub fn num_data_codewords(version: i32, ecc: i32) -> i32 {
    num_raw_data_modules(version) / 8
        - ECC_CODEWORDS_PER_BLOCK[ecc as usize][version as usize]
            * NUM_ERROR_CORRECTION_BLOCKS[ecc as usize][version as usize]
}
