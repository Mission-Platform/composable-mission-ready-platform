import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { compileFlint, type FlintArtifact } from "@mission-platform/flint";

import {
  decodeUtf8,
  encodeUtf8,
  hashArtifactBytes,
  normalizeBenchmarkOutput,
  readGuestBytes,
  validateManifestExports,
  validateWasmArtifact,
  writeGuestBytes,
} from "../abi.ts";

import type {
  BenchmarkInput,
  BenchmarkOutput,
  BuildArtifact,
  FlintMode,
  InitializedAdapter,
  RuntimeAdapter,
} from "../contracts.ts";

const COMPILER_VERSION = "benchmark-flint-v1";
const SOURCE_FILE = "benchmark/implementations/flint/kernels.flint";

const REQUIRED_EXPORTS = [
  "arithmetic_reduce",
  "string_transform",
  "dataset_scan",
  "memory",
  "fws_alloc",
  "fws_dealloc",
  "fws_realloc",
  "fws_reset",
] as const;

/**
 * Reads and returns the source code of the Flint benchmark kernels.
 *
 * @returns UTF-8 source string of kernels.flint.
 */
function resolveSource(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const filePath = path.resolve(
    here,
    "../../implementations/flint/kernels.flint",
  );
  return readFileSync(filePath, "utf8");
}

interface FlintExports {
  readonly arithmetic_reduce: (
    n: number,
    multiplier: number,
    offset: number,
    seed: number,
  ) => number;
  readonly string_transform: (
    valuePointer: number,
    valueLength: number,
    prefixPointer: number,
    prefixLength: number,
    suffixPointer: number,
    suffixLength: number,
    repeat: number,
  ) => readonly [number, number];
  readonly dataset_scan: (
    pointer: number,
    length: number,
    threshold: number,
  ) => number;
  readonly memory: WebAssembly.Memory;
  readonly fws_alloc: (size: number) => number;
  readonly fws_dealloc: (pointer: number, size: number) => void;
  readonly fws_realloc: (
    pointer: number,
    oldSize: number,
    newSize: number,
  ) => number;
  readonly fws_reset: () => void;
}

interface GeneratedFlintExports {
  readonly arithmetic_reduce: FlintExports["arithmetic_reduce"];
  readonly string_transform: (
    value: string,
    prefix: string,
    suffix: string,
    repeat: number,
  ) => string;
  readonly dataset_scan: (
    bytes: readonly [pointer: number, length: number],
    threshold: number,
  ) => number;
  readonly memory: WebAssembly.Memory;
  readonly fws_alloc: FlintExports["fws_alloc"];
  readonly fws_dealloc: FlintExports["fws_dealloc"];
  readonly fws_realloc: FlintExports["fws_realloc"];
  readonly fws_reset: FlintExports["fws_reset"];
}

interface GeneratedFlintModule {
  readonly load: () => Promise<GeneratedFlintExports>;
  readonly loadSync: () => GeneratedFlintExports;
}

const NATIVE_ABI_FUNCTIONS = [
  "arithmetic_reduce",
  "string_transform",
  "dataset_scan",
  "fws_alloc",
  "fws_dealloc",
  "fws_realloc",
  "fws_reset",
] as const;

/**
 * Validates and casts raw WebAssembly exports to the typed FlintExports interface.
 *
 * @param value Raw WebAssembly exports object.
 * @returns Typed and validated FlintExports instance.
 */
function asExports(value: WebAssembly.Exports): FlintExports {
  const exports = value as unknown as Record<string, unknown>;
  const hasFunctions = NATIVE_ABI_FUNCTIONS.every(
    (name) => typeof exports[name] === "function",
  );
  if (!hasFunctions || !(exports.memory instanceof WebAssembly.Memory)) {
    throw new TypeError(
      "Flint WASM module does not satisfy the native benchmark ABI.",
    );
  }
  return exports as unknown as FlintExports;
}

/**
 * Validates the completeness and export parity of a compiled Flint artifact.
 *
 * @param artifact Compiled Flint artifact to validate.
 * @returns Array of validated WebAssembly export names.
 */
export function validateFlintWasmArtifact(
  artifact: FlintArtifact,
): readonly string[] {
  if (artifact.wasm === undefined || artifact.manifest === undefined)
    throw new Error("Flint artifact is incomplete.");
  const exports = validateWasmArtifact(artifact.wasm, REQUIRED_EXPORTS);
  validateManifestExports(artifact.manifest, [
    "arithmetic_reduce",
    "string_transform",
    "dataset_scan",
  ]);
  if (artifact.contentHash !== hashArtifactBytes(artifact.wasm)) {
    throw new Error(
      "Flint artifact content hash does not match its WASM bytes.",
    );
  }
  if (!artifact.esmSource.includes("loadSync"))
    throw new Error("Flint artifact is missing its generated ESM loader.");
  return exports;
}

type FlintWasmLoader = "raw" | "generated";

/**
 * Deallocates a list of guest memory byte ranges, skipping duplicates and undefined ranges.
 *
 * @param exports Object exporting the fws_dealloc lifecycle function.
 * @param ranges Array of pointer and length records to free.
 */
function releaseRanges(
  exports: Pick<FlintExports, "fws_dealloc">,
  ranges: readonly ({ pointer: number; length: number } | undefined)[],
): void {
  const released = new Set<string>();
  for (const range of ranges) {
    if (range === undefined) continue;
    const key = `${range.pointer}:${range.length}`;
    if (released.has(key)) continue;
    released.add(key);
    exports.fws_dealloc(range.pointer, range.length);
  }
}

/**
 * Executes an operation ensuring fws_reset is invoked before and after execution.
 *
 * @param exports Object exporting the fws_reset function.
 * @param operation Callback executing the guest workload.
 * @returns Result of the operation.
 */
function withReset<T>(
  exports: Pick<FlintExports, "fws_reset">,
  operation: () => T,
): T {
  exports.fws_reset();
  try {
    return operation();
  } finally {
    exports.fws_reset();
  }
}

/**
 * Compiles Flint benchmark kernel source and asserts zero compilation diagnostics.
 *
 * @param source Flint kernel source code.
 * @param boundsChecks Bounds checking compilation mode.
 * @returns Validated Flint artifact.
 */
function compileKernels(
  source: string,
  boundsChecks: "runtime" | "excluded-by-profile",
): FlintArtifact {
  const artifact = compileFlint({
    source,
    fileName: SOURCE_FILE,
    compilerVersion: COMPILER_VERSION,
    optimization: "release",
    boundsChecks,
  });
  if (
    artifact.diagnostics.length > 0 ||
    artifact.wasm === undefined ||
    artifact.manifest === undefined
  ) {
    const details = artifact.diagnostics
      .map(
        (diagnostic: { code?: string; message: string }) =>
          `${diagnostic.code}: ${diagnostic.message}`,
      )
      .join("; ");
    throw new Error(
      `Native Flint WASM kernels failed to compile${details ? `: ${details}` : "."}`,
    );
  }
  validateFlintWasmArtifact(artifact);
  return artifact;
}

/**
 * Persists compiled WebAssembly and generated ESM module files to disk.
 *
 * @param artifact Compiled Flint artifact.
 * @returns Object with generated file paths and URLs.
 */
function persistGeneratedArtifacts(artifact: FlintArtifact) {
  const generatedSource = encodeUtf8(artifact.esmSource);
  const generatedPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../generated/flint/kernels.wasm",
  );
  const generatedModulePath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../generated/flint/kernels.generated.mjs",
  );
  mkdirSync(path.dirname(generatedPath), { recursive: true });
  writeFileSync(generatedPath, artifact.wasm as unknown as Uint8Array);
  writeFileSync(generatedModulePath, artifact.esmSource);
  return {
    generatedSource,
    generatedPath,
    generatedModulePath,
    wasmUrl: new URL(`file://${generatedPath}`).href,
    moduleUrl: pathToFileURL(generatedModulePath).href,
  };
}

/**
 * Dispatches a benchmark input workload to generated ESM Flint exports.
 *
 * @param exports Generated Flint module exports.
 * @param input Benchmark workload input.
 * @returns Normalized benchmark output.
 */
function dispatchGeneratedExecution(
  exports: GeneratedFlintExports,
  input: BenchmarkInput,
): BenchmarkOutput {
  return withReset(exports, () => {
    if ("multiplier" in input) {
      return normalizeBenchmarkOutput(
        exports.arithmetic_reduce(
          input.n,
          input.multiplier,
          input.offset,
          input.seed,
        ),
      );
    }
    if ("suffix" in input) {
      return normalizeBenchmarkOutput(
        exports.string_transform(
          input.value,
          input.prefix,
          input.suffix,
          input.repeat,
        ),
      );
    }
    const payload = writeGuestBytes(
      exports.memory,
      exports.fws_alloc,
      Uint8Array.from(input.bytes),
    );
    try {
      return normalizeBenchmarkOutput(
        exports.dataset_scan(
          [payload.pointer, payload.length],
          input.threshold,
        ),
      );
    } finally {
      exports.fws_dealloc(payload.pointer, payload.length);
    }
  });
}

/**
 * Dispatches a benchmark input workload to raw pointer-length Flint exports.
 *
 * @param exports Raw Flint WASM exports.
 * @param input Benchmark workload input.
 * @returns Normalized benchmark output.
 */
function dispatchRawExecution(
  exports: FlintExports,
  input: BenchmarkInput,
): BenchmarkOutput {
  return withReset(exports, () => {
    if ("multiplier" in input) {
      return normalizeBenchmarkOutput(
        exports.arithmetic_reduce(
          input.n,
          input.multiplier,
          input.offset,
          input.seed,
        ),
      );
    }
    if ("suffix" in input) {
      const value = writeGuestBytes(
        exports.memory,
        exports.fws_alloc,
        encodeUtf8(input.value),
      );
      const prefix = writeGuestBytes(
        exports.memory,
        exports.fws_alloc,
        encodeUtf8(input.prefix),
      );
      const suffix = writeGuestBytes(
        exports.memory,
        exports.fws_alloc,
        encodeUtf8(input.suffix),
      );
      let output: { pointer: number; length: number } | undefined;
      try {
        const [pointer, length] = exports.string_transform(
          value.pointer,
          value.length,
          prefix.pointer,
          prefix.length,
          suffix.pointer,
          suffix.length,
          input.repeat,
        );
        output = { pointer, length };
        return normalizeBenchmarkOutput(
          decodeUtf8(readGuestBytes(exports.memory, pointer, length)),
        );
      } finally {
        releaseRanges(exports, [output, value, prefix, suffix]);
      }
    }
    const payload = writeGuestBytes(
      exports.memory,
      exports.fws_alloc,
      Uint8Array.from(input.bytes),
    );
    try {
      return normalizeBenchmarkOutput(
        exports.dataset_scan(payload.pointer, payload.length, input.threshold),
      );
    } finally {
      exports.fws_dealloc(payload.pointer, payload.length);
    }
  });
}

/**
 * Creates an internal runtime adapter instance for either raw or generated Flint WASM kernels.
 *
 * @param source Flint kernels source code.
 * @param loader Loader variant ('raw' or 'generated').
 * @param boundsChecks Bounds checking mode.
 * @param modeOverride Optional FlintMode identifier override.
 * @returns Configured RuntimeAdapter instance.
 */
function createFlintWasmAdapterInternal(
  source: string,
  loader: FlintWasmLoader,
  boundsChecks: "runtime" | "excluded-by-profile" = "runtime",
  modeOverride?: FlintMode,
): RuntimeAdapter {
  const generated = loader === "generated";
  const artifactId =
    modeOverride === "wasm-excluded-bounds"
      ? "flint-wasm-excluded-bounds"
      : generated
        ? "flint-wasm-generated"
        : "flint-wasm";
  const flintMode = modeOverride ?? (generated ? "wasm-generated" : "wasm");
  let compiled:
    | {
        artifact: FlintArtifact;
        module: WebAssembly.Module;
        generatedModuleUrl: string;
      }
    | undefined;
  let cachedGeneratedModule: GeneratedFlintModule | undefined;

  return {
    implementation: "flint",
    mode: flintMode,
    adapterId: artifactId,
    build(): Promise<BuildArtifact> {
      const artifact = compileKernels(source, boundsChecks);
      const persisted = persistGeneratedArtifacts(artifact);
      compiled = {
        artifact,
        module: new WebAssembly.Module(
          artifact.wasm as unknown as BufferSource,
        ),
        generatedModuleUrl: pathToFileURL(persisted.generatedModulePath).href,
      };
      return Promise.resolve({
        id: artifactId,
        implementation: "flint",
        flintMode,
        artifactKind: "wasm",
        sizeBytes: artifact.wasm?.byteLength ?? 0,
        hash: artifact.contentHash,
        exports: [...REQUIRED_EXPORTS],
        flintPipeline: {
          pipeline: "flint-son-wasm-two-stage",
          frontend: "son-ir",
          wasmStage: "wasm-ir-optimizer",
          optimization: "release",
          boundsChecks,
          memoryModel:
            artifact.sonIr?.memoryModel ?? "region-arc-checked-linear",
          sonGraphHash: artifact.sonIr?.graphHash ?? "",
          sonNodeCount: artifact.sonIr?.nodes.length ?? 0,
          sonPassCount: artifact.sonOptimizationReport?.passes.length ?? 0,
        },
        metadata: {
          abi: generated
            ? "generated-esm-over-pointer-length-v1"
            : "pointer-length-native-v1",
          compilerVersion: COMPILER_VERSION,
          loader: generated ? "generated-esm" : "raw-pointer-length",
          nativeKernels: true,
          instancePolicy: "reusable-with-reset",
          resetAbi: "fws_reset-v1",
          rawWasmBytes: artifact.wasm?.byteLength ?? 0,
          pipeline: "flint-son-wasm-two-stage",
          frontend: "son-ir",
          wasmStage: "wasm-ir-optimizer",
          optimization: "release",
          boundsChecks,
          memoryModel:
            artifact.sonIr?.memoryModel ?? "region-arc-checked-linear",
          sonGraphHash: artifact.sonIr?.graphHash ?? "",
          sonNodeCount: artifact.sonIr?.nodes.length ?? 0,
          sonPassCount: artifact.sonOptimizationReport?.passes.length ?? 0,
          generatedSourceBytes: persisted.generatedSource.byteLength,
          ...(generated
            ? {
                generatedSourceHash: hashArtifactBytes(
                  persisted.generatedSource,
                ),
              }
            : {}),
          stringInputAllocations: generated ? 1 : 3,
          stringOutputAllocations: 1,
          wasmUrl: persisted.wasmUrl,
          moduleUrl: persisted.moduleUrl,
        },
      });
    },
    async initialize(artifact: BuildArtifact): Promise<InitializedAdapter> {
      if (
        artifact.id !== artifactId ||
        artifact.flintMode !== flintMode ||
        artifact.artifactKind !== "wasm"
      ) {
        throw new Error(
          "Flint WASM adapter received an incompatible build artifact.",
        );
      }
      const compiledModule = compiled;
      if (compiledModule === undefined) {
        throw new Error(
          "Flint WASM adapter must be built before initialization.",
        );
      }
      const module = compiledModule.module;
      let generatedModule = cachedGeneratedModule;
      let generatedExports = generated
        ? await (async (): Promise<GeneratedFlintExports> => {
            const loaded = (await import(
              `${compiledModule.generatedModuleUrl}?hash=${artifact.hash ?? ""}`
            )) as Partial<GeneratedFlintModule>;
            if (
              typeof loaded.loadSync !== "function" ||
              typeof loaded.load !== "function"
            )
              throw new Error("Generated Flint module has no loadSync loader.");
            generatedModule = loaded as GeneratedFlintModule;
            cachedGeneratedModule = generatedModule;
            return loaded.loadSync();
          })()
        : undefined;
      if (generatedModule !== undefined && generatedExports === undefined)
        generatedExports = generatedModule.loadSync();
      if (generated && typeof generatedExports?.fws_reset !== "function")
        throw new Error(
          "Generated Flint module is missing the fws_reset ABI export.",
        );
      const preparedExports = asExports(
        new WebAssembly.Instance(module, {}).exports,
      );
      return {
        adapterId: artifactId,
        preparation: {
          modulesCompiled: 1,
          abi: generated
            ? "generated-esm-over-pointer-length-v1"
            : "pointer-length-native-v1",
          nativeKernels: true,
          instancePolicy: "reusable-with-reset",
          resetAbi: "fws_reset-v1",
          stringInputAllocations: generated ? 1 : 3,
          stringOutputAllocations: 1,
        },
        execute: (input) => {
          if (generated) {
            if (generatedExports === undefined) {
              throw new Error("Generated Flint exports are undefined.");
            }
            return dispatchGeneratedExecution(generatedExports, input);
          }
          return dispatchRawExecution(preparedExports, input);
        },
      };
    },
  };
}

/**
 * Creates a runtime adapter for raw pointer-length Flint WebAssembly kernels.
 *
 * @param source Optional kernel source string override.
 * @returns Configured runtime adapter instance.
 */
export function createFlintWasmAdapter(
  source: string = resolveSource(),
): RuntimeAdapter {
  return createFlintWasmAdapterInternal(source, "raw");
}

/**
 * Creates a runtime adapter for generated ESM Flint WebAssembly module kernels.
 *
 * @param source Optional kernel source string override.
 * @returns Configured runtime adapter instance.
 */
export function createFlintGeneratedWasmAdapter(
  source: string = resolveSource(),
): RuntimeAdapter {
  return createFlintWasmAdapterInternal(source, "generated");
}

/**
 * Explicitly builds the same SoN + Wasm pipeline with runtime bounds checks
 * excluded by profile. It is used only as a measured comparison and is never
 * the default benchmark artifact.
 */
export function createFlintExcludedBoundsWasmAdapter(
  source: string = resolveSource(),
): RuntimeAdapter {
  return createFlintWasmAdapterInternal(
    source,
    "raw",
    "excluded-by-profile",
    "wasm-excluded-bounds",
  );
}
