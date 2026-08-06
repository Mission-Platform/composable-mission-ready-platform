import { encode } from "@mission-platform/barcode-encode-wasm";
import { describe, expect, it } from "vitest";

import { decode } from ".";

// Importing the module above triggers the synchronous WebAssembly
// instantiation path; these smoke tests assert the public TS contract rather
// than re-testing the Rust decoder (covered in `crates/barcode-decode`). The
// sibling encoder produces the exact module-bit run the decoder consumes, so a
// round-trip proves both the load path and the export wiring.
describe("@mission-platform/barcode-decode-wasm", () => {
  it("exposes a callable decode export", () => {
    expect(typeof decode).toBe("function");
  });

  it("round-trips an encoded payload back to its text", () => {
    const bits = encode("code128", "1234");
    expect(bits).toBeInstanceOf(Uint8Array);
    expect(decode("code128", bits!)).toBe("1234");
  });

  it("returns undefined for an unknown symbology or invalid run", () => {
    const bits = encode("code128", "1234")!;
    expect(decode("not-a-symbology", bits)).toBeUndefined();
    expect(decode("code128", new Uint8Array([1, 0, 1, 0]))).toBeUndefined();
  });
});
