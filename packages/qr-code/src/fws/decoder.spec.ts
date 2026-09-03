import { describe, expect, it } from 'vitest';

import { loadSync as loadEncoderSync } from './qr-encoder.fws';
import { loadSync, manifest, type ForgeQrDecoderImports } from './qr-decoder.fws';

const textDecoder = new TextDecoder('utf-8', { fatal: true });

const decoderImports: ForgeQrDecoderImports = {
  'qr.decode.utf8': {
    decode_utf8(value: string): string {
      const bytes = new Uint8Array(value.length / 3);
      for (let index = 0; index < bytes.length; index += 1)
        bytes[index] = Number(value.slice(index * 3, index * 3 + 3));
      try {
        return `1${textDecoder.decode(bytes)}`;
      } catch {
        return '';
      }
    },
  },
};

function matrixFromPacked(encoded: { version: number; size: number; modules: readonly number[] }): Uint8Array {
  expect(encoded.version).toBeGreaterThan(0);
  const size = encoded.size;
  const words = Math.ceil((size * size) / 32);
  expect(encoded.modules).toHaveLength(words);
  const matrix = new Uint8Array(1 + size * size);
  matrix[0] = size;
  for (let index = 0; index < size * size; index += 1)
    matrix[1 + index] = (encoded.modules[Math.floor(index / 32)]! >>> (index % 32)) & 1;
  return matrix;
}

function decodePacked(matrix: Uint8Array): string | null {
  const decoder = loadSync(decoderImports);
  const result = decoder.decode_qr(matrix);
  return result === '' ? null : result.slice(1);
}

describe('QR decoder FWS graph', () => {
  it('publishes a manifest and decodes a known payload through the packed matrix ABI', () => {
    const encoder = loadEncoderSync();
    const packed = matrixFromPacked(encoder.encode_qr(1, 'DECODE ME'));

    expect(manifest).toBeDefined();
    expect(JSON.stringify(manifest)).toContain('qr.decode.utf8');
    expect(decodePacked(packed)).toBe('DECODE ME');
  });

  it('decodes UTF-8 payloads from the real encoder output', () => {
    const encoder = loadEncoderSync();
    const packed = matrixFromPacked(encoder.encode_qr(2, 'héllo — wörld 🚀'));

    expect(decodePacked(packed)).toBe('héllo — wörld 🚀');
  });

  it('recovers a damaged matrix within Reed–Solomon capacity', () => {
    const encoder = loadEncoderSync();
    const text = 'ERROR CORRECTION';
    const packed = matrixFromPacked(encoder.encode_qr(3, text));
    const size = packed[0];

    for (let y = Math.floor(size / 2); y < Math.floor(size / 2) + 4; y += 1) {
      for (let x = Math.floor(size / 2); x < Math.floor(size / 2) + 3; x += 1) packed[1 + y * size + x] ^= 1;
    }

    expect(decodePacked(packed)).toBe(text);
  });

  it('returns failure for malformed and garbage matrices', () => {
    const malformed = new Uint8Array([21, 1, 0, 1]);
    expect(decodePacked(malformed)).toBeNull();

    const size = 21;
    const garbage = new Uint8Array(1 + size * size);
    garbage[0] = size;
    for (let index = 1; index < garbage.length; index += 1) garbage[index] = (Math.imul(index, 0x9e3779b1) >>> 13) & 1;
    expect(decodePacked(garbage)).toBeNull();
  });
});
