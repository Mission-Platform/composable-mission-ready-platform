// ─── Vitest global setup ──────────────────────────────────────────────────────
//
// jsdom does not implement a handful of browser observer APIs that some of our
// dependencies (e.g. `@dnd-kit/dom`, which powers the form builder's drag and
// drop) reference at import time. Provide minimal no-op polyfills so components
// that pull these in can be mounted under the jsdom test environment.

class ResizeObserverStub {
  /**
   * No-op method for observation in test setup.
   * Observation is not required in the test environment.
   */
  static observe(): void {
    // empty because observation is not required in test setup
  }
  /**
   * Unobserves any observers. This method is a no-op in this mock implementation.
   *
   * @returns {void} Does nothing.
   */
  static unobserve(): void {
    // empty because unobserve is a no-op in this mock implementation
  }
  /**
   * Disconnects the test environment. This is a no-op for tests.
   * @returns void
   */
  static disconnect(): void {
    // empty because no-op for tests
  }
}

/**
 * Stub implementation of IntersectionObserver for testing environments.
 */
class IntersectionObserverStub {
  readonly rootMargin = '';
  readonly thresholds: ReadonlyArray<number> = [];
  /**
   * Stub method for starting observation of elements. Does nothing.
   * @returns void
   */
  static observe(): void {
    // empty because no observations are needed in this context
  }
  /**
   * Stub method for stopping observation of elements. Does nothing.
   * @returns void
   */
  static unobserve(): void {
    // empty because no teardown of observers is required
  }
  /**
   * Stub method for disconnecting the observer. Does nothing.
   * @returns void
   */
  static disconnect(): void {
    // empty because this is a stub for the test environment
  }
  /**
   * Stub method for retrieving recorded intersection entries. Always returns an empty array.
   * @returns [] Empty array of intersection records.
   */
  static takeRecords(): [] {
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
    /**
     * Evaluates the media query against the current window width.
     *
     * @returns {boolean} True if the current window width matches the query.
     */
    function matches(): boolean {
      const width = globalThis.window.innerWidth;

      const staticQueries: Record<string, boolean> = {
        'all': true,
        'not all': false,
      };

      if (query in staticQueries) {
        return staticQueries[query];
      }

      const minMatch = /min-width:\s*(\d+)px/.exec(query);
      const maxMatch = /max-width:\s*(\d+)px/.exec(query);
      const hasConstraint = Boolean(minMatch || maxMatch);
      if (!hasConstraint) {
        return false;
      }

      const minValue = minMatch ? Number(minMatch[1]) : -Infinity;
      const maxValue = maxMatch ? Number(maxMatch[1]) : Infinity;

      return width >= minValue && width <= maxValue;
    }
    return {
      get matches() {
        return matches();
      },
      media: query,
      addEventListener: () => { // empty because not needed in test setup },
      removeEventListener: () => {
        // empty because removeEventListener is a no-op in this test setup
      },
      addListener: () => {
        // empty because not needed in test environment
      },
      removeListener: () => {
        // empty because no-op listener for tests
      },
      dispatchEvent: () => false,
    } as unknown as MediaQueryList;
  };
}
