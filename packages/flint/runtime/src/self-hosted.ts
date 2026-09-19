import {
  computeFlintLexStageFingerprint,
  computeFlintParserStageFingerprint,
  createFlintLexStageVmModule,
  createFlintParserStageVmModule,
  createFlintSelfHostedParserArtifact,
  createFlintSelfHostedTokenArtifact,
  encodeFlintLexStageSource,
  FLINT_LEX_STAGE_ENTRY,
  FLINT_PARSER_STAGE_ENTRY,
  hashFlintSelfHostedBytes,
  hashFlintSelfHostedStagePayload,
  hashFlintSelfHostedSourceIdentity,
  validateFlintSelfHostedStageArtifact,
  prepareFlintSelfHostedCompilation,
  type FlintCompileInput,
  type FlintParserStageVmModuleOptions,
  type FlintSelfHostedStageReport,
  type FlintSelfHostedVmModule,
  type FlintSelfHostedVmValue,
} from '@mission-platform/flint';
import { lexFlint, parseFlint } from '@mission-platform/flint';

import {
  createFlintVmAotArtifact,
  createFlintVmExecutor,
  executeFlintVmAotArtifact,
  type FlintVmAotArtifact,
  type FlintVmExecutionMode,
  type FlintVmModule,
  type FlintVmValue,
} from './vm.js';

import type { FlintTraceOptions, FlintTraceReport } from './trace.js';

export interface FlintSelfHostedRunOptions {
  /** Override parser VM module construction (used to inject deliberate divergence in tests). */
  readonly parserStageVmModuleOptions?: FlintParserStageVmModuleOptions;
  readonly trace?: FlintTraceOptions;
  /** Upper bound for each self-hosted stage; never raises the built-in bound. */
  readonly maxSteps?: number;
}

export interface FlintSelfHostedVmRun {
  readonly mode: FlintVmExecutionMode;
  /** Lex-stage fingerprint produced by VM execution (not a seed echo). */
  readonly lexFingerprint: number;
  /** Seed reference fingerprint for the same source. */
  readonly expectedLexFingerprint: number;
  /** True only when every executed stage matches its seed reference. */
  readonly parity: boolean;
  readonly steps: number;
  readonly artifact: ReturnType<typeof prepareFlintSelfHostedCompilation>['artifact'];
  readonly seedFingerprint: string;
  readonly aot?: FlintVmAotArtifact;
  readonly stages?: readonly FlintSelfHostedStageReport[];
}

function fingerprintHash(value: number): string {
  const bytes = new Uint8Array(4);
  const view = new DataView(bytes.buffer);
  view.setInt32(0, Math.trunc(value), true);
  return hashFlintSelfHostedBytes(bytes);
}

/** Execute only the bounded FWS-authored lex stage for compiler consumers. */
export function runFlintSelfHostedLexStage(
  input: Pick<FlintCompileInput, 'source' | 'fileName' | 'compilerVersion' | 'requestedCapabilities'>,
  mode: FlintVmExecutionMode,
  options: FlintSelfHostedRunOptions = {},
): FlintSelfHostedStageReport {
  const executor = createFlintVmExecutor({ compilerVersion: input.compilerVersion, jitThreshold: 1 });
  const sourceHash = hashFlintSelfHostedSourceIdentity(input.source, input.fileName);
  const module = toVmModule(createFlintLexStageVmModule(sourceHash));
  const argument = toVmValue(encodeFlintLexStageSource(input.source));
  const defaultMaxSteps = Math.max(1_000_000, input.source.length * 128);
  const execOptions = {
    mode,
    maxSteps: Math.min(defaultMaxSteps, Math.max(1, Math.trunc(options.maxSteps ?? defaultMaxSteps))),
  } as const;
  const tracedExecOptions = { ...execOptions, ...(options.trace === undefined ? {} : { trace: options.trace }) };
  const result =
    mode === 'aot'
      ? executeFlintVmAotArtifact(
          createFlintVmAotArtifact(module, input.compilerVersion),
          FLINT_LEX_STAGE_ENTRY,
          [argument],
          tracedExecOptions,
        )
      : executor.execute(module, FLINT_LEX_STAGE_ENTRY, [argument], tracedExecOptions);
  const lexFingerprint = readFingerprint(result.value, 'lex');
  const expectedLexFingerprint = computeFlintLexStageFingerprint(input.source);
  const lex = lexFlint(input.source, input.fileName);
  const tokenArtifact = validateFlintSelfHostedStageArtifact(
    createFlintSelfHostedTokenArtifact(input.source, input.fileName, lex.tokens, lex.diagnostics),
    'lex',
    input.source,
    input.fileName,
  );
  const parser = runFlintSelfHostedParserStage(input, mode, options);
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
    outputHash: hashFlintSelfHostedStagePayload(tokenArtifact),
    expectedOutputHash: hashFlintSelfHostedStagePayload(tokenArtifact),
    artifact: tokenArtifact,
    ...((result as { readonly trace?: FlintTraceReport }).trace === undefined
      ? {}
      : { trace: (result as { readonly trace: FlintTraceReport }).trace }),
    stageReports: [parser],
  };
}

function runFlintSelfHostedParserStage(
  input: Pick<FlintCompileInput, 'source' | 'fileName' | 'compilerVersion' | 'requestedCapabilities'>,
  mode: FlintVmExecutionMode,
  options: FlintSelfHostedRunOptions = {},
): FlintSelfHostedStageReport {
  const executor = createFlintVmExecutor({ compilerVersion: input.compilerVersion, jitThreshold: 1 });
  const sourceHash = hashFlintSelfHostedSourceIdentity(input.source, input.fileName);
  const module = toVmModule(createFlintParserStageVmModule(sourceHash, options.parserStageVmModuleOptions));
  const argument = toVmValue(encodeFlintLexStageSource(input.source));
  const defaultMaxSteps = Math.max(1_000_000, input.source.length * 256);
  const execOptions = {
    mode,
    maxSteps: Math.min(defaultMaxSteps, Math.max(1, Math.trunc(options.maxSteps ?? defaultMaxSteps))),
  } as const;
  const result =
    mode === 'aot'
      ? executeFlintVmAotArtifact(
          createFlintVmAotArtifact(module, input.compilerVersion),
          FLINT_PARSER_STAGE_ENTRY,
          [argument],
          execOptions,
        )
      : executor.execute(module, FLINT_PARSER_STAGE_ENTRY, [argument], execOptions);
  const parserFingerprint = readFingerprint(result.value, 'parse');
  const expectedParserFingerprint = computeFlintParserStageFingerprint(input.source);
  const parsed = parseFlint(input.source, input.fileName);
  const parserArtifact =
    parsed.module === undefined
      ? undefined
      : validateFlintSelfHostedStageArtifact(
          createFlintSelfHostedParserArtifact(input.source, input.fileName, parsed.module, parsed.diagnostics),
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
    inputHash: hashFlintSelfHostedSourceIdentity(input.source, input.fileName),
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
function toVmModule(module: FlintSelfHostedVmModule): FlintVmModule {
  return module as FlintVmModule;
}

function toVmValue(value: FlintSelfHostedVmValue): FlintVmValue {
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

function readFingerprint(value: FlintVmValue, stage: 'lex' | 'parse'): number {
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
export function runFlintSelfHostedCompiler(
  input: FlintCompileInput,
  mode: FlintVmExecutionMode,
  options: FlintSelfHostedRunOptions = {},
): FlintSelfHostedVmRun {
  const compilation = prepareFlintSelfHostedCompilation(input);
  const report = runFlintSelfHostedLexStage(input, mode, options);
  const aot =
    mode === 'aot' ? createFlintVmAotArtifact(toVmModule(compilation.vmModule), input.compilerVersion) : undefined;
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
