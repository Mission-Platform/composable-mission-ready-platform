# @mission-platform/qr-code-encode-wasm

## 0.2.0

### Minor Changes

- d920693: move wasm-pack builds onto crate workspace members and make `-wasm` packages self-contained tsdown libraries

  Each wasm-pack crate is now a private pnpm/turbo workspace member (`@mission-platform/<crate>-crate`) that runs `wasm-pack build --target bundler --no-pack` into `packages/<crate>-wasm/src/wasm` (turbo-cached cargo output). The published `@mission-platform/<crate>-wasm` package is now a `tsdown` library: a small `src/index.ts` wrapper inlines the `_bg.wasm` binary as base64, instantiates it synchronously at import, and re-exports the crate's typed functions ready to use — so `@mission-platform/<crate>-wasm` ships a single self-contained `dist/index.js` with no external `.wasm` and no async init. Consuming packages (`barcode`, `qr-code`, `matrix-code`, `code-scanner`) now import these ready functions and bundle the `-wasm` dist, so their `init*` helpers are backwards-compatible no-ops and their own inline-wasm plugins are removed.

### Patch Changes

- bd88e5e: rename the component library prefix from `Base` to `Forge`

  BREAKING CHANGE: every exported component symbol and its folder/file and CSS class name is renamed from `Base*`/`base-*` to `Forge*`/`forge-*` (e.g. `BaseButton` → `ForgeButton`), and previously-unprefixed components (`HideAt`, `ShowAt`, `BreakpointDebug`) and every icon (`IconStar` → `ForgeIconStar`) now carry the `Forge` prefix. Consumers must update all imports and template usages accordingly.

- ac98203: normalize composable directories, package barrels, and colocated tests
- 2cbbd16: add a Vitest test setup

  Each WebAssembly package now ships a `test` script, a `vitest.config.ts`, a dedicated `tsconfig.test.json`, and an
  `index.spec.ts` smoke test covering the compiled bindings, so the packages are exercised in CI.

- b23115e: add a workspace-local .prettierignore so build output is excluded from format checks
