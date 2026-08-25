import { describe, expect, it } from "vitest";

import { createWebLuaRuntime } from "./runtime.js";

describe("WebLua gc.lua table-constructor semicolon regression", () => {
  it("accepts ';' as a table-field separator", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    expect(
      state.execute("local t = {1; 2; 3}\nreturn t[1], t[2], t[3]"),
    ).toMatchObject({
      kind: "result",
      status: 0,
      values: [1, 2, 3],
    });

    state.close();
  }, 120_000);

  it("executes the exact gc.lua construct mixing ';' with computed table/nil keys", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    expect(
      state.execute(
        "local m = {}\nm.x = {[{0}] = 1; [0] = {1}}; setmetatable(m.x, {__mode = 'kv'})\nreturn m.x[0][1]",
      ),
    ).toMatchObject({
      kind: "result",
      status: 0,
      values: [1],
    });

    state.close();
  }, 120_000);

  it("allows a trailing ';' before the closing brace", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    expect(
      state.execute("local t = {1, 2, 3;}\nreturn t[1], t[2], t[3]"),
    ).toMatchObject({
      kind: "result",
      status: 0,
      values: [1, 2, 3],
    });

    state.close();
  }, 120_000);
});
