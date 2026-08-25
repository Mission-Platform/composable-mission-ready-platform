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

describe("WebLua Step 5 concatenation memory", () => {
  it("concatenates formatted strings with a suffix", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const frame = state.execute('return string.format("%.1f", 1.2).."K"');

    expect(frame).toMatchObject({ kind: "result", status: 0 });
    if (frame.kind === "result")
      expect(guestString(runtime, frame.values[0])).toBe("1.2K");
    state.close();
  }, 120_000);

  it("preserves formatted suffixes through a helper function", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const frame = state.execute(
      'local function F(m) return string.format("%.1f", m).."K" end; return F(1.2)',
    );

    expect(frame).toMatchObject({ kind: "result", status: 0 });
    if (frame.kind === "result")
      expect(guestString(runtime, frame.values[0])).toBe("1.2K");
    state.close();
  }, 120_000);

  it("keeps ordinary, raw, and tagged string concatenation working", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const frame = state.execute(
      'local function F(value) return value end; return "web".."lua", [[raw]].."K", F"tagged".."K"',
    );

    expect(frame).toMatchObject({ kind: "result", status: 0 });
    if (frame.kind === "result")
      expect(frame.values.map((value) => guestString(runtime, value))).toEqual([
        "weblua",
        "rawK",
        "taggedK",
      ]);
    state.close();
  }, 120_000);

  it("preserves status 2 when concatenation allocation fails", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();
    const loaded = state.load('return "web".."lua"');

    if (loaded.kind !== "loaded") throw new Error(loaded.message);
    runtime.setAllocationLimit(state.handle, 1);
    const frame = state.call(loaded);

    expect(frame).toMatchObject({ kind: "error", status: 2 });
    state.close();
  }, 120_000);
});
