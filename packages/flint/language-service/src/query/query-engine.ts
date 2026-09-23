import { analyzeFlint } from '../analysis.js';
import { normalizeFlintWorkspaceOptions } from '../options.js';
import { buildSymbolIndex, type FlintSymbolIndex } from '../symbols.js';
import { tokenizeFlint } from '../tokenization.js';

import type {
  FlintAnalysis,
  FlintAnalysisOptions,
  FlintDocument,
  FlintSymbol,
  FlintTokenClassification,
  FlintWorkspaceOptions,
} from '../types.js';

/**
 * Cache and performance statistics for language query engine.
 */
export interface FlintLanguageQueryStats {
  readonly hits: number;
  readonly misses: number;
  readonly queryCount: number;
  readonly cachedDocuments: number;
}

/**
 * Incremental query engine interface for the Flint language service.
 */
export interface FlintLanguageQueryEngine {
  /** Analyzes a document with caching by URI, version, and content hash. */
  readonly analyze: (
    document: FlintDocument,
    options?: FlintWorkspaceOptions,
    analysisOptions?: FlintAnalysisOptions,
  ) => FlintAnalysis;
  /** Returns document symbols with memoized extraction. */
  readonly symbols: (document: FlintDocument) => readonly FlintSymbol[];
  /** Returns token classifications for syntax highlighting. */
  readonly tokenize: (document: FlintDocument) => readonly FlintTokenClassification[];
  /** Invalidates cached queries for a URI or the entire workspace. */
  readonly invalidate: (uri?: string) => void;
  /** Returns cache hit/miss statistics. */
  readonly getStats: () => FlintLanguageQueryStats;
  /** Resets performance counters. */
  readonly resetStats: () => void;
}

/** Computes a fast string hash for content comparisons. */
function fastHash(text: string): string {
  let hash = 2_166_136_261;
  for (const character of text) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * Creates an incremental query engine for language service operations.
 */
export function createFlintLanguageQueryEngine(): FlintLanguageQueryEngine {
  let hits = 0;
  let misses = 0;
  let queryCount = 0;

  interface CacheEntry {
    readonly version: number;
    readonly contentHash: string;
    readonly optionsKey: string;
    readonly analysis: FlintAnalysis;
    readonly symbols: readonly FlintSymbol[];
    readonly tokens: readonly FlintTokenClassification[];
  }

  const cache = new Map<string, CacheEntry>();

  return {
    analyze(
      document: FlintDocument,
      options: FlintWorkspaceOptions = {},
      analysisOptions: FlintAnalysisOptions = {},
    ): FlintAnalysis {
      queryCount += 1;
      const contentHash = fastHash(document.text);
      const normalizedOptions = normalizeFlintWorkspaceOptions(options);
      const optionsKey = JSON.stringify({ normalizedOptions, analysisOptions });
      const cached = cache.get(document.uri);

      if (
        cached !== undefined &&
        cached.version === document.version &&
        cached.contentHash === contentHash &&
        cached.optionsKey === optionsKey
      ) {
        hits += 1;
        return cached.analysis;
      }

      misses += 1;
      const analysis = analyzeFlint(document, normalizedOptions, analysisOptions);
      const tokens = analysis.tokens ?? tokenizeFlint(document.text, document.fileName ?? document.uri);
      const symbolIndex: FlintSymbolIndex = buildSymbolIndex(document.text, analysis.module, tokens);

      cache.set(document.uri, {
        version: document.version,
        contentHash,
        optionsKey,
        analysis,
        symbols: symbolIndex.symbols,
        tokens,
      });

      return analysis;
    },

    symbols(document: FlintDocument): readonly FlintSymbol[] {
      this.analyze(document);
      return cache.get(document.uri)?.symbols ?? [];
    },

    tokenize(document: FlintDocument): readonly FlintTokenClassification[] {
      const analysis = this.analyze(document);
      return cache.get(document.uri)?.tokens ?? analysis.tokens ?? [];
    },

    invalidate(uri?: string): void {
      if (uri === undefined) {
        cache.clear();
      } else {
        cache.delete(uri);
      }
    },

    getStats(): FlintLanguageQueryStats {
      return {
        hits,
        misses,
        queryCount,
        cachedDocuments: cache.size,
      };
    },

    resetStats(): void {
      hits = 0;
      misses = 0;
      queryCount = 0;
    },
  };
}
