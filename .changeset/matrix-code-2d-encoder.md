---
'@mission-platform/matrix-code': minor
---

Add `@mission-platform/matrix-code`: a dependency-free 2D matrix barcode encoder written in Rust (compiled to WebAssembly) with a typed ES module wrapper. The initial release supports Data Matrix (ECC 200, single-data-region square symbols 10×10–26×26) via `encodeMatrix`/`encodeMatrixAsync`, returning a square grid of module bits. The wasm is inlined as a base64 `data:` URI so the encoder is synchronous and works during SSR and in tests.
