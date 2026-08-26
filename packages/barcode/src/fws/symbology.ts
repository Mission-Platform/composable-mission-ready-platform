import { BarcodeSymbology as FwsBarcodeSymbology, type BarcodeSymbology as FwsSymbology } from './barcode-native.fws';

import type { BarcodeSymbology } from '../encoder';

export const FWS_SYMBOLOGY: Record<BarcodeSymbology, FwsSymbology> = {
  code128: FwsBarcodeSymbology.Code128,
  'gs1-128': FwsBarcodeSymbology.Gs1_128,
  code39: FwsBarcodeSymbology.Code39,
  code39ext: FwsBarcodeSymbology.Code39Extended,
  code93: FwsBarcodeSymbology.Code93,
  code93ext: FwsBarcodeSymbology.Code93Extended,
  ean13: FwsBarcodeSymbology.Ean13,
  ean8: FwsBarcodeSymbology.Ean8,
  upca: FwsBarcodeSymbology.Upca,
  upce: FwsBarcodeSymbology.Upce,
  itf: FwsBarcodeSymbology.Itf,
  itf14: FwsBarcodeSymbology.Itf14,
  codabar: FwsBarcodeSymbology.Codabar,
  msi: FwsBarcodeSymbology.Msi,
  pharmacode: FwsBarcodeSymbology.Pharmacode,
};
