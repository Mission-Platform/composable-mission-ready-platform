import { describe, expect, it } from "vitest";

import { createWebLuaRuntime } from "./runtime.js";

describe("WebLua gc.lua exponentiation regression", () => {
  it("executes the gc.lua long-string bound using exponentiation", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    expect(
      state.execute("local bound = 2^22\nreturn bound == 4194304"),
    ).toMatchObject({
      kind: "result",
      status: 0,
      values: [1],
    });

    state.close();
  }, 120_000);

  it("uses Lua power precedence, unary exponents, and right associativity", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const frame = state.execute(
      "return -2^2 == -4, 2^-2 == 0.25, 2^2^3 == 256",
    );
    expect(frame).toMatchObject({ kind: "result", status: 0 });
    if (frame.kind === "result") {
      expect(frame.values).toEqual([1, 1, 1]);
    }

    state.close();
  }, 120_000);
});
