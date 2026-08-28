import { describe, expect, it, vi } from "vitest";

import { createWebLuaRuntime } from "./runtime.js";

describe("WebLua Step 5 string equality", () => {
  it("compares equal raw string handles by content", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const frame = state.execute(
      'local version = "Lua 5.5"; return _VERSION == version',
    );

    expect(frame).toMatchObject({
      kind: "result",
      ok: true,
      status: 0,
      values: [1],
    });
    state.close();
  }, 120_000);

  it("compares unequal raw string handles by content", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const frame = state.execute(
      'local version = "Lua 5.5"; return version == "Lua 5.4", version ~= "Lua 5.4"',
    );

    expect(frame).toMatchObject({
      kind: "result",
      ok: true,
      status: 0,
      values: [0, 1],
    });
    state.close();
  }, 120_000);

  it('allows the all.lua version guard to fall through to print("start")', async () => {
    const output = vi.fn();
    const runtime = await createWebLuaRuntime({
      capabilities: ["lua.io.write"],
      hostAdapter: { output },
    });
    const state = runtime.openState();

    const frame = state.execute(
      'local version = "Lua 5.5"; if _VERSION ~= version then return 0 end; print("start"); return 1',
    );

    expect(frame).toMatchObject({
      kind: "result",
      ok: true,
      status: 0,
      values: [1],
    });
    expect(output.mock.calls.map(([event]) => event.message)).toEqual([
      "start",
    ]);
    state.close();
  }, 120_000);
});
