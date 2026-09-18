export {
  createDeclarations,
  declarationFunction,
  declarationProperty,
  declarationRecord,
  declarationType,
  rawDeclarationFunction,
  rawDeclarationRecord,
  rawDeclarationType,
} from './declarations.js';

export { bytesToBase64, createEsmSource } from './esm.js';

export {
  artifactVerificationDiagnostic,
  dynamicLinkMetadata,
  encoder,
  hashBytes,
  sourceHashForArtifact,
  verifyBackendArtifact,
  type FlintBackendCompilationResult,
} from './backend.js';

export {
  analysisOptions,
  compileFlint,
  compileFlintGraph,
  compileFlintModule,
  compileFlintSeed,
  createFlintCompiler,
  runSelfHostedStage,
  selfHostedDiagnostic,
  withSelfHostedResult,
} from './module.js';

export { createFlintCompilerService } from './service.js';

export type {
  FlintArtifact,
  FlintCompileInput,
  FlintCompiler,
  FlintCompilerReport,
  FlintCompilerService,
  FlintGraphCompileInput,
} from '../contracts.js';
