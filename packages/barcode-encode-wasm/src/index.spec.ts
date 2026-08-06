import { describe, expect, it } from "vitest";

import { build_info, encode } from ".";

// Importing the module above triggers the synchronous WebAssembly
// instantiation path; these smoke tests assert the public TS contract rather
// than re-testing the Rust encoder (covered in `crates/barcode-encode`).
describe("@mission-platform/barcode-encode-wasm", () => {
  it("exposes callable exports", () => {
    expect(typeof encode).toBe("function");
    expect(typeof build_info).toBe("function");
  });

  it("reports a human-readable build stamp", () => {
    const info = build_info();
    expect(typeof info).toBe("string");
    expect(info.length).toBeGreaterThan(0);
  });

  it("encodes a valid payload to a run of module bits", () => {
    const bits = encode("code128", "1234");
    expect(bits).toBeInstanceOf(Uint8Array);
    expect(bits!.length).toBeGreaterThan(0);
    // The run is a flat sequence of `1`/`0` module bits.
    expect(bits!.every((bit) => bit === 0 || bit === 1)).toBe(true);
  });

  it("returns undefined for an unknown symbology", () => {
    expect(encode("not-a-symbology", "1234")).toBeUndefined();
  });
});
