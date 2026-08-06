import { encode } from "@mission-platform/matrix-code-encode-wasm";
import { describe, expect, it } from "vitest";

import { decode } from ".";

// Importing the module above triggers the synchronous WebAssembly
// instantiation path; these smoke tests assert the public TS contract rather
// than re-testing the Rust decoder (covered in `crates/matrix-code-decode`).
// The encoder emits the exact `[width, height, ...modules]` buffer the decoder
// consumes, so a round-trip proves both the load path and the export wiring.
describe("@mission-platform/matrix-code-decode-wasm", () => {
  it("exposes a callable decode export", () => {
    expect(typeof decode).toBe("function");
  });

  it("round-trips an encoded matrix back to its payload", () => {
    const matrix = encode("datamatrix", "1234");
    expect(matrix).toBeInstanceOf(Uint8Array);
    expect(decode("datamatrix", matrix!)).toBe("1234");
  });

  it("returns undefined for an unknown symbology or malformed buffer", () => {
    const matrix = encode("datamatrix", "1234")!;
    expect(decode("not-a-symbology", matrix)).toBeUndefined();
    expect(
      decode("datamatrix", new Uint8Array([2, 2, 1, 0, 1, 0])),
    ).toBeUndefined();
  });
});
