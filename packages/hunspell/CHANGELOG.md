# @mission-platform/hunspell

## 0.2.2

### Patch Changes

- 8a910f9: use shared `@mission-platform/typescript-config` and `@mission-platform/vite-config`

  Migrates `vite.config.ts`, `tsconfig.build.json`, and `tsconfig.node.json`
  to extend the shared workspaces under `configs/`. The `assetsInclude`
  - `assetFileNames` settings (for the WebAssembly artefact) are layered
    in via `overrides`. No runtime or public-API change.

- 05d31c9: normalize lint and format scripts across all workspaces

  Add consistent `lint:fix`, `lint:style:fix`, and `format:write` scripts to every workspace, and make `format` run `prettier --check` instead of `prettier --write` so it can be used as a non-mutating verification step.

- cf89515: enable tree shaking support when consumed by apps

  Declares `"sideEffects"` in each package's `package.json` so app bundlers
  (Vite/Rollup) can safely drop unused exports. Pure-TypeScript packages
  (`harper`, `hunspell`, `i18n`) opt out of side effects entirely with
  `"sideEffects": false`. Packages that ship styles and/or Vue SFCs
  (`breakpoints`, `components`, `icons`, `map`, `tokens`) keep `*.css`,
  `*.scss`, and `*.vue` files marked as side-effectful so component
  styles and SCSS entrypoints are preserved.

## 0.2.1

### Patch Changes

- 40b0054: fix build script to exclude wasm build step from default build

## 0.2.0

### Minor Changes

- 74736b6: Add `tokenize` method to `HunspellChecker` with `TokenResult` and `TokenResultVector` types; export new types from package index. Refactor hunspell build script to separate `build:wasm` and `build:ts` steps. Remove redundant `role="region"` from `BaseMonacoEditor`.

### Patch Changes

- ce4e4f2: switch docker build to buildx and add github actions cache backend support
  - replace `docker build` with `docker buildx build` in build.sh for multi-platform support
  - add optional gha cache backend via `GHA_CACHE=1` env var or auto-detection of `GITHUB_ACTIONS=true`
  - update dockerfile base image from `emscripten/emsdk:5.0.7-arm64` to the multi-platform `emscripten/emsdk:5.0.7`
  - add `docker/setup-buildx-action@v4` step to the publish workflow before dependency installation

## 0.1.0

### Minor Changes

- feat: initial Hunspell spell-checking package with WASM bindings and dictionary support
