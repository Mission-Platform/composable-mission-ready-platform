// Browser capture helpers: turn a file upload or a live `<video>` frame into an
// RGBA `ImageData`, then scan it. These use the DOM canvas / `createImageBitmap`
// APIs, so they only run in the browser (the pure `scanImageData` façade stays
// environment-agnostic for SSR / tests).

import { scanImageData, scanImageDataAsync } from './scanner';

import type { ImageLike, ScanResult } from './types';

/**
 * Cap the longest edge sampled from a source. Camera frames and photos can be
 * huge; scanning every pixel is wasteful and the finder patterns resolve fine at
 * a moderate resolution. Sources smaller than this are used as-is (never
 * upscaled, which would only blur the modules).
 */
const MAX_EDGE = 1600;

/**
 * A rectangular slice of a source frame, in source pixels: the top-left corner
 * (`x`, `y`) and the crop `width`/`height`.
 */
interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The central fraction (0..1] of a frame to keep when a caller asks for a
 * region-of-interest crop but does not pick a size. `0.7` keeps the middle 70%
 * of each axis — a comfortable reticle-sized window.
 */
const DEFAULT_ROI = 0.7;

/**
 * Compute the central {@link CropRegion} covering `roi` (a fraction in `(0, 1]`)
 * of each axis. `roi >= 1` (or an invalid value) keeps the whole frame.
 *
 * Cropping to the centre is the single biggest win for the 1D-barcode and Data
 * Matrix locators: both derive the symbol from the bounding box of *all* dark
 * pixels in the frame, so any clutter (text, a hand, a shadow, the object edge)
 * outside the code destroys localisation. Scanning only the central reticle
 * collapses that bounding box back onto the actual symbol.
 */
function cropRegion(width: number, height: number, roi: number): CropRegion {
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

/** Compute the draw size for `source`, downscaling only when it exceeds {@link MAX_EDGE}. */
function fitSize(width: number, height: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= MAX_EDGE) {
    return { width, height };
  }
  const scale = MAX_EDGE / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** Create a 2D drawing context of the given size (`OffscreenCanvas` when available). */
type CaptureContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

let captureContext: CaptureContext | undefined;

function createContext(width: number, height: number): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D {
  if (captureContext === undefined) {
    const canvas =
      typeof OffscreenCanvas === 'function'
        ? new OffscreenCanvas(width, height)
        : Object.assign(document.createElement('canvas'), { width, height });
    const context = canvas.getContext('2d', { willReadFrequently: true }) as CaptureContext | null;
    if (context === null) {
      throw new Error('A 2D canvas context is unavailable in this environment.');
    }
    captureContext = context;
  } else {
    if (captureContext.canvas.width !== width) {
      captureContext.canvas.width = width;
    }
    if (captureContext.canvas.height !== height) {
      captureContext.canvas.height = height;
    }
  }
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
function drawToImageData(source: CanvasImageSource, width: number, height: number, roi = 1): ImageLike {
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
export async function blobToImageData(blob: Blob, roi = 1): Promise<ImageLike> {
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
export function videoFrameToImageData(video: HTMLVideoElement, roi = DEFAULT_ROI): ImageLike {
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
export async function scanFile(file: Blob): Promise<ScanResult | null> {
  return scanImageData(await blobToImageData(file));
}

/**
 * Decode `file` and scan it for a code, initialising the scanner and decoders
 * asynchronously — safe in any environment (no inlined binary required).
 */
export async function scanFileAsync(file: Blob): Promise<ScanResult | null> {
  return scanImageDataAsync(await blobToImageData(file));
}
