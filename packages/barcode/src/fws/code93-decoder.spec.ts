import { describe, expect, it } from 'vitest';

import { load as loadCode93, loadSync as loadCode93Sync } from './code93.fws';

const standardPayloads = ['CODE93', 'hello-93', '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%'] as const;
const asciiPayloads = Array.from({ length: 128 }, (_, index) => String.fromCharCode(index));

const moduleBits = (value: string): number[] => Array.from(value, Number);

describe('native Code 93 FWS decoder', () => {
  it.each(standardPayloads)('round-trips %s', (payload) => {
    const code93 = loadCode93Sync();
    const moduleString = code93.encode_code93(payload);

    expect(code93.decode_code93(moduleBits(moduleString))).toBe(payload.toUpperCase());
  });

  it.each(asciiPayloads)('round-trips extended ASCII %j', (payload) => {
    const code93 = loadCode93Sync();
    const moduleString = code93.encode_code93_extended(payload);

    expect(code93.decode_code93_extended(moduleBits(moduleString))).toBe(payload);
  });

  it('rejects invalid framing, patterns, and checksums', () => {
    const code93 = loadCode93Sync();
    const modules = code93.encode_code93('CODE93');

    expect(code93.decode_code93([])).toBe('');
    expect(code93.decode_code93(moduleBits(modules.slice(1)))).toBe('');
    expect(code93.decode_code93(moduleBits(`${modules.slice(0, -1)}0`))).toBe('');
    expect(code93.decode_code93(moduleBits(`${modules.slice(0, 9)}0${modules.slice(10)}`))).toBe('');
    expect(code93.decode_code93(moduleBits(`${modules.slice(0, 63)}0${modules.slice(64)}`))).toBe('');
    expect(code93.decode_code93(moduleBits(`${modules.slice(0, 18)}2${modules.slice(19)}`))).toBe('');
  });

  it('provides the same decoder through the asynchronous loader', async () => {
    const modules = (await loadCode93()).encode_code93_extended('Async-93!');

    expect((await loadCode93()).decode_code93_extended(moduleBits(modules))).toBe('Async-93!');
  });
});
