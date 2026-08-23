import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { encodeBarcode, encodeEan13Fws, encodeUpcaFws } from '@mission-platform/barcode';
import { encodeMatrix, type MatrixSymbology } from '@mission-platform/matrix-code';
import { encodeQr } from '@mission-platform/qr-code';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  createForgeWebScriptCompilerService,
  resolveForgeWebScriptModuleGraph,
} from '../../../forge-web-script/dist/index.js';

interface ScannerExports {
  readonly memory: WebAssembly.Memory;
  readonly fws_alloc: (size: number) => number;
  readonly scan_and_decode: (
    width: number,
    height: number,
    luma: number,
    modules: number,
    erasures: number,
    packed: number,
    meta: number,
  ) => RawString;
  readonly scan_and_decode_roi: (
    width: number,
    height: number,
    luma: number,
    roiX: number,
    roiY: number,
    roiWidth: number,
    roiHeight: number,
    modules: number,
    erasures: number,
    packed: number,
    meta: number,
  ) => RawString;
  readonly scan_and_decode_all: (
    width: number,
    height: number,
    luma: number,
    modules: number,
    erasures: number,
    packed: number,
    meta: number,
  ) => RawString;
  readonly sc_result_none: () => RawString;
  readonly sc_result_decoded: (format: number, pointer: number, length: number) => RawString;
  readonly sc_result_located: (format: number) => RawString;
  readonly sc_binarize_luma: (width: number, height: number, luma: number) => number;
  readonly sc_estimate_orientation: (bits: number, width: number, height: number, meta: number) => number;
  readonly sc_dense_bounds: (bits: number, width: number, height: number, meta: number) => number;
  readonly sc_locate_qr_modules: (
    bits: number,
    width: number,
    height: number,
    modules: number,
    erasures: number,
    meta: number,
  ) => number;
  readonly sc_sample_square_grid: (
    bits: number,
    width: number,
    height: number,
    originX: number,
    originY: number,
    moduleSize: number,
    size: number,
    modules: number,
  ) => number;
  readonly sc_decode_databar_modules: (modules: number) => RawString;
  readonly sc_decode_maxicode_modules: (modules: number) => RawString;
  readonly sc_decode_pdf417_modules: (colsTotal: number, rows: number, modules: number) => RawString;
  readonly sc_decode_only_result: (format: number, value: number, length: number) => RawString;
  readonly sc_try_databar: (width: number, height: number, luma: number, modules: number, meta: number) => RawString;
  readonly sc_try_pdf417: (width: number, height: number, luma: number, modules: number, meta: number) => RawString;
}

type RawString = readonly [pointer: number, length: number];

interface RenderedImage {
  readonly width: number;
  readonly height: number;
  readonly luma: number[];
}

interface Scratch {
  readonly modules: number[];
  readonly erasures: number[];
  readonly packed: number[];
  readonly meta: number[];
}

const scannerDirectory = resolve(import.meta.dirname);
const projectRoots = [
  scannerDirectory,
  resolve(scannerDirectory, '../../../qr-code/src/fws'),
  resolve(scannerDirectory, '../../../matrix-code/src/fws'),
  resolve(scannerDirectory, '../../../barcode/src/fws'),
];

function loadTree(directory: string, files: Record<string, string>): void {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fileName = join(directory, entry.name);
    if (entry.isDirectory()) {
      loadTree(fileName, files);
    } else if (entry.name.endsWith('.fws')) {
      files[resolve(fileName)] = readFileSync(fileName, 'utf8');
    }
  }
}

function createScratch(width: number, height: number): Scratch {
  const capacity = width * height;
  return {
    modules: new Array<number>(capacity).fill(0),
    erasures: new Array<number>(capacity).fill(0),
    packed: new Array<number>(capacity + 1).fill(0),
    meta: new Array<number>(16).fill(0),
  };
}

function renderQr(value: string): RenderedImage {
  const matrix = encodeQr(value, 'M');
  const scale = 8;
  const quietZone = 4;
  const side = (matrix.size + quietZone * 2) * scale;
  const luma = new Array<number>(side * side).fill(255);
  for (let moduleY = 0; moduleY < matrix.size; moduleY += 1) {
    for (let moduleX = 0; moduleX < matrix.size; moduleX += 1) {
      if (!matrix.modules[moduleY][moduleX]) continue;
      for (let y = (moduleY + quietZone) * scale; y < (moduleY + quietZone + 1) * scale; y += 1) {
        for (let x = (moduleX + quietZone) * scale; x < (moduleX + quietZone + 1) * scale; x += 1) {
          luma[y * side + x] = 0;
        }
      }
    }
  }
  return { width: side, height: side, luma };
}

function renderQrPair(leftValue: string, rightValue: string): RenderedImage {
  const left = renderQr(leftValue);
  const right = renderQr(rightValue);
  const gap = 200;
  const width = left.width + gap + right.width;
  const height = Math.max(left.height, right.height);
  const luma = new Array<number>(width * height).fill(255);
  for (let y = 0; y < left.height; y += 1) {
    for (let x = 0; x < left.width; x += 1) {
      luma[y * width + x] = left.luma[y * left.width + x]!;
    }
  }
  for (let y = 0; y < right.height; y += 1) {
    for (let x = 0; x < right.width; x += 1) {
      luma[y * width + left.width + gap + x] = right.luma[y * right.width + x]!;
    }
  }
  return { width, height, luma };
}

function renderInvalidBarcodeLikeImage(): RenderedImage {
  const width = 128;
  const height = 48;
  const luma = new Array<number>(width * height).fill(255);
  for (let y = 12; y < 36; y += 1) {
    for (let x = 10; x < width - 10; x += 1) {
      // Deliberately irregular runs: enough structure for the 1D locator,
      // but no valid symbology/checksum for the linked decoders.
      if (x % 7 === 0 || x % 11 === 0 || x % 13 === 0) luma[y * width + x] = 0;
    }
  }
  return { width, height, luma };
}

const DATABAR_MODULES =
  '01001000100001000100011100000001010100000110011010110010010000010111111000001100001010001110010';

// Generated by mission-platform-maxicode-encode for mode 4 payload
// "MAXICODE FWS 42". Rows are the canonical 30-column x 33-row layout.
const MAXICODE_MODULES = [
  '001010011111010101010101010100',
  '101000001000000000000000000010',
  '011111000001101010101010101010',
  '010101010101010101010101010100',
  '000000000000000000000000000011',
  '101010101010101010101010101010',
  '010101010101010101010101010110',
  '000000000000000000000000000010',
  '101010101010101010101010101011',
  '010101011100000000001101010100',
  '000000000110001110010100000001',
  '101010100010000000000110101000',
  '010101010100000000110101010101',
  '000000000000000000001000000010',
  '101010110000000000000010101010',
  '010101000000000000001001010100',
  '000000000000000000000000000011',
  '101010100000000000000010101010',
  '010101010100000000010101010111',
  '000000100000000000000100000000',
  '101010110010000000010110101011',
  '010101011100000000011001010110',
  '000000001100001110000000000001',
  '101010100100110000010110101000',
  '010101010101010101011111110010',
  '000000000000000000000110011010',
  '101010101010101010101000111101',
  '000110010011100111101110010010',
  '010011001110011001000000010110',
  '010110100101011001010110001110',
  '100010101000001110100110000101',
  '011101010001011101100010101010',
  '000111110111011100000101111011',
].join('');

const MAXICODE_MODE_5_MODULES = [
  '000001111101010101010101010100',
  '101011111000000000000000000000',
  '001011111010101010101010101010',
  '010101010101010101010101010100',
  '000000000000000000000000000010',
  '101010101010101010101010101010',
  '010101010101010101010101010110',
  '000000000000000000000000000000',
  '101010101010101010101010101010',
  '010101010100111100000001010100',
  '000000000010111110000100000010',
  '101010101010000010111110101010',
  '010101010010000000001101010110',
  '000000111100000000000100000000',
  '101010101100000000011110101010',
  '010101100000000000001101010110',
  '000000100000000000000000000001',
  '101010110000000000000010101000',
  '010101011100000000011001010110',
  '000000000000000000000000000000',
  '101010101010000000000110101010',
  '100010111010000000001000100100',
  '111001110100001010101100000010',
  '111100010000111000110100111000',
  '001000000001000001000011011010',
  '100110110100100111000111110010',
  '100111110011100011011101101110',
  '100000001000011001011000001000',
  '111001110110001000111000000101',
  '000101010111011011100001001000',
  '000110001101001101011100101011',
  '010000101100001000110011011000',
  '011001111110010100111110100001',
].join('');

// Generated by mission-platform-pdf417-encode (EC level 2, Byte compaction) for
// payload "This is PDF417": an 86-module x 22-row symbol (1 data column). This
// fixture exercises the base-256 six-pack byte-compaction path.
const PDF417_COLS = 86;
const PDF417_ROWS = 22;
const PDF417_MODULES = [
  '11111111010101000111010100011100001111010110111110011101010111000000111111101000101001',
  '11111111010101000111110101000110001101111110101110011111101010001110111111101000101001',
  '11111111010101000110101011111000001001011011111000011010100011111000111111101000101001',
  '11111111010101000111110100101111101110001001000111011010111101111100111111101000101001',
  '11111111010101000110101110000100001011110100111100011101011100001100111111101000101001',
  '11111111010101000111110101110000101000011000010111011110101111000010111111101000101001',
  '11111111010101000101001111011110001101101000010000010100111011100000111111101000101001',
  '11111111010101000111101001010000001110100000110100011111010010110000111111101000101001',
  '11111111010101000101001101111100001000111100010001010100110001111100111111101000101001',
  '11111111010101000110100011100111101000010011011000010100011000110000111111101000101001',
  '11111111010101000110100111000100001011111011011110011101001110001100111111101000101001',
  '11111111010101000110100010011111001010110111110000010100011011111000111111101000101001',
  '11111111010101000101000001001000001101001101110000010100001100001100111111101000101001',
  '11111111010101000111101000100010001101011111011100011111010001000110111111101000101001',
  '11111111010101000111101000011110101001111101101000010100000110111110111111101000101001',
  '11111111010101000111100101101111101001011000110000011100101000111000111111101000101001',
  '11111111010101000101000111100000101110100110000010010100011111011000111111101000101001',
  '11111111010101000111111001011101101000001101001110011111001011110110111111101000101001',
  '11111111010101000111101101000011101000101100000110011110110100111000111111101000101001',
  '11111111010101000101000011111011001101011111101111010100001111100110111111101000101001',
  '11111111010101000101101000000111001110010011111010011001001001111100111111101000101001',
  '11111111010101000101101110001100001011110011110100010110111011000000111111101000101001',
].join('');

// Payload "HELLO": an 86-module x 15-row symbol. Five payload bytes stay below a
// six-pack, exercising the verbatim byte-compaction fallback.
const PDF417_HELLO_COLS = 86;
const PDF417_HELLO_ROWS = 15;
const PDF417_HELLO_MODULES = [
  '11111111010101000111101010011110001110101000111000011101010111000000111111101000101001',
  '11111111010101000111101010000100001101111110101110011111101010011100111111101000101001',
  '11111111010101000110101011111000001010011100111111010101000011110000111111101000101001',
  '11111111010101000111110101111110101010011110011110011010111101111100111111101000101001',
  '11111111010101000110101110000010001111010010000010011101011100011000111111101000101001',
  '11111111010101000111110101110000101111010011110010011110101111101100111111101000101001',
  '11111111010101000110100111001111001110100010001110010100111011100000111111101000101001',
  '11111111010101000111111010010111001111001110011101010101111110011100111111101000101001',
  '11111111010101000101001101111100001101001111110100011111010011101000111111101000101001',
  '11111111010101000101000111011100001111001110010110010100011000110000111111101000101001',
  '11111111010101000110100111000010001100100111110111011101001110011000111111101000101001',
  '11111111010101000110100010011111001110101111100010011111101000110010111111101000101001',
  '11111111010101000101000001010000001011000110100000010100001100001100111111101000101001',
  '11111111010101000111101000100001001011111000100111011110100010010000111111101000101001',
  '11111111010101000111101000011110101001110011101111010100000010011110111111101000101001',
].join('');

function renderPdf417(bits: string, cols: number, rows: number, scale = 4, quietZone = 6): RenderedImage {
  const width = (cols + quietZone * 2) * scale;
  const height = (rows + quietZone * 2) * scale;
  const luma = new Array<number>(width * height).fill(255);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < cols; column += 1) {
      if (bits[row * cols + column] !== '1') continue;
      for (let y = (quietZone + row) * scale; y < (quietZone + row + 1) * scale; y += 1) {
        for (let x = (quietZone + column) * scale; x < (quietZone + column + 1) * scale; x += 1) {
          luma[y * width + x] = 0;
        }
      }
    }
  }
  return { width, height, luma };
}

function pdf417TextCodewords(value: string): number[] {
  const mixed = '0123456789&\r\t,:#-.$/+%*=^';
  const punct = ';<>@[\\]_`~!\r\t,:\n-.$/"|*()?{}\'';
  const values: number[] = [];
  let mode: 'alpha' | 'lower' | 'mixed' = 'alpha';
  for (const character of value) {
    let encoded = false;
    while (!encoded) {
      if (mode === 'alpha') {
        if (character >= 'A' && character <= 'Z') values.push(character.codePointAt(0)! - 65);
        else if (character === ' ') values.push(26);
        else if (character >= 'a' && character <= 'z') {
          values.push(27);
          mode = 'lower';
          continue;
        } else if (mixed.includes(character)) {
          values.push(28);
          mode = 'mixed';
          continue;
        } else if (punct.includes(character)) values.push(29, punct.indexOf(character));
        else throw new Error(`unsupported PDF417 text character ${character}`);
      } else if (mode === 'lower') {
        if (character >= 'a' && character <= 'z') values.push(character.codePointAt(0)! - 97);
        else if (character === ' ') values.push(26);
        else if (character >= 'A' && character <= 'Z') values.push(27, character.codePointAt(0)! - 65);
        else if (mixed.includes(character)) {
          values.push(28);
          mode = 'mixed';
          continue;
        } else if (punct.includes(character)) values.push(29, punct.indexOf(character));
        else throw new Error(`unsupported PDF417 text character ${character}`);
      } else {
        const mixedIndex = mixed.indexOf(character);
        if (mixedIndex !== -1) values.push(mixedIndex);
        else if (character === ' ') values.push(26);
        else if (character >= 'a' && character <= 'z') {
          values.push(27);
          mode = 'lower';
          continue;
        } else if (character >= 'A' && character <= 'Z') {
          values.push(28);
          mode = 'alpha';
          continue;
        } else if (punct.includes(character)) values.push(29, punct.indexOf(character));
        else throw new Error(`unsupported PDF417 text character ${character}`);
      }
      encoded = true;
    }
  }
  if (values.length % 2 !== 0) values.push(29);
  const codewords: number[] = [];
  for (let index = 0; index < values.length; index += 2) codewords.push(values[index]! * 30 + values[index + 1]!);
  return codewords;
}

function pdf417Bucket(symbol: number): number {
  const bits = symbol.toString(2).padStart(17, '0');
  const runs: number[] = [];
  let start = 0;
  for (let index = 1; index <= bits.length; index += 1) {
    if (index === bits.length || bits[index] !== bits[index - 1]) {
      runs.push(index - start);
      start = index;
    }
  }
  return (runs[0]! - runs[2]! + runs[4]! - runs[6]! + 9) % 9;
}

function pdf417Symbol(value: number, cluster: number): string {
  const table = readFileSync(resolve(scannerDirectory, 'pdf417-tables.fws'), 'utf8');
  const digitTables = [...table.matchAll(/return "(\d+)";/g)].map((match) => match[1]!);
  const symbols = digitTables[0]!;
  const codewords = digitTables[1]!;
  for (let index = 0; index < 2787; index += 1) {
    const symbol = Number(symbols.slice(index * 6, index * 6 + 6));
    const decoded = (Number(codewords.slice(index * 4, index * 4 + 4)) - 1) % 929;
    if (decoded === value && pdf417Bucket(symbol) / 3 === cluster) return symbol.toString(2).padStart(17, '0');
  }
  throw new Error(`missing PDF417 symbol for codeword ${value}, cluster ${cluster}`);
}

function corpusEquivalentPdf417Text(value: string): { bits: string; cols: number; rows: number } {
  const payload = pdf417TextCodewords(value);
  const ecCoefficients = [237, 308, 436, 284, 646, 653, 428, 379];
  const rows = 1 + payload.length + ecCoefficients.length;
  const data = [1 + payload.length, ...payload];
  const ec = new Array<number>(ecCoefficients.length).fill(0);
  for (const codeword of data) {
    const t1 = (codeword + ec.at(-1)!) % 929;
    for (let index = ec.length - 1; index >= 1; index -= 1) {
      ec[index] = (ec[index - 1]! + 929 - ((t1 * ecCoefficients[index]!) % 929)) % 929;
    }
    ec[0] = (929 - ((t1 * ecCoefficients[0]!) % 929)) % 929;
  }
  ec.reverse();
  for (let index = 0; index < ec.length; index += 1) if (ec[index] !== 0) ec[index] = 929 - ec[index]!;
  const full = [...data, ...ec];
  const start = '11111111010101000';
  const stop = '111111101000101001';
  let bits = '';
  for (let row = 0; row < rows; row += 1) {
    const cluster = row % 3;
    const base = 30 * Math.floor(row / 3);
    const left = base + (cluster === 0 ? Math.floor((rows - 1) / 3) : cluster === 1 ? 6 + ((rows - 1) % 3) : 0);
    const right = base + (cluster === 0 ? 0 : cluster === 1 ? Math.floor((rows - 1) / 3) : 6 + ((rows - 1) % 3));
    bits +=
      start + pdf417Symbol(left, cluster) + pdf417Symbol(full[row]!, cluster) + pdf417Symbol(right, cluster) + stop;
  }
  return { bits, cols: 86, rows };
}

function renderDatabar(): RenderedImage {
  const scale = 4;
  const quietZone = 8;
  const height = 64;
  const width = (DATABAR_MODULES.length + quietZone * 2) * scale;
  const luma = new Array<number>(width * height).fill(255);
  for (let module = 0; module < DATABAR_MODULES.length; module += 1) {
    if (DATABAR_MODULES[module] !== '1') continue;
    for (let y = 12; y < height - 12; y += 1) {
      for (let x = (module + quietZone) * scale; x < (module + quietZone + 1) * scale; x += 1) {
        luma[y * width + x] = 0;
      }
    }
  }
  return { width, height, luma };
}

function renderMatrix(symbology: MatrixSymbology, value: string, scale = 8, quietZone = 4): RenderedImage {
  const code = encodeMatrix(symbology, value);
  const side = (code.width + quietZone * 2) * scale;
  const height = (code.height + quietZone * 2) * scale;
  const luma = new Array<number>(side * height).fill(255);
  for (let moduleY = 0; moduleY < code.height; moduleY += 1) {
    for (let moduleX = 0; moduleX < code.width; moduleX += 1) {
      if (code.modules[moduleY * code.width + moduleX] !== 1) continue;
      for (let y = (moduleY + quietZone) * scale; y < (moduleY + quietZone + 1) * scale; y += 1) {
        for (let x = (moduleX + quietZone) * scale; x < (moduleX + quietZone + 1) * scale; x += 1) {
          luma[y * side + x] = 0;
        }
      }
    }
  }
  return { width: side, height, luma };
}

// Rotates a rendered frame by an arbitrary angle using the same "inverse
// rotate, nearest-neighbour sample, expand-to-fit" scheme as the FWS
// `image.rotate_luma` arbitrary-angle path, so the fixture exercises a
// genuinely rotated capture rather than one pre-aligned to a lookup table.
function rotateImage(image: RenderedImage, angleDegrees: number): RenderedImage {
  const angle = (angleDegrees * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const { width, height, luma } = image;
  const halfDiagonal = Math.hypot(width, height) / 2;
  const outSide = Math.ceil(halfDiagonal * 2) + 2;
  const outLuma = new Array<number>(outSide * outSide).fill(255);
  const outCenter = outSide / 2;
  const centerX = width / 2;
  const centerY = height / 2;
  for (let y = 0; y < outSide; y += 1) {
    for (let x = 0; x < outSide; x += 1) {
      const dx = x - outCenter;
      const dy = y - outCenter;
      const sourceX = Math.round(dx * cos + dy * sin + centerX);
      const sourceY = Math.round(-dx * sin + dy * cos + centerY);
      if (sourceX >= 0 && sourceX < width && sourceY >= 0 && sourceY < height) {
        outLuma[y * outSide + x] = luma[sourceY * width + sourceX]!;
      }
    }
  }
  return { width: outSide, height: outSide, luma: outLuma };
}

// ---------------------------------------------------------------------------
// Capture-degradation harness (luma). Mirrors the projective warp + speckle in
// scanner/index.spec.ts so the graph can be exercised against realistic capture
// artefacts (rotation + shear + per-corner perspective + noise) in the fast
// graph loop instead of the slow façade suite.
// ---------------------------------------------------------------------------
interface DegradeProfile {
  aspectX: number;
  aspectY: number;
  rotationDegrees: number;
  shear: number;
  morph: [number, number, number][]; // [dx, dy, dz] in TL, TR, BR, BL order
  noiseEvery: number;
}

function solveLinear(matrix: number[][], rhs: number[]): number[] {
  const n = rhs.length;
  const a = matrix.map((row, index) => [...row, rhs[index]!]);
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < n; row += 1) {
      if (Math.abs(a[row]![col]!) > Math.abs(a[pivot]![col]!)) pivot = row;
    }
    [a[col], a[pivot]] = [a[pivot]!, a[col]!];
    const divisor = a[col]![col]!;
    for (let k = col; k <= n; k += 1) a[col]![k]! /= divisor;
    for (let row = 0; row < n; row += 1) {
      if (row === col) continue;
      const factor = a[row]![col]!;
      for (let k = col; k <= n; k += 1) a[row]![k]! -= factor * a[col]![k]!;
    }
  }
  return a.map((row) => row[n]!);
}

function computeHomography(from: readonly [number, number][], to: readonly [number, number][]): number[] {
  const matrix: number[][] = [];
  const rhs: number[] = [];
  for (let index = 0; index < 4; index += 1) {
    const [x, y] = from[index]!;
    const [u, v] = to[index]!;
    matrix.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    rhs.push(u);
    matrix.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    rhs.push(v);
  }
  return [...solveLinear(matrix, rhs), 1];
}

function applyHomography(h: readonly number[], x: number, y: number): [number, number] {
  const denominator = h[6]! * x + h[7]! * y + h[8]!;
  return [(h[0]! * x + h[1]! * y + h[2]!) / denominator, (h[3]! * x + h[4]! * y + h[5]!) / denominator];
}

function destinationCorners(sw: number, sh: number, profile: DegradeProfile): [number, number][] {
  const theta = (profile.rotationDegrees * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const a00 = cos;
  const a01 = cos * profile.shear - sin;
  const a10 = sin;
  const a11 = sin * profile.shear + cos;
  const corners: [number, number][] = [
    [-sw / 2, -sh / 2],
    [sw / 2, -sh / 2],
    [sw / 2, sh / 2],
    [-sw / 2, sh / 2],
  ];
  return corners.map(([x, y], index) => {
    const ax = x * profile.aspectX;
    const ay = y * profile.aspectY;
    let px = a00 * ax + a01 * ay;
    let py = a10 * ax + a11 * ay;
    const [dx, dy, dz] = profile.morph[index]!;
    const foreshorten = 1 / (1 + dz);
    px *= foreshorten;
    py *= foreshorten;
    return [px + dx * sw, py + dy * sh] as [number, number];
  });
}

function warpLuma(source: RenderedImage, profile: DegradeProfile): RenderedImage {
  const { width: sw, height: sh, luma: sdata } = source;
  const scx = sw / 2;
  const scy = sh / 2;
  const sourceCorners: [number, number][] = [
    [-scx, -scy],
    [scx, -scy],
    [scx, scy],
    [-scx, scy],
  ];
  const destCorners = destinationCorners(sw, sh, profile);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of destCorners) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const margin = 4 * 8;
  const dw = Math.ceil(maxX - minX) + 2 * margin;
  const dh = Math.ceil(maxY - minY) + 2 * margin;
  const dcx = dw / 2;
  const dcy = dh / 2;
  const inverse = computeHomography(destCorners, sourceCorners);
  const data = new Array<number>(dw * dh).fill(255);
  for (let dy = 0; dy < dh; dy += 1) {
    for (let dx = 0; dx < dw; dx += 1) {
      const [mx, my] = applyHomography(inverse, dx - dcx, dy - dcy);
      const sx = Math.round(mx + scx);
      const sy = Math.round(my + scy);
      if (sx < 0 || sx >= sw || sy < 0 || sy >= sh) continue;
      data[dy * dw + dx] = sdata[sy * sw + sx]!;
    }
  }
  return { width: dw, height: dh, luma: data };
}

function speckleLuma(image: RenderedImage, every: number, seed: number): RenderedImage {
  const { luma } = image;
  let state = seed >>> 0;
  for (let index = 0; index < luma.length; index += 1) {
    state = (Math.imul(state, 1_103_515_245) + 12_345) >>> 0;
    if ((state >>> 16) % every === 0) luma[index] = luma[index]! > 127 ? 0 : 255;
  }
  return image;
}

function seedFor(value: string): number {
  let hash = 0x81_1c_9d_c5;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 0x01_00_01_93);
  }
  return hash >>> 0;
}

function degradeLuma(image: RenderedImage, seed: number, profile: DegradeProfile): RenderedImage {
  return speckleLuma(warpLuma(image, profile), profile.noiseEvery, seed);
}

const QR_DEGRADE: DegradeProfile = {
  aspectX: 1.01,
  aspectY: 0.99,
  rotationDegrees: 5,
  shear: 0.04,
  morph: [
    [0.002, 0.0015, 0.008],
    [-0.0015, 0.002, -0.005],
    [0.002, -0.0015, 0.008],
    [-0.0015, -0.0015, 0],
  ],
  noiseEvery: 900,
};

const BARCODE_DEGRADE: DegradeProfile = {
  aspectX: 1.05,
  aspectY: 0.9,
  rotationDegrees: 3,
  shear: 0.03,
  morph: [
    [0.01, 0.01, 0.05],
    [-0.01, 0.01, -0.03],
    [0.01, -0.01, 0.05],
    [-0.01, -0.01, 0],
  ],
  noiseEvery: 1400,
};

function renderRetailBarcode(bits: string, scale = 3, quietZone = 10, height = 60): RenderedImage {
  const width = (bits.length + quietZone * 2) * scale;
  const luma = new Array<number>(width * height).fill(255);
  for (const [module, bit] of [...bits].entries()) {
    if (bit !== '1') continue;
    for (let y = 8; y < height - 8; y += 1) {
      for (let x = (module + quietZone) * scale; x < (module + quietZone + 1) * scale; x += 1) {
        luma[y * width + x] = 0;
      }
    }
  }
  return { width, height, luma };
}

function renderMaxicode(bits: string, scale = 8, quietZone = 4): RenderedImage {
  const width = (30 + quietZone * 2 + 1) * scale;
  const height = (33 + quietZone * 2) * scale;
  const luma = new Array<number>(width * height).fill(255);
  for (let row = 0; row < 33; row += 1) {
    const shift = row % 2 === 0 ? 0 : scale / 2;
    for (let column = 0; column < 30; column += 1) {
      if (bits[row * 30 + column] !== '1') continue;
      const left = (quietZone + column) * scale + shift;
      const top = (quietZone + row) * scale;
      for (let y = top; y < top + scale; y += 1) {
        for (let x = left; x < left + scale; x += 1) luma[y * width + x] = 0;
      }
    }
  }
  return { width, height, luma };
}

function writeArray(api: ScannerExports, values: readonly number[]): number {
  const pointer = api.fws_alloc((values.length + 1) * 4);
  const view = new DataView(api.memory.buffer, pointer, (values.length + 1) * 4);
  view.setInt32(0, values.length, true);
  for (let index = 0; index < values.length; index += 1) view.setInt32((index + 1) * 4, values[index], true);
  return pointer;
}

function readArray(api: ScannerExports, pointer: number, length: number): number[] {
  const view = new DataView(api.memory.buffer, pointer + 4, length * 4);
  return Array.from({ length }, (_, index) => view.getInt32(index * 4, true));
}

function writeString(api: ScannerExports, value: string): RawString {
  const bytes = new TextEncoder().encode(value);
  const pointer = api.fws_alloc(bytes.byteLength);
  new Uint8Array(api.memory.buffer, pointer, bytes.byteLength).set(bytes);
  return [pointer, bytes.byteLength];
}

function readString(api: ScannerExports, value: RawString): string {
  return new TextDecoder().decode(new Uint8Array(api.memory.buffer, value[0], value[1]));
}

function scan(api: ScannerExports, image: RenderedImage): string {
  const scratch = createScratch(image.width, image.height);
  return readString(
    api,
    api.scan_and_decode(
      image.width,
      image.height,
      writeArray(api, image.luma),
      writeArray(api, scratch.modules),
      writeArray(api, scratch.erasures),
      writeArray(api, scratch.packed),
      writeArray(api, scratch.meta),
    ),
  );
}

function scanAll(api: ScannerExports, image: RenderedImage): string {
  const scratch = createScratch(image.width, image.height);
  return readString(
    api,
    api.scan_and_decode_all(
      image.width,
      image.height,
      writeArray(api, image.luma),
      writeArray(api, scratch.modules),
      writeArray(api, scratch.erasures),
      writeArray(api, scratch.packed),
      writeArray(api, scratch.meta),
    ),
  );
}

describe('compiled scanner FWS graph', () => {
  let api: ScannerExports;

  beforeAll(async () => {
    const files: Record<string, string> = {};
    for (const root of projectRoots) loadTree(root, files);
    const entry = resolve(scannerDirectory, 'scanner.fws');
    const resolver = {
      resolve(source: string, importer: string): string | undefined {
        const target = resolve(dirname(importer), source);
        return files[target] === undefined ? undefined : target;
      },
      load(fileName: string): string {
        return files[fileName] ?? '';
      },
    };
    const linkConfiguration = {
      projectRoots,
      defaultLinkMode: 'static' as const,
      crossProjectLinkMode: 'static' as const,
      linkProfile: 'static' as const,
    };
    const graph = await resolveForgeWebScriptModuleGraph([entry], resolver, linkConfiguration);
    const service = createForgeWebScriptCompilerService();
    try {
      const artifact = service.compileGraph({
        graph: graph.graph,
        entryFileName: entry,
        compilerVersion: '0.1.0',
        linkConfiguration,
      });
      const errors = artifact.diagnostics.filter(({ severity }) => severity === 'error');
      expect(errors, errors.map(({ message }) => message).join('\n')).toHaveLength(0);
      expect(artifact.wasm).toBeDefined();
      expect(artifact.manifest?.linkProfile).toBe('static');
      expect(artifact.manifest?.optimizationProfile).toBe('static-aggressive');
      let instance: WebAssembly.Instance | undefined;
      const textDecoder = new TextDecoder('utf-8', { fatal: true });
      // Decodes a decimal-triplet-per-byte payload as UTF-8, returning a "1" +
      // text success marker (or [0, 0] on invalid UTF-8), matching the
      // qr.decode.utf8 host capability contract shared by QR, Data Matrix,
      // and Aztec. Two FWS modules import this capability under different
      // local aliases (their wasm import field names), so both are wired to
      // the same underlying host implementation here.
      function decodeUtf8Triplets(pointer: number, length: number): RawString {
        if (instance === undefined) return [0, 0];
        const encoded = new TextDecoder().decode(new Uint8Array(instance.exports.memory.buffer, pointer, length));
        const bytes = new Uint8Array(encoded.length / 3);
        for (let index = 0; index < bytes.length; index += 1) {
          bytes[index] = Number(encoded.slice(index * 3, index * 3 + 3));
        }
        try {
          return writeString(instance.exports as unknown as ScannerExports, `1${textDecoder.decode(bytes)}`);
        } catch {
          return [0, 0];
        }
      }
      const imports = {
        'qr.decode.utf8': {
          decode_utf8: decodeUtf8Triplets,
          matrix_decode_utf8: decodeUtf8Triplets,
        },
      };
      instance = new WebAssembly.Instance(new WebAssembly.Module(artifact.wasm!), imports);
      api = instance.exports as unknown as ScannerExports;
    } finally {
      service.dispose();
    }
  }, 300_000);

  it('keeps the result wire format compact and tagged', () => {
    expect(readString(api, api.sc_result_none())).toBe('');
    expect(readString(api, api.sc_result_located(2))).toBe('L2');
    const value = writeString(api, 'hello');
    expect(readString(api, api.sc_result_decoded(0, value[0], value[1]))).toBe('D0hello');
  });

  it('returns no result for blank input and an outside ROI', () => {
    const image: RenderedImage = { width: 1, height: 1, luma: [255] };
    expect(scan(api, image)).toBe('');

    const scratch = createScratch(image.width, image.height);
    expect(
      readString(
        api,
        api.scan_and_decode_roi(
          image.width,
          image.height,
          writeArray(api, image.luma),
          image.width + 1,
          image.height + 1,
          8,
          8,
          writeArray(api, scratch.modules),
          writeArray(api, scratch.erasures),
          writeArray(api, scratch.packed),
          writeArray(api, scratch.meta),
        ),
      ),
    ).toBe('');
  });

  it('binarises a QR without consuming its quiet zone', () => {
    const image = renderQr('fws-static');
    const bits = api.sc_binarize_luma(image.width, image.height, writeArray(api, image.luma));
    const bytes = new Uint8Array(api.memory.buffer, bits, Math.ceil((image.width * image.height) / 8));
    let minX = image.width;
    let minY = image.height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < image.height; y += 1) {
      for (let x = 0; x < image.width; x += 1) {
        const index = y * image.width + x;
        if ((bytes[Math.floor(index / 8)]! & (1 << (index % 8))) === 0) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    expect([minX, minY, maxX + 1, maxY + 1]).toEqual([32, 32, 200, 200]);
    const meta = writeArray(api, new Array(4).fill(0));
    expect(api.sc_dense_bounds(bits, image.width, image.height, meta)).toBe(1);
    expect(readArray(api, meta, 4)).toEqual([32, 32, 200, 200]);
    const scratch = createScratch(image.width, image.height);
    const modules = writeArray(api, scratch.modules);
    const erasures = writeArray(api, scratch.erasures);
    const locatorMeta = writeArray(api, scratch.meta);
    const pointIndex = 36 * image.width + 36;
    expect(
      new Uint8Array(api.memory.buffer, bits + Math.floor(pointIndex / 8), 1)[0]! & (1 << (pointIndex % 8)),
    ).not.toBe(0);
    expect(api.sc_sample_square_grid(bits, image.width, image.height, 36 * 256, 36 * 256, 0, 1, modules)).toBe(1);
    expect(readArray(api, modules, 1)).toEqual([1]);
    expect(api.sc_sample_square_grid(bits, image.width, image.height, 32 * 256, 32 * 256, 8 * 256, 21, modules)).toBe(
      441,
    );
    const expected = encodeQr('fws-static', 'M')
      .modules.flat()
      .map((dark) => (dark ? 1 : 0));
    const sampled = readArray(api, modules, 441);
    expect(sampled.slice(0, 21)).toEqual(expected.slice(0, 21));
    expect(api.sc_locate_qr_modules(bits, image.width, image.height, modules, erasures, locatorMeta)).toBe(1);
    expect(readArray(api, locatorMeta, 5)).toEqual([1, 800, 32, 32, 168]);
  });

  it('decodes a QR through the linked decoder graph', () => {
    expect(scan(api, renderQr('fws-static'))).toBe('D0fws-static');
  });

  it('decodes a modestly rotated QR through finder-based sampling', () => {
    expect(scan(api, rotateImage(renderQr('fws-rotated'), 5))).toBe('D0fws-rotated');
  });

  it('decodes a larger QR payload through the linked decoder graph', () => {
    const value = 'MISSION-PLATFORM/'.repeat(8);
    expect(scan(api, renderQr(value))).toBe(`D0${value}`);
  });

  it('REPRO decodes a fully degraded QR (warp + perspective + noise)', () => {
    const value = 'https://mission-platform.dev';
    const image = degradeLuma(renderQr(value), 0x12_34, QR_DEGRADE);
    expect(scan(api, image)).toBe(`D0${value}`);
  });

  it('decodes a sentence QR payload after capture degradation', () => {
    const value = 'The quick brown fox jumps over the lazy dog. 0123456789';
    const image = degradeLuma(renderQr(value), seedFor(`qr:M:${value}`), QR_DEGRADE);
    expect(scan(api, image)).toBe(`D0${value}`);
  });

  it('decodes a Data Matrix through the linked decoder graph', () => {
    // Exercises size disambiguation via the clock track: without it the locator
    // locks onto a smaller candidate size and the decode fails.
    expect(scan(api, renderMatrix('datamatrix', 'DM-HELLO'))).toBe('D1DM-HELLO');
    expect(scan(api, renderMatrix('datamatrix', 'DM-HELLO', 6))).toBe('D1DM-HELLO');
    expect(scan(api, renderMatrix('datamatrix', 'Data Matrix 123'))).toBe('D1Data Matrix 123');
    expect(scan(api, renderMatrix('datamatrix', 'mission-platform'))).toBe('D1mission-platform');
    expect(scan(api, renderMatrix('datamatrix', '123456'))).toBe('D1123456');
  });

  it('decodes a rotated Data Matrix by straightening the whole frame first', () => {
    // Mirrors crates/code-scan's try_decode_matrix straighten-and-retry: the
    // axis-aligned locator cannot sample a steeply rotated grid directly, so
    // the scanner must estimate the frame's orientation, rotate it upright,
    // and retry before giving up. Two rotation directions exercise the
    // "both ± signs" handedness fallback from the native reference.
    expect(scan(api, rotateImage(renderMatrix('datamatrix', 'DM-HELLO'), 20))).toBe('D1DM-HELLO');
    expect(scan(api, rotateImage(renderMatrix('datamatrix', 'DM-HELLO'), -20))).toBe('D1DM-HELLO');
    expect(scan(api, rotateImage(renderMatrix('datamatrix', 'DM-HELLO'), 10))).toBe('D1DM-HELLO');
    expect(scan(api, rotateImage(renderMatrix('datamatrix', 'DM-HELLO'), 35))).toBe('D1DM-HELLO');
    expect(scan(api, rotateImage(renderMatrix('datamatrix', 'DM-HELLO'), -35))).toBe('D1DM-HELLO');
    expect(scan(api, rotateImage(renderMatrix('datamatrix', 'DM-HELLO', 6), 20))).toBe('D1DM-HELLO');
    expect(scan(api, rotateImage(renderMatrix('datamatrix', 'Data Matrix 123'), 18))).toBe('D1Data Matrix 123');
  });

  it('decodes an Aztec symbol through the linked decoder graph', () => {
    // Exercises concentric-ring bullseye size disambiguation.
    expect(scan(api, renderMatrix('aztec', 'AZTEC42'))).toBe('D3AZTEC42');
    expect(scan(api, renderMatrix('aztec', 'AZTEC42', 6))).toBe('D3AZTEC42');
  });

  it('decodes non-ASCII Data Matrix and Aztec payloads via the shared UTF-8 host capability', () => {
    // A payload with bytes outside 0-126 fails c.ascii_from_triplets and used
    // to fall back to a located-but-undecodable SOH marker; the scanner must
    // now surface the real decoded text through qr.decode.utf8, exactly like
    // it already does for QR.
    expect(scan(api, renderMatrix('datamatrix', 'café'))).toBe('D1café');
    expect(scan(api, renderMatrix('aztec', 'café'))).toBe('D3café');
  });

  it('decodes an EAN-13 barcode through the linked decoder graph', () => {
    // A non-zero leading digit stays a 13-digit EAN-13 (no UPC-A collapse).
    expect(scan(api, renderRetailBarcode(encodeEan13Fws('123456789012')))).toBe('D21234567890128');
  });

  it('decodes a bounded Code 128 row through the linked scanner graph', () => {
    const encoded = encodeBarcode('code128', 'ABC-123');
    expect(scan(api, renderRetailBarcode(encoded.modules.join('')))).toBe('D2ABC-123');
  });

  it('decodes a longer Code 128 row through the linked scanner graph', () => {
    const encoded = encodeBarcode('code128', 'ASYNC-128');
    expect(scan(api, renderRetailBarcode(encoded.modules.join('')))).toBe('D2ASYNC-128');
  });

  it('decodes a longer degraded Code 128 row through the linked scanner graph', () => {
    const encoded = encodeBarcode('code128', 'ASYNC-128');
    const image = degradeLuma(
      renderRetailBarcode(encoded.modules.join(''), 8, 4, 256),
      seedFor(`barcode:ASYNC-128`),
      BARCODE_DEGRADE,
    );
    expect(scan(api, image)).toBe('D2ASYNC-128');
  });

  it('disambiguates UPC-A from EAN-13', () => {
    // A UPC-A symbol is a zero-prefixed EAN-13; the scanner normalises the
    // decoded 13-digit value back to its canonical 12-digit UPC-A form.
    expect(scan(api, renderRetailBarcode(encodeUpcaFws('03600029145')))).toBe('D2036000291452');
    // A genuine EAN-13 whose payload happens to start with zero collapses the
    // same way (matches the native UPC-A/EAN-13 disambiguation).
    expect(scan(api, renderRetailBarcode(encodeEan13Fws('012345678905')))).toBe('D2123456789050');
  });

  it('decodes a GS1 DataBar RSS-14 module row with payload parity', () => {
    const modules = [...DATABAR_MODULES].map(Number);
    expect(readString(api, api.sc_decode_databar_modules(writeArray(api, modules)))).toBe('04412345678909');
    const image = renderDatabar();
    const scratch = createScratch(image.width, image.height);
    const sampledPointer = writeArray(api, scratch.modules);
    const metaPointer = writeArray(api, scratch.meta);
    const result = readString(
      api,
      api.sc_try_databar(image.width, image.height, writeArray(api, image.luma), sampledPointer, metaPointer),
    );
    expect(result).toBe('D504412345678909');
    expect(scan(api, image)).toBe('D504412345678909');
  });

  it('decodes a mode 4 MaxiCode grid with payload parity', () => {
    const modules = [...MAXICODE_MODULES].map(Number);
    expect(modules).toHaveLength(30 * 33);
    expect(readString(api, api.sc_decode_maxicode_modules(writeArray(api, modules)))).toBe('MAXICODE FWS 42');

    modules[0] = modules[0] === 0 ? 1 : 0;
    expect(readString(api, api.sc_decode_maxicode_modules(writeArray(api, modules)))).toBe('MAXICODE FWS 42');
    modules[15 * 30 + 19] = modules[15 * 30 + 19] === 0 ? 1 : 0;
    expect(readString(api, api.sc_decode_maxicode_modules(writeArray(api, modules)))).toBe('MAXICODE FWS 42');
    expect(readString(api, api.sc_decode_maxicode_modules(writeArray(api, new Array<number>(30 * 33).fill(0))))).toBe(
      '',
    );
  });

  it('decodes mode 5 and tags a rendered MaxiCode through the scanner', () => {
    const modules = [...MAXICODE_MODE_5_MODULES].map(Number);
    expect(readString(api, api.sc_decode_maxicode_modules(writeArray(api, modules)))).toBe('MaxiCode 5');
    modules[0] = modules[0] === 0 ? 1 : 0;
    expect(readString(api, api.sc_decode_maxicode_modules(writeArray(api, modules)))).toBe('MaxiCode 5');
    expect(scan(api, renderMaxicode(MAXICODE_MODULES))).toBe('D6MAXICODE FWS 42');
  });

  it('decodes a PDF417 codeword grid with six-pack byte compaction', () => {
    const modules = [...PDF417_MODULES].map(Number);
    expect(modules).toHaveLength(PDF417_COLS * PDF417_ROWS);
    expect(readString(api, api.sc_decode_pdf417_modules(PDF417_COLS, PDF417_ROWS, writeArray(api, modules)))).toBe(
      'This is PDF417',
    );

    // Flipping a data-region module breaks the GF(929) syndrome check, so the
    // decoder refuses the symbol rather than emitting a corrupted payload.
    const corrupted = [...modules];
    const dataColumn = 17 + 17 + 8; // start guard + into the left indicator/data span
    corrupted[10 * PDF417_COLS + dataColumn] = corrupted[10 * PDF417_COLS + dataColumn] === 0 ? 1 : 0;
    expect(readString(api, api.sc_decode_pdf417_modules(PDF417_COLS, PDF417_ROWS, writeArray(api, corrupted)))).toBe(
      '',
    );

    // A blank grid produces no symbol.
    expect(
      readString(
        api,
        api.sc_decode_pdf417_modules(
          PDF417_COLS,
          PDF417_ROWS,
          writeArray(api, new Array<number>(PDF417_COLS * PDF417_ROWS).fill(0)),
        ),
      ),
    ).toBe('');
  });

  it('decodes PDF417 payloads end-to-end through the scanner', () => {
    // Six-pack byte compaction through the full locate + decode pipeline.
    expect(scan(api, renderPdf417(PDF417_MODULES, PDF417_COLS, PDF417_ROWS))).toBe('D4This is PDF417');
    // Verbatim (<6 byte) byte-compaction fallback.
    expect(scan(api, renderPdf417(PDF417_HELLO_MODULES, PDF417_HELLO_COLS, PDF417_HELLO_ROWS))).toBe('D4HELLO');
  });

  it('decodes the documented PDF417 text-compaction corpus image through the FWS graph', () => {
    const expected = readFileSync(resolve(scannerDirectory, 'fixtures/pdf417-text.txt'), 'utf8').trimEnd();
    const fixture = corpusEquivalentPdf417Text(expected);
    const image = renderPdf417(fixture.bits, fixture.cols, fixture.rows);
    const scratch = createScratch(image.width, image.height);
    expect(
      readString(
        api,
        api.sc_try_pdf417(
          image.width,
          image.height,
          writeArray(api, image.luma),
          writeArray(api, scratch.modules),
          writeArray(api, scratch.meta),
        ),
      ),
    ).toBe(`D4${expected}`);
  });

  it('does not invent located-only outcomes for decode-or-nothing formats', () => {
    const empty = writeString(api, '');
    for (const format of [4, 5, 6]) {
      expect(readString(api, api.sc_decode_only_result(format, empty[0], empty[1]))).toBe('');
    }
  });

  it('reports a located but undecodable barcode-like region', () => {
    expect(scan(api, renderInvalidBarcodeLikeImage())).toBe('L2');
  });

  it('collects distinct QR symbols in discovery order across overlapping regions', () => {
    expect(scanAll(api, renderQr('single'))).toBe('D0single');
    expect(scanAll(api, renderQrPair('first', 'second'))).toBe('D0first\u001ED0second');
  });

  it('deduplicates the same QR payload found in multiple swept regions', () => {
    expect(scanAll(api, renderQrPair('repeat', 'repeat'))).toBe('D0repeat');
  }, 10_000);
});
