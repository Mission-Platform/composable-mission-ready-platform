import { describe, expect, it } from 'vitest';

import {
  decodeEan8Fws,
  decodeEan8FwsAsync,
  decodeEan13Fws,
  decodeEan13FwsAsync,
  encodeEan8Fws,
  encodeEan8FwsAsync,
  validateGs1DataBarValue,
  validateGs1DataBarValueAsync,
} from '.';
import { encodeEan13Fws, encodeEan13FwsAsync, encodeUpcaFws, encodeUpcaFwsAsync } from '.';
import { dataBarFixture, ean13Fixture, ean8Fixture, upcaFixture } from './fws.fixtures';

const moduleBits = (value: string): number[] => Array.from(value, Number);

describe('barcode FWS migration slice', () => {
  it('encodes EAN-8 with a computed check digit through the synchronous loader', () => {
    expect(encodeEan8Fws(ean8Fixture.payload)).toBe(ean8Fixture.modules);
  });

  it('rejects invalid EAN-8 payloads without throwing', () => {
    expect(encodeEan8Fws('96385000')).toBe('');
    expect(encodeEan8Fws('not-a-code')).toBe('');
  });

  it('validates an RSS-14/GS1 DataBar GTIN through both loader modes', async () => {
    expect(validateGs1DataBarValue(dataBarFixture.valid)).toBe(true);
    expect(validateGs1DataBarValue(dataBarFixture.invalid)).toBe(false);
    await expect(validateGs1DataBarValueAsync(dataBarFixture.valid)).resolves.toBe(true);
  });

  it('provides the same EAN-8 result asynchronously', async () => {
    await expect(encodeEan8FwsAsync(ean8Fixture.payload)).resolves.toBe(encodeEan8Fws(ean8Fixture.payload));
  });

  it('decodes EAN-8 modules and rejects malformed or bad-checksum input', () => {
    expect(decodeEan8Fws(moduleBits(ean8Fixture.modules))).toBe('9638507' + '4');
    expect(decodeEan8Fws(moduleBits(ean8Fixture.modules.slice(0, -1) + '0'))).toBe('');
    expect(decodeEan8Fws(moduleBits(ean8Fixture.modules.slice(0, 20) + '0' + ean8Fixture.modules.slice(21)))).toBe('');
  });

  it('decodes EAN-13 parity and check digit from the module layout', () => {
    expect(decodeEan13Fws(moduleBits(ean13Fixture.modules))).toBe('5901234123457');
    expect(decodeEan13Fws(moduleBits(ean13Fixture.modules.slice(0, 45) + '00000' + ean13Fixture.modules.slice(50)))).toBe('');
  });

  it('encodes EAN-13 with a computed check digit and parity layout', () => {
    expect(encodeEan13Fws(ean13Fixture.payload)).toBe(ean13Fixture.modules);
    expect(encodeEan13Fws(ean13Fixture.payload).length).toBe(95);
    expect(encodeEan13Fws('5901234123450')).toBe('');
  });

  it('encodes UPC-A through the zero-prefixed EAN-13 graph', () => {
    expect(encodeUpcaFws(upcaFixture.payload)).toBe(upcaFixture.modules);
    expect(encodeUpcaFws(upcaFixture.payload).length).toBe(95);
    expect(encodeUpcaFws('036000291450')).toBe('');
  });

  it('provides matching EAN-13 and UPC-A asynchronous loaders', async () => {
    await expect(encodeEan13FwsAsync(ean13Fixture.payload)).resolves.toBe(ean13Fixture.modules);
    await expect(encodeUpcaFwsAsync(upcaFixture.payload)).resolves.toBe(upcaFixture.modules);
    await expect(decodeEan8FwsAsync(moduleBits(ean8Fixture.modules))).resolves.toBe('96385074');
    await expect(decodeEan13FwsAsync(moduleBits(ean13Fixture.modules))).resolves.toBe('5901234123457');
  });
});
