# @mission-platform/code-scanner-wasm

## 1.4.1

### Patch Changes

- 94a694a: migrate Forge Web Script (FWS) packages and downstream integrations to Flint
  
  BREAKING CHANGE: The systems programming language formerly known as Forge Web Script (FWS) is now Flint. All package names have migrated to `@mission-platform/flint*`, primary source files now use `.flint` (with `.flt` supported as compact), diagnostic codes now emit `FLINT-*` prefixes, and compiler executables have been renamed to `flint` and `flint-lsp`.
- 8be0da7: optimize turbo pipeline, standardize type-check task, and consolidate package build scripts
- Updated dependencies [26de5ea]
- Updated dependencies [6c683ae]
- Updated dependencies [94a694a]
- Updated dependencies [f3b344d]
- Updated dependencies [9e54a30]
- Updated dependencies [6c683ae]
- Updated dependencies [8be0da7]
  - @mission-platform/flint-runtime@1.0.0

## 1.4.0

### Minor Changes

- 8f103a6: refactor(compiler): prune cache growth, lift scanner wasm package, and modularize compiler

### Patch Changes

- Updated dependencies [cb5f5ca]
  - @mission-platform/forge-web-script-runtime@0.3.1
