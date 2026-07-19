---
'@mission-platform/qr-code': patch
'@mission-platform/barcode': patch
---

Make the inlined-wasm synchronous initialisation portable: the base64 decode now prefers the native `Uint8Array.fromBase64` and falls back to `Buffer`/`atob`, so `encodeQr`/`encodeBarcode` work synchronously (incl. SSR) on runtimes without the newest `Uint8Array.fromBase64`. The underlying Rust crates were also migrated from `log`/`console_log` to `tracing`/`tracing-wasm` for diagnostics (unchanged encoder output).
