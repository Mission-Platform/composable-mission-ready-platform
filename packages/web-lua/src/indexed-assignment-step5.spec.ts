import { describe, expect, it } from "vitest";

import { createWebLuaRuntime } from "./runtime.js";

describe("WebLua Step 5 indexed assignment", () => {
  it("writes a numeric index", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    expect(state.execute("local t={}; t[#t+1]=7; return t[1]")).toMatchObject({
      kind: "result",
      status: 0,
      values: [7],
    });
    state.close();
  }, 120_000);

  it("writes a string index", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    expect(
      state.execute('local t={}; t["answer"]=9; return t["answer"]'),
    ).toMatchObject({
      kind: "result",
      status: 0,
      values: [9],
    });
    state.close();
  }, 120_000);

  it("rejects non-table and nil-index operands", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    expect(state.execute("local t=1; t[1]=2")).toMatchObject({
      kind: "error",
      status: 2,
    });
    expect(state.execute("local t={}; t[nil]=2")).toMatchObject({
      kind: "error",
      status: 2,
    });
    state.close();
  }, 120_000);
});
