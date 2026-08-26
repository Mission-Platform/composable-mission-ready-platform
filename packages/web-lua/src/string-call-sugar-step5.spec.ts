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

describe("WebLua Step 5 string call sugar", () => {
  it("calls a local function with a short string literal", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const frame = state.execute(
      'local function f(value) return value end; return f"ok"',
    );

    expect(frame).toMatchObject({ kind: "result", status: 0 });
    if (frame.kind === "result")
      expect(guestString(runtime, frame.values[0])).toBe("ok");
    state.close();
  }, 120_000);

  it("calls a local function with a long string literal", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const frame = state.execute(
      String.raw`local function f(value) return value end; return f[[long\nstring]]`,
    );

    expect(frame).toMatchObject({ kind: "result", status: 0 });
    if (frame.kind === "result")
      expect(guestString(runtime, frame.values[0])).toBe(String.raw`long\nstring`);
    state.close();
  }, 120_000);

  it("reports a runtime error when string sugar targets a non-callable", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    expect(state.execute('local value = 1; return value"nope"')).toMatchObject({
      kind: "error",
      status: 2,
    });
    state.close();
  }, 120_000);

  it("preserves parenthesized, indexed, and method calls", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const frame = state.execute(
      'local function f(value) return value end; local t = { f = f, method = function(self, value) return value end }; return (f)("parenthesized"), t.f("indexed"), t:method("method")',
    );

    expect(frame).toMatchObject({ kind: "result", status: 0 });
    if (frame.kind === "result")
      expect(frame.values.map((value) => guestString(runtime, value))).toEqual([
        "parenthesized",
        "indexed",
        "method",
      ]);
    state.close();
  }, 120_000);

  it("allows a member call after string call sugar", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const sugarFrame = state.execute('return require"tracegc".start()');
    const ordinaryFrame = state.execute('return require("tracegc").start()');

    expect(sugarFrame).toMatchObject({ kind: "result", status: 0 });
    expect(ordinaryFrame).toMatchObject({ kind: "result", status: 0 });
    if (sugarFrame.kind === "result" && ordinaryFrame.kind === "result")
      expect(sugarFrame.values).toEqual(ordinaryFrame.values);
    state.close();
  }, 120_000);

  it("allows string call sugar nested in a call argument", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const frame = state.execute('assert(os.setlocale"C")');
    const ordinaryFrame = state.execute('assert(os.setlocale("C"))');

    expect(frame).toMatchObject({ kind: "result", status: 0 });
    expect(ordinaryFrame).toMatchObject({ kind: "result", status: 0 });
    state.close();
  }, 120_000);
});
