import { describe, expect, it } from 'vitest';

import { Cursor, parseLimits, parseWasm } from './binary-parser.js';
import { compileFlintWasm } from './emitter.js';
import { verifyFlintWasmArtifact } from './verifier.js';

class FuzzPrng {
  private state: number;

  public constructor(seed = 0xde_ad_be_ef) {
    this.state = seed || 1;
  }

  public nextUint32(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return this.state;
  }

  public nextFloat(): number {
    return this.nextUint32() / 0x1_00_00_00_00;
  }

  public nextInt(min: number, max: number): number {
    return min + Math.floor(this.nextFloat() * (max - min + 1));
  }

  public nextBytes(length: number): Uint8Array {
    const bytes = new Uint8Array(length);
    for (let index = 0; index < length; index += 1) {
      bytes[index] = this.nextUint32() & 0xff;
    }
    return bytes;
  }
}

describe('WebAssembly Binary Parser & Verifier Fuzz Testing (Target 1)', () => {
  const prng = new FuzzPrng(0x11_22_33_44);

  it('fuzzes LEB128 32-bit and 64-bit integer decoding with arbitrary and malformed byte streams', () => {
    for (let index = 0; index < 2000; index += 1) {
      const length = prng.nextInt(0, 15);
      const rawBytes = prng.nextBytes(length);
      const cursor32 = new Cursor(rawBytes);

      try {
        const value32 = cursor32.leb(5);
        expect(typeof value32).toBe('number');
        expect(Number.isSafeInteger(value32)).toBe(true);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      const cursor64 = new Cursor(rawBytes);
      try {
        const value64 = cursor64.leb64(10);
        expect(typeof value64).toBe('bigint');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    }
  });

  it('fuzzes parseLimits with random flag patterns and integer boundaries', () => {
    for (let index = 0; index < 1000; index += 1) {
      const length = prng.nextInt(1, 20);
      const rawBytes = prng.nextBytes(length);
      const cursor = new Cursor(rawBytes);

      try {
        const limits = parseLimits(cursor);
        expect(limits).toBeDefined();
        if (limits.maximum !== undefined) {
          expect(limits.maximum).toBeDefined();
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    }
  });

  it('fuzzes parseWasm with arbitrary random byte buffers', () => {
    for (let index = 0; index < 1000; index += 1) {
      const length = prng.nextInt(0, 1024);
      const randomWasm = prng.nextBytes(length);

      try {
        const wasmModule = parseWasm(randomWasm, 1024 * 1024);
        expect(wasmModule).toBeDefined();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    }
  });

  it('fuzzes verifyFlintWasmArtifact with corrupted and mutated WebAssembly binaries', () => {
    const span = { start: 0, end: 1, line: 1, column: 1, endLine: 1, endColumn: 2 };
    const ir = {
      name: 'entry',
      imports: [],
      sourceImports: [],
      functions: [
        {
          name: 'compute',
          exported: true,
          parameters: [],
          result: { name: 'i32' },
          body: [{ kind: 'return' as const, value: { kind: 'literal' as const, value: 42, type: 'i32', span }, span }],
          span,
        },
      ],
      span,
    };
    const metadata = { compilerVersion: 'test', optimization: 'debug' as const, sourceFiles: ['entry.flint'] };
    const memory = {
      pageSize: 65_536,
      addressType: 'u32' as const,
      ownership: 'caller-owned' as const,
      stringEncoding: 'utf8' as const,
      byteArrayRepresentation: 'pointer-length' as const,
      allocatorExport: 'fws_alloc',
      deallocatorExport: 'fws_dealloc',
      reallocatorExport: 'fws_realloc',
    };
    const manifest = {
      exports: [{ name: 'compute', parameters: [], result: 'i32' }],
      imports: [],
      requiredCapabilities: [],
      memory,
    };

    const validWasm = compileFlintWasm({
      ir,
      optimizedIr: ir,
      abi: {},
      links: {},
      metadata,
    });

    if (!validWasm.wasm) {
      throw new Error('Failed to compile baseline Wasm for fuzzing');
    }

    const baselineBytes = validWasm.wasm;

    for (let index = 0; index < 500; index += 1) {
      const mutated = new Uint8Array(baselineBytes);
      const mutationCount = prng.nextInt(1, 10);

      for (let mutationIndex = 0; mutationIndex < mutationCount; mutationIndex += 1) {
        const targetIndex = prng.nextInt(0, mutated.length - 1);
        mutated[targetIndex] = prng.nextInt(0, 255);
      }

      // Verifier should return a verification report with diagnostics, never unhandled throw
      const report = verifyFlintWasmArtifact({
        wasm: mutated,
        manifest,
        metadata,
      });

      expect(report).toBeDefined();
      expect(typeof report.verified).toBe('boolean');
      expect(Array.isArray(report.diagnostics)).toBe(true);
    }
  });

  it('fuzzes zero-copy slice bounds arithmetic across arbitrary randomized boundaries and overflow targets', async () => {
    const { encodeSliceRegisterTriplet, validateSliceBounds } = await import('./codegen/abi.js');

    for (let index = 0; index < 2000; index += 1) {
      const pointer = prng.nextInt(-1000, 0xff_ff_ff_ff + 1000);
      const length = prng.nextInt(-100, 0xff_ff_ff_ff);
      const capacity = prng.nextInt(-100, 0xff_ff_ff_ff);

      const isValid = validateSliceBounds(pointer, length, capacity);
      const expectedValid =
        pointer >= 0 && length >= 0 && capacity >= 0 && length <= capacity && pointer + capacity <= 0xff_ff_ff_ff;

      expect(isValid).toBe(expectedValid);

      if (expectedValid) {
        const triplet = encodeSliceRegisterTriplet(pointer, length, capacity);
        expect(triplet.pointer).toBe(pointer);
        expect(triplet.length).toBe(length);
        expect(triplet.capacity).toBe(capacity);
      } else {
        expect(() => encodeSliceRegisterTriplet(pointer, length, capacity)).toThrow(RangeError);
      }
    }
  });

  it('fuzzes custom section length and count bombs preventing pre-allocation memory exhaustion', async () => {
    const { parseWasm } = await import('./binary-parser.js');

    // Craft binary with Wasm header + deceptive section declaring large count
    const wasmHeader = [0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00];

    for (let test = 0; test < 100; test += 1) {
      const sectionId = prng.nextInt(0, 10);
      const fakeLength = prng.nextInt(100_000, 10_000_000);
      // Byte array with header and LEB128 fake length without payload
      const crafted = new Uint8Array([
        ...wasmHeader,
        sectionId,
        (fakeLength & 0x7f) | 0x80,
        ((fakeLength >> 7) & 0x7f) | 0x80,
        ((fakeLength >> 14) & 0x7f) | 0x80,
        (fakeLength >> 21) & 0x7f,
      ]);

      expect(() => parseWasm(crafted, 1024 * 1024)).toThrow();
    }
  });
});
