// Public entry point for `@mission-platform/barcode`.
//
// The typed encoder façade lives under `./encoder` and the decoder façade under
// `./decoder`; both are re-exported here so the package root exposes a flat API.
// The encoder and decoder are compiled from separate Rust crates
// (`crates/barcode-encode` / `crates/barcode-decode`, sharing
// `crates/barcode-common`) into two wasm modules under `generated/encode` and
// `generated/decode`. The per-feature `component/` sibling (a write-once
// `BaseBarcode`) is added in a follow-up and re-exported here when present.
export {
  type Barcode,
  type BarcodeSymbology,
  encodeBarcode,
  encodeBarcodeAsync,
  initBarcode,
  initBarcodeSync,
} from './encoder';
export { decodeBarcode, decodeBarcodeAsync, initBarcodeDecode, initBarcodeDecodeSync } from './decoder';
