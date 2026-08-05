import { describe, expect, it } from 'vitest';

import { encodeMatrix, encodeMatrixAsync, type MatrixCode, type MatrixSymbology } from './index';

// The wasm module is instantiated once in `src/test-setup.ts` (a Vitest
// `setupFiles` entry) before any spec runs.

/** The grid is `width * height` binary modules. */
function assertShape(code: MatrixCode, symbology: MatrixSymbology): void {
  expect(code.symbology).toBe(symbology);
  expect(code.modules.length).toBe(code.width * code.height);
  expect(code.modules.every((bit) => bit === 0 || bit === 1)).toBe(true);
}

/** Read the module at (`x`, `y`) from a {@link MatrixCode}. */
function module(code: MatrixCode, x: number, y: number): number {
  return code.modules[y * code.width + x];
}

describe('encodeMatrix', () => {
  it('encodes a small numeric payload to a 10x10 Data Matrix symbol', () => {
    const code = encodeMatrix('datamatrix', '123456');
    assertShape(code, 'datamatrix');
    expect(code.width).toBe(10);
    expect(code.height).toBe(10);
  });

  it('grows to a larger symbol as the payload grows', () => {
    const small = encodeMatrix('datamatrix', '123456');
    const large = encodeMatrix('datamatrix', 'https://mission-platform.dev');
    expect(large.width).toBeGreaterThan(small.width);
  });

  it('encodes a rectangular Data Matrix symbol (width ≠ height)', () => {
    const code = encodeMatrix('datamatrixrectangular', '123456');
    assertShape(code, 'datamatrixrectangular');
    expect(code.width).toBe(18);
    expect(code.height).toBe(8);
  });

  it('encodes an Aztec symbol (square, 15x15 for a short payload)', () => {
    const code = encodeMatrix('aztec', 'HELLO');
    assertShape(code, 'aztec');
    expect(code.width).toBe(code.height);
    expect(code.width).toBe(15);
  });

  it('renders the solid "L" finder and alternating timing pattern', () => {
    const code = encodeMatrix('datamatrix', '123456');
    const last = code.width - 1;
    for (let i = 0; i < code.width; i++) {
      // Left edge and bottom edge are the solid "L" finder.
      expect(module(code, 0, i)).toBe(1);
      expect(module(code, i, last)).toBe(1);
      // Top edge and right edge are the alternating timing pattern.
      expect(module(code, i, 0)).toBe(i % 2 === 0 ? 1 : 0);
      expect(module(code, last, i)).toBe((last - i) % 2 === 0 ? 1 : 0);
    }
  });

  it('encodes GS1 Data Matrix (FNC1-prefixed) as a valid symbol', () => {
    const code = encodeMatrix('gs1datamatrix', '0102345678901234');
    assertShape(code, 'gs1datamatrix');
    // The leading FNC1 codeword costs one codeword, so the GS1 variant is at
    // least as large as the plain symbol for the same payload.
    const plain = encodeMatrix('datamatrix', '0102345678901234');
    expect(code.width).toBeGreaterThanOrEqual(plain.width);
  });

  it('throws a RangeError for invalid payloads', () => {
    expect(() => encodeMatrix('datamatrix', '')).toThrow(RangeError);
    expect(() => encodeMatrix('gs1datamatrix', '')).toThrow(RangeError);
    // More than 44 data codewords cannot fit the supported single-region symbols.
    expect(() => encodeMatrix('datamatrix', 'A'.repeat(45))).toThrow(RangeError);
  });

  it('produces the same result asynchronously', async () => {
    const sync = encodeMatrix('datamatrix', 'ASYNC');
    const async = await encodeMatrixAsync('datamatrix', 'ASYNC');
    expect(async.modules).toEqual(sync.modules);
    expect(async.width).toBe(sync.width);
    expect(async.height).toBe(sync.height);
  });
});
