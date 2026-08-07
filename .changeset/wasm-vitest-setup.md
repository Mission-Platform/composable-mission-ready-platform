---
'@mission-platform/barcode-decode-wasm': patch
'@mission-platform/barcode-encode-wasm': patch
'@mission-platform/code-scan-wasm': patch
'@mission-platform/qr-code-decode-wasm': patch
'@mission-platform/qr-code-encode-wasm': patch
'@mission-platform/matrix-code-decode-wasm': patch
'@mission-platform/matrix-code-encode-wasm': patch
---

add a Vitest test setup

Each WebAssembly package now ships a `test` script, a `vitest.config.ts`, a dedicated `tsconfig.test.json`, and an
`index.spec.ts` smoke test covering the compiled bindings, so the packages are exercised in CI.
