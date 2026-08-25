import { describe, expect, it } from "vitest";

import { createWebLuaRuntime } from "./runtime.js";

describe("WebLua result frames", () => {
  it("exposes every top-level return value without changing scalar call results", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();
    const prototype = runtime.load(state, "return 3, 5, 8");

    expect(runtime.call(state, prototype)).toBe(8);
    expect(runtime.status(state)).toBe(0);
    expect(runtime.resultCount(prototype)).toBe(3);
    expect(runtime.resultValue(prototype, 0)).toBe(3);
    expect(runtime.resultValue(prototype, 1)).toBe(5);
    expect(runtime.resultValue(prototype, 2)).toBe(8);
    expect(runtime.resultValue(prototype, 3)).toBe(0);
  });

  it("reports no results for an empty return and invalid prototypes", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.createState();
    const prototype = runtime.load(state, "return");

    expect(runtime.call(state, prototype)).toBe(0);
    expect(runtime.resultCount(prototype)).toBe(1);
    expect(runtime.resultValue(prototype, 0)).toBe(0);
    expect(runtime.resultCount(0)).toBe(0);
    expect(runtime.resultValue(0, 0)).toBe(0);
  });
});
