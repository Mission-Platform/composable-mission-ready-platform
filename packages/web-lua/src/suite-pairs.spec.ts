import { describe, expect, it } from "vitest";

import { createWebLuaRuntime } from "./runtime.js";

describe("portable pairs builtin", () => {
  it("returns a guest-owned iterator triple for a table", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const frame = state.execute("return pairs(_G)");

    expect(frame).toMatchObject({ kind: "result", ok: true, status: 0 });
    if (frame.kind !== "result") throw new Error(frame.message);
    expect(frame.values).toHaveLength(3);
    expect(frame.values[0]).toBeGreaterThan(0);
    expect(frame.values[1]).toBeGreaterThan(0);
    expect(frame.values[2]).toBe(0);

    state.close();
  });

  it("lets generic-for consume the guest-owned iterator", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    expect(
      state.execute(
        "local t = {a = 1}; local total = 0; for key, value in pairs(t) do total = total + value end; return total",
      ),
    ).toMatchObject({
      kind: "result",
      ok: true,
      status: 0,
      result: 1,
      values: [1],
    });

    state.close();
  });

  it("keeps the deterministic status-2 contract for non-table arguments", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    expect(state.execute("return pairs(1)")).toMatchObject({
      kind: "error",
      ok: false,
      status: 2,
      phase: "call",
    });

    state.close();
  });
});
