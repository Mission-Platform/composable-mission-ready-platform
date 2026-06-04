import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';

import { breakpoints } from './breakpoints';
import { useBreakpoints } from './use-breakpoints';

// ── matchMedia mock ───────────────────────────────────────────────────────────

function mockWindowWidth(width: number): void {
  Object.defineProperty(globalThis.window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
}

function createMatchMediaMock(width: number) {
  return (query: string) => {
    const match = query.match(/\(min-width:\s*(\d+)px\)/);
    const minWidth = match ? Number.parseInt(match[1], 10) : 0;
    const matches = width >= minWidth;

    return {
      matches,
      media: query,
      onchange: undefined,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList;
  };
}

beforeEach(() => {
  mockWindowWidth(1024);
  Object.defineProperty(globalThis.window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: createMatchMediaMock(1024),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function mountComposable() {
  let result: ReturnType<typeof useBreakpoints>;

  const TestComponent = defineComponent({
    setup() {
      result = useBreakpoints();
      return {};
    },
    template: '<div />',
  });

  mount(TestComponent);
  return result!;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useBreakpoints', () => {
  describe('resolveBreakpoint', () => {
    it('returns "md" at 1024px', () => {
      mockWindowWidth(1024);
      globalThis.window.matchMedia = createMatchMediaMock(1024);
      const { current } = mountComposable();
      expect(current.value).toBe('md');
    });

    it('returns "2xs" below xs threshold (< 480px)', () => {
      mockWindowWidth(320);
      globalThis.window.matchMedia = createMatchMediaMock(320);
      const { current } = mountComposable();
      expect(current.value).toBe('2xs');
    });

    it('returns "xs" at exactly 480px', () => {
      mockWindowWidth(480);
      globalThis.window.matchMedia = createMatchMediaMock(480);
      const { current } = mountComposable();
      expect(current.value).toBe('xs');
    });

    it('returns "md" at 1280px (below lg threshold)', () => {
      mockWindowWidth(1280);
      globalThis.window.matchMedia = createMatchMediaMock(1280);
      const { current } = mountComposable();
      expect(current.value).toBe('md');
    });

    it('returns "lg" at exactly 1920px (Full HD)', () => {
      mockWindowWidth(1920);
      globalThis.window.matchMedia = createMatchMediaMock(1920);
      const { current } = mountComposable();
      expect(current.value).toBe('lg');
    });

    it('returns "xl" at exactly 2560px (QHD)', () => {
      mockWindowWidth(2560);
      globalThis.window.matchMedia = createMatchMediaMock(2560);
      const { current } = mountComposable();
      expect(current.value).toBe('xl');
    });

    it('returns "2xl" at exactly 3840px (4K)', () => {
      mockWindowWidth(3840);
      globalThis.window.matchMedia = createMatchMediaMock(3840);
      const { current } = mountComposable();
      expect(current.value).toBe('2xl');
    });
  });

  describe('isAbove', () => {
    it('returns true when viewport is at or above the given breakpoint', () => {
      mockWindowWidth(1920);
      globalThis.window.matchMedia = createMatchMediaMock(1920);
      const { isAbove } = mountComposable();
      expect(isAbove('lg')).toBe(true);
      expect(isAbove('md')).toBe(true);
      expect(isAbove('xl')).toBe(false);
    });

    it('returns false when viewport is below the given breakpoint', () => {
      mockWindowWidth(600);
      globalThis.window.matchMedia = createMatchMediaMock(600);
      const { isAbove } = mountComposable();
      expect(isAbove('md')).toBe(false);
      expect(isAbove('xs')).toBe(true);
    });
  });

  describe('isBelow', () => {
    it('returns true when viewport is strictly below the given breakpoint', () => {
      mockWindowWidth(1024);
      globalThis.window.matchMedia = createMatchMediaMock(1024);
      const { isBelow } = mountComposable();
      expect(isBelow('xl')).toBe(true);
      expect(isBelow('lg')).toBe(true);
      expect(isBelow('md')).toBe(false);
    });

    it('returns false for lg when viewport is exactly 1920px', () => {
      mockWindowWidth(1920);
      globalThis.window.matchMedia = createMatchMediaMock(1920);
      const { isBelow } = mountComposable();
      expect(isBelow('lg')).toBe(false);
      expect(isBelow('xl')).toBe(true);
    });
  });

  describe('isOnly', () => {
    it('returns true when viewport is exactly within the given band', () => {
      mockWindowWidth(1024);
      globalThis.window.matchMedia = createMatchMediaMock(1024);
      const { isOnly } = mountComposable();
      expect(isOnly('md')).toBe(true);
      expect(isOnly('sm')).toBe(false);
      expect(isOnly('lg')).toBe(false);
    });
  });

  describe('active map', () => {
    it('correctly marks all breakpoints at 1920px (lg)', () => {
      mockWindowWidth(1920);
      globalThis.window.matchMedia = createMatchMediaMock(1920);
      const { active } = mountComposable();
      expect(active.value['2xs']).toBe(true);
      expect(active.value['xs']).toBe(true);
      expect(active.value['sm']).toBe(true);
      expect(active.value['md']).toBe(true);
      expect(active.value['lg']).toBe(true);
      expect(active.value['xl']).toBe(false);
      expect(active.value['2xl']).toBe(false);
    });

    it('only marks 2xs as active at 320px', () => {
      mockWindowWidth(320);
      globalThis.window.matchMedia = createMatchMediaMock(320);
      const { active } = mountComposable();
      expect(active.value['2xs']).toBe(true);
      expect(active.value['xs']).toBe(false);
    });
  });

  describe('breakpoint values sanity', () => {
    it('has lg at 1920px (Full HD), xl at 2560px (QHD), and 2xl at 3840px (4K)', () => {
      expect(breakpoints['lg']).toBe(1920);
      expect(breakpoints['xl']).toBe(2560);
      expect(breakpoints['2xl']).toBe(3840);
    });

    it('has seven breakpoint keys in ascending order', () => {
      const values = Object.values(breakpoints);
      for (let index = 1; index < values.length; index++) {
        expect(values[index]).toBeGreaterThan(values[index - 1]);
      }
    });
  });
});
