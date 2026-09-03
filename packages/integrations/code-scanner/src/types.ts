// Shared public types for the code-scanner façade.

/** The code families the scanner can locate and decode. */
export type ScanFormat = 'qr' | 'datamatrix' | 'barcode' | 'aztec' | 'pdf417' | 'databar' | 'maxicode';

/** The outcome of a successful *detection*. */
export interface ScanResult {
  /** Which code family was located in the image. */
  format: ScanFormat;
  /**
   * The decoded payload text, or `null` when the symbol was located and sampled
   * but its contents could not be decoded (e.g. the 1D barcode decoder, whose
   * linear symbology algorithms are not implemented yet).
   */
  value: string | null;
}

/**
 * The minimal shape of a `ImageData` this package needs: a raw, row-major RGBA
 * pixel buffer with its dimensions. The DOM `ImageData` satisfies it, as does
 * any hand-built `{ width, height, data }` object (handy for tests / SSR).
 */
export interface ImageLike {
  width: number;
  height: number;
  data: Uint8ClampedArray | Uint8Array;
}

/**
 * A rectangular region of interest, in image pixels, to restrict a scan to (e.g.
 * a reticle a live camera UI draws over the frame). The crop happens in wasm
 * *before* binarisation, so surrounding clutter never reaches the locators. A
 * region overhanging an edge is clamped; one entirely outside the frame finds
 * nothing.
 */
export interface Roi {
  x: number;
  y: number;
  width: number;
  height: number;
}
