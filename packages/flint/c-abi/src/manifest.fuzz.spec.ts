import { describe, expect, it } from "vitest";

import {
  decodeCbor,
  decodeCborAbiManifest,
  encodeCbor,
  encodeCborAbiManifest,
  type FlintCborManifest,
} from "./manifest.js";

/**
 * Deterministic PRNG (Xorshift32) for reproducible fuzzing seeds.
 */
class FuzzPrng {
  private state: number;

  public constructor(seed = 0x13_37_be_ef) {
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

// skipcq: JS-R1005
function generateRandomCborValue(
  currentDepth: number,
  prng: FuzzPrng,
): unknown {
  if (currentDepth > 5) return prng.nextInt(-1000, 1000);
  const typeChoice = prng.nextInt(0, 5);
  switch (typeChoice) {
    case 0: {
      return prng.nextInt(-100_000, 100_000);
    }
    case 1: {
      return prng.nextFloat() * 1000;
    }
    case 2: {
      return prng.nextInt(0, 1) === 1;
    }
    case 3: {
      return `str_${prng.nextUint32().toString(16)}`;
    }
    case 4: {
      const arrayLength = prng.nextInt(0, 6);
      const array: unknown[] = [];
      for (let index = 0; index < arrayLength; index += 1) {
        array.push(generateRandomCborValue(currentDepth + 1, prng));
      }
      return array;
    }
    default: {
      const mapLength = prng.nextInt(0, 5);
      const object: Record<string, unknown> = {};
      for (let index = 0; index < mapLength; index += 1) {
        object[`k_${prng.nextUint32().toString(16)}`] = generateRandomCborValue(
          currentDepth + 1,
          prng,
        );
      }
      return object;
    }
  }
}

describe("Binary Manifest & CBOR Fuzz Testing (Target 1)", () => {
  const prng = new FuzzPrng(0xca_fe_be_be);

  const validManifest: FlintCborManifest = {
    format: "forge-web-script-module",
    languageVersion: "1.0",
    abiVersion: "1.2",
    entryModule: "main.flint",
    exports: [
      {
        name: "compute",
        parameters: [
          { name: "input", type: "string", ownership: "borrowed" },
          { name: "count", type: "i32", ownership: "borrowed" },
        ],
        result: "i32",
        resultOwnership: "owned",
      },
    ],
    imports: [],
    memory: {
      pageSize: 65_536,
      addressType: "u32",
      ownership: "caller-owned",
      stringEncoding: "utf8",
      byteArrayRepresentation: "pointer-length",
      allocatorExport: "fws_alloc",
      deallocatorExport: "fws_dealloc",
      reallocatorExport: "fws_realloc",
    },
  };

  it("fuzzes random byte streams against decodeCbor without unhandled runtime panics", () => {
    for (let iteration = 0; iteration < 2000; iteration += 1) {
      const length = prng.nextInt(0, 512);
      const randomPayload = prng.nextBytes(length);

      try {
        const decoded = decodeCbor(randomPayload);
        expect(decoded).toBeDefined();
      } catch (error) {
        // Must only throw standard expected RangeError, TypeError, or Error, never unhandled panics or stack overflow
        expect(error).toBeInstanceOf(Error);
      }
    }
  });

  // skipcq: JS-R1005
  it("fuzzes bit-flip and byte truncation mutations of valid CBOR manifests", () => {
    const canonicalBytes = encodeCborAbiManifest(validManifest);

    for (let iteration = 0; iteration < 1000; iteration += 1) {
      const mutated = new Uint8Array(canonicalBytes);
      const mutationType = prng.nextInt(0, 3);

      switch (mutationType) {
        case 0: {
          // Random bit flips
          const flips = prng.nextInt(1, 5);
          for (let index = 0; index < flips; index += 1) {
            const position = prng.nextInt(0, mutated.length - 1);
            mutated[position] ^= 1 << prng.nextInt(0, 7);
          }
          break;
        }
        case 1: {
          // Random byte truncation
          const cut = prng.nextInt(1, mutated.length - 1);
          const truncated = mutated.subarray(0, cut);
          try {
            decodeCborAbiManifest(truncated);
          } catch (error) {
            expect(error).toBeInstanceOf(Error);
          }
          continue;
        }
        case 2: {
          // Random byte overwrite
          const position = prng.nextInt(0, mutated.length - 1);
          mutated[position] = prng.nextInt(0, 255);
          break;
        }
        default: {
          // Random byte injection
          const insertPosition = prng.nextInt(0, mutated.length);
          const injected = new Uint8Array(mutated.length + 4);
          injected.set(mutated.subarray(0, insertPosition), 0);
          injected.set(prng.nextBytes(4), insertPosition);
          injected.set(mutated.subarray(insertPosition), insertPosition + 4);
          try {
            decodeCborAbiManifest(injected);
          } catch (error) {
            expect(error).toBeInstanceOf(Error);
          }
          continue;
        }
      }

      try {
        const result = decodeCborAbiManifest(mutated);
        expect(result).toBeDefined();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    }
  });

  // skipcq: JS-R1005
  it("fuzzes malicious prototype pollution injection payloads", () => {
    const maliciousKeys = [
      "__proto__",
      "constructor",
      "prototype",
      "__defineGetter__",
      "__defineSetter__",
      "__lookupGetter__",
      "__lookupSetter__",
      "valueOf",
      "toString",
    ];

    for (const key of maliciousKeys) {
      const encodedKey = new TextEncoder().encode(key);
      // Construct a CBOR map with 1 entry using the key
      const payload = new Uint8Array([
        0xa1, // Map of 1 item
        0x60 + Math.min(23, encodedKey.length), // Text string
        ...(encodedKey.length > 23 ? [encodedKey.length] : []),
        ...encodedKey,
        0x01, // Integer 1
      ]);

      if (key === "__proto__" || key === "constructor" || key === "prototype") {
        expect(() => decodeCbor(payload)).toThrow(TypeError);
      } else {
        const result = decodeCbor<Record<string, unknown>>(payload);
        expect(result[key]).toBe(1);
      }

      // Assert host prototype remains unpolluted
      expect((Object.prototype as Record<string, unknown>)[key]).not.toBe(1);
    }
  });

  it("fuzzes recursive and deeply nested data structures to enforce recursion limits", () => {
    for (let depth = 50; depth <= 100; depth += 5) {
      // Create nested array of depth N: 0x81 (array of 1 item) repeated depth times followed by 0x00 (int 0)
      const payload = new Uint8Array(depth + 1);
      payload.fill(0x81, 0, depth);
      payload[depth] = 0x00;

      if (depth > 64) {
        expect(() => decodeCbor(payload)).toThrow(RangeError);
      } else {
        const decoded = decodeCbor(payload);
        expect(decoded).toBeDefined();
      }
    }
  });

  it("fuzzes roundtrip integrity for randomly generated nested JSON-compatible structures", () => {
    for (let index = 0; index < 200; index += 1) {
      const value = generateRandomCborValue(0, prng);
      const encoded = encodeCbor(value);
      const decoded = decodeCbor(encoded);

      if (typeof value === "number" && !Number.isInteger(value)) {
        expect(decoded).toBeCloseTo(value, 3);
      } else {
        expect(decoded).toEqual(value);
      }
    }
  });

  it("fuzzes strict canonical map ordering and duplicate key rejection", () => {
    // Encoded map with sorted keys
    const validCanonicalMap = encodeCbor({ alpha: 1, beta: 2, gamma: 3 });
    const decodedValid = decodeCbor(validCanonicalMap, {
      strictCanonical: true,
    });
    expect(decodedValid).toEqual({ alpha: 1, beta: 2, gamma: 3 });

    // Manually constructed map with non-canonical (out of order) keys: 'zeta' before 'alpha'
    const nonCanonicalMap = new Uint8Array([
      0xa2, // Map of 2 items
      0x64,
      0x7a,
      0x65,
      0x74,
      0x61, // "zeta"
      0x01,
      0x65,
      0x61,
      0x6c,
      0x70,
      0x68,
      0x61, // "alpha"
      0x02,
    ]);

    expect(() =>
      decodeCbor(nonCanonicalMap, { strictCanonical: true }),
    ).toThrow(TypeError);

    // Manually constructed map with duplicate key 'alpha'
    const duplicateKeyMap = new Uint8Array([
      0xa2, // Map of 2 items
      0x65,
      0x61,
      0x6c,
      0x70,
      0x68,
      0x61, // "alpha"
      0x01,
      0x65,
      0x61,
      0x6c,
      0x70,
      0x68,
      0x61, // "alpha"
      0x02,
    ]);

    expect(() =>
      decodeCbor(duplicateKeyMap, { strictCanonical: true }),
    ).toThrow(TypeError);
  });
});
