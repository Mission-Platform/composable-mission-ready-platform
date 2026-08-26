import { forgeWebScriptSoNGraphHash } from './son-ir.js';

import type { ForgeWebScriptSoNModule, ForgeWebScriptSoNNode } from './son-ir.js';

export const FORGE_WEB_SCRIPT_SON_MAX_JSON_BYTES = 16 * 1024 * 1024;

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((entry) => stableValue(entry));
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .toSorted(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, stableValue(entry)]),
    );
  return value;
}

export function serializeForgeWebScriptSoN(module: ForgeWebScriptSoNModule): string {
  return `${JSON.stringify(stableValue(module), undefined, 2)}\n`;
}

type ForgeWebScriptSoNIdentity = Partial<
  Pick<
    ForgeWebScriptSoNModule,
    | 'compilerVersion'
    | 'languageVersion'
    | 'abiVersion'
    | 'sourceHash'
    | 'graphHash'
    | 'optimization'
    | 'boundsChecks'
    | 'memoryModel'
  >
>;

export function validateForgeWebScriptSoN(
  value: unknown,
  expected?: ForgeWebScriptSoNIdentity,
): value is ForgeWebScriptSoNModule {
  try {
    if (value === null || typeof value !== 'object') return false;
    const candidate = value as Partial<ForgeWebScriptSoNModule>;
    if (
      candidate.schemaVersion !== '1.0' ||
      typeof candidate.compilerVersion !== 'string' ||
      typeof candidate.languageVersion !== 'string' ||
      typeof candidate.abiVersion !== 'string' ||
      typeof candidate.sourceHash !== 'string' ||
      typeof candidate.graphHash !== 'string' ||
      (candidate.optimization !== 'debug' && candidate.optimization !== 'release') ||
      (candidate.boundsChecks !== 'runtime' &&
        candidate.boundsChecks !== 'proven-safe' &&
        candidate.boundsChecks !== 'excluded-by-profile') ||
      candidate.memoryModel !== 'region-arc-checked-linear'
    )
      return false;
    if (
      !Array.isArray(candidate.nodes) ||
      !Array.isArray(candidate.functions) ||
      !Array.isArray(candidate.regions) ||
      !Array.isArray(candidate.sourceMap)
    )
      return false;
    if (
      candidate.nodes.length > 1_000_000 ||
      candidate.functions.length > 100_000 ||
      candidate.regions.length > 1_000_000
    )
      return false;
    const nodes = candidate.nodes as readonly ForgeWebScriptSoNNode[];
    const ids = nodes.map((node) => node.id);
    if (ids.some((id, index) => !Number.isInteger(id) || id !== index + 1)) return false;
    const known = new Set(ids);
    if (
      nodes.some(
        (node) =>
          !Array.isArray(node.inputs) ||
          node.inputs.some((input) => !Number.isInteger(input) || !known.has(input)) ||
          !Array.isArray(node.effects),
      )
    )
      return false;
    if (
      nodes.some(
        (node) =>
          node.effects === undefined ||
          node.alias === undefined ||
          node.ownership === undefined ||
          typeof node.kind !== 'string' ||
          typeof node.functionName !== 'string',
      )
    )
      return false;
    if (
      candidate.functions.some(
        (function_) => function_ === null || typeof function_ !== 'object' || typeof function_.name !== 'string' || !known.has(function_.entry),
      )
    )
      return false;
    if (expected?.compilerVersion !== undefined && expected.compilerVersion !== candidate.compilerVersion) return false;
    if (expected?.languageVersion !== undefined && expected.languageVersion !== candidate.languageVersion) return false;
    if (expected?.abiVersion !== undefined && expected.abiVersion !== candidate.abiVersion) return false;
    if (expected?.sourceHash !== undefined && expected.sourceHash !== candidate.sourceHash) return false;
    if (expected?.graphHash !== undefined && expected.graphHash !== candidate.graphHash) return false;
    if (expected?.optimization !== undefined && expected.optimization !== candidate.optimization) return false;
    if (expected?.boundsChecks !== undefined && expected.boundsChecks !== candidate.boundsChecks) return false;
    if (expected?.memoryModel !== undefined && expected.memoryModel !== candidate.memoryModel) return false;
    return forgeWebScriptSoNGraphHash(candidate as ForgeWebScriptSoNModule) === candidate.graphHash;
  } catch {
    return false;
  }
}

export function deserializeForgeWebScriptSoN(
  contents: string,
  expected?: ForgeWebScriptSoNIdentity,
): ForgeWebScriptSoNModule | undefined {
  try {
    if (contents.length > FORGE_WEB_SCRIPT_SON_MAX_JSON_BYTES) return undefined;
    const value: unknown = JSON.parse(contents);
    return validateForgeWebScriptSoN(value, expected) ? value : undefined;
  } catch {
    return undefined;
  }
}
