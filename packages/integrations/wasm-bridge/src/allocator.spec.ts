import { describe, expect, it } from 'vitest';

import {
  copyFromWasmBuffer,
  copyToWasmBuffer,
  decodeTripletBytes,
  decodeTriplets,
  decodeUtf8Triplets,
  encodeTriplets,
  parseTripletByte,
  rawReadUtf8,
  rawWriteUtf8,
  WasmMemoryBridge,
} from './allocator';

describe('WASM Allocator & Marshalling', () => {
  describe('Triplet encoding & decoding', () => {
    it('parses individual triplet bytes', () => {
      expect(parseTripletByte('000', 0)).toBe(0);
      expect(parseTripletByte('065', 0)).toBe(65);
      expect(parseTripletByte('255', 0)).toBe(255);
      expect(parseTripletByte('prefix042suffix', 6)).toBe(42);
      expect(() => parseTripletByte('999', 0)).toThrow(RangeError);
      expect(() => parseTripletByte('abc', 0)).toThrow(RangeError);
    });

    it('decodes multiple triplets to byte array', () => {
      const bytes = decodeTripletBytes('072105033'); // "Hi!"
      expect(Array.from(bytes)).toEqual([72, 105, 33]);
      expect(decodeTriplets('072105033')).toEqual([72, 105, 33]);
    });

    it('rejects invalid triplet slice lengths', () => {
      expect(() => decodeTripletBytes('12')).toThrow(RangeError);
      expect(() => decodeTripletBytes('1234')).toThrow(RangeError);
    });

    it('decodes triplets to UTF-8 strings', () => {
      expect(decodeUtf8Triplets('072105033')).toBe('Hi!');
      expect(decodeUtf8Triplets('081082032067111100101')).toBe('QR Code');
    });

    it('encodes byte arrays to triplet strings', () => {
      expect(encodeTriplets([72, 105, 33])).toBe('072105033');
      expect(encodeTriplets(new Uint8Array([0, 5, 255]))).toBe('000005255');
    });
  });

  describe('Linear Memory Marshalling', () => {
    it('reads and writes raw UTF-8 into WebAssembly.Memory', () => {
      const memory = new WebAssembly.Memory({ initial: 1 });
      const text = 'Hello WebAssembly!';
      const written = rawWriteUtf8(memory, 64, text);
      expect(written).toBe(text.length);

      const read = rawReadUtf8(memory, 64, written);
      expect(read).toBe(text);
    });

    it('copies byte arrays to and from linear memory', () => {
      const memory = new WebAssembly.Memory({ initial: 1 });
      const sample = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      copyToWasmBuffer(memory, 128, sample);

      const result = copyFromWasmBuffer(memory, 128, sample.length);
      expect(Array.from(result)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });
  });

  describe('WasmMemoryBridge class', () => {
    it('wraps memory and supports buffer lifecycle and views', () => {
      const memory = new WebAssembly.Memory({ initial: 1 });
      let allocatedPtr = 100;
      let freedPtr = 0;
      let resetCalled = false;

      const bridge = new WasmMemoryBridge({
        memory,
        fws_alloc: (size: number) => {
          allocatedPtr += size;
          return allocatedPtr;
        },
        fws_free: (ptr: number) => {
          freedPtr = ptr;
        },
        fws_reset: () => {
          resetCalled = true;
        },
      });

      expect(bridge.memory).toBe(memory);
      expect(bridge.buffer).toBe(memory.buffer);

      const ptr = bridge.allocate(32);
      expect(ptr).toBe(132);

      bridge.free(132);
      expect(freedPtr).toBe(132);

      bridge.reset();
      expect(resetCalled).toBe(true);

      bridge.writeUtf8(200, 'Mission Platform');
      expect(bridge.readUtf8(200, 16)).toBe('Mission Platform');

      const uint8 = bridge.getUint8View(200, 7);
      expect(new TextDecoder().decode(uint8)).toBe('Mission');

      const int32View = bridge.getInt32View(0, 4);
      expect(int32View.length).toBe(4);
    });

    it('throws when allocate is called on an instance without allocator export', () => {
      const memory = new WebAssembly.Memory({ initial: 1 });
      const bridge = new WasmMemoryBridge(memory);
      expect(() => bridge.allocate(64)).toThrow(/does not export an allocator/);
    });
  });
});
