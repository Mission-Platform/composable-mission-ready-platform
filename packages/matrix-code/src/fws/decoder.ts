import type { MatrixCode, MatrixSymbology } from '../encoder';

type Symbol = { readonly width: number; readonly height: number; readonly data: number; readonly ecc: number };
type RectSymbol = Symbol & { readonly regionRows: number; readonly regionCols: number; readonly gridCols: number };

const SQUARE_SYMBOLS: readonly Symbol[] = [
  { width: 10, height: 10, data: 3, ecc: 5 },
  { width: 12, height: 12, data: 5, ecc: 7 },
  { width: 14, height: 14, data: 8, ecc: 10 },
  { width: 16, height: 16, data: 12, ecc: 12 },
  { width: 18, height: 18, data: 18, ecc: 14 },
  { width: 20, height: 20, data: 22, ecc: 18 },
  { width: 22, height: 22, data: 30, ecc: 20 },
  { width: 24, height: 24, data: 36, ecc: 24 },
  { width: 26, height: 26, data: 44, ecc: 28 },
];

const RECTANGULAR_SYMBOLS: readonly RectSymbol[] = [
  { width: 18, height: 8, regionRows: 6, regionCols: 16, gridCols: 1, data: 5, ecc: 7 },
  { width: 32, height: 8, regionRows: 6, regionCols: 14, gridCols: 2, data: 10, ecc: 11 },
  { width: 26, height: 12, regionRows: 10, regionCols: 24, gridCols: 1, data: 16, ecc: 14 },
  { width: 36, height: 12, regionRows: 10, regionCols: 16, gridCols: 2, data: 22, ecc: 18 },
  { width: 36, height: 16, regionRows: 14, regionCols: 16, gridCols: 2, data: 32, ecc: 24 },
  { width: 48, height: 16, regionRows: 14, regionCols: 22, gridCols: 2, data: 49, ecc: 28 },
];

class GaloisField {
  readonly exp: number[];
  readonly log: number[];
  readonly order: number;
  readonly size: number;

  constructor(primitive: number, size: number) {
    this.size = size;
    this.order = size - 1;
    this.exp = Array.from({ length: this.order * 2 }, () => 0);
    this.log = Array.from({ length: size }, () => 0);
    let value = 1;
    for (let power = 0; power < this.order; power += 1) {
      this.exp[power] = value;
      this.log[value] = power;
      value *= 2;
      if ((value & size) !== 0) value ^= primitive;
    }
    for (let power = this.order; power < this.exp.length; power += 1) this.exp[power] = this.exp[power - this.order];
  }

  mul(a: number, b: number): number {
    if (a === 0 || b === 0) return 0;
    return this.exp[this.log[a] + this.log[b]];
  }

  inv(a: number): number {
    return this.exp[this.order - this.log[a]];
  }

  pow(power: number): number {
    return this.exp[power % this.order];
  }

  polyMul(a: readonly number[], b: readonly number[]): number[] {
    const result = Array.from({ length: a.length + b.length - 1 }, () => 0);
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] === 0) continue;
      for (let j = 0; j < b.length; j += 1) result[i + j] ^= this.mul(a[i], b[j]);
    }
    return result;
  }

  correct(block: number[], ecc: number, erasures: readonly number[] = []): boolean {
    const syndromes = Array.from({ length: ecc }, () => 0);
    let allZero = true;
    for (let index = 0; index < ecc; index += 1) {
      const alpha = this.exp[index + 1];
      let value = 0;
      for (const coefficient of block) value = this.mul(value, alpha) ^ coefficient;
      syndromes[index] = value;
      if (value !== 0) allZero = false;
    }
    if (allZero) return true;

    const positions = [...new Set(erasures.filter(position => position >= 0 && position < block.length))].sort((a, b) => a - b);
    if (positions.length > ecc) return false;
    let erasureLocator = [1];
    for (const position of positions) erasureLocator = this.polyMul(erasureLocator, [1, this.pow(block.length - 1 - position)]);

    const forney = [...syndromes];
    for (const position of positions) {
      const x = this.pow(block.length - 1 - position);
      for (let j = 0; j < forney.length - 1; j += 1) forney[j] = this.mul(forney[j], x) ^ forney[j + 1];
    }

    const rounds = ecc - positions.length;
    let lambda = [1];
    let previous = [1];
    let errors = 0;
    let shift = 1;
    let discrepancyPrevious = 1;
    for (let round = 0; round < rounds; round += 1) {
      let discrepancy = forney[round];
      for (let index = 1; index <= errors && index < lambda.length; index += 1) {
        discrepancy ^= this.mul(lambda[index], forney[round - index]);
      }
      if (discrepancy === 0) {
        shift += 1;
      } else if (2 * errors <= round) {
        const saved = [...lambda];
        const scale = this.mul(discrepancy, this.inv(discrepancyPrevious));
        while (lambda.length < shift + previous.length) lambda.push(0);
        for (let index = 0; index < previous.length; index += 1) lambda[index + shift] ^= this.mul(scale, previous[index]);
        previous = saved;
        errors = round + 1 - errors;
        discrepancyPrevious = discrepancy;
        shift = 1; // eslint-disable-line sonarjs/no-redundant-assignments
      } else {
        const scale = this.mul(discrepancy, this.inv(discrepancyPrevious));
        while (lambda.length < shift + previous.length) lambda.push(0);
        for (let index = 0; index < previous.length; index += 1) lambda[index + shift] ^= this.mul(scale, previous[index]);
        shift += 1;
      }
    }
    if (2 * errors + positions.length > ecc) return false;

    const sigma = this.polyMul(lambda, erasureLocator);
    const totalPositions = errors + positions.length;
    const found: number[] = [];
    for (let index = 0; index < block.length; index += 1) {
      const inverse = this.exp[(this.order - (index % this.order)) % this.order];
      let sum = 0;
      let power = 1;
      for (const coefficient of sigma) {
        sum ^= this.mul(coefficient, power);
        power = this.mul(power, inverse);
      }
      if (sum === 0) found.push(block.length - 1 - index);
    }
    if (found.length !== totalPositions) return false;

    const omega = Array.from({ length: ecc }, (_, index) => {
      let value = 0;
      for (let tap = 0; tap <= index && tap < sigma.length; tap += 1) value ^= this.mul(sigma[tap], syndromes[index - tap]);
      return value;
    });
    for (const position of found) {
      const locator = this.exp[(block.length - 1 - position) % this.order];
      const inverse = this.inv(locator);
      let omegaValue = 0;
      let power = 1;
      for (const coefficient of omega) {
        omegaValue ^= this.mul(coefficient, power);
        power = this.mul(power, inverse);
      }
      let derivative = 0;
      power = 1;
      for (let index = 0; index < sigma.length; index += 1) {
        if (index % 2 === 1) derivative ^= this.mul(sigma[index], power);
        if (index >= 1) power = this.mul(power, inverse);
      }
      if (derivative === 0) return false;
      block[position] ^= this.mul(omegaValue, this.inv(derivative));
    }
    return this.syndromesZero(block, ecc);
  }

  private syndromesZero(block: readonly number[], ecc: number): boolean {
    for (let index = 0; index < ecc; index += 1) {
      const alpha = this.exp[index + 1];
      let value = 0;
      for (const coefficient of block) value = this.mul(value, alpha) ^ coefficient;
      if (value !== 0) return false;
    }
    return true;
  }
}

function placementMap(rows: number, cols: number): number[] {
  const filled = Array.from({ length: rows * cols }, () => false);
  const map = Array.from({ length: rows * cols }, () => -1);
  const hasBit = (column: number, row: number): boolean => filled[row * cols + column];
  const module = (rawRow: number, rawColumn: number, position: number, bit: number): void => {
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
    map[row * cols + column] = position * 8 + bit - 1;
  };
  const utah = (row: number, column: number, position: number): void => {
    module(row - 2, column - 2, position, 1); module(row - 2, column - 1, position, 2);
    module(row - 1, column - 2, position, 3); module(row - 1, column - 1, position, 4);
    module(row - 1, column, position, 5); module(row, column - 2, position, 6);
    module(row, column - 1, position, 7); module(row, column, position, 8);
  };
  const corner = (kind: number, position: number): void => {
    if (kind === 1) {
      module(rows - 1, 0, position, 1); module(rows - 1, 1, position, 2); module(rows - 1, 2, position, 3);
      module(0, cols - 2, position, 4); module(0, cols - 1, position, 5); module(1, cols - 1, position, 6);
      module(2, cols - 1, position, 7); module(3, cols - 1, position, 8); return;
    }
    if (kind === 2) {
      module(rows - 3, 0, position, 1); module(rows - 2, 0, position, 2); module(rows - 1, 0, position, 3);
      module(0, cols - 4, position, 4); module(0, cols - 3, position, 5); module(0, cols - 2, position, 6);
      module(0, cols - 1, position, 7); module(1, cols - 1, position, 8); return;
    }
    if (kind === 3) {
      module(rows - 3, 0, position, 1); module(rows - 2, 0, position, 2); module(rows - 1, 0, position, 3);
      module(0, cols - 2, position, 4); module(0, cols - 1, position, 5); module(1, cols - 1, position, 6);
      module(2, cols - 1, position, 7); module(3, cols - 1, position, 8); return;
    }
    module(rows - 1, 0, position, 1); module(rows - 1, cols - 1, position, 2); module(0, cols - 3, position, 3);
    module(0, cols - 2, position, 4); module(0, cols - 1, position, 5); module(1, cols - 3, position, 6);
    module(1, cols - 2, position, 7); module(1, cols - 1, position, 8);
  };
  let position = 0; let row = 4; let column = 0;
  while (true) {
    if (row === rows && column === 0) { corner(1, position); position += 1; }
    if (row === rows - 2 && column === 0 && cols % 4 !== 0) { corner(2, position); position += 1; }
    if (row === rows - 2 && column === 0 && cols % 8 === 4) { corner(3, position); position += 1; }
    if (row === rows + 4 && column === 2 && cols % 8 === 0) { corner(4, position); position += 1; }
    while (true) {
      if (row < rows && column >= 0 && !hasBit(column, row)) { utah(row, column, position); position += 1; }
      row -= 2; column += 2;
      if (row < 0 || column >= cols) break;
    }
    row += 1; column += 3;
    while (true) {
      if (row >= 0 && column < cols && !hasBit(column, row)) { utah(row, column, position); position += 1; }
      row += 2; column -= 2;
      if (row >= rows || column < 0) break;
    }
    row += 3; column += 1;
    if (row >= rows && column >= cols) break;
  }
  return map;
}

function dataMatrixCodewords(matrix: MatrixCode, regionRows: number, regionCols: number, gridCols: number, total: number, erasures?: ArrayLike<number>): { block: number[]; erased: number[] } | null {
  const mappingRows = regionRows;
  const mappingCols = regionCols * gridCols;
  const map = placementMap(mappingRows, mappingCols);
  if (map.filter(value => value >= 0).length !== total * 8) return null;
  const block = Array.from({ length: total }, () => 0);
  const erased = Array.from({ length: total }, () => 0);
  const hasErasures = erasures !== undefined && erasures.length === matrix.width * matrix.height;
  for (let mappingRow = 0; mappingRow < mappingRows; mappingRow += 1) {
    for (let mappingCol = 0; mappingCol < mappingCols; mappingCol += 1) {
      const regionCol = Math.floor(mappingCol / regionCols);
      const innerCol = mappingCol % regionCols;
      const x = regionCol * (regionCols + 2) + 1 + innerCol;
      const y = mappingRow + 1;
      const moduleIndex = y * matrix.width + x;
      const placement = map[mappingRow * mappingCols + mappingCol];
      if (placement < 0) continue;
      const codeword = Math.floor(placement / 8);
      block[codeword] |= (matrix.modules[moduleIndex] ? 1 : 0) << (7 - placement % 8);
      if (hasErasures && erasures![moduleIndex]) erased[codeword] = 1;
    }
  }
  return { block, erased };
}

function decodeAscii(codewords: readonly number[]): number[] | null {
  const output: number[] = [];
  for (let index = 0; index < codewords.length;) {
    const codeword = codewords[index];
    if (codeword === 129) break;
    if (codeword === 232) { index += 1; continue; }
    if (codeword >= 1 && codeword <= 128) { output.push(codeword - 1); index += 1; continue; }
    if (codeword >= 130 && codeword <= 229) {
      const value = codeword - 130; output.push(48 + Math.floor(value / 10), 48 + value % 10); index += 1; continue;
    }
    if (codeword === 235) {
      const shifted = codewords[index + 1];
      if (shifted === undefined || shifted < 1 || shifted > 128) return null;
      output.push(shifted + 127); index += 2; continue;
    }
    return null;
  }
  return output;
}

function decodeDataMatrix(matrix: MatrixCode, rectangular: boolean, erasures?: ArrayLike<number>): number[] | null {
  const symbol = rectangular
    ? RECTANGULAR_SYMBOLS.find(candidate => candidate.width === matrix.width && candidate.height === matrix.height)
    : SQUARE_SYMBOLS.find(candidate => candidate.width === matrix.width && candidate.height === matrix.height);
  if (!symbol || matrix.modules.length !== matrix.width * matrix.height) return null;
  const regionRows = rectangular ? (symbol as RectSymbol).regionRows : matrix.height - 2;
  const regionCols = rectangular ? (symbol as RectSymbol).regionCols : matrix.width - 2;
  const gridCols = rectangular ? (symbol as RectSymbol).gridCols : 1;
  const extracted = dataMatrixCodewords(matrix, regionRows, regionCols, gridCols, symbol.data + symbol.ecc, erasures);
  if (!extracted) return null;
  const erasurePositions = extracted.erased.flatMap((value, index) => value ? [index] : []);
  const corrected = new GaloisField(301, 256).correct(extracted.block, symbol.ecc, erasurePositions);
  if (!corrected) return null;
  extracted.block.length = symbol.data;
  return decodeAscii(extracted.block);
}

function totalAztecBits(layers: number): number { return (88 + 16 * layers) * layers; }
function aztecWordSize(layers: number): number { return layers <= 2 ? 6 : 8; }

function readAztecMode(size: number, get: (x: number, y: number) => boolean): [number, number] | null {
  const center = Math.floor(size / 2); const radius = 5; const mode = Array.from({ length: 28 }, () => false);
  for (let index = 0; index < 7; index += 1) {
    const offset = center - 3 + index;
    mode[index] = get(offset, center - radius); mode[index + 7] = get(center + radius, offset);
    mode[20 - index] = get(offset, center + radius); mode[27 - index] = get(center - radius, offset);
  }
  const words = Array.from({ length: 7 }, (_, index) =>
    mode.slice(index * 4, index * 4 + 4).reduce((value, bit) => value * 2 + (bit ? 1 : 0), 0),
  );
  const field = new GaloisField(19, 16);
  if (!field.correct(words, 5)) return null;
  const dataBits = words[0] * 16 + words[1];
  return [Math.floor(dataBits / 64) + 1, dataBits % 64 + 1];
}

function decodeAztec(matrix: MatrixCode, erasures?: ArrayLike<number>): number[] | null {
  if (matrix.width !== matrix.height || matrix.modules.length !== matrix.width * matrix.height) return null;
  const size = matrix.width; if (size < 15 || (size - 11) % 4 !== 0) return null;
  const layers = (size - 11) / 4; if (layers < 1 || layers > 4) return null;
  const get = (x: number, y: number): boolean => matrix.modules[y * size + x] !== 0;
  const mode = readAztecMode(size, get); if (!mode || mode[0] !== layers) return null;
  const dataWords = mode[1]; const wordSize = aztecWordSize(layers); const totalBits = totalAztecBits(layers);
  const totalWords = Math.floor(totalBits / wordSize); if (dataWords === 0 || dataWords > totalWords) return null;
  const message = Array.from({ length: totalBits }, () => false);
  const messageErasures = Array.from({ length: totalBits }, () => false);
  let rowOffset = 0;
  for (let layer = 0; layer < layers; layer += 1) {
    const rowSize = (layers - layer) * 4 + 9;
    for (let j = 0; j < rowSize; j += 1) {
      const columnOffset = j * 2;
      for (let k = 0; k < 2; k += 1) {
        const topX = layer * 2 + k; const topY = layer * 2 + j;
        const rightX = layer * 2 + j; const rightY = size - 1 - layer * 2 - k;
        const bottomX = size - 1 - layer * 2 - k; const bottomY = size - 1 - layer * 2 - j;
        const leftX = size - 1 - layer * 2 - j; const leftY = layer * 2 + k;
        message[rowOffset + columnOffset + k] = get(topX, topY);
        message[rowOffset + rowSize * 2 + columnOffset + k] = get(rightX, rightY);
        message[rowOffset + rowSize * 4 + columnOffset + k] = get(bottomX, bottomY);
        message[rowOffset + rowSize * 6 + columnOffset + k] = get(leftX, leftY);
        if (erasures !== undefined) {
          messageErasures[rowOffset + columnOffset + k] = erasures[topY * size + topX] !== 0;
          messageErasures[rowOffset + rowSize * 2 + columnOffset + k] = erasures[rightY * size + rightX] !== 0;
          messageErasures[rowOffset + rowSize * 4 + columnOffset + k] = erasures[bottomY * size + bottomX] !== 0;
          messageErasures[rowOffset + rowSize * 6 + columnOffset + k] = erasures[leftY * size + leftX] !== 0;
        }
      }
    }
    rowOffset += rowSize * 8;
  }
  const startPad = totalBits % wordSize;
  const words = Array.from({ length: totalWords }, (_, index) => {
    let value = 0;
    for (let offset = 0; offset < wordSize; offset += 1) {
      value = value * 2 + (message[startPad + index * wordSize + offset] ? 1 : 0);
    }
    return value;
  });
  const wordErasures = Array.from({ length: totalWords }, (_, index) => {
    for (let offset = 0; offset < wordSize; offset += 1) {
      if (messageErasures[startPad + index * wordSize + offset]) return index;
    }
    return -1;
  }).filter(index => index >= 0);
  const field = new GaloisField(wordSize === 6 ? 67 : 301, wordSize === 6 ? 64 : 256);
  if (!field.correct(words, totalWords - dataWords, wordErasures)) return null;
  words.length = dataWords;
  const stuffed: boolean[] = [];
  for (const word of words) {
    for (let shift = wordSize - 1; shift >= 0; shift -= 1) stuffed.push(((word >> shift) & 1) !== 0);
  }
  const bits: boolean[] = []; const onesPrefix = 2 ** (wordSize - 1) - 1;
  for (let index = 0; index + wordSize <= stuffed.length; index += wordSize) {
    const word = stuffed.slice(index, index + wordSize).reduce((value, bit) => value * 2 + (bit ? 1 : 0), 0);
    const prefix = Math.floor(word / 2);
    if (prefix === 0) bits.push(...Array.from({ length: wordSize - 1 }, () => false));
    else if (prefix === onesPrefix) bits.push(...Array.from({ length: wordSize - 1 }, () => true));
    else bits.push(...stuffed.slice(index, index + wordSize));
  }
  let position = 0;
  const read = (count: number): number | null => {
    if (position + count > bits.length) return null;
    let value = 0;
    for (let index = 0; index < count; index += 1) {
      value = value * 2 + (bits[position++] ? 1 : 0);
    }
    return value;
  };
  if (read(5) !== 31) return null;
  const short = read(5);
  if (short === null) return null;
  const count = short === 0 ? read(11) : short;
  if (count === null) return null;
  const output: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const value = read(8);
    if (value === null) return null;
    output.push(value);
  }
  return output;
}

function toUtf8(bytes: number[] | null): string | null {
  if (!bytes) return null;
  try { return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes)); } catch { return null; }
}

export function decodeMatrixFws(symbology: MatrixSymbology, matrix: MatrixCode, erasures?: ArrayLike<number>): string | null {
  const bytes = symbology === 'aztec'
    ? decodeAztec(matrix, erasures)
    : decodeDataMatrix(matrix, symbology === 'datamatrixrectangular', erasures);
  return toUtf8(bytes);
}