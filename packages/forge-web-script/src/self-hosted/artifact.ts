import type {
  ForgeWebScriptDiagnostic,
  ForgeWebScriptDiagnosticPhase,
  ForgeWebScriptDiagnosticSeverity,
} from '../diagnostics.js';

export type ForgeWebScriptSelfHostedCompilerStage =
  'lex' | 'parse' | 'check' | 'lower' | 'optimize' | 'link' | 'manifest' | 'emit';

export const FORGE_WEB_SCRIPT_SELF_HOSTED_STAGE_ARTIFACT_FORMAT = 'forge-web-script-self-hosted-stage' as const;
export const FORGE_WEB_SCRIPT_SELF_HOSTED_STAGE_ARTIFACT_VERSION = '1.0' as const;
export const FORGE_WEB_SCRIPT_SELF_HOSTED_DIAGNOSTIC_VERSION = '1.0' as const;

export const FORGE_WEB_SCRIPT_SELF_HOSTED_STAGE_SCHEMA_VERSIONS: Readonly<
  Record<ForgeWebScriptSelfHostedCompilerStage, string>
> = {
  lex: 'lex-1.0',
  parse: 'parse-1.0',
  check: 'check-1.0',
  lower: 'lower-1.0',
  optimize: 'optimize-1.0',
  link: 'link-1.0',
  manifest: 'manifest-1.0',
  emit: 'emit-1.0',
};

export interface ForgeWebScriptSelfHostedStageArtifact {
  readonly format: typeof FORGE_WEB_SCRIPT_SELF_HOSTED_STAGE_ARTIFACT_FORMAT;
  readonly version: typeof FORGE_WEB_SCRIPT_SELF_HOSTED_STAGE_ARTIFACT_VERSION;
  readonly stage: ForgeWebScriptSelfHostedCompilerStage;
  readonly schemaVersion: string;
  /** Hash of the source identity, including the file name. */
  readonly sourceHash: string;
  readonly fileName: string;
  readonly graphHash?: string;
  readonly payload: Uint8Array;
  readonly diagnosticPayload?: Uint8Array;
}

export interface ForgeWebScriptSelfHostedStageArtifactIdentity {
  readonly sourceHash: string;
  readonly fileName: string;
  readonly graphHash?: string;
}

export interface ForgeWebScriptSelfHostedStageArtifactDecodeOptions {
  readonly expectedStage?: ForgeWebScriptSelfHostedCompilerStage;
  readonly expectedSchemaVersion?: string;
  readonly expectedIdentity?: Partial<ForgeWebScriptSelfHostedStageArtifactIdentity>;
  readonly maxPayloadBytes?: number;
}

const stageOrder: readonly ForgeWebScriptSelfHostedCompilerStage[] = [
  'lex',
  'parse',
  'check',
  'lower',
  'optimize',
  'link',
  'manifest',
  'emit',
];
const stageSet = new Set<string>(stageOrder);
const diagnosticPhases = new Set<ForgeWebScriptDiagnosticPhase>([
  'lex',
  'parse',
  'type-check',
  'abi',
  'graph',
  'link',
  'emit',
]);
const diagnosticSeverities = new Set<ForgeWebScriptDiagnosticSeverity>(['error', 'warning', 'info']);
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8', { fatal: true });
const artifactMagic = new Uint8Array([0x46, 0x57, 0x53, 0x41]);
const diagnosticMagic = new Uint8Array([0x46, 0x57, 0x44, 0x47]);
const defaultMaxPayloadBytes = 64 * 1024 * 1024;

function invalid(message: string): never {
  throw new Error(`Invalid Forge Web Script self-hosted artifact: ${message}`);
}

function assertString(value: string, name: string): void {
  if (value.length === 0) invalid(`${name} must not be empty`);
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalDiagnosticOrder(left: ForgeWebScriptDiagnostic, right: ForgeWebScriptDiagnostic): number {
  return (
    compareStrings(left.fileName, right.fileName) ||
    left.span.start - right.span.start ||
    left.span.end - right.span.end ||
    compareStrings(left.phase, right.phase) ||
    compareStrings(left.code, right.code) ||
    compareStrings(left.severity, right.severity) ||
    compareStrings(left.message, right.message) ||
    compareStrings(left.hint ?? '', right.hint ?? '')
  );
}

function checkSpan(span: ForgeWebScriptDiagnostic['span']): void {
  for (const [name, value] of Object.entries(span))
    if (!Number.isSafeInteger(value) || value < 0) invalid(`diagnostic span ${name} must be a non-negative integer`);
  if (span.end < span.start) invalid('diagnostic span end precedes start');
}

function checkDiagnostic(diagnostic: ForgeWebScriptDiagnostic): void {
  assertString(diagnostic.code, 'diagnostic code');
  assertString(diagnostic.fileName, 'diagnostic file name');
  assertString(diagnostic.message, 'diagnostic message');
  if (!diagnosticSeverities.has(diagnostic.severity)) invalid(`unknown diagnostic severity '${diagnostic.severity}'`);
  if (!diagnosticPhases.has(diagnostic.phase)) invalid(`unknown diagnostic phase '${diagnostic.phase}'`);
  checkSpan(diagnostic.span);
}

class BinaryWriter {
  readonly bytes: number[] = [];

  public u8(value: number): void {
    this.bytes.push(value & 0xff);
  }

  public u16(value: number): void {
    if (!Number.isSafeInteger(value) || value < 0 || value > 65_535) invalid('binary field exceeds u16 range');
    this.bytes.push(value & 0xff, value >>> 8);
  }

  public u32(value: number): void {
    if (!Number.isSafeInteger(value) || value < 0 || value > 4_294_967_295) invalid('binary field exceeds u32 range');
    this.bytes.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
  }

  public raw(value: Uint8Array): void {
    // Avoid `push(...value)`: spreading a large `Uint8Array` into call
    // arguments overflows the JS call stack once the payload grows past a
    // few tens of thousands of bytes (e.g. a linked multi-module FWS graph).
    for (let index = 0; index < value.length; index += 1) this.bytes.push(value[index]!);
  }

  public string(value: string): void {
    const bytes = textEncoder.encode(value);
    this.u32(bytes.byteLength);
    this.raw(bytes);
  }
}

class BinaryReader {
  readonly view: DataView;
  position = 0;
  readonly bytes: Uint8Array;

  public constructor(bytes: Uint8Array) {
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  public take(length: number): Uint8Array {
    if (!Number.isSafeInteger(length) || length < 0 || length > this.bytes.byteLength - this.position)
      invalid('truncated binary payload');
    const result = this.bytes.slice(this.position, this.position + length);
    this.position += length;
    return result;
  }

  public u8(): number {
    return this.take(1)[0]!;
  }

  public u16(): number {
    this.take(2);
    const value = this.view.getUint16(this.position - 2, true);
    return value;
  }

  public u32(): number {
    this.take(4);
    const value = this.view.getUint32(this.position - 4, true);
    return value;
  }

  public string(): string {
    try {
      return textDecoder.decode(this.take(this.u32()));
    } catch (error) {
      invalid(`invalid UTF-8 string (${error instanceof Error ? error.message : String(error)})`);
    }
  }

  public done(): void {
    if (this.position !== this.bytes.byteLength) invalid('trailing bytes after framed payload');
  }
}

function writeDiagnostic(writer: BinaryWriter, diagnostic: ForgeWebScriptDiagnostic): void {
  checkDiagnostic(diagnostic);
  writer.string(diagnostic.code);
  writer.string(diagnostic.severity);
  writer.string(diagnostic.phase);
  writer.string(diagnostic.message);
  writer.string(diagnostic.fileName);
  writer.u32(diagnostic.span.start);
  writer.u32(diagnostic.span.end);
  writer.u32(diagnostic.span.line);
  writer.u32(diagnostic.span.column);
  writer.u32(diagnostic.span.endLine);
  writer.u32(diagnostic.span.endColumn);
  writer.string(diagnostic.hint ?? '');
}

function readDiagnostic(reader: BinaryReader): ForgeWebScriptDiagnostic {
  const code = reader.string();
  const severity = reader.string();
  const phase = reader.string();
  const message = reader.string();
  const fileName = reader.string();
  const span = {
    start: reader.u32(),
    end: reader.u32(),
    line: reader.u32(),
    column: reader.u32(),
    endLine: reader.u32(),
    endColumn: reader.u32(),
  };
  const hint = reader.string();
  const diagnostic = {
    code,
    severity: severity as ForgeWebScriptDiagnosticSeverity,
    phase: phase as ForgeWebScriptDiagnosticPhase,
    message,
    fileName,
    span,
    ...(hint.length === 0 ? {} : { hint }),
  } satisfies ForgeWebScriptDiagnostic;
  checkDiagnostic(diagnostic);
  return diagnostic;
}

export function encodeForgeWebScriptSelfHostedDiagnostics(
  diagnostics: readonly ForgeWebScriptDiagnostic[],
): Uint8Array {
  const writer = new BinaryWriter();
  writer.raw(diagnosticMagic);
  writer.u8(1);
  writer.u32(diagnostics.length);
  for (const diagnostic of [...diagnostics].toSorted(canonicalDiagnosticOrder)) writeDiagnostic(writer, diagnostic);
  return new Uint8Array(writer.bytes);
}

export function decodeForgeWebScriptSelfHostedDiagnostics(bytes: Uint8Array): readonly ForgeWebScriptDiagnostic[] {
  const reader = new BinaryReader(bytes);
  if (!reader.take(diagnosticMagic.length).every((value, index) => value === diagnosticMagic[index]))
    invalid('diagnostic payload magic does not match');
  if (reader.u8() !== 1) invalid('diagnostic payload version is unsupported');
  const count = reader.u32();
  if (count > 1_000_000) invalid('diagnostic count is too large');
  const diagnostics = Array.from({ length: count }, () => readDiagnostic(reader));
  for (let index = 1; index < diagnostics.length; index += 1)
    if (canonicalDiagnosticOrder(diagnostics[index - 1]!, diagnostics[index]!) > 0)
      invalid('diagnostics are not in canonical order');
  reader.done();
  return diagnostics;
}

export function hashForgeWebScriptSelfHostedBytes(bytes: Uint8Array): string {
  let hash = 2_166_136_261;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 16_777_619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function hashForgeWebScriptSelfHostedSourceIdentity(
  source: string,
  fileName: string,
  graphHash?: string,
): string {
  const writer = new BinaryWriter();
  writer.string(source);
  writer.string(fileName);
  writer.string(graphHash ?? '');
  return hashForgeWebScriptSelfHostedBytes(new Uint8Array(writer.bytes));
}

export function createForgeWebScriptSelfHostedStageArtifact(
  stage: ForgeWebScriptSelfHostedCompilerStage,
  identity: ForgeWebScriptSelfHostedStageArtifactIdentity,
  payload: Uint8Array,
  diagnostics: readonly ForgeWebScriptDiagnostic[] = [],
): ForgeWebScriptSelfHostedStageArtifact {
  if (!stageSet.has(stage)) invalid(`unknown stage '${stage}'`);
  const schemaVersion = FORGE_WEB_SCRIPT_SELF_HOSTED_STAGE_SCHEMA_VERSIONS[stage];
  assertString(identity.sourceHash, 'source hash');
  assertString(identity.fileName, 'file name');
  const diagnosticPayload =
    diagnostics.length === 0 ? undefined : encodeForgeWebScriptSelfHostedDiagnostics(diagnostics);
  return {
    format: FORGE_WEB_SCRIPT_SELF_HOSTED_STAGE_ARTIFACT_FORMAT,
    version: FORGE_WEB_SCRIPT_SELF_HOSTED_STAGE_ARTIFACT_VERSION,
    stage,
    schemaVersion,
    sourceHash: identity.sourceHash,
    fileName: identity.fileName,
    ...(identity.graphHash === undefined ? {} : { graphHash: identity.graphHash }),
    payload: new Uint8Array(payload),
    ...(diagnosticPayload === undefined ? {} : { diagnosticPayload }),
  };
}

export function encodeForgeWebScriptSelfHostedStageArtifact(
  artifact: ForgeWebScriptSelfHostedStageArtifact,
): Uint8Array {
  if (artifact.format !== FORGE_WEB_SCRIPT_SELF_HOSTED_STAGE_ARTIFACT_FORMAT) invalid('artifact format is unsupported');
  if (artifact.version !== FORGE_WEB_SCRIPT_SELF_HOSTED_STAGE_ARTIFACT_VERSION)
    invalid('artifact version is unsupported');
  if (!stageSet.has(artifact.stage)) invalid(`unknown stage '${artifact.stage}'`);
  if (artifact.schemaVersion !== FORGE_WEB_SCRIPT_SELF_HOSTED_STAGE_SCHEMA_VERSIONS[artifact.stage])
    invalid('stage schema version does not match the stage');
  assertString(artifact.sourceHash, 'source hash');
  assertString(artifact.fileName, 'file name');
  const writer = new BinaryWriter();
  writer.raw(artifactMagic);
  writer.u8(1);
  writer.u8(stageOrder.indexOf(artifact.stage));
  writer.string(artifact.schemaVersion);
  writer.string(artifact.sourceHash);
  writer.string(artifact.fileName);
  writer.string(artifact.graphHash ?? '');
  writer.u32(artifact.payload.byteLength);
  writer.u32(artifact.diagnosticPayload?.byteLength ?? 0);
  writer.raw(artifact.payload);
  if (artifact.diagnosticPayload !== undefined) writer.raw(artifact.diagnosticPayload);
  return new Uint8Array(writer.bytes);
}

export function decodeForgeWebScriptSelfHostedStageArtifact(
  bytes: Uint8Array,
  options: ForgeWebScriptSelfHostedStageArtifactDecodeOptions = {},
): ForgeWebScriptSelfHostedStageArtifact {
  const maxPayloadBytes = options.maxPayloadBytes ?? defaultMaxPayloadBytes;
  if (!Number.isSafeInteger(maxPayloadBytes) || maxPayloadBytes < 0) invalid('maximum payload size is invalid');
  const reader = new BinaryReader(bytes);
  if (!reader.take(artifactMagic.length).every((value, index) => value === artifactMagic[index]))
    invalid('artifact magic does not match');
  if (reader.u8() !== 1) invalid('artifact framing version is unsupported');
  const stageIndex = reader.u8();
  const stage = stageOrder[stageIndex];
  if (stage === undefined) invalid(`unknown stage index '${stageIndex}'`);
  const schemaVersion = reader.string();
  const sourceHash = reader.string();
  const fileName = reader.string();
  const graphHashValue = reader.string();
  const payloadLength = reader.u32();
  const diagnosticLength = reader.u32();
  if (payloadLength > maxPayloadBytes || diagnosticLength > maxPayloadBytes)
    invalid('artifact payload exceeds configured limit');
  const payload = reader.take(payloadLength);
  const diagnosticPayload = reader.take(diagnosticLength);
  reader.done();
  if (schemaVersion !== FORGE_WEB_SCRIPT_SELF_HOSTED_STAGE_SCHEMA_VERSIONS[stage])
    invalid('stage schema version is unsupported');
  if (options.expectedStage !== undefined && stage !== options.expectedStage)
    invalid(`expected stage '${options.expectedStage}', received '${stage}'`);
  if (options.expectedSchemaVersion !== undefined && schemaVersion !== options.expectedSchemaVersion)
    invalid('stage schema version does not match the expected schema');
  const graphHash = graphHashValue.length === 0 ? undefined : graphHashValue;
  const expected = options.expectedIdentity;
  if (expected?.sourceHash !== undefined && expected.sourceHash !== sourceHash)
    invalid('source identity hash does not match');
  if (expected?.fileName !== undefined && expected.fileName !== fileName) invalid('file identity does not match');
  if (expected?.graphHash !== undefined && expected.graphHash !== graphHash)
    invalid('graph identity hash does not match');
  if (diagnosticLength > 0) decodeForgeWebScriptSelfHostedDiagnostics(diagnosticPayload);
  return {
    format: FORGE_WEB_SCRIPT_SELF_HOSTED_STAGE_ARTIFACT_FORMAT,
    version: FORGE_WEB_SCRIPT_SELF_HOSTED_STAGE_ARTIFACT_VERSION,
    stage,
    schemaVersion,
    sourceHash,
    fileName,
    ...(graphHash === undefined ? {} : { graphHash }),
    payload,
    ...(diagnosticLength === 0 ? {} : { diagnosticPayload }),
  };
}
