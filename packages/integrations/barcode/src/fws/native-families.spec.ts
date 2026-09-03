import { describe, expect, it } from 'vitest';

import { encodeBarcode } from '../encoder';

import { loadSync as loadCodabarSync } from './codabar.fws';
import { load as loadCode39, loadSync as loadCode39Sync } from './code39.fws';
import { load as loadItf, loadSync as loadItfSync } from './itf.fws';
import { load as loadMsi, loadSync as loadMsiSync } from './msi.fws';
import { load as loadPharmacode, loadSync as loadPharmacodeSync } from './pharmacode.fws';

describe('native barcode FWS families', () => {
  it('matches Code 39 standard and extended module output', () => {
    const standard = loadCode39Sync();
    const extended = encodeBarcode('code39ext', 'Hello, World!').modules.join('');

    expect(standard.encode_code39('hello-39')).toBe(encodeBarcode('code39', 'hello-39').modules.join(''));
    expect(standard.encode_code39('A*B')).toBe('');
    expect(standard.encode_code39_extended('Hello, World!')).toBe(extended);
    expect(standard.encode_code39_extended('')).toBe('');
    expect(standard.encode_code39_extended('é')).toBe('');
  });

  it('calls Code 39 string exports directly through the async loader', async () => {
    const code39 = await loadCode39();

    expect(code39.encode_code39('CODE39')).toBe(encodeBarcode('code39', 'CODE39').modules.join(''));
  });

  it('matches Code 39 extended output for every 7-bit byte', () => {
    const code39 = loadCode39Sync();

    for (let byte = 0; byte <= 127; byte += 1) {
      const value = String.fromCharCode(byte);
      expect(code39.encode_code39_extended(value), `byte ${byte}`).toBe(
        encodeBarcode('code39ext', value).modules.join(''),
      );
    }
  });

  it('matches Codabar output and rejects invalid payloads', () => {
    const codabar = loadCodabarSync();

    expect(codabar.encode_codabar('123-456')).toBe(encodeBarcode('codabar', '123-456').modules.join(''));
    expect(codabar.encode_codabar('0123456789-$:/.+')).toBe(
      encodeBarcode('codabar', '0123456789-$:/.+').modules.join(''),
    );
    expect(codabar.encode_codabar('')).toBe('');
    expect(codabar.encode_codabar('12#34')).toBe('');
    expect(codabar.encode_codabar('12A34')).toBe('');
  });

  it('matches ITF and ITF-14 output, including check-digit handling', async () => {
    const itf = loadItfSync();
    const asyncItf = await loadItf();

    expect(itf.encode_itf('123456')).toBe(encodeBarcode('itf', '123456').modules.join(''));
    expect(itf.encode_itf('123')).toBe('');
    expect(itf.encode_itf('12AB')).toBe('');
    expect(itf.encode_itf14('1234567890123')).toBe(encodeBarcode('itf14', '1234567890123').modules.join(''));
    expect(itf.encode_itf14('12345678901231')).toBe(itf.encode_itf14('1234567890123'));
    expect(itf.encode_itf14('12345678901239')).toBe('');
    expect(asyncItf.encode_itf14('1234567890123')).toBe(itf.encode_itf14('1234567890123'));
  });

  it('matches MSI output and rejects invalid input', async () => {
    const msi = loadMsiSync();
    const modules = msi.encode_msi('1234567');

    expect(modules).toBe(encodeBarcode('msi', '1234567').modules.join(''));
    expect(modules).toHaveLength(103);
    expect(msi.encode_msi('0')).toBe(encodeBarcode('msi', '0').modules.join(''));
    expect(msi.encode_msi('')).toBe('');
    expect(msi.encode_msi('12a')).toBe('');

    const asyncMsi = await loadMsi();
    expect(asyncMsi.encode_msi('1234567')).toBe(modules);
  });

  it('matches Pharmacode boundaries and rejects invalid input', async () => {
    const pharmacode = loadPharmacodeSync();

    for (const value of ['3', '1234', '131070']) {
      const modules = pharmacode.encode_pharmacode(value);
      expect(modules).toBe(encodeBarcode('pharmacode', value).modules.join(''));
    }

    expect(pharmacode.encode_pharmacode('2')).toBe('');
    expect(pharmacode.encode_pharmacode('131071')).toBe('');
    expect(pharmacode.encode_pharmacode('')).toBe('');
    expect(pharmacode.encode_pharmacode('12x')).toBe('');

    const asyncPharmacode = await loadPharmacode();
    expect(asyncPharmacode.encode_pharmacode('131070')).toBe(pharmacode.encode_pharmacode('131070'));
  });
});
