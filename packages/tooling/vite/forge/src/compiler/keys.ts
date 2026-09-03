import type { CompilerInput } from './pipeline.js';

/** A stable, inspectable key for a neutral semantic-cache entry. */
export interface ForgeSemanticCacheKey {
  readonly value: string;
  readonly fileName: string;
}

function stableSerialize(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map((entry) => stableSerialize(entry)).join(',')}]`;
  if (value instanceof Set) {
    return `[${[...value]
      .sort()
      .map((entry) => stableSerialize(entry))
      .join(',')}]`;
  }
  if (typeof value === 'object' && value !== null) {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
      .join(',')}}`;
  }
  return JSON.stringify(String(value));
}

/** Include every neutral-input choice that can change semantic analysis. */
export function createForgeSemanticCacheKey(input: CompilerInput): ForgeSemanticCacheKey {
  const routerPlugins = input.routerPlugins?.map((plugin) => ({
    id: plugin.id,
    routerPackage: plugin.routerPackage,
  }));
  return {
    fileName: input.fileName,
    value: stableSerialize({
      componentName: input.componentName,
      componentFolders: input.componentFolders,
      configFingerprint: input.configFingerprint,
      fileName: input.fileName,
      moduleKind: input.moduleKind,
      optimize: input.optimize,
      router: input.router,
      routerConditions: input.routerConditions,
      routerPlugins,
      source: input.source,
      sourceRoot: input.sourceRoot,
    }),
  };
}
