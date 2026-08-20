export interface ForgeWebScriptWatCache {
  /** Absolute or workspace-relative directory in which WAT files are stored. */
  readonly root: string;
  /** Implementations must write to a temporary file and rename it into place. */
  readonly writeAtomic: (fileName: string, contents: string) => void;
  /** Optional binary companion writer; implementations must use atomic replacement. */
  readonly writeBinaryAtomic?: (fileName: string, contents: Uint8Array) => void;
  readonly logger?: ForgeWebScriptCacheLogger;
}

export interface ForgeWebScriptCacheLogger {
  readonly log: (
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    data?: Readonly<Record<string, unknown>>,
  ) => void;
}

export interface ForgeWebScriptWatCacheKeyInput {
  readonly compilerVersion: string;
  readonly optimization: 'debug' | 'release';
  readonly graphHash?: string;
  readonly sourceGraph?: readonly {
    readonly fileName: string;
    readonly moduleId: string;
    readonly contentHash: string;
  }[];
  readonly linkConfiguration?: unknown;
  readonly standardLibrary?: unknown;
  readonly targetFeatures?: unknown;
  readonly compilerHints?: unknown;
  readonly loggerScope?: string;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((entry) => stableValue(entry));
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .toSorted(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableValue(entry)]),
    );
  }
  return value;
}

function hash(value: string): string {
  let result = 2_166_136_261;
  for (const character of value) {
    result ^= character.codePointAt(0) ?? 0;
    result = Math.imul(result, 16_777_619) >>> 0;
  }
  return result.toString(16).padStart(8, '0');
}

export function forgeWebScriptWatCacheKey(input: ForgeWebScriptWatCacheKeyInput): string {
  const normalized = {
    ...input,
    sourceGraph: input.sourceGraph
      ?.map((module) => ({ ...module }))
      .toSorted((left, right) => left.fileName.localeCompare(right.fileName)),
  };
  return hash(JSON.stringify(stableValue(normalized)));
}

export function forgeWebScriptWatPath(cache: ForgeWebScriptWatCache, key: string): string {
  return `${cache.root.replace(/[\\/]+$/, '')}/${key}.wat`;
}

export type ForgeWebScriptDebugArtifactVariant = 'optimized' | 'unoptimized';

export interface ForgeWebScriptDebugArtifactPaths {
  readonly optimizedWatPath?: string;
  readonly unoptimizedWatPath?: string;
  readonly optimizedWasmPath?: string;
  readonly unoptimizedWasmPath?: string;
}

function forgeWebScriptDebugArtifactPath(
  cache: ForgeWebScriptWatCache,
  key: string,
  variant: ForgeWebScriptDebugArtifactVariant,
  format: 'wat' | 'wasm',
): string {
  return `${cache.root.replace(/[\\/]+$/, '')}/${key}.${variant}.${format}`;
}

export function persistForgeWebScriptWat(
  cache: ForgeWebScriptWatCache | undefined,
  key: string,
  wat: string,
): string | undefined {
  if (cache === undefined) return undefined;
  const path = forgeWebScriptWatPath(cache, key);
  try {
    cache.writeAtomic(path, wat);
    cache.logger?.log('debug', 'cache.write', { path, format: 'wat' });
    return path;
  } catch {
    cache.logger?.log('warn', 'cache.write-failed', { path, format: 'wat' });
    // A read-only or unavailable cache must never make browser/runtime compilation fail.
    return undefined;
  }
}

export function persistForgeWebScriptDebugArtifacts(
  cache: ForgeWebScriptWatCache | undefined,
  key: string,
  artifacts: {
    readonly optimizedWat?: string;
    readonly unoptimizedWat?: string;
    readonly optimizedWasm?: Uint8Array;
    readonly unoptimizedWasm?: Uint8Array;
  },
): ForgeWebScriptDebugArtifactPaths {
  if (cache === undefined) return {};
  const paths: {
    optimizedWatPath?: string;
    unoptimizedWatPath?: string;
    optimizedWasmPath?: string;
    unoptimizedWasmPath?: string;
  } = {};
  const writeWat = (variant: ForgeWebScriptDebugArtifactVariant, contents: string): void => {
    const path = forgeWebScriptDebugArtifactPath(cache, key, variant, 'wat');
    try {
      cache.writeAtomic(path, contents);
      paths[`${variant}WatPath`] = path;
    } catch {
      cache.logger?.log('warn', 'cache.write-failed', { path, format: 'wat', variant });
      // Debug inspection must never make compilation fail.
    }
  };
  const writeWasm = (variant: ForgeWebScriptDebugArtifactVariant, contents: Uint8Array): void => {
    if (cache.writeBinaryAtomic === undefined) return;
    const path = forgeWebScriptDebugArtifactPath(cache, key, variant, 'wasm');
    try {
      cache.writeBinaryAtomic(path, contents);
      cache.logger?.log('debug', 'cache.write', { path, format: 'wasm', variant });
      paths[`${variant}WasmPath`] = path;
    } catch {
      cache.logger?.log('warn', 'cache.write-failed', { path, format: 'wasm', variant });
      // Debug inspection must never make compilation fail.
    }
  };
  if (artifacts.optimizedWat !== undefined) writeWat('optimized', artifacts.optimizedWat);
  if (artifacts.unoptimizedWat !== undefined) writeWat('unoptimized', artifacts.unoptimizedWat);
  if (artifacts.optimizedWasm !== undefined) writeWasm('optimized', artifacts.optimizedWasm);
  if (artifacts.unoptimizedWasm !== undefined) writeWasm('unoptimized', artifacts.unoptimizedWasm);
  return paths;
}
