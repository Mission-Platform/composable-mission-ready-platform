import { afterEach, describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';

import { prefersReducedMotion, useReducedMotion } from './use-reduced-motion';

interface MockMediaQueryList {
  matches: boolean;
  media: string;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  dispatch: (matches: boolean) => void;
}

function installMatchMedia(initialMatches: boolean): MockMediaQueryList {
  let listener: ((event: MediaQueryListEvent) => void) | undefined;
  const mql: MockMediaQueryList = {
    matches: initialMatches,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: vi.fn((_type: string, callback: (event: MediaQueryListEvent) => void) => {
      listener = callback;
    }),
    removeEventListener: vi.fn(() => {
      listener = undefined;
    }),
    dispatch(matches: boolean) {
      this.matches = matches;
      listener?.({ matches } as MediaQueryListEvent);
    },
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => mql),
  );
  return mql;
}

describe('useReducedMotion', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('prefersReducedMotion', () => {
    it('returns false when matchMedia is unavailable', () => {
      expect(prefersReducedMotion()).toBe(false);
    });

    it('reflects the current media-query match', () => {
      installMatchMedia(true);
      expect(prefersReducedMotion()).toBe(true);
    });
  });

  it('is false (and registers no listener) when matchMedia is unavailable', () => {
    const scope = effectScope();
    const reduced = scope.run(() => useReducedMotion())!;
    expect(reduced.value).toBe(false);
    scope.stop();
  });

  it('seeds from the initial preference and updates reactively', () => {
    const mql = installMatchMedia(false);
    const scope = effectScope();
    const reduced = scope.run(() => useReducedMotion())!;

    expect(reduced.value).toBe(false);
    mql.dispatch(true);
    expect(reduced.value).toBe(true);
    mql.dispatch(false);
    expect(reduced.value).toBe(false);

    scope.stop();
  });

  it('removes its media-query listener when the scope is disposed', () => {
    const mql = installMatchMedia(false);
    const scope = effectScope();
    scope.run(() => useReducedMotion());

    expect(mql.addEventListener).toHaveBeenCalledTimes(1);
    scope.stop();
    expect(mql.removeEventListener).toHaveBeenCalledTimes(1);
  });
});
