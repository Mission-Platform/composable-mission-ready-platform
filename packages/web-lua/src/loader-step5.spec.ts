import { describe, expect, it } from "vitest";

import { createWebLuaRuntime } from "./runtime.js";

describe("WebLua Step 5 loader", () => {
  it("denies dofile deterministically without the package capability", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const frame = state.execute("dofile('main.lua')");

    expect(frame).toMatchObject({ kind: "error", status: 2 });
    state.close();
  }, 120_000);

  it("loads and executes a relative file in the current state", async () => {
    const invoke = (request: { readonly input: unknown }): Uint8Array => {
      expect(request.input).toBe("main.lua");
      return new TextEncoder().encode("return 41 + 1");
    };
    const runtime = await createWebLuaRuntime({
      capabilities: ["lua.package.load"],
      hostAdapter: { invoke },
    });
    const state = runtime.openState();

    const frame = state.execute("return dofile('main.lua')");

    expect(frame).toMatchObject({ kind: "result", status: 0, values: [42] });
    state.close();
  }, 120_000);

  it("executes a loaded file from a direct dofile statement", async () => {
    const runtime = await createWebLuaRuntime({
      capabilities: ["lua.package.load"],
      hostAdapter: {
        invoke: () => new TextEncoder().encode("child_value = 42"),
      },
    });
    const state = runtime.openState();

    expect(state.execute("dofile('child.lua')")).toMatchObject({
      kind: "result",
      status: 0,
    });
    expect(state.execute("return child_value")).toMatchObject({
      kind: "result",
      status: 0,
      values: [42],
    });
    state.close();
  }, 120_000);

  it("resolves a nested load in the same guest state", async () => {
    const runtime = await createWebLuaRuntime({
      capabilities: ["lua.package.load"],
      hostAdapter: {
        invoke: (request: { readonly input: unknown }) => {
          if (request.input === "parent.lua") {
            return new TextEncoder().encode(
              "parent_value = dofile('nested/child.lua')",
            );
          }
          expect(request.input).toBe("nested/child.lua");
          return new TextEncoder().encode(
            "child_value = 42; return child_value",
          );
        },
      },
    });
    const state = runtime.openState();

    expect(state.execute("dofile('parent.lua')")).toMatchObject({
      kind: "result",
      status: 0,
    });
    expect(state.execute("return parent_value, child_value")).toMatchObject({
      kind: "result",
      status: 0,
      values: [42, 42],
    });
    state.close();
  }, 120_000);

  it("reuses state globals across loaded chunks", async () => {
    const runtime = await createWebLuaRuntime({
      capabilities: ["lua.package.load"],
      hostAdapter: {
        invoke: () => new TextEncoder().encode("value = 9"),
      },
    });
    const state = runtime.openState();

    expect(state.execute("dofile('one.lua')")).toMatchObject({ status: 0 });
    expect(state.execute("return value")).toMatchObject({
      kind: "result",
      values: [9],
    });
    state.close();
  }, 120_000);

  it("returns a load error for malformed returned source", async () => {
    const runtime = await createWebLuaRuntime({
      capabilities: ["lua.package.load"],
      hostAdapter: {
        invoke: () => new TextEncoder().encode("return ("),
      },
    });
    const state = runtime.openState();

    expect(state.execute("dofile('bad.lua')")).toMatchObject({
      kind: "error",
      status: 1,
    });
    state.close();
  }, 120_000);

  it("loads a callable that executes in the current state", async () => {
    const runtime = await createWebLuaRuntime({
      capabilities: ["lua.package.load"],
      hostAdapter: { invoke: () => new TextEncoder().encode("return 42") },
    });
    const state = runtime.openState();

    expect(state.execute("return loadfile('x.lua')()")).toMatchObject({
      kind: "result",
      status: 0,
      values: [42],
    });
    state.close();
  }, 120_000);

  it("propagates every return value from a nested dofile", async () => {
    const runtime = await createWebLuaRuntime({
      capabilities: ["lua.package.load"],
      hostAdapter: {
        invoke: () => new TextEncoder().encode("return 17, 19, 23"),
      },
    });
    const state = runtime.openState();

    expect(state.execute("return dofile('values.lua')")).toMatchObject({
      kind: "result",
      status: 0,
      values: [17, 19, 23],
    });
    state.close();
  }, 120_000);

  it("caches guest-loaded modules in require", async () => {
    let loads = 0;
    const runtime = await createWebLuaRuntime({
      capabilities: ["lua.package.load"],
      hostAdapter: {
        invoke: (request: { readonly input: unknown }) => {
          expect(request.input).toBe("counter.lua");
          loads += 1;
          return new TextEncoder().encode("return 31");
        },
      },
    });
    const state = runtime.openState();

    expect(state.execute("return require('counter')")).toMatchObject({
      kind: "result",
      status: 0,
      values: [31],
    });
    expect(state.execute("return require('counter')")).toMatchObject({
      kind: "result",
      status: 0,
      values: [31],
    });
    expect(loads).toBe(1);
    state.close();
  }, 120_000);

  it("loads text chunks and remains reusable after a nested load failure", async () => {
    const runtime = await createWebLuaRuntime({
      capabilities: ["lua.package.load"],
      hostAdapter: {
        invoke: (request: { readonly input: unknown }) => {
          if (request.input === "text.lua")
            return new TextEncoder().encode("return 29");
          expect(request.input).toBe("broken.lua");
          return new TextEncoder().encode("return (");
        },
      },
    });
    const state = runtime.openState();

    expect(state.execute("return loadfile('text.lua')()")).toMatchObject({
      kind: "result",
      status: 0,
      values: [29],
    });
    expect(state.execute("dofile('broken.lua')")).toMatchObject({
      kind: "error",
      status: 1,
    });
    expect(state.execute("return 37")).toMatchObject({
      kind: "result",
      status: 0,
      values: [37],
    });
    state.close();
  }, 120_000);

  it("remains reusable after a nested runtime error", async () => {
    const runtime = await createWebLuaRuntime({
      capabilities: ["lua.package.load"],
      hostAdapter: {
        invoke: (request: { readonly input: unknown }) => {
          if (request.input === "ok.lua")
            return new TextEncoder().encode("return 29");
          expect(request.input).toBe("runtime_error.lua");
          return new TextEncoder().encode("a = 1; error('boom')");
        },
      },
    });
    const state = runtime.openState();

    expect(state.execute("return loadfile('ok.lua')()")).toMatchObject({
      kind: "result",
      status: 0,
      values: [29],
    });
    expect(state.execute("dofile('runtime_error.lua')")).toMatchObject({
      kind: "error",
      status: 2,
    });
    expect(state.execute("return 37")).toMatchObject({
      kind: "result",
      status: 0,
      values: [37],
    });
    state.close();
  }, 120_000);
});
