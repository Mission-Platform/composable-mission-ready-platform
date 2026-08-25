import { describe, expect, it } from "vitest";

import { createWebLuaRuntime } from "./runtime.js";

describe("WebLua Step 2 collectgarbage mode semantics", () => {
  it("reports isrunning as truthy and matches the real gc.lua mode-switch chain", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    // Mirrors gc.lua:8-18 verbatim.
    const frame = state.execute(`
      assert(collectgarbage("isrunning"))
      collectgarbage()
      local oldmode = collectgarbage("incremental")
      assert(collectgarbage("generational") == "incremental")
      assert(collectgarbage("generational") == "generational")
      assert(collectgarbage("incremental") == "generational")
      assert(collectgarbage("incremental") == "incremental")
      return 1
    `);
    expect(frame).toMatchObject({ kind: "result", status: 0, values: [1] });

    state.close();
  }, 120_000);

  it("preserves the historical no-result contract for a bare collectgarbage() call", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    expect(state.execute("return collectgarbage()")).toMatchObject({
      kind: "result",
      status: 0,
      values: [],
    });

    state.close();
  }, 120_000);

  it("supports collectgarbage('count') as a usable number in arithmetic", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    // Matches gc.lua's `gcinfo()` helper: collectgarbage"count" * 1024.
    const frame = state.execute(`
      local m = collectgarbage("count") * 1024
      assert(m == 1024)
      return 1
    `);
    expect(frame).toMatchObject({
      kind: "result",
      status: 0,
      values: [1],
    });

    state.close();
  }, 120_000);

  it("supports collectgarbage('param', ...) get/set for pause and stepmul", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const frame = state.execute(`
      collectgarbage("incremental")
      local opause = collectgarbage("param", "pause", 100)
      local ostepmul = collectgarbage("param", "stepmul", 100)
      assert(collectgarbage("param", "pause") == 100)
      assert(collectgarbage("param", "stepmul") == 100)
      collectgarbage("param", "pause", 200)
      assert(collectgarbage("param", "pause") == 200)
      collectgarbage("param", "pause", opause)
      collectgarbage("param", "stepmul", ostepmul)
      return 1
    `);
    expect(frame).toMatchObject({ kind: "result", status: 0, values: [1] });

    state.close();
  }, 120_000);

  it("treats stop/restart/step/collect as deterministic no-ops", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const frame = state.execute(`
      collectgarbage("stop")
      collectgarbage("restart")
      collectgarbage("step", 100)
      collectgarbage("collect")
      return 1
    `);
    expect(frame).toMatchObject({ kind: "result", status: 0, values: [1] });

    state.close();
  }, 120_000);
});
