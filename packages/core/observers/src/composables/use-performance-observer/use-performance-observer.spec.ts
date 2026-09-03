import { describe, expect, it, vi } from 'vitest';

import { usePerformanceObserver } from './use-performance-observer';

describe('usePerformanceObserver', () => {
  it('does nothing when PerformanceObserver is unavailable (SSR baseline)', () => {
    const callback = vi.fn();
    // @ts-expect-error
    const original = globalThis.PerformanceObserver;
    // @ts-expect-error
    delete globalThis.PerformanceObserver;

    try {
      usePerformanceObserver(callback);
      expect(callback).not.toHaveBeenCalled();
    } finally {
      globalThis.PerformanceObserver = original;
    }
  });
});
