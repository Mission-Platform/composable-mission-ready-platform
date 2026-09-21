import type { FlintDiagnostic, FlintDiagnosticPhase, FlintDiagnosticSeverity } from '../diagnostics.js';

/**
 * FlintSelfHostedCompilerStage implementation.
 */
export type FlintSelfHostedCompilerStage =
  'lex' | 'parse' | 'check' | 'lower' | 'optimize' | 'link' | 'manifest' | 'emit';

export const FLINT_SELF_HOSTED_STAGE_ARTIFACT_FORMAT = 'flint-self-hosted-stage' as const;
export const FLINT_SELF_HOSTED_STAGE_ARTIFACT_VERSION = '1.0' as const;
export const FLINT_SELF_HOSTED_DIAGNOSTIC_VERSION = '1.0' as const;

export const FLINT_SELF_HOSTED_STAGE_SCHEMA_VERSIONS: Readonly<Record<FlintSelfHostedCompilerStage, string>> = {
  lex: 'lex-1.0',
  parse: 'parse-1.0',
  check: 'check-1.0',
  lower: 'lower-1.0',
  optimize: 'optimize-1.0',
  link: 'link-1.0',
  manifest: 'manifest-1.0',
  emit: 'emit-1.0',
};

/**
 * FlintSelfHostedStageArtifact implementation.
 */
export interface FlintSelfHostedStageArtifact {
  readonly format: typeof FLINT_SELF_HOSTED_STAGE_ARTIFACT_FORMAT;
  readonly version: typeof FLINT_SELF_HOSTED_STAGE_ARTIFACT_VERSION;
  readonly stage: FlintSelfHostedCompilerStage;
  readonly schemaVersion: string;
  /** Hash of the source identity, including the file name. */
  readonly sourceHash: string;
  readonly fileName: string;
  readonly graphHash?: string;
  readonly payload: Uint8Array;
  readonly diagnosticPayload?: Uint8Array;
}

/**
 * FlintSelfHostedStageArtifactIdentity implementation.
 */
export interface FlintSelfHostedStageArtifactIdentity {
  readonly sourceHash: string;
  readonly fileName: string;
  readonly graphHash?: string;
}

/**
 * FlintSelfHostedStageArtifactDecodeOptions implementation.
 */
export interface FlintSelfHostedStageArtifactDecodeOptions {
  readonly expectedStage?: FlintSelfHostedCompilerStage;
  readonly expectedSchemaVersion?: string;
  readonly expectedIdentity?: Partial<FlintSelfHostedStageArtifactIdentity>;
  readonly maxPayloadBytes?: number;
}

const stageOrder: readonly FlintSelfHostedCompilerStage[] = [
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
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8', { fatal: true });
const artifactMagic = new Uint8Array([0x46, 0x57, 0x53, 0x41]);
const diagnosticMagic = new Uint8Array([0x46, 0x57, 0x44, 0x47]);
const defaultMaxPayloadBytes = 64 * 1024 * 1024;
const diagnosticSeverities = new Set<FlintDiagnosticSeverity>(['error', 'warning', 'info']);
const diagnosticPhases = new Set<FlintDiagnosticPhase>([
  'lex',
  'parse',
  'type-check',
  'abi',
  'graph',
  'link',
  'analysis',
  'emit',
  'artifact',
]);

/**
 * invalid implementation.
 * @param message - The message parameter.
 * @returns The never result.
 */
function invalid(message: string): never {
  throw new Error(`Invalid Flint self-hosted artifact: ${message}`);
}

/**
 * assertString implementation.
 * @param value - The value parameter.
 * @param name - The name parameter.
 */
function assertString(value: string, name: string): void {
  if (value.length === 0) invalid(`${name} must not be empty`);
}

/**
 * compareStrings implementation.
 * @param left - The left parameter.
 * @param right - The right parameter.
 * @returns The number result.
 */
function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * canonicalDiagnosticMetadataOrder implementation.
 * @param left - The left parameter.
 * @param right - The right parameter.
 * @returns The number result.
 */
// skipcq: JS-R1005
function canonicalDiagnosticMetadataOrder(left: FlintDiagnostic, right: FlintDiagnostic): number {
  return (
    compareStrings(left.phase, right.phase) ||
    compareStrings(left.code, right.code) ||
    compareStrings(left.severity, right.severity) ||
    compareStrings(left.message, right.message) ||
    compareStrings(left.hint ?? '', right.hint ?? '')
  );
}

/**
 * canonicalDiagnosticOrder implementation.
 * @param left - The left parameter.
 * @param right - The right parameter.
 * @returns The number result.
 */
function canonicalDiagnosticOrder(left: FlintDiagnostic, right: FlintDiagnostic): number {
  return (
    compareStrings(left.fileName, right.fileName) ||
    left.span.start - right.span.start ||
    left.span.end - right.span.end ||
    canonicalDiagnosticMetadataOrder(left, right)
  );
}

/**
 * checkSpan implementation.
 * @param span - The span parameter.
 */
function checkSpan(span: FlintDiagnostic['span']): void {
  for (const [name, value] of Object.entries(span))
    if (!Number.isSafeInteger(value) || value < 0) invalid(`diagnostic span ${name} must be a non-negative integer`);
  if (span.end < span.start) invalid('diagnostic span end precedes start');
}

/**
 * checkDiagnostic implementation.
 * @param diagnostic - The diagnostic parameter.
 */
function checkDiagnostic(diagnostic: FlintDiagnostic): void {
  assertString(diagnostic.code, 'diagnostic code');
  assertString(diagnostic.fileName, 'diagnostic file name');
  assertString(diagnostic.message, 'diagnostic message');
  if (!diagnosticSeverities.has(diagnostic.severity)) invalid(`unknown diagnostic severity '${diagnostic.severity}'`);
  if (!diagnosticPhases.has(diagnostic.phase)) invalid(`unknown diagnostic phase '${diagnostic.phase}'`);
  checkSpan(diagnostic.span);
}

/**
 * Validates a serialized diagnostic severity string before decoding.
 *
 * @param severity - Serialized diagnostic severity value.
 * @returns The validated diagnostic severity.
 */
function readDiagnosticSeverity(severity: string): FlintDiagnosticSeverity {
  if (diagnosticSeverities.has(severity as FlintDiagnosticSeverity)) {
    return severity as FlintDiagnosticSeverity;
  }
  throw invalid(`unsupported diagnostic severity '${severity}'`);
}

/**
 * Validates a serialized diagnostic phase string before decoding.
 *
 * @param phase - Serialized diagnostic phase value.
 * @returns The validated diagnostic phase.
 */
function readDiagnosticPhase(phase: string): FlintDiagnosticPhase {
  if (diagnosticPhases.has(phase as FlintDiagnosticPhase)) {
    return phase as FlintDiagnosticPhase;
  }
  throw invalid(`unsupported diagnostic phase '${phase}'`);
}

/**
 * BinaryWriter implementation.
 */
class BinaryWriter {
  readonly bytes: number[] = [];

  /**
   * u8 implementation.
   * @param value - The value parameter.
   */
  public u8(value: number): void {
    this.bytes.push(value & 0xff);
  }

  /**
   * u16 implementation.
   * @param value - The value parameter.
   */
  public u16(value: number): void {
    if (!Number.isSafeInteger(value) || value < 0 || value > 65_535) invalid('binary field exceeds u16 range');
    this.bytes.push(value & 0xff, value >>> 8);
  }

  /**
   * u32 implementation.
   * @param value - The value parameter.
   */
  public u32(value: number): void {
    if (!Number.isSafeInteger(value) || value < 0 || value > 4_294_967_295)
      invalid(`binary field exceeds u32 range: ${String(value)}`);
    this.bytes.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
  }

  /**
   * raw implementation.
   * @param value - The value parameter.
   */
  public raw(value: Uint8Array): void {
    // Avoid `push(...value)`: spreading a large `Uint8Array` into call
    // arguments overflows the JS call stack once the payload grows past a
    // few tens of thousands of bytes (e.g. a linked multi-module FLINT graph).
    for (const byte of value) {
      this.bytes.push(byte);
    }
  }

  /**
   * string implementation.
   * @param value - The value parameter.
   */
  public string(value: string): void {
    const bytes = textEncoder.encode(value);
    this.u32(bytes.byteLength);
    this.raw(bytes);
  }
}

/**
 * BinaryReader implementation.
 */
class BinaryReader {
  readonly view: DataView;
  position = 0;
  readonly bytes: Uint8Array;

  /**
   * Anonymous implementation.
   * @param bytes - The bytes parameter.
   */
  public constructor(bytes: Uint8Array) {
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  /**
   * take implementation.
   * @param length - The length parameter.
   * @returns The Uint8Array result.
   */
  public take(length: number): Uint8Array {
    if (!Number.isSafeInteger(length) || length < 0 || length > this.bytes.byteLength - this.position)
      invalid('truncated binary payload');
    const result = this.bytes.slice(this.position, this.position + length);
    this.position += length;
    return result;
  }

  /**
   * u8 implementation.
   * @returns The number result.
   */
  public u8(): number {
    const chunk = this.take(1);
    const value = chunk[0];
    if (value === undefined) invalid('truncated binary payload');
    return value;
  }

  /**
   * u16 implementation.
   * @returns The number result.
   */
  public u16(): number {
    this.take(2);
    const value = this.view.getUint16(this.position - 2, true);
    return value;
  }

  /**
   * u32 implementation.
   * @returns The number result.
   */
  public u32(): number {
    this.take(4);
    const value = this.view.getUint32(this.position - 4, true);
    return value;
  }

  /**
   * string implementation.
   * @returns The string result.
   */
  public string(): string {
    try {
      return textDecoder.decode(this.take(this.u32()));
    } catch (error) {
      throw invalid(`invalid UTF-8 string (${error instanceof Error ? error.message : String(error)})`);
    }
  }

  /**
   * done implementation.
   */
  public done(): void {
    if (this.position !== this.bytes.byteLength) invalid('trailing bytes after framed payload');
  }
}

/**
 * writeDiagnostic implementation.
 * @param writer - The writer parameter.
 * @param diagnostic - The diagnostic parameter.
 */
function writeDiagnostic(writer: BinaryWriter, diagnostic: FlintDiagnostic): void {
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

/**
 * readDiagnostic implementation.
 * @param reader - The reader parameter.
 * @returns The FlintDiagnostic result.
 */
function readDiagnostic(reader: BinaryReader): FlintDiagnostic {
  const code = reader.string();
  const severity = readDiagnosticSeverity(reader.string());
  const phase = readDiagnosticPhase(reader.string());
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
    severity,
    phase,
    message,
    fileName,
    span,
    ...(hint.length === 0 ? {} : { hint }),
  } satisfies FlintDiagnostic;
  checkDiagnostic(diagnostic);
  return diagnostic;
}

/**
 * encodeFlintSelfHostedDiagnostics implementation.
 * @param diagnostics - The diagnostics parameter.
 * @returns The Uint8Array result.
 */
export function encodeFlintSelfHostedDiagnostics(diagnostics: readonly FlintDiagnostic[]): Uint8Array {
  const writer = new BinaryWriter();
  writer.raw(diagnosticMagic);
  writer.u8(1);
  writer.u32(diagnostics.length);
  for (const diagnostic of [...diagnostics].toSorted(canonicalDiagnosticOrder)) writeDiagnostic(writer, diagnostic);
  return new Uint8Array(writer.bytes);
}

/**
 * decodeFlintSelfHostedDiagnostics implementation.
 * @param bytes - The bytes parameter.
 * @returns The readonly FlintDiagnostic[] result.
 */
// skipcq: JS-R1005
export function decodeFlintSelfHostedDiagnostics(bytes: Uint8Array): readonly FlintDiagnostic[] {
  const reader = new BinaryReader(bytes);
  if (!reader.take(diagnosticMagic.length).every((value, index) => value === diagnosticMagic[index]))
    invalid('diagnostic payload magic does not match');
  if (reader.u8() !== 1) invalid('diagnostic payload version is unsupported');
  const count = reader.u32();
  if (count > 1_000_000) invalid('diagnostic count is too large');
  const diagnostics = Array.from({ length: count }, () => readDiagnostic(reader));
  for (let index = 1; index < diagnostics.length; index += 1) {
    const previous = diagnostics[index - 1];
    const current = diagnostics[index];
    if (previous && current && canonicalDiagnosticOrder(previous, current) > 0)
      invalid('diagnostics are not in canonical order');
  }
  reader.done();
  return diagnostics;
}

/**
 * hashFlintSelfHostedBytes implementation.
 * @param bytes - The bytes parameter.
 * @returns The string result.
 */
export function hashFlintSelfHostedBytes(bytes: Uint8Array): string {
  let hash = 2_166_136_261;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 16_777_619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * hashFlintSelfHostedSourceIdentity implementation.
 * @param source - The source parameter.
 * @param fileName - The fileName parameter.
 * @param graphHash - The graphHash parameter.
 * @returns The string result.
 */
export function hashFlintSelfHostedSourceIdentity(source: string, fileName: string, graphHash?: string): string {
  const writer = new BinaryWriter();
  writer.string(source);
  writer.string(fileName);
  writer.string(graphHash ?? '');
  return hashFlintSelfHostedBytes(new Uint8Array(writer.bytes));
}

/**
 * createFlintSelfHostedStageArtifact implementation.
 * @param stage - The stage parameter.
 * @param identity - The identity parameter.
 * @param payload - The payload parameter.
 * @param diagnostics - The diagnostics parameter.
 * @returns The FlintSelfHostedStageArtifact result.
 */
export function createFlintSelfHostedStageArtifact(
  stage: FlintSelfHostedCompilerStage,
  identity: FlintSelfHostedStageArtifactIdentity,
  payload: Uint8Array,
  diagnostics: readonly FlintDiagnostic[] = [],
): FlintSelfHostedStageArtifact {
  if (!stageSet.has(stage)) invalid(`unknown stage '${stage}'`);
  const schemaVersion = FLINT_SELF_HOSTED_STAGE_SCHEMA_VERSIONS[stage];
  assertString(identity.sourceHash, 'source hash');
  assertString(identity.fileName, 'file name');
  const diagnosticPayload = diagnostics.length === 0 ? undefined : encodeFlintSelfHostedDiagnostics(diagnostics);
  return {
    format: FLINT_SELF_HOSTED_STAGE_ARTIFACT_FORMAT,
    version: FLINT_SELF_HOSTED_STAGE_ARTIFACT_VERSION,
    stage,
    schemaVersion,
    sourceHash: identity.sourceHash,
    fileName: identity.fileName,
    ...(identity.graphHash === undefined ? {} : { graphHash: identity.graphHash }),
    payload: new Uint8Array(payload),
    ...(diagnosticPayload === undefined ? {} : { diagnosticPayload }),
  };
}

/**
 * encodeFlintSelfHostedStageArtifact implementation.
 * @param artifact - The artifact parameter.
 * @returns The Uint8Array result.
 */
// skipcq: JS-R1005
export function encodeFlintSelfHostedStageArtifact(artifact: FlintSelfHostedStageArtifact): Uint8Array {
  if (artifact.format !== FLINT_SELF_HOSTED_STAGE_ARTIFACT_FORMAT) invalid('artifact format is unsupported');
  if (artifact.version !== FLINT_SELF_HOSTED_STAGE_ARTIFACT_VERSION) invalid('artifact version is unsupported');
  if (!stageSet.has(artifact.stage)) invalid(`unknown stage '${artifact.stage}'`);
  if (artifact.schemaVersion !== FLINT_SELF_HOSTED_STAGE_SCHEMA_VERSIONS[artifact.stage])
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

/**
 * readArtifactHeader implementation.
 * @param reader - The BinaryReader parameter.
 * @param maxPayloadBytes - The maximum payload size.
 * @returns The parsed artifact header values.
 */
// skipcq: JS-R1005
function readArtifactHeader(reader: BinaryReader, maxPayloadBytes: number) {
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
  return { stage, schemaVersion, sourceHash, fileName, graphHashValue, payloadLength, diagnosticLength };
}

/**
 * checkArtifactIdentity implementation.
 * @param expected - The expected identity options.
 * @param sourceHash - The actual sourceHash.
 * @param fileName - The actual fileName.
 * @param graphHash - The actual graphHash.
 */
// skipcq: JS-R1005
function checkArtifactIdentity(
  expected: Partial<FlintSelfHostedStageArtifactIdentity> | undefined,
  sourceHash: string,
  fileName: string,
  graphHash: string | undefined,
): void {
  if (expected === undefined) return;
  if (expected.sourceHash !== undefined && expected.sourceHash !== sourceHash)
    invalid('source identity hash does not match');
  if (expected.fileName !== undefined && expected.fileName !== fileName) invalid('file identity does not match');
  if (expected.graphHash !== undefined && expected.graphHash !== graphHash)
    invalid('graph identity hash does not match');
}

/**
 * validateArtifactHeader implementation.
 * @param header - The parsed artifact header values.
 * @param options - The expected validation options.
 */
// skipcq: JS-R1005
function validateArtifactHeader(
  header: ReturnType<typeof readArtifactHeader>,
  options: FlintSelfHostedStageArtifactDecodeOptions,
): void {
  if (header.schemaVersion !== FLINT_SELF_HOSTED_STAGE_SCHEMA_VERSIONS[header.stage])
    invalid('stage schema version is unsupported');
  if (options.expectedStage !== undefined && header.stage !== options.expectedStage)
    invalid(`expected stage '${options.expectedStage}', received '${header.stage}'`);
  if (options.expectedSchemaVersion !== undefined && header.schemaVersion !== options.expectedSchemaVersion)
    invalid('stage schema version does not match the expected schema');
}

/**
 * decodeFlintSelfHostedStageArtifact implementation.
 * @param bytes - The bytes parameter.
 * @param options - The options parameter.
 * @returns The FlintSelfHostedStageArtifact result.
 */
// skipcq: JS-R1005
export function decodeFlintSelfHostedStageArtifact(
  bytes: Uint8Array,
  options: FlintSelfHostedStageArtifactDecodeOptions = {},
): FlintSelfHostedStageArtifact {
  const maxPayloadBytes = options.maxPayloadBytes ?? defaultMaxPayloadBytes;
  if (!Number.isSafeInteger(maxPayloadBytes) || maxPayloadBytes < 0) invalid('maximum payload size is invalid');
  const reader = new BinaryReader(bytes);
  const header = readArtifactHeader(reader, maxPayloadBytes);
  const payload = reader.take(header.payloadLength);
  const diagnosticPayload = reader.take(header.diagnosticLength);
  reader.done();
  validateArtifactHeader(header, options);
  const graphHash = header.graphHashValue.length === 0 ? undefined : header.graphHashValue;
  checkArtifactIdentity(options.expectedIdentity, header.sourceHash, header.fileName, graphHash);
  if (header.diagnosticLength > 0) decodeFlintSelfHostedDiagnostics(diagnosticPayload);
  return {
    format: FLINT_SELF_HOSTED_STAGE_ARTIFACT_FORMAT,
    version: FLINT_SELF_HOSTED_STAGE_ARTIFACT_VERSION,
    stage: header.stage,
    schemaVersion: header.schemaVersion,
    sourceHash: header.sourceHash,
    fileName: header.fileName,
    ...(graphHash === undefined ? {} : { graphHash }),
    payload,
    ...(header.diagnosticLength === 0 ? {} : { diagnosticPayload }),
  };
}
