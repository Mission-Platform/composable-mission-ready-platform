import { describe, expect, it } from "vitest";

import { LUA_DIFFERENTIAL_FIXTURES } from "../fixtures/differential.js";
import { runWebLuaDifferential } from "./differential.js";

describe("WebLua differential corpus", () => {
  it("checks every curated fixture against its declared guest outcome", async () => {
    const report = await runWebLuaDifferential(LUA_DIFFERENTIAL_FIXTURES);

    expect(report.results).toHaveLength(LUA_DIFFERENTIAL_FIXTURES.length);
    expect(report.results.every((result) => result.webMatches)).toBe(true);

    if (report.oracle.status === "unavailable") {
      console.warn(`Native Lua oracle unavailable: ${report.oracle.reason}`);
    } else {
      expect(report.results.every((result) => result.nativeMatches)).toBe(true);
    }
  });

  it("retains explicit failure classifications instead of treating them as skips", async () => {
    const report = await runWebLuaDifferential(
      LUA_DIFFERENTIAL_FIXTURES.filter((fixture) =>
        fixture.expected.kind.endsWith("error"),
      ),
    );

    expect(report.results.map((result) => result.web.kind)).toEqual([
      "syntax-error",
      "runtime-error",
    ]);
    expect(report.results.every((result) => result.webMatches)).toBe(true);
  });
});
