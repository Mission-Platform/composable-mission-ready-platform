export {
  ForgeQrCode,
  type QrCodeActions,
  type QrCodeProperties,
  type QrGradient,
  type QrLogo,
  type QrModuleShape,
  type QrVariant,
} from './forge-qr-code';
// The component only consumes this type; it is owned by the package's shared
// types module, which both the encoder and the decoder entry depend on.
export { type QrErrorCorrection } from '@/types';
