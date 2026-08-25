import { describe, expect, it } from "vitest";

import { createWebLuaRuntime } from "./runtime.js";

/**
 * Regression for the real gc.lua construct at line 271:
 *   a[1], a[2], a[3] = x, y, z
 * which previously failed load with syntax-error (status 1).
 */
describe("WebLua Step 2 multi-assign indexed LHS from gc.lua", () => {
  it("parses and executes a[1], a[2], a[3] = x, y, z", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const source = `
local a = {}
local x, y, z = 11, 22, 33
a[1], a[2], a[3] = x, y, z
return a[1], a[2], a[3]
`;

    expect(state.execute(source)).toMatchObject({
      kind: "result",
      status: 0,
      values: [11, 22, 33],
    });
    state.close();
  }, 120_000);

  it("supports mixed name and indexed multi-assign targets", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const source = `
local t = {}
local a, b
a, t[1], b = 7, 8, 9
return a, t[1], b
`;

    expect(state.execute(source)).toMatchObject({
      kind: "result",
      status: 0,
      values: [7, 8, 9],
    });
    state.close();
  }, 120_000);

  it("keeps plain name multi-assign working", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    expect(
      state.execute(
        "local x, y, z = 1, 2, 3; x, y, z = z, y, x; return x, y, z",
      ),
    ).toMatchObject({
      kind: "result",
      status: 0,
      values: [3, 2, 1],
    });
    state.close();
  }, 120_000);
});
