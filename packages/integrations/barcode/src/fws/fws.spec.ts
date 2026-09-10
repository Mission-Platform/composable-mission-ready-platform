import { describe, expect, it } from 'vitest';

import { dataBarFixture, ean13Fixture, ean8Fixture, upcaFixture } from './fws.fixtures';

import {
  encodeEan8Fws,
  encodeEan8FwsAsync,
  validateGs1DataBarValue,
  validateGs1DataBarValueAsync,
  encodeEan13Fws,
  encodeEan13FwsAsync,
  encodeUpcaFws,
  encodeUpcaFwsAsync,
} from '.';

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
  });
});
