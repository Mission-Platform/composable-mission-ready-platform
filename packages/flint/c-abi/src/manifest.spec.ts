import { describe, expect, it } from "vitest";

import {
  decodeCbor,
  decodeCborAbiManifest,
  encodeCbor,
  encodeCborAbiManifest,
} from "./manifest.js";

describe("Binary CBOR encoder and decoder", () => {
  it("roundtrips primitive values, arrays, maps, and bigints", () => {
    const input = {
      name: "flint_test_module",
      version: 2,
      active: true,
      score: 99.5,
      flags: [1, 2, 3, 4],
      tags: { tier: "P0", stable: true },
      nullValue: undefined,
    };

    const encoded = encodeCbor(input);
    expect(encoded).toBeInstanceOf(Uint8Array);
    expect(encoded.byteLength).toBeGreaterThan(0);

    const decoded = decodeCbor<typeof input>(encoded);
    expect(decoded.name).toBe("flint_test_module");
    expect(decoded.version).toBe(2);
    expect(decoded.active).toBe(true);
    expect(decoded.score).toBeCloseTo(99.5);
    expect(decoded.flags).toEqual([1, 2, 3, 4]);
    expect(decoded.tags).toEqual({ tier: "P0", stable: true });
  });

  it("roundtrips Flint ABI manifest structures without data loss", () => {
    const sampleManifest = {
      format: "forge-web-script-module",
      languageVersion: "1.0",
      abiVersion: "1.2",
      entryModule: "main.flint",
      exports: [
        {
          name: "add",
          parameters: [
            { name: "left", type: "i32", ownership: "borrowed" },
            { name: "right", type: "i32", ownership: "borrowed" },
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
    } as const;

    const encoded = encodeCborAbiManifest(sampleManifest);
    const decoded = decodeCborAbiManifest(encoded);

    expect(decoded.format).toBe(sampleManifest.format);
    expect(decoded.exports).toHaveLength(1);
    expect(decoded.exports[0]?.name).toBe("add");
    expect(decoded.memory.allocatorExport).toBe("fws_alloc");
  });

  it("prevents prototype pollution via __proto__, constructor, and prototype keys", () => {
    // Manually construct CBOR map with __proto__ key: Major type 5 (map), 1 pair
    const maliciousPayload = new Uint8Array([
      0xa1, // Map with 1 pair
      0x69, // Text string of 9 bytes
      ...new TextEncoder().encode("__proto__"),
      0x65, // Text string of 5 bytes
      ...new TextEncoder().encode("owned"),
    ]);

    expect(() => decodeCbor(maliciousPayload)).toThrow(TypeError);
    expect(({} as Record<string, unknown>).__proto__).not.toHaveProperty(
      "polluted",
    );
  });

  it("prevents unbounded recursion and deserialization bombs", () => {
    // Deeply nested array exceeding MAX_CBOR_DEPTH (64)
    const nested = new Uint8Array(70).fill(0x81); // Array of 1 element repeated 70 times
    expect(() => decodeCbor(nested)).toThrow(RangeError);

    // Truncated string length payload
    const truncatedPayload = new Uint8Array([0x7a, 0x00, 0x01, 0x00, 0x00]); // String claiming 65536 bytes with 0 trailing
    expect(() => decodeCbor(truncatedPayload)).toThrow(RangeError);
  });
});
