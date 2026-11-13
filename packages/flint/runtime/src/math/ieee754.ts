/**
 * Standard mathematical constants for Flint runtime.
 */
export const FLINT_MATH_PI = 3.141_592_653_589_793;
/** 2 * PI (tau) circle constant. */
export const FLINT_MATH_TAU = 6.283_185_307_179_586;
/** Euler constant (e). */
export const FLINT_MATH_E = 2.718_281_828_459_045;
/** Square root of 2 constant. */
export const FLINT_MATH_SQRT2 = 1.414_213_562_373_095_1;
/** Euler constant (e). */
export const FLINT_MATH_EPSILON = 1e-15;
/** Machine epsilon for 32-bit floating point operations. */
export const FLINT_MATH_F32_EPSILON = 1e-7;
/** Conversion factor from degrees to radians. */
export const FLINT_MATH_DEG_TO_RAD = 0.017_453_292_519_943_295;
/** Conversion factor from radians to degrees. */
export const FLINT_MATH_RAD_TO_DEG = 57.295_779_513_082_32;

// ==========================================
// 1. Basic & Advanced Scalar Math
// ==========================================

/** Clamp a numeric value between minimum and maximum bounds. */
export function flintClamp(value: number, minimum: number, maximum: number): number {
  if (minimum > maximum) {
    return Math.min(Math.max(value, maximum), minimum);
  }
  return Math.min(Math.max(value, minimum), maximum);
}

/** Linearly interpolate between start and end by factor. */
export function flintLerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
}

/** Step function returning 0 if x < edge, 1 otherwise. */
export function flintStep(edge: number, value: number): number {
  return value < edge ? 0 : 1;
}

/** Smooth Hermite interpolation between edge0 and edge1. */
export function flintSmoothstep(edge0: number, edge1: number, value: number): number {
  if (edge0 === edge1) {
    return value < edge0 ? 0 : 1;
  }
  const factor = flintClamp((value - edge0) / (edge1 - edge0), 0, 1);
  return factor * factor * (3 - 2 * factor);
}

/** Compute the largest integer less than or equal to x. */
export function flintFloor(value: number): number {
  return Math.floor(value);
}

/** Compute the smallest integer greater than or equal to x. */
export function flintCeil(value: number): number {
  return Math.ceil(value);
}

/** Compute fractional part: x - floor(x). */
export function flintFract(value: number): number {
  return value - Math.floor(value);
}

/** Return sign of x (1, -1, 0, or NaN). */
export function flintSign(value: number): number {
  if (value === 0 || Number.isNaN(value)) {
    return value;
  }
  return value > 0 ? 1 : -1;
}

/** Convert degrees to radians. */
export function flintRadians(degrees: number): number {
  return degrees * FLINT_MATH_DEG_TO_RAD;
}

/** Convert radians to degrees. */
export function flintDegrees(radians: number): number {
  return radians * FLINT_MATH_RAD_TO_DEG;
}

/** Test approximate equality within specified epsilon. */
export function flintApproxEqual(first: number, second: number, epsilon = FLINT_MATH_EPSILON): boolean {
  if (first === second) {
    return true;
  }
  const difference = Math.abs(first - second);
  return difference <= epsilon || difference <= Math.max(Math.abs(first), Math.abs(second)) * epsilon;
}

// 7. Colorimetry & Perceptual Color Spaces
// ==========================================

/** Color Rgba representation. */
export interface FlintColorRgba {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

/** Color Hsv representation. */
export interface FlintColorHsv {
  readonly h: number;
  readonly s: number;
  readonly v: number;
  readonly a: number;
}

/** Color Oklab representation. */
export interface FlintColorOklab {
  readonly l: number;
  readonly a: number;
  readonly b: number;
  readonly alpha: number;
}

/** Perform create flint color rgba operation. */
export function createFlintColorRgba(red = 0, green = 0, blue = 0, alpha = 1): FlintColorRgba {
  return {
    r: flintClamp(red, 0, 1),
    g: flintClamp(green, 0, 1),
    b: flintClamp(blue, 0, 1),
    a: flintClamp(alpha, 0, 1),
  };
}

/** Convert a single sRGB color channel component to linear space. */
function srgbToLinearChannel(channel: number): number {
  return channel <= 0.040_45 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

/** Convert a single linear color channel component to sRGB space. */
function linearToSrgbChannel(channel: number): number {
  return channel <= 0.003_130_8 ? channel * 12.92 : 1.055 * channel ** (1 / 2.4) - 0.055;
}

/** Perform color srgb to linear operation. */
export function flintColorSrgbToLinear(color: FlintColorRgba): FlintColorRgba {
  return {
    r: srgbToLinearChannel(color.r),
    g: srgbToLinearChannel(color.g),
    b: srgbToLinearChannel(color.b),
    a: color.a,
  };
}

/** Perform color linear to srgb operation. */
export function flintColorLinearToSrgb(color: FlintColorRgba): FlintColorRgba {
  return {
    r: linearToSrgbChannel(color.r),
    g: linearToSrgbChannel(color.g),
    b: linearToSrgbChannel(color.b),
    a: color.a,
  };
}

/** Calculate hue angle from RGB channels, max channel, and diff. */
function calculateRgbHue(color: FlintColorRgba, max: number, diff: number): number {
  if (diff === 0) {
    return 0;
  }
  let hue = 0;
  if (max === color.r) {
    hue = (color.g - color.b) / diff + (color.g < color.b ? 6 : 0);
  } else if (max === color.g) {
    hue = (color.b - color.r) / diff + 2;
  } else {
    hue = (color.r - color.g) / diff + 4;
  }
  return hue * 60;
}

/** Perform color rgb to hsv operation. */
export function flintColorRgbToHsv(color: FlintColorRgba): FlintColorHsv {
  const max = Math.max(color.r, color.g, color.b);
  const min = Math.min(color.r, color.g, color.b);
  const diff = max - min;
  const saturation = max === 0 ? 0 : diff / max;
  const hue = calculateRgbHue(color, max, diff);

  return { h: hue, s: saturation, v: max, a: color.a };
}

/** Calculate raw RGB components from hue sector, chroma, and intermediate value. */
function calculateHsvSectorRgb(hueSector: number, chroma: number, intermediateX: number): [number, number, number] {
  const table: readonly [number, number, number][] = [
    [chroma, intermediateX, 0],
    [intermediateX, chroma, 0],
    [0, chroma, intermediateX],
    [0, intermediateX, chroma],
    [intermediateX, 0, chroma],
    [chroma, 0, intermediateX],
  ];
  return table[hueSector] ?? [chroma, 0, intermediateX];
}

/** Perform color hsv to rgb operation. */
export function flintColorHsvToRgb(hsv: FlintColorHsv): FlintColorRgba {
  const hue = ((hsv.h % 360) + 360) % 360;
  const saturation = flintClamp(hsv.s, 0, 1);
  const value = flintClamp(hsv.v, 0, 1);

  const chroma = value * saturation;
  const intermediateX = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const matchValue = value - chroma;
  const sector = Math.floor(hue / 60) % 6;

  const [rawR, rawG, rawB] = calculateHsvSectorRgb(sector, chroma, intermediateX);
  return createFlintColorRgba(rawR + matchValue, rawG + matchValue, rawB + matchValue, hsv.a);
}

/** Perform color srgb to oklab operation. */
export function flintColorSrgbToOklab(color: FlintColorRgba): FlintColorOklab {
  const lin = flintColorSrgbToLinear(color);
  const coneL = 0.412_221_470_8 * lin.r + 0.536_332_536_3 * lin.g + 0.051_445_992_9 * lin.b;
  const coneM = 0.211_903_498_2 * lin.r + 0.680_699_545_1 * lin.g + 0.107_396_956_6 * lin.b;
  const coneS = 0.088_302_461_9 * lin.r + 0.281_718_837_6 * lin.g + 0.629_978_700_5 * lin.b;

  const cubeRootL = Math.cbrt(coneL);
  const cubeRootM = Math.cbrt(coneM);
  const cubeRootS = Math.cbrt(coneS);

  return {
    l: 0.210_454_255_3 * cubeRootL + 0.793_617_785 * cubeRootM - 0.004_072_046_8 * cubeRootS,
    a: 1.977_998_495_1 * cubeRootL - 2.428_592_205 * cubeRootM + 0.450_593_709_9 * cubeRootS,
    b: 0.025_904_037_1 * cubeRootL + 0.782_771_766_2 * cubeRootM - 0.808_675_766 * cubeRootS,
    alpha: color.a,
  };
}

/** Perform color oklab to srgb operation. */
export function flintColorOklabToSrgb(lab: FlintColorOklab): FlintColorRgba {
  const cubeRootL = lab.l + 0.396_337_777_4 * lab.a + 0.215_803_757_3 * lab.b;
  const cubeRootM = lab.l - 0.105_561_345_8 * lab.a - 0.063_854_172_8 * lab.b;
  const cubeRootS = lab.l - 0.089_484_177_5 * lab.a - 1.291_485_548 * lab.b;

  const linearL = cubeRootL * cubeRootL * cubeRootL;
  const linearM = cubeRootM * cubeRootM * cubeRootM;
  const linearS = cubeRootS * cubeRootS * cubeRootS;

  const rLin = +4.076_741_662_1 * linearL - 3.307_711_591_3 * linearM + 0.230_969_929_2 * linearS;
  const gLin = -1.268_438_004_6 * linearL + 2.609_757_401_1 * linearM - 0.341_319_396_5 * linearS;
  const bLin = -0.004_196_086_3 * linearL - 0.703_418_614_7 * linearM + 1.707_614_701 * linearS;

  return createFlintColorRgba(
    linearToSrgbChannel(rLin),
    linearToSrgbChannel(gLin),
    linearToSrgbChannel(bLin),
    lab.alpha,
  );
}

/** Perform color lerp oklab operation. */
export function flintColorLerpOklab(first: FlintColorRgba, second: FlintColorRgba, factor: number): FlintColorRgba {
  const lab1 = flintColorSrgbToOklab(first);
  const lab2 = flintColorSrgbToOklab(second);
  const mixedLab: FlintColorOklab = {
    l: flintLerp(lab1.l, lab2.l, factor),
    a: flintLerp(lab1.a, lab2.a, factor),
    b: flintLerp(lab1.b, lab2.b, factor),
    alpha: flintLerp(lab1.alpha, lab2.alpha, factor),
  };
  return flintColorOklabToSrgb(mixedLab);
}
