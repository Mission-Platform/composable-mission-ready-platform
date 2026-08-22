# @mission-platform/matrix-code-decode-crate

## 0.1.1

### Patch Changes

- d920693: retain the matrix decoder as a Cargo crate used by scanner and differential-oracle builds

  The published matrix package now uses package-local Forge Web Script artifacts. This Rust crate remains in the Cargo workspace for scanner consumers and differential validation, but it is no longer a pnpm package or a production JavaScript dependency.
