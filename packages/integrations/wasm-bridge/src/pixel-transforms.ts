/**
 * Generic interface representing an image pixel buffer in RGBA layout.
 */
export interface ImageLike {
  readonly width: number;
  readonly height: number;
  readonly data: ArrayLike<number>;
}

/**
 * Greyscale luminance pixel buffer.
 */
export interface LumaImage {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
}

/**
 * Rectangular sub-region within an image.
 */
export interface CropRegion {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Computes a central crop region based on a Region-Of-Interest (ROI) fraction.
 *
 * @param width - Full frame width.
 * @param height - Full frame height.
 * @param roi - Central fraction `(0..1]` of each axis.
 * @returns The bounding box of the crop.
 */
export function cropRegion(width: number, height: number, roi = 1): CropRegion {
  const fraction = roi > 0 && roi < 1 ? roi : 1;
  const cropWidth = Math.max(1, Math.round(width * fraction));
  const cropHeight = Math.max(1, Math.round(height * fraction));
  return {
    x: Math.round((width - cropWidth) / 2),
    y: Math.round((height - cropHeight) / 2),
    width: cropWidth,
    height: cropHeight,
  };
}

/**
 * Computes draw size preserving aspect ratio while clamping the longest edge to `maxEdge`.
 *
 * @param width - Original width.
 * @param height - Original height.
 * @param maxEdge - Maximum dimension for width or height (default: 1600).
 * @returns Clamped dimensions.
 */
export function fitSize(width: number, height: number, maxEdge = 1600): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) {
    return { width, height };
  }
  const scale = maxEdge / longest;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

/**
 * Converts an RGBA pixel buffer into an 8-bit grayscale luminance array using Rec. 601 weights.
 *
 * @param image - Input RGBA image.
 * @returns 1-byte-per-pixel grayscale `Uint8Array`.
 */
export function imageDataToLuma(image: ImageLike): Uint8Array {
  const { width, height, data } = image;
  const pixels = width * height;
  const luma = new Uint8Array(pixels);

  for (let index = 0; index < pixels; index++) {
    const offset = index * 4;
    luma[index] = Math.round(
      0.299 * (data[offset] ?? 0) + 0.587 * (data[offset + 1] ?? 0) + 0.114 * (data[offset + 2] ?? 0),
    );
  }

  return luma;
}

/**
 * Finds the luma value at `percentile` (0..1) of a 256-bin `histogram`.
 *
 * @param histogram - Array of 256 bin counts.
 * @param total - Total pixel count in histogram.
 * @param percentile - Target percentile in `0..1`.
 * @returns Grayscale intensity `(0..255)`.
 */
export function percentileValue(histogram: Uint32Array, total: number, percentile: number): number {
  const target = percentile * total;
  let cumulative = 0;
  let last = 0;
  for (let value = 0; value < 256; value++) {
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
 * Applies contrast stretching to an 8-bit grayscale buffer using percentile clipping.
 *
 * @param luma - Grayscale pixel array.
 * @param lowPercentile - Lower percentile threshold (default 0.02).
 * @param highPercentile - Upper percentile threshold (default 0.98).
 * @returns A new `Uint8Array` with enhanced dynamic range, or the same buffer if flat.
 */
export function contrastStretchLuma(luma: Uint8Array, lowPercentile = 0.02, highPercentile = 0.98): Uint8Array {
  const pixels = luma.length;
  if (pixels === 0) {
    return luma;
  }

  const histogram = new Uint32Array(256);
  for (let index = 0; index < pixels; index++) {
    histogram[luma[index]]++;
  }

  const low = percentileValue(histogram, pixels, lowPercentile);
  const high = percentileValue(histogram, pixels, highPercentile);
  if (high <= low) {
    return luma;
  }

  const scale = 255 / (high - low);
  const stretched = new Uint8Array(pixels);

  for (let index = 0; index < pixels; index++) {
    const scaled = (luma[index] - low) * scale;
    stretched[index] = Math.min(255, Math.max(0, Math.round(scaled)));
  }

  return stretched;
}

/**
 * Converts an RGBA image directly to a contrast-stretched grayscale buffer.
 *
 * @param image - Input RGBA image.
 * @param lowPercentile - Lower percentile threshold.
 * @param highPercentile - Upper percentile threshold.
 * @returns Contrast-stretched `Uint8Array`.
 */
export function imageDataToContrastStretchLuma(
  image: ImageLike,
  lowPercentile = 0.02,
  highPercentile = 0.98,
): Uint8Array {
  const { width, height, data } = image;
  const pixels = width * height;
  const luma = new Uint8Array(pixels);
  if (pixels === 0) return luma;

  const histogram = new Uint32Array(256);
  for (let index = 0; index < pixels; index++) {
    const offset = index * 4;
    const value = Math.round(
      0.299 * (data[offset] ?? 0) + 0.587 * (data[offset + 1] ?? 0) + 0.114 * (data[offset + 2] ?? 0),
    );
    luma[index] = value;
    histogram[value]++;
  }

  const low = percentileValue(histogram, pixels, lowPercentile);
  const high = percentileValue(histogram, pixels, highPercentile);
  if (high <= low) return luma;

  const scale = 255 / (high - low);
  for (let index = 0; index < pixels; index++) {
    const scaled = (luma[index] - low) * scale;
    luma[index] = Math.min(255, Math.max(0, Math.round(scaled)));
  }

  return luma;
}
