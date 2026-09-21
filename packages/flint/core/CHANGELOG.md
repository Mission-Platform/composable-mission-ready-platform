# @mission-platform/forge-web-script

## 0.3.1

### Patch Changes

- 8f103a6: refactor(compiler): prune cache growth, lift scanner wasm package, and modularize compiler
- cb5f5ca: configure packages for public access
- Updated dependencies [cb5f5ca]
  - @mission-platform/forge-web-script-regex@0.3.1
  - @mission-platform/forge-web-script-wasm@1.0.1

## 0.3.0
### Minor Changes

- 0c3277d: Implement native Web IDL parser, type-safe FWS extern binding generator, and zero-copy host JavaScript/TypeScript shims.
- 3d452d2: Add structural type algebra and layout-deduplicated generic monomorphization, plus linear-time PikeVM regex matching with ReDoS-resistant execution.

### Patch Changes

- e45b5f4: optimize compiler performance and reuse compiler service across builds
- 7e3cc9d: ignore generated package files during formatting
- Updated dependencies [7788642]
- Updated dependencies [82d79b5]
- Updated dependencies [edc494d]
- Updated dependencies [7e3cc9d]
- Updated dependencies [3d452d2]
  - @mission-platform/forge-web-script-wasm@1.0.0
  - @mission-platform/forge-web-script-regex@0.3.0

## 0.2.0

### Minor Changes

- 9996e65: harden Forge Web Script compilation, runtime memory safety, and Wasm optimization
- 9774a09: add the Forge Web Script compiler, runtime, language tooling, and test harness

### Patch Changes

- c32bb83: centralize package documentation generation in the repository build
- Updated dependencies [c32bb83]
- Updated dependencies [9996e65]
- Updated dependencies [9774a09]
- Updated dependencies [e0c66e1]
  - @mission-platform/forge-web-script-regex@0.2.0
  - @mission-platform/forge-web-script-wasm@0.2.0
