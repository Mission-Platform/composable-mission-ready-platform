import { describe, expect, it } from 'vitest';

import { decodeMatrix, type MatrixCode } from '../index';
import { load, loadSync, manifest } from './matrix-encoder.fws';

function parsePacked(symbology: MatrixCode['symbology'], packed: string): MatrixCode {
  const [widthRaw, heightRaw, modulesRaw = ''] = packed.split(',');
  const width = Number.parseInt(widthRaw, 10);
  const height = Number.parseInt(heightRaw, 10);
  const modules = Array.from(modulesRaw, (module) => (module === '1' ? 1 : 0));
  expect(modules).toHaveLength(width * height);
  return { symbology, width, height, modules };
}

describe('matrix encoder FWS artifact', () => {
  it('exposes a manifest and RS sanity hooks for the shared GF(256) path', () => {
    const encoder = loadSync();
    expect(manifest).toBeDefined();
    expect(encoder.__test_gf256_exp(1)).toBe(2);
    expect(encoder.__test_gf256_mul(2, 2)).toBe(4);
    expect(encoder.__test_string_byte_at('123456', 0)).toBe(49);
    expect(encoder.__test_byte_char3(142)).toBe('142');
    expect(encoder.__test_ascii_codewords('123456')).toBe('142164186');
    expect(encoder.__test_bytes_get(encoder.__test_ascii_codewords('123456'), 0)).toBe(142);
    expect(encoder.__test_dm_10x10_message('123456')).toBe('142164186114025005088102');
    // ISO 253-state pad at 1-based position 3 → 70; full 10×10 message for "A".
    expect(encoder.__test_pad_codeword_at(3)).toBe(70);
    expect(encoder.__test_dm_10x10_message('A')).toBe('066129070138234082082095');
  });

  it('emits a decodable packed Data Matrix symbol', () => {
    const encoder = loadSync();
    const packed = encoder.encode_matrix(0, '123456');
    const code = parsePacked('datamatrix', packed);
    expect(packed).toMatch(/^10,10,[01]+$/);
    expect(decodeMatrix(code)).toBe('123456');
    expect(encoder.encode_matrix(0, '')).toBe('');
  });

  it('loads the same ABI asynchronously for Aztec output', async () => {
    const encoder = await load();
    const packed = encoder.encode_matrix(3, 'HELLO');
    expect(packed).toMatch(/^\d+,\d+,[01]+$/);
    const code = parsePacked('aztec', packed);
    expect(code.width).toBe(code.height);
    expect(decodeMatrix(code)).toBe('HELLO');
    expect(encoder.encode_matrix(3, '')).toBe('');
  });
});
