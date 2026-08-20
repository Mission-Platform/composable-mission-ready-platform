/** Limits applied to the in-process compiler caches. */
export interface ForgeCacheLimits {
  /** Maximum number of neutral semantic modules retained by one service. */
  readonly semanticModules?: number;
}

/** Observable cache counters for one compiler service lifetime. */
export interface ForgeCacheStats {
  readonly semanticHits: number;
  readonly semanticMisses: number;
  readonly semanticEvictions: number;
  readonly invalidations: number;
  readonly invalidatedEntries: number;
}

export const DEFAULT_FORGE_CACHE_LIMITS: Required<ForgeCacheLimits> = {
  semanticModules: 256,
};

export function createEmptyForgeCacheStats(): ForgeCacheStats {
  return {
    semanticHits: 0,
    semanticMisses: 0,
    semanticEvictions: 0,
    invalidations: 0,
    invalidatedEntries: 0,
  };
}
