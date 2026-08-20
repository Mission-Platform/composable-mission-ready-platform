import { normalizeBenchmarkOutput } from "../abi.ts";

import type {
  BuildArtifact,
  InitializedAdapter,
  RuntimeAdapter,
} from "../contracts.ts";

export interface RustWasmExports {
  readonly arithmetic_reduce: (
    n: number,
    multiplier: number,
    offset: number,
    seed: number,
  ) => number;
  readonly string_transform: (
    value: string,
    prefix: string,
    suffix: string,
    repeat: number,
  ) => string;
  readonly dataset_scan: (data: Uint8Array, threshold: number) => number;
}

export type RustWasmLoader = (moduleUrl: string) => Promise<RustWasmExports>;

const ARTIFACT_ID = "rust-wasm-v1";

function assertExports(value: RustWasmExports): RustWasmExports {
  if (
    typeof value.arithmetic_reduce !== "function" ||
    typeof value.string_transform !== "function" ||
    typeof value.dataset_scan !== "function"
  ) {
    throw new TypeError(
      "Rust WASM artifact is missing one or more benchmark exports.",
    );
  }
  return value;
}

export function createRustWasmAdapter(loader?: RustWasmLoader): RuntimeAdapter {
  return {
    implementation: "rust-wasm",
    adapterId: ARTIFACT_ID,
    async build(): Promise<BuildArtifact> {
      return {
        id: ARTIFACT_ID,
        implementation: "rust-wasm",
        artifactKind: "wasm",
        exports: ["arithmetic_reduce", "string_transform", "dataset_scan"],
        metadata: {
          abi: "wasm-bindgen-native-v1",
          loader: "wasm-pack-bundler",
        },
      };
    },
    async initialize(artifact: BuildArtifact): Promise<InitializedAdapter> {
      if (
        artifact.id !== ARTIFACT_ID ||
        artifact.implementation !== "rust-wasm"
      ) {
        throw new Error(
          "Rust WASM adapter received an incompatible build artifact.",
        );
      }
      if (
        loader === undefined ||
        typeof artifact.metadata?.moduleUrl !== "string"
      ) {
        throw new Error(
          "Rust WASM adapter requires a generated ESM loader URL.",
        );
      }
      const exports = assertExports(await loader(artifact.metadata.moduleUrl));
      return {
        adapterId: ARTIFACT_ID,
        preparation: {
          abi: "wasm-bindgen-native-v1",
          exportsValidated: true,
        },
        execute: (input) => {
          if ("multiplier" in input) {
            return normalizeBenchmarkOutput(
              Number(
                exports.arithmetic_reduce(
                  input.n,
                  input.multiplier,
                  input.offset,
                  input.seed,
                ),
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
          return normalizeBenchmarkOutput(
            Number(
              exports.dataset_scan(
                Uint8Array.from(input.bytes),
                input.threshold,
              ),
            ),
          );
        },
      };
    },
  };
}
