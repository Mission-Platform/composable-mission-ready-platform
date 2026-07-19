import { describe, expect, it } from 'vitest';

import { type MatrixCode, decodeMatrix, decodeMatrixAsync, encodeMatrix } from '../index';

// The encoder and decoder wasm modules are instantiated once in
// `src/test-setup.ts` (a Vitest `setupFiles` entry) before any spec runs.

describe('decodeMatrix', () => {
  it('round-trips a numeric payload', () => {
    const code = encodeMatrix('datamatrix', '123456');
    expect(decodeMatrix(code)).toBe('123456');
  });

  it('round-trips a range of payloads and symbol sizes', () => {
    for (const text of ['HELLO', 'https://mission-platform.dev', 'A1B2C3', 'Order #42!', 'café']) {
      const code = encodeMatrix('datamatrix', text);
      expect(decodeMatrix(code)).toBe(text);
    }
  });

  it('round-trips a GS1 Data Matrix payload', () => {
    const code = encodeMatrix('gs1datamatrix', '0102345678901234');
    // The leading FNC1 codeword is a flag, not literal data, so it is dropped.
    expect(decodeMatrix(code)).toBe('0102345678901234');
  });

  it('round-trips a rectangular Data Matrix payload', () => {
    for (const text of ['123456', 'HELLO', 'Order #42!', 'A'.repeat(24)]) {
      const code = encodeMatrix('datamatrixrectangular', text);
      expect(code.width).not.toBe(code.height);
      expect(decodeMatrix(code)).toBe(text);
    }
  });

  it('round-trips an Aztec payload across symbol sizes', () => {
    for (const text of ['A', 'HELLO', 'https://mission-platform.dev', 'X'.repeat(40)]) {
      const code = encodeMatrix('aztec', text);
      expect(code.width).toBe(code.height);
      expect(decodeMatrix(code)).toBe(text);
    }
  });

  it('recovers a payload from a lightly damaged symbol', () => {
    const code = encodeMatrix('datamatrix', '123456');
    // The 10x10 symbol carries 5 ECC codewords, tolerating up to 2 corrupted
    // codewords; flip two interior modules and confirm recovery.
    const damaged: MatrixCode = { ...code, modules: [...code.modules] };
    damaged.modules[3 * code.width + 3] ^= 1;
    damaged.modules[4 * code.width + 4] ^= 1;
    expect(decodeMatrix(damaged)).toBe('123456');
  });

  it('returns null for an undecodable symbol', () => {
    const size = 10;
    const blank: MatrixCode = {
      symbology: 'datamatrix',
      width: size,
      height: size,
      modules: Array.from({ length: size * size }, () => 0),
    };
    expect(decodeMatrix(blank)).toBeNull();
  });

  it('produces the same result asynchronously', async () => {
    const code = encodeMatrix('datamatrix', 'ASYNC');
    expect(await decodeMatrixAsync(code)).toBe(decodeMatrix(code));
  });
});
