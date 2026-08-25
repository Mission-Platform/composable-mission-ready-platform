import { describe, expect, it } from "vitest";

import { createWebLuaRuntime } from "./runtime.js";

describe("WebLua Step 5 standalone do scope capture", () => {
  it("captures a global fallback through a standalone do block", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const frame = state.execute(
      'local collectgarbage=collectgarbage; local showmem; do if not T then showmem=function() return collectgarbage("count") end end end; return showmem()',
    );

    expect(frame).toMatchObject({
      kind: "result",
      status: 0,
      result: 1,
      values: [1],
    });
    state.close();
  }, 120_000);

  it("keeps the standalone do block equivalent to its unwrapped form", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const unwrapped = state.execute(
      'local collectgarbage=collectgarbage; local showmem; if not T then showmem=function() return collectgarbage("count") end end; return showmem()',
    );
    const wrapped = state.execute(
      'local collectgarbage=collectgarbage; local showmem; do if not T then showmem=function() return collectgarbage("count") end end end; return showmem()',
    );

    expect(unwrapped).toMatchObject({ kind: "result", status: 0, values: [1] });
    expect(wrapped).toMatchObject({ kind: "result", status: 0, values: [1] });
    state.close();
  }, 120_000);

  it("keeps a closure over a local declared inside do", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const frame = state.execute(
      "local read; do local value=0; read=function() value=value+1; return value end end; return read(), read()",
    );

    expect(frame).toMatchObject({
      kind: "result",
      status: 0,
      values: [1, 2],
    });
    state.close();
  }, 120_000);

  it("keeps outer locals and globals visible through nested do closures", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const frame = state.execute(
      'local value=0; local read; do if true then read=function() value=value+1; return value, collectgarbage("count") end end end; return value, read()',
    );

    expect(frame).toMatchObject({
      kind: "result",
      status: 0,
      values: [0, 1, 1],
    });
    state.close();
  }, 120_000);

  it("invokes a captured builtin alias through a closure", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const frame = state.execute(
      'local format=string.format; local show; do show=function() return format("x=%d",1) end end; return show()',
    );

    expect(frame).toMatchObject({
      kind: "result",
      status: 0,
    });
    if (frame.kind === "result") {
      expect(runtime.valueKind(frame.values[0])).toBe("string");
      const handle = runtime.valuePayload(frame.values[0]);
      expect(
        String.fromCharCode(
          ...Array.from({ length: runtime.stringSize(handle) }, (_, index) =>
            runtime.stringByte(handle, index),
          ),
        ),
      ).toBe("x=1");
    }
    state.close();
  }, 120_000);
});
