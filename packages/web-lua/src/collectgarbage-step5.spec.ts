import { describe, expect, it } from "vitest";

import { createWebLuaRuntime } from "./runtime.js";

describe("WebLua Step 5 collectgarbage", () => {
  it("preserves the no-argument no-result behavior", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    expect(state.execute("return collectgarbage()")).toMatchObject({
      kind: "result",
      status: 0,
      values: [],
    });
    state.close();
  }, 120_000);

  it("returns an integer count for mode calls used by showmem", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const modeFrame = state.execute('return collectgarbage("count")');
    expect(modeFrame).toMatchObject({
      kind: "result",
      status: 0,
      values: [1],
    });

    const frame = state.execute(`
      local function showmem()
        local m = collectgarbage("count") * 1024
        local max = 0
        m = (m > max) and m or max
        return m
      end
      return collectgarbage("count") * 1024, showmem()
    `);

    expect(frame).toMatchObject({
      kind: "result",
      status: 0,
      values: [1024, 1024],
    });
    state.close();
  }, 120_000);
});
