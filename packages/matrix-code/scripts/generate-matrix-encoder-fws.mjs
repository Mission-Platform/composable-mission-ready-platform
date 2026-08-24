/**
 * Generates packages/matrix-code/src/fws/matrix-encoder.fws
 *
 * FWS constraints handled here:
 * - no parentheses in expressions (use temps)
 * - no bitwise ops (arithmetic bit helpers)
 * - no hex literals (decimal only)
 * - strings used as byte and bit buffers
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = join(root, 'src/fws/matrix-encoder.fws');

function makeFieldTables(primitive, size) {
  const order = size - 1;
  const exp = new Array(order * 2).fill(0);
  const log = new Array(size).fill(0);
  let value = 1;
  for (let power = 0; power < order; power += 1) {
    exp[power] = value;
    log[value] = power;
    value *= 2;
    if (value >= size) value ^= primitive;
  }
  for (let power = order; power < exp.length; power += 1) exp[power] = exp[power - order];
  return { exp, log };
}

function decimalBytes(values) {
  return values.map((value) => value.toString().padStart(3, '0')).join('');
}

const gf16 = makeFieldTables(19, 16);
const gf64 = makeFieldTables(67, 64);
const gf256 = makeFieldTables(301, 256);

const DATA_MATRIX_INTERNAL_REGIONS = [8, 10, 12, 14, 16, 18, 20, 22, 24];
const DATA_MATRIX_RECTANGULAR_INTERNAL_REGIONS = [
  [6, 16],
  [6, 28],
  [10, 24],
  [10, 32],
  [14, 32],
  [14, 44],
];

function createDataMatrixPlacementMap(rows, cols) {
  const filled = new Array(rows * cols).fill(false);
  const map = new Array(rows * cols).fill(999);
  const hasBit = (column, row) => filled[row * cols + column];
  const module = (rawRow, rawColumn, position, bit) => {
    let row = rawRow;
    let column = rawColumn;
    if (row < 0) {
      row += rows;
      column += 4 - ((rows + 4) % 8);
    }
    if (column < 0) {
      column += cols;
      row += 4 - ((cols + 4) % 8);
    }
    filled[row * cols + column] = true;
    map[row * cols + column] = position * 8 + (bit - 1);
  };
  const utah = (row, column, position) => {
    module(row - 2, column - 2, position, 1);
    module(row - 2, column - 1, position, 2);
    module(row - 1, column - 2, position, 3);
    module(row - 1, column - 1, position, 4);
    module(row - 1, column, position, 5);
    module(row, column - 2, position, 6);
    module(row, column - 1, position, 7);
    module(row, column, position, 8);
  };
  const corner = (kind, position) => {
    if (kind === 1) {
      module(rows - 1, 0, position, 1);
      module(rows - 1, 1, position, 2);
      module(rows - 1, 2, position, 3);
      module(0, cols - 2, position, 4);
      module(0, cols - 1, position, 5);
      module(1, cols - 1, position, 6);
      module(2, cols - 1, position, 7);
      module(3, cols - 1, position, 8);
      return;
    }
    if (kind === 2) {
      module(rows - 3, 0, position, 1);
      module(rows - 2, 0, position, 2);
      module(rows - 1, 0, position, 3);
      module(0, cols - 4, position, 4);
      module(0, cols - 3, position, 5);
      module(0, cols - 2, position, 6);
      module(0, cols - 1, position, 7);
      module(1, cols - 1, position, 8);
      return;
    }
    if (kind === 3) {
      module(rows - 3, 0, position, 1);
      module(rows - 2, 0, position, 2);
      module(rows - 1, 0, position, 3);
      module(0, cols - 2, position, 4);
      module(0, cols - 1, position, 5);
      module(1, cols - 1, position, 6);
      module(2, cols - 1, position, 7);
      module(3, cols - 1, position, 8);
      return;
    }
    module(rows - 1, 0, position, 1);
    module(rows - 1, cols - 1, position, 2);
    module(0, cols - 3, position, 3);
    module(0, cols - 2, position, 4);
    module(0, cols - 1, position, 5);
    module(1, cols - 3, position, 6);
    module(1, cols - 2, position, 7);
    module(1, cols - 1, position, 8);
  };

  let position = 0;
  let row = 4;
  let column = 0;
  while (true) {
    if (row === rows && column === 0) {
      corner(1, position);
      position += 1;
    }
    if (row === rows - 2 && column === 0 && cols % 4 !== 0) {
      corner(2, position);
      position += 1;
    }
    if (row === rows - 2 && column === 0 && cols % 8 === 4) {
      corner(3, position);
      position += 1;
    }
    if (row === rows + 4 && column === 2 && cols % 8 === 0) {
      corner(4, position);
      position += 1;
    }
    while (true) {
      if (row < rows && column >= 0 && !hasBit(column, row)) {
        utah(row, column, position);
        position += 1;
      }
      row -= 2;
      column += 2;
      if (row < 0 || column >= cols) break;
    }
    row += 1;
    column += 3;
    while (true) {
      if (row >= 0 && column < cols && !hasBit(column, row)) {
        utah(row, column, position);
        position += 1;
      }
      row += 2;
      column -= 2;
      if (row >= rows || column < 0) break;
    }
    row += 3;
    column += 1;
    if (row >= rows && column >= cols) break;
  }
  return map;
}

function emitDataMatrixPlacementMaps() {
  const maps = [
    ...DATA_MATRIX_INTERNAL_REGIONS.map((region) => ({ rows: region, cols: region })),
    ...DATA_MATRIX_RECTANGULAR_INTERNAL_REGIONS.map(([rows, cols]) => ({ rows, cols })),
  ];
  const cases = maps
    .map(({ rows, cols }) => {
      const map = createDataMatrixPlacementMap(rows, cols);
      return `  if rows == ${rows} && cols == ${cols} { return "${decimalBytes(map)}"; }`;
    })
    .join('\n');
  return `fn dm_placement_map(rows: i32, cols: i32) -> string {
${cases}
  return "";
}

fn dm_place_precomputed(codewords: string, rows: i32, cols: i32) -> string {
  let total: i32 = rows * cols;
  let bits: string = bits_zeros(total);
  let map: string = dm_placement_map(rows, cols);
  let cell: i32 = 0;
  while cell < total {
    let bit_position: i32 = bytes_get(map, cell);
    if bit_position != 999 {
      let cw_index: i32 = bit_position / 8;
      let bit_offset: i32 = bit_position - cw_index * 8;
      let cw: i32 = bytes_get(codewords, cw_index);
      bits = bits_set(bits, cell, bit_test(cw, 7 - bit_offset));
    }
    cell = cell + 1;
  }
  let last: i32 = total - 1;
  if bytes_get(map, last) == 999 {
    bits = bits_set(bits, last, true);
    bits = bits_set(bits, total - cols - 2, true);
  }
  return bits;
}`;
}

const source = `// Matrix encoder graph (Data Matrix square/GS1/rectangular + compact Aztec).
// Generated by scripts/generate-matrix-encoder-fws.mjs — do not hand-edit lightly.
//
// ABI: encode_matrix(symbologyId, data) -> packed string "width,height," + module bits
// where module bits are '0'/'1' characters. Empty string means invalid payload.
// Symbology ids: 0=datamatrix, 1=gs1datamatrix, 2=datamatrixrectangular, 3=aztec.


fn bit_char(on: bool) -> string {
  if on { return "1"; }
  return "0";
}

fn digit_char(value: i32) -> string {
  if value == 0 { return "0"; }
  if value == 1 { return "1"; }
  if value == 2 { return "2"; }
  if value == 3 { return "3"; }
  if value == 4 { return "4"; }
  if value == 5 { return "5"; }
  if value == 6 { return "6"; }
  if value == 7 { return "7"; }
  if value == 8 { return "8"; }
  return "9";
}

fn itoa_rec(value: i32, acc: string) -> string {
  if value < 10 {
    return string_concat(digit_char(value), acc);
  }
  let q: i32 = value / 10;
  let r: i32 = value - q * 10;
  return itoa_rec(q, string_concat(digit_char(r), acc));
}

fn itoa(value: i32) -> string {
  if value == 0 { return "0"; }
  return itoa_rec(value, "");
}

fn low_bit(value: i32) -> i32 {
  return value - value / 2 * 2;
}

fn xor_bits(a: i32, b: i32, width: i32) -> i32 {
  let result: i32 = 0;
  let place: i32 = 1;
  let x: i32 = a;
  let y: i32 = b;
  let i: i32 = 0;
  while i < width {
    let xb: i32 = low_bit(x);
    let yb: i32 = low_bit(y);
    let rb: i32 = xb + yb - 2 * xb * yb;
    result = result + rb * place;
    place = place * 2;
    x = x / 2;
    y = y / 2;
    i = i + 1;
  }
  return result;
}

fn xor8(a: i32, b: i32) -> i32 {
  return xor_bits(a, b, 8);
}

fn xor16(a: i32, b: i32) -> i32 {
  return xor_bits(a, b, 16);
}

fn pow2(n: i32) -> i32 {
  let result: i32 = 1;
  let i: i32 = 0;
  while i < n {
    result = result * 2;
    i = i + 1;
  }
  return result;
}

fn bit_test(value: i32, shift: i32) -> bool {
  let denom: i32 = pow2(shift);
  let shifted: i32 = value / denom;
  return low_bit(shifted) == 1;
}

fn byte_char3(value: i32) -> string {
  let v: i32 = value;
  if v < 0 { v = 0; }
  if v > 255 { v = 255; }
  let digits: string = itoa(v);
  if v < 10 { return string_concat("00", digits); }
  if v < 100 { return string_concat("0", digits); }
  return digits;
}

fn bytes_get(data: string, index: i32) -> i32 {
  let i: i32 = index * 3;
  if i < 0 { return 0; }
  if i + 2 >= string_length(data) { return 0; }
  let h: i32 = string_byte_at(data, i) - 48;
  let t: i32 = string_byte_at(data, i + 1) - 48;
  let o: i32 = string_byte_at(data, i + 2) - 48;
  return h * 100 + t * 10 + o;
}

fn bytes_set(data: string, index: i32, value: i32) -> string {
  let i: i32 = index * 3;
  let left: string = string_slice(data, 0, i);
  let right: string = string_slice(data, i + 3, string_length(data));
  return string_concat(string_concat(left, byte_char3(value)), right);
}

fn bytes_push(data: string, value: i32) -> string {
  return string_concat(data, byte_char3(value));
}

fn bytes_zeros(count: i32) -> string {
  let out: string = "";
  let i: i32 = 0;
  while i < count {
    out = string_concat(out, "000");
    i = i + 1;
  }
  return out;
}

fn bits_get(data: string, index: i32) -> bool {
  if index < 0 { return false; }
  if index >= string_length(data) { return false; }
  return string_byte_at(data, index) == 49;
}

fn bits_get_pad_one(data: string, index: i32) -> bool {
  if index < 0 { return true; }
  if index >= string_length(data) { return true; }
  return string_byte_at(data, index) == 49;
}

fn bits_set(data: string, index: i32, on: bool) -> string {
  let left: string = string_slice(data, 0, index);
  let right: string = string_slice(data, index + 1, string_length(data));
  return string_concat(string_concat(left, bit_char(on)), right);
}

fn bits_push(data: string, on: bool) -> string {
  return string_concat(data, bit_char(on));
}

fn bits_zeros(count: i32) -> string {
  let out: string = "";
  let i: i32 = 0;
  while i < count {
    out = bits_push(out, false);
    i = i + 1;
  }
  return out;
}

fn bits_push_value(data: string, value: i32, count: i32) -> string {
  let out: string = data;
  let shift: i32 = count - 1;
  while shift >= 0 {
    out = bits_push(out, bit_test(value, shift));
    shift = shift - 1;
  }
  return out;
}

fn packed_result(width: i32, height: i32, modules: string) -> string {
  let head: string = string_concat(itoa(width), ",");
  let mid: string = string_concat(itoa(height), ",");
  return string_concat(string_concat(head, mid), modules);
}

// ---- Galois / Reed-Solomon -------------------------------------------------

// Static field tables avoid repeatedly rebuilding immutable byte strings at
// runtime. The selected matrix symbologies use only these three fields.
fn field_exp_table(primitive: i32, size: i32) -> string {
  if primitive == 19 && size == 16 { return "${decimalBytes(gf16.exp)}"; }
  if primitive == 67 && size == 64 { return "${decimalBytes(gf64.exp)}"; }
  if primitive == 301 && size == 256 { return "${decimalBytes(gf256.exp)}"; }
  return "";
}

fn field_log_table(primitive: i32, size: i32) -> string {
  if primitive == 19 && size == 16 { return "${decimalBytes(gf16.log)}"; }
  if primitive == 67 && size == 64 { return "${decimalBytes(gf64.log)}"; }
  if primitive == 301 && size == 256 { return "${decimalBytes(gf256.log)}"; }
  return "";
}

fn gf_mul(exp: string, log: string, a: i32, b: i32) -> i32 {
  if a == 0 { return 0; }
  if b == 0 { return 0; }
  let la: i32 = bytes_get(log, a);
  let lb: i32 = bytes_get(log, b);
  let sum: i32 = la + lb;
  return bytes_get(exp, sum);
}

// generator polynomial coefficients, highest degree first, as byte-string
fn rs_generator(exp: string, log: string, count: i32) -> string {
  let poly: string = bytes_push("", 1);
  let index: i32 = 0;
  while index < count {
    let root: i32 = bytes_get(exp, index + 1);
    let next: string = bytes_zeros(string_length(poly) / 3 + 1);
    let position: i32 = 0;
    while position < string_length(poly) / 3 {
      let coefficient: i32 = bytes_get(poly, position);
      let existing: i32 = bytes_get(next, position);
      next = bytes_set(next, position, xor16(existing, coefficient));
      let prod: i32 = gf_mul(exp, log, coefficient, root);
      let existing2: i32 = bytes_get(next, position + 1);
      next = bytes_set(next, position + 1, xor16(existing2, prod));
      position = position + 1;
    }
    poly = next;
    index = index + 1;
  }
  return poly;
}

// Compute \`count\` ECC symbols for data byte-string over the given field.
fn rs_ecc(data: string, count: i32, primitive: i32, size: i32) -> string {
  let exp: string = field_exp_table(primitive, size);
  let log: string = field_log_table(primitive, size);
  let generator: string = rs_generator(exp, log, count);
  let remainder: string = bytes_zeros(count);
  let di: i32 = 0;
  while di < string_length(data) / 3 {
    let symbol: i32 = bytes_get(data, di);
    let factor: i32 = xor16(symbol, bytes_get(remainder, 0));
    // shift remainder left by one (drop index 0, push 0)
    let shifted: string = string_slice(remainder, 3, string_length(remainder));
    remainder = string_concat(shifted, "000");
    if factor != 0 {
      let gi: i32 = 1;
      while gi < string_length(generator) / 3 {
        let coefficient: i32 = bytes_get(generator, gi);
        let prod: i32 = gf_mul(exp, log, coefficient, factor);
        let existing: i32 = bytes_get(remainder, gi - 1);
        remainder = bytes_set(remainder, gi - 1, xor16(existing, prod));
        gi = gi + 1;
      }
    }
    di = di + 1;
  }
  return remainder;
}

// ---- Data Matrix -----------------------------------------------------------

fn ascii_codewords(data: string) -> string {
  let out: string = "";
  let index: i32 = 0;
  let length: i32 = string_length(data);
  while index < length {
    let byte: i32 = string_byte_at(data, index);
    let next_index: i32 = index + 1;
    if byte >= 48 && byte <= 57 && next_index < length {
      let next_byte: i32 = string_byte_at(data, next_index);
      if next_byte >= 48 && next_byte <= 57 {
        let pair: i32 = byte - 48;
        pair = pair * 10 + next_byte - 48 + 130;
        out = bytes_push(out, pair);
        index = index + 2;
      } else {
        if byte < 128 {
          out = bytes_push(out, byte + 1);
          index = index + 1;
        } else {
          out = bytes_push(out, 235);
          out = bytes_push(out, byte - 128 + 1);
          index = index + 1;
        }
      }
    } else {
      if byte < 128 {
        out = bytes_push(out, byte + 1);
        index = index + 1;
      } else {
        out = bytes_push(out, 235);
        out = bytes_push(out, byte - 128 + 1);
        index = index + 1;
      }
    }
  }
  return out;
}

fn pad_pseudo_random(position: i32) -> i32 {
  // ISO/IEC 16022 253-state pad: ((149 * position) % 253) + 1
  // then the pad codeword is 129 + that value, wrapping above 254.
  let prod: i32 = 149 * position;
  let residual: i32 = prod % 253;
  return residual + 1;
}

fn pad_codeword_at(position: i32) -> i32 {
  let pseudo: i32 = pad_pseudo_random(position);
  let value: i32 = 129 + pseudo;
  if value > 254 {
    return value - 254;
  }
  return value;
}

fn pad_codewords(codewords: string, data_count: i32) -> string {
  let out: string = codewords;
  let count: i32 = string_length(out) / 3;
  if count >= data_count {
    return out;
  }
  // First pad is the EOD marker 129.
  out = bytes_push(out, 129);
  count = count + 1;
  // Remaining pads use ISO 253-state randomisation at 1-based positions.
  while count < data_count {
    let position: i32 = count + 1;
    let value: i32 = pad_codeword_at(position);
    out = bytes_push(out, value);
    count = count + 1;
  }
  return out;
}

fn dm_pad_and_ecc(codewords: string, data_count: i32, ecc_count: i32) -> string {
  let padded: string = pad_codewords(codewords, data_count);
  let ecc: string = rs_ecc(padded, ecc_count, 301, 256);
  return string_concat(padded, ecc);
}

// filled/bits grids are bit-strings of length rows*cols
fn dm_module_set(filled: string, bits: string, cols: i32, column: i32, row: i32, value: bool) -> string {
  // returns concatenated filled||bits updated — use parallel via two returns not possible,
  // so caller keeps them separate; this helper only updates one string.
  let index: i32 = row * cols + column;
  return bits_set(filled, index, true);
}

fn dm_has_bit(filled: string, cols: i32, column: i32, row: i32) -> bool {
  let index: i32 = row * cols + column;
  return bits_get(filled, index);
}

// Utah/corner placement implemented iteratively matching the TS/Rust algorithm.
fn dm_place(codewords: string, rows: i32, cols: i32) -> string {
  let total: i32 = rows * cols;
  let filled: string = bits_zeros(total);
  let bits: string = bits_zeros(total);

  // local helpers inlined via repeated patterns
  let position: i32 = 0;
  let row: i32 = 4;
  let column: i32 = 0;

  // We use a mutable-style loop with a work flag.
  let guard: i32 = 0;
  while guard < total * 4 {
    guard = guard + 1;

    // corner conditions before down-right diagonal
    if row == rows && column == 0 {
      // corner1
      let cw: i32 = bytes_get(codewords, position);
      // set 8 modules
      // (rows-1,0) bit1 ... see rust/ts
      let r1: i32 = rows - 1;
      let c1: i32 = 0;
      // helper macro-like expansions:
      filled = bits_set(filled, r1 * cols + c1, true);
      bits = bits_set(bits, r1 * cols + c1, bit_test(cw, 7));
      filled = bits_set(filled, r1 * cols + 1, true);
      bits = bits_set(bits, r1 * cols + 1, bit_test(cw, 6));
      filled = bits_set(filled, r1 * cols + 2, true);
      bits = bits_set(bits, r1 * cols + 2, bit_test(cw, 5));
      filled = bits_set(filled, 0 * cols + cols - 2, true);
      bits = bits_set(bits, 0 * cols + cols - 2, bit_test(cw, 4));
      filled = bits_set(filled, 0 * cols + cols - 1, true);
      bits = bits_set(bits, 0 * cols + cols - 1, bit_test(cw, 3));
      filled = bits_set(filled, 1 * cols + cols - 1, true);
      bits = bits_set(bits, 1 * cols + cols - 1, bit_test(cw, 2));
      filled = bits_set(filled, 2 * cols + cols - 1, true);
      bits = bits_set(bits, 2 * cols + cols - 1, bit_test(cw, 1));
      filled = bits_set(filled, 3 * cols + cols - 1, true);
      bits = bits_set(bits, 3 * cols + cols - 1, bit_test(cw, 0));
      position = position + 1;
    }

    let rows_minus_2: i32 = rows - 2;
    let cols_mod4: i32 = cols - cols / 4 * 4;
    if row == rows_minus_2 && column == 0 && cols_mod4 != 0 {
      let cw: i32 = bytes_get(codewords, position);
      filled = bits_set(filled, (rows - 3) * cols + 0, true);
      bits = bits_set(bits, (rows - 3) * cols + 0, bit_test(cw, 7));
      filled = bits_set(filled, (rows - 2) * cols + 0, true);
      bits = bits_set(bits, (rows - 2) * cols + 0, bit_test(cw, 6));
      filled = bits_set(filled, (rows - 1) * cols + 0, true);
      bits = bits_set(bits, (rows - 1) * cols + 0, bit_test(cw, 5));
      filled = bits_set(filled, 0 * cols + cols - 4, true);
      bits = bits_set(bits, 0 * cols + cols - 4, bit_test(cw, 4));
      filled = bits_set(filled, 0 * cols + cols - 3, true);
      bits = bits_set(bits, 0 * cols + cols - 3, bit_test(cw, 3));
      filled = bits_set(filled, 0 * cols + cols - 2, true);
      bits = bits_set(bits, 0 * cols + cols - 2, bit_test(cw, 2));
      filled = bits_set(filled, 0 * cols + cols - 1, true);
      bits = bits_set(bits, 0 * cols + cols - 1, bit_test(cw, 1));
      filled = bits_set(filled, 1 * cols + cols - 1, true);
      bits = bits_set(bits, 1 * cols + cols - 1, bit_test(cw, 0));
      position = position + 1;
    }

    let cols_mod8: i32 = cols - cols / 8 * 8;
    if row == rows_minus_2 && column == 0 && cols_mod8 == 4 {
      let cw: i32 = bytes_get(codewords, position);
      filled = bits_set(filled, (rows - 3) * cols + 0, true);
      bits = bits_set(bits, (rows - 3) * cols + 0, bit_test(cw, 7));
      filled = bits_set(filled, (rows - 2) * cols + 0, true);
      bits = bits_set(bits, (rows - 2) * cols + 0, bit_test(cw, 6));
      filled = bits_set(filled, (rows - 1) * cols + 0, true);
      bits = bits_set(bits, (rows - 1) * cols + 0, bit_test(cw, 5));
      filled = bits_set(filled, 0 * cols + cols - 2, true);
      bits = bits_set(bits, 0 * cols + cols - 2, bit_test(cw, 4));
      filled = bits_set(filled, 0 * cols + cols - 1, true);
      bits = bits_set(bits, 0 * cols + cols - 1, bit_test(cw, 3));
      filled = bits_set(filled, 1 * cols + cols - 1, true);
      bits = bits_set(bits, 1 * cols + cols - 1, bit_test(cw, 2));
      filled = bits_set(filled, 2 * cols + cols - 1, true);
      bits = bits_set(bits, 2 * cols + cols - 1, bit_test(cw, 1));
      filled = bits_set(filled, 3 * cols + cols - 1, true);
      bits = bits_set(bits, 3 * cols + cols - 1, bit_test(cw, 0));
      position = position + 1;
    }

    if row == rows + 4 && column == 2 && cols_mod8 == 0 {
      let cw: i32 = bytes_get(codewords, position);
      filled = bits_set(filled, (rows - 1) * cols + 0, true);
      bits = bits_set(bits, (rows - 1) * cols + 0, bit_test(cw, 7));
      filled = bits_set(filled, (rows - 1) * cols + cols - 1, true);
      bits = bits_set(bits, (rows - 1) * cols + cols - 1, bit_test(cw, 6));
      filled = bits_set(filled, 0 * cols + cols - 3, true);
      bits = bits_set(bits, 0 * cols + cols - 3, bit_test(cw, 5));
      filled = bits_set(filled, 0 * cols + cols - 2, true);
      bits = bits_set(bits, 0 * cols + cols - 2, bit_test(cw, 4));
      filled = bits_set(filled, 0 * cols + cols - 1, true);
      bits = bits_set(bits, 0 * cols + cols - 1, bit_test(cw, 3));
      filled = bits_set(filled, 1 * cols + cols - 3, true);
      bits = bits_set(bits, 1 * cols + cols - 3, bit_test(cw, 2));
      filled = bits_set(filled, 1 * cols + cols - 2, true);
      bits = bits_set(bits, 1 * cols + cols - 2, bit_test(cw, 1));
      filled = bits_set(filled, 1 * cols + cols - 1, true);
      bits = bits_set(bits, 1 * cols + cols - 1, bit_test(cw, 0));
      position = position + 1;
    }

    // up-right utah diagonal
    let walking: bool = true;
    while walking {
      if row < rows && column >= 0 {
        if dm_has_bit(filled, cols, column, row) == false {
          // utah at (row,column)
          let cw: i32 = bytes_get(codewords, position);
          // eight modules with wrap
          let places_r: string = ""; // unused marker
          // expand utah placements
          let rr: i32 = 0;
          let cc: i32 = 0;
          // bit 1: row-2,col-2
          rr = row - 2; cc = column - 2;
          if rr < 0 { rr = rr + rows; cc = cc + 4 - (rows + 4 - (rows + 4) / 8 * 8); }
          if cc < 0 { cc = cc + cols; rr = rr + 4 - (cols + 4 - (cols + 4) / 8 * 8); }
          filled = bits_set(filled, rr * cols + cc, true);
          bits = bits_set(bits, rr * cols + cc, bit_test(cw, 7));
          // bit2 row-2,col-1
          rr = row - 2; cc = column - 1;
          if rr < 0 { rr = rr + rows; cc = cc + 4 - (rows + 4 - (rows + 4) / 8 * 8); }
          if cc < 0 { cc = cc + cols; rr = rr + 4 - (cols + 4 - (cols + 4) / 8 * 8); }
          filled = bits_set(filled, rr * cols + cc, true);
          bits = bits_set(bits, rr * cols + cc, bit_test(cw, 6));
          // bit3 row-1,col-2
          rr = row - 1; cc = column - 2;
          if rr < 0 { rr = rr + rows; cc = cc + 4 - (rows + 4 - (rows + 4) / 8 * 8); }
          if cc < 0 { cc = cc + cols; rr = rr + 4 - (cols + 4 - (cols + 4) / 8 * 8); }
          filled = bits_set(filled, rr * cols + cc, true);
          bits = bits_set(bits, rr * cols + cc, bit_test(cw, 5));
          // bit4 row-1,col-1
          rr = row - 1; cc = column - 1;
          if rr < 0 { rr = rr + rows; cc = cc + 4 - (rows + 4 - (rows + 4) / 8 * 8); }
          if cc < 0 { cc = cc + cols; rr = rr + 4 - (cols + 4 - (cols + 4) / 8 * 8); }
          filled = bits_set(filled, rr * cols + cc, true);
          bits = bits_set(bits, rr * cols + cc, bit_test(cw, 4));
          // bit5 row-1,col
          rr = row - 1; cc = column;
          if rr < 0 { rr = rr + rows; cc = cc + 4 - (rows + 4 - (rows + 4) / 8 * 8); }
          if cc < 0 { cc = cc + cols; rr = rr + 4 - (cols + 4 - (cols + 4) / 8 * 8); }
          filled = bits_set(filled, rr * cols + cc, true);
          bits = bits_set(bits, rr * cols + cc, bit_test(cw, 3));
          // bit6 row,col-2
          rr = row; cc = column - 2;
          if rr < 0 { rr = rr + rows; cc = cc + 4 - (rows + 4 - (rows + 4) / 8 * 8); }
          if cc < 0 { cc = cc + cols; rr = rr + 4 - (cols + 4 - (cols + 4) / 8 * 8); }
          filled = bits_set(filled, rr * cols + cc, true);
          bits = bits_set(bits, rr * cols + cc, bit_test(cw, 2));
          // bit7 row,col-1
          rr = row; cc = column - 1;
          if rr < 0 { rr = rr + rows; cc = cc + 4 - (rows + 4 - (rows + 4) / 8 * 8); }
          if cc < 0 { cc = cc + cols; rr = rr + 4 - (cols + 4 - (cols + 4) / 8 * 8); }
          filled = bits_set(filled, rr * cols + cc, true);
          bits = bits_set(bits, rr * cols + cc, bit_test(cw, 1));
          // bit8 row,col
          rr = row; cc = column;
          if rr < 0 { rr = rr + rows; cc = cc + 4 - (rows + 4 - (rows + 4) / 8 * 8); }
          if cc < 0 { cc = cc + cols; rr = rr + 4 - (cols + 4 - (cols + 4) / 8 * 8); }
          filled = bits_set(filled, rr * cols + cc, true);
          bits = bits_set(bits, rr * cols + cc, bit_test(cw, 0));
          position = position + 1;
        }
      }
      row = row - 2;
      column = column + 2;
      if row < 0 { walking = false; }
      if column >= cols { walking = false; }
    }
    row = row + 1;
    column = column + 3;

    // down-left utah diagonal
    walking = true;
    while walking {
      if row >= 0 && column < cols {
        if dm_has_bit(filled, cols, column, row) == false {
          let cw: i32 = bytes_get(codewords, position);
          let rr: i32 = 0;
          let cc: i32 = 0;
          rr = row - 2; cc = column - 2;
          if rr < 0 { rr = rr + rows; cc = cc + 4 - (rows + 4 - (rows + 4) / 8 * 8); }
          if cc < 0 { cc = cc + cols; rr = rr + 4 - (cols + 4 - (cols + 4) / 8 * 8); }
          filled = bits_set(filled, rr * cols + cc, true);
          bits = bits_set(bits, rr * cols + cc, bit_test(cw, 7));
          rr = row - 2; cc = column - 1;
          if rr < 0 { rr = rr + rows; cc = cc + 4 - (rows + 4 - (rows + 4) / 8 * 8); }
          if cc < 0 { cc = cc + cols; rr = rr + 4 - (cols + 4 - (cols + 4) / 8 * 8); }
          filled = bits_set(filled, rr * cols + cc, true);
          bits = bits_set(bits, rr * cols + cc, bit_test(cw, 6));
          rr = row - 1; cc = column - 2;
          if rr < 0 { rr = rr + rows; cc = cc + 4 - (rows + 4 - (rows + 4) / 8 * 8); }
          if cc < 0 { cc = cc + cols; rr = rr + 4 - (cols + 4 - (cols + 4) / 8 * 8); }
          filled = bits_set(filled, rr * cols + cc, true);
          bits = bits_set(bits, rr * cols + cc, bit_test(cw, 5));
          rr = row - 1; cc = column - 1;
          if rr < 0 { rr = rr + rows; cc = cc + 4 - (rows + 4 - (rows + 4) / 8 * 8); }
          if cc < 0 { cc = cc + cols; rr = rr + 4 - (cols + 4 - (cols + 4) / 8 * 8); }
          filled = bits_set(filled, rr * cols + cc, true);
          bits = bits_set(bits, rr * cols + cc, bit_test(cw, 4));
          rr = row - 1; cc = column;
          if rr < 0 { rr = rr + rows; cc = cc + 4 - (rows + 4 - (rows + 4) / 8 * 8); }
          if cc < 0 { cc = cc + cols; rr = rr + 4 - (cols + 4 - (cols + 4) / 8 * 8); }
          filled = bits_set(filled, rr * cols + cc, true);
          bits = bits_set(bits, rr * cols + cc, bit_test(cw, 3));
          rr = row; cc = column - 2;
          if rr < 0 { rr = rr + rows; cc = cc + 4 - (rows + 4 - (rows + 4) / 8 * 8); }
          if cc < 0 { cc = cc + cols; rr = rr + 4 - (cols + 4 - (cols + 4) / 8 * 8); }
          filled = bits_set(filled, rr * cols + cc, true);
          bits = bits_set(bits, rr * cols + cc, bit_test(cw, 2));
          rr = row; cc = column - 1;
          if rr < 0 { rr = rr + rows; cc = cc + 4 - (rows + 4 - (rows + 4) / 8 * 8); }
          if cc < 0 { cc = cc + cols; rr = rr + 4 - (cols + 4 - (cols + 4) / 8 * 8); }
          filled = bits_set(filled, rr * cols + cc, true);
          bits = bits_set(bits, rr * cols + cc, bit_test(cw, 1));
          rr = row; cc = column;
          if rr < 0 { rr = rr + rows; cc = cc + 4 - (rows + 4 - (rows + 4) / 8 * 8); }
          if cc < 0 { cc = cc + cols; rr = rr + 4 - (cols + 4 - (cols + 4) / 8 * 8); }
          filled = bits_set(filled, rr * cols + cc, true);
          bits = bits_set(bits, rr * cols + cc, bit_test(cw, 0));
          position = position + 1;
        }
      }
      row = row + 2;
      column = column - 2;
      if row >= rows { walking = false; }
      if column < 0 { walking = false; }
    }
    row = row + 3;
    column = column + 1;
    if row >= rows && column >= cols {
      // done
      guard = total * 4;
    }
  }

  // fixed pattern lower-right if empty
  if dm_has_bit(filled, cols, cols - 1, rows - 1) == false {
    bits = bits_set(bits, (rows - 1) * cols + cols - 1, true);
    bits = bits_set(bits, (rows - 2) * cols + cols - 2, true);
  }
  return bits;
}

${emitDataMatrixPlacementMaps()}

fn dm_render(bits: string, region_rows: i32, region_cols: i32, grid_cols: i32) -> string {
  let width: i32 = grid_cols * (region_cols + 2);
  let height: i32 = region_rows + 2;
  let matrix: string = bits_zeros(width * height);
  let region: i32 = 0;
  while region < grid_cols {
    let x0: i32 = region * (region_cols + 2);
    let right: i32 = x0 + region_cols + 1;
    let y: i32 = 0;
    while y <= region_rows + 1 {
      matrix = bits_set(matrix, y * width + x0, true);
      let odd: bool = low_bit(y) == 1;
      matrix = bits_set(matrix, y * width + right, odd);
      y = y + 1;
    }
    let x: i32 = x0;
    while x <= right {
      let even: bool = low_bit(x - x0) == 0;
      matrix = bits_set(matrix, 0 * width + x, even);
      matrix = bits_set(matrix, (region_rows + 1) * width + x, true);
      x = x + 1;
    }
    region = region + 1;
  }
  let row: i32 = 0;
  while row < region_rows {
    let column: i32 = 0;
    let data_cols: i32 = region_cols * grid_cols;
    while column < data_cols {
      let reg: i32 = column / region_cols;
      let x: i32 = reg * (region_cols + 2) + 1 + (column - reg * region_cols);
      let on: bool = bits_get(bits, row * data_cols + column);
      matrix = bits_set(matrix, (row + 1) * width + x, on);
      column = column + 1;
    }
    row = row + 1;
  }
  return packed_result(width, height, matrix);
}

fn encode_datamatrix_square(data: string, gs1: bool) -> string {
  if string_length(data) == 0 { return ""; }
  let codewords: string = ascii_codewords(data);
  if gs1 {
    codewords = string_concat(byte_char3(232), codewords);
  }
  // symbol table: size,data,ecc
  // 10,3,5 / 12,5,7 / 14,8,10 / 16,12,12 / 18,18,14 / 20,22,18 / 22,30,20 / 24,36,24 / 26,44,28
  let size: i32 = 0;
  let data_count: i32 = 0;
  let ecc_count: i32 = 0;
  let cw_len: i32 = string_length(codewords) / 3;
  if cw_len <= 3 { size = 10; data_count = 3; ecc_count = 5; }
  else {
    if cw_len <= 5 { size = 12; data_count = 5; ecc_count = 7; }
    else {
      if cw_len <= 8 { size = 14; data_count = 8; ecc_count = 10; }
      else {
        if cw_len <= 12 { size = 16; data_count = 12; ecc_count = 12; }
        else {
          if cw_len <= 18 { size = 18; data_count = 18; ecc_count = 14; }
          else {
            if cw_len <= 22 { size = 20; data_count = 22; ecc_count = 18; }
            else {
              if cw_len <= 30 { size = 22; data_count = 30; ecc_count = 20; }
              else {
                if cw_len <= 36 { size = 24; data_count = 36; ecc_count = 24; }
                else {
                  if cw_len <= 44 { size = 26; data_count = 44; ecc_count = 28; }
                  else { return ""; }
                }
              }
            }
          }
        }
      }
    }
  }
  let message: string = dm_pad_and_ecc(codewords, data_count, ecc_count);
  let region: i32 = size - 2;
  let placed: string = dm_place_precomputed(message, region, region);
  return dm_render(placed, region, region, 1);
}

fn encode_datamatrix_rect(data: string) -> string {
  if string_length(data) == 0 { return ""; }
  let codewords: string = ascii_codewords(data);
  let cw_len: i32 = string_length(codewords) / 3;
  let region_rows: i32 = 0;
  let region_cols: i32 = 0;
  let grid_cols: i32 = 0;
  let data_count: i32 = 0;
  let ecc_count: i32 = 0;
  // 6,16,1,5,7 / 6,14,2,10,11 / 10,24,1,16,14 / 10,16,2,22,18 / 14,16,2,32,24 / 14,22,2,49,28
  if cw_len <= 5 { region_rows = 6; region_cols = 16; grid_cols = 1; data_count = 5; ecc_count = 7; }
  else {
    if cw_len <= 10 { region_rows = 6; region_cols = 14; grid_cols = 2; data_count = 10; ecc_count = 11; }
    else {
      if cw_len <= 16 { region_rows = 10; region_cols = 24; grid_cols = 1; data_count = 16; ecc_count = 14; }
      else {
        if cw_len <= 22 { region_rows = 10; region_cols = 16; grid_cols = 2; data_count = 22; ecc_count = 18; }
        else {
          if cw_len <= 32 { region_rows = 14; region_cols = 16; grid_cols = 2; data_count = 32; ecc_count = 24; }
          else {
            if cw_len <= 49 { region_rows = 14; region_cols = 22; grid_cols = 2; data_count = 49; ecc_count = 28; }
            else { return ""; }
          }
        }
      }
    }
  }
  let message: string = dm_pad_and_ecc(codewords, data_count, ecc_count);
  let cols: i32 = region_cols * grid_cols;
  let placed: string = dm_place_precomputed(message, region_rows, cols);
  return dm_render(placed, region_rows, region_cols, grid_cols);
}

// ---- Aztec -----------------------------------------------------------------

fn aztec_high_level(data: string) -> string {
  let bits: string = "";
  bits = bits_push_value(bits, 31, 5);
  let count: i32 = string_length(data);
  if count <= 31 {
    bits = bits_push_value(bits, count, 5);
  } else {
    bits = bits_push_value(bits, 0, 5);
    bits = bits_push_value(bits, count, 11);
  }
  let i: i32 = 0;
  while i < count {
    bits = bits_push_value(bits, string_byte_at(data, i), 8);
    i = i + 1;
  }
  return bits;
}

fn aztec_stuff_bits(bits: string, word_size: i32) -> string {
  let out: string = "";
  let mask: i32 = pow2(word_size) - 1;
  let index: i32 = 0;
  let length: i32 = string_length(bits);
  let word: i32 = 0;
  let offset: i32 = 0;
  let on: bool = false;
  let prefix: i32 = 0;
  let all_ones_prefix: i32 = 0;
  let shift: i32 = 0;
  let special: bool = false;
  let output: bool = false;
  while index < length {
    word = 0;
    offset = 0;
    while offset < word_size {
      on = bits_get_pad_one(bits, index + offset);
      word = word * 2;
      if on { word = word + 1; }
      offset = offset + 1;
    }
    prefix = word / 2;
    all_ones_prefix = mask / 2;
    special = prefix == 0 || prefix == all_ones_prefix;
    shift = word_size - 1;
    while shift >= 0 {
      output = bit_test(word, shift);
      if shift == 0 && prefix == 0 { output = true; }
      if shift == 0 && prefix == all_ones_prefix { output = false; }
      out = bits_push(out, output);
      shift = shift - 1;
    }
    if special {
      index = index + word_size - 1;
    } else {
      index = index + word_size;
    }
  }
  return out;
}

fn aztec_words_to_bytes(stuffed: string, word_size: i32, total_words: i32) -> string {
  let words: string = bytes_zeros(total_words);
  let message_words: i32 = string_length(stuffed) / word_size;
  let index: i32 = 0;
  while index < message_words {
    let value: i32 = 0;
    let offset: i32 = 0;
    while offset < word_size {
      value = value * 2;
      if bits_get(stuffed, index * word_size + offset) {
        value = value + 1;
      }
      offset = offset + 1;
    }
    words = bytes_set(words, index, value);
    index = index + 1;
  }
  return words;
}

fn aztec_generate_check_words(stuffed: string, total_bits: i32, word_size: i32, primitive: i32, field_size: i32) -> string {
  let total_words: i32 = total_bits / word_size;
  let message_words: i32 = string_length(stuffed) / word_size;
  let words: string = aztec_words_to_bytes(stuffed, word_size, total_words);
  let data_part: string = string_slice(words, 0, message_words * 3);
  let ecc_count: i32 = total_words - message_words;
  let ecc: string = rs_ecc(data_part, ecc_count, primitive, field_size);
  words = string_concat(data_part, ecc);
  // expand to bits with leading total_bits % word_size zeros
  let lead: i32 = total_bits - total_words * word_size;
  if lead < 0 { lead = 0; }
  // total_bits % word_size
  lead = total_bits - total_bits / word_size * word_size;
  let message: string = bits_zeros(lead);
  let wi: i32 = 0;
  while wi < total_words {
    let word: i32 = bytes_get(words, wi);
    let shift: i32 = word_size - 1;
    while shift >= 0 {
      message = bits_push(message, bit_test(word, shift));
      shift = shift - 1;
    }
    wi = wi + 1;
  }
  return message;
}

fn aztec_field_primitive(word_size: i32) -> i32 {
  if word_size == 4 { return 19; }
  if word_size == 6 { return 67; }
  return 301;
}

fn aztec_field_size(word_size: i32) -> i32 {
  return pow2(word_size);
}

fn aztec_get_pixel(row: i32, col: i32, size: i32, layers: i32, mode_message: string, message: string) -> bool {
  let center: i32 = size / 2;
  let dr: i32 = row - center;
  if dr < 0 { dr = 0 - dr; }
  let dc: i32 = col - center;
  if dc < 0 { dc = 0 - dc; }
  let d: i32 = dr;
  if dc > d { d = dc; }
  
  if d <= 4 { return d == 0 || d == 2 || d == 4; }
  let r: i32 = 5;
  if d == 5 {
    if row == center - r && col == center - r { return true; }
    if row == center - r && col == center - r + 1 { return true; }
    if row == center - r + 1 && col == center - r { return true; }
    if row == center - r && col == center + r { return true; }
    if row == center - r + 1 && col == center + r { return true; }
    if row == center + r - 1 && col == center + r { return true; }
    let c3: i32 = center - 3;
    let c3p: i32 = center + 3;
    if row == center - r {
      if col >= c3 && col <= c3p { let b: i32 = col - c3; return bits_get(mode_message, b); }
    } else { if col == center + r {
      if row >= c3 && row <= c3p { let b: i32 = row - c3; let b2: i32 = 7 + b; return bits_get(mode_message, b2); }
    } else { if row == center + r {
      if col >= c3 && col <= c3p { let b: i32 = col - c3; let b2: i32 = 20 - b; return bits_get(mode_message, b2); }
    } else { if col == center - r {
      if row >= c3 && row <= c3p { let b: i32 = row - c3; let b2: i32 = 27 - b; return bits_get(mode_message, b2); }
    } } } }
    return false;
  }
  let dist_row: i32 = row;
  let sr: i32 = size - 1 - row;
  if sr < dist_row { dist_row = sr; }
  let dist_col: i32 = col;
  let sc: i32 = size - 1 - col;
  if sc < dist_col { dist_col = sc; }
  let dist_edge: i32 = dist_row;
  if dist_col < dist_edge { dist_edge = dist_col; }
  
  let layer: i32 = dist_edge / 2;
  if layer >= layers { return false; }
  
  let L2: i32 = layer * 2;
  let R2: i32 = size - 1 - L2;
  let ll: i32 = layers - layer;
  let row_size: i32 = ll * 4 + 9;
  
  let row_offset: i32 = 0;
  let l: i32 = 0;
  while l < layer {
    let l_ll: i32 = layers - l;
    let l_row_size: i32 = l_ll * 4 + 9;
    row_offset = row_offset + l_row_size * 8;
    l = l + 1;
  }
  
  if col == L2 || col == L2 + 1 {
    if row >= R2 - 1 {
      let k: i32 = R2 - row;
      let j: i32 = col - L2;
      let j2: i32 = j * 2;
      let rs2: i32 = row_size * 2;
      let off: i32 = row_offset + rs2 + j2 + k;
      return bits_get(message, off);
    } else {
      let k: i32 = col - L2;
      let j: i32 = row - L2;
      let j2: i32 = j * 2;
      let off: i32 = row_offset + j2 + k;
      return bits_get(message, off);
    }
  } else { if row == R2 || row == R2 - 1 {
    if col >= R2 - 1 {
      let k: i32 = R2 - col;
      let j: i32 = R2 - row;
      let j2: i32 = j * 2;
      let rs4: i32 = row_size * 4;
      let off: i32 = row_offset + rs4 + j2 + k;
      return bits_get(message, off);
    } else {
      let k: i32 = R2 - row;
      let j: i32 = col - L2;
      let j2: i32 = j * 2;
      let rs2: i32 = row_size * 2;
      let off: i32 = row_offset + rs2 + j2 + k;
      return bits_get(message, off);
    }
  } else { if col == R2 || col == R2 - 1 {
    if row <= L2 + 1 {
      let k: i32 = row - L2;
      let j: i32 = R2 - col;
      let j2: i32 = j * 2;
      let rs6: i32 = row_size * 6;
      let off: i32 = row_offset + rs6 + j2 + k;
      return bits_get(message, off);
    } else {
      let k: i32 = R2 - col;
      let j: i32 = R2 - row;
      let j2: i32 = j * 2;
      let rs4: i32 = row_size * 4;
      let off: i32 = row_offset + rs4 + j2 + k;
      return bits_get(message, off);
    }
  } else { if row == L2 || row == L2 + 1 {
    if col <= L2 + 1 {
      let k: i32 = col - L2;
      let j: i32 = row - L2;
      let j2: i32 = j * 2;
      let off: i32 = row_offset + j2 + k;
      return bits_get(message, off);
    } else {
      let k: i32 = row - L2;
      let j: i32 = R2 - col;
      let j2: i32 = j * 2;
      let rs6: i32 = row_size * 6;
      let off: i32 = row_offset + rs6 + j2 + k;
      return bits_get(message, off);
    }
  } } } }
  return false;
}

fn encode_aztec(data: string) -> string {
  if string_length(data) == 0 { return ""; }
  let bits: string = aztec_high_level(data);
  let data_bits: i32 = string_length(bits);
  let ecc_bits: i32 = data_bits * 23 / 100 + 11;
  let layers: i32 = 1;
  while layers <= 4 {
    let total_bits: i32 = 88 + 16 * layers;
    total_bits = total_bits * layers;
    let word_size: i32 = 8;
    if layers <= 2 { word_size = 6; }
    let stuffed: string = aztec_stuff_bits(bits, word_size);
    let stuffed_len: i32 = string_length(stuffed);
    if stuffed_len + ecc_bits <= total_bits {
      let message_words: i32 = stuffed_len / word_size;
      if message_words > 0 && message_words <= 64 {
        let primitive: i32 = aztec_field_primitive(word_size);
        let field_size: i32 = aztec_field_size(word_size);
        let message: string = aztec_generate_check_words(stuffed, total_bits, word_size, primitive, field_size);
        // mode message
        let mode_bits: string = "";
        mode_bits = bits_push_value(mode_bits, layers - 1, 2);
        mode_bits = bits_push_value(mode_bits, message_words - 1, 6);
        let mode_message: string = aztec_generate_check_words(mode_bits, 28, 4, 19, 16);
        let size: i32 = 11 + layers * 4;
        
        let out: string = "";
        let row: i32 = 0;
        while row < size {
          let col: i32 = 0;
          while col < size {
            if aztec_get_pixel(row, col, size, layers, mode_message, message) {
              out = string_concat(out, "1");
            } else {
              out = string_concat(out, "0");
            }
            col = col + 1;
          }
          row = row + 1;
        }
        return packed_result(size, size, out);
      }
    }
    layers = layers + 1;
  }
  return "";
}

export enum MatrixSymbologyId {
  DataMatrix = 0,
  Gs1DataMatrix = 1,
  DataMatrixRectangular = 2,
  Aztec = 3,
}

export fn encode_matrix(symbology: MatrixSymbologyId, data: string) -> string {
  switch symbology {
    case DataMatrix: return encode_datamatrix_square(data, false);
    case Gs1DataMatrix: return encode_datamatrix_square(data, true);
    case DataMatrixRectangular: return encode_datamatrix_rect(data);
    case Aztec: return encode_aztec(data);
    default: return "";
  }
}

export fn __test_gf256_exp(index: i32) -> i32 {
  return bytes_get(field_exp_table(301, 256), index);
}

export fn __test_gf256_mul(a: i32, b: i32) -> i32 {
  return gf_mul(field_exp_table(301, 256), field_log_table(301, 256), a, b);
}

export fn __test_ascii_codewords(data: string) -> string {
  return ascii_codewords(data);
}

export fn __test_dm_10x10_message(data: string) -> string {
  return dm_pad_and_ecc(ascii_codewords(data), 3, 5);
}

export fn __test_pad_codeword_at(position: i32) -> i32 {
  return pad_codeword_at(position);
}

export fn __test_string_byte_at(data: string, index: i32) -> i32 {
  return string_byte_at(data, index);
}

export fn __test_byte_char3(value: i32) -> string {
  return byte_char3(value);
}

export fn __test_bytes_get(data: string, index: i32) -> i32 {
  return bytes_get(data, index);
}

export fn __test_dm_place_10x10(data: string) -> string {
  return dm_place_precomputed(__test_dm_10x10_message(data), 8, 8);
}
`;

/**
 * FWS v1 deliberately does not support arithmetic grouping parentheses. Keep
 * the algorithm readable above and normalize the emitted graph here instead
 * of hand-maintaining a second, less-readable copy of the placement code.
 */
function normalizeFwsArithmetic(graph) {
  const replacements = [
    ['(rows - 3) * cols', 'rows * cols - 3 * cols'],
    ['(rows - 2) * cols', 'rows * cols - 2 * cols'],
    ['(rows - 1) * cols', 'rows * cols - cols'],
    ['(region_rows + 1) * width', 'region_rows * width + width'],
    ['(row + 1) * width', 'row * width + width'],
    ['grid_cols * (region_cols + 2)', 'grid_cols * region_cols + grid_cols * 2'],
    ['region * (region_cols + 2)', 'region * region_cols + region * 2'],
    ['reg * (region_cols + 2)', 'reg * region_cols + reg * 2'],
    ['(column - reg * region_cols)', 'column - reg * region_cols'],
    ['(center - distance) * size', 'center * size - distance * size'],
    ['(center + distance) * size', 'center * size + distance * size'],
    ['offset * size + (center - distance)', 'offset * size + center - distance'],
    ['offset * size + (center + distance)', 'offset * size + center + distance'],
    ['(center - r) * size + (center - r)', 'center * size - r * size + center - r'],
    ['(center - r) * size + (center - r + 1)', 'center * size - r * size + center - r + 1'],
    ['(center - r + 1) * size + (center - r)', 'center * size - r * size + size + center - r'],
    ['(center - r) * size + (center + r)', 'center * size - r * size + center + r'],
    ['(center - r + 1) * size + (center + r)', 'center * size - r * size + size + center + r'],
    ['(center + r - 1) * size + (center + r)', 'center * size + r * size - size + center + r'],
    ['(center - r) * size + off', 'center * size - r * size + off'],
    ['off * size + (center + r)', 'off * size + center + r'],
    ['(center + r) * size + off', 'center * size + r * size + off'],
    ['off * size + (center - r)', 'off * size + center - r'],
    ['(layers - layer) * 4 + 9', 'layers * 4 - layer * 4 + 9'],
    ['(layer * 2 + j) * size + (layer * 2 + k)', 'layer * 2 * size + j * size + layer * 2 + k'],
    [
      '(size - 1 - layer * 2 - k) * size + (layer * 2 + j)',
      'size * size - size - layer * 2 * size - k * size + layer * 2 + j',
    ],
    [
      '(size - 1 - layer * 2 - j) * size + (size - 1 - layer * 2 - k)',
      'size * size - size - layer * 2 * size - j * size + size - 1 - layer * 2 - k',
    ],
    ['(layer * 2 + k) * size + (size - 1 - layer * 2 - j)', 'layer * 2 * size + k * size + size - 1 - layer * 2 - j'],
  ];

  let normalized = graph.replaceAll('4 - (rows + 4 - (rows + 4) / 8 * 8)', 'dm_row_wrap_adjust(rows)');
  normalized = normalized.replaceAll('4 - (cols + 4 - (cols + 4) / 8 * 8)', 'dm_column_wrap_adjust(cols)');
  for (const [from, to] of replacements) {
    normalized = normalized.replaceAll(from, to);
  }
  return normalized.replace(
    'fn dm_place(codewords: string, rows: i32, cols: i32) -> string {',
    `fn dm_row_wrap_adjust(rows: i32) -> i32 {
  let value: i32 = rows + 4;
  return 4 - value + value / 8 * 8;
}

fn dm_column_wrap_adjust(cols: i32) -> i32 {
  let value: i32 = cols + 4;
  return 4 - value + value / 8 * 8;
}

fn dm_place(codewords: string, rows: i32, cols: i32) -> string {`,
  );
}

const normalizedSource = normalizeFwsArithmetic(source);
writeFileSync(outPath, normalizedSource);
console.log('Wrote', outPath, 'bytes', Buffer.byteLength(normalizedSource));
