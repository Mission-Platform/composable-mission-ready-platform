import {
  createFlintSelfHostedStageArtifact,
  decodeFlintSelfHostedStageArtifact,
  encodeFlintSelfHostedStageArtifact,
  hashFlintSelfHostedBytes,
  hashFlintSelfHostedSourceIdentity,
  type FlintSelfHostedCompilerStage,
  type FlintSelfHostedStageArtifact,
} from './artifact.js';

import type {
  FlintBinaryOperator,
  FlintExpression,
  FlintFunction,
  FlintModule,
  FlintParameter,
  FlintPrimitiveType,
  FlintStatement,
  FlintTypeName,
} from '../ast.js';
import type { FlintDiagnostic, FlintSourceSpan } from '../diagnostics.js';
import type { FlintToken, FlintTokenKind } from '../lexer.js';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8', { fatal: true });

/** Binary magic: FLINTT */
const tokenMagic = new Uint8Array([0x46, 0x57, 0x53, 0x54]);
/** Binary magic: FLINTM */
const moduleMagic = new Uint8Array([0x46, 0x57, 0x53, 0x4d]);
const payloadVersion = 1;

const tokenKinds = [
  'eof',
  'comment',
  'identifier',
  'number',
  'string',
  'keyword',
  'operator',
  'punctuation',
] as const satisfies readonly FlintTokenKind[];

const tokenKindIndex = new Map<string, number>(tokenKinds.map((kind, index) => [kind, index]));

/**
 * invalid implementation.
 * @param message - The message parameter.
 * @returns The never result.
 */
function invalid(message: string): never {
  throw new Error(`Invalid self-hosted stage payload: ${message}`);
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
    if (!Number.isSafeInteger(value) || value < 0 || value > 255) invalid('binary field exceeds u8 range');
    this.bytes.push(value & 0xff);
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
   * i32 implementation.
   * @param value - The value parameter.
   */
  public i32(value: number): void {
    // eslint-disable-next-line unicorn/prefer-math-trunc -- intentional ToInt32 framing
    const encoded = value | 0;
    this.bytes.push(encoded & 0xff, (encoded >>> 8) & 0xff, (encoded >>> 16) & 0xff, (encoded >>> 24) & 0xff);
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

  /**
   * bool implementation.
   * @param value - The value parameter.
   */
  public bool(value: boolean): void {
    this.u8(value ? 1 : 0);
  }

  /**
   * optionalString implementation.
   * @param value - The value parameter.
   */
  public optionalString(value: string | undefined): void {
    if (value === undefined) {
      this.u8(0);
      return;
    }
    this.u8(1);
    this.string(value);
  }

  /**
   * toBytes implementation.
   * @returns The Uint8Array result.
   */
  public toBytes(): Uint8Array {
    return new Uint8Array(this.bytes);
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
    const [value] = this.take(1);
    if (value === undefined) invalid('truncated binary payload');
    return value;
  }

  /**
   * u32 implementation.
   * @returns The number result.
   */
  public u32(): number {
    this.take(4);
    return this.view.getUint32(this.position - 4, true);
  }

  /**
   * i32 implementation.
   * @returns The number result.
   */
  public i32(): number {
    this.take(4);
    return this.view.getInt32(this.position - 4, true);
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
   * bool implementation.
   * @returns The boolean result.
   */
  public bool(): boolean {
    const value = this.u8();
    if (value === 0) return false;
    if (value === 1) return true;
    throw invalid('invalid boolean flag');
  }

  /**
   * optionalString implementation.
   * @returns The string | undefined result.
   */
  public optionalString(): string | undefined {
    const flag = this.u8();
    if (flag === 0) return undefined;
    if (flag === 1) return this.string();
    throw invalid('invalid optional string flag');
  }

  /**
   * done implementation.
   */
  public done(): void {
    if (this.position !== this.bytes.byteLength) invalid('trailing bytes after framed payload');
  }
}

/**
 * writeSpan implementation.
 * @param writer - The writer parameter.
 * @param span - The span parameter.
 */
function writeSpan(writer: BinaryWriter, span: FlintSourceSpan): void {
  for (const [name, value] of Object.entries(span))
    if (!Number.isSafeInteger(value) || value < 0) invalid(`span ${name} must be a non-negative integer`);
  if (span.end < span.start) invalid('span end precedes start');
  writer.u32(span.start);
  writer.u32(span.end);
  writer.u32(span.line);
  writer.u32(span.column);
  writer.u32(span.endLine);
  writer.u32(span.endColumn);
}

/**
 * readSpan implementation.
 * @param reader - The reader parameter.
 * @returns The FlintSourceSpan result.
 */
function readSpan(reader: BinaryReader): FlintSourceSpan {
  const span = {
    start: reader.u32(),
    end: reader.u32(),
    line: reader.u32(),
    column: reader.u32(),
    endLine: reader.u32(),
    endColumn: reader.u32(),
  };
  for (const [name, value] of Object.entries(span))
    if (!Number.isSafeInteger(value) || value < 0) invalid(`span ${name} must be a non-negative integer`);
  if (span.end < span.start) invalid('span end precedes start');
  return span;
}

/**
 * writeTypeName implementation.
 * @param writer - The writer parameter.
 * @param type - The type parameter.
 */
function writeTypeName(writer: BinaryWriter, type: FlintTypeName): void {
  writer.string(type.name);
  writer.optionalString(type.reference);
  writer.u8(type.arguments === undefined ? 0 : 1);
  if (type.arguments !== undefined) {
    writer.u32(type.arguments.length);
    for (const argument of type.arguments) writeTypeName(writer, argument);
  }
  if (type.length === undefined) writer.u8(0);
  else {
    writer.u8(1);
    writer.u32(type.length);
  }
  writer.optionalString(type.ownership);
  writeSpan(writer, type.span);
}

/**
 * readTypeName implementation.
 * @param reader - The reader parameter.
 * @returns The FlintTypeName result.
 */
// skipcq: JS-R1005
function readTypeName(reader: BinaryReader): FlintTypeName {
  const name = reader.string();
  const reference = reader.optionalString();
  const hasArguments = reader.bool();
  const typeArguments = hasArguments ? Array.from({ length: reader.u32() }, () => readTypeName(reader)) : undefined;
  const hasLength = reader.bool();
  const length = hasLength ? reader.u32() : undefined;
  const ownership = reader.optionalString() as FlintTypeName['ownership'] | undefined;
  const span = readSpan(reader);
  return {
    kind: 'type-name',
    name: name as FlintTypeName['name'],
    ...(reference === undefined ? {} : { reference }),
    ...(typeArguments === undefined ? {} : { arguments: typeArguments }),
    ...(length === undefined ? {} : { length }),
    ...(ownership === undefined ? {} : { ownership }),
    span,
  };
}

/**
 * writeParameter implementation.
 * @param writer - The writer parameter.
 * @param parameter - The parameter parameter.
 */
function writeParameter(writer: BinaryWriter, parameter: FlintParameter): void {
  writer.string(parameter.name);
  writeTypeName(writer, parameter.type);
  writeSpan(writer, parameter.span);
}

/**
 * readParameter implementation.
 * @param reader - The reader parameter.
 * @returns The FlintParameter result.
 */
function readParameter(reader: BinaryReader): FlintParameter {
  return {
    kind: 'parameter',
    name: reader.string(),
    type: readTypeName(reader),
    span: readSpan(reader),
  };
}

const primitiveTypes = new Set<FlintPrimitiveType>([
  'bool',
  'bytes',
  'f32',
  'f64',
  'i32',
  'i64',
  'string',
  'u32',
  'u64',
  'unit',
]);
const binaryOperators = new Set<FlintBinaryOperator>([
  '!=',
  '%',
  '&&',
  '*',
  '+',
  '-',
  '/',
  '<',
  '<=',
  '==',
  '>',
  '>=',
  '||',
]);
const unaryOperators = new Set<Extract<FlintExpression, { kind: 'unary' }>['operator']>(['!', '-']);
const inlinePolicies = new Set<NonNullable<FlintFunction['inlinePolicy']>>(['always', 'noinline']);
const conditionalHints = new Set<NonNullable<Extract<FlintStatement, { kind: 'if' }>['conditionalHint']>>([
  'likely',
  'unlikely',
]);

/**
 * Reads and validates a primitive type from the binary stream.
 *
 * @param reader - Binary stream reader.
 * @returns Decoded primitive type.
 */
function readPrimitiveType(reader: BinaryReader): FlintPrimitiveType {
  const type = reader.string();
  if (primitiveTypes.has(type as FlintPrimitiveType)) return type as FlintPrimitiveType;
  throw invalid(`unsupported primitive type '${type}'`);
}

/**
 * Reads and validates a binary operator from the binary stream.
 *
 * @param reader - Binary stream reader.
 * @returns Decoded binary operator.
 */
function readBinaryOperator(reader: BinaryReader): FlintBinaryOperator {
  const operator = reader.string();
  if (binaryOperators.has(operator as FlintBinaryOperator)) return operator as FlintBinaryOperator;
  throw invalid(`unsupported binary operator '${operator}'`);
}

/**
 * Reads and validates a unary operator from the binary stream.
 *
 * @param reader - Binary stream reader.
 * @returns Decoded unary operator.
 */
function readUnaryOperator(reader: BinaryReader): Extract<FlintExpression, { kind: 'unary' }>['operator'] {
  const operator = reader.string();
  if (unaryOperators.has(operator as Extract<FlintExpression, { kind: 'unary' }>['operator'])) {
    return operator as Extract<FlintExpression, { kind: 'unary' }>['operator'];
  }
  throw invalid(`unsupported unary operator '${operator}'`);
}

/**
 * Reads an optional inline policy attribute from the binary stream.
 *
 * @param reader - Binary stream reader.
 * @returns Decoded inline policy or undefined if not present.
 */
function readInlinePolicy(reader: BinaryReader): FlintFunction['inlinePolicy'] | undefined {
  const inlinePolicy = reader.optionalString();
  if (inlinePolicy === undefined) return undefined;
  if (inlinePolicies.has(inlinePolicy as NonNullable<FlintFunction['inlinePolicy']>)) {
    return inlinePolicy as FlintFunction['inlinePolicy'];
  }
  throw invalid(`unsupported inline policy '${inlinePolicy}'`);
}

/**
 * Reads an optional conditional branch prediction hint from the binary stream.
 *
 * @param reader - Binary stream reader.
 * @returns Decoded conditional hint or undefined if not present.
 */
function readConditionalHint(reader: BinaryReader): Extract<FlintStatement, { kind: 'if' }>['conditionalHint'] {
  const conditionalHint = reader.optionalString();
  if (conditionalHint === undefined) return undefined;
  if (
    conditionalHints.has(conditionalHint as NonNullable<Extract<FlintStatement, { kind: 'if' }>['conditionalHint']>)
  ) {
    return conditionalHint as Extract<FlintStatement, { kind: 'if' }>['conditionalHint'];
  }
  throw invalid(`unsupported conditional hint '${conditionalHint}'`);
}

/**
 * Serializes a literal scalar value to the binary writer.
 *
 * @param writer - Binary stream writer.
 * @param value - Literal boolean, number, or string value.
 */
function writeLiteralValue(writer: BinaryWriter, value: boolean | number | string): void {
  if (typeof value === 'string') {
    writer.u8(1);
    writer.string(value);
    return;
  }
  if (typeof value === 'boolean') {
    writer.u8(2);
    writer.bool(value);
    return;
  }
  writer.u8(3);
  writer.string(String(value));
}

/**
 * Reads a literal scalar value from the binary reader.
 *
 * @param reader - Binary stream reader.
 * @returns Decoded boolean, number, or string value.
 */
function readLiteralValue(reader: BinaryReader): boolean | number | string {
  const valueKind = reader.u8();
  if (valueKind === 1) return reader.string();
  if (valueKind === 2) return reader.bool();
  if (valueKind === 3) return Number(reader.string());
  throw invalid('unsupported literal value kind');
}

/**
 * Serializes a pattern matching pattern node to the binary writer.
 *
 * @param writer - Binary stream writer.
 * @param pattern - Pattern AST node to encode.
 */
function writePattern(writer: BinaryWriter, pattern: import('../ast.js').FlintPattern): void {
  writer.string(pattern.kind);
  if (pattern.kind === 'wildcard') {
    writeSpan(writer, pattern.span);
    return;
  }
  if (pattern.kind === 'literal') {
    writeLiteralValue(writer, pattern.value);
    writeSpan(writer, pattern.span);
    return;
  }
  writer.string(pattern.name);
  writer.u32(pattern.bindings.length);
  for (const binding of pattern.bindings) writer.string(binding);
  writeSpan(writer, pattern.span);
}

/**
 * Reads a pattern matching pattern node from the binary reader.
 *
 * @param reader - Binary stream reader.
 * @returns Decoded pattern AST node.
 */
function readPattern(reader: BinaryReader): import('../ast.js').FlintPattern {
  const kind = reader.string();
  if (kind === 'wildcard') return { kind: 'wildcard', span: readSpan(reader) };
  if (kind === 'literal') return { kind: 'literal', value: readLiteralValue(reader), span: readSpan(reader) };
  if (kind === 'variant')
    return {
      kind: 'variant',
      name: reader.string(),
      bindings: Array.from({ length: reader.u32() }, () => reader.string()),
      span: readSpan(reader),
    };
  throw invalid(`unsupported pattern kind '${kind}'`);
}

/**
 * Serializes a literal expression to the binary writer.
 *
 * @param writer - Target binary writer.
 * @param expression - Literal expression node to serialize.
 */
function writeLiteralExpression(writer: BinaryWriter, expression: Extract<FlintExpression, { kind: 'literal' }>): void {
  writer.string(expression.type);
  writeLiteralValue(writer, expression.value);
  writeSpan(writer, expression.span);
}

/**
 * Reads a literal expression from the binary reader.
 *
 * @param reader - Binary stream reader.
 * @returns Decoded literal expression node.
 */
function readLiteralExpression(reader: BinaryReader): Extract<FlintExpression, { kind: 'literal' }> {
  return { kind: 'literal', type: readPrimitiveType(reader), value: readLiteralValue(reader), span: readSpan(reader) };
}

/**
 * Serializes an identifier expression to the binary writer.
 *
 * @param writer - Target binary writer.
 * @param expression - Identifier expression node to serialize.
 */
function writeIdentifierExpression(
  writer: BinaryWriter,
  expression: Extract<FlintExpression, { kind: 'identifier' }>,
): void {
  writer.string(expression.name);
  writeSpan(writer, expression.span);
}

/**
 * Reads an identifier expression from the binary reader.
 *
 * @param reader - Binary stream reader.
 * @returns Decoded identifier expression node.
 */
function readIdentifierExpression(reader: BinaryReader): Extract<FlintExpression, { kind: 'identifier' }> {
  return { kind: 'identifier', name: reader.string(), span: readSpan(reader) };
}

/**
 * Serializes a function call expression to the binary writer.
 *
 * @param writer - Target binary writer.
 * @param expression - Call expression node to serialize.
 */
function writeCallExpression(writer: BinaryWriter, expression: Extract<FlintExpression, { kind: 'call' }>): void {
  writer.string(expression.callee);
  writer.u32(expression.arguments.length);
  for (const argument of expression.arguments) writeExpression(writer, argument);
  writeSpan(writer, expression.span);
}

/**
 * Reads a function call expression from the binary reader.
 *
 * @param reader - Binary stream reader.
 * @returns Decoded call expression node.
 */
function readCallExpression(reader: BinaryReader): Extract<FlintExpression, { kind: 'call' }> {
  const callee = reader.string();
  return {
    kind: 'call',
    callee,
    arguments: Array.from({ length: reader.u32() }, () => readExpression(reader)),
    span: readSpan(reader),
  };
}

/**
 * Serializes a binary expression to the binary writer.
 *
 * @param writer - Target binary writer.
 * @param expression - Binary expression node to serialize.
 */
function writeBinaryExpression(writer: BinaryWriter, expression: Extract<FlintExpression, { kind: 'binary' }>): void {
  writer.string(expression.operator);
  writeExpression(writer, expression.left);
  writeExpression(writer, expression.right);
  writeSpan(writer, expression.span);
}

/**
 * Reads a binary expression from the binary reader.
 *
 * @param reader - Binary stream reader.
 * @returns Decoded binary expression node.
 */
function readBinaryExpression(reader: BinaryReader): Extract<FlintExpression, { kind: 'binary' }> {
  return {
    kind: 'binary',
    operator: readBinaryOperator(reader),
    left: readExpression(reader),
    right: readExpression(reader),
    span: readSpan(reader),
  };
}

/**
 * Serializes a unary expression to the binary writer.
 *
 * @param writer - Target binary writer.
 * @param expression - Unary expression node to serialize.
 */
function writeUnaryExpression(writer: BinaryWriter, expression: Extract<FlintExpression, { kind: 'unary' }>): void {
  writer.string(expression.operator);
  writeExpression(writer, expression.operand);
  writeSpan(writer, expression.span);
}

/**
 * Reads a unary expression from the binary reader.
 *
 * @param reader - Binary stream reader.
 * @returns Decoded unary expression node.
 */
function readUnaryExpression(reader: BinaryReader): Extract<FlintExpression, { kind: 'unary' }> {
  return {
    kind: 'unary',
    operator: readUnaryOperator(reader),
    operand: readExpression(reader),
    span: readSpan(reader),
  };
}

/**
 * Serializes a function-value reference expression to the binary writer.
 *
 * @param writer - Target binary writer.
 * @param expression - Function-value expression node to serialize.
 */
function writeFunctionValueExpression(
  writer: BinaryWriter,
  expression: Extract<FlintExpression, { kind: 'function-value' }>,
): void {
  writer.string(expression.name);
  writeSpan(writer, expression.span);
}

/**
 * Reads a function-value reference expression from the binary reader.
 *
 * @param reader - Binary stream reader.
 * @returns Decoded function-value expression node.
 */
function readFunctionValueExpression(reader: BinaryReader): Extract<FlintExpression, { kind: 'function-value' }> {
  return { kind: 'function-value', name: reader.string(), span: readSpan(reader) };
}

/**
 * Serializes a struct-value instantiation expression to the binary writer.
 *
 * @param writer - Target binary writer.
 * @param expression - Struct-value expression node to serialize.
 */
function writeStructValueExpression(
  writer: BinaryWriter,
  expression: Extract<FlintExpression, { kind: 'struct-value' }>,
): void {
  writeTypeName(writer, expression.type);
  const fields = Object.entries(expression.fields).toSorted(([left], [right]) => left.localeCompare(right));
  writer.u32(fields.length);
  for (const [name, value] of fields) {
    writer.string(name);
    writeExpression(writer, value);
  }
  writeSpan(writer, expression.span);
}

/**
 * Reads a struct-value instantiation expression from the binary reader.
 *
 * @param reader - Binary stream reader.
 * @returns Decoded struct-value expression node.
 */
function readStructValueExpression(reader: BinaryReader): Extract<FlintExpression, { kind: 'struct-value' }> {
  const type = readTypeName(reader);
  const count = reader.u32();
  const fields: Record<string, FlintExpression> = {};
  for (let index = 0; index < count; index += 1) fields[reader.string()] = readExpression(reader);
  return { kind: 'struct-value', type, fields, span: readSpan(reader) };
}

/**
 * Serializes an enum-variant constructor expression to the binary writer.
 *
 * @param writer - Target binary writer.
 * @param expression - Enum-value expression node to serialize.
 */
function writeEnumValueExpression(
  writer: BinaryWriter,
  expression: Extract<FlintExpression, { kind: 'enum-value' }>,
): void {
  writeTypeName(writer, expression.type);
  writer.string(expression.variant);
  writer.u32(expression.arguments.length);
  for (const argument of expression.arguments) writeExpression(writer, argument);
  writeSpan(writer, expression.span);
}

/**
 * Reads an enum-variant constructor expression from the binary reader.
 *
 * @param reader - Binary stream reader.
 * @returns Decoded enum-value expression node.
 */
function readEnumValueExpression(reader: BinaryReader): Extract<FlintExpression, { kind: 'enum-value' }> {
  const type = readTypeName(reader);
  return {
    kind: 'enum-value',
    type,
    variant: reader.string(),
    arguments: Array.from({ length: reader.u32() }, () => readExpression(reader)),
    span: readSpan(reader),
  };
}

/**
 * Serializes an array or vector literal expression to the binary writer.
 *
 * @param writer - Target binary writer.
 * @param expression - List literal expression node to serialize.
 */
function writeListLiteralExpression(
  writer: BinaryWriter,
  expression: Extract<FlintExpression, { kind: 'array-literal' | 'vector-literal' }>,
): void {
  writer.u32(expression.elements.length);
  for (const element of expression.elements) writeExpression(writer, element);
  writeTypeName(writer, expression.type);
  writeSpan(writer, expression.span);
}

/**
 * Reads an array or vector literal expression from the binary reader.
 *
 * @param reader - Binary stream reader.
 * @param kind - Specific list literal kind to construct.
 * @returns Decoded list literal expression node.
 */
function readListLiteralExpression(
  reader: BinaryReader,
  kind: 'array-literal' | 'vector-literal',
): Extract<FlintExpression, { kind: 'array-literal' | 'vector-literal' }> {
  const elements = Array.from({ length: reader.u32() }, () => readExpression(reader));
  return {
    kind,
    type: readTypeName(reader) satisfies Extract<
      FlintExpression,
      { kind: 'array-literal' | 'vector-literal' }
    >['type'] as Extract<FlintExpression, { kind: 'array-literal' | 'vector-literal' }>['type'],
    elements,
    span: readSpan(reader),
  };
}

/**
 * Serializes an index access expression to the binary writer.
 *
 * @param writer - Target binary writer.
 * @param expression - Index expression node to serialize.
 */
function writeIndexExpression(writer: BinaryWriter, expression: Extract<FlintExpression, { kind: 'index' }>): void {
  writeExpression(writer, expression.receiver);
  writeExpression(writer, expression.index);
  writeSpan(writer, expression.span);
}

/**
 * Reads an index access expression from the binary reader.
 *
 * @param reader - Binary stream reader.
 * @returns Decoded index expression node.
 */
function readIndexExpression(reader: BinaryReader): Extract<FlintExpression, { kind: 'index' }> {
  return { kind: 'index', receiver: readExpression(reader), index: readExpression(reader), span: readSpan(reader) };
}

/**
 * Serializes a pattern match expression to the binary writer.
 *
 * @param writer - Target binary writer.
 * @param expression - Match expression node to serialize.
 */
function writeMatchExpression(writer: BinaryWriter, expression: Extract<FlintExpression, { kind: 'match' }>): void {
  writeExpression(writer, expression.value);
  writer.u32(expression.arms.length);
  for (const arm of expression.arms) {
    writePattern(writer, arm.pattern);
    writeExpression(writer, arm.value);
    writeSpan(writer, arm.span);
  }
  writeSpan(writer, expression.span);
}

/**
 * Reads a pattern match expression from the binary reader.
 *
 * @param reader - Binary stream reader.
 * @returns Decoded match expression node.
 */
function readMatchExpression(reader: BinaryReader): Extract<FlintExpression, { kind: 'match' }> {
  const value = readExpression(reader);
  const arms = Array.from({ length: reader.u32() }, () => ({
    kind: 'match-arm' as const,
    pattern: readPattern(reader),
    value: readExpression(reader),
    span: readSpan(reader),
  }));
  return { kind: 'match', value, arms, span: readSpan(reader) };
}

const WRITE_EXPRESSION_DISPATCH = {
  literal: (writer: BinaryWriter, expression: FlintExpression) =>
    writeLiteralExpression(writer, expression as Extract<FlintExpression, { kind: 'literal' }>),
  identifier: (writer: BinaryWriter, expression: FlintExpression) =>
    writeIdentifierExpression(writer, expression as Extract<FlintExpression, { kind: 'identifier' }>),
  call: (writer: BinaryWriter, expression: FlintExpression) =>
    writeCallExpression(writer, expression as Extract<FlintExpression, { kind: 'call' }>),
  binary: (writer: BinaryWriter, expression: FlintExpression) =>
    writeBinaryExpression(writer, expression as Extract<FlintExpression, { kind: 'binary' }>),
  unary: (writer: BinaryWriter, expression: FlintExpression) =>
    writeUnaryExpression(writer, expression as Extract<FlintExpression, { kind: 'unary' }>),
  'function-value': (writer: BinaryWriter, expression: FlintExpression) =>
    writeFunctionValueExpression(writer, expression as Extract<FlintExpression, { kind: 'function-value' }>),
  'struct-value': (writer: BinaryWriter, expression: FlintExpression) =>
    writeStructValueExpression(writer, expression as Extract<FlintExpression, { kind: 'struct-value' }>),
  'enum-value': (writer: BinaryWriter, expression: FlintExpression) =>
    writeEnumValueExpression(writer, expression as Extract<FlintExpression, { kind: 'enum-value' }>),
  'array-literal': (writer: BinaryWriter, expression: FlintExpression) =>
    writeListLiteralExpression(writer, expression as Extract<FlintExpression, { kind: 'array-literal' }>),
  'vector-literal': (writer: BinaryWriter, expression: FlintExpression) =>
    writeListLiteralExpression(writer, expression as Extract<FlintExpression, { kind: 'vector-literal' }>),
  index: (writer: BinaryWriter, expression: FlintExpression) =>
    writeIndexExpression(writer, expression as Extract<FlintExpression, { kind: 'index' }>),
  match: (writer: BinaryWriter, expression: FlintExpression) =>
    writeMatchExpression(writer, expression as Extract<FlintExpression, { kind: 'match' }>),
} satisfies Record<FlintExpression['kind'], (writer: BinaryWriter, expression: FlintExpression) => void>;

/**
 * Serializes an expression node to the binary stream.
 *
 * @param writer - Target binary writer.
 * @param expression - AST expression node to serialize.
 */
function writeExpression(writer: BinaryWriter, expression: FlintExpression): void {
  writer.string(expression.kind);
  WRITE_EXPRESSION_DISPATCH[expression.kind](writer, expression);
}

const READ_EXPRESSION_DISPATCH = {
  literal: (reader: BinaryReader) => readLiteralExpression(reader),
  identifier: (reader: BinaryReader) => readIdentifierExpression(reader),
  call: (reader: BinaryReader) => readCallExpression(reader),
  binary: (reader: BinaryReader) => readBinaryExpression(reader),
  unary: (reader: BinaryReader) => readUnaryExpression(reader),
  'function-value': (reader: BinaryReader) => readFunctionValueExpression(reader),
  'struct-value': (reader: BinaryReader) => readStructValueExpression(reader),
  'enum-value': (reader: BinaryReader) => readEnumValueExpression(reader),
  'array-literal': (reader: BinaryReader) => readListLiteralExpression(reader, 'array-literal'),
  'vector-literal': (reader: BinaryReader) => readListLiteralExpression(reader, 'vector-literal'),
  index: (reader: BinaryReader) => readIndexExpression(reader),
  match: (reader: BinaryReader) => readMatchExpression(reader),
} satisfies Record<FlintExpression['kind'], (reader: BinaryReader) => FlintExpression>;

/**
 * Reads an expression node from the binary stream.
 *
 * @param reader - Binary stream reader.
 * @returns Decoded AST expression node.
 */
function readExpression(reader: BinaryReader): FlintExpression {
  const kind = reader.string() as FlintExpression['kind'];
  const dispatch = READ_EXPRESSION_DISPATCH[kind];
  if (dispatch) return dispatch(reader);
  throw invalid(`unsupported expression kind '${kind}'`);
}

/**
 * Serializes a let variable binding statement to the binary writer.
 *
 * @param writer - Target binary writer.
 * @param statement - Let statement node to serialize.
 */
function writeLetStatement(writer: BinaryWriter, statement: Extract<FlintStatement, { kind: 'let' }>): void {
  writer.string(statement.name);
  writeTypeName(writer, statement.type);
  writeExpression(writer, statement.value);
  writeSpan(writer, statement.span);
}

/**
 * Reads a let variable binding statement from the binary reader.
 *
 * @param reader - Binary stream reader.
 * @returns Decoded let statement node.
 */
function readLetStatement(reader: BinaryReader): Extract<FlintStatement, { kind: 'let' }> {
  return {
    kind: 'let',
    name: reader.string(),
    type: readTypeName(reader),
    value: readExpression(reader),
    span: readSpan(reader),
  };
}

/**
 * Serializes an assignment statement to the binary writer.
 *
 * @param writer - Target binary writer.
 * @param statement - Assignment statement node to serialize.
 */
function writeAssignmentStatement(
  writer: BinaryWriter,
  statement: Extract<FlintStatement, { kind: 'assignment' }>,
): void {
  writer.string(statement.name);
  writeExpression(writer, statement.value);
  writer.bool(statement.index !== undefined);
  if (statement.index !== undefined) writeExpression(writer, statement.index);
  writeSpan(writer, statement.span);
}

/**
 * Reads an assignment statement from the binary reader.
 *
 * @param reader - Binary stream reader.
 * @returns Decoded assignment statement node.
 */
function readAssignmentStatement(reader: BinaryReader): Extract<FlintStatement, { kind: 'assignment' }> {
  const name = reader.string();
  const value = readExpression(reader);
  const index = reader.bool() ? readExpression(reader) : undefined;
  return { kind: 'assignment', name, value, ...(index === undefined ? {} : { index }), span: readSpan(reader) };
}

/**
 * Serializes a return statement to the binary writer.
 *
 * @param writer - Target binary writer.
 * @param statement - Return statement node to serialize.
 */
function writeReturnStatement(writer: BinaryWriter, statement: Extract<FlintStatement, { kind: 'return' }>): void {
  writer.bool(statement.value !== undefined);
  if (statement.value !== undefined) writeExpression(writer, statement.value);
  writeSpan(writer, statement.span);
}

/**
 * Reads a return statement from the binary reader.
 *
 * @param reader - Binary stream reader.
 * @returns Decoded return statement node.
 */
function readReturnStatement(reader: BinaryReader): Extract<FlintStatement, { kind: 'return' }> {
  const value = reader.bool() ? readExpression(reader) : undefined;
  return { kind: 'return', ...(value === undefined ? {} : { value }), span: readSpan(reader) };
}

/**
 * Serializes an expression statement to the binary writer.
 *
 * @param writer - Target binary writer.
 * @param statement - Expression statement node to serialize.
 */
function writeExpressionStatement(
  writer: BinaryWriter,
  statement: Extract<FlintStatement, { kind: 'expression-statement' }>,
): void {
  writeExpression(writer, statement.expression);
  writeSpan(writer, statement.span);
}

/**
 * Reads an expression statement from the binary reader.
 *
 * @param reader - Binary stream reader.
 * @returns Decoded expression statement node.
 */
function readExpressionStatement(reader: BinaryReader): Extract<FlintStatement, { kind: 'expression-statement' }> {
  return { kind: 'expression-statement', expression: readExpression(reader), span: readSpan(reader) };
}

/**
 * Serializes an if-else conditional branch statement to the binary writer.
 *
 * @param writer - Target binary writer.
 * @param statement - If statement node to serialize.
 */
function writeIfStatement(writer: BinaryWriter, statement: Extract<FlintStatement, { kind: 'if' }>): void {
  writeExpression(writer, statement.condition);
  writer.u32(statement.consequent.length);
  for (const step of statement.consequent) writeStatement(writer, step);
  writer.bool(statement.alternate !== undefined);
  if (statement.alternate !== undefined) {
    writer.u32(statement.alternate.length);
    for (const step of statement.alternate) writeStatement(writer, step);
  }
  writer.optionalString(statement.conditionalHint);
  writeSpan(writer, statement.span);
}

/**
 * Reads an if-else conditional branch statement from the binary reader.
 *
 * @param reader - Binary stream reader.
 * @returns Decoded if statement node.
 */
function readIfStatement(reader: BinaryReader): Extract<FlintStatement, { kind: 'if' }> {
  const condition = readExpression(reader);
  const consequent = Array.from({ length: reader.u32() }, () => readStatement(reader));
  const alternate = reader.bool() ? Array.from({ length: reader.u32() }, () => readStatement(reader)) : undefined;
  const conditionalHint = readConditionalHint(reader);
  return {
    kind: 'if',
    condition,
    consequent,
    ...(alternate === undefined ? {} : { alternate }),
    ...(conditionalHint === undefined ? {} : { conditionalHint }),
    span: readSpan(reader),
  };
}

/**
 * Serializes a for loop statement to the binary writer.
 *
 * @param writer - Target binary writer.
 * @param statement - For statement node to serialize.
 */
function writeForStatement(writer: BinaryWriter, statement: Extract<FlintStatement, { kind: 'for' }>): void {
  writer.bool(statement.initializer !== undefined);
  if (statement.initializer !== undefined) writeStatement(writer, statement.initializer);
  writeExpression(writer, statement.condition);
  writer.bool(statement.update !== undefined);
  if (statement.update !== undefined) writeStatement(writer, statement.update);
  writer.u32(statement.body.length);
  for (const step of statement.body) writeStatement(writer, step);
  writeSpan(writer, statement.span);
}

/**
 * Reads a for loop statement from the binary reader.
 *
 * @param reader - Binary stream reader.
 * @returns Decoded for statement node.
 */
function readForStatement(reader: BinaryReader): Extract<FlintStatement, { kind: 'for' }> {
  const initializer = reader.bool() ? readStatement(reader) : undefined;
  const condition = readExpression(reader);
  const update = reader.bool() ? readStatement(reader) : undefined;
  return {
    kind: 'for',
    ...(initializer === undefined ? {} : { initializer }),
    condition,
    ...(update === undefined ? {} : { update }),
    body: Array.from({ length: reader.u32() }, () => readStatement(reader)),
    span: readSpan(reader),
  };
}

/**
 * Serializes a while loop statement to the binary writer.
 *
 * @param writer - Target binary writer.
 * @param statement - While statement node to serialize.
 */
function writeWhileStatement(writer: BinaryWriter, statement: Extract<FlintStatement, { kind: 'while' }>): void {
  writeExpression(writer, statement.condition);
  writer.u32(statement.body.length);
  for (const step of statement.body) writeStatement(writer, step);
  writeSpan(writer, statement.span);
}

/**
 * Reads a while loop statement from the binary reader.
 *
 * @param reader - Binary stream reader.
 * @returns Decoded while statement node.
 */
function readWhileStatement(reader: BinaryReader): Extract<FlintStatement, { kind: 'while' }> {
  return {
    kind: 'while',
    condition: readExpression(reader),
    body: Array.from({ length: reader.u32() }, () => readStatement(reader)),
    span: readSpan(reader),
  };
}

/**
 * Serializes a do-while loop statement to the binary writer.
 *
 * @param writer - Target binary writer.
 * @param statement - Do-while statement node to serialize.
 */
function writeDoWhileStatement(writer: BinaryWriter, statement: Extract<FlintStatement, { kind: 'do-while' }>): void {
  writer.u32(statement.body.length);
  for (const step of statement.body) writeStatement(writer, step);
  writeExpression(writer, statement.condition);
  writeSpan(writer, statement.span);
}

/**
 * Reads a do-while loop statement from the binary reader.
 *
 * @param reader - Binary stream reader.
 * @returns Decoded do-while statement node.
 */
function readDoWhileStatement(reader: BinaryReader): Extract<FlintStatement, { kind: 'do-while' }> {
  return {
    kind: 'do-while',
    body: Array.from({ length: reader.u32() }, () => readStatement(reader)),
    condition: readExpression(reader),
    span: readSpan(reader),
  };
}

/**
 * Serializes a yield statement to the binary writer.
 *
 * @param writer - Target binary writer.
 * @param statement - Yield statement node to serialize.
 */
function writeYieldStatement(writer: BinaryWriter, statement: Extract<FlintStatement, { kind: 'yield' }>): void {
  writeExpression(writer, statement.value);
  writeSpan(writer, statement.span);
}

/**
 * Reads a yield statement from the binary reader.
 *
 * @param reader - Binary stream reader.
 * @returns Decoded yield statement node.
 */
function readYieldStatement(reader: BinaryReader): Extract<FlintStatement, { kind: 'yield' }> {
  return { kind: 'yield', value: readExpression(reader), span: readSpan(reader) };
}

/**
 * Serializes an iterator-loop statement to the binary writer.
 *
 * @param writer - Target binary writer.
 * @param statement - Iterator loop statement node to serialize.
 */
function writeIteratorLoopStatement(
  writer: BinaryWriter,
  statement: Extract<FlintStatement, { kind: 'iterator-loop' }>,
): void {
  writer.string(statement.binding);
  writeExpression(writer, statement.iterator);
  writer.u32(statement.body.length);
  for (const step of statement.body) writeStatement(writer, step);
  writeSpan(writer, statement.span);
}

/**
 * Reads an iterator-loop statement from the binary reader.
 *
 * @param reader - Binary stream reader.
 * @returns Decoded iterator loop statement node.
 */
function readIteratorLoopStatement(reader: BinaryReader): Extract<FlintStatement, { kind: 'iterator-loop' }> {
  return {
    kind: 'iterator-loop',
    binding: reader.string(),
    iterator: readExpression(reader),
    body: Array.from({ length: reader.u32() }, () => readStatement(reader)),
    span: readSpan(reader),
  };
}

/**
 * Serializes a pattern match statement to the binary writer.
 *
 * @param writer - Target binary writer.
 * @param statement - Match statement node to serialize.
 */
function writeMatchStatement(
  writer: BinaryWriter,
  statement: Extract<FlintStatement, { kind: 'match-statement' }>,
): void {
  writeExpression(writer, statement.value);
  writer.u32(statement.arms.length);
  for (const arm of statement.arms) {
    writePattern(writer, arm.pattern);
    writeExpression(writer, arm.value);
    writeSpan(writer, arm.span);
  }
  writeSpan(writer, statement.span);
}

/**
 * Reads a pattern match statement from the binary reader.
 *
 * @param reader - Binary stream reader.
 * @returns Decoded match statement node.
 */
function readMatchStatement(reader: BinaryReader): Extract<FlintStatement, { kind: 'match-statement' }> {
  return {
    kind: 'match-statement',
    value: readExpression(reader),
    arms: Array.from({ length: reader.u32() }, () => ({
      kind: 'match-arm' as const,
      pattern: readPattern(reader),
      value: readExpression(reader),
      span: readSpan(reader),
    })),
    span: readSpan(reader),
  };
}

/**
 * Serializes a switch statement to the binary writer.
 *
 * @param writer - Target binary writer.
 * @param statement - Switch statement node to serialize.
 */
// skipcq: JS-R1005
function writeSwitchStatement(writer: BinaryWriter, statement: Extract<FlintStatement, { kind: 'switch' }>): void {
  writeExpression(writer, statement.value);
  writer.u32(statement.cases.length);
  for (const entry of statement.cases) {
    if (typeof entry.value === 'number') {
      writer.u8(1);
      writer.i32(entry.value);
    } else {
      writer.u8(2);
      writer.string(entry.value);
    }
    writer.u32(entry.body.length);
    for (const body of entry.body) writeStatement(writer, body);
    writeSpan(writer, entry.span);
  }
  writer.bool(statement.defaultCase !== undefined);
  if (statement.defaultCase !== undefined) {
    writer.u32(statement.defaultCase.length);
    for (const body of statement.defaultCase) writeStatement(writer, body);
  }
  writeSpan(writer, statement.span);
}

/**
 * Reads a switch statement from the binary reader.
 *
 * @param reader - Binary stream reader.
 * @returns Decoded switch statement node.
 */
function readSwitchStatement(reader: BinaryReader): Extract<FlintStatement, { kind: 'switch' }> {
  const value = readExpression(reader);
  const cases = Array.from({ length: reader.u32() }, () => {
    const valueKind = reader.u8();
    const caseValue = valueKind === 1 ? reader.i32() : reader.string();
    if (valueKind !== 1 && valueKind !== 2) invalid('invalid switch case value kind');
    return {
      kind: 'switch-case' as const,
      value: caseValue,
      body: Array.from({ length: reader.u32() }, () => readStatement(reader)),
      span: readSpan(reader),
    };
  });
  const defaultCase = reader.bool() ? Array.from({ length: reader.u32() }, () => readStatement(reader)) : undefined;
  return {
    kind: 'switch',
    value,
    cases,
    ...(defaultCase === undefined ? {} : { defaultCase }),
    span: readSpan(reader),
  };
}

const WRITE_STATEMENT_DISPATCH = {
  let: (writer: BinaryWriter, statement: FlintStatement) =>
    writeLetStatement(writer, statement as Extract<FlintStatement, { kind: 'let' }>),
  assignment: (writer: BinaryWriter, statement: FlintStatement) =>
    writeAssignmentStatement(writer, statement as Extract<FlintStatement, { kind: 'assignment' }>),
  return: (writer: BinaryWriter, statement: FlintStatement) =>
    writeReturnStatement(writer, statement as Extract<FlintStatement, { kind: 'return' }>),
  'expression-statement': (writer: BinaryWriter, statement: FlintStatement) =>
    writeExpressionStatement(writer, statement as Extract<FlintStatement, { kind: 'expression-statement' }>),
  if: (writer: BinaryWriter, statement: FlintStatement) =>
    writeIfStatement(writer, statement as Extract<FlintStatement, { kind: 'if' }>),
  while: (writer: BinaryWriter, statement: FlintStatement) =>
    writeWhileStatement(writer, statement as Extract<FlintStatement, { kind: 'while' }>),
  for: (writer: BinaryWriter, statement: FlintStatement) =>
    writeForStatement(writer, statement as Extract<FlintStatement, { kind: 'for' }>),
  'do-while': (writer: BinaryWriter, statement: FlintStatement) =>
    writeDoWhileStatement(writer, statement as Extract<FlintStatement, { kind: 'do-while' }>),
  yield: (writer: BinaryWriter, statement: FlintStatement) =>
    writeYieldStatement(writer, statement as Extract<FlintStatement, { kind: 'yield' }>),
  'iterator-loop': (writer: BinaryWriter, statement: FlintStatement) =>
    writeIteratorLoopStatement(writer, statement as Extract<FlintStatement, { kind: 'iterator-loop' }>),
  'match-statement': (writer: BinaryWriter, statement: FlintStatement) =>
    writeMatchStatement(writer, statement as Extract<FlintStatement, { kind: 'match-statement' }>),
  switch: (writer: BinaryWriter, statement: FlintStatement) =>
    writeSwitchStatement(writer, statement as Extract<FlintStatement, { kind: 'switch' }>),
} satisfies Record<FlintStatement['kind'], (writer: BinaryWriter, statement: FlintStatement) => void>;

/**
 * Serializes a statement node to the binary writer.
 *
 * @param writer - Target binary writer.
 * @param statement - AST statement node to serialize.
 */
function writeStatement(writer: BinaryWriter, statement: FlintStatement): void {
  writer.string(statement.kind);
  WRITE_STATEMENT_DISPATCH[statement.kind](writer, statement);
}

const READ_STATEMENT_DISPATCH = {
  let: (reader: BinaryReader) => readLetStatement(reader),
  assignment: (reader: BinaryReader) => readAssignmentStatement(reader),
  return: (reader: BinaryReader) => readReturnStatement(reader),
  'expression-statement': (reader: BinaryReader) => readExpressionStatement(reader),
  if: (reader: BinaryReader) => readIfStatement(reader),
  for: (reader: BinaryReader) => readForStatement(reader),
  while: (reader: BinaryReader) => readWhileStatement(reader),
  'do-while': (reader: BinaryReader) => readDoWhileStatement(reader),
  yield: (reader: BinaryReader) => readYieldStatement(reader),
  'iterator-loop': (reader: BinaryReader) => readIteratorLoopStatement(reader),
  'match-statement': (reader: BinaryReader) => readMatchStatement(reader),
  switch: (reader: BinaryReader) => readSwitchStatement(reader),
} satisfies Record<FlintStatement['kind'], (reader: BinaryReader) => FlintStatement>;

/**
 * Reads a statement node from the binary reader.
 *
 * @param reader - Binary stream reader.
 * @returns Decoded AST statement node.
 */
function readStatement(reader: BinaryReader): FlintStatement {
  const kind = reader.string() as FlintStatement['kind'];
  const dispatch = READ_STATEMENT_DISPATCH[kind];
  if (dispatch) return dispatch(reader);
  throw invalid(`unsupported statement kind '${kind}'`);
}

/**
 * Serializes function documentation comments and tags to the binary writer.
 *
 * @param writer - Target binary writer.
 * @param documentation - Documentation comment structure.
 */
function writeDocumentation(writer: BinaryWriter, documentation: FlintFunction['documentation']): void {
  writer.u8(documentation === undefined ? 0 : 1);
  if (documentation === undefined) return;
  writer.string(documentation.description);
  writer.u32(documentation.tags.length);
  for (const tag of documentation.tags) {
    writer.string(tag.name);
    writer.optionalString(tag.subject);
    writer.string(tag.text);
  }
}

/**
 * Serializes generic type parameter declarations to the binary writer.
 *
 * @param writer - Target binary writer.
 * @param genericParameters - Array of generic parameter AST nodes.
 */
function writeGenericParameters(
  writer: BinaryWriter,
  genericParameters: readonly FlintFunction['genericParameters'][number][],
): void {
  writer.u32(genericParameters.length);
  for (const generic of genericParameters) {
    writer.string(generic.name);
    writer.u32(generic.bounds.length);
    for (const bound of generic.bounds) writer.string(bound);
    writeSpan(writer, generic.span);
  }
}

/**
 * Serializes parameter list and return type signature of a function.
 *
 * @param writer - Target binary writer.
 * @param function_ - Function AST node to serialize signature for.
 */
function writeFunctionSignature(writer: BinaryWriter, function_: FlintFunction): void {
  writer.u32(function_.parameters.length);
  for (const parameter of function_.parameters) writeParameter(writer, parameter);
  writeTypeName(writer, function_.result);
}

/**
 * Serializes a full function declaration to the binary writer.
 *
 * @param writer - Target binary writer.
 * @param function_ - Function AST node to serialize.
 */
function writeFunction(writer: BinaryWriter, function_: FlintFunction): void {
  writer.string(function_.name);
  writer.bool(function_.exported);
  writer.u8(function_.iterable === undefined ? 0 : function_.iterable ? 1 : 2);
  writer.optionalString(function_.inlinePolicy);
  writeDocumentation(writer, function_.documentation);
  writeGenericParameters(writer, function_.genericParameters);
  writeFunctionSignature(writer, function_);
  writer.u32(function_.body.length);
  for (const statement of function_.body) writeStatement(writer, statement);
  writeSpan(writer, function_.span);
}

/**
 * Reads a function declaration from the binary reader.
 *
 * @param reader - Binary stream reader.
 * @returns Decoded function AST node.
 */
// skipcq: JS-R1005
function readFunction(reader: BinaryReader): FlintFunction {
  const name = reader.string();
  const exported = reader.bool();
  const iterableFlag = reader.u8();
  const iterable = iterableFlag === 0 ? undefined : iterableFlag === 1;
  if (iterableFlag > 2) invalid('invalid iterable flag');
  const inlinePolicy = readInlinePolicy(reader);
  const hasDocumentation = reader.bool();
  const documentation = hasDocumentation
    ? {
        description: reader.string(),
        tags: Array.from({ length: reader.u32() }, () => {
          const tagName = reader.string();
          const subject = reader.optionalString();
          return {
            name: tagName,
            ...(subject === undefined ? {} : { subject }),
            text: reader.string(),
          };
        }),
      }
    : undefined;
  const genericParameters = Array.from({ length: reader.u32() }, () => ({
    kind: 'generic-parameter' as const,
    name: reader.string(),
    bounds: Array.from({ length: reader.u32() }, () => reader.string()),
    span: readSpan(reader),
  }));
  const parameters = Array.from({ length: reader.u32() }, () => readParameter(reader));
  const result = readTypeName(reader);
  const body = Array.from({ length: reader.u32() }, () => readStatement(reader));
  return {
    kind: 'function',
    name,
    exported,
    ...(iterable === undefined ? {} : { iterable }),
    ...(inlinePolicy === undefined ? {} : { inlinePolicy }),
    ...(documentation === undefined ? {} : { documentation }),
    genericParameters,
    parameters,
    result,
    body,
    span: readSpan(reader),
  };
}

/**
 * Encodes a self-hosted token stream payload.
 *
 * @param tokens - Token stream to serialize.
 * @returns Binary token payload.
 */
export function encodeFlintSelfHostedTokens(tokens: readonly FlintToken[]): Uint8Array {
  const writer = new BinaryWriter();
  writer.raw(tokenMagic);
  writer.u8(payloadVersion);
  writer.u32(tokens.length);
  let previousStart = -1;
  for (const token of tokens) {
    const kind = tokenKindIndex.get(token.kind);
    if (kind === undefined) invalid(`unknown token kind '${token.kind}'`);
    if (token.span.start < previousStart) invalid('token spans are not ordered');
    previousStart = token.span.start;
    writer.u8(kind);
    writer.string(token.text);
    writeSpan(writer, token.span);
  }
  return writer.toBytes();
}

/**
 * Decodes a self-hosted token stream payload.
 *
 * @param bytes - Binary token payload.
 * @returns Decoded token stream.
 */
export function decodeFlintSelfHostedTokens(bytes: Uint8Array): readonly FlintToken[] {
  const reader = new BinaryReader(bytes);
  if (!reader.take(tokenMagic.length).every((value, index) => value === tokenMagic[index])) {
    invalid('token payload magic does not match');
  }
  if (reader.u8() !== payloadVersion) invalid('token payload version is unsupported');
  const count = reader.u32();
  if (count > 10_000_000) invalid('token count is too large');
  let previousStart = -1;
  const tokens = Array.from({ length: count }, () => {
    const kindIndex = reader.u8();
    const kind = tokenKinds[kindIndex];
    if (kind === undefined) invalid(`unknown token kind tag ${String(kindIndex)}`);
    const text = reader.string();
    const span = readSpan(reader);
    if (span.start < previousStart) invalid('token spans are not ordered');
    previousStart = span.start;
    return { kind, text, span } satisfies FlintToken;
  });
  reader.done();
  return tokens;
}

/**
 * Encodes a self-hosted parser module payload.
 *
 * @param module - Module AST to serialize.
 * @returns Binary module payload.
 */
export function encodeFlintSelfHostedModule(module: FlintModule): Uint8Array {
  if (module.kind !== 'module') invalid('module kind must be module');
  const writer = new BinaryWriter();
  writer.raw(moduleMagic);
  writer.u8(payloadVersion);
  writer.string(module.name);
  writeSpan(writer, module.span);

  encodeCapabilityImports(writer, module);
  encodeSourceImports(writer, module);
  encodeStructDeclarations(writer, module);
  encodeEnumDeclarations(writer, module);
  encodeInterfaceDeclarations(writer, module);
  encodeFunctionDeclarations(writer, module);
  return writer.toBytes();
}

/**
 * Serializes capability imports of a module.
 *
 * @param writer - Target binary writer.
 * @param module - Module AST node.
 */
function encodeCapabilityImports(writer: BinaryWriter, module: FlintModule): void {
  writer.u32(module.imports.length);
  for (const entry of module.imports) {
    writer.string(entry.capability);
    writer.string(entry.alias);
    writer.u32(entry.parameters.length);
    for (const parameter of entry.parameters) writeParameter(writer, parameter);
    writeTypeName(writer, entry.result);
    writeSpan(writer, entry.span);
  }
}

/**
 * Serializes source module imports of a module.
 *
 * @param writer - Target binary writer.
 * @param module - Module AST node.
 */
function encodeSourceImports(writer: BinaryWriter, module: FlintModule): void {
  writer.u32(module.sourceImports.length);
  for (const entry of module.sourceImports) {
    writer.string(entry.source);
    writer.string(entry.alias);
    writeSpan(writer, entry.span);
  }
}

/**
 * Serializes struct declarations of a module.
 *
 * @param writer - Target binary writer.
 * @param module - Module AST node.
 */
function encodeStructDeclarations(writer: BinaryWriter, module: FlintModule): void {
  writer.u32(module.structs.length);
  for (const entry of module.structs) {
    writer.string(entry.name);
    writeGenericParameters(writer, entry.genericParameters);
    writer.u32(entry.fields.length);
    for (const field of entry.fields) {
      writer.string(field.name);
      writeTypeName(writer, field.type);
      writer.optionalString(field.ownership);
      writeSpan(writer, field.span);
    }
    writeSpan(writer, entry.span);
  }
}

/**
 * Serializes enum declarations of a module.
 *
 * @param writer - Target binary writer.
 * @param module - Module AST node.
 */
function encodeEnumDeclarations(writer: BinaryWriter, module: FlintModule): void {
  writer.u32(module.enums.length);
  for (const entry of module.enums) {
    writer.string(entry.name);
    writer.bool(entry.exported);
    writeGenericParameters(writer, entry.genericParameters);
    writer.u32(entry.variants.length);
    for (const variant of entry.variants) {
      writer.string(variant.name);
      writer.u32(variant.fields.length);
      for (const field of variant.fields) writeParameter(writer, field);
      writer.i32(variant.tag);
      writeSpan(writer, variant.span);
    }
    writeSpan(writer, entry.span);
  }
}

/**
 * Serializes an interface function signature to the binary writer.
 *
 * @param writer - Target binary writer.
 * @param function_ - Interface function declaration node.
 */
function writeInterfaceFunction(
  writer: BinaryWriter,
  function_: FlintModule['interfaces'][number]['functions'][number],
): void {
  writer.string(function_.name);
  writeGenericParameters(writer, function_.genericParameters);
  writer.u32(function_.parameters.length);
  for (const parameter of function_.parameters) writeParameter(writer, parameter);
  writeTypeName(writer, function_.result);
  writeSpan(writer, function_.span);
}

/**
 * Serializes interface declarations of a module.
 *
 * @param writer - Target binary writer.
 * @param module - Module AST node.
 */
function encodeInterfaceDeclarations(writer: BinaryWriter, module: FlintModule): void {
  writer.u32(module.interfaces.length);
  for (const entry of module.interfaces) {
    writer.string(entry.name);
    writeGenericParameters(writer, entry.genericParameters);
    writer.u32(entry.functions.length);
    for (const function_ of entry.functions) writeInterfaceFunction(writer, function_);
    writeSpan(writer, entry.span);
  }
}

/**
 * Serializes function declarations of a module.
 *
 * @param writer - Target binary writer.
 * @param module - Module AST node.
 */
function encodeFunctionDeclarations(writer: BinaryWriter, module: FlintModule): void {
  writer.u32(module.functions.length);
  for (const function_ of module.functions) writeFunction(writer, function_);
}

/**
 * Decodes a self-hosted parser module payload.
 *
 * @param bytes - Binary module payload.
 * @returns Decoded module AST.
 */
export function decodeFlintSelfHostedModule(bytes: Uint8Array): FlintModule {
  const reader = new BinaryReader(bytes);
  if (!reader.take(moduleMagic.length).every((value, index) => value === moduleMagic[index])) {
    invalid('module payload magic does not match');
  }
  if (reader.u8() !== payloadVersion) invalid('module payload version is unsupported');
  const name = reader.string();
  if (name.length === 0) invalid('module name must not be empty');
  const span = readSpan(reader);

  const imports = Array.from({ length: reader.u32() }, () => ({
    kind: 'capability-import' as const,
    capability: reader.string(),
    alias: reader.string(),
    parameters: Array.from({ length: reader.u32() }, () => readParameter(reader)),
    result: readTypeName(reader),
    span: readSpan(reader),
  }));

  const sourceImports = Array.from({ length: reader.u32() }, () => ({
    kind: 'source-module-import' as const,
    source: reader.string(),
    alias: reader.string(),
    span: readSpan(reader),
  }));

  const structs = Array.from({ length: reader.u32() }, () => ({
    kind: 'struct' as const,
    name: reader.string(),
    genericParameters: Array.from({ length: reader.u32() }, () => ({
      kind: 'generic-parameter' as const,
      name: reader.string(),
      bounds: Array.from({ length: reader.u32() }, () => reader.string()),
      span: readSpan(reader),
    })),
    fields: Array.from({ length: reader.u32() }, () => {
      const fieldName = reader.string();
      const type = readTypeName(reader);
      const ownership = reader.optionalString() as FlintTypeName['ownership'] | undefined;
      return {
        kind: 'struct-field' as const,
        name: fieldName,
        type,
        ...(ownership === undefined ? {} : { ownership }),
        span: readSpan(reader),
      };
    }),
    immutable: true as const,
    span: readSpan(reader),
  }));

  const enums = Array.from({ length: reader.u32() }, () => ({
    kind: 'enum' as const,
    name: reader.string(),
    exported: reader.bool(),
    genericParameters: Array.from({ length: reader.u32() }, () => ({
      kind: 'generic-parameter' as const,
      name: reader.string(),
      bounds: Array.from({ length: reader.u32() }, () => reader.string()),
      span: readSpan(reader),
    })),
    variants: Array.from({ length: reader.u32() }, () => ({
      kind: 'enum-variant' as const,
      name: reader.string(),
      fields: Array.from({ length: reader.u32() }, () => readParameter(reader)),
      tag: reader.i32(),
      span: readSpan(reader),
    })),
    span: readSpan(reader),
  }));

  const interfaces = Array.from({ length: reader.u32() }, () => ({
    kind: 'interface' as const,
    name: reader.string(),
    genericParameters: Array.from({ length: reader.u32() }, () => ({
      kind: 'generic-parameter' as const,
      name: reader.string(),
      bounds: Array.from({ length: reader.u32() }, () => reader.string()),
      span: readSpan(reader),
    })),
    functions: Array.from({ length: reader.u32() }, () => ({
      kind: 'interface-function' as const,
      name: reader.string(),
      genericParameters: Array.from({ length: reader.u32() }, () => ({
        kind: 'generic-parameter' as const,
        name: reader.string(),
        bounds: Array.from({ length: reader.u32() }, () => reader.string()),
        span: readSpan(reader),
      })),
      parameters: Array.from({ length: reader.u32() }, () => readParameter(reader)),
      result: readTypeName(reader),
      span: readSpan(reader),
    })),
    span: readSpan(reader),
  }));

  const functions = Array.from({ length: reader.u32() }, () => readFunction(reader));
  reader.done();
  return {
    kind: 'module',
    name,
    imports,
    sourceImports,
    structs,
    enums,
    interfaces,
    functions,
    span,
  };
}

/**
 * Creates a stage artifact identity record for the specified source file.
 *
 * @param source - Source code text.
 * @param fileName - Canonical file path or identifier.
 * @param graphHash - Optional dependency graph hash.
 * @returns Self-hosted stage artifact identity metadata.
 */
function createIdentity(source: string, fileName: string, graphHash?: string) {
  return {
    sourceHash: hashFlintSelfHostedSourceIdentity(source, fileName, graphHash),
    fileName,
    ...(graphHash ? { graphHash } : {}),
  };
}

/**
 * createFlintSelfHostedTokenArtifact implementation.
 * @param source - The source parameter.
 * @param fileName - The fileName parameter.
 * @param tokens - The tokens parameter.
 * @param diagnostics - The diagnostics parameter.
 * @param graphHash - The graphHash parameter.
 * @returns The FlintSelfHostedStageArtifact result.
 */
export function createFlintSelfHostedTokenArtifact(
  source: string,
  fileName: string,
  tokens: readonly FlintToken[],
  diagnostics: readonly FlintDiagnostic[] = [],
  graphHash?: string,
): FlintSelfHostedStageArtifact {
  return createFlintSelfHostedStageArtifact(
    'lex',
    createIdentity(source, fileName, graphHash),
    encodeFlintSelfHostedTokens(tokens),
    diagnostics,
  );
}

/**
 * createFlintSelfHostedParserArtifact implementation.
 * @param source - The source parameter.
 * @param fileName - The fileName parameter.
 * @param module - The module parameter.
 * @param diagnostics - The diagnostics parameter.
 * @param graphHash - The graphHash parameter.
 * @returns The FlintSelfHostedStageArtifact result.
 */
export function createFlintSelfHostedParserArtifact(
  source: string,
  fileName: string,
  module: FlintModule,
  diagnostics: readonly FlintDiagnostic[] = [],
  graphHash?: string,
): FlintSelfHostedStageArtifact {
  return createFlintSelfHostedStageArtifact(
    'parse',
    createIdentity(source, fileName, graphHash),
    encodeFlintSelfHostedModule(module),
    diagnostics,
  );
}

/**
 * validateFlintSelfHostedStageArtifact implementation.
 * @param artifact - The artifact parameter.
 * @param stage - The stage parameter.
 * @param source - The source parameter.
 * @param fileName - The fileName parameter.
 * @param graphHash - The graphHash parameter.
 * @returns The FlintSelfHostedStageArtifact result.
 */
export function validateFlintSelfHostedStageArtifact(
  artifact: FlintSelfHostedStageArtifact,
  stage: FlintSelfHostedCompilerStage,
  source: string,
  fileName: string,
  graphHash?: string,
): FlintSelfHostedStageArtifact {
  const encoded = encodeFlintSelfHostedStageArtifact(artifact);
  const decoded = decodeFlintSelfHostedStageArtifact(encoded, {
    expectedStage: stage,
    expectedIdentity: { ...createIdentity(source, fileName, graphHash) },
  });
  if (stage === 'lex') decodeFlintSelfHostedTokens(decoded.payload);
  if (stage === 'parse') decodeFlintSelfHostedModule(decoded.payload);
  return decoded;
}

/**
 * hashFlintSelfHostedStagePayload implementation.
 * @param artifact - The artifact parameter.
 * @returns The string result.
 */
export function hashFlintSelfHostedStagePayload(artifact: FlintSelfHostedStageArtifact): string {
  return hashFlintSelfHostedBytes(artifact.payload);
}
