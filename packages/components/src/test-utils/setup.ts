// ─── Vitest global setup ──────────────────────────────────────────────────────
//
// jsdom does not implement a handful of browser observer APIs that some of our
// dependencies (e.g. `@dnd-kit/dom`, which powers the form builder's drag and
// drop) reference at import time. Provide minimal no-op polyfills so components
// that pull these in can be mounted under the jsdom test environment.

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

class IntersectionObserverStub {
  readonly rootMargin = '';
  readonly thresholds: ReadonlyArray<number> = [];
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): [] {
    return [];
  }
}

const globalScope = globalThis as Record<string, unknown>;

globalScope.ResizeObserver ??= ResizeObserverStub;
globalScope.IntersectionObserver ??= IntersectionObserverStub;

// jsdom does not implement `matchMedia`, which `@mission-platform/breakpoints`'
// `useBreakpoints` relies on. Provide a minimal implementation that evaluates
// `min-width`/`max-width` queries against the current `window.innerWidth` so
// responsive components (e.g. the sidebar's inline variant) can be mounted.
if (globalThis.window !== undefined && typeof globalThis.window.matchMedia !== 'function') {
  globalThis.window.matchMedia = (query: string): MediaQueryList => {
    function matches(): boolean {
      const width = globalThis.window.innerWidth;
      const min = /min-width:\s*(\d+)px/.exec(query);
      const max = /max-width:\s*(\d+)px/.exec(query);
      if (query === 'all') return true;
      if (query === 'not all') return false;
      if (min && width < Number(min[1])) return false;
      if (max && width > Number(max[1])) return false;
      return Boolean(min || max);
    }
    return {
      get matches() {
        return matches();
      },
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList;
  };
}
