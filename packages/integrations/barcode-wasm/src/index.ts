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
