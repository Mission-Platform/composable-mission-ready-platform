//! The QR matrix builder: draws the function patterns, lays out the data
//! codewords, applies each of the eight data masks and keeps the lowest-penalty
//! one. Ported from the AssemblyScript reference (ISO/IEC 18004).

use crate::gf::add_ecc_and_interleave;
use crate::tables::ECC_FORMAT_BITS;

/// Whether data mask `mask` inverts module `(x, y)`.
#[tracing::instrument(skip_all)]
pub fn mask_condition(mask: i32, x: i32, y: i32) -> bool {
    match mask {
        0 => (x + y) % 2 == 0,
        1 => y % 2 == 0,
        2 => x % 3 == 0,
        3 => (x + y) % 3 == 0,
        4 => (x / 3 + y / 2) % 2 == 0,
        5 => (x * y) % 2 + (x * y) % 3 == 0,
        6 => ((x * y) % 2 + (x * y) % 3) % 2 == 0,
        7 => ((x + y) % 2 + (x * y) % 3) % 2 == 0,
        _ => false,
    }
}

#[tracing::instrument(skip_all)]
fn get_bit(x: i32, index: i32) -> bool {
    ((x >> index) & 1) != 0
}

#[derive(Debug)]
pub struct QrBuilder {
    pub size: i32,
    pub modules: Vec<Vec<bool>>,
    version: i32,
    ecc: i32,
    is_function: Vec<Vec<bool>>,
}

impl QrBuilder {
    #[tracing::instrument(skip_all)]
    pub fn new(version: i32, ecc: i32) -> Self {
        let size = version * 4 + 17;
        QrBuilder {
            size,
            modules: vec![vec![false; size as usize]; size as usize],
            version,
            ecc,
            is_function: vec![vec![false; size as usize]; size as usize],
        }
    }

    #[tracing::instrument(skip_all)]
    pub fn build(&mut self, data_codewords: &[i32]) {
        self.draw_function_patterns();
        let all_codewords = add_ecc_and_interleave(data_codewords, self.version, self.ecc);
        self.draw_codewords(&all_codewords);

        let mut min_penalty = i32::MAX;
        let mut best_mask = 0;
        for mask in 0..8 {
            self.apply_mask(mask);
            self.draw_format_bits(mask);
            let penalty = self.penalty_score();
            if penalty < min_penalty {
                min_penalty = penalty;
                best_mask = mask;
            }
            self.apply_mask(mask); // Undo (XOR is its own inverse).
        }
        self.apply_mask(best_mask);
        self.draw_format_bits(best_mask);
    }

    /// The `is_function` map for a version (which modules are function
    /// patterns, hence not data). Used by the decoder to walk the data modules
    /// in the same zig-zag order the encoder wrote them.
    #[tracing::instrument(skip_all)]
    pub fn function_map(version: i32) -> Vec<Vec<bool>> {
        let mut builder = QrBuilder::new(version, 0);
        builder.draw_function_patterns();
        builder.is_function
    }

    #[tracing::instrument(skip_all)]
    fn set_function_module(&mut self, x: i32, y: i32, is_dark: bool) {
        self.modules[y as usize][x as usize] = is_dark;
        self.is_function[y as usize][x as usize] = true;
    }

    #[tracing::instrument(skip_all)]
    fn draw_function_patterns(&mut self) {
        for index in 0..self.size {
            self.set_function_module(6, index, index % 2 == 0);
            self.set_function_module(index, 6, index % 2 == 0);
        }

        self.draw_finder_pattern(3, 3);
        self.draw_finder_pattern(self.size - 4, 3);
        self.draw_finder_pattern(3, self.size - 4);

        let align_positions = self.alignment_pattern_positions();
        let number_align = align_positions.len();
        for index in 0..number_align {
            for index2 in 0..number_align {
                if !((index == 0 && index2 == 0)
                    || (index == 0 && index2 == number_align - 1)
                    || (index == number_align - 1 && index2 == 0))
                {
                    self.draw_alignment_pattern(align_positions[index], align_positions[index2]);
                }
            }
        }

        self.draw_format_bits(0);
        self.draw_version();
    }

    #[tracing::instrument(skip_all)]
    fn draw_finder_pattern(&mut self, x: i32, y: i32) {
        for dy in -4i32..=4 {
            for dx in -4i32..=4 {
                let distribution = dx.abs().max(dy.abs());
                let xx = x + dx;
                let yy = y + dy;
                if xx >= 0 && xx < self.size && yy >= 0 && yy < self.size {
                    self.set_function_module(xx, yy, distribution != 2 && distribution != 4);
                }
            }
        }
    }

    #[tracing::instrument(skip_all)]
    fn draw_alignment_pattern(&mut self, x: i32, y: i32) {
        for dy in -2i32..=2 {
            for dx in -2i32..=2 {
                self.set_function_module(x + dx, y + dy, dx.abs().max(dy.abs()) != 1);
            }
        }
    }

    #[tracing::instrument(skip_all)]
    fn alignment_pattern_positions(&self) -> Vec<i32> {
        let mut result: Vec<i32> = Vec::new();
        if self.version == 1 {
            return result;
        }
        let number_align = self.version / 7 + 2;
        let step = ((self.version * 8 + number_align * 3 + 5) / (number_align * 4 - 4)) * 2;
        result.push(6);
        let mut descending: Vec<i32> = Vec::new();
        let mut pos = self.size - 7;
        while (result.len() + descending.len()) < number_align as usize {
            descending.push(pos);
            pos -= step;
        }
        for index in (0..descending.len()).rev() {
            result.push(descending[index]);
        }
        result
    }

    #[tracing::instrument(skip_all)]
    fn draw_format_bits(&mut self, mask: i32) {
        let data = (ECC_FORMAT_BITS[self.ecc as usize] << 3) | mask;
        let mut rem = data;
        for _ in 0..10 {
            rem = (rem << 1) ^ (((rem >> 9) & 1) * 0x537);
        }
        let bits = ((data << 10) | rem) ^ 0x5412;

        for index in 0..=5 {
            self.set_function_module(8, index, get_bit(bits, index));
        }
        self.set_function_module(8, 7, get_bit(bits, 6));
        self.set_function_module(8, 8, get_bit(bits, 7));
        self.set_function_module(7, 8, get_bit(bits, 8));
        for index in 9..15 {
            self.set_function_module(14 - index, 8, get_bit(bits, index));
        }

        for index in 0..8 {
            self.set_function_module(self.size - 1 - index, 8, get_bit(bits, index));
        }
        for index in 8..15 {
            self.set_function_module(8, self.size - 15 + index, get_bit(bits, index));
        }
        self.set_function_module(8, self.size - 8, true);
    }

    #[tracing::instrument(skip_all)]
    fn draw_version(&mut self) {
        if self.version < 7 {
            return;
        }
        let mut rem = self.version;
        for _ in 0..12 {
            rem = (rem << 1) ^ (((rem >> 11) & 1) * 0x1f25);
        }
        let bits = (self.version << 12) | rem;
        for index in 0..18 {
            let bit = get_bit(bits, index);
            let a = self.size - 11 + (index % 3);
            let b = index / 3;
            self.set_function_module(a, b, bit);
            self.set_function_module(b, a, bit);
        }
    }

    #[tracing::instrument(skip_all)]
    fn draw_codewords(&mut self, data: &[i32]) {
        let mut index = 0usize;
        let mut right = self.size - 1;
        while right >= 1 {
            if right == 6 {
                right = 5;
            }
            for vert in 0..self.size {
                for index2 in 0..2 {
                    let x = right - index2;
                    let upward = ((right + 1) & 2) == 0;
                    let y = if upward { self.size - 1 - vert } else { vert };
                    if !self.is_function[y as usize][x as usize] && index < data.len() * 8 {
                        self.modules[y as usize][x as usize] =
                            get_bit(data[index >> 3], 7 - (index as i32 & 7));
                        index += 1;
                    }
                }
            }
            right -= 2;
        }
    }

    #[tracing::instrument(skip_all)]
    fn apply_mask(&mut self, mask: i32) {
        for y in 0..self.size {
            for x in 0..self.size {
                if self.is_function[y as usize][x as usize] {
                    continue;
                }
                if mask_condition(mask, x, y) {
                    self.modules[y as usize][x as usize] = !self.modules[y as usize][x as usize];
                }
            }
        }
    }

    #[tracing::instrument(skip_all)]
    fn penalty_score(&self) -> i32 {
        let mut result = 0i32;
        let size = self.size;
        let modules = &self.modules;

        for y in 0..size {
            let mut run_color = false;
            let mut run_x = 0;
            let mut run_history = [0i32; 7];
            for x in 0..size {
                if modules[y as usize][x as usize] == run_color {
                    run_x += 1;
                    if run_x == 5 {
                        result += 3;
                    } else if run_x > 5 {
                        result += 1;
                    }
                } else {
                    self.finder_penalty_add_history(run_x, &mut run_history);
                    if !run_color {
                        result += self.finder_penalty_count_patterns(&run_history) * 40;
                    }
                    run_color = modules[y as usize][x as usize];
                    run_x = 1;
                }
            }
            result +=
                self.finder_penalty_terminate_and_count(run_color, run_x, &mut run_history) * 40;
        }
        for x in 0..size {
            let mut run_color = false;
            let mut run_y = 0;
            let mut run_history = [0i32; 7];
            for y in 0..size {
                if modules[y as usize][x as usize] == run_color {
                    run_y += 1;
                    if run_y == 5 {
                        result += 3;
                    } else if run_y > 5 {
                        result += 1;
                    }
                } else {
                    self.finder_penalty_add_history(run_y, &mut run_history);
                    if !run_color {
                        result += self.finder_penalty_count_patterns(&run_history) * 40;
                    }
                    run_color = modules[y as usize][x as usize];
                    run_y = 1;
                }
            }
            result +=
                self.finder_penalty_terminate_and_count(run_color, run_y, &mut run_history) * 40;
        }

        for y in 0..size - 1 {
            for x in 0..size - 1 {
                let color = modules[y as usize][x as usize];
                if color == modules[y as usize][(x + 1) as usize]
                    && color == modules[(y + 1) as usize][x as usize]
                    && color == modules[(y + 1) as usize][(x + 1) as usize]
                {
                    result += 3;
                }
            }
        }

        let mut dark = 0i32;
        for y in 0..size {
            for x in 0..size {
                if modules[y as usize][x as usize] {
                    dark += 1;
                }
            }
        }
        let total = size * size;
        let k = (((dark * 20 - total * 10).abs() as f64) / (total as f64)).ceil() as i32 - 1;
        result += k * 10;
        result
    }

    #[tracing::instrument(skip_all)]
    fn finder_penalty_count_patterns(&self, run_history: &[i32; 7]) -> i32 {
        let n = run_history[1];
        let core = n > 0
            && run_history[2] == n
            && run_history[3] == n * 3
            && run_history[4] == n
            && run_history[5] == n;
        (if core && run_history[0] >= n * 4 && run_history[6] >= n {
            1
        } else {
            0
        }) + (if core && run_history[6] >= n * 4 && run_history[0] >= n {
            1
        } else {
            0
        })
    }

    #[tracing::instrument(skip_all)]
    fn finder_penalty_terminate_and_count(
        &self,
        current_color: bool,
        current_run: i32,
        run_history: &mut [i32; 7],
    ) -> i32 {
        let mut run = current_run;
        if current_color {
            self.finder_penalty_add_history(run, run_history);
            run = 0;
        }
        run += self.size;
        self.finder_penalty_add_history(run, run_history);
        self.finder_penalty_count_patterns(run_history)
    }

    #[tracing::instrument(skip_all)]
    fn finder_penalty_add_history(&self, current_run_length: i32, run_history: &mut [i32; 7]) {
        let mut length = current_run_length;
        if run_history[0] == 0 {
            length += self.size; // Add light border to first run.
        }
        // pop() + unshift(length): shift everything right, drop the last.
        for i in (1..7).rev() {
            run_history[i] = run_history[i - 1];
        }
        run_history[0] = length;
    }
}
