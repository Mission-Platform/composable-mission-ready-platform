# @mission-platform/flint-vitest

## 1.0.0

### Major Changes

- 94a694a: migrate Forge Web Script (FWS) packages and downstream integrations to Flint
  
  BREAKING CHANGE: The systems programming language formerly known as Forge Web Script (FWS) is now Flint. All package names have migrated to `@mission-platform/flint*`, primary source files now use `.flint` (with `.flt` supported as compact), diagnostic codes now emit `FLINT-*` prefixes, and compiler executables have been renamed to `flint` and `flint-lsp`.

### Patch Changes

- 8be0da7: optimize turbo pipeline, standardize type-check task, and consolidate package build scripts
- Updated dependencies [26de5ea]
- Updated dependencies [6c683ae]
- Updated dependencies [94a694a]
- Updated dependencies [f3b344d]
- Updated dependencies [9e54a30]
- Updated dependencies [6c683ae]
- Updated dependencies [8be0da7]
- Updated dependencies [8be0da7]
  - @mission-platform/flint-runtime@1.0.0
  - @mission-platform/flint@1.0.0
  - @mission-platform/vite-plugin-flint@1.0.0
  - @mission-platform/vite-config@1.1.4

## 0.2.2

### Patch Changes

- 8f103a6: refactor(compiler): prune cache growth, lift scanner wasm package, and modularize compiler
- cb5f5ca: configure packages for public access
- Updated dependencies [8f103a6]
- Updated dependencies [cb5f5ca]
  - @mission-platform/flint@0.3.1
  - @mission-platform/vite-plugin-flint@0.1.3
  - @mission-platform/flint-runtime@0.3.1
  - @mission-platform/vite-config@1.1.3

## 0.2.1
### Patch Changes

- 7e3cc9d: ignore generated package files during formatting
- Updated dependencies [e45b5f4]
- Updated dependencies [7788642]
- Updated dependencies [ff73b42]
- Updated dependencies [0c3277d]
- Updated dependencies [7788642]
- Updated dependencies [7e3cc9d]
- Updated dependencies [3d452d2]
- Updated dependencies [edc494d]
  - @mission-platform/flint@0.3.0
  - @mission-platform/vite-plugin-flint@0.1.2
  - @mission-platform/flint-runtime@0.3.0
  - @mission-platform/vite-config@1.1.2

## 0.2.0

### Minor Changes

- 9774a09: add the Forge Web Script compiler, runtime, language tooling, and test harness

### Patch Changes

- c32bb83: centralize package documentation generation in the repository build
- Updated dependencies [c32bb83]
- Updated dependencies [f216404]
- Updated dependencies [9996e65]
- Updated dependencies [9774a09]
- Updated dependencies [8a15dbc]
- Updated dependencies [e0c66e1]
  - @mission-platform/vite-config@1.1.1
  - @mission-platform/flint-runtime@0.2.0
  - @mission-platform/flint@0.2.0
  - @mission-platform/vite-plugin-flint@0.1.1
