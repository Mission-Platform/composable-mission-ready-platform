import type {
  ForgeWebScriptExpression,
  ForgeWebScriptFunction,
  ForgeWebScriptModule,
  ForgeWebScriptParameter,
  ForgeWebScriptStatement,
  ForgeWebScriptTypeName,
} from '../ast.js';
import type { ForgeWebScriptDiagnostic, ForgeWebScriptSourceSpan } from '../diagnostics.js';
import type { ForgeWebScriptToken, ForgeWebScriptTokenKind } from '../lexer.js';
import {
  createForgeWebScriptSelfHostedStageArtifact,
  decodeForgeWebScriptSelfHostedStageArtifact,
  encodeForgeWebScriptSelfHostedStageArtifact,
  hashForgeWebScriptSelfHostedBytes,
  hashForgeWebScriptSelfHostedSourceIdentity,
  type ForgeWebScriptSelfHostedCompilerStage,
  type ForgeWebScriptSelfHostedStageArtifact,
} from './artifact.js';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8', { fatal: true });

/** Binary magic: FWST */
const tokenMagic = new Uint8Array([0x46, 0x57, 0x53, 0x54]);
/** Binary magic: FWSM */
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
] as const satisfies readonly ForgeWebScriptTokenKind[];

const tokenKindIndex = new Map<string, number>(tokenKinds.map((kind, index) => [kind, index]));

function invalid(message: string): never {
  throw new Error(`Invalid self-hosted stage payload: ${message}`);
}

class BinaryWriter {
  readonly bytes: number[] = [];

  public u8(value: number): void {
    if (!Number.isSafeInteger(value) || value < 0 || value > 255) invalid('binary field exceeds u8 range');
    this.bytes.push(value & 0xff);
  }

  public u32(value: number): void {
    if (!Number.isSafeInteger(value) || value < 0 || value > 4_294_967_295) invalid('binary field exceeds u32 range');
    this.bytes.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
  }

  public i32(value: number): void {
    // eslint-disable-next-line unicorn/prefer-math-trunc -- intentional ToInt32 framing
    const encoded = value | 0;
    this.bytes.push(encoded & 0xff, (encoded >>> 8) & 0xff, (encoded >>> 16) & 0xff, (encoded >>> 24) & 0xff);
  }

  public raw(value: Uint8Array): void {
    this.bytes.push(...value);
  }

  public string(value: string): void {
    const bytes = textEncoder.encode(value);
    this.u32(bytes.byteLength);
    this.raw(bytes);
  }

  public bool(value: boolean): void {
    this.u8(value ? 1 : 0);
  }

  public optionalString(value: string | undefined): void {
    if (value === undefined) {
      this.u8(0);
      return;
    }
    this.u8(1);
    this.string(value);
  }

  public toBytes(): Uint8Array {
    return new Uint8Array(this.bytes);
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

  public u32(): number {
    this.take(4);
    return this.view.getUint32(this.position - 4, true);
  }

  public i32(): number {
    this.take(4);
    return this.view.getInt32(this.position - 4, true);
  }

  public string(): string {
    try {
      return textDecoder.decode(this.take(this.u32()));
    } catch (error) {
      invalid(`invalid UTF-8 string (${error instanceof Error ? error.message : String(error)})`);
    }
  }

  public bool(): boolean {
    const value = this.u8();
    if (value === 0) return false;
    if (value === 1) return true;
    invalid('invalid boolean flag');
  }

  public optionalString(): string | undefined {
    const flag = this.u8();
    if (flag === 0) return undefined;
    if (flag === 1) return this.string();
    invalid('invalid optional string flag');
  }

  public done(): void {
    if (this.position !== this.bytes.byteLength) invalid('trailing bytes after framed payload');
  }
}

function writeSpan(writer: BinaryWriter, span: ForgeWebScriptSourceSpan): void {
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

function readSpan(reader: BinaryReader): ForgeWebScriptSourceSpan {
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

function writeTypeName(writer: BinaryWriter, type: ForgeWebScriptTypeName): void {
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

function readTypeName(reader: BinaryReader): ForgeWebScriptTypeName {
  const name = reader.string();
  const reference = reader.optionalString();
  const hasArguments = reader.bool();
  const typeArguments = hasArguments ? Array.from({ length: reader.u32() }, () => readTypeName(reader)) : undefined;
  const hasLength = reader.bool();
  const length = hasLength ? reader.u32() : undefined;
  const ownership = reader.optionalString() as ForgeWebScriptTypeName['ownership'] | undefined;
  const span = readSpan(reader);
  return {
    kind: 'type-name',
    name: name as ForgeWebScriptTypeName['name'],
    ...(reference === undefined ? {} : { reference }),
    ...(typeArguments === undefined ? {} : { arguments: typeArguments }),
    ...(length === undefined ? {} : { length }),
    ...(ownership === undefined ? {} : { ownership }),
    span,
  };
}

function writeParameter(writer: BinaryWriter, parameter: ForgeWebScriptParameter): void {
  writer.string(parameter.name);
  writeTypeName(writer, parameter.type);
  writeSpan(writer, parameter.span);
}

function readParameter(reader: BinaryReader): ForgeWebScriptParameter {
  return {
    kind: 'parameter',
    name: reader.string(),
    type: readTypeName(reader),
    span: readSpan(reader),
  };
}

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

function readLiteralValue(reader: BinaryReader): boolean | number | string {
  const valueKind = reader.u8();
  if (valueKind === 1) return reader.string();
  if (valueKind === 2) return reader.bool();
  if (valueKind === 3) return Number(reader.string());
  invalid('unsupported literal value kind');
}

function writePattern(writer: BinaryWriter, pattern: import('../ast.js').ForgeWebScriptPattern): void {
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

function readPattern(reader: BinaryReader): import('../ast.js').ForgeWebScriptPattern {
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
  invalid(`unsupported pattern kind '${kind}'`);
}

function writeExpression(writer: BinaryWriter, expression: ForgeWebScriptExpression): void {
  writer.string(expression.kind);
  switch (expression.kind) {
    case 'literal': {
      writer.string(expression.type);
      writeLiteralValue(writer, expression.value);
      writeSpan(writer, expression.span);
      return;
    }
    case 'identifier': {
      writer.string(expression.name);
      writeSpan(writer, expression.span);
      return;
    }
    case 'call': {
      writer.string(expression.callee);
      writer.u32(expression.arguments.length);
      for (const argument of expression.arguments) writeExpression(writer, argument);
      writeSpan(writer, expression.span);
      return;
    }
    case 'binary': {
      writer.string(expression.operator);
      writeExpression(writer, expression.left);
      writeExpression(writer, expression.right);
      writeSpan(writer, expression.span);
      return;
    }
    case 'unary': {
      writer.string(expression.operator);
      writeExpression(writer, expression.operand);
      writeSpan(writer, expression.span);
      return;
    }
    case 'function-value': {
      writer.string(expression.name);
      writeSpan(writer, expression.span);
      return;
    }
    case 'struct-value': {
      writeTypeName(writer, expression.type);
      const fields = Object.entries(expression.fields).toSorted(([left], [right]) => left.localeCompare(right));
      writer.u32(fields.length);
      for (const [name, value] of fields) {
        writer.string(name);
        writeExpression(writer, value);
      }
      writeSpan(writer, expression.span);
      return;
    }
    case 'enum-value': {
      writeTypeName(writer, expression.type);
      writer.string(expression.variant);
      writer.u32(expression.arguments.length);
      for (const argument of expression.arguments) writeExpression(writer, argument);
      writeSpan(writer, expression.span);
      return;
    }
    case 'array-literal':
    case 'vector-literal': {
      writer.u32(expression.elements.length);
      for (const element of expression.elements) writeExpression(writer, element);
      writeTypeName(writer, expression.type);
      writeSpan(writer, expression.span);
      return;
    }
    case 'index': {
      writeExpression(writer, expression.receiver);
      writeExpression(writer, expression.index);
      writeSpan(writer, expression.span);
      return;
    }
    case 'match': {
      writeExpression(writer, expression.value);
      writer.u32(expression.arms.length);
      for (const arm of expression.arms) {
        writePattern(writer, arm.pattern);
        writeExpression(writer, arm.value);
        writeSpan(writer, arm.span);
      }
      writeSpan(writer, expression.span);
      return;
    }
    default: {
      invalid(`unsupported expression kind`);
    }
  }
}

function readExpression(reader: BinaryReader): ForgeWebScriptExpression {
  const kind = reader.string();
  switch (kind) {
    case 'literal': {
      const type = reader.string() as Extract<ForgeWebScriptExpression, { kind: 'literal' }>['type'];
      return { kind: 'literal', type, value: readLiteralValue(reader), span: readSpan(reader) };
    }
    case 'identifier': {
      return { kind: 'identifier', name: reader.string(), span: readSpan(reader) };
    }
    case 'call': {
      const callee = reader.string();
      const args = Array.from({ length: reader.u32() }, () => readExpression(reader));
      return { kind: 'call', callee, arguments: args, span: readSpan(reader) };
    }
    case 'binary': {
      const operator = reader.string() as Extract<ForgeWebScriptExpression, { kind: 'binary' }>['operator'];
      const left = readExpression(reader);
      const right = readExpression(reader);
      return { kind: 'binary', operator, left, right, span: readSpan(reader) };
    }
    case 'unary': {
      const operator = reader.string() as Extract<ForgeWebScriptExpression, { kind: 'unary' }>['operator'];
      const operand = readExpression(reader);
      return { kind: 'unary', operator, operand, span: readSpan(reader) };
    }
    case 'function-value': {
      return { kind: 'function-value', name: reader.string(), span: readSpan(reader) };
    }
    case 'struct-value': {
      const type = readTypeName(reader);
      const fieldCount = reader.u32();
      const fields: Record<string, ForgeWebScriptExpression> = {};
      for (let index = 0; index < fieldCount; index += 1) {
        const name = reader.string();
        fields[name] = readExpression(reader);
      }
      return { kind: 'struct-value', type, fields, span: readSpan(reader) };
    }
    case 'enum-value': {
      const type = readTypeName(reader);
      const variant = reader.string();
      const args = Array.from({ length: reader.u32() }, () => readExpression(reader));
      return { kind: 'enum-value', type, variant, arguments: args, span: readSpan(reader) };
    }
    case 'array-literal':
    case 'vector-literal': {
      const elements = Array.from({ length: reader.u32() }, () => readExpression(reader));
      const type = readTypeName(reader);
      return { kind, elements, type, span: readSpan(reader) };
    }
    case 'index': {
      const receiver = readExpression(reader);
      const index = readExpression(reader);
      return { kind: 'index', receiver, index, span: readSpan(reader) };
    }
    case 'match': {
      const value = readExpression(reader);
      const arms = Array.from({ length: reader.u32() }, () => ({
        kind: 'match-arm' as const,
        pattern: readPattern(reader),
        value: readExpression(reader),
        span: readSpan(reader),
      }));
      return { kind: 'match', value, arms, span: readSpan(reader) };
    }
    default:
      invalid(`unsupported expression kind '${kind}'`);
  }
}

function writeStatement(writer: BinaryWriter, statement: ForgeWebScriptStatement): void {
  writer.string(statement.kind);
  switch (statement.kind) {
    case 'let': {
      writer.string(statement.name);
      writeTypeName(writer, statement.type);
      writeExpression(writer, statement.value);
      writeSpan(writer, statement.span);
      return;
    }
    case 'assignment': {
      writer.string(statement.name);
      writeExpression(writer, statement.value);
      writer.u8(statement.index === undefined ? 0 : 1);
      if (statement.index !== undefined) writeExpression(writer, statement.index);
      writeSpan(writer, statement.span);
      return;
    }
    case 'return': {
      writer.u8(statement.value === undefined ? 0 : 1);
      if (statement.value !== undefined) writeExpression(writer, statement.value);
      writeSpan(writer, statement.span);
      return;
    }
    case 'expression-statement': {
      writeExpression(writer, statement.expression);
      writeSpan(writer, statement.span);
      return;
    }
    case 'if': {
      writeExpression(writer, statement.condition);
      writer.u32(statement.consequent.length);
      for (const entry of statement.consequent) writeStatement(writer, entry);
      writer.u8(statement.alternate === undefined ? 0 : 1);
      if (statement.alternate !== undefined) {
        writer.u32(statement.alternate.length);
        for (const entry of statement.alternate) writeStatement(writer, entry);
      }
      writer.optionalString(statement.conditionalHint);
      writeSpan(writer, statement.span);
      return;
    }
    case 'while': {
      writeExpression(writer, statement.condition);
      writer.u32(statement.body.length);
      for (const entry of statement.body) writeStatement(writer, entry);
      writeSpan(writer, statement.span);
      return;
    }
    case 'for': {
      writer.u8(statement.initializer === undefined ? 0 : 1);
      if (statement.initializer !== undefined) writeStatement(writer, statement.initializer);
      writeExpression(writer, statement.condition);
      writer.u8(statement.update === undefined ? 0 : 1);
      if (statement.update !== undefined) writeStatement(writer, statement.update);
      writer.u32(statement.body.length);
      for (const entry of statement.body) writeStatement(writer, entry);
      writeSpan(writer, statement.span);
      return;
    }
    case 'do-while': {
      writer.u32(statement.body.length);
      for (const entry of statement.body) writeStatement(writer, entry);
      writeExpression(writer, statement.condition);
      writeSpan(writer, statement.span);
      return;
    }
    case 'yield': {
      writeExpression(writer, statement.value);
      writeSpan(writer, statement.span);
      return;
    }
    case 'iterator-loop': {
      writer.string(statement.binding);
      writeExpression(writer, statement.iterator);
      writer.u32(statement.body.length);
      for (const entry of statement.body) writeStatement(writer, entry);
      writeSpan(writer, statement.span);
      return;
    }
    case 'match-statement': {
      writeExpression(writer, statement.value);
      writer.u32(statement.arms.length);
      for (const arm of statement.arms) {
        writePattern(writer, arm.pattern);
        writeExpression(writer, arm.value);
        writeSpan(writer, arm.span);
      }
      writeSpan(writer, statement.span);
      return;
    }
    case 'switch': {
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
      writer.u8(statement.defaultCase === undefined ? 0 : 1);
      if (statement.defaultCase !== undefined) {
        writer.u32(statement.defaultCase.length);
        for (const body of statement.defaultCase) writeStatement(writer, body);
      }
      writeSpan(writer, statement.span);
      return;
    }
    default:
      invalid('unsupported statement kind');
  }
}

function readStatement(reader: BinaryReader): ForgeWebScriptStatement {
  const kind = reader.string();
  switch (kind) {
    case 'let':
      return {
        kind: 'let',
        name: reader.string(),
        type: readTypeName(reader),
        value: readExpression(reader),
        span: readSpan(reader),
      };
    case 'assignment': {
      const name = reader.string();
      const value = readExpression(reader);
      const hasIndex = reader.bool();
      const index = hasIndex ? readExpression(reader) : undefined;
      return {
        kind: 'assignment',
        name,
        value,
        ...(index === undefined ? {} : { index }),
        span: readSpan(reader),
      };
    }
    case 'return': {
      const hasValue = reader.bool();
      const value = hasValue ? readExpression(reader) : undefined;
      return { kind: 'return', ...(value === undefined ? {} : { value }), span: readSpan(reader) };
    }
    case 'expression-statement':
      return { kind: 'expression-statement', expression: readExpression(reader), span: readSpan(reader) };
    case 'if': {
      const condition = readExpression(reader);
      const consequent = Array.from({ length: reader.u32() }, () => readStatement(reader));
      const hasAlternate = reader.bool();
      const alternate = hasAlternate ? Array.from({ length: reader.u32() }, () => readStatement(reader)) : undefined;
      const conditionalHint = reader.optionalString() as 'likely' | 'unlikely' | undefined;
      return {
        kind: 'if',
        condition,
        consequent,
        ...(alternate === undefined ? {} : { alternate }),
        ...(conditionalHint === undefined ? {} : { conditionalHint }),
        span: readSpan(reader),
      };
    }
    case 'while':
      return {
        kind: 'while',
        condition: readExpression(reader),
        body: Array.from({ length: reader.u32() }, () => readStatement(reader)),
        span: readSpan(reader),
      };
    case 'for': {
      const hasInitializer = reader.bool();
      const initializer = hasInitializer ? readStatement(reader) : undefined;
      const condition = readExpression(reader);
      const hasUpdate = reader.bool();
      const update = hasUpdate ? readStatement(reader) : undefined;
      const body = Array.from({ length: reader.u32() }, () => readStatement(reader));
      return {
        kind: 'for',
        ...(initializer === undefined ? {} : { initializer }),
        condition,
        ...(update === undefined ? {} : { update }),
        body,
        span: readSpan(reader),
      };
    }
    case 'do-while':
      return {
        kind: 'do-while',
        body: Array.from({ length: reader.u32() }, () => readStatement(reader)),
        condition: readExpression(reader),
        span: readSpan(reader),
      };
    case 'yield':
      return { kind: 'yield', value: readExpression(reader), span: readSpan(reader) };
    case 'iterator-loop':
      return {
        kind: 'iterator-loop',
        binding: reader.string(),
        iterator: readExpression(reader),
        body: Array.from({ length: reader.u32() }, () => readStatement(reader)),
        span: readSpan(reader),
      };
    case 'match-statement': {
      const value = readExpression(reader);
      const arms = Array.from({ length: reader.u32() }, () => ({
        kind: 'match-arm' as const,
        pattern: readPattern(reader),
        value: readExpression(reader),
        span: readSpan(reader),
      }));
      return { kind: 'match-statement', value, arms, span: readSpan(reader) };
    }
    case 'switch': {
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
      const hasDefault = reader.bool();
      const defaultCase = hasDefault ? Array.from({ length: reader.u32() }, () => readStatement(reader)) : undefined;
      return {
        kind: 'switch',
        value,
        cases,
        ...(defaultCase === undefined ? {} : { defaultCase }),
        span: readSpan(reader),
      };
    }
    default:
      invalid(`unsupported statement kind '${kind}'`);
  }
}

function writeFunction(writer: BinaryWriter, function_: ForgeWebScriptFunction): void {
  writer.string(function_.name);
  writer.bool(function_.exported);
  writer.u8(function_.iterable === undefined ? 0 : function_.iterable ? 1 : 2);
  writer.optionalString(function_.inlinePolicy);
  writer.u8(function_.documentation === undefined ? 0 : 1);
  if (function_.documentation !== undefined) {
    writer.string(function_.documentation.description);
    writer.u32(function_.documentation.tags.length);
    for (const tag of function_.documentation.tags) {
      writer.string(tag.name);
      writer.optionalString(tag.subject);
      writer.string(tag.text);
    }
  }
  writer.u32(function_.genericParameters.length);
  for (const generic of function_.genericParameters) {
    writer.string(generic.name);
    writer.u32(generic.bounds.length);
    for (const bound of generic.bounds) writer.string(bound);
    writeSpan(writer, generic.span);
  }
  writer.u32(function_.parameters.length);
  for (const parameter of function_.parameters) writeParameter(writer, parameter);
  writeTypeName(writer, function_.result);
  writer.u32(function_.body.length);
  for (const statement of function_.body) writeStatement(writer, statement);
  writeSpan(writer, function_.span);
}

function readFunction(reader: BinaryReader): ForgeWebScriptFunction {
  const name = reader.string();
  const exported = reader.bool();
  const iterableFlag = reader.u8();
  const iterable = iterableFlag === 0 ? undefined : iterableFlag === 1;
  if (iterableFlag > 2) invalid('invalid iterable flag');
  const inlinePolicy = reader.optionalString() as ForgeWebScriptFunction['inlinePolicy'] | undefined;
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

export function encodeForgeWebScriptSelfHostedTokens(tokens: readonly ForgeWebScriptToken[]): Uint8Array {
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

export function decodeForgeWebScriptSelfHostedTokens(bytes: Uint8Array): readonly ForgeWebScriptToken[] {
  const reader = new BinaryReader(bytes);
  if (!reader.take(tokenMagic.length).every((value, index) => value === tokenMagic[index]))
    invalid('token payload magic does not match');
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
    return { kind, text, span } satisfies ForgeWebScriptToken;
  });
  reader.done();
  return tokens;
}

export function encodeForgeWebScriptSelfHostedModule(module: ForgeWebScriptModule): Uint8Array {
  if (module.kind !== 'module') invalid('module kind must be module');
  const writer = new BinaryWriter();
  writer.raw(moduleMagic);
  writer.u8(payloadVersion);
  writer.string(module.name);
  writeSpan(writer, module.span);

  writer.u32(module.imports.length);
  for (const entry of module.imports) {
    writer.string(entry.capability);
    writer.string(entry.alias);
    writer.u32(entry.parameters.length);
    for (const parameter of entry.parameters) writeParameter(writer, parameter);
    writeTypeName(writer, entry.result);
    writeSpan(writer, entry.span);
  }

  writer.u32(module.sourceImports.length);
  for (const entry of module.sourceImports) {
    writer.string(entry.source);
    writer.string(entry.alias);
    writeSpan(writer, entry.span);
  }

  writer.u32(module.structs.length);
  for (const entry of module.structs) {
    writer.string(entry.name);
    writer.u32(entry.genericParameters.length);
    for (const generic of entry.genericParameters) {
      writer.string(generic.name);
      writer.u32(generic.bounds.length);
      for (const bound of generic.bounds) writer.string(bound);
      writeSpan(writer, generic.span);
    }
    writer.u32(entry.fields.length);
    for (const field of entry.fields) {
      writer.string(field.name);
      writeTypeName(writer, field.type);
      writer.optionalString(field.ownership);
      writeSpan(writer, field.span);
    }
    writeSpan(writer, entry.span);
  }

  writer.u32(module.enums.length);
  for (const entry of module.enums) {
    writer.string(entry.name);
    writer.bool(entry.exported);
    writer.u32(entry.genericParameters.length);
    for (const generic of entry.genericParameters) {
      writer.string(generic.name);
      writer.u32(generic.bounds.length);
      for (const bound of generic.bounds) writer.string(bound);
      writeSpan(writer, generic.span);
    }
    writer.u32(entry.variants.length);
    for (const variant of entry.variants) {
      writer.string(variant.name);
      writer.u32(variant.fields.length);
      for (const field of variant.fields) writeParameter(writer, field);
      writer.u32(variant.tag);
      writeSpan(writer, variant.span);
    }
    writeSpan(writer, entry.span);
  }

  writer.u32(module.interfaces.length);
  for (const entry of module.interfaces) {
    writer.string(entry.name);
    writer.u32(entry.genericParameters.length);
    for (const generic of entry.genericParameters) {
      writer.string(generic.name);
      writer.u32(generic.bounds.length);
      for (const bound of generic.bounds) writer.string(bound);
      writeSpan(writer, generic.span);
    }
    writer.u32(entry.functions.length);
    for (const function_ of entry.functions) {
      writer.string(function_.name);
      writer.u32(function_.genericParameters.length);
      for (const generic of function_.genericParameters) {
        writer.string(generic.name);
        writer.u32(generic.bounds.length);
        for (const bound of generic.bounds) writer.string(bound);
        writeSpan(writer, generic.span);
      }
      writer.u32(function_.parameters.length);
      for (const parameter of function_.parameters) writeParameter(writer, parameter);
      writeTypeName(writer, function_.result);
      writeSpan(writer, function_.span);
    }
    writeSpan(writer, entry.span);
  }

  writer.u32(module.functions.length);
  for (const function_ of module.functions) writeFunction(writer, function_);
  return writer.toBytes();
}

export function decodeForgeWebScriptSelfHostedModule(bytes: Uint8Array): ForgeWebScriptModule {
  const reader = new BinaryReader(bytes);
  if (!reader.take(moduleMagic.length).every((value, index) => value === moduleMagic[index]))
    invalid('module payload magic does not match');
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
      const ownership = reader.optionalString() as ForgeWebScriptTypeName['ownership'] | undefined;
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
      tag: reader.u32(),
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

function createIdentity(source: string, fileName: string, graphHash?: string) {
  return {
    sourceHash: hashForgeWebScriptSelfHostedSourceIdentity(source, fileName, graphHash),
    fileName,
    ...(graphHash ? { graphHash } : {}),
  };
}

export function createForgeWebScriptSelfHostedTokenArtifact(
  source: string,
  fileName: string,
  tokens: readonly ForgeWebScriptToken[],
  diagnostics: readonly ForgeWebScriptDiagnostic[] = [],
  graphHash?: string,
): ForgeWebScriptSelfHostedStageArtifact {
  return createForgeWebScriptSelfHostedStageArtifact(
    'lex',
    createIdentity(source, fileName, graphHash),
    encodeForgeWebScriptSelfHostedTokens(tokens),
    diagnostics,
  );
}

export function createForgeWebScriptSelfHostedParserArtifact(
  source: string,
  fileName: string,
  module: ForgeWebScriptModule,
  diagnostics: readonly ForgeWebScriptDiagnostic[] = [],
  graphHash?: string,
): ForgeWebScriptSelfHostedStageArtifact {
  return createForgeWebScriptSelfHostedStageArtifact(
    'parse',
    createIdentity(source, fileName, graphHash),
    encodeForgeWebScriptSelfHostedModule(module),
    diagnostics,
  );
}

export function validateForgeWebScriptSelfHostedStageArtifact(
  artifact: ForgeWebScriptSelfHostedStageArtifact,
  stage: ForgeWebScriptSelfHostedCompilerStage,
  source: string,
  fileName: string,
  graphHash?: string,
): ForgeWebScriptSelfHostedStageArtifact {
  const encoded = encodeForgeWebScriptSelfHostedStageArtifact(artifact);
  const decoded = decodeForgeWebScriptSelfHostedStageArtifact(encoded, {
    expectedStage: stage,
    expectedIdentity: { ...createIdentity(source, fileName, graphHash) },
  });
  if (stage === 'lex') decodeForgeWebScriptSelfHostedTokens(decoded.payload);
  if (stage === 'parse') decodeForgeWebScriptSelfHostedModule(decoded.payload);
  return decoded;
}

export function hashForgeWebScriptSelfHostedStagePayload(artifact: ForgeWebScriptSelfHostedStageArtifact): string {
  return hashForgeWebScriptSelfHostedBytes(artifact.payload);
}
