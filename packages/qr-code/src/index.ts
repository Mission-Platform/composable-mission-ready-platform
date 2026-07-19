// Public entry point for `@mission-platform/qr-code`.
//
// A dependency-free byte-mode QR Code encoder + decoder. The typed encoder
// façade lives under `./encoder` and the decoder façade under `./decoder`; both
// are re-exported here so the package root exposes a flat API. The encoder and
// decoder are compiled from *separate* Rust crates (`crates/qr-code-encode` /
// `crates/qr-code-decode`, sharing `crates/qr-code-common`) into two wasm
// modules emitted under `src/generated/encode` and `src/generated/decode`.
//
// This barrel defines no logic of its own: it re-exports the encode API
// (`./encoder`), the decode + package-wide initialisation API (`decodeQr`,
// `decodeQrAsync`, `initQr`, `initQrSync` from `./decoder`), the shared types
// (`./types`) and the ready-made payload builders (`./formats`). The per-feature
// `component/` sibling (a write-once `BaseQrCode`) is built separately and
// shipped through the package's `./react` and `./vue` subpath exports.

/**
 * Ready-made payload builders for common QR "actions" (Wi-Fi, mailto, SMS,
 * tel, geo, vCard, MeCard, iCal, …). Import as `import { formats } from
 * '@mission-platform/qr-code'` then feed the result to {@link encodeQr}:
 * `encodeQr(formats.wifi({ ssid: 'Cafe', password: 'latte' }))`.
 */
export * as formats from './formats';

/** The shared encoder/decoder result and error-correction types. */
export type { CompactQrMatrix, QrErrorCorrection, QrMatrix } from './types';

/**
 * The encoder API. Implemented in `./encoder`. Alongside the full QR encoder
 * (`encodeQr`) this exposes the compact variants: Micro QR (`encodeMicroQr`)
 * and Rectangular Micro QR / rMQR (`encodeRmqr`), each with an async variant.
 */
export { encodeMicroQr, encodeMicroQrAsync, encodeQr, encodeQrAsync, encodeRmqr, encodeRmqrAsync } from './encoder';

/** The decoder + package-wide initialisation API. Implemented in `./decoder`. */
export { decodeQr, decodeQrAsync, initQr, initQrSync } from './decoder';
