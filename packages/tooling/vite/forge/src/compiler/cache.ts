/** Limits applied to the in-process compiler caches. */
export interface ForgeCacheLimits {
  /** Maximum number of neutral semantic modules retained by one service. */
  readonly semanticModules?: number;
  /** Maximum number of parsed frontend modules retained by one service. */
  readonly frontendModules?: number;
  /** Maximum number of optimized parser modules retained by one service. */
  readonly optimizedModules?: number;
  /** Maximum number of prepared project graphs retained by one service. */
  readonly projectGraphs?: number;
}

/** Observable cache counters for one compiler service lifetime. */
export interface ForgeCacheStats {
  readonly semanticHits: number;
  readonly semanticMisses: number;
  readonly semanticEvictions: number;
  readonly frontendEvictions: number;
  readonly optimizedEvictions: number;
  readonly projectGraphEvictions: number;
  readonly invalidations: number;
  readonly invalidatedEntries: number;
}

export const DEFAULT_FORGE_CACHE_LIMITS: Required<ForgeCacheLimits> = {
  semanticModules: 256,
  frontendModules: 256,
  optimizedModules: 256,
  projectGraphs: 32,
};

export function createEmptyForgeCacheStats(): ForgeCacheStats {
  return {
    semanticHits: 0,
    semanticMisses: 0,
    semanticEvictions: 0,
    frontendEvictions: 0,
    optimizedEvictions: 0,
    projectGraphEvictions: 0,
    invalidations: 0,
    invalidatedEntries: 0,
  };
}
