// Public entry point for `@mission-platform/matrix-code`.
//
// The typed encoder façade lives under `./encoder` and the decoder façade under
// `./decoder`; both are re-exported here so the package root exposes a flat API.
// The encoder and decoder use separate Forge Web Script artifacts with typed
// adapters. The per-feature `component/` sibling (a write-once `ForgeMatrixCode`)
// is added in a follow-up and re-exported here when present.
export { type MatrixCode, type MatrixSymbology, encodeMatrix, encodeMatrixAsync } from './encoder';
export { decodeMatrix, decodeMatrixAsync, decodeMatrixAsyncWithErasures, decodeMatrixWithErasures } from './decoder';
export {
  ForgeMatrixCode,
  type MatrixCodeActions,
  type MatrixCodeProperties,
  type MatrixGradient,
  type MatrixLogo,
  type MatrixModuleShape,
} from './components';
