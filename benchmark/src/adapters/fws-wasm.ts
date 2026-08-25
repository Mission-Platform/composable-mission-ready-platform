import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  compileForgeWebScript,
  type ForgeWebScriptArtifact,
} from "@mission-platform/forge-web-script";

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
  BuildArtifact,
  FwsMode,
  InitializedAdapter,
  RuntimeAdapter,
} from "../contracts.ts";

const COMPILER_VERSION = "benchmark-fws-v1";
const SOURCE_FILE = "benchmark/implementations/fws/kernels.fws";

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

function resolveSource(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const filePath = path.resolve(here, "../../implementations/fws/kernels.fws");
  return readFileSync(filePath, "utf8");
}

interface FwsExports {
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

interface GeneratedFwsExports {
  readonly arithmetic_reduce: FwsExports["arithmetic_reduce"];
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
  readonly fws_alloc: FwsExports["fws_alloc"];
  readonly fws_dealloc: FwsExports["fws_dealloc"];
  readonly fws_realloc: FwsExports["fws_realloc"];
  readonly fws_reset: FwsExports["fws_reset"];
}

interface GeneratedFwsModule {
  readonly load: () => Promise<GeneratedFwsExports>;
  readonly loadSync: () => GeneratedFwsExports;
}

function asExports(value: WebAssembly.Exports): FwsExports {
  const exports = value as unknown as Partial<FwsExports>;
  if (
    typeof exports.arithmetic_reduce !== "function" ||
    typeof exports.string_transform !== "function" ||
    typeof exports.dataset_scan !== "function" ||
    !(exports.memory instanceof WebAssembly.Memory) ||
    typeof exports.fws_alloc !== "function" ||
    typeof exports.fws_dealloc !== "function" ||
    typeof exports.fws_realloc !== "function" ||
    typeof exports.fws_reset !== "function"
  ) {
    throw new TypeError(
      "FWS WASM module does not satisfy the native benchmark ABI.",
    );
  }
  return exports as FwsExports;
}

export function validateFwsWasmArtifact(
  artifact: ForgeWebScriptArtifact,
): readonly string[] {
  if (artifact.wasm === undefined || artifact.manifest === undefined)
    throw new Error("FWS artifact is incomplete.");
  const exports = validateWasmArtifact(artifact.wasm, REQUIRED_EXPORTS);
  validateManifestExports(artifact.manifest, [
    "arithmetic_reduce",
    "string_transform",
    "dataset_scan",
  ]);
  if (artifact.contentHash !== hashArtifactBytes(artifact.wasm)) {
    throw new Error("FWS artifact content hash does not match its WASM bytes.");
  }
  if (!artifact.esmSource.includes("loadSync"))
    throw new Error("FWS artifact is missing its generated ESM loader.");
  return exports;
}

type FwsWasmLoader = "raw" | "generated";

function releaseRanges(
  exports: Pick<FwsExports, "fws_dealloc">,
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

function withReset<T>(
  exports: Pick<FwsExports, "fws_reset">,
  operation: () => T,
): T {
  exports.fws_reset();
  let operationFailed = false;
  try {
    return operation();
  } catch (error) {
    operationFailed = true;
    throw error;
  } finally {
    try {
      exports.fws_reset();
    } catch (resetError) {
      if (!operationFailed) throw resetError;
    }
  }
}

function createFwsWasmAdapterInternal(
  source: string,
  loader: FwsWasmLoader,
  boundsChecks: "runtime" | "excluded-by-profile" = "runtime",
  modeOverride?: FwsMode,
): RuntimeAdapter {
  const generated = loader === "generated";
  const artifactId =
    modeOverride === "wasm-excluded-bounds"
      ? "fws-wasm-excluded-bounds"
      : generated
        ? "fws-wasm-generated"
        : "fws-wasm";
  const fwsMode = modeOverride ?? (generated ? "wasm-generated" : "wasm");
  let compiled:
    | {
        artifact: ForgeWebScriptArtifact;
        module: WebAssembly.Module;
        generatedModuleUrl: string;
      }
    | undefined;
  let cachedGeneratedModule: GeneratedFwsModule | undefined;

  return {
    implementation: "fws",
    mode: fwsMode,
    adapterId: artifactId,
    async build(): Promise<BuildArtifact> {
      const artifact = compileForgeWebScript({
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
          .map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`)
          .join("; ");
        throw new Error(
          `Native FWS WASM kernels failed to compile${details ? `: ${details}` : "."}`,
        );
      }
      validateFwsWasmArtifact(artifact);
      const generatedSource = encodeUtf8(artifact.esmSource);
      const generatedPath = path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "../../generated/fws/kernels.wasm",
      );
      const generatedModulePath = path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "../../generated/fws/kernels.generated.mjs",
      );
      mkdirSync(path.dirname(generatedPath), { recursive: true });
      writeFileSync(generatedPath, artifact.wasm);
      writeFileSync(generatedModulePath, artifact.esmSource);
      compiled = {
        artifact,
        module: new WebAssembly.Module(
          artifact.wasm as unknown as BufferSource,
        ),
        generatedModuleUrl: pathToFileURL(generatedModulePath).href,
      };
      return {
        id: artifactId,
        implementation: "fws",
        fwsMode,
        artifactKind: "wasm",
        sizeBytes: artifact.wasm.byteLength,
        hash: artifact.contentHash,
        exports: [...REQUIRED_EXPORTS],
        fwsPipeline: {
          pipeline: "fws-son-wasm-two-stage",
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
          rawWasmBytes: artifact.wasm.byteLength,
          pipeline: "fws-son-wasm-two-stage",
          frontend: "son-ir",
          wasmStage: "wasm-ir-optimizer",
          optimization: "release",
          boundsChecks,
          memoryModel:
            artifact.sonIr?.memoryModel ?? "region-arc-checked-linear",
          sonGraphHash: artifact.sonIr?.graphHash ?? "",
          sonNodeCount: artifact.sonIr?.nodes.length ?? 0,
          sonPassCount: artifact.sonOptimizationReport?.passes.length ?? 0,
          generatedSourceBytes: generatedSource.byteLength,
          ...(generated
            ? { generatedSourceHash: hashArtifactBytes(generatedSource) }
            : {}),
          stringInputAllocations: generated ? 1 : 3,
          stringOutputAllocations: 1,
          wasmUrl: new URL(`file://${generatedPath}`).href,
          moduleUrl: pathToFileURL(generatedModulePath).href,
        },
      };
    },
    async initialize(artifact: BuildArtifact): Promise<InitializedAdapter> {
      if (
        artifact.id !== artifactId ||
        artifact.fwsMode !== fwsMode ||
        artifact.artifactKind !== "wasm"
      ) {
        throw new Error(
          "FWS WASM adapter received an incompatible build artifact.",
        );
      }
      if (compiled === undefined) {
        throw new Error(
          "FWS WASM adapter must be built before initialization.",
        );
      }
      const module = compiled.module;
      let generatedModule = cachedGeneratedModule;
      let generatedExports = generated
        ? await (async (): Promise<GeneratedFwsExports> => {
            const loaded = (await import(
              `${compiled!.generatedModuleUrl}?hash=${artifact.hash ?? ""}`
            )) as Partial<GeneratedFwsModule>;
            if (
              typeof loaded.loadSync !== "function" ||
              typeof loaded.load !== "function"
            )
              throw new Error("Generated FWS module has no loadSync loader.");
            generatedModule = loaded as GeneratedFwsModule;
            cachedGeneratedModule = generatedModule;
            return loaded.loadSync();
          })()
        : undefined;
      if (generatedModule !== undefined && generatedExports === undefined)
        generatedExports = generatedModule.loadSync();
      if (generated && typeof generatedExports?.fws_reset !== "function")
        throw new Error(
          "Generated FWS module is missing the fws_reset ABI export.",
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
            const exports = generatedExports!;
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

          const exports = preparedExports;
          return withReset(preparedExports, () => {
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
                exports.dataset_scan(
                  payload.pointer,
                  payload.length,
                  input.threshold,
                ),
              );
            } finally {
              exports.fws_dealloc(payload.pointer, payload.length);
            }
          });
        },
      };
    },
  };
}

export function createFwsWasmAdapter(
  source: string = resolveSource(),
): RuntimeAdapter {
  return createFwsWasmAdapterInternal(source, "raw");
}

export function createFwsGeneratedWasmAdapter(
  source: string = resolveSource(),
): RuntimeAdapter {
  return createFwsWasmAdapterInternal(source, "generated");
}

/**
 * Explicitly builds the same SoN + Wasm pipeline with runtime bounds checks
 * excluded by profile. It is used only as a measured comparison and is never
 * the default benchmark artifact.
 */
export function createFwsExcludedBoundsWasmAdapter(
  source: string = resolveSource(),
): RuntimeAdapter {
  return createFwsWasmAdapterInternal(
    source,
    "raw",
    "excluded-by-profile",
    "wasm-excluded-bounds",
  );
}
