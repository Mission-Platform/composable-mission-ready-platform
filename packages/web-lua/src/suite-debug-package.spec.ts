import { describe, expect, it } from "vitest";

import { createWebLuaRuntime } from "./runtime.js";

describe("portable suite debug and package startup", () => {
  it("supports packsize sizes used by the portable suite", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    expect(state.execute('return string.packsize("j")')).toMatchObject({
      kind: "result",
      ok: true,
      status: 0,
      result: runtime.integerValue(8),
      values: [runtime.integerValue(8)],
    });
    expect(state.execute('return string.packsize("n")')).toMatchObject({
      kind: "result",
      ok: true,
      status: 0,
      result: runtime.integerValue(8),
      values: [runtime.integerValue(8)],
    });

    state.close();
  });

  it("loads debug and accepts the suite hook setup", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const required = state.execute('return require("debug")');
    expect(required).toMatchObject({
      kind: "result",
      ok: true,
      status: 0,
      values: [expect.any(Number)],
    });
    expect(required.result).toBeGreaterThan(0);
    const hook = state.execute(
      'local debug = require("debug"); debug.sethook(function() end, "cr")',
    );
    expect(hook).toMatchObject({
      kind: "result",
      ok: true,
      status: 0,
    });
    expect(
      state.execute('local debug = require("debug"); debug.sethook(nil, "cr")'),
    ).toMatchObject({
      kind: "error",
      ok: false,
      status: 2,
    });
    expect(
      state.execute(
        'local debug = require("debug"); debug.sethook(function() end)',
      ),
    ).toMatchObject({
      kind: "error",
      ok: false,
      status: 2,
    });
    expect(
      state.execute(
        'local debug = require("debug"); debug.sethook(function() end, "x")',
      ),
    ).toMatchObject({
      kind: "error",
      ok: false,
      status: 2,
    });

    state.close();
  });

  it("reuses formatted strings in concatenation and later formatting", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    expect(state.execute('return string.format("%.1f", 1024)')).toMatchObject({
      kind: "result",
      ok: true,
      status: 0,
      values: [expect.any(Number)],
    });
    expect(
      state.execute('return string.format("%.1f", 1024) .. "K"'),
    ).toMatchObject({
      kind: "result",
      ok: true,
      status: 0,
      values: [expect.any(Number)],
    });
    expect(
      state.execute(
        'local value = string.format("%.1f", 1024) .. "K"; return string.format("%s %s", value, 0)',
      ),
    ).toMatchObject({
      kind: "result",
      ok: true,
      status: 0,
      values: [expect.any(Number)],
    });

    state.close();
  });
});
