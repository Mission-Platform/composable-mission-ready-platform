import { describe, expect, it } from "vitest";

import { createWebLuaRuntime } from "./runtime.js";

function guestString(
  runtime: Awaited<ReturnType<typeof createWebLuaRuntime>>,
  value: number,
): string {
  const handle =
    runtime.valueKind(value) === "string" ? runtime.valuePayload(value) : value;
  return String.fromCharCode(
    ...Array.from({ length: runtime.stringSize(handle) }, (_, index) =>
      runtime.stringByte(handle, index),
    ),
  );
}

describe("WebLua Step 2 next iteration", () => {
  it("returns the first key/value for a simple named entry", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const frame = state.execute(
      'local k, v = next({a = 1}); assert(type(k) == "string"); assert(k == "a"); assert(v == 1); return k, v',
    );
    expect(frame).toMatchObject({ kind: "result", status: 0 });
    if (frame.kind !== "result") throw new Error(frame.message);
    expect(guestString(runtime, frame.values[0])).toBe("a");
    expect(frame.values[1]).toBe(1);

    state.close();
  }, 120_000);

  it("advances and terminates with next(t, k)", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    expect(
      state.execute(`
local t = {a = 1}
local k, v = next(t)
assert(k == "a" and v == 1)
assert(next(t, k) == nil)
return 1
`),
    ).toMatchObject({
      kind: "result",
      status: 0,
      values: [1],
    });

    state.close();
  }, 120_000);

  it("supports the weak-table style long-string key path used by gc.lua", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    expect(
      state.execute(`
local a = setmetatable({}, {__mode = "kv"})
a[string.rep("a", 2^12)] = 25
a[string.rep("b", 2^12)] = {}
a[{}] = 14
local k, v = next(a)
assert(type(k) == "string" and v == 25 or type(k) == "table" or type(k) == "string")
local seen = 0
local key = nil
while true do
  local nk, nv = next(a, key)
  if nk == nil then break end
  seen = seen + 1
  key = nk
end
assert(seen >= 1)
return seen
`),
    ).toMatchObject({
      kind: "result",
      status: 0,
    });

    state.close();
  }, 120_000);

  it("keeps pairs generic-for working via next", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    expect(
      state.execute(
        "local t = {a = 1, b = 2}; local total = 0; for key, value in pairs(t) do total = total + value end; return total",
      ),
    ).toMatchObject({
      kind: "result",
      status: 0,
      values: [3],
    });

    state.close();
  }, 120_000);
});
