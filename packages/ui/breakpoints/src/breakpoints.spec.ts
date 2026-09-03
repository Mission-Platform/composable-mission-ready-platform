import { describe, expect, it } from 'vitest';

import {
  breakpointKeys,
  breakpoints,
  getBreakpointValue,
  maxMediaQuery,
  mediaQuery,
  resolveBreakpoint,
} from './breakpoints';

describe('breakpoints core', () => {
  describe('resolveBreakpoint', () => {
    it.each([
      [0, '2xs'],
      [320, '2xs'],
      [480, 'xs'],
      [1024, 'md'],
      [1280, 'md'],
      [1920, 'lg'],
      [2560, 'xl'],
      [3840, '2xl'],
    ] as const)('resolves %ipx to the "%s" band', (width, expected) => {
      expect(resolveBreakpoint(width)).toBe(expected);
    });
  });

  describe('getBreakpointValue', () => {
    it('returns the pixel threshold for a key', () => {
      expect(getBreakpointValue('lg')).toBe(1920);
      expect(getBreakpointValue('2xs')).toBe(0);
    });
  });

  describe('mediaQuery', () => {
    it('returns a min-width query, or "all" for the zero-width base band', () => {
      expect(mediaQuery('2xs')).toBe('all');
      expect(mediaQuery('lg')).toBe('(min-width: 1920px)');
      expect(mediaQuery('xl')).toBe('(min-width: 2560px)');
    });
  });

  describe('maxMediaQuery', () => {
    it('returns an upper-bound query, or "not all" for the zero-width base band', () => {
      expect(maxMediaQuery('2xs')).toBe('not all');
      expect(maxMediaQuery('md')).toBe('(max-width: 1023px)');
    });
  });

  describe('scale sanity', () => {
    it('anchors lg/xl/2xl at Full HD / QHD / 4K widths', () => {
      expect(breakpoints['lg']).toBe(1920);
      expect(breakpoints['xl']).toBe(2560);
      expect(breakpoints['2xl']).toBe(3840);
    });

    it('has seven breakpoint keys whose thresholds ascend', () => {
      expect(breakpointKeys).toHaveLength(7);
      const values = breakpointKeys.map((key) => breakpoints[key]);
      for (let index = 1; index < values.length; index++) {
        expect(values[index]).toBeGreaterThan(values[index - 1]);
      }
    });
  });
});
