// Public entry point for `@mission-platform/barcode`.
//
// The typed encoder façade lives under `./encoder` and is re-exported here so
// the package root exposes a flat API. It uses package-local Forge Web Script graphs. The
// per-feature `component/` sibling (a write-once `ForgeBarcode`) is added in a
// follow-up and re-exported here when present.
export { type Barcode, type BarcodeSymbology, encodeBarcode, encodeBarcodeAsync } from './encoder';
export {
  encodeEan8Fws,
  encodeEan8FwsAsync,
  encodeEan13Fws,
  encodeEan13FwsAsync,
  encodeUpcaFws,
  encodeUpcaFwsAsync,
  encodeVariableBarcodeFws,
  encodeVariableBarcodeFwsAsync,
  type VariableBarcodeSymbology,
  validateGs1DataBarValue,
  validateGs1DataBarValueAsync,
} from './fws';
