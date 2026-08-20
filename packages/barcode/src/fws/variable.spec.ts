import { describe, expect, it } from 'vitest';

import { encodeBarcode } from '../encoder';
import { encodeVariableBarcodeFws, encodeVariableBarcodeFwsAsync } from './index';

describe('variable barcode adapter', () => {
  it.each([
    ['code128', 'Hello 123'],
    ['gs1-128', '010950110153000317'],
    ['code39', 'HELLO-39'],
    ['code39ext', 'Hello, World!'],
    ['code93', 'CODE93'],
    ['code93ext', 'Code 93'],
    ['itf', '123456'],
    ['itf14', '1234567890123'],
    ['codabar', '123-456'],
    ['msi', '1234'],
    ['pharmacode', '1234'],
  ] as const)('matches the established module output for %s', (symbology, value) => {
    expect(encodeVariableBarcodeFws(symbology, value)).toBe(encodeBarcode(symbology, value).modules.join(''));
  });

  it('preserves invalid-input errors', () => {
    expect(() => encodeVariableBarcodeFws('code39', 'A*B')).toThrow(RangeError);
    expect(() => encodeVariableBarcodeFws('itf', '123')).toThrow(RangeError);
    expect(() => encodeVariableBarcodeFws('pharmacode', '2')).toThrow(RangeError);
  });

  it('uses the same behavior through the asynchronous adapter', async () => {
    await expect(encodeVariableBarcodeFwsAsync('code128', 'Hello 123')).resolves.toBe(
      encodeBarcode('code128', 'Hello 123').modules.join(''),
    );
  });
});
