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

export class WebIdlParseError extends Error {
  public readonly line: number;
  public readonly column: number;

  public constructor(message: string, line: number, column: number) {
    super(`[WebIDL ${line}:${column}] ${message}`);
    this.name = 'WebIdlParseError';
    this.line = line;
    this.column = column;
  }
}

export class WebIdlParser {
  private readonly tokens: readonly WebIdlToken[];
  private index = 0;

  public constructor(tokens: readonly WebIdlToken[]) {
    this.tokens = tokens;
  }

  public parse(): WebIdlModule {
    const definitions: WebIdlDefinition[] = [];

    while (!this.isEof()) {
      // Consume any stray semicolons
      if (this.match(';')) continue;

      const extendedAttributes = this.parseExtendedAttributes();
      if (this.isEof()) break;

      const partial = this.match('partial');

      if (this.is('interface')) {
        this.advance();
        if (this.match('mixin')) {
          definitions.push(this.parseInterface(extendedAttributes, partial, true));
        } else {
          definitions.push(this.parseInterface(extendedAttributes, partial, false));
        }
      } else if (this.match('dictionary')) {
        definitions.push(this.parseDictionary(extendedAttributes, partial));
      } else if (this.match('enum')) {
        definitions.push(this.parseEnum());
      } else if (this.match('typedef')) {
        definitions.push(this.parseTypedef());
      } else if (this.match('callback')) {
        if (this.match('interface')) {
          definitions.push(this.parseInterface(extendedAttributes, partial, false));
        } else {
          definitions.push(this.parseCallback());
        }
      } else if (this.match('namespace')) {
        definitions.push(this.parseNamespace());
      } else {
        const token = this.current();
        throw new WebIdlParseError(
          `Unexpected token '${token.text}' at top-level definition`,
          token.line,
          token.column,
        );
      }

      this.match(';');
    }

    return { definitions };
  }

  private isEof(): boolean {
    return this.current().kind === 'eof';
  }

  private current(): WebIdlToken {
    return this.tokens[this.index] ?? { kind: 'eof', text: '', line: 0, column: 0 };
  }

  private peek(offset = 1): WebIdlToken {
    return this.tokens[this.index + offset] ?? { kind: 'eof', text: '', line: 0, column: 0 };
  }

  private advance(): WebIdlToken {
    const token = this.current();
    if (this.index < this.tokens.length) {
      this.index += 1;
    }
    return token;
  }

  private is(text: string): boolean {
    return this.current().text === text;
  }

  private match(text: string): boolean {
    if (this.is(text)) {
      this.advance();
      return true;
    }
    return false;
  }

  private expect(text: string): WebIdlToken {
    const token = this.current();
    if (token.text !== text) {
      throw new WebIdlParseError(`Expected '${text}', got '${token.text}'`, token.line, token.column);
    }
    return this.advance();
  }

  private expectIdentifier(): string {
    const token = this.current();
    if (token.kind !== 'identifier') {
      throw new WebIdlParseError(`Expected identifier, got '${token.text}' (${token.kind})`, token.line, token.column);
    }
    return this.advance().text;
  }

  private parseExtendedAttributes(): Record<string, boolean | string> | undefined {
    if (!this.match('[')) return undefined;

    const attributes: Record<string, boolean | string> = {};

    while (!this.match(']') && !this.isEof()) {
      const name = this.expectIdentifier();
      if (this.match('=')) {
        if (this.match('(')) {
          // List of identifiers: (Window, Worker)
          const values: string[] = [];
          while (!this.match(')') && !this.isEof()) {
            values.push(this.expectIdentifier());
            this.match(',');
          }
          attributes[name] = values.join(',');
        } else {
          const valueToken = this.advance();
          attributes[name] = valueToken.text;
        }
      } else if (this.match('(')) {
        // Parameterized attribute, consume balanced parentheses
        let depth = 1;
        let parameterText = '';
        while (depth > 0 && !this.isEof()) {
          const t = this.advance();
          if (t.text === '(') depth += 1;
          else if (t.text === ')') depth -= 1;
          if (depth > 0) parameterText += t.text;
        }
        attributes[name] = parameterText.trim() || true;
      } else {
        attributes[name] = true;
      }

      this.match(',');
    }

    return Object.keys(attributes).length > 0 ? attributes : undefined;
  }

  private parseInterface(
    extendedAttributes: Record<string, boolean | string> | undefined,
    partial: boolean,
    mixin: boolean,
  ): WebIdlInterface {
    const name = this.expectIdentifier();
    let parent: string | undefined;

    if (this.match(':')) {
      parent = this.expectIdentifier();
    }

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

  private parseInterfaceMember(
    extendedAttributes: Record<string, boolean | string> | undefined,
  ): WebIdlMember | undefined {
    // Constant: const Type IDENTIFIER = value;
    if (this.match('const')) {
      const type = this.parseType();
      const name = this.expectIdentifier();
      this.expect('=');
      const valueToken = this.advance();
      let value: boolean | number | string = valueToken.text;
      if (valueToken.text === 'true') value = true;
      else if (valueToken.text === 'false') value = false;
      else if (!Number.isNaN(Number(valueToken.text))) value = Number(valueToken.text);

      return {
        kind: 'const',
        name,
        type,
        value,
      };
    }

    // Constructor: constructor(args...);
    if (this.is('constructor') && this.peek().text === '(') {
      this.advance();
      const arguments_ = this.parseArguments();
      return {
        kind: 'constructor',
        arguments: arguments_,
      };
    }

    // Static modifier
    const isStatic = this.match('static');

    // Attribute: [readonly] attribute Type identifier;
    const isReadonly = this.match('readonly');
    if (this.match('attribute')) {
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

    // Special operations: getter, setter, deleter, stringifier
    let special: 'deleter' | 'getter' | 'setter' | 'stringifier' | undefined;
    if (this.match('getter')) special = 'getter';
    else if (this.match('setter')) special = 'setter';
    else if (this.match('deleter')) special = 'deleter';
    else if (this.match('stringifier')) special = 'stringifier';

    // Operation: ReturnType [name] (args...);
    const returnType = this.parseType();
    let name: string | undefined;

    if (this.current().kind === 'identifier' && this.peek().text === '(') {
      name = this.expectIdentifier();
    } else if (this.current().kind === 'identifier' && !this.is('(')) {
      name = this.expectIdentifier();
    }

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

  private parseDictionary(
    extendedAttributes: Record<string, boolean | string> | undefined,
    partial: boolean,
  ): WebIdlDictionary {
    const name = this.expectIdentifier();
    let parent: string | undefined;

    if (this.match(':')) {
      parent = this.expectIdentifier();
    }

    this.expect('{');
    const members: WebIdlDictionaryMember[] = [];

    while (!this.match('}') && !this.isEof()) {
      if (this.match(';')) continue;

      const required = this.match('required');
      const type = this.parseType();
      const memberName = this.expectIdentifier();
      let defaultValue: boolean | number | string | undefined;

      if (this.match('=')) {
        defaultValue = this.parseDefaultValue();
      }

      members.push({
        name: memberName,
        type,
        ...(required ? { required: true } : {}),
        ...(defaultValue === undefined ? {} : { defaultValue }),
      });

      this.match(';');
    }

    return {
      kind: 'dictionary',
      name,
      ...(parent === undefined ? {} : { parent }),
      ...(partial ? { partial: true } : {}),
      members,
      ...(extendedAttributes === undefined ? {} : { extendedAttributes }),
    };
  }

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

  private parseArguments(): readonly WebIdlArgument[] {
    this.expect('(');
    const arguments_: WebIdlArgument[] = [];

    while (!this.match(')') && !this.isEof()) {
      this.parseExtendedAttributes();
      const optional = this.match('optional');
      const type = this.parseType();
      const variadic = this.match('...');
      const name = this.expectIdentifier();
      let defaultValue: boolean | number | string | undefined;

      if (this.match('=')) {
        defaultValue = this.parseDefaultValue();
      }

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

  public parseType(): WebIdlType {
    // Union type: (TypeA or TypeB or ...)
    if (this.match('(')) {
      const unionTypes: WebIdlType[] = [];
      while (!this.match(')') && !this.isEof()) {
        unionTypes.push(this.parseType());
        if (this.is('or')) {
          this.advance();
        } else if (this.is(',')) {
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

    // Sequence: sequence<Type>
    if (this.match('sequence')) {
      this.expect('<');
      const inner = this.parseType();
      this.expect('>');
      const nullable = this.match('?');
      return {
        kind: 'sequence',
        name: `sequence<${inner.name}>`,
        typeArguments: [inner],
        ...(nullable ? { nullable: true } : {}),
      };
    }

    // FrozenArray: FrozenArray<Type>
    if (this.match('FrozenArray')) {
      this.expect('<');
      const inner = this.parseType();
      this.expect('>');
      const nullable = this.match('?');
      return {
        kind: 'frozen-array',
        name: `FrozenArray<${inner.name}>`,
        typeArguments: [inner],
        ...(nullable ? { nullable: true } : {}),
      };
    }

    // Promise: Promise<Type>
    if (this.match('Promise')) {
      this.expect('<');
      const inner = this.parseType();
      this.expect('>');
      const nullable = this.match('?');
      return {
        kind: 'promise',
        name: `Promise<${inner.name}>`,
        typeArguments: [inner],
        ...(nullable ? { nullable: true } : {}),
      };
    }

    // Record: record<KeyType, ValueType>
    if (this.match('record')) {
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

    // Multi-word integer and float types:
    // "unsigned short", "unsigned long long", "unsigned long", "long long",
    // "unrestricted float", "unrestricted double"
    let typeName = this.expectIdentifier();

    switch (typeName) {
      case 'unsigned': {
        if (this.is('short')) {
          this.advance();
          typeName = 'unsigned short';
        } else if (this.is('long')) {
          this.advance();
          if (this.is('long')) {
            this.advance();
            typeName = 'unsigned long long';
          } else {
            typeName = 'unsigned long';
          }
        }

        break;
      }
      case 'long': {
        if (this.is('long')) {
          this.advance();
          typeName = 'long long';
        }

        break;
      }
      case 'unrestricted': {
        if (this.is('float')) {
          this.advance();
          typeName = 'unrestricted float';
        } else if (this.is('double')) {
          this.advance();
          typeName = 'unrestricted double';
        }

        break;
      }
      // No default
    }

    const nullable = this.match('?');

    // Categorize kind
    const bufferTypes = new Set([
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

    const stringTypes = new Set(['ByteString', 'CSSOMString', 'DOMString', 'USVString']);

    const primitiveTypes = new Set([
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

    let kind: WebIdlType['kind'] = 'named';
    if (bufferTypes.has(typeName)) kind = 'buffer';
    else if (stringTypes.has(typeName)) kind = 'string';
    else if (primitiveTypes.has(typeName)) kind = 'primitive';

    return {
      kind,
      name: typeName,
      ...(nullable ? { nullable: true } : {}),
    };
  }
}

export function parseWebIdl(source: string): WebIdlModule {
  const tokens = lexWebIdl(source);
  return new WebIdlParser(tokens).parse();
}
