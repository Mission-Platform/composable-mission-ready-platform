// Public entry point for `@mission-platform/matrix-code`.
//
// The typed encoder façade lives under `./encoder` and is re-exported here so
// the package root exposes a flat API. The per-feature `component/` sibling (a write-once `ForgeMatrixCode`)
// is added in a follow-up and re-exported here when present.
export { type MatrixCode, type MatrixSymbology, encodeMatrix, encodeMatrixAsync } from './encoder';
export {
  ForgeMatrixCode,
  type MatrixCodeActions,
  type MatrixCodeProperties,
  type MatrixGradient,
  type MatrixLogo,
  type MatrixModuleShape,
} from './components';
