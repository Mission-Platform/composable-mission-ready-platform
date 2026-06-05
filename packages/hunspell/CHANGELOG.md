# @mission-platform/hunspell

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
