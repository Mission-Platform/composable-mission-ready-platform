import { describe, expect, it } from 'vitest';

import { toMapColor } from './to-map-color';

// `toMapColor` converts the OKLab/OKLCH colour strings emitted by
// `@mission-platform/tokens` into the sRGB colours MapLibre GL can parse, while
// leaving any already-parseable colour untouched.
describe('toMapColor', () => {
  it('converts `oklab()` to an `rgb()` string', () => {
    // `oklab(1 0 0)` is pure white → all channels saturate to 255.
    expect(toMapColor('oklab(1 0 0)')).toBe('rgb(255, 255, 255)');
    // `oklab(0 0 0)` is pure black.
    expect(toMapColor('oklab(0 0 0)')).toBe('rgb(0, 0, 0)');
  });

  it('emits `rgba()` when an OKLab alpha < 1 is supplied', () => {
    expect(toMapColor('oklab(1 0 0 / 0.5)')).toBe('rgba(255, 255, 255, 0.5)');
  });

  it('accepts percentage lightness', () => {
    expect(toMapColor('oklab(100% 0 0)')).toBe('rgb(255, 255, 255)');
  });

  it('converts `oklch()` (zero chroma → same as OKLab a=b=0)', () => {
    expect(toMapColor('oklch(1 0 0)')).toBe('rgb(255, 255, 255)');
    expect(toMapColor('oklch(0 0 0)')).toBe('rgb(0, 0, 0)');
  });

  it('returns non-OKLab/OKLCH colours unchanged', () => {
    for (const color of ['#6c2fd4', 'rgb(1, 2, 3)', 'rgba(1, 2, 3, 0.4)', 'hsl(120, 50%, 50%)', 'red']) {
      expect(toMapColor(color)).toBe(color);
    }
  });

  it('returns the input unchanged when the OKLab components are not finite', () => {
    expect(toMapColor('oklab(none 0 0)')).toBe('oklab(none 0 0)');
  });
});
