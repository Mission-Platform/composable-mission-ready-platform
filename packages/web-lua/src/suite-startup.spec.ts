import { describe, expect, it } from "vitest";

import { createWebLuaRuntime } from "./runtime.js";

describe("portable suite startup", () => {
  it("provides the version and stderr output surface used by all.lua", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    expect(state.execute("return _VERSION")).toMatchObject({
      kind: "result",
      ok: true,
      status: 0,
    });
    expect(state.execute('io.stderr:write("ignored")')).toMatchObject({
      kind: "result",
      ok: true,
      status: 0,
    });

    state.close();
  });
});
