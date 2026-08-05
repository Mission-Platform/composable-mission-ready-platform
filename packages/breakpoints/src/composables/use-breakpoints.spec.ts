import { beforeAll, describe, expect, it, vi } from 'vitest';

import { useBreakpoints } from './use-breakpoints';

/**
 * Mock ResizeObserver to simulate resize events in JSDOM.
 */
class MockResizeObserver {
  private static callback: ResizeObserverCallback;
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();

  constructor(callback: ResizeObserverCallback) {
    MockResizeObserver.callback = callback;
  }

  static trigger(width: number) {
    if (this.callback) {
      this.callback([{ contentRect: { width }, target: document.documentElement } as ResizeObserverEntry], {} as ResizeObserver);
    }
  }
}

describe('useBreakpoints', () => {
  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  it('reads an initial breakpoint of 2xs when width is 0', () => {
    const { active, width } = useBreakpoints();
    expect(width).toBe(0);
    expect(active).toBe('2xs');
  });

  it('reports matches correctly for the initial 2xs band', () => {
    const { matches } = useBreakpoints();
    expect(matches['2xs']).toBe(true);
    expect(matches['sm']).toBe(false);
    expect(matches['lg']).toBe(false);
  });
});
