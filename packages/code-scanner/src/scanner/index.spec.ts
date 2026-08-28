import { type BarcodeSymbology, decodeBarcode, encodeBarcode } from '@mission-platform/barcode';
import { encodeMatrix } from '@mission-platform/matrix-code';
import { encodeQr, type QrErrorCorrection } from '@mission-platform/qr-code';
import { describe, expect, it, vi } from 'vitest';

import {
  createScannerRawPointerSession,
  createScannerRawPointerSessionAsync,
  scanImageData,
  scanImageDataAll,
  scanImageDataAllAsync,
  scanImageDataAsync,
} from './index';

import type { ImageLike } from '../types';

/** Module pixel size and quiet-zone width used when rendering test images. */
const SCALE = 8;
const QUIET = 4;

/**
 * Independent displacement of one image corner, as fractions of the symbol's
 * width/height. `dx`/`dy` slide the corner in-plane; `dz` moves it in depth —
 * positive pushes the corner *away* (perspective foreshortening toward the
 * centre), negative brings it closer. Together the four corners define a full
 * projective (homography) warp, i.e. the "morph scale" where every corner moves
 * independently in x, y and z.
 */
interface CornerMorph {
  dx: number;
  dy: number;
  dz: number;
}

/**
 * A capture-degradation profile combining, in order: **aspect scale** (a
 * non-uniform `aspectX`/`aspectY` stretch), a clockwise **rotation**, a
 * horizontal **skew** (shear), a per-corner **morph** (independent x/y/z corner
 * movement → perspective), and salt-and-pepper **noise** (roughly one flipped
 * pixel per `noiseEvery`). Applied to every generated test image so the pipeline
 * is exercised against realistic capture artefacts rather than pristine renders.
 */
interface Degradation {
  aspectX: number;
  aspectY: number;
  rotationDegrees: number;
  shear: number;
  /** Corner displacements in TL, TR, BR, BL order. */
  morph: [CornerMorph, CornerMorph, CornerMorph, CornerMorph];
  noiseEvery: number;
}

/**
 * QR tolerates the most distortion: its locator derives an affine grid from the
 * three finder centres (so it is rotation- and perspective-tolerant) and
 * Reed–Solomon absorbs the noise. It gets the strongest aspect + rotation + skew
 * + corner morph + noise.
 */
const QR_DEGRADATION: Degradation = {
  aspectX: 1.01,
  aspectY: 0.99,
  rotationDegrees: 5,
  shear: 0.04,
  morph: [
    { dx: 0.002, dy: 0.0015, dz: 0.008 },
    { dx: -0.0015, dy: 0.002, dz: -0.005 },
    { dx: 0.002, dy: -0.0015, dz: 0.008 },
    { dx: -0.0015, dy: -0.0015, dz: 0 },
  ],
  noiseEvery: 900,
};

/**
 * The Data Matrix locator now recovers the symbol at **any rotation** (Phase 3):
 * a corner-based affine locator handles moderate rotation and shear, and a
 * straighten-and-retry fallback recovers the symbol at steep angles before the
 * tuned upright pipeline samples it (see `src/fws/locate-matrix.fws` and its
 * orientation helpers). So the profile now carries a strong rotation
 * on top of an aspect stretch, skew and corner morph; noise it handles well.
 */
const DATA_MATRIX_DEGRADATION: Degradation = {
  aspectX: 1.02,
  aspectY: 0.99,
  rotationDegrees: 18,
  shear: 0.012,
  morph: [
    { dx: 0.004, dy: 0.004, dz: 0.02 },
    { dx: -0.004, dy: 0.004, dz: -0.01 },
    { dx: 0.004, dy: -0.004, dz: 0.02 },
    { dx: -0.004, dy: -0.004, dz: 0 },
  ],
  noiseEvery: 1400,
};

/**
 * The compact Aztec locator finds the central bullseye by its nine-run finder
 * signature, then samples an *axis-aligned* module grid (see
 * `src/fws/locate-matrix.fws`), so like an upright grid it tolerates noise,
 * a slight aspect stretch and a small skew/morph, but not rotation. A mild
 * profile (no rotation) keeps it readable.
 */
const AZTEC_DEGRADATION: Degradation = {
  aspectX: 1.02,
  aspectY: 0.99,
  rotationDegrees: 0,
  shear: 0.008,
  morph: [
    { dx: 0.003, dy: 0.003, dz: 0.012 },
    { dx: -0.003, dy: 0.003, dz: -0.008 },
    { dx: 0.003, dy: -0.003, dz: 0.012 },
    { dx: -0.003, dy: -0.003, dz: 0 },
  ],
  noiseEvery: 1600,
};

/**
 * The 1D locator samples (near-)horizontal scan lines: a uniform aspect stretch,
 * rotation and skew slant every bar equally, so a centred scan line still
 * crosses the full run (the module pitch just scales), but too steep an angle or
 * too strong a perspective drifts the line off the bars near the ends. A
 * moderate profile stays readable.
 */
const BARCODE_DEGRADATION: Degradation = {
  aspectX: 1.05,
  aspectY: 0.9,
  rotationDegrees: 3,
  shear: 0.03,
  morph: [
    { dx: 0.01, dy: 0.01, dz: 0.05 },
    { dx: -0.01, dy: 0.01, dz: -0.03 },
    { dx: 0.01, dy: -0.01, dz: 0.05 },
    { dx: -0.01, dy: -0.01, dz: 0 },
  ],
  noiseEvery: 1400,
};

/** A 2D point. */
type Point = readonly [number, number];

/**
 * Solve the dense linear system `matrix · x = rhs` by Gaussian elimination with
 * partial pivoting. `matrix` is `n × n` (row-major), `rhs` has length `n`.
 */
function solveLinear(matrix: number[][], rhs: number[]): number[] {
  const n = rhs.length;
  const a = matrix.map((row, index) => [...row, rhs[index]]);
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < n; row += 1) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) {
        pivot = row;
      }
    }
    [a[col], a[pivot]] = [a[pivot], a[col]];
    const divisor = a[col][col];
    for (let k = col; k <= n; k += 1) {
      a[col][k] /= divisor;
    }
    for (let row = 0; row < n; row += 1) {
      if (row === col) {
        continue;
      }
      const factor = a[row][col];
      for (let k = col; k <= n; k += 1) {
        a[row][k] -= factor * a[col][k];
      }
    }
  }
  return a.map((row) => row[n]);
}

/**
 * Compute the 3×3 homography (as a length-9 row-major array, `h8 = 1`) mapping
 * the four `from` points onto the four `to` points — the projective transform
 * behind an arbitrary corner-to-corner "morph".
 */
function computeHomography(from: readonly Point[], to: readonly Point[]): number[] {
  const matrix: number[][] = [];
  const rhs: number[] = [];
  for (let index = 0; index < 4; index += 1) {
    const [x, y] = from[index];
    const [u, v] = to[index];
    matrix.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    rhs.push(u);
    matrix.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    rhs.push(v);
  }
  return [...solveLinear(matrix, rhs), 1];
}

/** Apply homography `h` (length-9) to a point, returning the mapped point. */
function applyHomography(h: readonly number[], x: number, y: number): Point {
  const denominator = h[6] * x + h[7] * y + h[8];
  return [(h[0] * x + h[1] * y + h[2]) / denominator, (h[3] * x + h[4] * y + h[5]) / denominator];
}

/**
 * Compute the four destination corners (TL, TR, BR, BL, relative to the image
 * centre) produced by a {@link Degradation}'s aspect scale, rotation, skew and
 * per-corner morph, applied in that order. `dz` foreshortens the corner toward
 * the centre (perspective).
 */
function destinationCorners(sw: number, sh: number, profile: Degradation): Point[] {
  const theta = (profile.rotationDegrees * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  // Affine = rotation ∘ horizontal-shear.
  const a00 = cos;
  const a01 = cos * profile.shear - sin;
  const a10 = sin;
  const a11 = sin * profile.shear + cos;
  const corners: Point[] = [
    [-sw / 2, -sh / 2],
    [sw / 2, -sh / 2],
    [sw / 2, sh / 2],
    [-sw / 2, sh / 2],
  ];
  return corners.map(([x, y], index) => {
    // Aspect stretch.
    const ax = x * profile.aspectX;
    const ay = y * profile.aspectY;
    // Rotation + skew.
    let px = a00 * ax + a01 * ay;
    let py = a10 * ax + a11 * ay;
    // Perspective foreshortening from the corner's depth.
    const morph = profile.morph[index];
    const foreshorten = 1 / (1 + morph.dz);
    px *= foreshorten;
    py *= foreshorten;
    // In-plane corner slide.
    return [px + morph.dx * sw, py + morph.dy * sh] as Point;
  });
}

/**
 * Warp an RGBA {@link ImageLike} by the projective transform described by
 * `profile` (aspect scale + rotation + skew + per-corner x/y/z morph) about its
 * centre, onto a larger white canvas sized to the transformed bounding box plus
 * a quiet-zone margin (so nothing is clipped). Inverse-mapped nearest-neighbour
 * sampling; pixels outside the source stay white.
 */
function warp(source: ImageLike, profile: Degradation): ImageLike {
  const { width: sw, height: sh, data: sdata } = source;
  const scx = sw / 2;
  const scy = sh / 2;
  const sourceCorners: Point[] = [
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

  const margin = QUIET * SCALE;
  const dw = Math.ceil(maxX - minX) + 2 * margin;
  const dh = Math.ceil(maxY - minY) + 2 * margin;
  const dcx = dw / 2;
  const dcy = dh / 2;

  // Homography mapping dest → source (centred coords) for inverse sampling.
  const inverse = computeHomography(destCorners, sourceCorners);

  const data = new Uint8ClampedArray(dw * dh * 4).fill(255);
  for (let dy = 0; dy < dh; dy += 1) {
    for (let dx = 0; dx < dw; dx += 1) {
      const [mx, my] = applyHomography(inverse, dx - dcx, dy - dcy);
      const sx = Math.round(mx + scx);
      const sy = Math.round(my + scy);
      if (sx < 0 || sx >= sw || sy < 0 || sy >= sh) {
        continue;
      }
      const from = (sy * sw + sx) * 4;
      const to = (dy * dw + dx) * 4;
      data[to] = sdata[from];
      data[to + 1] = sdata[from + 1];
      data[to + 2] = sdata[from + 2];
    }
  }
  return { width: dw, height: dh, data };
}

/**
 * Flip roughly `1 / every` pixels to the opposite extreme (black↔white),
 * simulating sensor / compression salt-and-pepper noise. Deterministic: driven
 * by a seeded LCG so runs are reproducible. Mutates and returns `image`.
 */
function speckle(image: ImageLike, every: number, seed: number): ImageLike {
  const { data } = image;
  let state = seed >>> 0;
  for (let index = 0; index < data.length; index += 4) {
    state = (Math.imul(state, 1_103_515_245) + 12_345) >>> 0;
    if ((state >>> 16) % every === 0) {
      const value = data[index] > 127 ? 0 : 255;
      data[index] = value;
      data[index + 1] = value;
      data[index + 2] = value;
    }
  }
  return image;
}

/**
 * Apply a capture-degradation profile — aspect scale, rotation, skew, per-corner
 * morph and noise — to a freshly rendered symbol. `seed` keeps the noise
 * deterministic per test.
 */
function degrade(image: ImageLike, seed: number, profile: Degradation): ImageLike {
  return speckle(warp(image, profile), profile.noiseEvery, seed);
}

/** Derive a stable noise seed from a payload string. */
function seedFor(value: string): number {
  let hash = 0x81_1c_9d_c5;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 0x01_00_01_93);
  }
  return hash >>> 0;
}

/** Paint a `size`×`size` module predicate into an RGBA {@link ImageLike}. */
function renderModules(size: number, isDark: (x: number, y: number) => boolean): ImageLike {
  const side = (size + 2 * QUIET) * SCALE;
  const data = new Uint8ClampedArray(side * side * 4).fill(255);
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (!isDark(col, row)) {
        continue;
      }
      for (let y = (row + QUIET) * SCALE; y < (row + QUIET + 1) * SCALE; y += 1) {
        for (let x = (col + QUIET) * SCALE; x < (col + QUIET + 1) * SCALE; x += 1) {
          const offset = (y * side + x) * 4;
          data[offset] = 0;
          data[offset + 1] = 0;
          data[offset + 2] = 0;
        }
      }
    }
  }
  return { width: side, height: side, data };
}

/**
 * Render a QR symbol for `value`, then apply the shared capture degradation
 * (rotation, skew, noise) so the QR locator's finder-pattern search and affine
 * module sampling are exercised on a realistic frame.
 */
function renderQrImage(value: string, ecc: QrErrorCorrection): ImageLike {
  const matrix = encodeQr(value, ecc);
  const clean = renderModules(matrix.size, (x, y) => matrix.modules[y][x]);
  return degrade(clean, seedFor(`qr:${ecc}:${value}`), QR_DEGRADATION);
}

/**
 * Render a square Data Matrix symbol for `value`, then apply the shared capture
 * degradation (rotation, skew, noise).
 */
function renderDataMatrixImage(value: string): ImageLike {
  const matrix = encodeMatrix('datamatrix', value);
  const clean = renderModules(matrix.width, (x, y) => matrix.modules[y * matrix.width + x] === 1);
  return degrade(clean, seedFor(`dm:${value}`), DATA_MATRIX_DEGRADATION);
}

/**
 * Render a compact Aztec symbol for `value`, then apply the mild
 * (rotation-free) Aztec capture degradation.
 */
function renderAztecImage(value: string): ImageLike {
  const matrix = encodeMatrix('aztec', value);
  const clean = renderModules(matrix.width, (x, y) => matrix.modules[y * matrix.width + x] === 1);
  return degrade(clean, seedFor(`aztec:${value}`), AZTEC_DEGRADATION);
}

/**
 * Composite several already-rendered symbol images onto one larger white canvas
 * at the given top-left offsets (leaving generous white gaps between them), so a
 * single frame carries multiple codes — the input to the region-of-interest and
 * multi-symbol scans.
 */
function compose(
  canvasWidth: number,
  canvasHeight: number,
  placements: readonly { image: ImageLike; x: number; y: number }[],
): ImageLike {
  const data = new Uint8ClampedArray(canvasWidth * canvasHeight * 4).fill(255);
  for (const { image, x, y } of placements) {
    for (let row = 0; row < image.height; row += 1) {
      for (let col = 0; col < image.width; col += 1) {
        const from = (row * image.width + col) * 4;
        const to = ((y + row) * canvasWidth + (x + col)) * 4;
        data[to] = image.data[from];
        data[to + 1] = image.data[from + 1];
        data[to + 2] = image.data[from + 2];
      }
    }
  }
  return { width: canvasWidth, height: canvasHeight, data };
}

/** Render a clean (un-degraded) QR symbol, for compositing multiple codes. */
function renderCleanQr(value: string): ImageLike {
  const matrix = encodeQr(value, 'M');
  return renderModules(matrix.size, (x, y) => matrix.modules[y][x]);
}

/**
 * Render a run of 1D barcode module bits (`1` = bar) into an RGBA
 * {@link ImageLike}: each module is `SCALE` px wide, bars run a tall block, with
 * a `QUIET * SCALE` px light margin on every side, then apply the shared capture
 * degradation (rotation, skew, noise). Bars are rendered extra-tall so a
 * rotated/skewed scan line still crosses every element. Mirrors the Rust
 * integration tests' `render_barcode` so the JS pipeline is exercised the same way.
 */
function renderBarcodeImage(bits: readonly number[]): ImageLike {
  // Taller bars give the (now rotated/skewed) scan lines vertical headroom, so
  // a line through the centre still crosses every bar across the full width.
  const barHeight = SCALE * 24;
  const width = (bits.length + 2 * QUIET) * SCALE;
  const height = barHeight + 2 * QUIET * SCALE;
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  for (const [index, bit] of bits.entries()) {
    if (bit === 0) {
      continue;
    }
    const x0 = (index + QUIET) * SCALE;
    for (let y = QUIET * SCALE; y < QUIET * SCALE + barHeight; y += 1) {
      for (let x = x0; x < x0 + SCALE; x += 1) {
        const offset = (y * width + x) * 4;
        data[offset] = 0;
        data[offset + 1] = 0;
        data[offset + 2] = 0;
      }
    }
  }
  let seed = 0x81_1c_9d_c5;
  for (const bit of bits) {
    seed = Math.imul(seed ^ bit, 0x01_00_01_93);
  }
  return degrade({ width, height, data }, seed >>> 0, BARCODE_DEGRADATION);
}

describe('scanImageData — QR codes', () => {
  it('locates and decodes a QR code back to its payload', () => {
    const value = 'https://mission-platform.dev';
    const result = scanImageData(renderQrImage(value, 'M'));

    expect(result).not.toBeNull();
    expect(result?.format).toBe('qr');
    expect(result?.value).toBe(value);
  });

  it('decodes QR payloads across error-correction levels', () => {
    for (const ecc of ['L', 'M', 'Q', 'H'] as const) {
      const value = `ecc-${ecc}-payload`;
      expect(scanImageData(renderQrImage(value, ecc))?.value, `ecc=${ecc}`).toBe(value);
    }
  });

  // A spread of payloads that push the encoder onto successively larger QR
  // versions (and exercise UTF-8, digits, and URL content), so the locator's
  // finder-pattern search and affine module sampling are covered beyond the
  // smallest symbol.
  it.each([
    ['short digits', '42'],
    ['url', 'https://mission-platform.dev/scan?id=42'],
    ['utf-8', 'héllo — wörld 🚀'],
    ['sentence', 'The quick brown fox jumps over the lazy dog. 0123456789'],
    ['long', 'MISSION-PLATFORM/'.repeat(8)],
  ])('round-trips a %s QR payload', (_label, value) => {
    const result = scanImageData(renderQrImage(value, 'M'));
    expect(result?.format).toBe('qr');
    expect(result?.value).toBe(value);
  });
});

describe('scanImageData — Data Matrix codes', () => {
  it('locates and decodes a Data Matrix code back to its payload', () => {
    const value = 'HELLO';
    const result = scanImageData(renderDataMatrixImage(value));

    expect(result).not.toBeNull();
    expect(result?.format).toBe('datamatrix');
    expect(result?.value).toBe(value);
  });

  it.each([
    ['text', 'HELLO'],
    ['mixed', 'Data Matrix 123'],
    ['slug', 'mission-platform'],
    ['digits', '123456'],
  ])('round-trips a %s Data Matrix payload', (_label, value) => {
    const result = scanImageData(renderDataMatrixImage(value));
    expect(result?.format).toBe('datamatrix');
    expect(result?.value).toBe(value);
  });
});

function disambiguate(symbology: BarcodeSymbology, value: string): string {
  if (symbology === 'ean13' && value.length === 13 && value.startsWith('0')) {
    return value.slice(1);
  }
  return value;
}

describe('scanImageData — 1D barcodes', () => {
  // The symbology precedence the scanner's decode stage applies — it returns the
  // first that reads. Mirrors `BARCODE_SYMBOLOGIES` in the FWS
  // `scan_and_decode` graph.
  const scannerOrder: BarcodeSymbology[] = ['code128', 'code39', 'ean13', 'ean8', 'upca', 'itf', 'codabar'];

  // The scanner resolves the UPC-A/EAN-13 overlap by the number-system digit
  // (mirrors the FWS symbology disambiguation): an EAN-13 whose number-system
  // digit is `0` *is* a UPC-A, so it is reported as the 12-digit UPC-A form (the
  // EAN-13 value with its leading zero stripped). Genuine EAN-13 is unchanged.

  /** The value the scanner would report for a clean module run, under its precedence. */
  function expectedForClean(modules: readonly number[]): string | null {
    for (const symbology of scannerOrder) {
      const value = decodeBarcode(symbology, modules);
      if (value !== null) {
        return disambiguate(symbology, value);
      }
    }
    return null;
  }

  // A payload valid for each symbology the scanner tries. The expected value is
  // what a *clean* module run decodes to under the scanner's own symbology
  // precedence, so the assertion isolates the image pipeline — render → locate →
  // sample → decode — from symbology ambiguity and check-digit normalisation.
  const cases: [BarcodeSymbology, string][] = [
    ['code128', 'ABC-123'],
    ['code39', 'HELLO'],
    ['ean13', '590123412345'],
    ['ean8', '9638507'],
    ['upca', '03600029145'],
    ['itf', '123456'],
    ['codabar', '123-456'],
  ];

  it.each(cases)('locates and decodes a %s barcode', (symbology, data) => {
    const { modules } = encodeBarcode(symbology, data);
    const expected = expectedForClean(modules);
    expect(expected, `clean ${symbology} modules must decode directly`).not.toBeNull();

    const result = scanImageData(renderBarcodeImage(modules));

    expect(result?.format).toBe('barcode');
    expect(result?.value).toBe(expected);
  });
});

describe('scanImageData — Aztec codes', () => {
  it('locates and decodes a compact Aztec code back to its payload', () => {
    const value = 'HELLO';
    const result = scanImageData(renderAztecImage(value));

    expect(result).not.toBeNull();
    expect(result?.format).toBe('aztec');
    expect(result?.value).toBe(value);
  });

  it.each([
    ['short', 'A'],
    ['text', 'Order #42!'],
    ['slug', 'mission-platform-9'],
    ['longer', 'X'.repeat(30)],
  ])('round-trips a %s Aztec payload', (_label, value) => {
    const result = scanImageData(renderAztecImage(value));
    expect(result?.format).toBe('aztec');
    expect(result?.value).toBe(value);
  });
});

describe('scanImageData — region of interest', () => {
  it('scans only within the given ROI, selecting the targeted code', () => {
    // Two QR codes side by side; a ROI over the right half must return that code.
    const left = renderCleanQr('LEFT-CODE');
    const gap = 48;
    const right = renderCleanQr('RIGHT-CODE');
    const width = left.width + gap + right.width;
    const height = Math.max(left.height, right.height);
    const frame = compose(width, height, [
      { image: left, x: 0, y: 0 },
      { image: right, x: left.width + gap, y: 0 },
    ]);

    const rightResult = scanImageData(frame, { x: left.width + gap, y: 0, width: right.width, height });
    expect(rightResult?.value).toBe('RIGHT-CODE');

    const leftResult = scanImageData(frame, { x: 0, y: 0, width: left.width, height });
    expect(leftResult?.value).toBe('LEFT-CODE');
  });
});

describe('scanner raw pointer session', () => {
  it('loads raw exports, decodes pointer results, and owns reset-scoped allocations', () => {
    const session = createScannerRawPointerSession();
    const image = renderCleanQr('RAW-SESSION');

    expect(session.memory).toBeInstanceOf(WebAssembly.Memory);
    expect(session.scan(image)).toEqual({ format: 'qr', value: 'RAW-SESSION' });

    session.reset();
    expect(session.scan(image)).toEqual({ format: 'qr', value: 'RAW-SESSION' });
  });

  it('loads the raw session asynchronously and decodes all results', async () => {
    const session = await createScannerRawPointerSessionAsync();
    const image = renderCleanQr('RAW-ASYNC');

    expect(session.scanAll(image)).toEqual([{ format: 'qr', value: 'RAW-ASYNC' }]);
  });

  it('uses the byte path for ROI scans', () => {
    const session = createScannerRawPointerSession();
    const left = renderCleanQr('RAW-LEFT');
    const gap = 48;
    const right = renderCleanQr('RAW-RIGHT');
    const width = left.width + gap + right.width;
    const height = Math.max(left.height, right.height);
    const frame = compose(width, height, [
      { image: left, x: 0, y: 0 },
      { image: right, x: left.width + gap, y: 0 },
    ]);

    expect(session.scan(frame, { x: left.width + gap, y: 0, width: right.width, height })).toEqual({
      format: 'qr',
      value: 'RAW-RIGHT',
    });
  });
});

describe('scanImageDataAll — multiple symbols', () => {
  it('decodes every distinct code in one frame', () => {
    const left = renderCleanQr('MULTI-LEFT');
    const gap = 48;
    const right = renderCleanQr('MULTI-RIGHT');
    const width = left.width + gap + right.width;
    const height = Math.max(left.height, right.height);
    const frame = compose(width, height, [
      { image: left, x: 0, y: 0 },
      { image: right, x: left.width + gap, y: 0 },
    ]);

    const values = scanImageDataAll(frame)
      .map((result) => result.value)
      .sort();
    expect(values).toEqual(['MULTI-LEFT', 'MULTI-RIGHT']);
  });
});

describe('scanImageData — no code', () => {
  it('returns null for a blank image', () => {
    const blank: ImageLike = { width: 64, height: 64, data: new Uint8ClampedArray(64 * 64 * 4).fill(255) };
    expect(scanImageData(blank)).toBeNull();
  });
});

describe('scanImageDataAsync', () => {
  it('returns a real Promise before scanning', () => {
    const pending = scanImageDataAsync({ width: 1, height: 1, data: new Uint8ClampedArray(4) });
    expect(pending).toBeInstanceOf(Promise);
  });

  it('returns a real Promise for multi-code scans', () => {
    const pending = scanImageDataAllAsync({ width: 1, height: 1, data: new Uint8ClampedArray(4) });
    expect(pending).toBeInstanceOf(Promise);
  });

  it('normalizes initialization failures into Promise rejections', async () => {
    vi.resetModules();
    const failure = new Error('scanner initialization failed');
    const instantiate = vi.spyOn(WebAssembly, 'instantiate').mockRejectedValue(failure);

    const { scanImageDataAsync: freshScanImageDataAsync } = await import('./index');
    await expect(freshScanImageDataAsync({ width: 1, height: 1, data: new Uint8ClampedArray(4) })).rejects.toBe(
      failure,
    );

    instantiate.mockRestore();
  });

  it('decodes a QR code after asynchronous initialisation', async () => {
    const value = 'async-scan';
    const result = await scanImageDataAsync(renderQrImage(value, 'M'));
    expect(result?.value).toBe(value);
  });

  it('decodes a 1D barcode after asynchronous initialisation', async () => {
    const { modules } = encodeBarcode('code128', 'ASYNC-128');
    const result = await scanImageDataAsync(renderBarcodeImage(modules));
    expect(result?.format).toBe('barcode');
    expect(result?.value).toBe('ASYNC-128');
  });
});
