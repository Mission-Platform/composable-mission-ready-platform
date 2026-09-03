import { describe, expect, it } from 'vitest';

import { load as loadBarcode, loadSync as loadBarcodeSync } from './barcode.fws';

type EanUpcSymbology = 'ean8' | 'ean13' | 'upca' | 'upce';
type EanUpcCase = readonly [EanUpcSymbology, string, string];

const cases: readonly EanUpcCase[] = [
  ['ean8', '9638507', '96385074'],
  ['ean13', '5901234123457', '5901234123457'],
  ['upca', '03600029145', '036000291452'],
  ['upce', '0123450', '01234503'],
  ['upce', '0123433', '01234335'],
  ['upce', '0123444', '01234444'],
  ['upce', '0123456', '01234565'],
  ['upce', '1123456', '11234562'],
];

const moduleBits = (value: string): number[] => Array.from(value, Number);

describe('native EAN/UPC FWS decoders', () => {
  it.each(cases)('round-trips %s', (symbology, payload, expected) => {
    const native = loadBarcodeSync();
    const modules =
      symbology === 'ean8'
        ? native.encode_ean8(payload)
        : symbology === 'ean13'
          ? native.encode_ean13(payload)
          : symbology === 'upca'
            ? native.encode_upca(payload)
            : native.encode_upce(payload);
    const decoded =
      symbology === 'ean8'
        ? native.decode_ean8(moduleBits(modules))
        : symbology === 'ean13'
          ? native.decode_ean13(moduleBits(modules))
          : symbology === 'upca'
            ? native.decode_upca(moduleBits(modules))
            : native.decode_upce(moduleBits(modules));

    expect(decoded).toBe(expected);
  });

  it('rejects malformed module runs for every supported decoder', () => {
    const native = loadBarcodeSync();

    expect(native.decode_ean8([])).toBe('');
    expect(native.decode_ean13([])).toBe('');
    expect(native.decode_upca([])).toBe('');
    expect(native.decode_upce([])).toBe('');
  });

  it('rejects invalid UPC-A checks and UPC-E guards', () => {
    const native = loadBarcodeSync();
    const upca = native.encode_upca('03600029145');
    const upcaWithWrongCheck = `${upca.slice(0, 85)}1110010${upca.slice(92)}`;
    const upce = native.encode_upce('0123456');
    const upceWithBrokenGuard = `${upce.slice(0, 50)}0${upce.slice(51)}`;

    expect(native.decode_upca(Array.from(upcaWithWrongCheck, Number))).toBe('');
    expect(native.decode_upce(Array.from(upceWithBrokenGuard, Number))).toBe('');
  });

  it('uses the same decoder exports through the asynchronous loader', async () => {
    const native = await loadBarcode();
    const ean8Modules = native.encode_ean8('9638507');
    const upceModules = native.encode_upce('0123456');

    expect(native.decode_ean8(moduleBits(ean8Modules))).toBe('96385074');
    expect(native.decode_upce(moduleBits(upceModules))).toBe('01234565');
  });
});
