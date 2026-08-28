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

describe("WebLua Step 5 multi-assignment", () => {
  it("assigns comma-separated local declarations and returns both values", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    expect(state.execute("local a,b = 1,2; return a,b")).toMatchObject({
      kind: "result",
      status: 0,
      values: [1, 2],
    });
    state.close();
  }, 120_000);

  it("assigns comma-separated existing local and global targets", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    expect(state.execute("local a,b; a,b = 3,4; return a,b")).toMatchObject({
      kind: "result",
      status: 0,
      values: [3, 4],
    });
    expect(state.execute("c,d = 5,6; return c,d")).toMatchObject({
      kind: "result",
      status: 0,
      values: [5, 6],
    });
    state.close();
  }, 120_000);

  it("preserves a function alias beside a scalar in a local declaration", async () => {
    const output: string[] = [];
    const runtime = await createWebLuaRuntime({
      capabilities: ["lua.io.write"],
      hostAdapter: { output: (event) => output.push(event.message) },
    });
    const state = runtime.openState();

    expect(
      state.execute('local a,print = 1,print; return print("x")'),
    ).toMatchObject({ kind: "result", status: 0 });
    expect(output).toEqual(["x"]);
    state.close();
  }, 120_000);

  it("preserves function, table, and string aliases in one declaration", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const frame = state.execute(
      'local fn,box,label = function(value) return value end,{ value = 7 },"alias"; return fn(label),box.value,label',
    );

    expect(frame).toMatchObject({
      kind: "result",
      status: 0,
      values: [expect.any(Number), 7, expect.any(Number)],
    });
    if (frame.kind === "result") {
      expect(
        [frame.values[0], frame.values[2]].map((value) =>
          guestString(runtime, value),
        ),
      ).toEqual(["alias", "alias"]);
    }
    state.close();
  }, 120_000);

  it("rejects a trailing comma in a multi-assignment", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    expect(state.execute("local a,b = 1,")).toMatchObject({
      kind: "error",
      status: 1,
    });
    expect(state.execute("a,b = 1,")).toMatchObject({
      kind: "error",
      status: 1,
    });
    state.close();
  }, 120_000);
});
