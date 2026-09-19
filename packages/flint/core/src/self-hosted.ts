import { compileFlintSeed } from './compiler.js';
import { prepareFlintFrontend } from './frontend.js';
import {
  computeFlintLexStageFingerprint,
  createFlintLexStageVmModule,
  encodeFlintLexStageSource,
  FLINT_LEX_STAGE_ENTRY,
  type FlintSelfHostedVmModule,
  type FlintSelfHostedVmValue,
} from './self-hosted/lex-stage.js';
import { flintSelfHostedCompilerSources } from './self-hosted/sources.js';

import type { FlintArtifact, FlintCompileInput, FlintFrontendResult } from './contracts.js';
import type { FlintAbiManifest } from './manifest.js';
import type { FlintSelfHostedSourceModule } from './self-hosted/sources.js';

export * from './self-hosted/artifact.js';
export * from './self-hosted/stage-codec.js';

export type FlintSelfHostedVmExecutionMode = 'interpret' | 'jit' | 'aot';

export type {
  FlintSelfHostedVmFunction,
  FlintSelfHostedVmInstruction,
  FlintSelfHostedVmModule,
  FlintSelfHostedVmValue,
} from './self-hosted/lex-stage.js';

export {
  computeFlintLexStageFingerprint,
  createFlintLexStageVmModule,
  encodeFlintLexStageSource,
  FLINT_LEX_STAGE_ENTRY,
  FLINT_LEX_STAGE_SOURCE_LAYOUT,
} from './self-hosted/lex-stage.js';

export {
  computeFlintParserStageFingerprint,
  createFlintParserStageVmModule,
  FLINT_PARSER_STAGE_ENTRY,
  type FlintParserStageVmModuleOptions,
} from './self-hosted/parser-stage.js';

export {
  createFlintParserModuleVmModule,
  decodeFlintParserModuleEnvelope,
  FLINT_PARSER_MODULE_STAGE_ENTRY,
  type FlintParserModuleEnvelope,
  type FlintParserModuleStageOptions,
} from './self-hosted/parser-module-stage.js';

export interface FlintSelfHostedNormalizedOutput {
  readonly ast: unknown;
  readonly ir: unknown;
  readonly optimizedAst: unknown;
  readonly optimizedIr: unknown;
  readonly manifest: FlintAbiManifest | undefined;
  readonly diagnostics: unknown;
  readonly wat: string | undefined;
  readonly wasmHash: string | undefined;
  readonly contentHash: string;
}

export interface FlintSelfHostedCompilation {
  /** Seed frontend result; full compilation remains seed-backed outside the lex stage. */
  readonly frontend: FlintFrontendResult;
  /** Seed backend artifact retained for fixed-point / class-rejection checks. */
  readonly artifact: FlintArtifact;
  readonly normalized: FlintSelfHostedNormalizedOutput;
  /** Canonical hash of the seed-normalized full-compile view (not produced by the VM). */
  readonly seedFingerprint: string;
  /**
   * Deterministic lex-stage fingerprint computed by the TypeScript seed reference.
   * The VM must reproduce this value when executing `vmModule`.
   */
  readonly expectedLexFingerprint: number;
  readonly inputValue: Extract<FlintSelfHostedVmValue, { readonly kind: 'aggregate' }>;
  /** VM module that executes the FWS-authored lex stage (no seedCompile capability). */
  readonly vmModule: FlintSelfHostedVmModule;
  readonly entryFunction: typeof FLINT_LEX_STAGE_ENTRY;
}

const encoder = new TextEncoder();

function hashText(value: string): string {
  let hash = 2_166_136_261;
  for (const byte of encoder.encode(value)) {
    hash ^= byte;
    hash = Math.imul(hash, 16_777_619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function canonicalize(value: unknown): unknown {
  if (value instanceof Uint8Array) return [...value];
  if (Array.isArray(value)) return value.map((entry) => canonicalize(entry));
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .toSorted(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  return value;
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function wasmHash(wasm: Uint8Array | undefined): string | undefined {
  return wasm === undefined ? undefined : hashText(canonicalJson(wasm));
}

function normalizedOutput(frontend: FlintFrontendResult, artifact: FlintArtifact): FlintSelfHostedNormalizedOutput {
  return {
    ast: frontend.module,
    ir: frontend.ir,
    optimizedAst: frontend.optimizedModule,
    optimizedIr: frontend.optimizedIr,
    manifest: frontend.abi,
    diagnostics: frontend.diagnostics,
    wat: artifact.wat,
    wasmHash: wasmHash(artifact.wasm),
    contentHash: artifact.contentHash,
  };
}

function compilerSourcesHash(): string {
  return hashText(
    flintSelfHostedCompilerSources.map(({ name, stage, source }) => `${name}\0${stage}\0${source}`).join('\0'),
  );
}

/**
 * Prepare a bounded self-hosted compilation unit.
 *
 * The VM module runs the real lex/token-normalization stage on the input source.
 * Full frontend/backend compilation remains on the TypeScript seed until later cutover.
 */
export function prepareFlintSelfHostedCompilation(input: FlintCompileInput): FlintSelfHostedCompilation {
  const frontend = prepareFlintFrontend(input);
  const artifact = compileFlintSeed(input);
  const normalized = normalizedOutput(frontend, artifact);
  const seedFingerprint = hashText(canonicalJson(normalized));
  const expectedLexFingerprint = computeFlintLexStageFingerprint(input.source);
  const inputValue = encodeFlintLexStageSource(input.source);
  const vmModule = createFlintLexStageVmModule(compilerSourcesHash());
  return {
    frontend,
    artifact,
    normalized,
    seedFingerprint,
    expectedLexFingerprint,
    inputValue,
    vmModule,
    entryFunction: FLINT_LEX_STAGE_ENTRY,
  };
}

/** @deprecated Use seedFingerprint / expectedLexFingerprint; kept as alias during transition. */
export function prepareFlintSelfHostedCompilationLegacyFingerprint(input: FlintCompileInput): string {
  return prepareFlintSelfHostedCompilation(input).seedFingerprint;
}

export function createFlintSelfHostedCompilerSourceManifest(): readonly FlintSelfHostedSourceModule[] {
  return flintSelfHostedCompilerSources;
}

export function encodeFlintSelfHostedFingerprint(fingerprint: string): Uint8Array {
  return encoder.encode(fingerprint);
}

export function decodeFlintSelfHostedFingerprint(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}
