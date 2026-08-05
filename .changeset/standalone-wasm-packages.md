---
'@mission-platform/barcode-encode-wasm': minor
'@mission-platform/barcode-decode-wasm': minor
'@mission-platform/qr-code-encode-wasm': minor
'@mission-platform/qr-code-decode-wasm': minor
'@mission-platform/matrix-code-encode-wasm': minor
'@mission-platform/matrix-code-decode-wasm': minor
'@mission-platform/code-scan-wasm': minor
'@mission-platform/barcode-encode-crate': patch
'@mission-platform/barcode-decode-crate': patch
'@mission-platform/qr-code-encode-crate': patch
'@mission-platform/qr-code-decode-crate': patch
'@mission-platform/matrix-code-encode-crate': patch
'@mission-platform/matrix-code-decode-crate': patch
'@mission-platform/code-scan-crate': patch
'@mission-platform/barcode': patch
'@mission-platform/qr-code': patch
'@mission-platform/matrix-code': patch
'@mission-platform/code-scanner': patch
---

move wasm-pack builds onto crate workspace members and make `-wasm` packages self-contained tsdown libraries

Each wasm-pack crate is now a private pnpm/turbo workspace member (`@mission-platform/<crate>-crate`) that runs `wasm-pack build --target bundler --no-pack` into `packages/<crate>-wasm/src/wasm` (turbo-cached cargo output). The published `@mission-platform/<crate>-wasm` package is now a `tsdown` library: a small `src/index.ts` wrapper inlines the `_bg.wasm` binary as base64, instantiates it synchronously at import, and re-exports the crate's typed functions ready to use — so `@mission-platform/<crate>-wasm` ships a single self-contained `dist/index.js` with no external `.wasm` and no async init. Consuming packages (`barcode`, `qr-code`, `matrix-code`, `code-scanner`) now import these ready functions and bundle the `-wasm` dist, so their `init*` helpers are backwards-compatible no-ops and their own inline-wasm plugins are removed.
