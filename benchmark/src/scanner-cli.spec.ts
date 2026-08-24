import { describe, expect, it } from "vitest";

import { parseArguments, selectScannerCases } from "./scanner-cli.ts";

describe("scanner benchmark CLI", () => {
  it("selects one known-good 640×480 case for smoke runs", () => {
    const options = parseArguments(["--smoke"]);
    expect(options.smoke).toBe(true);
    expect(selectScannerCases(options).map(({ id }) => id)).toEqual([
      "qr-640x480-full",
    ]);
  });

  it("selects an explicitly requested representative case", () => {
    const options = parseArguments(["--case", "qr-1280x720-roi"]);
    expect(selectScannerCases(options).map(({ id }) => id)).toEqual([
      "qr-1280x720-roi",
    ]);
  });

  it("rejects unknown scanner cases", () => {
    expect(() =>
      selectScannerCases({ caseId: "qr-unsupported", smoke: undefined }),
    ).toThrow("Unknown scanner case: qr-unsupported");
  });
});
