/**
 * Web IDL recursive-descent parser producing structural Web IDL ASTs.
 */

import { lexWebIdl, type WebIdlToken } from './lexer.js';

import type {
  WebIdlArgument,
  WebIdlAttribute,
  WebIdlCallback,
  WebIdlConstant,
  WebIdlDefinition,
  WebIdlDictionary,
  WebIdlDictionaryMember,
  WebIdlEnum,
  WebIdlInterface,
  WebIdlMember,
  WebIdlModule,
  WebIdlNamespace,
  WebIdlOperation,
  WebIdlType,
  WebIdlTypedef,
} from './types.js';

/**
 * Error raised while parsing malformed Web IDL source, carrying the offending token position.
 */
export class WebIdlParseError extends Error {
  public readonly line: number;
  public readonly column: number;

  /**
   * Creates a parse error annotated with its source position.
   *
   * @param message - Human-readable description of the parse failure.
   * @param line - Line number of the offending token.
   * @param column - Column number of the offending token.
   */
  public constructor(message: string, line: number, column: number) {
    super(`[WebIDL ${line}:${column}] ${message}`);
    this.name = 'WebIdlParseError';
    this.line = line;
    this.column = column;
  }
}

/**
 * Recursive-descent parser that turns a Web IDL token stream into a structural AST.
 */
export class WebIdlParser {
  private readonly tokens: readonly WebIdlToken[];
  private index = 0;

  /**
   * Creates a parser bound to a previously lexed token stream.
   *
   * @param tokens - Ordered Web IDL tokens, including a trailing `eof` token.
   */
  public constructor(tokens: readonly WebIdlToken[]) {
    this.tokens = tokens;
  }

  /**
   * Parses a single top-level definition (interface, dictionary, enum, typedef, callback, or namespace).
   *
   * @param definitions - Accumulator array that the parsed definition is pushed onto.
   * @throws {WebIdlParseError} If the current token does not start a recognized top-level definition.
   */
  private parseTopLevelDefinition(definitions: WebIdlDefinition[]): void {
    const extendedAttributes = this.parseExtendedAttributes();
    if (this.isEof()) return;

    const partial = this.match('partial');

    if (this.is('interface')) {
      this.advance();
      const mixin = this.match('mixin');
      definitions.push(this.parseInterface(extendedAttributes, partial, mixin));
    } else if (this.match('dictionary')) {
      definitions.push(this.parseDictionary(extendedAttributes, partial));
    } else if (this.match('enum')) {
      definitions.push(this.parseEnum());
    } else if (this.match('typedef')) {
      definitions.push(this.parseTypedef());
    } else if (this.match('callback')) {
      definitions.push(
        this.match('interface') ? this.parseInterface(extendedAttributes, partial, false) : this.parseCallback(),
      );
    } else if (this.match('namespace')) {
      definitions.push(this.parseNamespace());
    } else {
      const token = this.current();
      throw new WebIdlParseError(`Unexpected token '${token.text}' at top-level definition`, token.line, token.column);
    }
  }

  /**
   * Parses the full token stream into a Web IDL module AST.
   *
   * @returns The parsed module containing every top-level definition.
   * @throws {WebIdlParseError} If an unrecognized top-level construct is encountered.
   */
  public parse(): WebIdlModule {
    const definitions: WebIdlDefinition[] = [];

    while (!this.isEof()) {
      // Consume any stray semicolons
      if (this.match(';')) continue;

      const before = definitions.length;
      this.parseTopLevelDefinition(definitions);
      if (this.isEof() && definitions.length === before) break;

      this.match(';');
    }

    return { definitions };
  }

  /**
   * Reports whether the parser cursor has reached the end of the token stream.
   *
   * @returns `true` when the current token is the trailing `eof` token.
   */
  private isEof(): boolean {
    return this.current().kind === 'eof';
  }

  /**
   * Returns the token at the current cursor position.
   *
   * @returns The current token, or a synthetic `eof` token past the end of the stream.
   */
  private current(): WebIdlToken {
    return this.tokens[this.index] ?? { kind: 'eof', text: '', line: 0, column: 0 };
  }

  /**
   * Looks ahead at a token without consuming it.
   *
   * @param offset - Number of tokens ahead of the current cursor to inspect.
   * @returns The token at the offset, or a synthetic `eof` token past the end of the stream.
   */
  private peek(offset = 1): WebIdlToken {
    return this.tokens[this.index + offset] ?? { kind: 'eof', text: '', line: 0, column: 0 };
  }

  /**
   * Consumes and returns the current token, advancing the cursor.
   *
   * @returns The consumed token.
   */
  private advance(): WebIdlToken {
    const token = this.current();
    if (this.index < this.tokens.length) {
      this.index += 1;
    }
    return token;
  }

  /**
   * Reports whether the current token's text equals the given text.
   *
   * @param text - Expected token text.
   * @returns `true` when the current token text matches.
   */
  private is(text: string): boolean {
    return this.current().text === text;
  }

  /**
   * Consumes the current token if its text matches, otherwise leaves the cursor unchanged.
   *
   * @param text - Expected token text.
   * @returns `true` when the token matched and was consumed.
   */
  private match(text: string): boolean {
    if (this.is(text)) {
      this.advance();
      return true;
    }
    return false;
  }

  /**
   * Consumes the current token, asserting that its text matches the expected text.
   *
   * @param text - Required token text.
   * @returns The consumed token.
   * @throws {WebIdlParseError} If the current token text does not match.
   */
  private expect(text: string): WebIdlToken {
    const token = this.current();
    if (token.text !== text) {
      throw new WebIdlParseError(`Expected '${text}', got '${token.text}'`, token.line, token.column);
    }
    return this.advance();
  }

  /**
   * Consumes the current token, asserting that it is an identifier.
   *
   * @returns The identifier text.
   * @throws {WebIdlParseError} If the current token is not an identifier.
   */
  private expectIdentifier(): string {
    const token = this.current();
    if (token.kind !== 'identifier') {
      throw new WebIdlParseError(`Expected identifier, got '${token.text}' (${token.kind})`, token.line, token.column);
    }
    return this.advance().text;
  }

  /**
   * Parses a parenthesized list of identifiers used as an extended attribute value, e.g. `(Window, Worker)`.
   *
   * @returns The comma-joined identifier list.
   */
  private parseExtendedAttributeIdentifierList(): string {
    const values: string[] = [];
    while (!this.match(')') && !this.isEof()) {
      values.push(this.expectIdentifier());
      this.match(',');
    }
    return values.join(',');
  }

  /**
   * Consumes a balanced-parenthesis parameter list attached to an extended attribute, e.g. `Exposed(Window)`.
   *
   * @returns The trimmed parameter text, or `true` if the parameter list was empty.
   */
  private parseExtendedAttributeParameterList(): boolean | string {
    let depth = 1;
    let parameterText = '';
    while (depth > 0 && !this.isEof()) {
      const t = this.advance();
      if (t.text === '(') depth += 1;
      else if (t.text === ')') depth -= 1;
      if (depth > 0) parameterText += t.text;
    }
    return parameterText.trim() || true;
  }

  /**
   * Parses the value assigned to a single extended attribute name, covering `= value`,
   * `= (list, of, identifiers)`, and bare parameterized `(params)` forms.
   *
   * @returns The parsed attribute value.
   */
  private parseExtendedAttributeValue(): boolean | string {
    if (this.match('=')) {
      if (this.match('(')) {
        return this.parseExtendedAttributeIdentifierList();
      }
      return this.advance().text;
    }

    if (this.match('(')) {
      return this.parseExtendedAttributeParameterList();
    }

    return true;
  }

  /**
   * Parses a bracketed `[Name, Name=value, ...]` extended attribute list, if present.
   *
   * @returns The parsed extended attributes, or `undefined` when none are present.
   */
  private parseExtendedAttributes(): Record<string, boolean | string> | undefined {
    if (!this.match('[')) return undefined;

    const attributes: Record<string, boolean | string> = {};

    while (!this.match(']') && !this.isEof()) {
      const name = this.expectIdentifier();
      attributes[name] = this.parseExtendedAttributeValue();
      this.match(',');
    }

    return Object.keys(attributes).length > 0 ? attributes : undefined;
  }

  /**
   * Parses an optional `: ParentName` interface/dictionary heritage clause.
   *
   * @returns The parent name, or `undefined` when no heritage clause is present.
   */
  private parseHeritage(): string | undefined {
    return this.match(':') ? this.expectIdentifier() : undefined;
  }

  /**
   * Parses the brace-delimited member list of an interface body.
   *
   * @returns The parsed interface members, in declaration order.
   */
  private parseInterfaceMembers(): WebIdlMember[] {
    this.expect('{');
    const members: WebIdlMember[] = [];

    while (!this.match('}') && !this.isEof()) {
      if (this.match(';')) continue;

      const memberExtensionAttributes = this.parseExtendedAttributes();
      const member = this.parseInterfaceMember(memberExtensionAttributes);
      if (member !== undefined) {
        members.push(member);
      }
      this.match(';');
    }

    return members;
  }

  /**
   * Parses a Web IDL interface (or interface mixin) declaration body, after the `interface` keyword.
   *
   * @param extendedAttributes - Extended attributes collected before the declaration.
   * @param partial - Whether the interface was declared with the `partial` keyword.
   * @param mixin - Whether the interface was declared with the `mixin` keyword.
   * @returns The parsed interface AST node.
   */
  private parseInterface(
    extendedAttributes: Record<string, boolean | string> | undefined,
    partial: boolean,
    mixin: boolean,
  ): WebIdlInterface {
    const name = this.expectIdentifier();
    const parent = this.parseHeritage();
    const members = this.parseInterfaceMembers();

    return {
      kind: 'interface',
      name,
      ...(parent === undefined ? {} : { parent }),
      ...(partial ? { partial: true } : {}),
      ...(mixin ? { mixin: true } : {}),
      members,
      ...(extendedAttributes === undefined ? {} : { extendedAttributes }),
    };
  }

  /**
   * Parses an interface constant member: `const Type IDENTIFIER = value;`.
   *
   * @returns The parsed constant member.
   */
  private parseConstMember(): WebIdlConstant {
    const type = this.parseType();
    const name = this.expectIdentifier();
    this.expect('=');
    const valueToken = this.advance();
    let value: boolean | number | string = valueToken.text;
    if (valueToken.text === 'true') value = true;
    else if (valueToken.text === 'false') value = false;
    else if (!Number.isNaN(Number(valueToken.text))) value = Number(valueToken.text);

    return { kind: 'const', name, type, value };
  }

  /**
   * Determines the special operation kind (`getter`, `setter`, `deleter`, `stringifier`) at the cursor, if any.
   *
   * @returns The matched special operation kind, or `undefined` when none is present.
   */
  private parseSpecialOperationKind(): 'deleter' | 'getter' | 'setter' | 'stringifier' | undefined {
    if (this.match('getter')) return 'getter';
    if (this.match('setter')) return 'setter';
    if (this.match('deleter')) return 'deleter';
    if (this.match('stringifier')) return 'stringifier';
    return undefined;
  }

  /**
   * Parses the optional name of an operation, distinguishing named operations from anonymous special operations.
   *
   * @returns The operation name, or `undefined` for an anonymous special operation.
   */
  private parseOperationName(): string | undefined {
    if (this.current().kind === 'identifier' && (this.peek().text === '(' || !this.is('('))) {
      return this.expectIdentifier();
    }
    return undefined;
  }

  /**
   * Parses an interface attribute member: `[static] [readonly] attribute Type identifier;`.
   *
   * @param extendedAttributes - Extended attributes collected before the member.
   * @param isStatic - Whether the `static` modifier was present.
   * @param isReadonly - Whether the `readonly` modifier was present.
   * @returns The parsed attribute member.
   */
  private parseAttributeMember(
    extendedAttributes: Record<string, boolean | string> | undefined,
    isStatic: boolean,
    isReadonly: boolean,
  ): WebIdlAttribute {
    const type = this.parseType();
    const name = this.expectIdentifier();
    return {
      kind: 'attribute',
      name,
      readonly: isReadonly,
      ...(isStatic ? { static: true } : {}),
      type,
      ...(extendedAttributes === undefined ? {} : { extendedAttributes }),
    };
  }

  /**
   * Parses an interface operation member: `[static] [special] ReturnType [name] (args...);`.
   *
   * @param extendedAttributes - Extended attributes collected before the member.
   * @param isStatic - Whether the `static` modifier was present.
   * @returns The parsed operation member.
   */
  private parseOperationMember(
    extendedAttributes: Record<string, boolean | string> | undefined,
    isStatic: boolean,
  ): WebIdlOperation {
    const special = this.parseSpecialOperationKind();
    const returnType = this.parseType();
    const name = this.parseOperationName();
    const arguments_ = this.parseArguments();

    return {
      kind: 'operation',
      ...(name === undefined ? {} : { name }),
      ...(special === undefined ? {} : { special }),
      ...(isStatic ? { static: true } : {}),
      returnType,
      arguments: arguments_,
      ...(extendedAttributes === undefined ? {} : { extendedAttributes }),
    };
  }

  /**
   * Parses a single interface (or namespace) member: a constant, constructor, attribute, or operation.
   *
   * @param extendedAttributes - Extended attributes collected before the member.
   * @returns The parsed member, or `undefined` when no member could be produced.
   */
  private parseInterfaceMember(
    extendedAttributes: Record<string, boolean | string> | undefined,
  ): WebIdlMember | undefined {
    // Constant: const Type IDENTIFIER = value;
    if (this.match('const')) {
      return this.parseConstMember();
    }

    // Constructor: constructor(args...);
    if (this.is('constructor') && this.peek().text === '(') {
      this.advance();
      return { kind: 'constructor', arguments: this.parseArguments() };
    }

    const isStatic = this.match('static');
    const isReadonly = this.match('readonly');

    // Attribute: [readonly] attribute Type identifier;
    if (this.match('attribute')) {
      return this.parseAttributeMember(extendedAttributes, isStatic, isReadonly);
    }

    return this.parseOperationMember(extendedAttributes, isStatic);
  }

  /**
   * Parses a single dictionary field: `[required] Type name [= defaultValue];`.
   *
   * @returns The parsed dictionary member.
   */
  private parseDictionaryMember(): WebIdlDictionaryMember {
    const required = this.match('required');
    const type = this.parseType();
    const memberName = this.expectIdentifier();
    const defaultValue = this.match('=') ? this.parseDefaultValue() : undefined;

    return {
      name: memberName,
      type,
      ...(required ? { required: true } : {}),
      ...(defaultValue === undefined ? {} : { defaultValue }),
    };
  }

  /**
   * Parses the brace-delimited member list of a dictionary body.
   *
   * @returns The parsed dictionary members, in declaration order.
   */
  private parseDictionaryMembers(): WebIdlDictionaryMember[] {
    this.expect('{');
    const members: WebIdlDictionaryMember[] = [];

    while (!this.match('}') && !this.isEof()) {
      if (this.match(';')) continue;
      members.push(this.parseDictionaryMember());
      this.match(';');
    }

    return members;
  }

  /**
   * Parses a dictionary declaration body, after the `dictionary` keyword.
   *
   * @param extendedAttributes - Extended attributes collected before the declaration.
   * @param partial - Whether the dictionary was declared with the `partial` keyword.
   * @returns The parsed dictionary AST node.
   */
  private parseDictionary(
    extendedAttributes: Record<string, boolean | string> | undefined,
    partial: boolean,
  ): WebIdlDictionary {
    const name = this.expectIdentifier();
    const parent = this.parseHeritage();
    const members = this.parseDictionaryMembers();

    return {
      kind: 'dictionary',
      name,
      ...(parent === undefined ? {} : { parent }),
      ...(partial ? { partial: true } : {}),
      members,
      ...(extendedAttributes === undefined ? {} : { extendedAttributes }),
    };
  }

  /**
   * Parses a Web IDL enumeration declaration body, after the `enum` keyword.
   *
   * @returns The parsed enum AST node.
   * @throws {WebIdlParseError} If a non-string-literal token is found inside the enum body.
   */
  private parseEnum(): WebIdlEnum {
    const name = this.expectIdentifier();
    this.expect('{');
    const values: string[] = [];

    while (!this.match('}') && !this.isEof()) {
      const token = this.current();
      if (token.kind === 'string') {
        values.push(token.text);
        this.advance();
      } else {
        throw new WebIdlParseError(
          `Expected string literal in enum '${name}', got '${token.text}'`,
          token.line,
          token.column,
        );
      }
      this.match(',');
    }

    return {
      kind: 'enum',
      name,
      values,
    };
  }

  /**
   * Parses a Web IDL typedef declaration body, after the `typedef` keyword.
   *
   * @returns The parsed typedef AST node.
   */
  private parseTypedef(): WebIdlTypedef {
    const type = this.parseType();
    const name = this.expectIdentifier();
    this.match(';');
    return {
      kind: 'typedef',
      name,
      type,
    };
  }

  /**
   * Parses a Web IDL callback function type declaration body, after the `callback` keyword.
   *
   * @returns The parsed callback AST node.
   */
  private parseCallback(): WebIdlCallback {
    const name = this.expectIdentifier();
    this.expect('=');
    const returnType = this.parseType();
    const arguments_ = this.parseArguments();
    this.match(';');
    return {
      kind: 'callback',
      name,
      returnType,
      arguments: arguments_,
    };
  }

  /**
   * Parses a Web IDL namespace declaration body, after the `namespace` keyword.
   *
   * @returns The parsed namespace AST node.
   */
  private parseNamespace(): WebIdlNamespace {
    const name = this.expectIdentifier();
    this.expect('{');
    const members: (WebIdlAttribute | WebIdlConstant | WebIdlOperation)[] = [];

    while (!this.match('}') && !this.isEof()) {
      if (this.match(';')) continue;
      const extensionAttributes = this.parseExtendedAttributes();
      const member = this.parseInterfaceMember(extensionAttributes);
      if (member !== undefined && member.kind !== 'constructor') {
        members.push(member);
      }
      this.match(';');
    }

    return {
      kind: 'namespace',
      name,
      members,
    };
  }

  /**
   * Parses a parenthesized argument list of an operation, constructor, or callback.
   *
   * @returns The parsed arguments, in declaration order.
   */
  private parseArguments(): readonly WebIdlArgument[] {
    this.expect('(');
    const arguments_: WebIdlArgument[] = [];

    while (!this.match(')') && !this.isEof()) {
      this.parseExtendedAttributes();
      const optional = this.match('optional');
      const type = this.parseType();
      const variadic = this.match('...');
      const name = this.expectIdentifier();
      const defaultValue = this.match('=') ? this.parseDefaultValue() : undefined;

      arguments_.push({
        name,
        type,
        ...(optional ? { optional: true } : {}),
        ...(variadic ? { variadic: true } : {}),
        ...(defaultValue === undefined ? {} : { defaultValue }),
      });

      this.match(',');
    }

    return arguments_;
  }

  /**
   * Parses a default value literal following `=` in an argument or dictionary member.
   *
   * @returns The parsed default value.
   */
  private parseDefaultValue(): boolean | number | string {
    const token = this.advance();
    if (token.text === 'true') return true;
    if (token.text === 'false') return false;
    if (token.text === 'null') return 'null';
    if (token.text === '[' && this.match(']')) return '[]';
    if (token.text === '{' && this.match('}')) return '{}';
    if (!Number.isNaN(Number(token.text))) return Number(token.text);
    return token.text;
  }

  /**
   * Parses the body of a union type after the opening `(`: `TypeA or TypeB or ...)`.
   *
   * @returns The parsed union type.
   */
  private parseUnionType(): WebIdlType {
    const unionTypes: WebIdlType[] = [];
    while (!this.match(')') && !this.isEof()) {
      unionTypes.push(this.parseType());
      if (this.is('or') || this.is(',')) {
        this.advance();
      }
    }
    const nullable = this.match('?');
    return {
      kind: 'union',
      name: unionTypes.map((u) => u.name).join(' | '),
      unionTypes,
      ...(nullable ? { nullable: true } : {}),
    };
  }

  /**
   * Parses a generic single-type-argument container: `Keyword<Type>`, used for
   * `sequence`, `FrozenArray`, and `Promise`.
   *
   * @param keyword - Source keyword used to render the type name (e.g. `'sequence'`).
   * @param kind - Structural kind assigned to the resulting type.
   * @returns The parsed generic container type.
   */
  private parseGenericSingleArgumentType(keyword: string, kind: 'frozen-array' | 'promise' | 'sequence'): WebIdlType {
    this.expect('<');
    const inner = this.parseType();
    this.expect('>');
    const nullable = this.match('?');
    return {
      kind,
      name: `${keyword}<${inner.name}>`,
      typeArguments: [inner],
      ...(nullable ? { nullable: true } : {}),
    };
  }

  /**
   * Parses a `record<KeyType, ValueType>` type reference after the `record` keyword.
   *
   * @returns The parsed record type.
   */
  private parseRecordType(): WebIdlType {
    this.expect('<');
    const keyType = this.parseType();
    this.expect(',');
    const valueType = this.parseType();
    this.expect('>');
    const nullable = this.match('?');
    return {
      kind: 'record',
      name: `record<${keyType.name}, ${valueType.name}>`,
      typeArguments: [keyType, valueType],
      ...(nullable ? { nullable: true } : {}),
    };
  }

  /**
   * Resolves the `unsigned ...` multi-word type name variant, consuming any following `short`/`long` tokens.
   *
   * @returns The resolved type name (`'unsigned'`, `'unsigned short'`, `'unsigned long'`, or `'unsigned long long'`).
   */
  private resolveUnsignedTypeName(): string {
    if (this.is('short')) {
      this.advance();
      return 'unsigned short';
    }
    if (this.is('long')) {
      this.advance();
      if (this.is('long')) {
        this.advance();
        return 'unsigned long long';
      }
      return 'unsigned long';
    }
    return 'unsigned';
  }

  /**
   * Resolves the `long ...` multi-word type name variant, consuming a following `long` token if present.
   *
   * @returns The resolved type name (`'long'` or `'long long'`).
   */
  private resolveLongTypeName(): string {
    if (this.is('long')) {
      this.advance();
      return 'long long';
    }
    return 'long';
  }

  /**
   * Resolves the `unrestricted ...` multi-word type name variant, consuming a following `float`/`double` token.
   *
   * @returns The resolved type name (`'unrestricted'`, `'unrestricted float'`, or `'unrestricted double'`).
   */
  private resolveUnrestrictedTypeName(): string {
    if (this.is('float')) {
      this.advance();
      return 'unrestricted float';
    }
    if (this.is('double')) {
      this.advance();
      return 'unrestricted double';
    }
    return 'unrestricted';
  }

  /**
   * Resolves multi-word integer and float type names (`unsigned short`, `unsigned long long`,
   * `unsigned long`, `long long`, `unrestricted float`, `unrestricted double`) from their first word.
   *
   * @param typeName - The first identifier token of the type name.
   * @returns The fully resolved type name.
   */
  private resolveMultiWordTypeName(typeName: string): string {
    switch (typeName) {
      case 'unsigned': {
        return this.resolveUnsignedTypeName();
      }
      case 'long': {
        return this.resolveLongTypeName();
      }
      case 'unrestricted': {
        return this.resolveUnrestrictedTypeName();
      }
      default: {
        return typeName;
      }
    }
  }

  /**
   * Parses a named type reference: a (possibly multi-word) identifier, optionally followed by `?`.
   *
   * @returns The parsed named, buffer, string, or primitive type.
   */
  private parseNamedType(): WebIdlType {
    const typeName = this.resolveMultiWordTypeName(this.expectIdentifier());
    const nullable = this.match('?');

    return {
      kind: classifyWebIdlNamedTypeKind(typeName),
      name: typeName,
      ...(nullable ? { nullable: true } : {}),
    };
  }

  /**
   * Parses a single Web IDL type reference, covering unions, generic containers, records, and named types.
   *
   * @returns The parsed type reference.
   */
  public parseType(): WebIdlType {
    // Union type: (TypeA or TypeB or ...)
    if (this.match('(')) {
      return this.parseUnionType();
    }

    // Sequence: sequence<Type>
    if (this.match('sequence')) {
      return this.parseGenericSingleArgumentType('sequence', 'sequence');
    }

    // FrozenArray: FrozenArray<Type>
    if (this.match('FrozenArray')) {
      return this.parseGenericSingleArgumentType('FrozenArray', 'frozen-array');
    }

    // Promise: Promise<Type>
    if (this.match('Promise')) {
      return this.parseGenericSingleArgumentType('Promise', 'promise');
    }

    // Record: record<KeyType, ValueType>
    if (this.match('record')) {
      return this.parseRecordType();
    }

    return this.parseNamedType();
  }
}

const WEB_IDL_BUFFER_TYPE_NAMES: ReadonlySet<string> = new Set([
  'ArrayBuffer',
  'ArrayBufferView',
  'BufferSource',
  'DataView',
  'Float32Array',
  'Float64Array',
  'Int16Array',
  'Int32Array',
  'Int8Array',
  'SharedArrayBuffer',
  'Uint16Array',
  'Uint32Array',
  'Uint8Array',
  'Uint8ClampedArray',
]);

const WEB_IDL_STRING_TYPE_NAMES: ReadonlySet<string> = new Set(['ByteString', 'CSSOMString', 'DOMString', 'USVString']);

const WEB_IDL_PRIMITIVE_TYPE_NAMES: ReadonlySet<string> = new Set([
  'any',
  'bigint',
  'boolean',
  'byte',
  'double',
  'float',
  'long',
  'long long',
  'object',
  'octet',
  'short',
  'undefined',
  'unrestricted double',
  'unrestricted float',
  'unsigned long',
  'unsigned long long',
  'unsigned short',
  'void',
]);

/**
 * Classifies a resolved named-type identifier into its structural Web IDL type kind.
 *
 * @param typeName - Fully resolved type name (after multi-word resolution).
 * @returns `'buffer'`, `'string'`, or `'primitive'` for recognized names, otherwise `'named'`.
 */
function classifyWebIdlNamedTypeKind(typeName: string): WebIdlType['kind'] {
  if (WEB_IDL_BUFFER_TYPE_NAMES.has(typeName)) return 'buffer';
  if (WEB_IDL_STRING_TYPE_NAMES.has(typeName)) return 'string';
  if (WEB_IDL_PRIMITIVE_TYPE_NAMES.has(typeName)) return 'primitive';
  return 'named';
}

/**
 * Lexes and parses a complete Web IDL source string into a structural module AST.
 *
 * @param source - Web IDL source text to parse.
 * @returns The parsed Web IDL module.
 * @throws {WebIdlParseError} If the source contains a syntax error.
 */
export function parseWebIdl(source: string): WebIdlModule {
  const tokens = lexWebIdl(source);
  return new WebIdlParser(tokens).parse();
}
