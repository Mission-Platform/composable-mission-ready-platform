# @mission-platform/flint-language-service

## 1.0.0

### Major Changes

- 94a694a: migrate Forge Web Script (FWS) packages and downstream integrations to Flint
  
  BREAKING CHANGE: The systems programming language formerly known as Forge Web Script (FWS) is now Flint. All package names have migrated to `@mission-platform/flint*`, primary source files now use `.flint` (with `.flt` supported as compact), diagnostic codes now emit `FLINT-*` prefixes, and compiler executables have been renamed to `flint` and `flint-lsp`.

### Minor Changes

- f3b344d: modernize Flint compiler, runtime, ABI, and tooling with LLVM and GCC innovations

### Patch Changes

- 8be0da7: optimize turbo pipeline, standardize type-check task, and consolidate package build scripts
- Updated dependencies [26de5ea]
- Updated dependencies [6c683ae]
- Updated dependencies [94a694a]
- Updated dependencies [f3b344d]
- Updated dependencies [9e54a30]
- Updated dependencies [6c683ae]
- Updated dependencies [8be0da7]
  - @mission-platform/flint-runtime@1.0.0
  - @mission-platform/flint@1.0.0

## 0.3.1

### Patch Changes

- cb5f5ca: configure packages for public access
- Updated dependencies [8f103a6]
- Updated dependencies [cb5f5ca]
  - @mission-platform/flint@0.3.1
  - @mission-platform/flint-runtime@0.3.1

## 0.3.0
### Minor Changes

- 82d79b5: Implement WebAssembly v128 SIMD vectorization, bulk memory operations, query-based incremental caching, request cancellation debouncing, workspace symbol navigation, and quickfix code actions (#44, #42).

### Patch Changes

- Updated dependencies [e45b5f4]
- Updated dependencies [7788642]
- Updated dependencies [ff73b42]
- Updated dependencies [0c3277d]
- Updated dependencies [7e3cc9d]
- Updated dependencies [3d452d2]
  - @mission-platform/flint@0.3.0
  - @mission-platform/flint-runtime@0.3.0

## 0.2.0

### Minor Changes

- 9774a09: add the Forge Web Script compiler, runtime, language tooling, and test harness

### Patch Changes

- c32bb83: centralize package documentation generation in the repository build
- e0c66e1: update package build task dependencies
- Updated dependencies [c32bb83]
- Updated dependencies [9996e65]
- Updated dependencies [9774a09]
- Updated dependencies [e0c66e1]
  - @mission-platform/flint-runtime@0.2.0
  - @mission-platform/flint@0.2.0
