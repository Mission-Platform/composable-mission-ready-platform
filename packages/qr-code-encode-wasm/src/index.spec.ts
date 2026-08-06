import { describe, expect, it } from "vitest";

import { build_info, encode, encode_micro_qr, encode_rmqr } from ".";

// Importing the module above triggers the synchronous WebAssembly
// instantiation path; these smoke tests assert the public TS contract rather
// than re-testing the Rust encoder (covered in `crates/qr-code-encode`).
describe("@mission-platform/qr-code-encode-wasm", () => {
  it("exposes callable exports", () => {
    expect(typeof encode).toBe("function");
    expect(typeof encode_micro_qr).toBe("function");
    expect(typeof encode_rmqr).toBe("function");
    expect(typeof build_info).toBe("function");
  });

  it("reports a human-readable build stamp", () => {
    const info = build_info();
    expect(typeof info).toBe("string");
    expect(info.length).toBeGreaterThan(0);
  });

  it("encodes text into a packed [version, size, ...modules] matrix", () => {
    const packed = encode("HELLO WORLD", 1);
    expect(packed).toBeInstanceOf(Uint8Array);
    // [version, size, ...modules]; modules are size*size entries.
    const size = packed![1];
    expect(packed!.length).toBe(2 + size * size);
  });

  it("returns undefined when the payload is too long to fit", () => {
    expect(encode("x".repeat(10_000), 3)).toBeUndefined();
  });
});
