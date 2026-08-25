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

describe("WebLua Step 5 nested upvalues", () => {
  it("captures a local declared in a conditional block", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const frame = state.execute(
      "local T=nil; local showmem; if not T then local max=0; showmem=function() max=max+1; return max end end; return showmem()",
    );

    expect(frame).toMatchObject({
      kind: "result",
      status: 0,
      result: 1,
      values: [1],
    });
    state.close();
  }, 120_000);

  it("keeps a block local from overwriting an outer local", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const frame = state.execute(
      "local value=1; if true then local value=2 end; return value",
    );

    expect(frame).toMatchObject({ kind: "result", status: 0, values: [1] });
    state.close();
  }, 120_000);

  it("keeps a closure bound to its lexical local across a later block", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const frame = state.execute(
      "local value=1; local read=function() return value end; if true then local value=2 end; return read()",
    );

    expect(frame).toMatchObject({ kind: "result", status: 0, values: [1] });
    state.close();
  }, 120_000);

  it("updates a captured block local without leaking it", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const frame = state.execute(
      "local read; if true then local value=0; read=function() value=value+1; return value end end; return read(), read()",
    );

    expect(frame).toMatchObject({ kind: "result", status: 0, values: [1, 2] });
    state.close();
  }, 120_000);

  it("updates a captured local from a collectgarbage logical expression", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const frame = state.execute(
      'local show; do local max=0; show=function() local m=collectgarbage("count")*1024; max=(m>max) and m or max; return max end end; return show()',
    );

    expect(frame).toMatchObject({
      kind: "result",
      status: 0,
      result: 1024,
      values: [1024],
    });
    state.close();
  }, 120_000);

  it("returns through a nested named function declaration", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const frame = state.execute(
      'local T,print,format,write,assert,type,unpack,floor=T,print,string.format,io.write,assert,type,table.unpack,math.floor; local function F(m) local function round(m) m=m+0.04999; return m-(m%0.1) end; if m<1000 then return m else m=m/1000; if m<1000 then return round(m).."K" else return round(m/1000).."M" end end end; local showmem; if not T then local max=0; showmem=function() local m=1200; max=(m>max) and m or max; return format("%s:%s",F(m),F(max)) end end; return showmem()',
    );
    expect(frame).toMatchObject({ kind: "result", status: 0 });
    if (frame.kind === "result")
      expect(guestString(runtime, frame.values[0])).toBe("1.2K:1.2K");
    state.close();
  }, 120_000);

  it("keeps direct float modulo valid", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const frame = state.execute("return 1.2 % 0.1");

    expect(frame).toMatchObject({ kind: "result", status: 0 });
    if (frame.kind === "result") {
      expect(runtime.valueKind(frame.values[0])).toBe("float");
      expect(runtime.floatNumber(frame.values[0])).toBe(0);
    }
    state.close();
  }, 120_000);
});
