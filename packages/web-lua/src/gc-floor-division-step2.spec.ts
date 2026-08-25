import { describe, expect, it } from "vitest";

import { createWebLuaRuntime } from "./runtime.js";

describe("WebLua gc.lua floor-division regression", () => {
  it("executes the gc.lua long-string bound using math.maxinteger and //", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    expect(
      state.execute(
        "local k = math.min(300, (math.maxinteger // 80) // 2)\nreturn k",
      ),
    ).toMatchObject({
      kind: "result",
      status: 0,
      values: [300],
    });

    state.close();
  }, 120_000);

  it("executes the later gc.lua integer-division assertion operand", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    expect(state.execute("return 10000 // 4")).toMatchObject({
      kind: "result",
      status: 0,
      values: [2500],
    });

    state.close();
  }, 120_000);
});
