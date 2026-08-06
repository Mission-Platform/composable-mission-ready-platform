import { describe, expect, it } from "vitest";

import { build_info, encode } from ".";

// Importing the module above triggers the synchronous WebAssembly
// instantiation path; these smoke tests assert the public TS contract rather
// than re-testing the Rust encoder (covered in `crates/matrix-code-encode`).
describe("@mission-platform/matrix-code-encode-wasm", () => {
  it("exposes callable exports", () => {
    expect(typeof encode).toBe("function");
    expect(typeof build_info).toBe("function");
  });

  it("reports a human-readable build stamp", () => {
    const info = build_info();
    expect(typeof info).toBe("string");
    expect(info.length).toBeGreaterThan(0);
  });

  it("encodes a payload into a packed [width, height, ...modules] buffer", () => {
    const packed = encode("datamatrix", "1234");
    expect(packed).toBeInstanceOf(Uint8Array);
    const width = packed![0];
    const height = packed![1];
    expect(packed!.length).toBe(2 + width * height);
  });

  it("returns undefined for an unknown symbology", () => {
    expect(encode("not-a-symbology", "1234")).toBeUndefined();
  });
});
