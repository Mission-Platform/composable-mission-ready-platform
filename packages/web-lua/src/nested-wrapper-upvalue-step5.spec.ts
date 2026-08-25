import { describe, expect, it } from "vitest";

import { createWebLuaRuntime } from "./runtime.js";

describe("WebLua Step 5 nested wrapper upvalues", () => {
  it("resolves and assigns outer locals through a nested wrapper closure", async () => {
    const runtime = await createWebLuaRuntime();
    const state = runtime.openState();

    const frame = state.execute(
      "local initclock=0; local lastclock=0; local showmem; if true then local max=0; showmem=function() max=max+1; return max end end; local dofile=function() showmem(); local c=initclock+1; lastclock=c; return 42 end; return dofile(), initclock, lastclock",
    );

    expect(frame).toMatchObject({
      kind: "result",
      status: 0,
      result: 1,
      values: [42, 0, 1],
    });
    state.close();
  }, 120_000);
});
