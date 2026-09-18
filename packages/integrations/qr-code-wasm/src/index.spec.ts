import { describe, expect, it } from 'vitest';

import { encodeQr, encodeQrAsync } from './index';

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
    const firstResult = encodeQr('https://mission-platform.dev', 'H');
    const secondResult = encodeQr('https://mission-platform.dev', 'H');
    expect(secondResult.modules).toEqual(firstResult.modules);
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
