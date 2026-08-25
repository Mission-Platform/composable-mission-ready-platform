import { describe, expect, it } from "vitest";

import { createWebLuaRuntime } from "./runtime.js";

describe("WebLua gc.lua parenthesized call-statement regression", () => {
  it("executes the exact gc.lua construct: (Message or print)(...)", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    expect(
      state.execute(
        "captured = nil\nlocal function report(x) captured = x end\n(nil or report)(42)\nreturn captured",
      ),
    ).toMatchObject({
      kind: "result",
      status: 0,
      values: [42],
    });

    state.close();
  }, 120_000);

  it("supports a parenthesized function-value call statement", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    expect(
      state.execute(
        "local total = 0\nlocal function add(n) total = total + n end\n(add)(5);\n(add)(7)\nreturn total",
      ),
    ).toMatchObject({
      kind: "result",
      status: 0,
      values: [12],
    });

    state.close();
  }, 120_000);

  it("rejects a bare non-call parenthesized expression statement", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    expect(state.execute("(1 + 2)\nreturn 1")).toMatchObject({
      kind: "error",
      status: 1,
    });

    state.close();
  }, 120_000);
});
