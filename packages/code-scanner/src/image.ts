// Pixel helpers shared by the façade and the component.
//
// The wasm scanner works on a single-channel **luma** buffer (`0` = black,
// `255` = white, row-major, `width * height` bytes). Browsers hand us RGBA
// pixels (via `CanvasRenderingContext2D.getImageData`), so `imageDataToLuma`
// collapses those four channels into one using the Rec. 601 luma weights.

import type { ImageLike } from './types';

/** A single-channel grayscale image: `width * height` luma bytes. */
export interface LumaImage {
  width: number;
  height: number;
  data: Uint8Array;
}

/**
 * Convert an RGBA {@link ImageLike} (e.g. a canvas `ImageData`) into a
 * single-channel {@link LumaImage} using the Rec. 601 luma weights
 * (`0.299 R + 0.587 G + 0.114 B`). The alpha channel is ignored.
 */
export function imageDataToLuma(image: ImageLike): LumaImage {
  const { width, height, data } = image;
  const pixels = width * height;
  const luma = new Uint8Array(pixels);
  for (let index = 0; index < pixels; index += 1) {
    const offset = index * 4;
    luma[index] = Math.round(0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2]);
  }
  return { width, height, data: luma };
}

/**
 * The low/high intensity percentiles (0..1) clipped by {@link contrastStretchLuma}
 * by default. A small margin (2% / 98%) discards a few outlier pixels — specular
 * glare, a dark shadow, sensor noise — so a handful of extreme values can't
 * flatten the stretch for the rest of the frame.
 */
const DEFAULT_LOW_PERCENTILE = 0.02;
const DEFAULT_HIGH_PERCENTILE = 0.98;

/**
 * Find the luma value at `percentile` (0..1) of a 256-bin `histogram`. Only
 * populated bins are eligible, so the `0` percentile returns the smallest value
 * actually present (and `1` the largest) rather than an empty leading/trailing
 * bin.
 */
function percentileValue(histogram: Uint32Array, total: number, percentile: number): number {
  const target = percentile * total;
  let cumulative = 0;
  let last = 0;
  for (let value = 0; value < 256; value += 1) {
    if (histogram[value] === 0) {
      continue;
    }
    cumulative += histogram[value];
    last = value;
    if (cumulative >= target) {
      return value;
    }
  }
  return last;
}

/**
 * Contrast-stretch a {@link LumaImage}, mapping its `lowPercentile`..`highPercentile`
 * intensity range onto the full `0..255` span (values outside the range are
 * clamped). Returns a **new** image; the input is left untouched.
 *
 * The wasm binariser picks a single global Otsu threshold, which separates a
 * clean, bimodal histogram best. Uploaded images usually are; live camera
 * frames often are not — glare, uneven lighting and low contrast squash the
 * histogram so the dark modules and light background bleed together. Stretching
 * the dynamic range first re-separates them without touching the threshold
 * logic, which is exactly what the 1D-barcode and Data Matrix locators (that
 * rely on the ink bounding box) need.
 *
 * A degenerate (flat) frame — where the two percentiles collapse to the same
 * value — is returned unchanged, since there is nothing to stretch.
 */
export function contrastStretchLuma(
  luma: LumaImage,
  lowPercentile: number = DEFAULT_LOW_PERCENTILE,
  highPercentile: number = DEFAULT_HIGH_PERCENTILE,
): LumaImage {
  const { width, height, data } = luma;
  const pixels = data.length;
  if (pixels === 0) {
    return luma;
  }

  const histogram = new Uint32Array(256);
  for (let index = 0; index < pixels; index += 1) {
    histogram[data[index]] += 1;
  }

  const low = percentileValue(histogram, pixels, lowPercentile);
  const high = percentileValue(histogram, pixels, highPercentile);
  if (high <= low) {
    return luma;
  }

  const scale = 255 / (high - low);
  const stretched = new Uint8Array(pixels);
  for (let index = 0; index < pixels; index += 1) {
    const scaled = (data[index] - low) * scale;
    stretched[index] = scaled <= 0 ? 0 : scaled >= 255 ? 255 : Math.round(scaled);
  }
  return { width, height, data: stretched };
}
