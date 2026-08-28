import { describe, expect, it } from "vitest";

import { createWebLuaRuntime } from "./runtime.js";

function guestString(
  runtime: Awaited<ReturnType<typeof createWebLuaRuntime>>,
  value: number,
): string {
  expect(runtime.valueKind(value)).toBe("string");
  const handle = runtime.valuePayload(value);
  return String.fromCharCode(
    ...Array.from({ length: runtime.stringSize(handle) }, (_, index) =>
      runtime.stringByte(handle, index),
    ),
  );
}

describe("WebLua Step 5 format and dump/load", () => {
  it("formats the startup-suite verbs", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const frame = state.execute(
      'return string.format("%d:%g:%s:%%:%.1f", 42, 1.25, "ok", 3.14)',
    );

    expect(frame).toMatchObject({
      kind: "result",
      status: 0,
      values: [expect.any(Number)],
    });
    if (frame.kind === "result")
      expect(guestString(runtime, frame.values[0])).toBe("42:1.25:ok:%:3.1");
    state.close();
  });

  it("formats integer and float values with %s", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const frame = state.execute('return string.format("%s:%s", 42, 1.25)');

    expect(frame).toMatchObject({
      kind: "result",
      status: 0,
      values: [expect.any(Number)],
    });
    if (frame.kind === "result")
      expect(guestString(runtime, frame.values[0])).toBe("42:1.25");
    state.close();
  });

  it("formats zero with fixed-point precision", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const frame = state.execute('return string.format("%.1f", 0)');

    expect(frame).toMatchObject({
      kind: "result",
      status: 0,
      values: [expect.any(Number)],
    });
    if (frame.kind === "result")
      expect(guestString(runtime, frame.values[0])).toBe("0.0");
    state.close();
  });

  it("round-trips a loaded closure through guest dump and load", async () => {
    const runtime = await createWebLuaRuntime({
      capabilities: ["lua.package.load"],
      hostAdapter: { invoke: () => new TextEncoder().encode("return 42") },
    });
    const state = runtime.openState();

    const frame = state.execute(
      'return load(string.dump(loadfile("x.lua")))()',
    );

    expect(frame).toMatchObject({
      kind: "result",
      status: 0,
      values: [42],
    });
    state.close();
  });

  it("loads and invokes a text chunk", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    expect(state.execute('return load("return 7", "")()')).toMatchObject({
      kind: "result",
      status: 0,
      values: [7],
    });
    state.close();
  });

  it("loads formatted dynamic source", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    expect(
      state.execute(
        'local source = string.format("return %d", 9); return load(source, "")()',
      ),
    ).toMatchObject({
      kind: "result",
      status: 0,
      values: [9],
    });
    state.close();
  });

  it("loads and invokes a dynamically defined function", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const loaded = state.execute('load("function temp(a) return 7 end", "")()');
    expect(loaded).toMatchObject({
      kind: "result",
      status: 0,
      values: [],
    });
    const frame = state.execute("return temp()");

    expect(frame).toMatchObject({
      kind: "result",
      status: 0,
      values: [expect.any(Number)],
    });
    if (frame.kind === "result") expect(frame.values[0]).toBe(7);
    state.close();
  });

  it("preserves dynamic functions inside a table method loop", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const frame = state.execute(`
      local limit = 5
      local a = {}
      function a:test()
        for i = 1, limit do
          load(string.format("function temp(a) return 'a%d' end", i), "")()
          assert(temp() == string.format("a%d", i))
        end
      end
      a:test()
      return 1
    `);
    expect(frame).toMatchObject({
      kind: "result",
      status: 0,
      values: [1],
    });
    state.close();
  });

  it("returns valid no-op tracegc and rejects malformed inputs", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    expect(state.execute('return require("tracegc").start()')).toMatchObject({
      kind: "result",
      status: 0,
      values: [0],
    });
    expect(state.execute("return string.dump(1)")).toMatchObject({
      kind: "error",
      status: 2,
    });
    expect(state.execute('return load("not-a-dump")')).toMatchObject({
      kind: "error",
      status: 1,
    });
    expect(state.execute('return string.format("%q", 1)')).toMatchObject({
      kind: "error",
      status: 2,
    });
    state.close();
  });
});
