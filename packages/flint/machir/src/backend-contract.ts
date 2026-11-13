import type { MachModule } from "./types.js";

/**
 * Standard interface implemented by all Web and Metal target emitters.
 */
export interface TargetBackend<
  TOptions = Record<string, unknown>,
  TArtifact = string | Uint8Array,
> {
  readonly targetName: string;
  readonly targetCategory: "web" | "metal";
  readonly architecture: "wasm32" | "wasm64" | "armv7-m" | "aarch64" | "amd64";

  /**
   * Emits machine code or binary artifact from optimized MachIR module.
   */
  emit(machModule: MachModule, options?: TOptions): TArtifact;
}
