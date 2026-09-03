// Neutral components barrel for the write-once `ForgeMatrixCode`.
//
// This is the Stage-1 input for `@mission-platform/vite-plugin-forge`: the
// per-framework builds (`./react` / `./vue`) are generated from this barrel,
// each component compiled straight to native React or Vue. The barrel is never
// shipped as-is; only the compiled framework builds are exposed (through the
// package's `./react` and `./vue` subpath exports).
export {
  ForgeMatrixCode,
  type MatrixCodeActions,
  type MatrixCodeProperties,
  type MatrixGradient,
  type MatrixLogo,
  type MatrixModuleShape,
} from './molecules/forge-matrix-code';
