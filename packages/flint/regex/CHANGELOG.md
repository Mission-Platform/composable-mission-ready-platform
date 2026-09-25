# @mission-platform/forge-web-script-regex

## 1.0.0

### Major Changes

- 94a694a: migrate Forge Web Script (FWS) packages and downstream integrations to Flint
  
  BREAKING CHANGE: The systems programming language formerly known as Forge Web Script (FWS) is now Flint. All package names have migrated to `@mission-platform/flint*`, primary source files now use `.flint` (with `.flt` supported as compact), diagnostic codes now emit `FLINT-*` prefixes, and compiler executables have been renamed to `flint` and `flint-lsp`.

### Patch Changes

- 8be0da7: optimize turbo pipeline, standardize type-check task, and consolidate package build scripts

## 0.3.1

### Patch Changes

- cb5f5ca: configure packages for public access

## 0.3.0
### Minor Changes

- 3d452d2: Add structural type algebra and layout-deduplicated generic monomorphization, plus linear-time PikeVM regex matching with ReDoS-resistant execution.

### Patch Changes

- 7e3cc9d: ignore generated package files during formatting

## 0.2.0

### Minor Changes

- 9774a09: add the Forge Web Script compiler, runtime, language tooling, and test harness

### Patch Changes

- c32bb83: centralize package documentation generation in the repository build
- e0c66e1: update package build task dependencies
