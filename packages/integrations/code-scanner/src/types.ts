// Shared public types for the code-scanner façade.

/** ZXing barcode formats exposed by the scanner graph. */
export type ScanFormat =
  | 'AZTEC'
  | 'CODABAR'
  | 'CODE_39'
  | 'CODE_93'
  | 'CODE_128'
  | 'DATA_MATRIX'
  | 'EAN_8'
  | 'EAN_13'
  | 'ITF'
  | 'MAXICODE'
  | 'PDF_417'
  | 'QR_CODE'
  | 'RSS_14'
  | 'RSS_EXPANDED'
  | 'UPC_A'
  | 'UPC_E';

export interface ScanPoint {
  readonly x: number;
  readonly y: number;
}

export type ScanMetadataValue = string | number | readonly number[];

export type ScanMetadata = Readonly<Record<string, ScanMetadataValue>>;

export interface ScanOptions {
  readonly formats?: readonly ScanFormat[];
  readonly tryHarder?: boolean;
  readonly alsoInverted?: boolean;
  readonly pureBarcode?: boolean;
  readonly roi?: Roi;
}

/** Rich ZXing-style result returned by every scanner entry point. */
export interface ScanResult {
  /** Which ZXing format was located in the image. */
  readonly format: ScanFormat;
  readonly text: string | null;
  readonly rawBytes: Uint8Array | null;
  readonly numBits: number;
  readonly points: readonly ScanPoint[];
  readonly metadata: ScanMetadata;
  readonly timestamp: number;
  /** @deprecated Use `text`; retained as a migration alias for existing callers. */
  readonly value: string | null;
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
