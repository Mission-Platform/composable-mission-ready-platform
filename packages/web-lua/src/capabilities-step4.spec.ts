import { describe, expect, it } from "vitest";

import { WEB_LUA_IMPORT_POLICY, type WebLuaExports } from "./abi.js";
import { createWebLuaRuntime } from "./runtime.js";

type CapabilityExports = Pick<
  WebLuaExports,
  `capability_${(typeof capabilities)[number]}_${"status" | "result"}`
>;

async function capabilityExports(): Promise<CapabilityExports> {
  const runtime = await createWebLuaRuntime();
  return runtime.exports;
}

const capabilities = [
  "io_read",
  "io_write",
  "clock_now",
  "random_bytes",
  "os_command",
  "package_load",
  "debug_trace",
] as const;

describe("WebLua Step 4 capability adapters", () => {
  it("matches the declared Wasm import policy", async () => {
    const runtime = await createWebLuaRuntime();

    expect(runtime.importPolicy).toBe(WEB_LUA_IMPORT_POLICY);
    expect(runtime.importPolicy.imports).toEqual([
      "lua.io.write",
      "lua.package.load",
      "lua.core.source",
    ]);
    expect(runtime.exports).toMatchObject({
      capability_io_read_status: expect.any(Function),
      capability_package_load_result: expect.any(Function),
    });
  });

  it("project every denied capability to runtime error and zero result", async () => {
    const exports = await capabilityExports();

    for (const capability of capabilities) {
      const status = exports[
        `capability_${capability}_status` as keyof CapabilityExports
      ] as (allowed: number) => number;
      const result = exports[
        `capability_${capability}_result` as keyof CapabilityExports
      ] as (allowed: number, value: number) => number;

      expect(status(0), capability).toBe(2);
      expect(result(0, 91), capability).toBe(0);
    }
  });

  it("passes explicit allowed status and numeric result projections", async () => {
    const exports = await capabilityExports();

    for (const capability of capabilities) {
      const status = exports[
        `capability_${capability}_status` as keyof CapabilityExports
      ] as (allowed: number) => number;
      const result = exports[
        `capability_${capability}_result` as keyof CapabilityExports
      ] as (allowed: number, value: number) => number;

      expect(status(1), capability).toBe(0);
      expect(result(1, 91), capability).toBe(91);
    }
  });
});
