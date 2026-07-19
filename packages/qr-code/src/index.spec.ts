import { describe, expect, it } from 'vitest';

import { decodeQr, decodeQrAsync, encodeQr, encodeQrAsync } from './index';

// The wasm module is instantiated once in `src/test-setup.ts` (a Vitest
// `setupFiles` entry) before any spec runs.

/**
 * Exercises the WebAssembly QR Code encoder through its typed façade: the
 * matrix geometry, the mandatory finder patterns, determinism, and the
 * too-long error path.
 */
describe('encodeQr (WebAssembly)', () => {
  it('selects version 1 (21×21) for a short byte-mode payload', () => {
    const matrix = encodeQr('HELLO WORLD', 'M');
    expect(matrix.version).toBe(1);
    expect(matrix.size).toBe(21);
    expect(matrix.modules).toHaveLength(21);
    for (const row of matrix.modules) expect(row).toHaveLength(21);
  });

  it('draws the three finder patterns', () => {
    const { modules, size } = encodeQr('finder-patterns', 'M');

    // The 7×7 finder pattern: a dark outer ring, a light ring, then a 3×3 dark core.
    const assertFinder = (top: number, left: number): void => {
      expect(modules[top][left]).toBe(true); // outer corner (dark)
      expect(modules[top + 1][left + 1]).toBe(false); // light ring
      expect(modules[top + 3][left + 3]).toBe(true); // core centre (dark)
    };

    assertFinder(0, 0); // top-left
    assertFinder(0, size - 7); // top-right
    assertFinder(size - 7, 0); // bottom-left
  });

  it('grows the version with the payload length', () => {
    const small = encodeQr('short', 'M');
    const large = encodeQr('x'.repeat(400), 'M');
    expect(large.version).toBeGreaterThan(small.version);
    expect(large.size).toBeGreaterThan(small.size);
  });

  it('is deterministic for the same input', () => {
    const a = encodeQr('https://mission-platform.dev', 'H');
    const b = encodeQr('https://mission-platform.dev', 'H');
    expect(b.modules).toEqual(a.modules);
  });

  it('throws a RangeError when the payload is too long to encode', () => {
    expect(() => encodeQr('x'.repeat(8000), 'L')).toThrow(RangeError);
  });

  it('matches the synchronous result asynchronously', async () => {
    const sync = encodeQr('async-parity', 'Q');
    const async = await encodeQrAsync('async-parity', 'Q');
    expect(async.version).toBe(sync.version);
    expect(async.modules).toEqual(sync.modules);
  });
});

/**
 * Exercises the from-scratch WebAssembly decoder: encode → decode round-trips
 * across error-correction levels and payloads, Reed-Solomon error correction of
 * a damaged matrix, and rejection of an undecodable matrix.
 */
describe('decodeQr (WebAssembly)', () => {
  const cases = ['HELLO WORLD', 'https://mission-platform.dev', '', 'héllo — wörld 🚀', '日本語のテスト'];

  for (const level of ['L', 'M', 'Q', 'H'] as const) {
    it(`round-trips payloads at error-correction level ${level}`, () => {
      for (const value of cases) {
        expect(decodeQr(encodeQr(value, level))).toBe(value);
      }
    });
  }

  it('round-trips a longer, multi-block payload', () => {
    const value = 'The quick brown fox jumps over the lazy dog. '.repeat(6);
    expect(decodeQr(encodeQr(value, 'M'))).toBe(value);
  });

  it('recovers the payload from a damaged matrix (error correction)', () => {
    const value = 'ERROR CORRECTION';
    const matrix = encodeQr(value, 'H');
    // Flip a block of interior data modules; high ECC should still recover it.
    for (let y = Math.floor(matrix.size / 2); y < Math.floor(matrix.size / 2) + 4; y++) {
      for (let x = Math.floor(matrix.size / 2); x < Math.floor(matrix.size / 2) + 3; x++) {
        matrix.modules[y][x] = !matrix.modules[y][x];
      }
    }
    expect(decodeQr(matrix)).toBe(value);
  });

  it('returns null for an undecodable matrix', () => {
    const matrix = encodeQr('valid', 'M');
    // Corrupt far beyond the error-correction capacity.
    for (let y = 9; y < matrix.size; y++) {
      for (let x = 9; x < matrix.size; x++) {
        matrix.modules[y][x] = (x + y) % 2 === 0;
      }
    }
    expect(decodeQr(matrix)).toBeNull();
  });

  it('matches the synchronous decode asynchronously', async () => {
    const matrix = encodeQr('async-decode', 'Q');
    expect(await decodeQrAsync(matrix)).toBe(decodeQr(matrix));
  });
});
