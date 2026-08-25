import { describe, expect, it } from "vitest";

import { createWebLuaRuntime, type WebLuaRuntime } from "./runtime.js";

async function runSource(
  runtime: WebLuaRuntime,
  source: string,
  expected: number,
): Promise<void> {
  const state = runtime.createState();
  try {
    const prototype = runtime.load(state, source);
    expect(prototype).not.toBe(0);
    expect(runtime.status(state)).toBe(0);
    const result = runtime.call(state, prototype);
    expect(runtime.status(state)).toBe(0);
    expect(result).toBe(expected);
    expect(runtime.status(state)).toBe(0);
  } finally {
    runtime.close(state);
  }
}

describe("WebLua Step 2 syntax", () => {
  it("evaluates indexing and calls through a general suffix", async () => {
    const runtime = await createWebLuaRuntime();

    await runSource(
      runtime,
      `
        local root = { branch = { value = 4 } }
        return root.branch["value"]
      `,
      4,
    );
  });

  it("supports methods on indexed receivers", async () => {
    const runtime = await createWebLuaRuntime();

    await runSource(
      runtime,
      `
        local root = { branch = { value = 40, add = function(self, amount) return self.value + amount end } }
        return root.branch:add(2)
      `,
      42,
    );
  });

  it("desugars dotted function declarations into field assignments", async () => {
    const runtime = await createWebLuaRuntime();

    await runSource(
      runtime,
      `
        local root = {}
        root.add = function(value) return value + 1 end
        return root.add(41)
      `,
      42,
    );
  });

  it("declares dotted function statements and invokes them", async () => {
    const runtime = await createWebLuaRuntime();

    await runSource(
      runtime,
      `
        local root = {}
        function root.add(value) return value + 1 end
        return root.add(41)
      `,
      42,
    );
  });

  it("declares chained dotted function statements and invokes them", async () => {
    const runtime = await createWebLuaRuntime();

    await runSource(
      runtime,
      `
        local root = { nested = {} }
        function root.nested.multiply(value) return value * 2 end
        return root.nested.multiply(21)
      `,
      42,
    );
  });

  it("adds an implicit self parameter to colon function declarations", async () => {
    const runtime = await createWebLuaRuntime();

    await runSource(
      runtime,
      `
        local root = {}
        function root:add(amount) return self.value + amount end
        root.value = 40
        return root:add(2)
      `,
      42,
    );
  });

  it("decodes common quoted-string escapes", async () => {
    const runtime = await createWebLuaRuntime();

    await runSource(
      runtime,
      String.raw`return "line\n\r\t\\\"'" == 'line\n\r\t\\\"\''`,
      1,
    );
  });
});
