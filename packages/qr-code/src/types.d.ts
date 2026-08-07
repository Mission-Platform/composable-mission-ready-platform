/** Error-correction level: higher levels tolerate more damage but hold less data. */
export type QrErrorCorrection = 'L' | 'M' | 'Q' | 'H';
/** A decoded / encoded QR Code: a square grid of dark (`true`) modules. */
export interface QrMatrix {
  /** Side length of the matrix, in modules (excluding any quiet-zone margin). */
  size: number;
  /** `modules[y][x]` — `true` when the module is dark. */
  modules: boolean[][];
  /** The selected QR version (`1`–`40`). */
  version: number;
}
/**
 * An encoded compact QR variant — a Micro QR or Rectangular Micro QR (rMQR)
 * Code. Unlike {@link QrMatrix} these may be rectangular, so the grid is
 * described by explicit `width`/`height` rather than a single `size`.
 */
export interface CompactQrMatrix {
  /** Width of the matrix, in modules (excluding any quiet-zone margin). */
  width: number;
  /** Height of the matrix, in modules (excluding any quiet-zone margin). */
  height: number;
  /** `modules[y][x]` — `true` when the module is dark. */
  modules: boolean[][];
}
