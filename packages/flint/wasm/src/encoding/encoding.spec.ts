import { describe, expect, it } from 'vitest';

import { section, SECTION_IDS, WasmSectionBuilder } from '../emitter/section-builder.js';

import { appendF32, appendF64, CANONICAL_F32_NAN_BYTES, CANONICAL_F64_NAN_BYTES, vector, wasmString } from './bytes.js';
import { signedLeb, signedLeb128, unsignedLeb, unsignedLeb128 } from './leb128.js';

describe('flint-wasm binary encoding', () => {
  describe('LEB128 encoding', () => {
    it('encodes unsigned values correctly', () => {
      expect(unsignedLeb(0)).toEqual([0x00]);
      expect(unsignedLeb128(1)).toEqual([0x01]);
      expect(unsignedLeb(127)).toEqual([0x7f]);
      expect(unsignedLeb(128)).toEqual([0x80, 0x01]);
      expect(unsignedLeb(624485)).toEqual([0xe5, 0x8e, 0x26]);
    });

    it('encodes signed values correctly', () => {
      expect(signedLeb(0)).toEqual([0x00]);
      expect(signedLeb128(1)).toEqual([0x01]);
      expect(signedLeb(-1)).toEqual([0x7f]);
      expect(signedLeb(-64)).toEqual([0x40]);
      expect(signedLeb(-65)).toEqual([0xbf, 0x7f]);
      expect(signedLeb(624485)).toEqual([0xe5, 0x8e, 0x26]);
      expect(signedLeb(-624485)).toEqual([0x9b, 0xf1, 0x59]);
    });
  });

  describe('Byte & Float packaging', () => {
    it('appends little-endian floats and canonicalizes NaNs', () => {
      expect(appendF32(Number.NaN)).toEqual([...CANONICAL_F32_NAN_BYTES]);
      expect(appendF64(Number.NaN)).toEqual([...CANONICAL_F64_NAN_BYTES]);

      const f32Zero = appendF32(0);
      expect(f32Zero).toEqual([0, 0, 0, 0]);

      const f64One = appendF64(1.0);
      expect(f64One).toHaveLength(8);
    });

    it('creates vector and string payloads with LEB128 prefixes', () => {
      const vec = vector([10, 20, 30]);
      expect(vec).toEqual([3, 10, 20, 30]);

      const str = wasmString('abc');
      expect(str).toEqual([3, 97, 98, 99]);
    });
  });

  describe('Section Builders', () => {
    it('frames sections with ID and length prefix', () => {
      const sec = section(SECTION_IDS.type, [0x60, 0x00, 0x00]);
      expect(sec).toEqual([1, 3, 0x60, 0x00, 0x00]);
    });

    it('assembles multi-section modules via WasmSectionBuilder', () => {
      const builder = new WasmSectionBuilder();
      builder.addSection(SECTION_IDS.type, [0x60, 0x00, 0x00]);
      builder.addCustomSection('test', [1, 2, 3]);

      const bytes = builder.build();
      expect(bytes.length).toBeGreaterThan(0);
      expect(bytes[0]).toBe(1); // type section
    });
  });
});
