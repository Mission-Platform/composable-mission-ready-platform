// Public entry point for `@mission-platform/code-scanner`.
//
// A dependency-free image/camera code scanner: it locates and decodes QR, Data
// Matrix and 1D barcodes from a decoded image (file upload) or a live camera
// frame. The detection engine (binarise → locate → sample) is compiled from the
// `packages/code-scanner/src/fws` and its linked decoder source modules; static
// builds flatten this graph into the neutral artifact while dynamic builds keep
// explicit source-module boundaries.
//
// This barrel re-exports the scanning façade (`./scanner`), the browser capture
// helpers (`./capture`), the pixel helper (`./image`) and the shared types
// (`./types`). The per-feature `component/` sibling (a write-once
// `ForgeCodeScanner`) is built separately and shipped through the package's
// `./react` and `./vue` subpath exports.

/** The shared result and image types. */
export type { ImageLike, Roi, ScanFormat, ScanResult } from './types';

/** The luma + contrast-stretch helpers and their image type (handy for custom capture pipelines). */
export { contrastStretchLuma, imageDataToLuma, type LumaImage } from './image';

/** The core scanning façade. */
export {
  createScannerRawPointerSession,
  createScannerRawPointerSessionAsync,
  scanImageData,
  scanImageDataAll,
  scanImageDataAllAsync,
  scanImageDataAsync,
  type ScannerRawPointerSession,
} from './scanner';

/**
 * Opt-in diagnostic logging. Enable it (or set `globalThis.__CODE_SCANNER_DEBUG__`
 * before load) to trace each scan stage to the console — capture size, the
 * located format and its sampled payload, and each decoder's verdict. Invaluable
 * for diagnosing a code that
 * is located but fails to decode.
 */
export { isCodeScannerDebugEnabled, setCodeScannerDebug } from './debug';

/** Browser capture helpers (file upload + live `<video>` frame). */
export { blobToImageData, scanFile, scanFileAsync, videoFrameToImageData } from './capture';
