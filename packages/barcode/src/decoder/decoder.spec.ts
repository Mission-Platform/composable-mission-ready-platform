import { describe, expect, it, vi } from 'vitest';

import { type BarcodeSymbology, encodeBarcode } from '../encoder';

import { decodeBarcode, decodeBarcodeAsync } from '.';

// The encoder and decoder wrappers are imported in `src/test-setup.ts`; their
// initialization is lazy and occurs on the first operation.

describe('decodeBarcode', () => {
  // Encode → decode → re-encode: the decoded payload must reproduce the same
  // module run, verifying the decoder inverts the encoder up to each
  // symbology's canonical form (recomputed check digits, upper-casing, …).
  const cases: [BarcodeSymbology, string][] = [
    ['code128', 'ABC-123'],
    ['gs1-128', '0102345678901234'],
    ['code39', 'HELLO-39'],
    ['code39ext', 'Hello, World!'],
    ['code93', 'CODE93'],
    ['code93ext', 'Hello, World!'],
    ['ean13', '5901234123457'],
    ['ean8', '9638507'],
    ['upca', '03600029145'],
    ['upce', '0123456'],
    ['itf', '123456'],
    ['itf14', '1234567890123'],
    ['codabar', '123-456'],
    ['msi', '1234567'],
    ['pharmacode', '1234'],
  ];

  it.each(cases)('round-trips %s', (symbology, data) => {
    const { modules } = encodeBarcode(symbology, data);
    const decoded = decodeBarcode(symbology, modules);
    expect(decoded).not.toBeNull();
    const reEncoded = encodeBarcode(symbology, decoded as string);
    expect(reEncoded.modules).toEqual(modules);
  });

  it('recovers exact text for the extended alphanumeric symbologies', () => {
    const code39 = encodeBarcode('code39ext', 'Mission-42!');
    expect(decodeBarcode('code39ext', code39.modules)).toBe('Mission-42!');
    const code93 = encodeBarcode('code93ext', 'Mission-42!');
    expect(decodeBarcode('code93ext', code93.modules)).toBe('Mission-42!');
  });

  it('recovers every EAN-13 digit including the implicit leading digit', () => {
    const { modules } = encodeBarcode('ean13', '5901234123457');
    expect(decodeBarcode('ean13', modules)).toBe('5901234123457');
  });

  it('returns null for an invalid or unknown module run', () => {
    expect(decodeBarcode('code128', [1, 0, 1, 1, 0])).toBeNull();
    expect(decodeBarcode('ean13', new Uint8Array(40).fill(1))).toBeNull();
  });

  it('returns a real Promise and rejects conversion failures asynchronously', async () => {
    const pending = decodeBarcodeAsync('code128', null as unknown as ArrayLike<number>);
    expect(pending).toBeInstanceOf(Promise);
    await expect(pending).rejects.toThrow();
  });

  it('normalizes initialization failures into Promise rejections', async () => {
    vi.resetModules();
    const failure = new Error('decoder initialization failed');
    const instance = vi.spyOn(WebAssembly, 'Instance').mockImplementation(
      class {
        constructor() {
          throw failure;
        }
      } as typeof WebAssembly.Instance,
    );

    const { decodeBarcodeAsync: freshDecodeBarcodeAsync } = await import('.');
    await expect(freshDecodeBarcodeAsync('code128', [1, 0, 1])).rejects.toBe(failure);

    instance.mockRestore();
  });

  it('decodes asynchronously to the same result', async () => {
    const { modules } = encodeBarcode('code93', 'ASYNC93');
    expect(await decodeBarcodeAsync('code93', modules)).toBe(decodeBarcode('code93', modules));
  });
});
