import { describe, expect, it } from 'vitest';

import {
  FLINT_MATH_DEG_TO_RAD,
  FLINT_MATH_E,
  FLINT_MATH_PI,
  FLINT_MATH_RAD_TO_DEG,
  FLINT_MATH_SQRT2,
  FLINT_MATH_TAU,
  createFlintColorRgba,
  flintApproxEqual,
  flintCeil,
  flintClamp,
  flintColorHsvToRgb,
  flintColorLerpOklab,
  flintColorOklabToSrgb,
  flintColorRgbToHsv,
  flintColorSrgbToOklab,
  flintDegrees,
  flintFloor,
  flintFract,
  flintLerp,
  flintRadians,
  flintSign,
  flintStep,
} from './ieee754.js';

describe('Flint Runtime Math: IEEE 754 & Colorimetry', () => {
  it('provides standard math constants', () => {
    expect(FLINT_MATH_PI).toBeCloseTo(Math.PI);
    expect(FLINT_MATH_TAU).toBeCloseTo(Math.PI * 2);
    expect(FLINT_MATH_E).toBeCloseTo(Math.E);
    expect(FLINT_MATH_SQRT2).toBeCloseTo(Math.SQRT2);
    expect(FLINT_MATH_DEG_TO_RAD * 180).toBeCloseTo(Math.PI);
    expect(FLINT_MATH_RAD_TO_DEG * Math.PI).toBeCloseTo(180);
  });

  it('computes basic scalar operations', () => {
    expect(flintClamp(5, 0, 10)).toBe(5);
    expect(flintClamp(-5, 0, 10)).toBe(0);
    expect(flintClamp(15, 0, 10)).toBe(10);
    expect(flintLerp(0, 10, 0.5)).toBe(5);
    expect(flintStep(5, 4)).toBe(0);
    expect(flintStep(5, 6)).toBe(1);
    expect(flintFloor(3.7)).toBe(3);
    expect(flintCeil(3.2)).toBe(4);
    expect(flintFract(3.75)).toBeCloseTo(0.75);
    expect(flintSign(-42)).toBe(-1);
    expect(flintSign(42)).toBe(1);
    expect(flintRadians(180)).toBeCloseTo(Math.PI);
    expect(flintDegrees(Math.PI)).toBeCloseTo(180);
    expect(flintApproxEqual(1.0000000001, 1.0000000002, 1e-8)).toBe(true);
  });

  it('handles color space conversions and perceptual blending', () => {
    const red = createFlintColorRgba(1, 0, 0, 1);
    const hsv = flintColorRgbToHsv(red);
    expect(hsv.h).toBeCloseTo(0);
    expect(hsv.s).toBeCloseTo(1);
    expect(hsv.v).toBeCloseTo(1);

    const rgbBack = flintColorHsvToRgb(hsv);
    expect(rgbBack.r).toBeCloseTo(1);
    expect(rgbBack.g).toBeCloseTo(0);
    expect(rgbBack.b).toBeCloseTo(0);

    const oklab = flintColorSrgbToOklab(red);
    const srgbBack = flintColorOklabToSrgb(oklab);
    expect(srgbBack.r).toBeCloseTo(1, 1);

    const blue = createFlintColorRgba(0, 0, 1, 1);
    const blended = flintColorLerpOklab(red, blue, 0.5);
    expect(blended.r).toBeGreaterThan(0);
    expect(blended.b).toBeGreaterThan(0);
  });
});
