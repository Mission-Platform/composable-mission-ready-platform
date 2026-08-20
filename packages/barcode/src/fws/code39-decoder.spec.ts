import { describe, expect, it } from 'vitest';

import { encodeBarcode } from '../encoder';
import { load as loadCode39, loadSync as loadCode39Sync } from './code39.fws';

const moduleBits = (value: string): number[] => Array.from(value, Number);

describe('native Code 39 FWS decoder', () => {
  it('matches standard decoding and canonical framing', () => {
    const code39 = loadCode39Sync();
    const modules = encodeBarcode('code39', 'hello-39').modules.join('');

    expect(code39.decode_code39(moduleBits(modules))).toBe('HELLO-39');
    expect(code39.decode_code39(encodeBarcode('code39', 'A B').modules)).toBe('A B');
    expect(code39.decode_code39(encodeBarcode('code39', '').modules)).toBe('');
  });

  it('matches extended decoding across printable and control ASCII', () => {
    const code39 = loadCode39Sync();

    for (const value of ['Hello, World!', '\u0000', '\u001f', ' ', '~', '\u007f']) {
      const modules = encodeBarcode('code39ext', value).modules.join('');
      expect(code39.decode_code39_extended(moduleBits(modules)), JSON.stringify(value)).toBe(value);
    }
  });

  it('rejects malformed module runs and invalid extended sequences', () => {
    const code39 = loadCode39Sync();
    const modules = encodeBarcode('code39', 'CODE39').modules.join('');

    expect(code39.decode_code39([])).toBe('');
    expect(code39.decode_code39(moduleBits(modules.slice(1)))).toBe('');
    expect(code39.decode_code39(moduleBits(modules.slice(0, -1) + '0'))).toBe('');
    expect(code39.decode_code39(moduleBits(modules.slice(0, 15) + (modules[15] === '1' ? '0' : '1') + modules.slice(16)))).toBe('');

    const extended = encodeBarcode('code39ext', 'A').modules.join('');
    expect(code39.decode_code39_extended(moduleBits(extended))).toBe('A');
    expect(code39.decode_code39_extended(encodeBarcode('code39', '$').modules)).toBe('');
  });

  it('provides the same decoder through the asynchronous loader', async () => {
    const code39 = await loadCode39();
    const modules = encodeBarcode('code39ext', 'Async-39!').modules;

    expect(code39.decode_code39_extended(modules)).toBe('Async-39!');
    expect(code39.decode_code39(modules)).toBe('A+S+Y+N+C-39/A');
  });
});
