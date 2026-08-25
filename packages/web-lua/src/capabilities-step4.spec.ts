import { describe, expect, it } from "vitest";

import { WEB_LUA_IMPORT_POLICY } from "./abi.js";
import { createWebLuaRuntime } from "./runtime.js";

type CapabilityExports = {
  readonly capability_io_read_status: (allowed: number) => number;
  readonly capability_io_read_result: (
    allowed: number,
    result: number,
  ) => number;
  readonly capability_io_write_status: (allowed: number) => number;
  readonly capability_io_write_result: (
    allowed: number,
    result: number,
  ) => number;
  readonly capability_clock_now_status: (allowed: number) => number;
  readonly capability_clock_now_result: (
    allowed: number,
    result: number,
  ) => number;
  readonly capability_random_bytes_status: (allowed: number) => number;
  readonly capability_random_bytes_result: (
    allowed: number,
    result: number,
  ) => number;
  readonly capability_os_command_status: (allowed: number) => number;
  readonly capability_os_command_result: (
    allowed: number,
    result: number,
  ) => number;
  readonly capability_package_load_status: (allowed: number) => number;
  readonly capability_package_load_result: (
    allowed: number,
    result: number,
  ) => number;
  readonly capability_debug_trace_status: (allowed: number) => number;
  readonly capability_debug_trace_result: (
    allowed: number,
    result: number,
  ) => number;
};

async function capabilityExports(): Promise<CapabilityExports> {
  const runtime = await createWebLuaRuntime();
  const wasm = runtime.artifact.artifact.wasm! as unknown as ArrayBuffer;
  return new WebAssembly.Instance(new WebAssembly.Module(wasm), {
    "lua.io.write": {
      io_write: () => undefined,
    },
    "lua.package.load": {
      package_load: () => [1024, 0],
    },
    "lua.core.source": {
      string_to_bytes: () => [1024, 0],
    },
  }).exports as unknown as CapabilityExports;
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
    const wasm = runtime.artifact.artifact.wasm! as unknown as ArrayBuffer;
    const module = new WebAssembly.Module(wasm);

    expect(runtime.importPolicy).toBe(WEB_LUA_IMPORT_POLICY);
    expect(runtime.importPolicy.imports).toEqual([
      "lua.io.write",
      "lua.package.load",
      "lua.core.source",
    ]);
    expect(WebAssembly.Module.imports(module)).toEqual(
      expect.arrayContaining([
        {
          kind: "function",
          module: "lua.package.load",
          name: "package_load",
        },
        {
          kind: "function",
          module: "lua.io.write",
          name: "io_write",
        },
      ]),
    );
    expect(WebAssembly.Module.imports(module)).toHaveLength(3);
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
