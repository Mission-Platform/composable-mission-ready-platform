import { deserializeForgeWebScriptSoN, serializeForgeWebScriptSoN } from './son-cache.js';

import type { ForgeWebScriptSoNModule } from './son-ir.js';

export interface ForgeWebScriptWatCache {
  /** Absolute or workspace-relative directory in which WAT files are stored. */
  readonly root: string;
  /** Implementations must write to a temporary file and rename it into place. */
  readonly writeAtomic: (fileName: string, contents: string) => void;
  /** Optional binary companion writer; implementations must use atomic replacement. */
  readonly writeBinaryAtomic?: (fileName: string, contents: Uint8Array) => void;
  /** Optional reader used by tooling; invalid or stale values are ignored. */
  readonly read?: (fileName: string) => string | undefined;
  /** Optional removal hook to prune stale versions. */
  readonly remove?: (fileName: string) => void;
  /** Optional list files in root directory to support cleanup. */
  readonly listFiles?: () => readonly string[];
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
  readonly analysisPolicy?: unknown;
  readonly analysisRuleIds?: readonly string[];
  readonly analysisSourceMap?: unknown;
  readonly sonSchemaVersion?: string;
  readonly sonGraphHash?: string;
  readonly memoryModel?: 'region-arc-checked-linear';
  readonly boundsChecks?: 'runtime' | 'proven-safe' | 'excluded-by-profile';
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

export function forgeWebScriptSoNPath(
  cache: ForgeWebScriptWatCache,
  key: string,
  variant: 'optimized' | 'unoptimized' = 'optimized',
): string {
  return `${cache.root.replace(/[\\/]+$/, '')}/${key}${variant === 'optimized' ? '' : '.unoptimized'}.sonir.json`;
}

export function persistForgeWebScriptSoN(
  cache: ForgeWebScriptWatCache | undefined,
  key: string,
  module: ForgeWebScriptSoNModule,
  variant: 'optimized' | 'unoptimized' = 'optimized',
): string | undefined {
  if (cache === undefined) return undefined;
  const path = forgeWebScriptSoNPath(cache, key, variant);
  try {
    cache.writeAtomic(path, serializeForgeWebScriptSoN(module));
    cache.logger?.log('debug', 'cache.write', { path, format: 'sonir', variant, graphHash: module.graphHash });
    return path;
  } catch {
    cache.logger?.log('warn', 'cache.write-failed', { path, format: 'sonir' });
    return undefined;
  }
}

export function readForgeWebScriptSoN(
  cache: ForgeWebScriptWatCache | undefined,
  key: string,
  expected?: {
    readonly compilerVersion?: string;
    readonly languageVersion?: string;
    readonly abiVersion?: string;
    readonly sourceHash?: string;
    readonly graphHash?: string;
    readonly optimization?: 'debug' | 'release';
    readonly boundsChecks?: 'runtime' | 'proven-safe' | 'excluded-by-profile';
    readonly memoryModel?: 'region-arc-checked-linear';
  },
): ForgeWebScriptSoNModule | undefined {
  if (cache?.read === undefined) return undefined;
  try {
    return deserializeForgeWebScriptSoN(cache.read(forgeWebScriptSoNPath(cache, key)) ?? '', expected);
  } catch {
    return undefined;
  }
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

export interface ForgeWebScriptCacheIndexEntry {
  readonly key: string;
  readonly files: readonly string[];
  readonly timestamp: number;
}

export interface ForgeWebScriptCacheIndex {
  readonly version: 1;
  readonly entries: Readonly<Record<string, ForgeWebScriptCacheIndexEntry>>;
}

export function forgeWebScriptCacheIndexPath(cache: ForgeWebScriptWatCache): string {
  return `${cache.root.replace(/[\\/]+$/, '')}/.fws-cache-index.json`;
}

export function readForgeWebScriptCacheIndex(
  cache: ForgeWebScriptWatCache | undefined,
): ForgeWebScriptCacheIndex | undefined {
  if (cache?.read === undefined) return undefined;
  try {
    const content = cache.read(forgeWebScriptCacheIndexPath(cache));
    if (content === undefined || content === '') return undefined;
    const parsed = JSON.parse(content);
    if (parsed !== null && typeof parsed === 'object' && parsed.version === 1 && typeof parsed.entries === 'object') {
      return parsed as ForgeWebScriptCacheIndex;
    }
  } catch {
    // Malformed index is ignored and rebuilt.
  }
  return undefined;
}

export function pruneStaleForgeWebScriptCache(
  cache: ForgeWebScriptWatCache | undefined,
  moduleIdOrPath: string,
  currentKey: string,
  newFiles: readonly string[],
): void {
  if (
    cache === undefined ||
    cache.writeAtomic === undefined ||
    (cache.read === undefined && cache.remove === undefined)
  )
    return;
  const existing = readForgeWebScriptCacheIndex(cache) ?? { version: 1, entries: {} };
  const previous = existing.entries[moduleIdOrPath];
  if (previous !== undefined && previous.key !== currentKey && cache.remove !== undefined) {
    for (const oldFile of previous.files) {
      if (!newFiles.includes(oldFile)) {
        try {
          cache.remove(oldFile);
          cache.logger?.log('debug', 'cache.prune', { path: oldFile, reason: 'stale-version' });
        } catch {
          // Failure to remove a single stale artifact must never break compilation.
        }
      }
    }
  }

  const updatedEntries = {
    ...existing.entries,
    [moduleIdOrPath]: {
      key: currentKey,
      files: newFiles,
      timestamp: Date.now(),
    },
  };
  try {
    cache.writeAtomic(
      forgeWebScriptCacheIndexPath(cache),
      JSON.stringify({ version: 1, entries: updatedEntries }, undefined, 2),
    );
  } catch {
    // Stale index persistence failure must never break compilation.
  }
}

export function pruneOrphanedForgeWebScriptCacheFiles(cache: ForgeWebScriptWatCache | undefined): readonly string[] {
  if (cache?.listFiles === undefined || cache.remove === undefined) return [];
  const removed: string[] = [];
  const files = cache.listFiles();
  const indexPath = forgeWebScriptCacheIndexPath(cache);
  const index = readForgeWebScriptCacheIndex(cache);
  const activeFiles = new Set<string>([indexPath]);
  if (index !== undefined) {
    for (const entry of Object.values(index.entries)) {
      for (const file of entry.files) {
        activeFiles.add(file);
        activeFiles.add(file.slice(file.lastIndexOf('/') + 1));
      }
    }
  }

  for (const file of files) {
    if (file.endsWith('.tmp')) {
      try {
        cache.remove(file);
        removed.push(file);
        cache.logger?.log('debug', 'cache.prune', { path: file, reason: 'orphaned-temp' });
      } catch {}
      continue;
    }
    if (index !== undefined && (file.endsWith('.wat') || file.endsWith('.sonir.json') || file.endsWith('.wasm'))) {
      const baseName = file.slice(file.lastIndexOf('/') + 1);
      if (!activeFiles.has(baseName) && !activeFiles.has(file)) {
        try {
          cache.remove(file);
          removed.push(file);
          cache.logger?.log('debug', 'cache.prune', { path: file, reason: 'orphaned-artifact' });
        } catch {}
      }
    }
  }
  return removed;
}
