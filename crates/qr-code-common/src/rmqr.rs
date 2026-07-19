//! Rectangular Micro QR (rMQR) matrix builder (ISO/IEC 23941).
//!
//! rMQR symbols are rectangular: one full finder pattern in the top-left, a
//! reduced finder *sub*-pattern in the bottom-right, small corner finders,
//! timing patterns around the border and along the alignment columns, and
//! alignment patterns spanning the top and bottom edges. Format information is
//! split across the two finder regions. Unlike QR / Micro QR there is a single
//! fixed data mask. The layout here is ported from ISO/IEC 23941 (cross-checked
//! against the `rmqrcode` reference encoder).

/// Sentinel for a module that has not been assigned yet.
const UNDEFINED: u8 = 2;

/// Centre-column coordinates of the alignment patterns for each symbol width.
#[tracing::instrument(skip_all)]
pub fn alignment_columns(width: usize) -> &'static [usize] {
    match width {
        43 => &[21],
        59 => &[19, 39],
        77 => &[25, 51],
        99 => &[23, 49, 75],
        139 => &[27, 55, 83, 111],
        _ => &[], // 27: none
    }
}

/// The single fixed rMQR data mask (ISO/IEC 23941 §7.8.2).
#[tracing::instrument(skip_all)]
pub fn mask_condition(x: i32, y: i32) -> bool {
    (y / 2 + x / 3) % 2 == 0
}

/// An rMQR matrix under construction.
#[derive(Debug)]
pub struct RmqrBuilder {
    /// Symbol width in modules.
    pub width: usize,
    /// Symbol height in modules.
    pub height: usize,
    modules: Vec<Vec<u8>>,
    /// Marks the encoding region (data + remainder) that the mask applies to.
    data_area: Vec<Vec<bool>>,
}

impl RmqrBuilder {
    /// Create a builder for a `width`×`height` symbol and draw every function
    /// pattern (finders, corner finders, alignment and timing patterns).
    #[tracing::instrument(skip_all)]
    pub fn new(width: usize, height: usize) -> Self {
        let mut builder = RmqrBuilder {
            width,
            height,
            modules: vec![vec![UNDEFINED; width]; height],
            data_area: vec![vec![false; width]; height],
        };
        builder.put_finder_pattern();
        builder.put_finder_sub_pattern();
        builder.put_corner_finder_pattern();
        builder.put_alignment_patterns();
        builder.put_timing_patterns();
        builder
    }

    #[tracing::instrument(skip_all)]
    fn set(&mut self, x: usize, y: usize, dark: bool) {
        self.modules[y][x] = u8::from(dark);
    }

    /// Full 7×7 finder in the top-left corner, with its separators.
    #[tracing::instrument(skip_all)]
    fn put_finder_pattern(&mut self) {
        for i in 0..7 {
            for j in 0..7 {
                let dark = i == 0 || i == 6 || j == 0 || j == 6;
                self.set(j, i, dark);
            }
        }
        for i in 0..3 {
            for j in 0..3 {
                self.set(2 + j, 2 + i, true);
            }
        }
        // Separators.
        for n in 0..8 {
            if n < self.height {
                self.set(7, n, false);
            }
            if self.height >= 9 {
                self.set(n, 7, false);
            }
        }
    }

    /// Reduced 5×5 finder sub-pattern in the bottom-right corner.
    #[tracing::instrument(skip_all)]
    fn put_finder_sub_pattern(&mut self) {
        for i in 0..5 {
            for j in 0..5 {
                let dark = i == 0 || i == 4 || j == 0 || j == 4;
                self.set(self.width - j - 1, self.height - i - 1, dark);
            }
        }
        self.set(self.width - 3, self.height - 3, true);
    }

    /// Small corner finders at the bottom-left and top-right.
    #[tracing::instrument(skip_all)]
    fn put_corner_finder_pattern(&mut self) {
        // Bottom left.
        self.set(0, self.height - 1, true);
        self.set(1, self.height - 1, true);
        self.set(2, self.height - 1, true);
        if self.height >= 11 {
            self.set(0, self.height - 2, true);
            self.set(1, self.height - 2, false);
        }
        // Top right.
        self.set(self.width - 1, 0, true);
        self.set(self.width - 2, 0, true);
        self.set(self.width - 1, 1, true);
        self.set(self.width - 2, 1, false);
    }

    /// 3×3 alignment patterns straddling the top and bottom edges.
    #[tracing::instrument(skip_all)]
    fn put_alignment_patterns(&mut self) {
        for &center_x in alignment_columns(self.width) {
            for i in 0..3usize {
                for j in 0..3usize {
                    let dark = i == 0 || i == 2 || j == 0 || j == 2;
                    let x = center_x + j - 1;
                    self.set(x, i, dark); // top
                    self.set(x, self.height - 1 - i, dark); // bottom
                }
            }
        }
    }

    /// Timing patterns along the top/bottom rows and the alignment columns.
    #[tracing::instrument(skip_all)]
    fn put_timing_patterns(&mut self) {
        // Horizontal (top and bottom rows).
        for j in 0..self.width {
            let dark = (j + 1) % 2 == 1;
            for i in [0, self.height - 1] {
                if self.modules[i][j] == UNDEFINED {
                    self.set(j, i, dark);
                }
            }
        }
        // Vertical (left/right edges and each alignment column).
        let mut columns = vec![0usize, self.width - 1];
        columns.extend_from_slice(alignment_columns(self.width));
        for i in 0..self.height {
            let dark = (i + 1) % 2 == 1;
            for &j in &columns {
                if self.modules[i][j] == UNDEFINED {
                    self.set(j, i, dark);
                }
            }
        }
    }

    /// Write the 18-bit format information into both finder regions, each with
    /// its own XOR mask (ISO/IEC 23941 §7.9).
    #[tracing::instrument(skip_all)]
    pub fn put_format_information(&mut self, format_information: u32) {
        // Finder-pattern side (mask 0b011111101010110010).
        let fi = format_information ^ 0b011111101010110010;
        let (si, sj) = (1usize, 8usize);
        for n in 0..18 {
            let di = n % 5;
            let dj = n / 5;
            self.set(sj + dj, si + di, (fi >> n) & 1 != 0);
        }

        // Finder-sub-pattern side (mask 0b100000101001111011).
        let fi = format_information ^ 0b100000101001111011;
        let (si, sj) = (self.height - 1 - 5, self.width - 1 - 7);
        for n in 0..15 {
            let di = n % 5;
            let dj = n / 5;
            self.set(sj + dj, si + di, (fi >> n) & 1 != 0);
        }
        self.set(self.width - 1 - 4, self.height - 1 - 5, (fi >> 15) & 1 != 0);
        self.set(self.width - 1 - 3, self.height - 1 - 5, (fi >> 16) & 1 != 0);
        self.set(self.width - 1 - 2, self.height - 1 - 5, (fi >> 17) & 1 != 0);
    }

    /// Place the final message bit stream (data + error correction, most
    /// significant bit first) plus any remainder bits, then apply the fixed
    /// mask. Returns the completed module matrix.
    #[tracing::instrument(skip_all)]
    pub fn put_data(mut self, bits: &[u8], remainder_bits: usize) -> Vec<Vec<bool>> {
        self.place_bits(bits, remainder_bits);
        self.apply_mask();
        self.modules
            .iter()
            .map(|row| row.iter().map(|&m| m == 1).collect())
            .collect()
    }

    /// Boustrophedon placement in two-module columns, from the bottom-right
    /// upward, skipping any function module already set.
    #[tracing::instrument(skip_all)]
    fn place_bits(&mut self, bits: &[u8], remainder_bits: usize) {
        let mut dy: i32 = -1; // up
        let mut idx = 0usize;
        let mut cx = self.width as i32 - 2;
        let mut cy = self.height as i32 - 6;
        let mut remaining = remainder_bits;

        loop {
            for x in [cx, cx - 1] {
                let (xu, yu) = (x as usize, cy as usize);
                if self.modules[yu][xu] == UNDEFINED {
                    if idx == bits.len() {
                        // Remainder bit (light).
                        self.set(xu, yu, false);
                        self.data_area[yu][xu] = true;
                        remaining = remaining.saturating_sub(1);
                    } else {
                        self.set(xu, yu, bits[idx] == 1);
                        self.data_area[yu][xu] = true;
                        idx += 1;
                    }
                    if idx == bits.len() && remaining == 0 {
                        break;
                    }
                }
            }
            if idx == bits.len() && remaining == 0 {
                break;
            }
            if dy < 0 && cy == 1 {
                cx -= 2;
                dy = 1;
            } else if dy > 0 && cy == self.height as i32 - 2 {
                cx -= 2;
                dy = -1;
            } else {
                cy += dy;
            }
        }
    }

    #[tracing::instrument(skip_all)]
    fn apply_mask(&mut self) {
        for y in 0..self.height {
            for x in 0..self.width {
                if self.data_area[y][x] && mask_condition(x as i32, y as i32) {
                    self.modules[y][x] ^= 1;
                }
            }
        }
    }
}
