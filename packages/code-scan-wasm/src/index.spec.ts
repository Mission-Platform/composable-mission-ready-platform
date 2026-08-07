import { describe, expect, it } from "vitest";

import {
  build_info,
  scan,
  scan_and_decode,
  scan_and_decode_all,
  scan_barcode,
  scan_matrix,
  scan_qr,
  ScanOutcome,
  ScanOutcomeList,
  start,
} from ".";

// Importing the module above triggers the synchronous WebAssembly
// instantiation path; these smoke tests assert the public TS contract rather
// than re-testing the Rust scanner (covered in `crates/code-scan`). A blank
// (all-white) luma frame contains no codes, so every locator returns the
// documented "nothing found" result.
const WIDTH = 32;
const HEIGHT = 32;
const blankLuma = new Uint8Array(WIDTH * HEIGHT).fill(255);

describe("@mission-platform/code-scan-wasm", () => {
  it("exposes callable exports and result classes", () => {
    expect(typeof build_info).toBe("function");
    expect(typeof start).toBe("function");
    expect(typeof scan).toBe("function");
    expect(typeof scan_and_decode).toBe("function");
    expect(typeof scan_and_decode_all).toBe("function");
    expect(typeof scan_and_decode).toBe("function");
    expect(typeof scan_barcode).toBe("function");
    expect(typeof scan_matrix).toBe("function");
    expect(typeof scan_qr).toBe("function");
    expect(typeof ScanOutcome).toBe("function");
    expect(typeof ScanOutcomeList).toBe("function");
  });

  it("reports a human-readable build stamp", () => {
    const info = build_info();
    expect(typeof info).toBe("string");
    expect(info.length).toBeGreaterThan(0);
  });

  it("initialises diagnostics without throwing", () => {
    expect(() => start()).not.toThrow();
  });

  it("finds no codes in a blank frame", () => {
    expect(scan(WIDTH, HEIGHT, blankLuma)).toBeUndefined();
    expect(scan_and_decode(WIDTH, HEIGHT, blankLuma)).toBeUndefined();
    expect(scan_qr(WIDTH, HEIGHT, blankLuma)).toBeUndefined();
    expect(scan_matrix(WIDTH, HEIGHT, blankLuma)).toBeUndefined();
    expect(scan_barcode(WIDTH, HEIGHT, blankLuma)).toBeUndefined();
  });

  it("returns an empty outcome list for a blank frame", () => {
    const outcomes = scan_and_decode_all(WIDTH, HEIGHT, blankLuma);
    expect(outcomes).toBeInstanceOf(ScanOutcomeList);
    expect(outcomes.length).toBe(0);
  });
});
