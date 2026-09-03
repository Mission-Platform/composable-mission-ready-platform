import { describe, expect, it } from 'vitest';

import { encodeBarcode } from '../encoder';

import { load as loadCode93, loadSync as loadCode93Sync } from './code93.fws';

describe('native Code 93 FWS encoder', () => {
  it('matches standard Code 93 output and validation behavior', () => {
    const code93 = loadCode93Sync();

    expect(code93.encode_code93('CODE93')).toBe(encodeBarcode('code93', 'CODE93').modules.join(''));
    expect(code93.encode_code93('code93')).toBe(encodeBarcode('code93', 'code93').modules.join(''));
    expect(code93.encode_code93('')).toBe('');
    expect(code93.encode_code93('A*B')).toBe('');
  });

  it('matches extended Code 93 output across ASCII boundaries', () => {
    const code93 = loadCode93Sync();

    for (const value of ['Hello, World!', '\u0000', '\u001F', ' ', '~', '\u007F']) {
      expect(code93.encode_code93_extended(value), JSON.stringify(value)).toBe(
        encodeBarcode('code93ext', value).modules.join(''),
      );
    }

    expect(code93.encode_code93_extended('')).toBe('');
    expect(code93.encode_code93_extended('é')).toBe('');
  });

  it('uses the direct string ABI through the asynchronous loader', async () => {
    const code93 = await loadCode93();

    expect(code93.encode_code93('NATIVE-93')).toBe(encodeBarcode('code93', 'NATIVE-93').modules.join(''));
    expect(code93.encode_code93_extended('Code 93')).toBe(encodeBarcode('code93ext', 'Code 93').modules.join(''));
  });
});
