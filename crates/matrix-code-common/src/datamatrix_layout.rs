//! Shared Data Matrix data-region layout maths, used by both the encoder and
//! the decoder so their coordinate mapping stays in lock-step.
//!
//! A Data Matrix symbol is a grid of one or more identical *data regions*, each
//! wrapped in a two-module finder / timing border (a solid "L" on the left and
//! bottom edges, an alternating timing pattern on the top and right edges). The
//! ECC 200 module-placement algorithm runs over the *mapping matrix* — the data
//! regions logically concatenated with their borders removed — so both crates
//! need to translate a mapping-matrix cell into a full-symbol pixel, and back.
//!
//! Square symbols (10×10 … 26×26) are a single-region special case; the
//! rectangular symbols (8×18 … 16×48) place two regions side by side for the
//! wider sizes. Keeping the translation here guarantees the encoder's renderer
//! and the decoder's extractor agree exactly.

/// The data-region geometry of a Data Matrix symbol.
#[derive(Debug, Clone, Copy)]
pub struct Layout {
    /// Height of one data region, in modules (excludes the border).
    pub region_rows: usize,
    /// Width of one data region, in modules (excludes the border).
    pub region_cols: usize,
    /// Number of data regions stacked vertically.
    pub grid_rows: usize,
    /// Number of data regions placed horizontally.
    pub grid_cols: usize,
}

impl Layout {
    /// The full symbol height in modules (data regions + their borders).
    #[tracing::instrument(skip_all)]
    pub fn height(&self) -> usize {
        self.grid_rows * (self.region_rows + 2)
    }

    /// The full symbol width in modules (data regions + their borders).
    #[tracing::instrument(skip_all)]
    pub fn width(&self) -> usize {
        self.grid_cols * (self.region_cols + 2)
    }

    /// The mapping-matrix height (all data-region rows concatenated).
    #[tracing::instrument(skip_all)]
    pub fn mapping_rows(&self) -> usize {
        self.grid_rows * self.region_rows
    }

    /// The mapping-matrix width (all data-region columns concatenated).
    #[tracing::instrument(skip_all)]
    pub fn mapping_cols(&self) -> usize {
        self.grid_cols * self.region_cols
    }

    /// Translate a mapping-matrix cell `(mapping_row, mapping_col)` into the
    /// `(x, y)` pixel of the full symbol it occupies, skipping the finder /
    /// timing borders around each region.
    #[tracing::instrument(skip_all)]
    pub fn cell(&self, mapping_row: usize, mapping_col: usize) -> (usize, usize) {
        let region_row = mapping_row / self.region_rows;
        let inner_row = mapping_row % self.region_rows;
        let region_col = mapping_col / self.region_cols;
        let inner_col = mapping_col % self.region_cols;
        let y = region_row * (self.region_rows + 2) + 1 + inner_row;
        let x = region_col * (self.region_cols + 2) + 1 + inner_col;
        (x, y)
    }
}

#[cfg(test)]
mod tests {
    use super::Layout;

    #[test]
    fn single_region_dimensions_and_cells() {
        // A 12×26 rectangular symbol: one 10×24 region.
        let layout = Layout {
            region_rows: 10,
            region_cols: 24,
            grid_rows: 1,
            grid_cols: 1,
        };
        assert_eq!(layout.height(), 12);
        assert_eq!(layout.width(), 26);
        assert_eq!(layout.mapping_rows(), 10);
        assert_eq!(layout.mapping_cols(), 24);
        // Top-left mapping cell sits just inside the top/left border.
        assert_eq!(layout.cell(0, 0), (1, 1));
        // Bottom-right mapping cell sits just inside the bottom/right border.
        assert_eq!(layout.cell(9, 23), (24, 10));
    }

    #[test]
    fn two_regions_side_by_side() {
        // An 8×32 rectangular symbol: two 6×14 regions horizontally.
        let layout = Layout {
            region_rows: 6,
            region_cols: 14,
            grid_rows: 1,
            grid_cols: 2,
        };
        assert_eq!(layout.width(), 32);
        assert_eq!(layout.height(), 8);
        assert_eq!(layout.mapping_cols(), 28);
        // Last column of the first region.
        assert_eq!(layout.cell(0, 13), (14, 1));
        // First column of the second region jumps past its border (right timing
        // of region 1 + left finder of region 2).
        assert_eq!(layout.cell(0, 14), (17, 1));
    }
}
