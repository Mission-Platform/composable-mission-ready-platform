# @mission-platform/forge-web-script-wasm

## 2.0.0

### Major Changes

- 94a694a: migrate Forge Web Script (FWS) packages and downstream integrations to Flint
  
  BREAKING CHANGE: The systems programming language formerly known as Forge Web Script (FWS) is now Flint. All package names have migrated to `@mission-platform/flint*`, primary source files now use `.flint` (with `.flt` supported as compact), diagnostic codes now emit `FLINT-*` prefixes, and compiler executables have been renamed to `flint` and `flint-lsp`.

### Minor Changes

- 6c683ae: align C interoperability subsystem: centralized C ABI package, #[repr(C)] struct syntax, C string null-termination ergonomics, host foreign call validation, and expanded bindgen capabilities
- f3b344d: modernize Flint compiler, runtime, ABI, and tooling with LLVM and GCC innovations
- 6c683ae: lower foreign capability imports, indirect calls, and memory import features

### Patch Changes

- 26de5ea: fix code review issues across WebAssembly emission, WAT rendering, C-ABI mapping, and 64-bit runtime pointer validation
- 8be0da7: optimize turbo pipeline, standardize type-check task, and consolidate package build scripts
- Updated dependencies [26de5ea]
- Updated dependencies [6c683ae]
- Updated dependencies [94a694a]
- Updated dependencies [f3b344d]
- Updated dependencies [8be0da7]
  - @mission-platform/flint-c-abi@0.4.0
  - @mission-platform/flint-regex@1.0.0

## 1.0.1

### Patch Changes

- cb5f5ca: configure packages for public access
- Updated dependencies [cb5f5ca]
  - @mission-platform/forge-web-script-regex@0.3.1

## 1.0.0
### Major Changes

- 7788642: Use versioned SHA-256 identities for Forge Web Script WASM artifacts.
  
  BREAKING CHANGE: Existing unversioned artifact hashes must be regenerated in the `sha256-v1:<hex>` format.

### Minor Changes

- 82d79b5: Implement WebAssembly v128 SIMD vectorization, bulk memory operations, query-based incremental caching, request cancellation debouncing, workspace symbol navigation, and quickfix code actions (#44, #42).

### Patch Changes

- edc494d: support WebAssembly SIMD and memory operations in WAT generator
- Updated dependencies [7e3cc9d]
- Updated dependencies [3d452d2]
  - @mission-platform/forge-web-script-regex@0.3.0

## 0.2.0

### Minor Changes

- 9996e65: harden Forge Web Script compilation, runtime memory safety, and Wasm optimization
- 9774a09: add the Forge Web Script compiler, runtime, language tooling, and test harness

### Patch Changes

- c32bb83: centralize package documentation generation in the repository build
- e0c66e1: update package build task dependencies
- Updated dependencies [c32bb83]
- Updated dependencies [9774a09]
- Updated dependencies [e0c66e1]
  - @mission-platform/forge-web-script-regex@0.2.0
