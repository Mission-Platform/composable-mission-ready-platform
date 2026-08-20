import { normalizeBenchmarkOutput } from "../abi.ts";

import type {
  BuildArtifact,
  InitializedAdapter,
  RuntimeAdapter,
} from "../contracts.ts";

export interface AssemblyScriptExports {
  readonly arithmeticReduce: (
    n: number,
    multiplier: number,
    offset: number,
    seed: number,
  ) => number;
  readonly stringTransform: (
    value: string,
    prefix: string,
    suffix: string,
    repeat: number,
  ) => string;
  readonly datasetScan: (data: Uint8Array, threshold: number) => number;
}

export type AssemblyScriptLoader = (
  moduleUrl: string,
) => Promise<AssemblyScriptExports>;

const ARTIFACT_ID = "assemblyscript-wasm-v1";

function assertExports(value: AssemblyScriptExports): AssemblyScriptExports {
  if (
    typeof value.arithmeticReduce !== "function" ||
    typeof value.stringTransform !== "function" ||
    typeof value.datasetScan !== "function"
  ) {
    throw new TypeError(
      "AssemblyScript artifact is missing one or more benchmark exports.",
    );
  }
  return value;
}

export function createAssemblyScriptAdapter(
  loader?: AssemblyScriptLoader,
): RuntimeAdapter {
  return {
    implementation: "assemblyscript-wasm",
    adapterId: ARTIFACT_ID,
    async build(): Promise<BuildArtifact> {
      return {
        id: ARTIFACT_ID,
        implementation: "assemblyscript-wasm",
        artifactKind: "wasm",
        exports: ["arithmeticReduce", "stringTransform", "datasetScan"],
        metadata: { abi: "assemblyscript-native-v1", loader: "generated-esm" },
      };
    },
    async initialize(artifact: BuildArtifact): Promise<InitializedAdapter> {
      if (
        artifact.id !== ARTIFACT_ID ||
        artifact.implementation !== "assemblyscript-wasm"
      ) {
        throw new Error(
          "AssemblyScript adapter received an incompatible build artifact.",
        );
      }
      if (
        loader === undefined ||
        typeof artifact.metadata?.moduleUrl !== "string"
      ) {
        throw new Error(
          "AssemblyScript adapter requires a generated ESM loader URL.",
        );
      }
      const exports = assertExports(await loader(artifact.metadata.moduleUrl));
      return {
        adapterId: ARTIFACT_ID,
        preparation: {
          abi: "assemblyscript-native-v1",
          exportsValidated: true,
        },
        execute: (input) => {
          if ("multiplier" in input) {
            return normalizeBenchmarkOutput(
              Number(
                exports.arithmeticReduce(
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
              exports.stringTransform(
                input.value,
                input.prefix,
                input.suffix,
                input.repeat,
              ),
            );
          }
          return normalizeBenchmarkOutput(
            Number(
              exports.datasetScan(
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
