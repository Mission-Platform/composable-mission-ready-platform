# @mission-platform/qr-code-encode-crate

## 0.1.1

### Patch Changes

- d920693: move wasm-pack builds onto crate workspace members and make `-wasm` packages self-contained tsdown libraries

  Each wasm-pack crate is now a private pnpm/turbo workspace member (`@mission-platform/<crate>-crate`) that runs `wasm-pack build --target bundler --no-pack` into `packages/<crate>-wasm/src/wasm` (turbo-cached cargo output). The published `@mission-platform/<crate>-wasm` package is now a `tsdown` library: a small `src/index.ts` wrapper inlines the `_bg.wasm` binary as base64, instantiates it synchronously at import, and re-exports the crate's typed functions ready to use — so `@mission-platform/<crate>-wasm` ships a single self-contained `dist/index.js` with no external `.wasm` and no async init. Consuming packages (`barcode`, `qr-code`, `matrix-code`, `code-scanner`) now import these ready functions and bundle the `-wasm` dist, so their `init*` helpers are backwards-compatible no-ops and their own inline-wasm plugins are removed.
