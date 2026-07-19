---
'@mission-platform/barcode': minor
---

Add `@mission-platform/barcode`: a new dependency-free **1D (linear) barcode
encoder** written in Rust (`crates/barcode`) and compiled to WebAssembly, with a
typed ES module wrapper. `encodeBarcode(symbology, data)` returns a `Barcode`
whose `modules` are a flat run of bits (`1` = bar, `0` = space) ready to render
as SVG/canvas. Symbologies: `code128` (Code B + Code C fast path), `code39`,
`ean13`, `ean8`, `upca`, `itf`, and `codabar`, with automatic check-digit
computation/verification for the retail formats and validation (invalid payloads
throw a `RangeError`). Like `@mission-platform/qr-code`, the wasm is inlined as a
base64 `data:` URI so the encoder is synchronous and self-contained (with
`encodeBarcodeAsync` / `initBarcode` / `initBarcodeSync` for non-inlined
environments), and the Rust→wasm build runs via the `build:wasm` Turbo task.
