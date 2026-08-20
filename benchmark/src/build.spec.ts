import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

import { createAssemblyScriptAdapter } from "./adapters/assemblyscript-wasm.ts";
import { createRustWasmAdapter } from "./adapters/rust-wasm.ts";
import { buildAssemblyScriptArtifact, buildRustArtifact } from "./build.ts";
import { BENCHMARK_CORPUS } from "./corpus.ts";

function toolchainMessage(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const detail =
    "stderr" in error &&
    typeof (error as { stderr?: unknown }).stderr === "object"
      ? String((error as { stderr: Buffer }).stderr)
      : error.message;
  return detail;
}

const smokeCases = BENCHMARK_CORPUS.filter(
  (benchmarkCase) =>
    benchmarkCase.size === "small" || benchmarkCase.id.endsWith(":medium"),
);

describe("benchmark build smoke tests", () => {
  it("compiles AssemblyScript WASM and matches golden corpus outputs", async () => {
    let artifact;
    try {
      artifact = await buildAssemblyScriptArtifact();
    } catch (error) {
      const message = toolchainMessage(error);
      if (
        /asc|assemblyscript|ENOENT|not found|Cannot find module/i.test(message)
      ) {
        console.warn(
          `Skipping AssemblyScript smoke test: toolchain unavailable.\n${message}`,
        );
        return;
      }
      throw error;
    }

    expect(artifact.hash).toMatch(/^[0-9a-f]{8}$/);
    expect(artifact.sizeBytes).toBeGreaterThan(0);
    expect(artifact.exports).toEqual(
      expect.arrayContaining([
        "arithmeticReduce",
        "stringTransform",
        "datasetScan",
      ]),
    );

    const moduleUrl = String(artifact.metadata?.moduleUrl);
    const adapter = createAssemblyScriptAdapter(async (url) => {
      const loaded = (await import(url)) as {
        loadModuleSync?: () => Record<string, unknown>;
        loadModule?: () => Promise<Record<string, unknown>>;
      };
      if (typeof loaded.loadModuleSync === "function") {
        return loaded.loadModuleSync() as never;
      }
      if (typeof loaded.loadModule === "function") {
        return (await loaded.loadModule()) as never;
      }
      throw new Error(
        "AssemblyScript generated module is missing loadModule/loadModuleSync.",
      );
    });
    const initialized = await adapter.initialize({
      ...artifact,
      metadata: { ...artifact.metadata, moduleUrl },
    });

    for (const benchmarkCase of smokeCases) {
      const observed = await initialized.execute(benchmarkCase.input);
      expect(observed, benchmarkCase.id).toEqual(benchmarkCase.expected);
    }
  }, 120_000);

  it("compiles Rust WASM via wasm-pack and matches golden corpus outputs", async () => {
    let artifact;
    try {
      artifact = buildRustArtifact();
    } catch (error) {
      const message = toolchainMessage(error);
      if (/wasm-pack|rustc|cargo|ENOENT|not found/i.test(message)) {
        console.warn(
          `Skipping Rust smoke test: toolchain unavailable.\n${message}\nInstall wasm-pack and a Rust wasm32 target to enable this check.`,
        );
        return;
      }
      throw error;
    }

    expect(artifact.hash).toMatch(/^[0-9a-f]{8}$/);
    expect(artifact.sizeBytes).toBeGreaterThan(0);
    expect(artifact.exports).toEqual(
      expect.arrayContaining([
        "arithmetic_reduce",
        "string_transform",
        "dataset_scan",
      ]),
    );

    const moduleUrl = String(artifact.metadata?.moduleUrl);
    const adapter = createRustWasmAdapter(async (url) => {
      // wasm-pack bundler output imports the .wasm as an ESM side-effect.
      // Prefer the Node-friendly path: load bg.js helpers and init with bytes.
      const modulePath = fileURLToPath(url);
      const directory = path.dirname(modulePath);
      const bgUrl = pathToFileURL(path.join(directory, "benchmark_bg.js")).href;
      const wasmPath = path.join(directory, "benchmark_bg.wasm");
      try {
        const bg = (await import(bgUrl)) as {
          __wbg_set_wasm?: (exports: WebAssembly.Exports) => void;
          arithmetic_reduce?: unknown;
          string_transform?: unknown;
          dataset_scan?: unknown;
        };
        if (typeof bg.__wbg_set_wasm === "function") {
          const wasmBytes = readFileSync(wasmPath);
          const instance = await WebAssembly.instantiate(wasmBytes, {});
          bg.__wbg_set_wasm(instance.instance.exports);
          return bg as never;
        }
      } catch {
        // Fall through to direct module import.
      }

      const loaded = (await import(url)) as Record<string, unknown> & {
        default?: unknown;
        initSync?: (module: BufferSource) => unknown;
        init?: (module?: unknown) => Promise<unknown>;
      };
      const wasmBytes = readFileSync(wasmPath);
      switch (true) {
        case typeof loaded.initSync === "function": {
          loaded.initSync(wasmBytes);
          break;
        }
        case typeof loaded.init === "function": {
          await loaded.init(wasmBytes);
          break;
        }
        case typeof loaded.default === "function": {
          await (loaded.default as (module?: unknown) => Promise<unknown>)(
            wasmBytes,
          );
          break;
        }
        default: {
          break;
        }
      }
      return loaded as never;
    });

    const initialized = await adapter.initialize({
      ...artifact,
      metadata: { ...artifact.metadata, moduleUrl },
    });

    for (const benchmarkCase of smokeCases) {
      const observed = await initialized.execute(benchmarkCase.input);
      expect(observed, benchmarkCase.id).toEqual(benchmarkCase.expected);
    }
  }, 180_000);
});
