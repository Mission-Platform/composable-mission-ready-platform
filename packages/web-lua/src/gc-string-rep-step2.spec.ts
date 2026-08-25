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

describe("WebLua gc.lua string.rep regression", () => {
  it("keeps math.floor results tagged as Lua integers", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const frame = state.execute("return math.floor(5.5), math.floor(7.25)");
    expect(frame).toMatchObject({ kind: "result", status: 0 });
    if (frame.kind === "result") {
      expect(runtime.valueKind(frame.values[0])).toBe("integer");
      expect(runtime.valuePayload(frame.values[0])).toBe(5);
      expect(runtime.valueKind(frame.values[1])).toBe("integer");
      expect(runtime.valuePayload(frame.values[1])).toBe(7);
    }

    state.close();
  }, 120_000);

  it("repeats strings from float counts and optional separators", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const frame = state.execute(
      'return string.rep("ab", 2^2, ":"), string.rep("x", 0)',
    );
    expect(frame).toMatchObject({ kind: "result", status: 0 });
    if (frame.kind === "result") {
      expect(guestString(runtime, frame.values[0])).toBe("ab:ab:ab:ab");
      expect(guestString(runtime, frame.values[1])).toBe("");
    }

    state.close();
  }, 120_000);

  it("uses repeated long strings as table keys like gc.lua", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    expect(
      state.execute(
        'local a = {}; a[string.rep("a", 2^12)] = 25; return a[string.rep("a", 2^12)]',
      ),
    ).toMatchObject({
      kind: "result",
      status: 0,
      values: [25],
    });

    state.close();
  }, 120_000);
});
