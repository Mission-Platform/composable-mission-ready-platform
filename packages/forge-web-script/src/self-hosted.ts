import { compileForgeWebScriptSeed } from './compiler.js';
import { prepareForgeWebScriptFrontend } from './frontend.js';
import {
  computeForgeWebScriptLexStageFingerprint,
  createForgeWebScriptLexStageVmModule,
  encodeForgeWebScriptLexStageSource,
  FORGE_WEB_SCRIPT_LEX_STAGE_ENTRY,
  type ForgeWebScriptSelfHostedVmModule,
  type ForgeWebScriptSelfHostedVmValue,
} from './self-hosted/lex-stage.js';
import { forgeWebScriptSelfHostedCompilerSources } from './self-hosted/sources.js';

import type { ForgeWebScriptArtifact, ForgeWebScriptCompileInput, ForgeWebScriptFrontendResult } from './contracts.js';
import type { ForgeWebScriptAbiManifest } from './manifest.js';
import type { ForgeWebScriptSelfHostedSourceModule } from './self-hosted/sources.js';

export * from './self-hosted/artifact.js';
export * from './self-hosted/stage-codec.js';

export type ForgeWebScriptSelfHostedVmExecutionMode = 'interpret' | 'jit' | 'aot';

export type {
  ForgeWebScriptSelfHostedVmFunction,
  ForgeWebScriptSelfHostedVmInstruction,
  ForgeWebScriptSelfHostedVmModule,
  ForgeWebScriptSelfHostedVmValue,
} from './self-hosted/lex-stage.js';

export {
  computeForgeWebScriptLexStageFingerprint,
  createForgeWebScriptLexStageVmModule,
  encodeForgeWebScriptLexStageSource,
  FORGE_WEB_SCRIPT_LEX_STAGE_ENTRY,
  FORGE_WEB_SCRIPT_LEX_STAGE_SOURCE_LAYOUT,
} from './self-hosted/lex-stage.js';

export {
  computeForgeWebScriptParserStageFingerprint,
  createForgeWebScriptParserStageVmModule,
  FORGE_WEB_SCRIPT_PARSER_STAGE_ENTRY,
  type ForgeWebScriptParserStageVmModuleOptions,
} from './self-hosted/parser-stage.js';

export {
  createForgeWebScriptParserModuleVmModule,
  decodeForgeWebScriptParserModuleEnvelope,
  FORGE_WEB_SCRIPT_PARSER_MODULE_STAGE_ENTRY,
  type ForgeWebScriptParserModuleEnvelope,
  type ForgeWebScriptParserModuleStageOptions,
} from './self-hosted/parser-module-stage.js';

export interface ForgeWebScriptSelfHostedNormalizedOutput {
  readonly ast: unknown;
  readonly ir: unknown;
  readonly optimizedAst: unknown;
  readonly optimizedIr: unknown;
  readonly manifest: ForgeWebScriptAbiManifest | undefined;
  readonly diagnostics: unknown;
  readonly wat: string | undefined;
  readonly wasmHash: string | undefined;
  readonly contentHash: string;
}

export interface ForgeWebScriptSelfHostedCompilation {
  /** Seed frontend result; full compilation remains seed-backed outside the lex stage. */
  readonly frontend: ForgeWebScriptFrontendResult;
  /** Seed backend artifact retained for fixed-point / class-rejection checks. */
  readonly artifact: ForgeWebScriptArtifact;
  readonly normalized: ForgeWebScriptSelfHostedNormalizedOutput;
  /** Canonical hash of the seed-normalized full-compile view (not produced by the VM). */
  readonly seedFingerprint: string;
  /**
   * Deterministic lex-stage fingerprint computed by the TypeScript seed reference.
   * The VM must reproduce this value when executing `vmModule`.
   */
  readonly expectedLexFingerprint: number;
  readonly inputValue: Extract<ForgeWebScriptSelfHostedVmValue, { readonly kind: 'aggregate' }>;
  /** VM module that executes the FWS-authored lex stage (no seedCompile capability). */
  readonly vmModule: ForgeWebScriptSelfHostedVmModule;
  readonly entryFunction: typeof FORGE_WEB_SCRIPT_LEX_STAGE_ENTRY;
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

function normalizedOutput(
  frontend: ForgeWebScriptFrontendResult,
  artifact: ForgeWebScriptArtifact,
): ForgeWebScriptSelfHostedNormalizedOutput {
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
    forgeWebScriptSelfHostedCompilerSources.map(({ name, stage, source }) => `${name}\0${stage}\0${source}`).join('\0'),
  );
}

/**
 * Prepare a bounded self-hosted compilation unit.
 *
 * The VM module runs the real lex/token-normalization stage on the input source.
 * Full frontend/backend compilation remains on the TypeScript seed until later cutover.
 */
export function prepareForgeWebScriptSelfHostedCompilation(
  input: ForgeWebScriptCompileInput,
): ForgeWebScriptSelfHostedCompilation {
  const frontend = prepareForgeWebScriptFrontend(input);
  const artifact = compileForgeWebScriptSeed(input);
  const normalized = normalizedOutput(frontend, artifact);
  const seedFingerprint = hashText(canonicalJson(normalized));
  const expectedLexFingerprint = computeForgeWebScriptLexStageFingerprint(input.source);
  const inputValue = encodeForgeWebScriptLexStageSource(input.source);
  const vmModule = createForgeWebScriptLexStageVmModule(compilerSourcesHash());
  return {
    frontend,
    artifact,
    normalized,
    seedFingerprint,
    expectedLexFingerprint,
    inputValue,
    vmModule,
    entryFunction: FORGE_WEB_SCRIPT_LEX_STAGE_ENTRY,
  };
}

/** @deprecated Use seedFingerprint / expectedLexFingerprint; kept as alias during transition. */
export function prepareForgeWebScriptSelfHostedCompilationLegacyFingerprint(input: ForgeWebScriptCompileInput): string {
  return prepareForgeWebScriptSelfHostedCompilation(input).seedFingerprint;
}

export function createForgeWebScriptSelfHostedCompilerSourceManifest(): readonly ForgeWebScriptSelfHostedSourceModule[] {
  return forgeWebScriptSelfHostedCompilerSources;
}

export function encodeForgeWebScriptSelfHostedFingerprint(fingerprint: string): Uint8Array {
  return encoder.encode(fingerprint);
}

export function decodeForgeWebScriptSelfHostedFingerprint(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}
