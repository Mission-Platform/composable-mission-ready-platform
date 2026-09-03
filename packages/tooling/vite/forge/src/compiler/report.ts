import type { ForgeArtifactManifest } from './artifact-manifest.js';
import type { ForgeCacheStats } from './cache.js';
import type { CompilerDiagnostic, CompilerPhase } from '@mission-platform/forge-plugin-api';

/** A completed compiler phase duration, in milliseconds. */
export interface ForgePhaseTiming {
  readonly phase: CompilerPhase;
  readonly durationMs: number;
}

/** Diagnostics and metrics collected during one service lifetime. */
export interface ForgeCompilationReport {
  readonly diagnostics: readonly CompilerDiagnostic[];
  readonly warnings: readonly CompilerDiagnostic[];
  readonly errors: readonly CompilerDiagnostic[];
  readonly phaseTimings: readonly ForgePhaseTiming[];
  readonly cache: ForgeCacheStats;
  readonly affectedFiles: readonly string[];
  readonly artifacts: readonly ForgeArtifactManifest[];
  /** Number of emitted target artifacts represented by the manifests. */
  readonly emittedArtifactCount: number;
}

export function diagnosticKey(diagnostic: CompilerDiagnostic): string {
  const span = diagnostic.span;
  return JSON.stringify([
    diagnostic.phase,
    diagnostic.severity,
    diagnostic.code,
    diagnostic.message,
    diagnostic.fileName,
    span?.start,
    span?.end,
    span?.line,
    span?.column,
  ]);
}
