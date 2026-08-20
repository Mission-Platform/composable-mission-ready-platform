import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { compileAssemblyScript } from "@mission-platform/vite-plugin-assemblyscript";

import { hashArtifactBytes, validateWasmArtifact } from "./abi.ts";
import { createFwsVmAdapter } from "./adapters/fws-vm.ts";
import {
  createFwsGeneratedWasmAdapter,
  createFwsWasmAdapter,
} from "./adapters/fws-wasm.ts";
import { createJavaScriptAdapter } from "./adapters/javascript.ts";

import type { BuildArtifact } from "./contracts.ts";

export const BENCHMARK_ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "..",
);
export const GENERATED_ROOT = path.resolve(BENCHMARK_ROOT, "generated");

function artifactForWasm(
  id: string,
  implementation: "rust-wasm" | "assemblyscript-wasm",
  bytes: Uint8Array,
  exports: readonly string[],
  moduleUrl: string,
  metadata: Readonly<Record<string, string | number | boolean>>,
): BuildArtifact {
  const actualExports = validateWasmArtifact(bytes, exports);
  return {
    id,
    implementation,
    artifactKind: "wasm",
    sizeBytes: bytes.byteLength,
    hash: hashArtifactBytes(bytes),
    exports: actualExports,
    metadata: {
      ...metadata,
      moduleUrl,
      validation: "wasm-module-and-export-check",
    },
  };
}

export async function buildAssemblyScriptArtifact(): Promise<BuildArtifact> {
  const output = path.resolve(GENERATED_ROOT, "assemblyscript/index.mjs");
  const wasm = path.resolve(GENERATED_ROOT, "assemblyscript/kernels.wasm");
  await compileAssemblyScript({
    entry: "implementations/assemblyscript/kernels.ts",
    outFile: output,
    wasmFile: wasm,
    rootDir: BENCHMARK_ROOT,
    optimizeLevel: 3,
    shrinkLevel: 1,
  });
  const bytes = new Uint8Array(readFileSync(wasm));
  return artifactForWasm(
    "assemblyscript-wasm-v1",
    "assemblyscript-wasm",
    bytes,
    ["arithmeticReduce", "stringTransform", "datasetScan"],
    pathToFileURL(output).href,
    {
      abi: "assemblyscript-native-v1",
      compiler: "assemblyscript",
      optimization: "O3",
    },
  );
}

export function buildRustArtifact(): BuildArtifact {
  const crateRoot = path.resolve(BENCHMARK_ROOT, "implementations/rust");
  const output = path.resolve(BENCHMARK_ROOT, "generated/rust");
  const outputDirectory = path.relative(crateRoot, output);
  execFileSync(
    "pnpm",
    [
      "exec",
      "wasm-pack",
      "build",
      crateRoot,
      "--target",
      "bundler",
      "--release",
      "--no-pack",
      "--out-dir",
      outputDirectory,
      "--out-name",
      "benchmark",
    ],
    {
      cwd: crateRoot,
      stdio: "pipe",
    },
  );
  const wasm = path.resolve(output, "benchmark_bg.wasm");
  const module = path.resolve(output, "benchmark.js");
  const bytes = new Uint8Array(readFileSync(wasm));
  return artifactForWasm(
    "rust-wasm-v1",
    "rust-wasm",
    bytes,
    ["arithmetic_reduce", "string_transform", "dataset_scan"],
    pathToFileURL(module).href,
    {
      abi: "wasm-bindgen-native-v1",
      compiler: "rustc/wasm-pack",
      optimization: "release",
    },
  );
}

export async function buildBenchmarkArtifacts(): Promise<
  readonly BuildArtifact[]
> {
  const javascript = await createJavaScriptAdapter().build();
  const vm = await Promise.all(
    (["interpret", "jit", "aot"] as const).map((mode) =>
      createFwsVmAdapter(mode).build(),
    ),
  );
  const fwsWasm = await createFwsWasmAdapter().build();
  const fwsGeneratedWasm = await createFwsGeneratedWasmAdapter().build();
  const assemblyscript = await buildAssemblyScriptArtifact();
  const rust = buildRustArtifact();
  // The build manifest is deliberately ordered; report renderers can consume it
  // without re-sorting implementation families differently.
  return [javascript, ...vm, fwsWasm, fwsGeneratedWasm, rust, assemblyscript];
}

export function artifactExists(artifact: BuildArtifact): boolean {
  if (typeof artifact.metadata?.moduleUrl !== "string") return true;
  return (
    statSync(new URL(artifact.metadata.moduleUrl), {
      throwIfNoEntry: false,
    }) !== undefined
  );
}
