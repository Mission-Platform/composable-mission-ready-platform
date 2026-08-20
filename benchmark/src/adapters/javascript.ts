import { KERNEL_EXPORTS, runKernel } from "../kernels.ts";

import type {
  BuildArtifact,
  InitializedAdapter,
  RuntimeAdapter,
} from "../contracts.ts";

const SOURCE_ID = "benchmark-javascript-kernels-v1";

export function createJavaScriptAdapter(): RuntimeAdapter {
  return {
    implementation: "javascript",
    adapterId: SOURCE_ID,
    async build(): Promise<BuildArtifact> {
      return {
        id: SOURCE_ID,
        implementation: "javascript",
        artifactKind: "javascript",
        exports: KERNEL_EXPORTS,
        metadata: { abi: "structured-input-v1", boundary: "native-js" },
      };
    },
    async initialize(artifact: BuildArtifact): Promise<InitializedAdapter> {
      if (artifact.id !== SOURCE_ID || artifact.artifactKind !== "javascript") {
        throw new Error(
          "JavaScript adapter received an incompatible build artifact.",
        );
      }
      return { adapterId: SOURCE_ID, execute: runKernel };
    },
  };
}
