# @mission-platform/forge-web-script-wasm

## 1.0.0

### Major Changes

- 7788642: Use versioned SHA-256 identities for Forge Web Script WASM artifacts.

  BREAKING CHANGE: Existing unversioned artifact hashes must be regenerated in the `sha256-v1:<hex>` format.

### Patch Changes

- @mission-platform/forge-web-script-regex@0.2.0

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
