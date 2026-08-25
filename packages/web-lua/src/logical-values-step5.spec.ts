import { describe, expect, it } from "vitest";

import { createWebLuaRuntime } from "./runtime.js";

describe("WebLua Step 5 logical value expressions", () => {
  it("preserves operand values for showmem short-circuit expressions", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    expect(
      state.execute(
        "local m = 2; local max = 1; return (m > max) and m or max",
      ),
    ).toMatchObject({
      kind: "result",
      status: 0,
      values: [2],
    });

    state.close();
  }, 120_000);
});
