import { describe, expect, it } from 'vitest';

import { load as loadCodabar, loadSync as loadCodabarSync } from './codabar.fws';

const payloads = ['123-456', '0123456789-$:/.+', '40156', '7'] as const;

const moduleBits = (value: string): number[] => Array.from(value, Number);

describe('native Codabar FWS decoder', () => {
  it.each(payloads)('round-trips %s', (payload) => {
    const codabar = loadCodabarSync();
    const modules = moduleBits(codabar.encode_codabar(payload));

    expect(codabar.decode_codabar(modules)).toBe(payload);
  });

  it('rejects invalid framing and inter-character synchronization', () => {
    const codabar = loadCodabarSync();
    const modules = codabar.encode_codabar('123-456');

    expect(codabar.decode_codabar([])).toBe('');
    expect(codabar.decode_codabar(moduleBits(`0${modules}`))).toBe('');
    expect(codabar.decode_codabar(moduleBits(`${modules}0`))).toBe('');
    expect(codabar.decode_codabar(moduleBits(`${modules.slice(0, 11)}1${modules.slice(12)}`))).toBe('');
    expect(codabar.decode_codabar(moduleBits(`${modules.slice(0, -1)}0`))).toBe('');
    expect(codabar.decode_codabar(moduleBits(`${modules.slice(0, 20)}2${modules.slice(21)}`))).toBe('');
  });

  it('provides the same decoder through the asynchronous loader', async () => {
    const codabar = await loadCodabar();
    const modules = moduleBits(codabar.encode_codabar('123-7'));

    expect(codabar.decode_codabar(modules)).toBe('123-7');
  });
});
