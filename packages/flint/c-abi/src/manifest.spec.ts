import { describe, expect, it } from "vitest";

import {
  canonicalizeAbiManifest,
  decodeCborAbiManifest,
  encodeCborAbiManifest,
  validateAbiManifest,
  type FlintCAbiManifest,
} from "./manifest.js";

describe("Flint C-ABI Manifest Serialization and Validation", () => {
  it("validates a well-formed ABI manifest", () => {
    const manifest: FlintCAbiManifest = {
      format: "forge-web-script-module",
      languageVersion: "1.0",
      abiVersion: "1.2",
      moduleName: "test",
      exports: [],
      imports: [],
      sourceImports: [],
      requiredCapabilities: [],
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
      valueRepresentations: {
        bool: "bool-i32",
        bytes: "pointer-length-u32",
        f32: "f32",
        f64: "f64",
        i32: "i32",
        i64: "i64",
        string: "pointer-length-u32",
        u32: "u32",
        u64: "u64",
        unit: "unit",
      },
      trapModel: "explicit-trap",
      standardLibrary: { version: "1.0", hash: "abc" },
      aggregateLayouts: [],
      enumDeclarations: [],
      collectionLayouts: [],
      specializations: [],
      iteratorDescriptors: [],
      boundsChecks: "runtime",
    };

    const validation = validateAbiManifest(manifest);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
  });

  it("detects invalid format in ABI manifest", () => {
    const invalidManifest = {
      format: "invalid-format",
      languageVersion: "1.0",
      abiVersion: "1.2",
    };

    const validation = validateAbiManifest(
      invalidManifest as unknown as FlintCAbiManifest,
    );
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  it("roundtrips ABI manifest through binary CBOR encoding and decoding", () => {
    const manifest: FlintCAbiManifest = {
      format: "forge-web-script-module",
      languageVersion: "1.0",
      abiVersion: "1.2",
      moduleName: "cbor_roundtrip",
      count: 42,
      flags: [true, false],
    };

    const encoded = encodeCborAbiManifest(manifest);
    expect(encoded).toBeInstanceOf(Uint8Array);
    expect(encoded.length).toBeGreaterThan(0);

    const decoded = decodeCborAbiManifest(encoded);
    expect(decoded).toEqual(manifest);
  });

  it("canonicalizes key ordering deterministically", () => {
    const uncanonical = {
      z: 1,
      a: 2,
      m: { y: 3, b: 4 },
    };

    const canonical = canonicalizeAbiManifest(uncanonical);
    expect(Object.keys(canonical)).toEqual(["a", "m", "z"]);
    expect(Object.keys(canonical.m)).toEqual(["b", "y"]);
  });
});
