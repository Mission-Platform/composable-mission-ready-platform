//! rMQR version table (ISO/IEC 23941 Tables 6 & 12), ported from the reference.

/// One Reed-Solomon block definition: `num` blocks of `total` codewords with
/// `data` data codewords each.
#[derive(Debug, Clone, Copy)]
pub struct Block {
    /// Number of blocks with this shape.
    pub num: usize,
    /// Total codewords per block (`c`).
    pub total: usize,
    /// Data codewords per block (`k`).
    pub data: usize,
}

/// A single rMQR version's parameters.
#[derive(Debug, Clone, Copy)]
pub struct RmqrVersion {
    /// 5-bit version indicator used in the format information.
    pub version_indicator: u32,
    /// Symbol width in modules.
    pub width: usize,
    /// Symbol height in modules.
    pub height: usize,
    /// Remainder bits appended after the codeword stream.
    pub remainder_bits: usize,
    /// Total codewords (data + error correction).
    pub total_codewords: usize,
    /// Character-count-indicator length for `[numeric, alphanumeric, byte]`.
    pub char_count_bits: [u32; 3],
    /// Data-bit capacity at error level M.
    pub data_bits_m: usize,
    /// Data-bit capacity at error level H.
    pub data_bits_h: usize,
    /// Block layout at error level M.
    pub blocks_m: &'static [Block],
    /// Block layout at error level H.
    pub blocks_h: &'static [Block],
}

/// All 32 rMQR versions, in ascending version-indicator order.
pub const VERSIONS: [RmqrVersion; 32] = [
    // R7x43
    RmqrVersion {
        version_indicator: 0b00000,
        width: 43,
        height: 7,
        remainder_bits: 0,
        total_codewords: 13,
        char_count_bits: [4, 3, 3],
        data_bits_m: 48,
        data_bits_h: 24,
        blocks_m: &[Block {
            num: 1,
            total: 13,
            data: 6,
        }],
        blocks_h: &[Block {
            num: 1,
            total: 13,
            data: 3,
        }],
    },
    // R7x59
    RmqrVersion {
        version_indicator: 0b00001,
        width: 59,
        height: 7,
        remainder_bits: 3,
        total_codewords: 21,
        char_count_bits: [5, 5, 4],
        data_bits_m: 96,
        data_bits_h: 56,
        blocks_m: &[Block {
            num: 1,
            total: 21,
            data: 12,
        }],
        blocks_h: &[Block {
            num: 1,
            total: 21,
            data: 7,
        }],
    },
    // R7x77
    RmqrVersion {
        version_indicator: 0b00010,
        width: 77,
        height: 7,
        remainder_bits: 5,
        total_codewords: 32,
        char_count_bits: [6, 5, 5],
        data_bits_m: 160,
        data_bits_h: 80,
        blocks_m: &[Block {
            num: 1,
            total: 32,
            data: 20,
        }],
        blocks_h: &[Block {
            num: 1,
            total: 32,
            data: 10,
        }],
    },
    // R7x99
    RmqrVersion {
        version_indicator: 0b00011,
        width: 99,
        height: 7,
        remainder_bits: 6,
        total_codewords: 44,
        char_count_bits: [7, 6, 5],
        data_bits_m: 224,
        data_bits_h: 112,
        blocks_m: &[Block {
            num: 1,
            total: 44,
            data: 28,
        }],
        blocks_h: &[Block {
            num: 1,
            total: 44,
            data: 14,
        }],
    },
    // R7x139
    RmqrVersion {
        version_indicator: 0b00100,
        width: 139,
        height: 7,
        remainder_bits: 1,
        total_codewords: 68,
        char_count_bits: [7, 6, 6],
        data_bits_m: 352,
        data_bits_h: 192,
        blocks_m: &[Block {
            num: 1,
            total: 68,
            data: 44,
        }],
        blocks_h: &[Block {
            num: 2,
            total: 34,
            data: 12,
        }],
    },
    // R9x43
    RmqrVersion {
        version_indicator: 0b00101,
        width: 43,
        height: 9,
        remainder_bits: 2,
        total_codewords: 21,
        char_count_bits: [5, 5, 4],
        data_bits_m: 96,
        data_bits_h: 56,
        blocks_m: &[Block {
            num: 1,
            total: 21,
            data: 12,
        }],
        blocks_h: &[Block {
            num: 1,
            total: 21,
            data: 7,
        }],
    },
    // R9x59
    RmqrVersion {
        version_indicator: 0b00110,
        width: 59,
        height: 9,
        remainder_bits: 3,
        total_codewords: 33,
        char_count_bits: [6, 5, 5],
        data_bits_m: 168,
        data_bits_h: 88,
        blocks_m: &[Block {
            num: 1,
            total: 33,
            data: 21,
        }],
        blocks_h: &[Block {
            num: 1,
            total: 33,
            data: 11,
        }],
    },
    // R9x77
    RmqrVersion {
        version_indicator: 0b00111,
        width: 77,
        height: 9,
        remainder_bits: 1,
        total_codewords: 49,
        char_count_bits: [7, 6, 5],
        data_bits_m: 248,
        data_bits_h: 136,
        blocks_m: &[Block {
            num: 1,
            total: 49,
            data: 31,
        }],
        blocks_h: &[
            Block {
                num: 1,
                total: 24,
                data: 8,
            },
            Block {
                num: 1,
                total: 25,
                data: 9,
            },
        ],
    },
    // R9x99
    RmqrVersion {
        version_indicator: 0b01000,
        width: 99,
        height: 9,
        remainder_bits: 4,
        total_codewords: 66,
        char_count_bits: [7, 6, 6],
        data_bits_m: 336,
        data_bits_h: 176,
        blocks_m: &[Block {
            num: 1,
            total: 66,
            data: 42,
        }],
        blocks_h: &[Block {
            num: 2,
            total: 33,
            data: 11,
        }],
    },
    // R9x139
    RmqrVersion {
        version_indicator: 0b01001,
        width: 139,
        height: 9,
        remainder_bits: 5,
        total_codewords: 99,
        char_count_bits: [8, 7, 6],
        data_bits_m: 504,
        data_bits_h: 264,
        blocks_m: &[
            Block {
                num: 1,
                total: 49,
                data: 31,
            },
            Block {
                num: 1,
                total: 50,
                data: 32,
            },
        ],
        blocks_h: &[Block {
            num: 3,
            total: 33,
            data: 11,
        }],
    },
    // R11x27
    RmqrVersion {
        version_indicator: 0b01010,
        width: 27,
        height: 11,
        remainder_bits: 2,
        total_codewords: 15,
        char_count_bits: [4, 4, 3],
        data_bits_m: 56,
        data_bits_h: 40,
        blocks_m: &[Block {
            num: 1,
            total: 15,
            data: 7,
        }],
        blocks_h: &[Block {
            num: 1,
            total: 15,
            data: 5,
        }],
    },
    // R11x43
    RmqrVersion {
        version_indicator: 0b01011,
        width: 43,
        height: 11,
        remainder_bits: 1,
        total_codewords: 31,
        char_count_bits: [6, 5, 5],
        data_bits_m: 152,
        data_bits_h: 88,
        blocks_m: &[Block {
            num: 1,
            total: 31,
            data: 19,
        }],
        blocks_h: &[Block {
            num: 1,
            total: 31,
            data: 11,
        }],
    },
    // R11x59
    RmqrVersion {
        version_indicator: 0b01100,
        width: 59,
        height: 11,
        remainder_bits: 0,
        total_codewords: 47,
        char_count_bits: [7, 6, 5],
        data_bits_m: 248,
        data_bits_h: 120,
        blocks_m: &[Block {
            num: 1,
            total: 47,
            data: 31,
        }],
        blocks_h: &[
            Block {
                num: 1,
                total: 23,
                data: 7,
            },
            Block {
                num: 1,
                total: 24,
                data: 8,
            },
        ],
    },
    // R11x77
    RmqrVersion {
        version_indicator: 0b01101,
        width: 77,
        height: 11,
        remainder_bits: 2,
        total_codewords: 67,
        char_count_bits: [7, 6, 6],
        data_bits_m: 344,
        data_bits_h: 184,
        blocks_m: &[Block {
            num: 1,
            total: 67,
            data: 43,
        }],
        blocks_h: &[
            Block {
                num: 1,
                total: 33,
                data: 11,
            },
            Block {
                num: 1,
                total: 34,
                data: 12,
            },
        ],
    },
    // R11x99
    RmqrVersion {
        version_indicator: 0b01110,
        width: 99,
        height: 11,
        remainder_bits: 7,
        total_codewords: 89,
        char_count_bits: [8, 7, 6],
        data_bits_m: 456,
        data_bits_h: 232,
        blocks_m: &[
            Block {
                num: 1,
                total: 44,
                data: 28,
            },
            Block {
                num: 1,
                total: 45,
                data: 29,
            },
        ],
        blocks_h: &[
            Block {
                num: 1,
                total: 44,
                data: 14,
            },
            Block {
                num: 1,
                total: 45,
                data: 15,
            },
        ],
    },
    // R11x139
    RmqrVersion {
        version_indicator: 0b01111,
        width: 139,
        height: 11,
        remainder_bits: 6,
        total_codewords: 132,
        char_count_bits: [8, 7, 7],
        data_bits_m: 672,
        data_bits_h: 336,
        blocks_m: &[Block {
            num: 2,
            total: 66,
            data: 42,
        }],
        blocks_h: &[Block {
            num: 3,
            total: 44,
            data: 14,
        }],
    },
    // R13x27
    RmqrVersion {
        version_indicator: 0b10000,
        width: 27,
        height: 13,
        remainder_bits: 4,
        total_codewords: 21,
        char_count_bits: [5, 5, 4],
        data_bits_m: 96,
        data_bits_h: 56,
        blocks_m: &[Block {
            num: 1,
            total: 21,
            data: 14,
        }],
        blocks_h: &[Block {
            num: 1,
            total: 21,
            data: 7,
        }],
    },
    // R13x43
    RmqrVersion {
        version_indicator: 0b10001,
        width: 43,
        height: 13,
        remainder_bits: 1,
        total_codewords: 41,
        char_count_bits: [6, 6, 5],
        data_bits_m: 216,
        data_bits_h: 104,
        blocks_m: &[Block {
            num: 1,
            total: 41,
            data: 27,
        }],
        blocks_h: &[Block {
            num: 1,
            total: 41,
            data: 13,
        }],
    },
    // R13x59
    RmqrVersion {
        version_indicator: 0b10010,
        width: 59,
        height: 13,
        remainder_bits: 6,
        total_codewords: 60,
        char_count_bits: [7, 6, 6],
        data_bits_m: 304,
        data_bits_h: 160,
        blocks_m: &[Block {
            num: 1,
            total: 60,
            data: 38,
        }],
        blocks_h: &[Block {
            num: 2,
            total: 30,
            data: 10,
        }],
    },
    // R13x77
    RmqrVersion {
        version_indicator: 0b10011,
        width: 77,
        height: 13,
        remainder_bits: 4,
        total_codewords: 85,
        char_count_bits: [7, 7, 6],
        data_bits_m: 424,
        data_bits_h: 232,
        blocks_m: &[
            Block {
                num: 1,
                total: 42,
                data: 26,
            },
            Block {
                num: 1,
                total: 43,
                data: 27,
            },
        ],
        blocks_h: &[
            Block {
                num: 1,
                total: 42,
                data: 14,
            },
            Block {
                num: 1,
                total: 43,
                data: 15,
            },
        ],
    },
    // R13x99
    RmqrVersion {
        version_indicator: 0b10100,
        width: 99,
        height: 13,
        remainder_bits: 3,
        total_codewords: 113,
        char_count_bits: [8, 7, 7],
        data_bits_m: 584,
        data_bits_h: 280,
        blocks_m: &[
            Block {
                num: 1,
                total: 56,
                data: 36,
            },
            Block {
                num: 1,
                total: 57,
                data: 37,
            },
        ],
        blocks_h: &[
            Block {
                num: 1,
                total: 37,
                data: 11,
            },
            Block {
                num: 2,
                total: 38,
                data: 12,
            },
        ],
    },
    // R13x139
    RmqrVersion {
        version_indicator: 0b10101,
        width: 139,
        height: 13,
        remainder_bits: 0,
        total_codewords: 166,
        char_count_bits: [8, 8, 7],
        data_bits_m: 848,
        data_bits_h: 432,
        blocks_m: &[
            Block {
                num: 2,
                total: 55,
                data: 35,
            },
            Block {
                num: 1,
                total: 56,
                data: 36,
            },
        ],
        blocks_h: &[
            Block {
                num: 2,
                total: 41,
                data: 13,
            },
            Block {
                num: 2,
                total: 42,
                data: 14,
            },
        ],
    },
    // R15x43
    RmqrVersion {
        version_indicator: 0b10110,
        width: 43,
        height: 15,
        remainder_bits: 1,
        total_codewords: 51,
        char_count_bits: [7, 6, 6],
        data_bits_m: 264,
        data_bits_h: 120,
        blocks_m: &[Block {
            num: 1,
            total: 51,
            data: 33,
        }],
        blocks_h: &[
            Block {
                num: 1,
                total: 25,
                data: 7,
            },
            Block {
                num: 1,
                total: 26,
                data: 8,
            },
        ],
    },
    // R15x59
    RmqrVersion {
        version_indicator: 0b10111,
        width: 59,
        height: 15,
        remainder_bits: 4,
        total_codewords: 74,
        char_count_bits: [7, 7, 6],
        data_bits_m: 384,
        data_bits_h: 208,
        blocks_m: &[Block {
            num: 1,
            total: 74,
            data: 48,
        }],
        blocks_h: &[Block {
            num: 2,
            total: 37,
            data: 13,
        }],
    },
    // R15x77
    RmqrVersion {
        version_indicator: 0b11000,
        width: 77,
        height: 15,
        remainder_bits: 6,
        total_codewords: 103,
        char_count_bits: [8, 7, 7],
        data_bits_m: 536,
        data_bits_h: 248,
        blocks_m: &[
            Block {
                num: 1,
                total: 51,
                data: 33,
            },
            Block {
                num: 1,
                total: 52,
                data: 34,
            },
        ],
        blocks_h: &[
            Block {
                num: 2,
                total: 34,
                data: 10,
            },
            Block {
                num: 1,
                total: 35,
                data: 11,
            },
        ],
    },
    // R15x99
    RmqrVersion {
        version_indicator: 0b11001,
        width: 99,
        height: 15,
        remainder_bits: 7,
        total_codewords: 136,
        char_count_bits: [8, 7, 7],
        data_bits_m: 704,
        data_bits_h: 384,
        blocks_m: &[Block {
            num: 2,
            total: 68,
            data: 44,
        }],
        blocks_h: &[Block {
            num: 4,
            total: 34,
            data: 12,
        }],
    },
    // R15x139
    RmqrVersion {
        version_indicator: 0b11010,
        width: 139,
        height: 15,
        remainder_bits: 2,
        total_codewords: 199,
        char_count_bits: [9, 8, 7],
        data_bits_m: 1016,
        data_bits_h: 552,
        blocks_m: &[
            Block {
                num: 2,
                total: 66,
                data: 42,
            },
            Block {
                num: 1,
                total: 67,
                data: 43,
            },
        ],
        blocks_h: &[
            Block {
                num: 1,
                total: 39,
                data: 13,
            },
            Block {
                num: 4,
                total: 40,
                data: 14,
            },
        ],
    },
    // R17x43
    RmqrVersion {
        version_indicator: 0b11011,
        width: 43,
        height: 17,
        remainder_bits: 1,
        total_codewords: 61,
        char_count_bits: [7, 6, 6],
        data_bits_m: 312,
        data_bits_h: 168,
        blocks_m: &[Block {
            num: 1,
            total: 60,
            data: 39,
        }],
        blocks_h: &[
            Block {
                num: 1,
                total: 30,
                data: 10,
            },
            Block {
                num: 1,
                total: 31,
                data: 11,
            },
        ],
    },
    // R17x59
    RmqrVersion {
        version_indicator: 0b11100,
        width: 59,
        height: 17,
        remainder_bits: 2,
        total_codewords: 88,
        char_count_bits: [8, 7, 6],
        data_bits_m: 448,
        data_bits_h: 224,
        blocks_m: &[Block {
            num: 2,
            total: 44,
            data: 28,
        }],
        blocks_h: &[Block {
            num: 2,
            total: 44,
            data: 14,
        }],
    },
    // R17x77
    RmqrVersion {
        version_indicator: 0b11101,
        width: 77,
        height: 17,
        remainder_bits: 0,
        total_codewords: 122,
        char_count_bits: [8, 7, 7],
        data_bits_m: 624,
        data_bits_h: 304,
        blocks_m: &[Block {
            num: 2,
            total: 61,
            data: 39,
        }],
        blocks_h: &[
            Block {
                num: 1,
                total: 40,
                data: 12,
            },
            Block {
                num: 2,
                total: 41,
                data: 13,
            },
        ],
    },
    // R17x99
    RmqrVersion {
        version_indicator: 0b11110,
        width: 99,
        height: 17,
        remainder_bits: 3,
        total_codewords: 160,
        char_count_bits: [8, 8, 7],
        data_bits_m: 800,
        data_bits_h: 448,
        blocks_m: &[
            Block {
                num: 2,
                total: 53,
                data: 33,
            },
            Block {
                num: 1,
                total: 54,
                data: 34,
            },
        ],
        blocks_h: &[Block {
            num: 4,
            total: 40,
            data: 14,
        }],
    },
    // R17x139
    RmqrVersion {
        version_indicator: 0b11111,
        width: 139,
        height: 17,
        remainder_bits: 4,
        total_codewords: 232,
        char_count_bits: [9, 8, 8],
        data_bits_m: 1216,
        data_bits_h: 608,
        blocks_m: &[Block {
            num: 4,
            total: 58,
            data: 38,
        }],
        blocks_h: &[
            Block {
                num: 2,
                total: 38,
                data: 12,
            },
            Block {
                num: 4,
                total: 39,
                data: 13,
            },
        ],
    },
];
