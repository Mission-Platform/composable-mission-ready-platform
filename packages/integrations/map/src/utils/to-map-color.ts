/**
 * Convert a design-token colour string into a colour MapLibre GL can parse.
 *
 * The `@mission-platform/tokens` palette is authored in the OKLab colour space
 * and is emitted as CSS `oklab(…)` / `oklch(…)` strings (great for the DOM,
 * where modern browsers understand them). MapLibre GL, however, only accepts
 * **sRGB** colours in its paint/layout properties — the Style Spec permits hex,
 * `rgb()`, `rgba()`, `hsl()`, `hsla()` and named colours, but **not** `oklab()`
 * / `oklch()`. Passing a raw token value into a layer's `*-color` therefore
 * yields an invalid paint colour and the feature is not drawn.
 *
 * {@link toMapColor} converts an `oklab()` / `oklch()` token to an equivalent
 * sRGB `rgb()` / `rgba()` string. Any other input (hex, `rgb`, named, …) is a
 * colour MapLibre already understands and is returned unchanged, so the helper
 * is safe to apply to consumer-supplied colours too.
 */

/** Matches `oklab(L a b)` / `oklab(L a b / alpha)`, capturing the four components. */
const OKLAB_PATTERN = /^oklab\(\s*([^\s/]+)\s+([^\s/]+)\s+([^\s/]+)\s*(?:\/\s*([^\s)]+)\s*)?\)$/i;
/** Matches `oklch(L C H)` / `oklch(L C H / alpha)`, capturing the four components. */
const OKLCH_PATTERN = /^oklch\(\s*([^\s/]+)\s+([^\s/]+)\s+([^\s/]+)\s*(?:\/\s*([^\s)]+)\s*)?\)$/i;

/** Parse a component that may be a plain number or a `%` value, scaling `%` by `percentBasis`. */
function parseComponent(raw: string, percentBasis: number): number {
  const trimmed = raw.trim();
  if (trimmed.endsWith('%')) {
    return (Number.parseFloat(trimmed.slice(0, -1)) / 100) * percentBasis;
  }
  return Number.parseFloat(trimmed);
}

/** Parse an alpha component (`0–1` or `%`); defaults to `1` when absent/invalid. */
function parseAlpha(raw: string | undefined): number {
  if (raw === undefined) {
    return 1;
  }
  const value = parseComponent(raw, 1);
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 1;
}

/** Gamma-encode a linear-sRGB channel (0–1) and quantise to an 8-bit value. */
function linearToSrgb8(channel: number): number {
  const clamped = Math.min(1, Math.max(0, channel));
  const encoded = clamped <= 0.003_130_8 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
  return Math.round(encoded * 255);
}

/** Convert OKLab components to an sRGB `rgb()` / `rgba()` string (Björn Ottosson's matrices). */
function oklabToCss(lightness: number, aValue: number, bValue: number, alpha: number): string {
  const l = lightness + 0.396_337_777_4 * aValue + 0.215_803_757_3 * bValue;
  const m = lightness - 0.105_561_345_8 * aValue - 0.063_854_172_8 * bValue;
  const s = lightness - 0.089_484_177_5 * aValue - 1.291_485_548 * bValue;

  const lCubed = l ** 3;
  const mCubed = m ** 3;
  const sCubed = s ** 3;

  const red = 4.076_741_662_1 * lCubed - 3.307_711_591_3 * mCubed + 0.230_969_929_2 * sCubed;
  const green = -1.268_438_004_6 * lCubed + 2.609_757_401_1 * mCubed - 0.341_319_396_5 * sCubed;
  const blue = -0.004_196_086_3 * lCubed - 0.703_418_614_7 * mCubed + 1.707_614_701 * sCubed;

  const r = linearToSrgb8(red);
  const g = linearToSrgb8(green);
  const b = linearToSrgb8(blue);

  return alpha < 1 ? `rgba(${r}, ${g}, ${b}, ${alpha})` : `rgb(${r}, ${g}, ${b})`;
}

/**
 * Return a MapLibre-parseable sRGB colour for `color`.
 *
 * `oklab(…)` and `oklch(…)` strings (the shape emitted by
 * `@mission-platform/tokens`) are converted to `rgb()` / `rgba()`; every other
 * value is returned unchanged.
 *
 * @example
 * ```ts
 * toMapColor(palette.color.primary[500]) // 'rgb(108, 47, 212)'
 * toMapColor('#6c2fd4')                  // '#6c2fd4' (unchanged)
 * ```
 */
export function toMapColor(color: string): string {
  const oklab = OKLAB_PATTERN.exec(color);
  if (oklab) {
    const lightness = parseComponent(oklab[1], 1);
    const aValue = parseComponent(oklab[2], 0.4);
    const bValue = parseComponent(oklab[3], 0.4);
    const alpha = parseAlpha(oklab[4]);
    if ([lightness, aValue, bValue].every((value) => Number.isFinite(value))) {
      return oklabToCss(lightness, aValue, bValue, alpha);
    }
    return color;
  }

  const oklch = OKLCH_PATTERN.exec(color);
  if (oklch) {
    const lightness = parseComponent(oklch[1], 1);
    const chroma = parseComponent(oklch[2], 0.4);
    const hueDegrees = Number.parseFloat(oklch[3]);
    const alpha = parseAlpha(oklch[4]);
    if ([lightness, chroma, hueDegrees].every((value) => Number.isFinite(value))) {
      const hueRadians = (hueDegrees * Math.PI) / 180;
      return oklabToCss(lightness, chroma * Math.cos(hueRadians), chroma * Math.sin(hueRadians), alpha);
    }
    return color;
  }

  return color;
}
