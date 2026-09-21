import { deserializeFlintSoN, serializeFlintSoN } from './son-cache.js';

import type { FlintSoNModule } from './son-ir.js';

/**
 * File system or in-memory cache provider for compiler artifacts and WAT outputs.
 */
export interface FlintWatCache {
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
  readonly logger?: FlintCacheLogger;
}

/**
 * Diagnostic logger interface for caching operations and cache hits/misses.
 */
export interface FlintCacheLogger {
  readonly log: (
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    data?: Readonly<Record<string, unknown>>,
  ) => void;
}

/**
 * Input parameters used to compute a deterministic compilation cache key.
 */
export interface FlintWatCacheKeyInput {
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

/**
 * Recursively orders object keys and normalizes arrays to produce a deterministic object structure.
 *
 * @param value - Any arbitrary JavaScript value.
 * @returns Deterministically ordered object or value copy.
 */
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

/**
 * Computes a 32-bit FNV-1a hash formatted as an 8-character hexadecimal string.
 *
 * @param value - Input string to hash.
 * @returns 8-character lowercase hexadecimal hash.
 */
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
export function flintWatCacheKey(input: FlintWatCacheKeyInput): string {
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
export function flintWatPath(cache: FlintWatCache, key: string): string {
  return `${cache.root.replace(/[\\/]+$/, '')}/${key}.wat`;
}

/**
 * Returns the path to the SonIR JSON artifact for a given cache key and variant.
 */
export function flintSoNPath(
  cache: FlintWatCache,
  key: string,
  variant: 'optimized' | 'unoptimized' = 'optimized',
): string {
  return `${cache.root.replace(/[\\/]+$/, '')}/${key}${variant === 'optimized' ? '' : '.unoptimized'}.sonir.json`;
}

/**
 * Persists a SonIR module to disk in the cache directory.
 */
export function persistFlintSoN(
  cache: FlintWatCache | undefined,
  key: string,
  module: FlintSoNModule,
  variant: 'optimized' | 'unoptimized' = 'optimized',
): string | undefined {
  if (cache === undefined) return undefined;
  const path = flintSoNPath(cache, key, variant);
  try {
    cache.writeAtomic(path, serializeFlintSoN(module));
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
export function readFlintSoN(
  cache: FlintWatCache | undefined,
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
): FlintSoNModule | undefined {
  if (cache?.read === undefined) return undefined;
  try {
    return deserializeFlintSoN(cache.read(flintSoNPath(cache, key)) ?? '', expected);
  } catch {
    return undefined;
  }
}

/**
 * Optimization variant identifier for emitted debug artifacts.
 */
export type FlintDebugArtifactVariant = 'optimized' | 'unoptimized';

/**
 * File paths to persisted debug artifacts emitted during compilation.
 */
export interface FlintDebugArtifactPaths {
  readonly optimizedWatPath?: string;
  readonly unoptimizedWatPath?: string;
  readonly optimizedWasmPath?: string;
  readonly unoptimizedWasmPath?: string;
}

/**
 * Returns the debug artifact path for a given variant and format.
 */
function flintDebugArtifactPath(
  cache: FlintWatCache,
  key: string,
  variant: FlintDebugArtifactVariant,
  format: 'wat' | 'wasm',
): string {
  return `${cache.root.replace(/[\\/]+$/, '')}/${key}.${variant}.${format}`;
}

/**
 * Persists a WAT string to disk in the cache directory.
 */
export function persistFlintWat(cache: FlintWatCache | undefined, key: string, wat: string): string | undefined {
  if (cache === undefined) return undefined;
  const path = flintWatPath(cache, key);
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
// skipcq: JS-R1005
export function persistFlintDebugArtifacts(
  cache: FlintWatCache | undefined,
  key: string,
  artifacts: {
    readonly optimizedWat?: string;
    readonly unoptimizedWat?: string;
    readonly optimizedWasm?: Uint8Array;
    readonly unoptimizedWasm?: Uint8Array;
  },
): FlintDebugArtifactPaths {
  if (cache === undefined) return {};
  const paths: {
    optimizedWatPath?: string;
    unoptimizedWatPath?: string;
    optimizedWasmPath?: string;
    unoptimizedWasmPath?: string;
  } = {};
  // skipcq: JS-D1001
  const writeWat = (variant: FlintDebugArtifactVariant, contents: string): void => {
    const path = flintDebugArtifactPath(cache, key, variant, 'wat');
    try {
      cache.writeAtomic(path, contents);
      paths[`${variant}WatPath`] = path;
    } catch {
      cache.logger?.log('warn', 'cache.write-failed', { path, format: 'wat', variant });
      // Debug inspection must never make compilation fail.
    }
  };
  // skipcq: JS-D1001
  const writeWasm = (variant: FlintDebugArtifactVariant, contents: Uint8Array): void => {
    if (cache.writeBinaryAtomic === undefined) return;
    const path = flintDebugArtifactPath(cache, key, variant, 'wasm');
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

/**
 * Index entry tracking cached files and timestamp for a specific module key.
 */
export interface FlintCacheIndexEntry {
  readonly key: string;
  readonly files: readonly string[];
  readonly timestamp: number;
}

/**
 * Persisted cache manifest tracking active artifacts across modules to enable stale cleanup.
 */
export interface FlintCacheIndex {
  readonly version: 1;
  readonly entries: Readonly<Record<string, FlintCacheIndexEntry>>;
}

/**
 * Returns the path to the cache index file `.flint-cache-index.json`.
 */
export function flintCacheIndexPath(cache: FlintWatCache): string {
  return `${cache.root.replace(/[\\/]+$/, '')}/.flint-cache-index.json`;
}

/**
 * Validates whether a parsed JSON object matches the cache index structure.
 */
function isValidCacheIndex(parsed: unknown): parsed is FlintCacheIndex {
  if (parsed === null || typeof parsed !== 'object') return false;
  const candidate = parsed as Record<string, unknown>;
  return candidate.version === 1 && typeof candidate.entries === 'object' && candidate.entries !== null;
}

/**
 * Safely parses string content into a validated cache index.
 */
function parseCacheIndexContent(content: string | undefined): FlintCacheIndex | undefined {
  if (!content) return undefined;
  try {
    const parsed = JSON.parse(content);
    return isValidCacheIndex(parsed) ? parsed : undefined;
  } catch {
    // Malformed index is ignored and rebuilt.
    return undefined;
  }
}

/**
 * Reads and parses the cache index from disk, returning undefined if missing or malformed.
 */
export function readFlintCacheIndex(cache: FlintWatCache | undefined): FlintCacheIndex | undefined {
  if (cache === undefined || cache.read === undefined) return undefined;
  return parseCacheIndexContent(cache.read(flintCacheIndexPath(cache)));
}

/**
 * Removes files that belonged to a previous compilation key but are not present in the new set.
 */
function removeStaleFiles(cache: FlintWatCache, previousFiles: readonly string[], newFiles: readonly string[]): void {
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
 * Updates cache index entries with the current module's file list.
 */
function updateCacheIndexEntries(
  existingEntries: Readonly<Record<string, FlintCacheIndexEntry>>,
  moduleIdOrPath: string,
  currentKey: string,
  files: readonly string[],
): Record<string, FlintCacheIndexEntry> {
  return {
    ...existingEntries,
    [moduleIdOrPath]: {
      key: currentKey,
      files,
      timestamp: Date.now(),
    },
  };
}

/**
 * Checks and prunes previous files if the cache key has changed.
 */
function pruneIfStale(
  cache: FlintWatCache,
  previous: FlintCacheIndexEntry | undefined,
  currentKey: string,
  newFiles: readonly string[],
): void {
  if (previous === undefined || previous.key === currentKey) return;
  removeStaleFiles(cache, previous.files, newFiles);
}

/**
 * Persists the cache index to disk atomically.
 */
function writeCacheIndex(cache: FlintWatCache, entries: Record<string, FlintCacheIndexEntry>): void {
  if (cache.writeAtomic === undefined) return;
  try {
    cache.writeAtomic(flintCacheIndexPath(cache), JSON.stringify({ version: 1, entries }, undefined, 2));
  } catch {
    // Stale index persistence failure must never break compilation.
  }
}

/**
 * Prunes stale cached artifacts for a given module ID when its cache key has changed.
 */
export function pruneStaleFlintCache(
  cache: FlintWatCache | undefined,
  moduleIdOrPath: string,
  currentKey: string,
  newFiles: readonly string[],
): void {
  if (cache === undefined) return;
  const existing = readFlintCacheIndex(cache);
  const entries = existing === undefined ? {} : existing.entries;
  pruneIfStale(cache, entries[moduleIdOrPath], currentKey, newFiles);
  writeCacheIndex(cache, updateCacheIndexEntries(entries, moduleIdOrPath, currentKey, newFiles));
}

/**
 * Safely removes a file from the cache, logging the event.
 */
function removeCacheFileSilently(cache: FlintWatCache, file: string, reason: string): boolean {
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
function collectActiveFiles(indexPath: string, index: FlintCacheIndex | undefined): Set<string> {
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
 * Attempts to prune an individual orphaned or temporary file.
 */
function tryPruneFile(
  cache: FlintWatCache,
  file: string,
  hasIndex: boolean,
  activeFiles: ReadonlySet<string>,
): boolean {
  if (file.endsWith('.tmp')) {
    return removeCacheFileSilently(cache, file, 'orphaned-temp');
  }
  if (!hasIndex) return false;
  if (!isOrphanedArtifact(file, activeFiles)) return false;
  return removeCacheFileSilently(cache, file, 'orphaned-artifact');
}

/**
 * Prunes orphaned temporary and unindexed cache files from the cache directory.
 */
export function pruneOrphanedFlintCacheFiles(cache: FlintWatCache | undefined): readonly string[] {
  if (cache === undefined || cache.listFiles === undefined) return [];
  const files = cache.listFiles();
  const index = readFlintCacheIndex(cache);
  const activeFiles = collectActiveFiles(flintCacheIndexPath(cache), index);
  const hasIndex = index !== undefined;
  const removed: string[] = [];

  for (const file of files) {
    if (tryPruneFile(cache, file, hasIndex, activeFiles)) {
      removed.push(file);
    }
  }
  return removed;
}
