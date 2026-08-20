import { describe, expect, it } from 'vitest';

import { load as loadBarcode, loadSync as loadBarcodeSync } from './barcode.fws';

const cases = ['123456', '0123456', '0123450', '0123433', '0123444', '1123456'] as const;

describe('native UPC-E FWS encoder', () => {
  it.each(cases)('encodes %s', (payload) => {
    const native = loadBarcodeSync();

    expect(native.encode_upce(payload)).toHaveLength(51);
  });

  it('normalizes the six-digit form to number system 0', () => {
    const native = loadBarcodeSync();

    expect(native.encode_upce('123456')).toBe(native.encode_upce('0123456'));
  });

  it('rejects invalid input and preserves the direct string ABI', () => {
    const native = loadBarcodeSync();

    for (const payload of ['', '12345', '123456789', '2123456', '012345x', '01234560']) {
      expect(native.encode_upce(payload)).toBe('');
    }
  });

  it('is available through the asynchronous loader', async () => {
    const native = await loadBarcode();

    expect(native.encode_upce('1123456')).toHaveLength(51);
  });
});
