import {
  compileFlintWasm,
  verifyFlintWasmArtifact,
  type FlintWasmArtifactVerificationDiagnostic,
  type FlintWasmFeatureRequirements,
} from '@mission-platform/flint-wasm';

import { createDiagnostic, type FlintDiagnostic } from '../diagnostics.js';
import { lexFlint } from '../lexer.js';

import type { FlintArtifactVerificationReport, FlintIteratorExport } from '../contracts.js';
import type { FlintAbiManifest, FlintDynamicLinkMetadata } from '../manifest.js';

export interface FlintBackendCompilationResult {
  readonly wasm?: Uint8Array;
  readonly wat?: string;
  readonly unoptimizedWasm?: Uint8Array;
  readonly unoptimizedWat?: string;
  readonly iteratorExports?: readonly FlintIteratorExport[];
  readonly sourceMap?: string;
  readonly contentHash: string;
  readonly diagnostics: readonly FlintDiagnostic[];
  readonly metadata: Parameters<typeof compileFlintWasm>[0]['metadata'];
  readonly featureRequirements?: FlintWasmFeatureRequirements;
}

export const encoder = new TextEncoder();

/**
 * Computes a 32-bit FNV-1a hash of the given byte array returned as a hex string.
 */
export function hashBytes(bytes: Uint8Array): string {
  let hash = 2_166_136_261;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 16_777_619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * Computes a normalized source hash for an artifact from its non-comment token stream.
 */
export function sourceHashForArtifact(source: string, fileName: string): string {
  const tokens = lexFlint(source, fileName)
    .tokens.filter(({ kind }) => kind !== 'comment' && kind !== 'eof')
    .map(({ kind, text }) => `${kind}\0${text}`)
    .join('\0');
  return hashBytes(encoder.encode(tokens));
}

/**
 * Computes dynamic link metadata for modules marked with dynamic link mode in the manifest.
 */
export function dynamicLinkMetadata(
  manifest: FlintAbiManifest,
  artifactId: string,
): FlintDynamicLinkMetadata | undefined {
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

/**
 * Converts a Wasm artifact verification diagnostic into a standard compiler diagnostic.
 */
export function artifactVerificationDiagnostic(diagnostic: FlintWasmArtifactVerificationDiagnostic): FlintDiagnostic {
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

/**
 * Verifies backend WebAssembly artifacts against policy, target features, and manifest constraints.
 */
export function verifyBackendArtifact(input: {
  readonly wasm: Uint8Array;
  readonly unoptimizedWasm?: Uint8Array;
  readonly fileName: string;
  readonly manifest: FlintAbiManifest;
  readonly metadata: Parameters<typeof compileFlintWasm>[0]['metadata'];
  readonly targetFeatures?: Parameters<typeof verifyFlintWasmArtifact>[0]['targetFeatures'];
  readonly featureRequirements?: FlintWasmFeatureRequirements;
  readonly iteratorExports?: readonly FlintIteratorExport[];
  readonly expectedContentHash: string;
  readonly expectedSourceHash: string;
  readonly esmSource: string;
  readonly profile: 'strict' | 'development';
  readonly allowedCapabilities?: readonly string[];
}): {
  readonly verificationDiagnostics: readonly FlintDiagnostic[];
  readonly artifactVerification: FlintArtifactVerificationReport;
} {
  const rawVerification = verifyFlintWasmArtifact({
    wasm: input.wasm,
    ...(input.unoptimizedWasm === undefined ? {} : { unoptimizedWasm: input.unoptimizedWasm }),
    fileName: input.fileName,
    manifest: input.manifest as unknown as Parameters<typeof verifyFlintWasmArtifact>[0]['manifest'],
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
  const verificationDiagnostics = rawVerification.diagnostics.map(
    (diagnostic: FlintWasmArtifactVerificationDiagnostic) => artifactVerificationDiagnostic(diagnostic),
  );
  const artifactVerification: FlintArtifactVerificationReport = {
    verified: rawVerification.verified,
    diagnostics: verificationDiagnostics,
    contentHash: rawVerification.contentHash,
    checkedVariants: rawVerification.checkedVariants,
  };
  return { verificationDiagnostics, artifactVerification };
}
