// Public entry point for `@mission-platform/matrix-code`.
//
// The typed encoder façade lives under `./encoder` and the decoder façade under
// `./decoder`; both are re-exported here so the package root exposes a flat API.
// The encoder and decoder are compiled from separate Rust crates
// (`crates/matrix-code-encode` / `crates/matrix-code-decode`, sharing
// `crates/matrix-code-common`) into two wasm modules under `generated/encode`
// and `generated/decode`. The per-feature `component/` sibling (a write-once
// `ForgeMatrixCode`) is added in a follow-up and re-exported here when present.
export { type MatrixCode, type MatrixSymbology, encodeMatrix, encodeMatrixAsync } from './encoder';
export { decodeMatrix, decodeMatrixAsync } from './decoder';
export {
  ForgeMatrixCode,
  type MatrixCodeActions,
  type MatrixCodeProperties,
  type MatrixGradient,
  type MatrixLogo,
  type MatrixModuleShape,
} from './components';
