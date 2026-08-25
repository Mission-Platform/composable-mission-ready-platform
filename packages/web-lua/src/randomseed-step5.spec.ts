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

describe("WebLua Step 5 randomseed", () => {
  it("returns two deterministic raw integer values without arguments", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    expect(
      state.execute("local x,y=math.randomseed(); return x,y"),
    ).toMatchObject({
      kind: "result",
      status: 0,
      values: [0, 0],
    });
    state.close();
  }, 120_000);

  it("does not fabricate results for supplied arguments", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    expect(state.execute("return math.randomseed(123)")).toMatchObject({
      kind: "result",
      status: 0,
      values: [],
    });
    state.close();
  }, 120_000);

  it("preserves the exact all.lua format call", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const frame = state.execute(
      'local F=function(m) if m < 1000 then return m else m=m/1000; if m < 1000 then return string.format("%.1f",m).."K" else return string.format("%.1f",m/1000).."M" end end end; return F(1200)',
    );

    expect(frame).toMatchObject({ kind: "result", status: 0 });
    if (frame.kind === "result")
      expect(guestString(runtime, frame.values[0])).toBe("1.2K");
    state.close();
  }, 120_000);
});
