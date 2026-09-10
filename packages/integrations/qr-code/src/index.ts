// Public entry point for `@mission-platform/qr-code`.
//
// A dependency-free byte-mode QR Code encoder backed by a package-local Forge
// Web Script artifact. The typed encoder façade lives under `./encoder` and is
// re-exported here so the package root exposes a flat API.
//
// This barrel defines no logic of its own: it re-exports the encode API
// (`./encoder`), the shared encoder types (`./types`) and the ready-made payload builders
// (`./formats`). The per-feature
// `component/` sibling (a write-once `ForgeQrCode`) is built separately and
// shipped through the package's `./react` and `./vue` subpath exports.

/**
 * Ready-made payload builders for common QR "actions" (Wi-Fi, mailto, SMS,
 * tel, geo, vCard, MeCard, iCal, …). Import as `import { formats } from
 * '@mission-platform/qr-code'` then feed the result to {@link encodeQr}:
 * `encodeQr(formats.wifi({ ssid: 'Cafe', password: 'latte' }))`.
 */
export * as formats from './formats';

/** The shared encoder result and error-correction types. */
export type { CompactQrMatrix, QrErrorCorrection, QrMatrix } from './types';

/**
 * The encoder API. Implemented in `./encoder`. Alongside the full QR encoder
 * (`encodeQr`) this exposes the compact variants: Micro QR (`encodeMicroQr`)
 * and Rectangular Micro QR / rMQR (`encodeRmqr`), each with an async variant.
 */
export { encodeMicroQr, encodeMicroQrAsync, encodeQr, encodeQrAsync, encodeRmqr, encodeRmqrAsync } from './encoder';
