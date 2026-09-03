import { describe, expect, it } from 'vitest';

import { decodeMatrix } from '../decoder';
import { encodeMatrix, type MatrixCode, type MatrixSymbology } from './index';

interface GoldenVector {
  readonly symbology: MatrixSymbology;
  readonly data: string;
  readonly width: number;
  readonly height: number;
  readonly modules: string;
}

// Committed encoder oracle outputs captured from the Rust implementation.
// Captured via encode(symbology, data) → [width, height, ...modules].join('').
const GOLDEN_VECTORS: readonly GoldenVector[] = [
  {
    symbology: 'datamatrix',
    data: 'A',
    width: 10,
    height: 10,
    modules: '1010101010110110001110001101001001101011100101000010010010111101001100110011110111000010001111111111',
  },
  {
    symbology: 'datamatrix',
    data: '123456',
    width: 10,
    height: 10,
    modules: '1010101010110010110111000001001100011101110000100010000011111110110000111101100110011101001111111111',
  },
  {
    symbology: 'gs1datamatrix',
    data: '0102345678901234',
    width: 16,
    height: 16,
    modules:
      '1010101010101010110100100110111110001010010111001011111100011111111101001000000010010110110111111100011101101100111100110011000110000011100001101100010101100001110010111011111011000001101111111100100111010000100011011001110110001000100010101111111111111111',
  },
  {
    symbology: 'datamatrixrectangular',
    data: '123456',
    width: 18,
    height: 8,
    modules:
      '101010101010101010110010000011000001110001001101111010110011000100011101111101100111001000101111000100010111100001111011011010111111111111111111',
  },
  {
    symbology: 'aztec',
    data: 'A',
    width: 15,
    height: 15,
    modules:
      '000110011100001111101101011101111100000010110101111111111111001100000001110001101111101100100101000101111100101010101111000101000101011001101111101100111100000001101110111111111111100000101000010001010111101110010010110001110',
  },
  {
    symbology: 'aztec',
    data: 'HELLO',
    width: 15,
    height: 15,
    modules:
      '001110111101011111000001100000111100001000101101111111111100000100000001001100101111101001100101000101100101101010101100011101000101101001101111101001000100000001111100111111111110000001010010001000100010001101111010101010111',
  },
];

function modulesString(code: MatrixCode): string {
  return code.modules.join('');
}

describe('encodeMatrix parity against Rust golden vectors', () => {
  for (const golden of GOLDEN_VECTORS) {
    it(`matches Rust modules for ${golden.symbology} ${JSON.stringify(golden.data)}`, () => {
      const code = encodeMatrix(golden.symbology, golden.data);
      expect(code.width).toBe(golden.width);
      expect(code.height).toBe(golden.height);
      expect(modulesString(code)).toBe(golden.modules);
    });
  }

  it('round-trips all golden vectors through the FWS decoder', () => {
    for (const golden of GOLDEN_VECTORS) {
      const code = encodeMatrix(golden.symbology, golden.data);
      expect(decodeMatrix(code)).toBe(golden.data);
    }
  });

  it('round-trips additional Aztec payloads including short and long', () => {
    for (const text of ['A', 'HELLO', 'https://mission-platform.dev', 'X'.repeat(40)]) {
      const code = encodeMatrix('aztec', text);
      expect(code.width).toBe(code.height);
      expect(decodeMatrix(code)).toBe(text);
    }
  });
});
