import type { FlintAbiManifest } from "./manifest.js";

export interface DynamicLinkBinding {
  readonly symbol: string;
  readonly module: string;
  readonly resolvedAddress?: number;
}

export interface DynamicLinkingTable {
  readonly imports: readonly DynamicLinkBinding[];
  readonly exports: readonly DynamicLinkBinding[];
}

/**
 * Constructs dynamic linking import/export resolution tables from an ABI manifest.
 */
export function buildDynamicLinkingTable(
  manifest: FlintAbiManifest,
): DynamicLinkingTable {
  const imports: DynamicLinkBinding[] = (manifest.imports ?? []).map((imp) => ({
    symbol: imp.alias,
    module: imp.capability,
  }));

  const exports: DynamicLinkBinding[] = (manifest.exports ?? []).map((exp) => ({
    symbol: exp.name,
    module: manifest.module,
  }));

  return {
    imports,
    exports,
  };
}
