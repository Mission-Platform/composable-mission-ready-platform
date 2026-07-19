import { describe, expect, it } from 'vitest';

import { encodeMicroQr, encodeMicroQrAsync, encodeRmqr, encodeRmqrAsync } from './index';

// The wasm module is instantiated once in `src/test-setup.ts` (a Vitest
// `setupFiles` entry) before any spec runs.

/**
 * Exercises the WebAssembly Micro QR Code encoder through its typed façade:
 * matrix geometry, automatic version selection, the level-`H` rejection and the
 * too-long error path.
 */
describe('encodeMicroQr (WebAssembly)', () => {
  it('selects the smallest square version (11×11) for a tiny numeric payload', () => {
    const matrix = encodeMicroQr('01234', 'L');
    expect(matrix.width).toBe(11);
    expect(matrix.height).toBe(11);
    expect(matrix.modules).toHaveLength(11);
    for (const row of matrix.modules) expect(row).toHaveLength(11);
  });

  it('draws the single top-left finder pattern', () => {
    const { modules } = encodeMicroQr('FINDER 1', 'L');
    expect(modules[0][0]).toBe(true); // outer corner (dark)
    expect(modules[1][1]).toBe(false); // light ring
    expect(modules[3][3]).toBe(true); // core centre (dark)
  });

  it('grows the version with the payload length', () => {
    const small = encodeMicroQr('1', 'L');
    const large = encodeMicroQr('HELLO WORLD', 'L');
    expect(large.width).toBeGreaterThan(small.width);
  });

  it('rejects error-correction level H (unsupported by Micro QR)', () => {
    expect(() => encodeMicroQr('1', 'H')).toThrow(RangeError);
  });

  it('throws a RangeError when the payload is too long to encode', () => {
    expect(() => encodeMicroQr('1'.repeat(60), 'L')).toThrow(RangeError);
  });

  it('is deterministic and matches the asynchronous result', async () => {
    const sync = encodeMicroQr('HELLO123', 'M');
    const async = await encodeMicroQrAsync('HELLO123', 'M');
    expect(async.modules).toEqual(sync.modules);
  });
});

/**
 * Exercises the WebAssembly Rectangular Micro QR (rMQR) encoder: rectangular
 * geometry, automatic size selection, and the too-long error path.
 */
describe('encodeRmqr (WebAssembly)', () => {
  it('produces a rectangular matrix matching the reported dimensions', () => {
    const matrix = encodeRmqr('123456', 'M');
    expect(matrix.modules).toHaveLength(matrix.height);
    for (const row of matrix.modules) expect(row).toHaveLength(matrix.width);
    // rMQR is wider than it is tall.
    expect(matrix.width).toBeGreaterThan(matrix.height);
  });

  it('grows the symbol area with the payload length', () => {
    const small = encodeRmqr('1', 'M');
    const large = encodeRmqr('https://example.com/a/reasonably/long/path?with=query', 'M');
    expect(large.width * large.height).toBeGreaterThan(small.width * small.height);
  });

  it('throws a RangeError when the payload is too long to encode', () => {
    expect(() => encodeRmqr('x'.repeat(400), 'H')).toThrow(RangeError);
  });

  it('is deterministic and matches the asynchronous result', async () => {
    const sync = encodeRmqr('rMQR 123', 'M');
    const async = await encodeRmqrAsync('rMQR 123', 'M');
    expect(async.modules).toEqual(sync.modules);
  });
});
