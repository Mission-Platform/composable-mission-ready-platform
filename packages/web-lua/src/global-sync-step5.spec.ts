import { describe, expect, it } from "vitest";

import { createWebLuaRuntime } from "./runtime.js";

describe("WebLua Step 5 global synchronization", () => {
  it("exposes an assigned global through rawget", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    expect(
      state.execute('_port=true; return rawget(_G, "_port")'),
    ).toMatchObject({
      kind: "result",
      status: 0,
      values: [1],
    });
    state.close();
  }, 120_000);

  it("preserves the all.lua _port policy expression across chunks", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    expect(state.execute('return rawget(_G, "_port") or false')).toMatchObject({
      kind: "result",
      status: 0,
      values: [0],
    });
    expect(state.execute("_port=true")).toMatchObject({
      kind: "result",
      status: 0,
    });
    expect(state.execute('return rawget(_G, "_port") or false')).toMatchObject({
      kind: "result",
      status: 0,
      values: [1],
    });
    state.close();
  }, 120_000);
});
