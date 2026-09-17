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

/**
 * Computes a deterministic cache key for a compilation request.
 */
export function forgeWebScriptWatCacheKey(input: ForgeWebScriptWatCacheKeyInput): string {
  const normalized = {
    ...input,
    sourceGraph: input.sourceGraph
      ?.map((module) => ({ ...module }))
      .toSorted((left, right) => left.fileName.localeCompare(right.fileName)),
  };
  return hash(JSON.stringify(stableValue(normalized)));
}

/**
 * Returns the path to the WAT file for a given cache key.
 */
export function forgeWebScriptWatPath(cache: ForgeWebScriptWatCache, key: string): string {
  return `${cache.root.replace(/[\\/]+$/, '')}/${key}.wat`;
}

/**
 * Returns the path to the SonIR JSON artifact for a given cache key and variant.
 */
export function forgeWebScriptSoNPath(
  cache: ForgeWebScriptWatCache,
  key: string,
  variant: 'optimized' | 'unoptimized' = 'optimized',
): string {
  return `${cache.root.replace(/[\\/]+$/, '')}/${key}${variant === 'optimized' ? '' : '.unoptimized'}.sonir.json`;
}

/**
 * Persists a SonIR module to disk in the cache directory.
 */
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

/**
 * Reads and deserializes a SonIR module from disk.
 */
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

/**
 * Returns the debug artifact path for a given variant and format.
 */
function forgeWebScriptDebugArtifactPath(
  cache: ForgeWebScriptWatCache,
  key: string,
  variant: ForgeWebScriptDebugArtifactVariant,
  format: 'wat' | 'wasm',
): string {
  return `${cache.root.replace(/[\\/]+$/, '')}/${key}.${variant}.${format}`;
}

/**
 * Persists a WAT string to disk in the cache directory.
 */
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

/**
 * Persists debug artifacts (WAT and Wasm, both optimized and unoptimized) to disk.
 */
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

/**
 * Returns the path to the cache index file `.fws-cache-index.json`.
 */
export function forgeWebScriptCacheIndexPath(cache: ForgeWebScriptWatCache): string {
  return `${cache.root.replace(/[\\/]+$/, '')}/.fws-cache-index.json`;
}

/**
 * Validates whether a parsed JSON object matches the cache index structure.
 */
function isValidCacheIndex(parsed: unknown): parsed is ForgeWebScriptCacheIndex {
  if (parsed === null || typeof parsed !== 'object') return false;
  const candidate = parsed as Record<string, unknown>;
  return candidate.version === 1 && typeof candidate.entries === 'object' && candidate.entries !== null;
}

/**
 * Reads and parses the cache index from disk, returning undefined if missing or malformed.
 */
export function readForgeWebScriptCacheIndex(
  cache: ForgeWebScriptWatCache | undefined,
): ForgeWebScriptCacheIndex | undefined {
  if (cache?.read === undefined) return undefined;
  try {
    const content = cache.read(forgeWebScriptCacheIndexPath(cache));
    if (content === undefined || content === '') return undefined;
    const parsed = JSON.parse(content);
    return isValidCacheIndex(parsed) ? parsed : undefined;
  } catch {
    // Malformed index is ignored and rebuilt.
    return undefined;
  }
}

/**
 * Removes files that belonged to a previous compilation key but are not present in the new set.
 */
function removeStaleFiles(
  cache: ForgeWebScriptWatCache,
  previousFiles: readonly string[],
  newFiles: readonly string[],
): void {
  if (cache.remove === undefined) return;
  for (const oldFile of previousFiles) {
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

/**
 * Prunes stale cached artifacts for a given module ID when its cache key has changed.
 */
export function pruneStaleForgeWebScriptCache(
  cache: ForgeWebScriptWatCache | undefined,
  moduleIdOrPath: string,
  currentKey: string,
  newFiles: readonly string[],
): void {
  if (cache === undefined || cache.writeAtomic === undefined) return;
  const existing = readForgeWebScriptCacheIndex(cache) ?? { version: 1, entries: {} };
  const previous = existing.entries[moduleIdOrPath];
  if (previous !== undefined && previous.key !== currentKey) {
    removeStaleFiles(cache, previous.files, newFiles);
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

/**
 * Safely removes a file from the cache, logging the event.
 */
function removeCacheFileSilently(cache: ForgeWebScriptWatCache, file: string, reason: string): boolean {
  if (cache.remove === undefined) return false;
  try {
    cache.remove(file);
    cache.logger?.log('debug', 'cache.prune', { path: file, reason });
    return true;
  } catch {
    // Ignore removal errors to prevent blocking compiler execution.
    return false;
  }
}

/**
 * Determines whether a file is an orphaned compilation artifact.
 */
function isOrphanedArtifact(file: string, activeFiles: ReadonlySet<string>): boolean {
  if (!file.endsWith('.wat') && !file.endsWith('.sonir.json') && !file.endsWith('.wasm')) return false;
  const baseName = file.slice(file.lastIndexOf('/') + 1);
  return !activeFiles.has(baseName) && !activeFiles.has(file);
}

/**
 * Collects all active file paths and basenames from the cache index.
 */
function collectActiveFiles(indexPath: string, index: ForgeWebScriptCacheIndex | undefined): Set<string> {
  const activeFiles = new Set<string>([indexPath]);
  if (index === undefined) return activeFiles;
  for (const entry of Object.values(index.entries)) {
    for (const file of entry.files) {
      activeFiles.add(file);
      activeFiles.add(file.slice(file.lastIndexOf('/') + 1));
    }
  }
  return activeFiles;
}

/**
 * Prunes orphaned temporary and unindexed cache files from the cache directory.
 */
export function pruneOrphanedForgeWebScriptCacheFiles(cache: ForgeWebScriptWatCache | undefined): readonly string[] {
  if (cache?.listFiles === undefined || cache.remove === undefined) return [];
  const removed: string[] = [];
  const files = cache.listFiles();
  const index = readForgeWebScriptCacheIndex(cache);
  const activeFiles = collectActiveFiles(forgeWebScriptCacheIndexPath(cache), index);

  for (const file of files) {
    if (file.endsWith('.tmp')) {
      if (removeCacheFileSilently(cache, file, 'orphaned-temp')) {
        removed.push(file);
      }
      continue;
    }
    if (
      index !== undefined &&
      isOrphanedArtifact(file, activeFiles) &&
      removeCacheFileSilently(cache, file, 'orphaned-artifact')
    ) {
      removed.push(file);
    }
  }
  return removed;
}
