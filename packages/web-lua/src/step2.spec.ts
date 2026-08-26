import { describe, expect, it } from "vitest";

import { WEB_LUA_STEP_2_FIXTURES } from "../fixtures/step2.js";

import { createWebLuaRuntime, type WebLuaRuntime } from "./runtime.js";

const WEB_LUA_STATUS_CODES = {
  ok: 0,
  yielded: 5,
} as const;

async function runFixture(
  runtime: WebLuaRuntime,
  fixture: (typeof WEB_LUA_STEP_2_FIXTURES)[number],
): Promise<void> {
  const state = runtime.createState();
  try {
    const prototype = runtime.load(state, fixture.source);
    expect(prototype, fixture.upstreamFile).not.toBe(0);
    expect(runtime.status(state), fixture.upstreamFile).toBe(
      WEB_LUA_STATUS_CODES.ok,
    );

    const result = runtime.call(state, prototype);
    expect(runtime.status(state), fixture.upstreamFile).toBe(
      WEB_LUA_STATUS_CODES[fixture.expected.status],
    );
    expect(result, fixture.upstreamFile).toBe(fixture.expected.value);

    if (fixture.expected.kind === "yield") {
      const resumed = runtime.resume(state, prototype);
      expect(runtime.status(state), fixture.upstreamFile).toBe(
        WEB_LUA_STATUS_CODES[fixture.expected.resume.status],
      );
      expect(resumed, fixture.upstreamFile).toBe(fixture.expected.resume.value);
    }
  } finally {
    runtime.close(state);
  }
}

describe("WebLua Step 2 fixture corpus", () => {
  it("maps every planned upstream file to an exact guest outcome", async () => {
    const runtime = await createWebLuaRuntime();

    expect(
      WEB_LUA_STEP_2_FIXTURES.map(({ upstreamFile }) => upstreamFile),
    ).toEqual([
      "main.lua",
      "constructs.lua",
      "locals.lua",
      "vararg.lua",
      "closure.lua",
      "coroutine.lua",
      "goto.lua",
      "bitwise.lua",
      "verybig.lua",
    ]);

    for (const fixture of WEB_LUA_STEP_2_FIXTURES)
      await runFixture(runtime, fixture);
  });
});
