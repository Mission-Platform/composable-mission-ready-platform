import { describe, expect, it } from "vitest";

import { createWebLuaRuntime } from "./runtime.js";

describe("WebLua gc.lua computed table-key regression", () => {
  it("executes the exact gc.lua construct: setmetatable({[t] = 1}, {__mode = 'k'})", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    expect(
      state.execute(
        "local t = {x = 10}\nlocal C1 = setmetatable({[t] = 1}, {__mode = 'k'})\nreturn C1[t]",
      ),
    ).toMatchObject({
      kind: "result",
      status: 0,
      values: [1],
    });

    state.close();
  }, 120_000);

  it("resolves a string-valued computed key alongside a positional entry", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    expect(
      state.execute(
        "local key = 'dyn'\nlocal t = {10, [key] = 5, 20}\nreturn t[1], t.dyn, t[2]",
      ),
    ).toMatchObject({
      kind: "result",
      status: 0,
      values: [10, 5, 20],
    });

    state.close();
  }, 120_000);

  it("resolves an arithmetic computed integer key", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    expect(
      state.execute("local i = 2\nlocal t = {[i + 1] = 99}\nreturn t[3]"),
    ).toMatchObject({
      kind: "result",
      status: 0,
      values: [99],
    });

    state.close();
  }, 120_000);

  it("supports adjacent table literals each with a computed key", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    expect(
      state.execute(
        "local a = {[1 + 1] = 'a2'}\nlocal b = {[2 + 1] = 'b3'}\nreturn a[2], b[3]",
      ),
    ).toMatchObject({
      kind: "result",
      status: 0,
      values: [expect.any(Number), expect.any(Number)],
    });

    state.close();
  }, 120_000);
});
