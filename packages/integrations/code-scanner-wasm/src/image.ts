// Pixel helpers shared by the façade and the component.
//
// The wasm scanner works on a single-channel **luma** buffer (`0` = black,
// `255` = white, row-major, `width * height` bytes). Browsers hand us RGBA
// pixels (via `CanvasRenderingContext2D.getImageData`), so `imageDataToLuma`
// collapses those four channels into one using the Rec. 601 luma weights.

import {
  contrastStretchLuma as bridgeContrastStretchLuma,
  imageDataToLuma as bridgeImageDataToLuma,
  type LumaImage,
} from '@mission-platform/wasm-bridge';

import type { ImageLike } from './types';

export type { LumaImage } from '@mission-platform/wasm-bridge';

/**
 * Convert an RGBA {@link ImageLike} (e.g. a canvas `ImageData`) into a
 * single-channel {@link LumaImage} using the Rec. 601 luma weights
 * (`0.299 R + 0.587 G + 0.114 B`). The alpha channel is ignored.
 */
export function imageDataToLuma(image: ImageLike): LumaImage {
  const { width, height } = image;
  return {
    width,
    height,
    data: bridgeImageDataToLuma(image),
  };
}

const DEFAULT_LOW_PERCENTILE = 0.02;
const DEFAULT_HIGH_PERCENTILE = 0.98;

/**
 * Contrast-stretch a {@link LumaImage}, mapping its `lowPercentile`..`highPercentile`
 * intensity range onto the full `0..255` span (values outside the range are
 * clamped). Returns a **new** image; the input is left untouched.
 */
export function contrastStretchLuma(
  luma: LumaImage,
  lowPercentile: number = DEFAULT_LOW_PERCENTILE,
  highPercentile: number = DEFAULT_HIGH_PERCENTILE,
): LumaImage {
  const { width, height, data } = luma;
  return {
    width,
    height,
    data: bridgeContrastStretchLuma(data, lowPercentile, highPercentile),
  };
}

/** Convert RGBA pixels and contrast-stretch the result in one pair of passes. */
export function imageDataToContrastStretchLuma(image: ImageLike): LumaImage {
  const { width, height } = image;
  const luma = bridgeImageDataToLuma(image);
  return {
    width,
    height,
    data: bridgeContrastStretchLuma(luma, DEFAULT_LOW_PERCENTILE, DEFAULT_HIGH_PERCENTILE),
  };
}
