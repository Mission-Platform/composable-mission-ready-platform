// Browser capture helpers: turn a file upload or a live `<video>` frame into an
// RGBA `ImageData`, then scan it. These use the DOM canvas / `createImageBitmap`
// APIs, so they only run in the browser (the pure `scanImageData` façade stays
// environment-agnostic for SSR / tests).

import { cropRegion, fitSize } from '@mission-platform/wasm-bridge';

import { scanImageData, scanImageDataAsync } from './scanner';

import type { ImageLike, ScanOptions, ScanResult } from './types';

/**
 * Cap the longest edge sampled from a source. Camera frames and photos can be
 * huge; scanning every pixel is wasteful and the finder patterns resolve fine at
 * a moderate resolution. Sources smaller than this are used as-is (never
 * upscaled, which would only blur the modules).
 */
const MAX_EDGE = 1600;

/**
 * The central fraction (0..1] of a frame to keep when a caller asks for a
 * region-of-interest crop but does not pick a size. `0.7` keeps the middle 70%
 * of each axis — a comfortable reticle-sized window.
 */
const DEFAULT_ROI = 0.7;

/** Create a 2D drawing context of the given size (`OffscreenCanvas` when available). */
type CaptureContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

let captureContext: CaptureContext | undefined;

/**
 * Instantiates a new 2D canvas drawing context for frame capture.
 */
function initCaptureContext(width: number, height: number): CaptureContext {
  const canvas =
    typeof OffscreenCanvas === 'function'
      ? new OffscreenCanvas(width, height)
      : Object.assign(document.createElement('canvas'), { width, height });
  const context = canvas.getContext('2d', { willReadFrequently: true }) as CaptureContext | null;
  if (context === null) {
    throw new Error('A 2D canvas context is unavailable in this environment.');
  }
  return context;
}

/**
 * Creates or resizes a 2D canvas drawing context for frame capture.
 */
function createContext(width: number, height: number): CaptureContext {
  if (captureContext === undefined) {
    captureContext = initCaptureContext(width, height);
    return captureContext;
  }
  captureContext.canvas.width = width;
  captureContext.canvas.height = height;
  return captureContext;
}

/**
 * Draw `source` (its intrinsic size given by `width`/`height`) to an
 * {@link ImageLike}, optionally cropping to the central `roi` fraction first.
 *
 * Because the crop is smaller than the full frame, its longest edge is more
 * likely to fit under {@link MAX_EDGE} — so the region is kept at (or nearer to)
 * native resolution instead of being downscaled, preserving the bar-width
 * precision the 1D-barcode locator depends on.
 */
function drawToImageData(source: CanvasImageSource, width: number, height: number, roi: number = 1): ImageLike {
  const region = cropRegion(width, height, roi);
  const fitted = fitSize(region.width, region.height);
  const context = createContext(fitted.width, fitted.height);
  context.drawImage(source, region.x, region.y, region.width, region.height, 0, 0, fitted.width, fitted.height);
  return context.getImageData(0, 0, fitted.width, fitted.height);
}

/**
 * Decode an image `Blob`/`File` into an {@link ImageLike} (RGBA pixels). Uses
 * `createImageBitmap` so it works off the main thread where supported.
 */
export async function blobToImageData(blob: Blob, roi: number = 1): Promise<ImageLike> {
  const bitmap = await createImageBitmap(blob);
  try {
    return drawToImageData(bitmap, bitmap.width, bitmap.height, roi);
  } finally {
    bitmap.close();
  }
}

/**
 * Capture the current frame of a playing `<video>` element as an
 * {@link ImageLike}, optionally cropping to the central `roi` fraction (see
 * {@link DEFAULT_ROI}). Cropping is especially valuable here: live frames are
 * full of clutter the ink-bounding-box locators can't tolerate, so passing the
 * reticle size the UI shows the user greatly raises the hit rate.
 */
export function videoFrameToImageData(video: HTMLVideoElement, roi: number = DEFAULT_ROI): ImageLike {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (width === 0 || height === 0) {
    throw new Error('The video has no frame data yet (is the stream still starting?).');
  }
  return drawToImageData(video, width, height, roi);
}

/**
 * Decode `file` and scan it for a code, synchronously running the WebAssembly
 * scanner (which self-initialises from its inlined binary in a production build).
 */
export async function scanFile(file: Blob, options?: ScanOptions): Promise<ScanResult | null> {
  return scanImageData(await blobToImageData(file), options);
}

/**
 * Decode `file` and scan it for a code, initialising the scanner and decoders
 * asynchronously — safe in any environment (no inlined binary required).
 */
export async function scanFileAsync(file: Blob, options?: ScanOptions): Promise<ScanResult | null> {
  return scanImageDataAsync(await blobToImageData(file), options);
}
