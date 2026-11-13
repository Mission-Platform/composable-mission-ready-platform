import type { FlintCapabilityImport } from "@mission-platform/flint-ast";

export interface WasmImportBinding {
  readonly module: string;
  readonly field: string;
  readonly params: readonly number[];
  readonly results: readonly number[];
}

/**
 * Validates and binds host capability imports to WebAssembly module import section entries.
 */
export function buildWasmCapabilityImports(
  imports: readonly FlintCapabilityImport[],
  allowedCapabilities: readonly string[],
): readonly WasmImportBinding[] {
  const allowedSet = new Set(allowedCapabilities);
  const bindings: WasmImportBinding[] = [];

  for (const imp of imports) {
    if (!allowedSet.has(imp.capability)) {
      throw new Error(
        `Capability '${imp.capability}' is not permitted by current security policy.`,
      );
    }
    bindings.push({
      module: "env",
      field: imp.alias,
      params: imp.parameters.map(() => 0x7f), // i32 carrier
      results: imp.result.name === "unit" ? [] : [0x7f],
    });
  }

  return bindings;
}
