import { describe, expect, it, vi } from "vitest";

import {
  WEB_LUA_ABI_MANIFEST,
  WEB_LUA_CAPABILITY_POLICIES,
  WEB_LUA_IMPORT_POLICY,
} from "./abi.js";
import { compileWebLua } from "./compiler.js";
import {
  createWebLuaRuntime,
  WEB_LUA_BUILD_ARTIFACT,
  WebLuaStateClosedError,
  type WebLuaResultFrame,
} from "./runtime.js";

vi.mock("./compiler.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("./compiler.js")>();
  return { ...original, compileWebLua: vi.fn(original.compileWebLua) };
});

describe("WebLua Step 4 embedded-runtime contract", () => {
  it("uses the build-time guest artifact instead of compiling FWS at runtime", async () => {
    vi.mocked(compileWebLua).mockClear();
    vi.mocked(compileWebLua).mockResolvedValue(WEB_LUA_BUILD_ARTIFACT);

    const runtime = await createWebLuaRuntime();

    expect(compileWebLua).not.toHaveBeenCalled();
    runtime.dispose();
  });

  it("publishes versioned import and capability policy metadata", async () => {
    const runtime = await createWebLuaRuntime();

    expect(runtime.abi).toBe(WEB_LUA_ABI_MANIFEST);
    expect(runtime.importPolicy).toBe(WEB_LUA_IMPORT_POLICY);
    expect(runtime.importPolicy.imports).toEqual([
      "lua.io.write",
      "lua.package.load",
      "lua.core.source",
    ]);
    expect(runtime.capabilityPolicies).toBe(WEB_LUA_CAPABILITY_POLICIES);
    expect(runtime.capabilities).toEqual([]);
  });

  it("loads and calls multiple chunks on one persistent owned state", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const first = state.load("return 7");
    const second = state.load("return 11");
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.kind !== "loaded" || second.kind !== "loaded")
      throw new Error("Expected both chunks to load successfully.");
    expect(state.call(first).values).toEqual([7]);
    expect(state.call(second).values).toEqual([11]);
    expect(state.status).toBe(0);

    state.close();
  });

  it("returns stable result frames and emits successful output", async () => {
    const onOutput = vi.fn();
    const runtime = await createWebLuaRuntime(undefined, { onOutput });
    const state = runtime.openState();
    const frame = state.execute("return 3, 5, 8");

    expect(frame).toMatchObject({
      kind: "result",
      operation: "call",
      status: 0,
      result: 8,
      values: [3, 5, 8],
    } satisfies Partial<WebLuaResultFrame>);
    expect(onOutput).toHaveBeenCalledWith(frame);
    state.close();
  });

  it("routes guest print and warn through the write capability output callback", async () => {
    const deniedOutput = vi.fn();
    const denied = await createWebLuaRuntime(undefined, {
      hostAdapter: { output: deniedOutput },
    });
    const deniedState = denied.openState();
    expect(deniedState.execute('print("denied-marker")')).toMatchObject({
      kind: "result",
      status: 0,
    });
    expect(deniedOutput).not.toHaveBeenCalled();
    deniedState.close();

    const output = vi.fn();
    const runtime = await createWebLuaRuntime(undefined, {
      capabilities: ["lua.io.write"],
      hostAdapter: { output },
    });
    const state = runtime.openState();

    expect(
      state.execute(
        'print("print-marker"); warn("warn-marker"); print(7); io.stderr:write("stderr-marker")',
      ),
    ).toMatchObject({
      kind: "result",
      status: 0,
    });
    expect(output.mock.calls.map(([event]) => event.message)).toEqual([
      "print-marker",
      "warn-marker",
      "7",
    ]);

    state.close();
  });

  it("reports malformed, load, and runtime errors through stable frames", async () => {
    const onError = vi.fn();
    const runtime = await createWebLuaRuntime(undefined, { onError });
    const state = runtime.openState();

    const malformed = state.load("\u001BLua");
    const syntax = state.load("return (");
    const runtimeError = state.execute("return 1 / 0");

    expect(malformed).toMatchObject({
      kind: "error",
      status: 4,
      phase: "load",
    });
    expect(syntax).toMatchObject({ kind: "error", status: 1, phase: "load" });
    expect(runtimeError).toMatchObject({
      kind: "error",
      status: 3,
      phase: "call",
    });
    expect(onError).toHaveBeenCalledTimes(3);
    state.close();
  });

  it("denies host effects deterministically until an explicit adapter is enabled", async () => {
    const deniedOutput = vi.fn();
    const denied = await createWebLuaRuntime(undefined, {
      onOutput: deniedOutput,
    });
    expect(denied.invokeCapability("lua.io.write", "write", "hello")).toEqual({
      granted: false,
      capability: "lua.io.write",
      reason: "capability-denied",
    });
    expect(deniedOutput).not.toHaveBeenCalled();

    const adapter = vi.fn(() => "written");
    const granted = await createWebLuaRuntime(undefined, {
      capabilities: ["lua.io.write"],
      hostAdapter: { invoke: adapter },
    });
    expect(granted.invokeCapability("lua.io.write", "write", "hello")).toEqual({
      granted: true,
      capability: "lua.io.write",
      value: "written",
    });
    expect(adapter).toHaveBeenCalledOnce();
  });

  it("owns close state and rejects reuse after close", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();
    state.close();
    state.close();

    expect(state.closed).toBe(true);
    expect(() => state.load("return 1")).toThrow(WebLuaStateClosedError);
    expect(() => state.call(1)).toThrow(WebLuaStateClosedError);
  });
});
