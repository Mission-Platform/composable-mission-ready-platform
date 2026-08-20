import { describe, expect, it } from 'vitest';

import { encodeBarcode } from '../encoder';
import { load as loadCode128, loadSync as loadCode128Sync } from './code128.fws';

describe('native Code 128 FWS encoder', () => {
  it('matches Code B output for printable mixed ASCII', () => {
    const code128 = loadCode128Sync();

    expect(code128.encode_code128('Hello 123')).toBe(encodeBarcode('code128', 'Hello 123').modules.join(''));
    expect(code128.encode_code128('ABC-123')).toBe(encodeBarcode('code128', 'ABC-123').modules.join(''));
  });

  it('matches the Code C fast path and modulo-103 checksum framing', () => {
    const code128 = loadCode128Sync();
    const modules = code128.encode_code128('1234');

    expect(modules).toBe(encodeBarcode('code128', '1234').modules.join(''));
    expect(modules).toHaveLength(57);
    expect(modules).toMatch(/^1[01]+$/);
  });

  it('matches GS1-128 FNC1 output for Code B and Code C payloads', () => {
    const code128 = loadCode128Sync();

    expect(code128.encode_gs1_128('010950110153000317')).toBe(
      encodeBarcode('gs1-128', '010950110153000317').modules.join(''),
    );
    expect(code128.encode_gs1_128('ABC-123')).toBe(encodeBarcode('gs1-128', 'ABC-123').modules.join(''));
  });

  it('rejects empty and non-printable input', () => {
    const code128 = loadCode128Sync();

    expect(code128.encode_code128('')).toBe('');
    expect(code128.encode_code128('A\nB')).toBe('');
    expect(code128.encode_gs1_128('')).toBe('');
    expect(code128.encode_gs1_128('\u007f')).toBe('');
  });

  it('uses the direct string ABI through the asynchronous loader', async () => {
    const code128 = await loadCode128();

    expect(code128.encode_code128('123456')).toBe(encodeBarcode('code128', '123456').modules.join(''));
  });
});
