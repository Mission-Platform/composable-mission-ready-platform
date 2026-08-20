import { describe, expect, it } from 'vitest';

import { encodeBarcode } from '../encoder';
import { load as loadCode128, loadSync as loadCode128Sync } from './code128.fws';

interface Code128DecoderExports {
  readonly decode_code128: (modules: ArrayLike<number>) => string;
  readonly decode_gs1_128: (modules: ArrayLike<number>) => string;
}

const moduleBits = (value: string): number[] => Array.from(value, Number);

const patterns: Readonly<Record<number, string>> = {
  12: '112232',
  24: '311222',
  33: '111323',
  34: '131123',
  35: '131321',
  37: '132113',
  96: '114311',
  99: '113141',
  100: '114131',
  101: '311141',
  102: '411131',
  104: '211214',
  105: '211232',
  106: '2331112',
  97: '411113',
};

function renderSymbol(value: number): string {
  const pattern = patterns[value];
  if (!pattern) {
    throw new Error(`Missing Code 128 test pattern for ${value}.`);
  }

  let result = '';
  let bit = '1';
  for (const width of pattern) {
    result += bit.repeat(Number(width));
    bit = bit === '1' ? '0' : '1';
  }
  return result;
}

function renderFrame(values: readonly number[]): string {
  let checksum = 0;
  for (let index = 0; index < values.length; index += 1) {
    checksum += values[index] * (index === 0 ? 1 : index);
  }

  return values.map(renderSymbol).join('') + renderSymbol(checksum % 103) + renderSymbol(106);
}

function decoder(exports: unknown): Code128DecoderExports {
  return exports as Code128DecoderExports;
}

describe('native Code 128 FWS decoder', () => {
  it('decodes Code B and Code C frames produced by the native encoder', () => {
    const code128 = decoder(loadCode128Sync());

    expect(code128.decode_code128(encodeBarcode('code128', 'ABC-123').modules)).toBe('ABC-123');
    expect(code128.decode_code128(encodeBarcode('code128', '1234').modules)).toBe('1234');
  });

  it('follows Code Set transitions inside a frame', () => {
    const code128 = decoder(loadCode128Sync());

    expect(code128.decode_code128(moduleBits(renderFrame([104, 33, 34, 99, 12, 100, 35])))).toBe('AB12C');
    expect(code128.decode_code128(moduleBits(renderFrame([105, 12, 100, 33, 34])))).toBe('12AB');
  });

  it('drops leading and embedded FNC1 symbols for GS1-128', () => {
    const code128 = decoder(loadCode128Sync());

    expect(code128.decode_gs1_128(encodeBarcode('gs1-128', '0102345678901234').modules)).toBe(
      '0102345678901234',
    );
    expect(code128.decode_gs1_128(moduleBits(renderFrame([104, 102, 33, 102, 34])))).toBe('AB');
  });

  it('rejects malformed framing, symbols, checksums, stops, and module values', () => {
    const code128 = decoder(loadCode128Sync());
    const modules = encodeBarcode('code128', 'AB').modules.join('');
    const checksumStart = modules.length - 24;
    const badChecksum =
      modules.slice(0, checksumStart) + (modules[checksumStart] === '1' ? '0' : '1') + modules.slice(checksumStart + 1);
    const badStop = modules.slice(0, -1) + '0';
    const badModules = modules.slice(0, 5) + (modules[5] === '1' ? '0' : '1') + modules.slice(6);

    expect(code128.decode_code128([])).toBe('');
    expect(code128.decode_code128(moduleBits(modules.slice(1)))).toBe('');
    expect(code128.decode_code128(moduleBits(badChecksum))).toBe('');
    expect(code128.decode_code128(moduleBits(badStop))).toBe('');
    expect(code128.decode_code128(moduleBits(badModules))).toBe('');
    expect(code128.decode_code128(moduleBits(renderFrame([104, 96])))).toBe('');
    expect(code128.decode_code128(moduleBits(renderFrame([105, 101, 12])))).toBe('');
  });

  it('provides both decoder entry points through the asynchronous loader', async () => {
    const code128 = decoder(await loadCode128());

    expect(code128.decode_code128(encodeBarcode('code128', 'Async-128').modules)).toBe('Async-128');
    expect(code128.decode_gs1_128(encodeBarcode('gs1-128', '123456').modules)).toBe('123456');
  });
});
