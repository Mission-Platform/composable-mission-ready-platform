import { describe, expect, it } from 'vitest';

import { BarcodeSymbology, load, loadSync } from './barcode-native.fws';

const cases = [
  [BarcodeSymbology.Code128, 'ABC'],
  [BarcodeSymbology.Gs1_128, '0101234567890128'],
  [BarcodeSymbology.Code39, 'ABC'],
  [BarcodeSymbology.Code39Extended, 'Hello'],
  [BarcodeSymbology.Code93, 'ABC'],
  [BarcodeSymbology.Code93Extended, 'Hello'],
  [BarcodeSymbology.Ean13, '5901234123457'],
  [BarcodeSymbology.Ean8, '96385074'],
  [BarcodeSymbology.Upca, '042100005264'],
  [BarcodeSymbology.Upce, '0123456', '01234565'],
  [BarcodeSymbology.Itf, '123456'],
  [BarcodeSymbology.Itf14, '1234567890123', '12345678901231'],
  [BarcodeSymbology.Codabar, '123-456'],
  [BarcodeSymbology.Msi, '1234567'],
  [BarcodeSymbology.Pharmacode, '1234'],
] as const;

describe('barcode-native static dispatcher', () => {
  it('exposes stable enum tags and routes every supported family', () => {
    const native = loadSync();

    expect(BarcodeSymbology).toEqual({
      Code128: 0,
      Gs1_128: 1,
      Code39: 2,
      Code39Extended: 3,
      Code93: 4,
      Code93Extended: 5,
      Ean13: 6,
      Ean8: 7,
      Upca: 8,
      Upce: 9,
      Itf: 10,
      Itf14: 11,
      Codabar: 12,
      Msi: 13,
      Pharmacode: 14,
    });

    for (const [symbology, value, decoded = value] of cases) {
      const encoded = native.encode_native(symbology, value);
      expect(encoded, `${symbology}:${value}`).not.toBe('');
      expect(native.decode_native(symbology, Array.from(encoded, Number))).toBe(decoded);
      native.fws_reset();
    }
  });

  it('returns the existing empty result for an unknown enum tag', () => {
    const native = loadSync();

    expect(native.encode_native(99 as never, 'ABC')).toBe('');
    expect(native.decode_native(-1 as never, [1, 0, 1])).toBe('');
  });

  it('consumes integer modules through the linked family iterator', () => {
    const native = loadSync();
    const encoded = native.encode_native(BarcodeSymbology.Code128, 'ABC');

    expect(native.decode_native(BarcodeSymbology.Code128, Array.from(encoded, Number))).toBe('ABC');
  });

  it('keeps async dispatch results identical to sync dispatch', async () => {
    const native = loadSync();
    const asyncNative = await load();

    for (const [symbology, value] of cases) {
      expect(asyncNative.encode_native(symbology, value)).toBe(native.encode_native(symbology, value));
    }
  });
});
