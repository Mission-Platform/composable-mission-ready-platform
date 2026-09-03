import {
  computeForgeWebScriptLexStageFingerprint,
  computeForgeWebScriptParserStageFingerprint,
  createForgeWebScriptLexStageVmModule,
  createForgeWebScriptParserStageVmModule,
  createForgeWebScriptSelfHostedParserArtifact,
  createForgeWebScriptSelfHostedTokenArtifact,
  encodeForgeWebScriptLexStageSource,
  FORGE_WEB_SCRIPT_LEX_STAGE_ENTRY,
  FORGE_WEB_SCRIPT_PARSER_STAGE_ENTRY,
  hashForgeWebScriptSelfHostedBytes,
  hashForgeWebScriptSelfHostedStagePayload,
  hashForgeWebScriptSelfHostedSourceIdentity,
  validateForgeWebScriptSelfHostedStageArtifact,
  prepareForgeWebScriptSelfHostedCompilation,
  type ForgeWebScriptCompileInput,
  type ForgeWebScriptParserStageVmModuleOptions,
  type ForgeWebScriptSelfHostedStageReport,
  type ForgeWebScriptSelfHostedVmModule,
  type ForgeWebScriptSelfHostedVmValue,
} from '@mission-platform/forge-web-script';
import { lexForgeWebScript, parseForgeWebScript } from '@mission-platform/forge-web-script';

import {
  createForgeWebScriptVmAotArtifact,
  createForgeWebScriptVmExecutor,
  executeForgeWebScriptVmAotArtifact,
  type ForgeWebScriptVmAotArtifact,
  type ForgeWebScriptVmExecutionMode,
  type ForgeWebScriptVmModule,
  type ForgeWebScriptVmValue,
} from './vm.js';

import type { ForgeWebScriptTraceOptions, ForgeWebScriptTraceReport } from './trace.js';

export interface ForgeWebScriptSelfHostedRunOptions {
  /** Override parser VM module construction (used to inject deliberate divergence in tests). */
  readonly parserStageVmModuleOptions?: ForgeWebScriptParserStageVmModuleOptions;
  readonly trace?: ForgeWebScriptTraceOptions;
  /** Upper bound for each self-hosted stage; never raises the built-in bound. */
  readonly maxSteps?: number;
}

export interface ForgeWebScriptSelfHostedVmRun {
  readonly mode: ForgeWebScriptVmExecutionMode;
  /** Lex-stage fingerprint produced by VM execution (not a seed echo). */
  readonly lexFingerprint: number;
  /** Seed reference fingerprint for the same source. */
  readonly expectedLexFingerprint: number;
  /** True only when every executed stage matches its seed reference. */
  readonly parity: boolean;
  readonly steps: number;
  readonly artifact: ReturnType<typeof prepareForgeWebScriptSelfHostedCompilation>['artifact'];
  readonly seedFingerprint: string;
  readonly aot?: ForgeWebScriptVmAotArtifact;
  readonly stages?: readonly ForgeWebScriptSelfHostedStageReport[];
}

function fingerprintHash(value: number): string {
  const bytes = new Uint8Array(4);
  const view = new DataView(bytes.buffer);
  view.setInt32(0, Math.trunc(value), true);
  return hashForgeWebScriptSelfHostedBytes(bytes);
}

/** Execute only the bounded FWS-authored lex stage for compiler consumers. */
export function runForgeWebScriptSelfHostedLexStage(
  input: Pick<ForgeWebScriptCompileInput, 'source' | 'fileName' | 'compilerVersion' | 'requestedCapabilities'>,
  mode: ForgeWebScriptVmExecutionMode,
  options: ForgeWebScriptSelfHostedRunOptions = {},
): ForgeWebScriptSelfHostedStageReport {
  const executor = createForgeWebScriptVmExecutor({ compilerVersion: input.compilerVersion, jitThreshold: 1 });
  const sourceHash = hashForgeWebScriptSelfHostedSourceIdentity(input.source, input.fileName);
  const module = toVmModule(createForgeWebScriptLexStageVmModule(sourceHash));
  const argument = toVmValue(encodeForgeWebScriptLexStageSource(input.source));
  const defaultMaxSteps = Math.max(1_000_000, input.source.length * 128);
  const execOptions = {
    mode,
    maxSteps: Math.min(defaultMaxSteps, Math.max(1, Math.trunc(options.maxSteps ?? defaultMaxSteps))),
  } as const;
  const tracedExecOptions = { ...execOptions, ...(options.trace === undefined ? {} : { trace: options.trace }) };
  const result =
    mode === 'aot'
      ? executeForgeWebScriptVmAotArtifact(
          createForgeWebScriptVmAotArtifact(module, input.compilerVersion),
          FORGE_WEB_SCRIPT_LEX_STAGE_ENTRY,
          [argument],
          tracedExecOptions,
        )
      : executor.execute(module, FORGE_WEB_SCRIPT_LEX_STAGE_ENTRY, [argument], tracedExecOptions);
  const lexFingerprint = readFingerprint(result.value, 'lex');
  const expectedLexFingerprint = computeForgeWebScriptLexStageFingerprint(input.source);
  const lex = lexForgeWebScript(input.source, input.fileName);
  const tokenArtifact = validateForgeWebScriptSelfHostedStageArtifact(
    createForgeWebScriptSelfHostedTokenArtifact(input.source, input.fileName, lex.tokens, lex.diagnostics),
    'lex',
    input.source,
    input.fileName,
  );
  const parser = runForgeWebScriptSelfHostedParserStage(input, mode, options);
  const lexParity = lexFingerprint === expectedLexFingerprint && tokenArtifact !== undefined;
  return {
    stage: 'lex',
    mode,
    lexFingerprint,
    expectedLexFingerprint,
    // Stage-local parity only — nested parser failures stay on the parse report.
    parity: lexParity,
    steps: result.steps,
    inputHash: tokenArtifact.sourceHash,
    outputHash: hashForgeWebScriptSelfHostedStagePayload(tokenArtifact),
    expectedOutputHash: hashForgeWebScriptSelfHostedStagePayload(tokenArtifact),
    artifact: tokenArtifact,
    ...((result as { readonly trace?: ForgeWebScriptTraceReport }).trace === undefined
      ? {}
      : { trace: (result as { readonly trace: ForgeWebScriptTraceReport }).trace }),
    stageReports: [parser],
  };
}

function runForgeWebScriptSelfHostedParserStage(
  input: Pick<ForgeWebScriptCompileInput, 'source' | 'fileName' | 'compilerVersion' | 'requestedCapabilities'>,
  mode: ForgeWebScriptVmExecutionMode,
  options: ForgeWebScriptSelfHostedRunOptions = {},
): ForgeWebScriptSelfHostedStageReport {
  const executor = createForgeWebScriptVmExecutor({ compilerVersion: input.compilerVersion, jitThreshold: 1 });
  const sourceHash = hashForgeWebScriptSelfHostedSourceIdentity(input.source, input.fileName);
  const module = toVmModule(createForgeWebScriptParserStageVmModule(sourceHash, options.parserStageVmModuleOptions));
  const argument = toVmValue(encodeForgeWebScriptLexStageSource(input.source));
  const defaultMaxSteps = Math.max(1_000_000, input.source.length * 256);
  const execOptions = {
    mode,
    maxSteps: Math.min(defaultMaxSteps, Math.max(1, Math.trunc(options.maxSteps ?? defaultMaxSteps))),
  } as const;
  const result =
    mode === 'aot'
      ? executeForgeWebScriptVmAotArtifact(
          createForgeWebScriptVmAotArtifact(module, input.compilerVersion),
          FORGE_WEB_SCRIPT_PARSER_STAGE_ENTRY,
          [argument],
          execOptions,
        )
      : executor.execute(module, FORGE_WEB_SCRIPT_PARSER_STAGE_ENTRY, [argument], execOptions);
  const parserFingerprint = readFingerprint(result.value, 'parse');
  const expectedParserFingerprint = computeForgeWebScriptParserStageFingerprint(input.source);
  const parsed = parseForgeWebScript(input.source, input.fileName);
  const parserArtifact =
    parsed.module === undefined
      ? undefined
      : validateForgeWebScriptSelfHostedStageArtifact(
          createForgeWebScriptSelfHostedParserArtifact(input.source, input.fileName, parsed.module, parsed.diagnostics),
          'parse',
          input.source,
          input.fileName,
        );
  // Independent VM identity vs seed identity — never compare a seed echo to itself.
  const fingerprintParity = parserFingerprint === expectedParserFingerprint;
  const artifactParity =
    parserArtifact === undefined
      ? parsed.diagnostics.length > 0
      : (parserArtifact.diagnosticPayload !== undefined) === parsed.diagnostics.length > 0;
  const parity = fingerprintParity && artifactParity;
  return {
    stage: 'parse',
    mode,
    lexFingerprint: parserFingerprint,
    expectedLexFingerprint: expectedParserFingerprint,
    parity,
    steps: result.steps,
    inputHash: hashForgeWebScriptSelfHostedSourceIdentity(input.source, input.fileName),
    outputHash: fingerprintHash(parserFingerprint),
    expectedOutputHash: fingerprintHash(expectedParserFingerprint),
    ...(parserArtifact === undefined ? {} : { artifact: parserArtifact }),
  };
}

/**
 * Structural adapter from the forge-web-script self-hosted module shape to the
 * runtime VM module contract. Kept narrow: both sides share the same format and
 * the stage instruction subset is a valid VM instruction subset.
 */
function toVmModule(module: ForgeWebScriptSelfHostedVmModule): ForgeWebScriptVmModule {
  return module as ForgeWebScriptVmModule;
}

function toVmValue(value: ForgeWebScriptSelfHostedVmValue): ForgeWebScriptVmValue {
  if (value.kind === 'aggregate')
    return {
      kind: 'aggregate',
      layout: value.layout,
      bytes: value.bytes,
      ownership: value.ownership,
    };
  if (value.kind === 'number') return { kind: 'number', type: value.type, value: value.value };
  if (value.kind === 'bool') return { kind: 'bool', value: value.value };
  return { kind: 'unit' };
}

function readFingerprint(value: ForgeWebScriptVmValue, stage: 'lex' | 'parse'): number {
  if (value.kind !== 'number' || typeof value.value !== 'number')
    throw new Error(`Self-hosted ${stage} stage must return an i32 fingerprint.`);
  return Math.trunc(value.value);
}

/**
 * Run the bounded self-hosted compiler bootstrap.
 *
 * Executes the FWS lex and parser stages under the requested VM mode and
 * compares each VM-derived fingerprint against the independent seed reference.
 * Full Wasm emission remains seed-backed and is exposed via `artifact` only when
 * every stage reports parity.
 */
export function runForgeWebScriptSelfHostedCompiler(
  input: ForgeWebScriptCompileInput,
  mode: ForgeWebScriptVmExecutionMode,
  options: ForgeWebScriptSelfHostedRunOptions = {},
): ForgeWebScriptSelfHostedVmRun {
  const compilation = prepareForgeWebScriptSelfHostedCompilation(input);
  const report = runForgeWebScriptSelfHostedLexStage(input, mode, options);
  const aot =
    mode === 'aot'
      ? createForgeWebScriptVmAotArtifact(toVmModule(compilation.vmModule), input.compilerVersion)
      : undefined;
  const stages = [report, ...(report.stageReports ?? [])];
  return {
    mode,
    lexFingerprint: report.lexFingerprint,
    expectedLexFingerprint: compilation.expectedLexFingerprint,
    parity: stages.every(({ parity }) => parity),
    steps: report.steps,
    artifact: compilation.artifact,
    seedFingerprint: compilation.seedFingerprint,
    ...(aot === undefined ? {} : { aot }),
    stages,
  };
}
