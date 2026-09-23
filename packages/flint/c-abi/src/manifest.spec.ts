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
});
