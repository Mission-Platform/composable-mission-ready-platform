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
  type ForgeWebScriptBackendCompilationResult,
} from './backend.js';

export {
  analysisOptions,
  compileForgeWebScript,
  compileForgeWebScriptGraph,
  compileForgeWebScriptModule,
  compileForgeWebScriptSeed,
  createForgeWebScriptCompiler,
  runSelfHostedStage,
  selfHostedDiagnostic,
  withSelfHostedResult,
} from './module.js';

export { createForgeWebScriptCompilerService } from './service.js';

export type {
  ForgeWebScriptArtifact,
  ForgeWebScriptCompileInput,
  ForgeWebScriptCompiler,
  ForgeWebScriptCompilerReport,
  ForgeWebScriptCompilerService,
  ForgeWebScriptGraphCompileInput,
} from '../contracts.js';
