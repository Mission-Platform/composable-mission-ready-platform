import { encode } from "@mission-platform/qr-code-encode-wasm";
import { describe, expect, it } from "vitest";

import { decode } from ".";

// Importing the module above triggers the synchronous WebAssembly
// instantiation path; these smoke tests assert the public TS contract rather
// than re-testing the Rust decoder (covered in `crates/qr-code-decode`). The
// encoder emits `[version, size, ...modules]`; the decoder consumes
// `[size, ...modules]`, so the leading version byte is dropped before decoding.
describe("@mission-platform/qr-code-decode-wasm", () => {
  it("exposes a callable decode export", () => {
    expect(typeof decode).toBe("function");
  });

  it("round-trips an encoded matrix back to its text", () => {
    const packed = encode("HELLO WORLD", 1);
    expect(packed).toBeInstanceOf(Uint8Array);
    const matrix = packed!.slice(1); // drop the version byte
    expect(decode(matrix)).toBe("HELLO WORLD");
  });

  it("returns undefined for an undecodable matrix", () => {
    expect(decode(new Uint8Array([5, 1, 0, 1, 0, 1]))).toBeUndefined();
  });
});
