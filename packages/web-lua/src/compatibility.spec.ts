import { describe, expect, it } from "vitest";

import {
  WEB_LUA_COMPATIBILITY_MATRIX,
  compatibilitySummary,
  renderCompatibilityMatrixMarkdown,
} from "./compatibility.js";

describe("WebLua compatibility matrix", () => {
  it("classifies every tracked area and includes evidence", () => {
    expect(WEB_LUA_COMPATIBILITY_MATRIX.length).toBeGreaterThan(0);
    expect(
      WEB_LUA_COMPATIBILITY_MATRIX.every(
        (entry) => entry.evidence.length > 0 && entry.notes.length > 0,
      ),
    ).toBe(true);

    const summary = compatibilitySummary(WEB_LUA_COMPATIBILITY_MATRIX);
    expect(summary.total).toBe(WEB_LUA_COMPATIBILITY_MATRIX.length);
    expect(summary.matched + summary.capabilityGated + summary.unresolved).toBe(
      summary.total,
    );
    expect(summary.unresolved).toBeGreaterThan(0);
  });

  it("renders an auditable markdown report without silent omissions", () => {
    const markdown = renderCompatibilityMatrixMarkdown(
      WEB_LUA_COMPATIBILITY_MATRIX,
    );

    expect(markdown).toContain("WebLua Lua 5.5.1 Compatibility Matrix");
    expect(markdown).toContain("| unresolved |");
    for (const entry of WEB_LUA_COMPATIBILITY_MATRIX)
      expect(markdown).toContain(`| ${entry.area} |`);
  });
});
