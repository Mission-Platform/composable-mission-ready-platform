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

describe("WebLua Step 5 code buffer and pcall", () => {
  it("executes chunks larger than the old 512-instruction code buffer", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();
    let source = "local x = 0\n";
    for (let index = 0; index < 600; index += 1) {
      source += "x = x + 1\n";
    }
    source += "return x\n";

    expect(state.execute(source)).toMatchObject({
      kind: "result",
      status: 0,
      values: [600],
    });
    state.close();
  }, 120_000);

  it("keeps earlier nested closures valid when later packsize code is present", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();
    const source = `
local format = string.format
local function F(m)
  if m < 1000 then return m end
  m = m / 1000
  if m < 1000 then return format("%.1f", m) .. "K" end
  return format("%.1f", m / 1000) .. "M"
end
local showmem
do
  local max = 0
  showmem = function()
    local m = collectgarbage("count") * 1024
    max = (m > max) and m or max
    return format("%s:%s", F(m), F(max))
  end
end
-- Later instructions that previously overflowed the 4KiB code buffer.
print(string.format("%d-bit integers, %d-bit floats",
  string.packsize("j") * 8, string.packsize("n") * 8))
return showmem()
`;
    const frame = state.execute(source);
    expect(frame).toMatchObject({ kind: "result", status: 0 });
    if (frame.kind === "result") {
      expect(guestString(runtime, frame.values[0])).toMatch(/K:/);
    }
    state.close();
  }, 120_000);

  it("skips a first-line # shebang/special comment before parsing", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    expect(
      state.execute("# testing special comment on first line\nreturn 42"),
    ).toMatchObject({
      kind: "result",
      status: 0,
      values: [42],
    });
    expect(state.execute("#! /usr/bin/env lua\nreturn 7")).toMatchObject({
      kind: "result",
      status: 0,
      values: [7],
    });
    state.close();
  }, 120_000);

  it("supports pcall success and protected error paths", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const ok = state.execute("return pcall(function() return 42 end)");
    expect(ok).toMatchObject({ kind: "result", status: 0 });
    if (ok.kind === "result") {
      expect(runtime.valueKind(ok.values[0])).toBe("boolean");
      expect(runtime.valuePayload(ok.values[0])).toBe(1);
      expect(ok.values[1]).toBe(42);
    }

    const failed = state.execute("return pcall(function() error('boom') end)");
    expect(failed).toMatchObject({ kind: "result", status: 0 });
    if (failed.kind === "result") {
      expect(runtime.valueKind(failed.values[0])).toBe("boolean");
      expect(runtime.valuePayload(failed.values[0])).toBe(0);
      expect(failed.values.length).toBeGreaterThanOrEqual(2);
    }
    expect(state.execute("return 7")).toMatchObject({
      kind: "result",
      status: 0,
      values: [7],
    });
    state.close();
  }, 120_000);
});
