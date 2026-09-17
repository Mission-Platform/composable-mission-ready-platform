import {
  compileForgeWebScriptWasm,
  verifyForgeWebScriptWasmArtifact,
  type ForgeWebScriptWasmArtifactVerificationDiagnostic,
  type ForgeWebScriptWasmFeatureRequirements,
} from '@mission-platform/forge-web-script-wasm';

import { createDiagnostic, type ForgeWebScriptDiagnostic } from '../diagnostics.js';
import { lexForgeWebScript } from '../lexer.js';

import type { ForgeWebScriptArtifactVerificationReport, ForgeWebScriptIteratorExport } from '../contracts.js';
import type { ForgeWebScriptAbiManifest, ForgeWebScriptDynamicLinkMetadata } from '../manifest.js';

export interface ForgeWebScriptBackendCompilationResult {
  readonly wasm?: Uint8Array;
  readonly wat?: string;
  readonly unoptimizedWasm?: Uint8Array;
  readonly unoptimizedWat?: string;
  readonly iteratorExports?: readonly ForgeWebScriptIteratorExport[];
  readonly sourceMap?: string;
  readonly contentHash: string;
  readonly diagnostics: readonly ForgeWebScriptDiagnostic[];
  readonly metadata: Parameters<typeof compileForgeWebScriptWasm>[0]['metadata'];
  readonly featureRequirements?: ForgeWebScriptWasmFeatureRequirements;
}

export const encoder = new TextEncoder();

export function hashBytes(bytes: Uint8Array): string {
  let hash = 2_166_136_261;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 16_777_619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function sourceHashForArtifact(source: string, fileName: string): string {
  const tokens = lexForgeWebScript(source, fileName)
    .tokens.filter(({ kind }) => kind !== 'comment' && kind !== 'eof')
    .map(({ kind, text }) => `${kind}\0${text}`)
    .join('\0');
  return hashBytes(encoder.encode(tokens));
}

export function dynamicLinkMetadata(
  manifest: ForgeWebScriptAbiManifest,
  artifactId: string,
): ForgeWebScriptDynamicLinkMetadata | undefined {
  const modules = manifest.sourceImports
    .filter((sourceImport) => sourceImport.linkMode === 'dynamic' && sourceImport.resolvedModuleId !== undefined)
    .map((sourceImport) => ({
      moduleId: sourceImport.resolvedModuleId as string,
      alias: sourceImport.alias,
      exports: sourceImport.exports ?? [],
    }))
    .toSorted((left, right) => left.moduleId.localeCompare(right.moduleId));
  if (modules.length === 0) return undefined;
  return {
    artifactId,
    manifestHash: hashBytes(encoder.encode(JSON.stringify(manifest))),
    modules,
  };
}

export function artifactVerificationDiagnostic(
  diagnostic: ForgeWebScriptWasmArtifactVerificationDiagnostic,
): ForgeWebScriptDiagnostic {
  return createDiagnostic(
    diagnostic.fileName,
    'artifact',
    diagnostic.code,
    diagnostic.message,
    diagnostic.span,
    diagnostic.severity,
    diagnostic.hint,
    {
      category: 'artifact',
      blocking: diagnostic.severity === 'error',
      evidence: diagnostic.evidence,
    },
  );
}

export function verifyBackendArtifact(input: {
  readonly wasm: Uint8Array;
  readonly unoptimizedWasm?: Uint8Array;
  readonly fileName: string;
  readonly manifest: ForgeWebScriptAbiManifest;
  readonly metadata: Parameters<typeof compileForgeWebScriptWasm>[0]['metadata'];
  readonly targetFeatures?: Parameters<typeof verifyForgeWebScriptWasmArtifact>[0]['targetFeatures'];
  readonly featureRequirements?: ForgeWebScriptWasmFeatureRequirements;
  readonly iteratorExports?: readonly ForgeWebScriptIteratorExport[];
  readonly expectedContentHash: string;
  readonly expectedSourceHash: string;
  readonly esmSource: string;
  readonly profile: 'strict' | 'development';
  readonly allowedCapabilities?: readonly string[];
}): {
  readonly verificationDiagnostics: readonly ForgeWebScriptDiagnostic[];
  readonly artifactVerification: ForgeWebScriptArtifactVerificationReport;
} {
  const rawVerification = verifyForgeWebScriptWasmArtifact({
    wasm: input.wasm,
    ...(input.unoptimizedWasm === undefined ? {} : { unoptimizedWasm: input.unoptimizedWasm }),
    fileName: input.fileName,
    manifest: input.manifest as unknown as Parameters<typeof verifyForgeWebScriptWasmArtifact>[0]['manifest'],
    metadata: input.metadata,
    targetFeatures: input.targetFeatures,
    featureRequirements: input.featureRequirements,
    ...(input.iteratorExports === undefined ? {} : { iteratorExports: input.iteratorExports }),
    expectedContentHash: input.expectedContentHash,
    expectedSourceHash: input.expectedSourceHash,
    esmSource: input.esmSource,
    policy: {
      profile: input.profile,
      allowedCapabilities: input.allowedCapabilities,
    },
  });
  const verificationDiagnostics = rawVerification.diagnostics.map((diagnostic) =>
    artifactVerificationDiagnostic(diagnostic),
  );
  const artifactVerification: ForgeWebScriptArtifactVerificationReport = {
    verified: rawVerification.verified,
    diagnostics: verificationDiagnostics,
    contentHash: rawVerification.contentHash,
    checkedVariants: rawVerification.checkedVariants,
  };
  return { verificationDiagnostics, artifactVerification };
}
