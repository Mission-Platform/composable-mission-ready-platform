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

describe("WebLua gc.lua string.gsub regression", () => {
  it("replaces all literal pattern occurrences and returns the match count", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const frame = state.execute('return string.gsub("1b1", "1", "2")');
    expect(frame).toMatchObject({
      kind: "result",
      status: 0,
      values: [expect.any(Number), 2],
    });
    if (frame.kind === "result") {
      expect(guestString(runtime, frame.values[0])).toBe("2b2");
    }

    state.close();
  }, 120_000);

  it("supports the gc.lua digit-run capture and %1 replacement", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const frame = state.execute(
      'local a = "a"; for i = 1, 3 do a = i .. "b"; a = string.gsub(a, "(%d%d*)", "%1 %1") end; return a',
    );
    expect(frame).toMatchObject({
      kind: "result",
      status: 0,
      values: [expect.any(Number)],
    });
    if (frame.kind === "result") {
      expect(guestString(runtime, frame.values[0])).toBe("3 3b");
    }

    state.close();
  }, 120_000);
});
