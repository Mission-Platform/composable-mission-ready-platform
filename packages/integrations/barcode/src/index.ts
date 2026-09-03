// Public entry point for `@mission-platform/barcode`.
//
// The typed encoder façade lives under `./encoder` and the decoder façade under
// `./decoder`; both are re-exported here so the package root exposes a flat API.
// The encoder and decoder use package-local Forge Web Script graphs. The
// per-feature `component/` sibling (a write-once `ForgeBarcode`) is added in a
// follow-up and re-exported here when present.
export { type Barcode, type BarcodeSymbology, encodeBarcode, encodeBarcodeAsync } from './encoder';
export { decodeBarcode, decodeBarcodeAsync } from './decoder';
export {
  encodeEan8Fws,
  encodeEan8FwsAsync,
  encodeEan13Fws,
  encodeEan13FwsAsync,
  encodeUpcaFws,
  encodeUpcaFwsAsync,
  decodeEan8Fws,
  decodeEan8FwsAsync,
  decodeEan13Fws,
  decodeEan13FwsAsync,
  encodeVariableBarcodeFws,
  encodeVariableBarcodeFwsAsync,
  type VariableBarcodeSymbology,
  validateGs1DataBarValue,
  validateGs1DataBarValueAsync,
} from './fws';
