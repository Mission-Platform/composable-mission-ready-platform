import { describe, expect, it } from 'vitest';

import { load as loadItf, loadSync as loadItfSync } from './itf.fws';
import { load as loadMsi, loadSync as loadMsiSync } from './msi.fws';
import { load as loadPharmacode, loadSync as loadPharmacodeSync } from './pharmacode.fws';

interface ItfDecoder {
  readonly encode_itf: (value: string) => string;
  readonly encode_itf14: (value: string) => string;
  readonly decode_itf: (modules: ArrayLike<number>) => string;
  readonly decode_itf14: (modules: ArrayLike<number>) => string;
}

interface MsiDecoder {
  readonly encode_msi: (value: string) => string;
  readonly decode_msi: (modules: ArrayLike<number>) => string;
}

interface PharmacodeDecoder {
  readonly encode_pharmacode: (value: string) => string;
  readonly decode_pharmacode: (modules: ArrayLike<number>) => string;
}

const itfDecoder = (): ItfDecoder => loadItfSync() as unknown as ItfDecoder;
const msiDecoder = (): MsiDecoder => loadMsiSync() as unknown as MsiDecoder;
const pharmacodeDecoder = (): PharmacodeDecoder => loadPharmacodeSync() as unknown as PharmacodeDecoder;

function encodeModules(symbology: 'itf' | 'itf14' | 'msi' | 'pharmacode', value: string): number[] {
  const modules =
    symbology === 'itf'
      ? itfDecoder().encode_itf(value)
      : symbology === 'itf14'
        ? itfDecoder().encode_itf14(value)
        : symbology === 'msi'
          ? msiDecoder().encode_msi(value)
          : pharmacodeDecoder().encode_pharmacode(value);
  return moduleBits(modules);
}

const moduleBits = (value: string): number[] => Array.from(value, Number);

describe('native ITF, MSI, and Pharmacode FWS decoders', () => {
  it('round-trips clean ITF and ITF-14 strings', () => {
    const itf = itfDecoder();
    const itfModules = encodeModules('itf', '123456');
    const itf14Modules = encodeModules('itf14', '1234567890123');

    expect(itf.decode_itf(itfModules)).toBe('123456');
    expect(itf.decode_itf14(itf14Modules)).toBe('12345678901231');
  });

  it('preserves framing and checksum behavior for ITF and MSI', () => {
    const itf = itfDecoder();
    const itfModules = encodeModules('itf', '123456').join('');
    const itf14 = encodeModules('itf14', '1234567890123').join('');
    const msi = msiDecoder();
    const msiModules = encodeModules('msi', '1234567').join('');
    const alteredMsiCheck = `${msiModules.slice(0, -16)}100100100100${msiModules.slice(-4)}`;

    expect(itf.decode_itf([0, ...moduleBits(itfModules)])).toBe('');
    expect(itf.decode_itf(moduleBits(itfModules.slice(0, -1) + '0'))).toBe('');
    expect(itf.decode_itf14(moduleBits(itf14.slice(0, -16) + '100100100100' + itf14.slice(-4)))).toBe('');
    expect(msi.decode_msi([0, ...moduleBits(msiModules)])).toBe('');
    expect(msi.decode_msi(moduleBits(alteredMsiCheck))).toBe('1234567');
  });

  it('handles Pharmacode boundaries and invalid runs', () => {
    const pharmacode = pharmacodeDecoder();

    for (const value of ['3', '1234', '131070']) {
      const modules = encodeModules('pharmacode', value);
      expect(pharmacode.decode_pharmacode(modules)).toBe(value);
    }

    expect(pharmacode.decode_pharmacode([])).toBe('');
    expect(pharmacode.decode_pharmacode([2])).toBe('');
  });

  it('exposes the same decoders through asynchronous loaders', async () => {
    const itfModules = encodeModules('itf', '123456');
    const itf14Modules = encodeModules('itf14', '1234567890123');
    const msiModules = encodeModules('msi', '1234567');
    const pharmacodeModules = encodeModules('pharmacode', '1234');
    const [itf, msi, pharmacode] = await Promise.all([loadItf(), loadMsi(), loadPharmacode()]);

    expect((itf as unknown as ItfDecoder).decode_itf(itfModules)).toBe('123456');
    expect((itf as unknown as ItfDecoder).decode_itf14(itf14Modules)).toBe('12345678901231');
    expect((msi as unknown as MsiDecoder).decode_msi(msiModules)).toBe('1234567');
    expect((pharmacode as unknown as PharmacodeDecoder).decode_pharmacode(pharmacodeModules)).toBe('1234');
  });
});
