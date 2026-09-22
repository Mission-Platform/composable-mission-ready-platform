import { createDiagnostic, type FlintDiagnostic, type FlintSourceSpan } from './diagnostics.js';
import { parseFlintDocumentation } from './documentation.js';
import { deriveFlintModuleId } from './identity.js';
import { lexFlint, type FlintToken } from './lexer.js';

import type {
  FlintBinaryOperator,
  FlintCapabilityImport,
  FlintEnumDeclaration,
  FlintEnumVariant,
  FlintSwitchCase,
  FlintExpression,
  FlintFunction,
  FlintGenericParameter,
  FlintInterfaceDeclaration,
  FlintInterfaceFunction,
  FlintMatchArm,
  FlintPattern,
  FlintModule,
  FlintParameter,
  FlintPrimitiveType,
  FlintSourceModuleImport,
  FlintStatement,
  FlintTypeName,
  FlintStructDeclaration,
  FlintStructField,
  FlintStructRepr,
  FlintForeignCapabilityDeclaration,
  FlintForeignFunctionDeclaration,
  FlintForeignFunctionParameter,
  FlintOpaqueForeignTypeDeclaration,
} from './ast.js';

/**
 * Result object returned by the Flint parser containing the parsed module and diagnostics.
 */
export interface FlintParseResult {
  readonly module?: FlintModule;
  readonly diagnostics: readonly FlintDiagnostic[];
}

/**
 * Options configuring parsing behavior and diagnostic collection.
 */
export interface FlintParseOptions {
  readonly root?: string;
}

export const primitiveTypes = new Set<FlintPrimitiveType>([
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
  'u8',
  'i8',
  'c_char',
  'c_uchar',
  'c_short',
  'c_ushort',
  'c_int',
  'c_uint',
  'c_long',
  'c_ulong',
  'c_longlong',
  'c_ulonglong',
  'c_size',
  'c_ssize',
  'c_float',
  'c_double',
  'c_void',
]);

/**
 * Recursive descent parser for the Flint programming language.
 */
class Parser {
  private readonly diagnostics: FlintDiagnostic[];
  private index = 0;

  private readonly tokens: readonly FlintToken[];
  private readonly fileName: string;

  /**
   * Initializes a new Parser instance for the given source file and token stream.
   *
   * @param tokens - Lexed token stream.
   * @param fileName - Canonical file path identifier.
   * @param diagnostics - Diagnostic report accumulator.
   */
  public constructor(tokens: readonly FlintToken[], fileName: string, diagnostics: readonly FlintDiagnostic[]) {
    this.tokens = tokens;
    this.fileName = fileName;
    this.diagnostics = [...diagnostics];
  }

  /**
   * Parses the loaded token stream into a complete AST module with diagnostics.
   *
   * @returns Parse result containing the compiled module and accumulated diagnostics.
   */
  // skipcq: JS-R1005
  public parse(): FlintParseResult {
    const start = this.tokens.find(({ kind }) => kind !== 'comment')?.span ?? this.current().span;
    const imports: FlintCapabilityImport[] = [];
    const sourceImports: FlintSourceModuleImport[] = [];
    const structs: FlintStructDeclaration[] = [];
    const enums: FlintEnumDeclaration[] = [];
    const interfaces: FlintInterfaceDeclaration[] = [];
    const functions: FlintFunction[] = [];
    const foreignCapabilities: FlintForeignCapabilityDeclaration[] = [];
    const opaqueForeignTypes: FlintOpaqueForeignTypeDeclaration[] = [];
    let pendingDocumentation = this.consumeTopLevelTrivia();
    if (this.is('module')) {
      pendingDocumentation = undefined;
      const legacy = this.consume();
      this.diagnostics.push(
        createDiagnostic(
          this.fileName,
          'parse',
          'FLINT-PARSE-001',
          'Nested module declarations are no longer supported; declarations are file-scoped.',
          legacy.span,
          'error',
          'Remove the module name and surrounding braces from this file.',
        ),
      );
      this.expectIdentifier('FLINT-PARSE-002', 'Expected a legacy module name.');
      this.expect('{', 'FLINT-PARSE-003', "Expected '{' after the legacy module name.");
    }
    while (true) {
      const documentation = pendingDocumentation ?? this.consumeTopLevelTrivia();
      pendingDocumentation = undefined;
      if (this.is('}') || this.is('eof')) break;
      this.parseTopLevelDeclaration(documentation, {
        imports,
        sourceImports,
        structs,
        enums,
        interfaces,
        functions,
        foreignCapabilities,
        opaqueForeignTypes,
      });
    }
    const end = this.is('}')
      ? this.expect('}', 'FLINT-PARSE-004', "Expected '}' to close the legacy module.").span
      : this.previous().span;
    const module = {
      kind: 'module' as const,
      name: deriveFlintModuleId(this.fileName),
      imports,
      sourceImports,
      structs,
      enums,
      interfaces,
      functions,
      ...(foreignCapabilities.length === 0 ? {} : { foreignCapabilities }),
      ...(opaqueForeignTypes.length === 0 ? {} : { opaqueForeignTypes }),
      span: mergeSpans(start, end),
    };
    return { module, diagnostics: this.diagnostics };
  }

  /**
   * Checks whether the current token matches a disallowed object-oriented keyword.
   *
   * @returns True if current token is a forbidden class keyword.
   */
  // skipcq: JS-R1005
  private isDisallowedClassKeyword(): boolean {
    return (
      this.is('class') ||
      this.is('constructor') ||
      this.is('extends') ||
      this.is('impl') ||
      this.is('new') ||
      this.is('trait')
    );
  }

  /**
   * Parses a top-level capability or source module import statement.
   *
   * @param declarations - Target container collecting parsed declarations.
   */
  private parseTopLevelImport(declarations: {
    readonly imports: FlintCapabilityImport[];
    readonly sourceImports: FlintSourceModuleImport[];
  }): void {
    if (this.isNext('capability')) declarations.imports.push(this.parseImport());
    else declarations.sourceImports.push(this.parseSourceImport());
  }

  /**
   * Parses the argument clause of a `#[repr(packed(...))]` attribute.
   *
   * @returns Parsed packed struct representation directive.
   */
  private parsePackedRepr(): FlintStructRepr {
    let alignment = 1;
    if (this.match('(')) {
      const number_ = this.expectKind('number', 'FLINT-PARSE-094', 'Expected packed alignment number.');
      alignment = Number(number_?.text || '1');
      if (!Number.isInteger(alignment) || alignment <= 0 || (alignment & (alignment - 1)) !== 0) {
        this.diagnostics.push(
          createDiagnostic(
            this.fileName,
            'parse',
            'FLINT-PARSE-073',
            `Packed alignment must be a positive power of two, got ${alignment}.`,
            number_?.span ?? this.previous().span,
          ),
        );
      }
      this.expect(')', 'FLINT-PARSE-095', "Expected ')' after packed alignment.");
    }
    return { kind: 'packed', alignment };
  }

  /**
   * Parses the argument clause of a `#[repr(align(...))]` attribute.
   *
   * @returns Parsed align struct representation directive.
   */
  private parseAlignRepr(): FlintStructRepr {
    this.expect('(', 'FLINT-PARSE-096', "Expected '(' after 'align'.");
    const number_ = this.expectKind('number', 'FLINT-PARSE-097', 'Expected alignment number.');
    const alignment = Number(number_?.text || '8');
    if (!Number.isInteger(alignment) || alignment <= 0 || (alignment & (alignment - 1)) !== 0) {
      this.diagnostics.push(
        createDiagnostic(
          this.fileName,
          'parse',
          'FLINT-PARSE-073',
          `Struct alignment must be a positive power of two, got ${alignment}.`,
          number_?.span ?? this.previous().span,
        ),
      );
    }
    this.expect(')', 'FLINT-PARSE-098', "Expected ')' after alignment.");
    return { kind: 'align', alignment };
  }

  /**
   * Parses the representation kind inside a `#[repr(...)]` attribute clause.
   *
   * @returns Parsed struct representation directive or undefined if unrecognized.
   */
  private parseReprClause(): FlintStructRepr | undefined {
    this.expect('(', 'FLINT-PARSE-092', "Expected '(' after 'repr'.");
    const kind = this.expectIdentifier(
      'FLINT-PARSE-093',
      "Expected repr identifier ('C', 'packed', 'align', 'flint').",
    );
    let repr: FlintStructRepr | undefined;
    switch (kind) {
      case 'C': {
        repr = { kind: 'c' };
        break;
      }
      case 'packed': {
        repr = this.parsePackedRepr();
        break;
      }
      case 'align': {
        repr = this.parseAlignRepr();
        break;
      }
      case 'flint': {
        repr = { kind: 'flint' };
        break;
      }
      default: {
        break;
      }
    }
    this.expect(')', 'FLINT-PARSE-099', "Expected ')' after repr attribute arguments.");
    return repr;
  }

  /**
   * Parses a #[repr(...)] attribute if present.
   *
   * @returns Parsed struct representation directive or undefined.
   */
  private parseStructReprAttribute(): FlintStructRepr | undefined {
    if (!this.is('#')) return undefined;
    this.consume();
    this.expect('[', 'FLINT-PARSE-090', "Expected '[' after '#'.");
    const attribute = this.expectIdentifier('FLINT-PARSE-091', 'Expected attribute name.');
    let repr: FlintStructRepr | undefined;
    if (attribute === 'repr') {
      repr = this.parseReprClause();
    }
    this.expect(']', 'FLINT-PARSE-100', "Expected ']' after attribute.");
    return repr;
  }

  /**
   * Parses a single top-level module declaration item.
   *
   * @param documentation - Optional documentation comment attached to declaration.
   * @param declarations - Target container collecting parsed declarations.
   */
  // skipcq: JS-R1005
  private parseTopLevelDeclaration(
    documentation: FlintFunction['documentation'] | undefined,
    declarations: {
      readonly imports: FlintCapabilityImport[];
      readonly sourceImports: FlintSourceModuleImport[];
      readonly structs: FlintStructDeclaration[];
      readonly enums: FlintEnumDeclaration[];
      readonly interfaces: FlintInterfaceDeclaration[];
      readonly functions: FlintFunction[];
      readonly foreignCapabilities: FlintForeignCapabilityDeclaration[];
      readonly opaqueForeignTypes: FlintOpaqueForeignTypeDeclaration[];
    },
  ): void {
    let repr: FlintStructRepr | undefined;
    if (this.is('#')) {
      repr = this.parseStructReprAttribute();
      const attributeDocument = this.consumeTopLevelTrivia();
      if (attributeDocument !== undefined) documentation = attributeDocument;
    }
    if (this.is('foreign')) {
      declarations.foreignCapabilities.push(this.parseForeignCapability());
    } else if (this.is('opaque') && this.isNext('foreign')) {
      declarations.opaqueForeignTypes.push(this.parseOpaqueForeignType());
    } else if (this.is('import')) {
      this.parseTopLevelImport(declarations);
    } else if (this.is('struct') || this.is('record')) {
      declarations.structs.push(this.parseStruct(documentation, this.is('record'), repr));
    } else if (this.current().text === 'c_struct') {
      this.diagnostics.push(
        createDiagnostic(
          this.fileName,
          'parse',
          'FLINT-PARSE-034',
          "The 'c_struct' keyword is removed; use '#[repr(C)] struct' instead.",
          this.current().span,
        ),
      );
      this.consume();
      while (!this.is('}') && !this.is('eof')) {
        this.consume();
      }
      if (this.is('}')) this.consume();
    } else if (this.is('enum') || (this.is('export') && this.isNext('enum'))) {
      declarations.enums.push(this.parseEnum(documentation));
    } else if (this.is('interface')) {
      declarations.interfaces.push(this.parseInterface(documentation));
    } else if (this.isDisallowedClassKeyword()) {
      this.rejectClassDeclaration();
    } else {
      declarations.functions.push(this.parseFunction(documentation));
    }
  }

  /**
   * Parses the sequence of foreign function declarations within a foreign capability block.
   *
   * @returns List of parsed foreign function declarations.
   */
  private parseForeignCapabilityFunctions(): FlintForeignFunctionDeclaration[] {
    const functions: FlintForeignFunctionDeclaration[] = [];
    while (true) {
      const documentation = this.consumeTopLevelTrivia();
      if (this.is('}') || this.is('eof')) break;
      functions.push(this.parseForeignFunction(documentation));
    }
    return functions;
  }

  /**
   * Parses a foreign capability block (e.g. foreign "C" capability "zstd" { ... }).
   *
   * @returns Parsed foreign capability declaration AST node.
   */
  private parseForeignCapability(): FlintForeignCapabilityDeclaration {
    const start = this.consume().span;
    const abiToken = this.expectKind('string', 'FLINT-PARSE-110', 'Expected ABI string (e.g. "C") after foreign.');
    const decodedAbi = abiToken === undefined ? 'C' : decodeString(abiToken.text);
    if (decodedAbi !== 'C') {
      this.diagnostics.push(
        createDiagnostic(
          this.fileName,
          'parse',
          'FLINT-PARSE-074',
          `Unsupported foreign ABI '${decodedAbi}'; only "C" is currently supported.`,
          abiToken?.span ?? start,
        ),
      );
    }
    const abi = 'C';
    this.expect('capability', 'FLINT-PARSE-111', "Expected 'capability' after foreign ABI.");
    const libraryToken = this.expectKind('string', 'FLINT-PARSE-112', 'Expected library name string after capability.');
    const library = libraryToken === undefined ? '<missing>' : decodeString(libraryToken.text);
    this.expect('{', 'FLINT-PARSE-113', "Expected '{' to start foreign capability block.");
    const functions = this.parseForeignCapabilityFunctions();
    const end = this.expect('}', 'FLINT-PARSE-114', "Expected '}' after foreign capability block.").span;
    return {
      kind: 'foreign-capability',
      abi,
      library,
      callingConvention: 'wasm-c-abi',
      functions,
      span: mergeSpans(start, end),
    };
  }

  /**
   * Parses the parameter list of a foreign function declaration.
   *
   * @returns List of parsed foreign function parameters.
   */
  private parseForeignParameters(): FlintForeignFunctionParameter[] {
    const parameters: FlintForeignFunctionParameter[] = [];
    if (this.is(')')) return parameters;
    while (true) {
      const parameterStart = this.current().span;
      const parameterName = this.expectIdentifier('FLINT-PARSE-118', 'Expected parameter name.');
      this.expect(':', 'FLINT-PARSE-119', "Expected ':' after parameter name.");
      const type = this.parseType();
      const parameterEnd = this.previous().span;
      parameters.push({
        name: parameterName ?? '<missing>',
        type,
        span: mergeSpans(parameterStart, parameterEnd),
      });
      if (this.match(',')) continue;
      break;
    }
    return parameters;
  }

  /**
   * Parses an individual foreign function prototype inside a foreign capability block.
   *
   * @param documentation - Optional documentation comment.
   * @returns Parsed foreign function declaration AST node.
   */
  private parseForeignFunction(documentation?: FlintFunction['documentation']): FlintForeignFunctionDeclaration {
    const start = this.current().span;
    this.expect('fn', 'FLINT-PARSE-115', "Expected 'fn' in foreign capability declaration.");
    const name = this.expectIdentifier('FLINT-PARSE-116', 'Expected function name in foreign capability declaration.');
    this.expect('(', 'FLINT-PARSE-117', "Expected '(' after function name.");
    const parameters = this.parseForeignParameters();
    this.expect(')', 'FLINT-PARSE-120', "Expected ')' after parameter list.");
    this.expect('->', 'FLINT-PARSE-121', "Expected '->' after parameter list.");
    const result = this.parseType();
    const end = this.expect(';', 'FLINT-PARSE-122', "Expected ';' after foreign function declaration.").span;
    return {
      kind: 'foreign-function',
      name: name ?? '<missing>',
      parameters,
      result,
      ...(documentation === undefined ? {} : { documentation }),
      span: mergeSpans(start, end),
    };
  }

  /**
   * Parses an opaque foreign type declaration (e.g. opaque foreign type ZstdContext;).
   *
   * @returns Parsed opaque foreign type AST node.
   */
  private parseOpaqueForeignType(): FlintOpaqueForeignTypeDeclaration {
    const start = this.consume().span;
    this.expect('foreign', 'FLINT-PARSE-123', "Expected 'foreign' after 'opaque'.");
    this.expect('type', 'FLINT-PARSE-124', "Expected 'type' after 'opaque foreign'.");
    const name = this.expectIdentifier('FLINT-PARSE-125', 'Expected type name after opaque foreign type.');
    const end = this.expect(';', 'FLINT-PARSE-126', "Expected ';' after opaque foreign type declaration.").span;
    return {
      kind: 'opaque-foreign-type',
      name: name ?? '<missing>',
      span: mergeSpans(start, end),
    };
  }

  /**
   * Parses a source module import statement binding an external module.
   *
   * @returns Parsed source module import AST node.
   */
  private parseSourceImport(): FlintSourceModuleImport {
    const start = this.consume().span;
    if (this.is('module')) this.consume();
    const source = this.expectKind('string', 'FLINT-PARSE-026', 'Expected a quoted source module path.');
    this.expect('as', 'FLINT-PARSE-027', "Expected 'as' followed by the source module alias.");
    const alias = this.expectIdentifier('FLINT-PARSE-028', 'Expected a source module alias.');
    const end = this.expect(';', 'FLINT-PARSE-029', "Expected ';' after a source module import.").span;
    return {
      kind: 'source-module-import',
      source: source === undefined ? '<missing>' : decodeString(source.text),
      alias: alias ?? '<missing>',
      span: mergeSpans(start, end),
    };
  }

  /**
   * Parses a host capability import statement binding a host interface.
   *
   * @returns Parsed capability import AST node.
   */
  private parseImport(): FlintCapabilityImport {
    const start = this.consume().span;
    this.expect('capability', 'FLINT-PARSE-005', "Expected 'capability' after 'import'.");
    const capabilityToken = this.expectKind('string', 'FLINT-PARSE-006', 'Expected a quoted capability name.');
    this.expect('as', 'FLINT-PARSE-007', "Expected 'as' followed by the local capability alias.");
    const alias = this.expectIdentifier('FLINT-PARSE-008', 'Expected a capability alias.');
    const parameters = this.parseParameters();
    this.expect('->', 'FLINT-PARSE-009', "Expected '->' before the capability result type.");
    const result = this.parseType();
    const end = this.expect(';', 'FLINT-PARSE-010', "Expected ';' after a capability declaration.").span;
    return {
      kind: 'capability-import',
      capability: decodeString(capabilityToken.text),
      alias: alias ?? '<missing>',
      parameters,
      result,
      span: mergeSpans(start, end),
    };
  }

  /**
   * Parses function declaration modifiers such as export, iter, or inline.
   *
   * @returns Parsed modifier flags.
   */
  // skipcq: JS-R1005
  private parseFunctionModifiers(): {
    exported: boolean;
    iterable: boolean;
    inlinePolicy?: FlintFunction['inlinePolicy'];
  } {
    let exported = false;
    let iterable = false;
    let inlinePolicy: FlintFunction['inlinePolicy'];
    while (true) {
      if (this.match('export')) exported = true;
      else if (this.match('iter')) iterable = true;
      else if (this.match('inline')) inlinePolicy = 'always';
      else if (this.match('noinline')) inlinePolicy = 'noinline';
      else break;
    }
    return { exported, iterable, inlinePolicy };
  }

  /**
   * Parses a function declaration AST node.
   *
   * @param documentation - Optional attached documentation comment.
   * @returns Complete function declaration AST node.
   */
  private parseFunction(documentation?: FlintFunction['documentation']): FlintFunction {
    const start = this.current().span;
    const { exported, iterable, inlinePolicy } = this.parseFunctionModifiers();
    this.expect('fn', 'FLINT-PARSE-011', "Expected 'fn' or 'export fn'.");
    const name = this.expectIdentifier('FLINT-PARSE-012', 'Expected a function name.');
    const genericParameters = this.parseGenericParameters();
    const parameters = this.parseParameters();
    this.expect('->', 'FLINT-PARSE-013', "Expected '->' before the function result type.");
    const result = this.parseType();
    const body = this.parseBlock();
    return {
      kind: 'function',
      name: name ?? '<missing>',
      exported,
      ...(iterable ? { iterable: true } : {}),
      ...(inlinePolicy === undefined ? {} : { inlinePolicy }),
      ...(documentation === undefined ? {} : { documentation }),
      genericParameters,
      parameters,
      result,
      body,
      span: mergeSpans(start, this.previous().span),
    };
  }

  /**
   * Parses generic type parameter declarations enclosed in angle brackets.
   *
   * @returns Array of parsed generic parameters.
   */
  // skipcq: JS-R1005
  private parseGenericParameters(): FlintGenericParameter[] {
    if (!this.match('<')) return [];
    const parameters: FlintGenericParameter[] = [];
    while (!this.is('>') && !this.is('eof')) {
      const start = this.current().span;
      const name = this.expectIdentifier('FLINT-PARSE-031', 'Expected a generic parameter name.');
      const bounds: string[] = [];
      if (this.match(':')) {
        do {
          const bound = this.expectIdentifier('FLINT-PARSE-032', 'Expected an interface bound.');
          if (bound !== undefined) bounds.push(bound);
        } while (this.match('+'));
      }
      parameters.push({
        kind: 'generic-parameter',
        name: name ?? '<missing>',
        bounds,
        span: mergeSpans(start, this.previous().span),
      });
      if (!this.match(',')) break;
    }
    this.expect('>', 'FLINT-PARSE-033', "Expected '>' after generic parameters.");
    return parameters;
  }

  /**
   * Parses a single field declaration within a struct body.
   *
   * @param fieldDocumentation - Optional field-level documentation.
   * @returns Parsed struct field AST node.
   */
  private parseStructField(fieldDocumentation?: FlintFunction['documentation']): FlintStructField {
    const fieldStart = this.current().span;
    const fieldName = this.expectIdentifier('FLINT-PARSE-036', 'Expected a struct field name.');
    this.expect(':', 'FLINT-PARSE-037', "Expected ':' after a struct field name.");
    const type = this.parseType();
    const end = this.match(',')
      ? this.previous().span
      : this.expect(';', 'FLINT-PARSE-038', "Expected ';' after a struct field.").span;
    return {
      kind: 'struct-field',
      name: fieldName ?? '<missing>',
      type,
      ...(fieldDocumentation === undefined ? {} : { documentation: fieldDocumentation }),
      span: mergeSpans(fieldStart, end),
    };
  }

  /**
   * Parses a struct or record type declaration.
   *
   * @param documentation - Optional attached documentation comment.
   * @param record - True if declared as a value record.
   * @param repr - Optional representation attribute metadata.
   * @returns Parsed struct declaration AST node.
   */
  // skipcq: JS-R1005
  private parseStruct(
    documentation?: FlintFunction['documentation'],
    record = false,
    repr?: FlintStructRepr,
  ): FlintStructDeclaration {
    const start = this.consume().span;
    const name = this.expectIdentifier('FLINT-PARSE-034', 'Expected a struct name.');
    const genericParameters = this.parseGenericParameters();
    this.expect('{', 'FLINT-PARSE-035', "Expected '{' after a struct name.");
    const fields: FlintStructField[] = [];
    while (true) {
      const fieldDocumentation = this.consumeTopLevelTrivia();
      if (this.is('}') || this.is('eof')) break;
      fields.push(this.parseStructField(fieldDocumentation));
    }
    const end = this.expect('}', 'FLINT-PARSE-039', "Expected '}' after a struct declaration.").span;
    return {
      kind: 'struct',
      name: name ?? '<missing>',
      ...(record ? { record: true as const } : {}),
      ...(repr?.kind === 'c' ? { c_struct: true as const } : {}),
      ...(repr === undefined ? {} : { repr }),
      ...(repr?.kind === 'packed' ? { packed: repr.alignment } : {}),
      ...(repr?.kind === 'align' ? { align: repr.alignment } : {}),
      ...(documentation === undefined ? {} : { documentation }),
      genericParameters,
      fields,
      immutable: true,
      span: mergeSpans(start, end),
    };
  }

  /**
   * Computes or parses an explicit numeric discriminant tag for an enum variant.
   *
   * @param previousTag - Numeric tag of preceding variant.
   * @returns Resolved numeric discriminant tag.
   */
  private parseEnumVariantTag(previousTag: number): number {
    let tag = previousTag + 1;
    if (this.match('=')) {
      const negative = this.match('-');
      const value = this.expectKind('number', 'FLINT-PARSE-045', 'Expected an integer enum discriminant.');
      tag = (negative ? -1 : 1) * Number(value.text || '0');
    }
    return tag;
  }

  /**
   * Parses an enum variant declaration with optional payload fields.
   *
   * @param variantDocumentation - Optional variant documentation.
   * @param previousTag - Preceding numeric discriminant tag.
   * @returns Parsed enum variant AST node.
   */
  // skipcq: JS-R1005
  private parseEnumVariant(previousTag: number): FlintEnumVariant {
    const variantStart = this.current().span;
    const variantName = this.expectIdentifier('FLINT-PARSE-042', 'Expected an enum variant name.');
    const fields = this.is('(') ? this.parseVariantFields() : [];
    const tag = this.parseEnumVariantTag(previousTag);
    const separated = this.match(',');
    const end = separated
      ? this.previous().span
      : variantName === undefined
        ? this.current().span
        : this.previous().span;
    if (!separated && !this.is('}') && !this.is('eof'))
      this.expect(',', 'FLINT-PARSE-043', "Expected ',' between enum variants.");
    return {
      kind: 'enum-variant',
      name: variantName ?? '<missing>',
      fields,
      tag,
      span: mergeSpans(variantStart, end),
    };
  }

  /**
   * Parses an enum type declaration.
   *
   * @param documentation - Optional attached documentation comment.
   * @returns Parsed enum declaration AST node.
   */
  // skipcq: JS-R1005
  private parseEnum(documentation?: FlintFunction['documentation']): FlintEnumDeclaration {
    const start = this.current().span;
    const exported = this.match('export');
    this.expect('enum', 'FLINT-PARSE-040', "Expected 'enum' or 'export enum'.");
    const name = this.expectIdentifier('FLINT-PARSE-040', 'Expected an enum name.');
    const genericParameters = this.parseGenericParameters();
    this.expect('{', 'FLINT-PARSE-041', "Expected '{' after an enum name.");
    const variants: FlintEnumVariant[] = [];
    while (!this.is('}') && !this.is('eof')) {
      const previousTag = variants.length === 0 ? -1 : (variants.at(-1)?.tag ?? 0);
      variants.push(this.parseEnumVariant(previousTag));
    }
    const end = this.expect('}', 'FLINT-PARSE-044', "Expected '}' after an enum declaration.").span;
    return {
      kind: 'enum',
      name: name ?? '<missing>',
      exported,
      ...(documentation === undefined ? {} : { documentation }),
      genericParameters,
      variants,
      span: mergeSpans(start, end),
    };
  }

  /**
   * Parses an interface type declaration.
   *
   * @param documentation - Optional attached documentation comment.
   * @returns Parsed interface declaration AST node.
   */
  // skipcq: JS-R1005
  private parseInterface(documentation?: FlintFunction['documentation']): FlintInterfaceDeclaration {
    const start = this.consume().span;
    const name = this.expectIdentifier('FLINT-PARSE-045', 'Expected an interface name.');
    const genericParameters = this.parseGenericParameters();
    this.expect('{', 'FLINT-PARSE-046', "Expected '{' after an interface name.");
    const functions: FlintInterfaceFunction[] = [];
    while (true) {
      const documentation = this.consumeTopLevelTrivia();
      if (this.is('}') || this.is('eof')) break;
      const functionStart = this.current().span;
      this.expect('fn', 'FLINT-PARSE-047', "Expected 'fn' in an interface declaration.");
      const functionName = this.expectIdentifier('FLINT-PARSE-048', 'Expected an interface function name.');
      const functionGenerics = this.parseGenericParameters();
      const parameters = this.parseParameters();
      this.expect('->', 'FLINT-PARSE-049', "Expected '->' before an interface function result type.");
      const result = this.parseType();
      const end = this.expect(';', 'FLINT-PARSE-050', "Expected ';' after an interface function.").span;
      functions.push({
        kind: 'interface-function',
        name: functionName ?? '<missing>',
        ...(documentation === undefined ? {} : { documentation }),
        genericParameters: functionGenerics,
        parameters,
        result,
        span: mergeSpans(functionStart, end),
      });
    }
    const end = this.expect('}', 'FLINT-PARSE-051', "Expected '}' after an interface declaration.").span;
    return {
      kind: 'interface',
      name: name ?? '<missing>',
      ...(documentation === undefined ? {} : { documentation }),
      genericParameters,
      functions,
      span: mergeSpans(start, end),
    };
  }

  /**
   * Emits descriptive diagnostics rejecting class-based syntax.
   */
  // skipcq: JS-R1005
  private rejectClassDeclaration(): void {
    const start = this.consume().span;
    this.diagnostics.push(
      createDiagnostic(
        this.fileName,
        'parse',
        'FLINT-PARSE-052',
        'Class and object-oriented declarations are not supported; use an immutable struct or enum.',
        start,
        'error',
        'Replace the class with a struct and pure functions.',
      ),
    );
    let braces = 0;
    while (!this.is('eof')) {
      if (this.is('{')) braces += 1;
      if (this.is('}')) {
        braces -= 1;
        this.consume();
        if (braces <= 0) break;
        continue;
      }
      if (braces === 0 && this.is(';')) {
        this.consume();
        break;
      }
      this.consume();
    }
  }

  /**
   * Parses function or capability parameter lists enclosed in parentheses.
   *
   * @returns Array of parsed parameter AST nodes.
   */
  // skipcq: JS-R1005
  private parseParameters(): FlintParameter[] {
    this.expect('(', 'FLINT-PARSE-014', "Expected '('.");
    const parameters: FlintParameter[] = [];
    while (!this.is(')') && !this.is('eof')) {
      const start = this.current().span;
      const mutable = this.match('mut');
      const name = this.expectIdentifier('FLINT-PARSE-015', 'Expected a parameter name.');
      this.expect(':', 'FLINT-PARSE-016', "Expected ':' after a parameter name.");
      const type = this.parseType();
      parameters.push({
        kind: 'parameter',
        name: name ?? '<missing>',
        ...(mutable ? { mutable: true as const } : {}),
        type,
        span: mergeSpans(start, type.span),
      });
      if (!this.match(',')) break;
    }
    this.expect(')', 'FLINT-PARSE-017', "Expected ')'.");
    return parameters;
  }

  /**
   * Enum variant payloads accept either named fields (`value: T`) or the
   * positional bare-type form used by Option/Result (`T`).
   */
  // skipcq: JS-R1005
  private parseVariantFields(): FlintParameter[] {
    this.expect('(', 'FLINT-PARSE-014', "Expected '('.");
    const fields: FlintParameter[] = [];
    let index = 0;
    while (!this.is(')') && !this.is('eof')) {
      const start = this.current().span;
      const named = (this.current().kind === 'identifier' || this.current().kind === 'keyword') && this.isNext(':');
      if (named) {
        const name = this.expectIdentifier('FLINT-PARSE-015', 'Expected a parameter name.');
        this.expect(':', 'FLINT-PARSE-016', "Expected ':' after a parameter name.");
        const type = this.parseType();
        fields.push({ kind: 'parameter', name: name ?? '<missing>', type, span: mergeSpans(start, type.span) });
      } else {
        const type = this.parseType();
        fields.push({ kind: 'parameter', name: `_${index}`, type, span: mergeSpans(start, type.span) });
      }
      index += 1;
      if (!this.match(',')) break;
    }
    this.expect(')', 'FLINT-PARSE-017', "Expected ')'.");
    return fields;
  }

  /**
   * Parses a fixed-size array type specification.
   *
   * @param typeStart - Start position span.
   * @param referenceStart - Whether preceded by an reference operator.
   * @param mutableReference - Whether reference is mutable.
   * @returns Parsed fixed array type AST node.
   */
  private parseFixedArrayType(
    typeStart: FlintSourceSpan,
    referenceStart: boolean,
    mutableReference: boolean,
  ): FlintTypeName {
    const element = this.parseType();
    this.expect(';', 'FLINT-PARSE-080', "Expected ';' before a fixed array length.");
    const lengthToken = this.expectKind('number', 'FLINT-PARSE-081', 'Expected a fixed array length.');
    const end = this.expect(']', 'FLINT-PARSE-082', "Expected ']' after a fixed array type.").span;
    return {
      kind: 'type-name',
      name: 'unit',
      reference: 'Array',
      arguments: [element],
      length: Number(lengthToken.text || '0'),
      ...(referenceStart ? { referenceMode: mutableReference ? ('mut-ref' as const) : ('ref' as const) } : {}),
      span: mergeSpans(typeStart, end),
    };
  }

  /**
   * Resolves the identifier or keyword string representing the base type name.
   *
   * @returns Type name token string.
   */
  private resolveTypeNameToken(): string {
    const nameToken = this.current();
    const isNamed = nameToken.kind === 'identifier' || nameToken.kind === 'keyword';
    return isNamed ? nameToken.text : 'unit';
  }

  /**
   * Resolves reference mode qualifier (ref or mut-ref) based on preceding tokens.
   *
   * @param referenceStart - Whether an ampersand was consumed.
   * @param mutableReference - Whether mut was consumed.
   * @returns Resolved reference mode or undefined.
   */
  private static resolveReferenceMode(
    referenceStart: boolean,
    mutableReference: boolean,
  ): 'mut-ref' | 'ref' | undefined {
    if (!referenceStart) return undefined;
    return mutableReference ? 'mut-ref' : 'ref';
  }

  /**
   * Parses a base type name node with optional type arguments and reference qualifiers.
   *
   * @param typeStart - Start position span.
   * @param referenceStart - Whether preceded by reference.
   * @param mutableReference - Whether reference is mutable.
   * @returns Parsed base type name AST node.
   */
  // skipcq: JS-R1005
  private parseBaseTypeName(
    typeStart: FlintSourceSpan,
    referenceStart: boolean,
    mutableReference: boolean,
  ): FlintTypeName {
    const name = this.resolveTypeNameToken();
    this.consume();
    const arguments_ = this.is('<') ? this.parseTypeArguments() : undefined;
    const primitive = primitiveTypes.has(name as FlintPrimitiveType) ? (name as FlintPrimitiveType) : 'unit';
    // skipcq: JS-0105
    const referenceMode = Parser.resolveReferenceMode(referenceStart, mutableReference);
    return {
      kind: 'type-name',
      name: primitive,
      ...(primitive === 'unit' && name !== 'unit' ? { reference: name } : {}),
      ...(arguments_ === undefined ? {} : { arguments: arguments_ }),
      ...(referenceMode === undefined ? {} : { referenceMode }),
      span: mergeSpans(typeStart, this.previous().span),
    };
  }

  /**
   * Parses a full type specification including pointers, references, and array wrappers.
   *
   * @returns Parsed type name AST node.
   */
  // skipcq: JS-R1005
  private parseType(): FlintTypeName {
    const token = this.current();
    const referenceStart = this.match('&');
    const mutableReference = referenceStart && this.match('mut');
    const typeStart = referenceStart ? token.span : this.current().span;
    if (this.match('[')) {
      return this.parseFixedArrayType(typeStart, referenceStart, mutableReference);
    }
    const baseType = this.parseBaseTypeName(typeStart, referenceStart, mutableReference);
    if (this.match('[')) {
      const end = this.expect(']', 'FLINT-PARSE-084', "Expected ']' after a dynamic array type.").span;
      return {
        kind: 'type-name',
        name: 'unit',
        reference: 'Array',
        arguments: [baseType],
        ...(referenceStart ? { referenceMode: mutableReference ? ('mut-ref' as const) : ('ref' as const) } : {}),
        span: mergeSpans(typeStart, end),
      };
    }
    return baseType;
  }

  /**
   * Parses type arguments enclosed in angle brackets.
   *
   * @returns Array of parsed type argument AST nodes.
   */
  private parseTypeArguments(): FlintTypeName[] {
    this.expect('<', 'FLINT-PARSE-053', "Expected '<' before type arguments.");
    const arguments_: FlintTypeName[] = [];
    while (!this.is('>') && !this.is('eof')) {
      arguments_.push(this.parseType());
      if (!this.match(',')) break;
    }
    this.expect('>', 'FLINT-PARSE-054', "Expected '>' after type arguments.");
    return arguments_;
  }

  /**
   * Parses a block of statements enclosed in curly braces.
   *
   * @returns Array of parsed statement AST nodes.
   */
  private parseBlock(): FlintStatement[] {
    this.expect('{', 'FLINT-PARSE-018', "Expected '{' to start a block.");
    const statements: FlintStatement[] = [];
    while (!this.is('}') && !this.is('eof')) statements.push(this.parseStatement());
    this.expect('}', 'FLINT-PARSE-019', "Expected '}' to close a block.");
    return statements;
  }

  /**
   * Parses a variable or indexed array element assignment statement.
   *
   * @returns Parsed assignment statement AST node.
   */
  private parseAssignmentStatement(): FlintStatement {
    const start = this.consume().span;
    const name = this.previous().text;
    let index: FlintExpression | undefined;
    if (this.match('[')) {
      index = this.parseExpression();
      this.expect(']', 'FLINT-PARSE-083', "Expected ']' after an indexed assignment target.");
    }
    this.consume();
    const value = this.parseExpression();
    const end = this.expect(';', 'FLINT-PARSE-030', "Expected ';' after an assignment.").span;
    return {
      kind: 'assignment',
      name,
      ...(index === undefined ? {} : { index }),
      value,
      span: mergeSpans(start, end),
    };
  }

  /**
   * Parses a local variable declaration statement.
   *
   * @returns Parsed let statement AST node.
   */
  private parseLetStatement(): FlintStatement {
    const start = this.previous().span;
    const mutable = this.match('mut');
    const name = this.expectIdentifier('FLINT-PARSE-020', 'Expected a local variable name.');
    this.expect(':', 'FLINT-PARSE-021', "Expected ':' after a local variable name.");
    const type = this.parseType();
    this.expect('=', 'FLINT-PARSE-022', "Expected '=' in a local variable declaration.");
    const value = this.parseExpression();
    const end = this.expect(';', 'FLINT-PARSE-023', "Expected ';' after a local variable declaration.").span;
    return {
      kind: 'let',
      name: name ?? '<missing>',
      ...(mutable ? { mutable: true as const } : {}),
      type,
      value,
      span: mergeSpans(start, end),
    };
  }

  /**
   * Parses a function return statement with optional return value.
   *
   * @returns Parsed return statement AST node.
   */
  private parseReturnStatement(): FlintStatement {
    const start = this.previous().span;
    const value = this.is(';') ? undefined : this.parseExpression();
    const end = this.expect(';', 'FLINT-PARSE-024', "Expected ';' after a return statement.").span;
    return { kind: 'return', ...(value === undefined ? {} : { value }), span: mergeSpans(start, end) };
  }

  /**
   * Parses a generator yield statement.
   *
   * @returns Parsed yield statement AST node.
   */
  private parseYieldStatement(): FlintStatement {
    const start = this.previous().span;
    const value = this.parseExpression();
    const end = this.expect(';', 'FLINT-PARSE-071', "Expected ';' after a yield statement.").span;
    return { kind: 'yield', value, span: mergeSpans(start, end) };
  }

  /**
   * Parses an iterator loop statement over an iterable collection.
   *
   * @returns Parsed iterator loop statement AST node.
   */
  private parseIteratorLoopStatement(): FlintStatement {
    const start = this.previous().span;
    const binding =
      this.expectIdentifier('FLINT-PARSE-072', "Expected an iterator loop binding after 'loop'.") ?? '<missing>';
    this.expect('=', 'FLINT-PARSE-073', "Expected '=' after an iterator loop binding.");
    const iterator = this.parseExpression();
    const body = this.parseBlock();
    return { kind: 'iterator-loop', binding, iterator, body, span: mergeSpans(start, this.previous().span) };
  }

  /**
   * Emits diagnostics rejecting exception handling keywords (try, catch, throw).
   *
   * @returns Error recovery statement node.
   */
  private parseExceptionRejectStatement(): FlintStatement {
    const token = this.consume();
    this.diagnostics.push(
      createDiagnostic(
        this.fileName,
        'parse',
        'FLINT-PARSE-074',
        `Exception construct '${token.text}' is not supported; return a Result or Option instead.`,
        token.span,
        'error',
        'Use an explicit Result<T, E> value and pattern matching for recoverable failures.',
      ),
    );
    while (!this.is(';') && !this.is('}') && !this.is('eof')) this.consume();
    this.match(';');
    return Parser.rejectedStatement(token);
  }

  /**
   * Parses an if-else conditional branching statement.
   *
   * @returns Parsed if statement AST node.
   */
  // skipcq: JS-R1005
  private parseIfStatement(): FlintStatement {
    const start = this.previous().span;
    const conditionalHint = this.match('likely') ? 'likely' : this.match('unlikely') ? 'unlikely' : undefined;
    const condition = this.parseExpression();
    const consequent = this.parseBlock();
    const alternate = this.match('else') ? this.parseBlock() : undefined;
    return {
      kind: 'if',
      condition,
      consequent,
      ...(alternate === undefined ? {} : { alternate }),
      ...(conditionalHint === undefined ? {} : { conditionalHint }),
      span: mergeSpans(start, this.previous().span),
    };
  }

  /**
   * Parses a standard C-style for-loop statement.
   *
   * @returns Parsed for-loop statement AST node.
   */
  private parseForStatement(): FlintStatement {
    const start = this.previous().span;
    this.diagnostics.push(
      createDiagnostic(
        this.fileName,
        'parse',
        'FLINT-PARSE-076',
        "Imperative 'for' loops are not part of FLINT; use an iterator loop.",
        start,
        'error',
      ),
    );
    this.expect('(', 'FLINT-PARSE-065', "Expected '(' after for.");
    if (!this.is(';')) this.parseForClauseStatement();
    this.expect(';', 'FLINT-PARSE-066', "Expected ';' after a for initializer.");
    this.parseExpression();
    this.expect(';', 'FLINT-PARSE-067', "Expected ';' after a for condition.");
    if (!this.is(')')) this.parseForClauseStatement();
    this.expect(')', 'FLINT-PARSE-068', "Expected ')' after a for clause.");
    this.parseBlock();
    return Parser.rejectedStatement({ kind: 'keyword', text: 'for', span: start });
  }

  /**
   * Dispatches control flow statement parsing (return, yield, if, loops).
   *
   * @returns Parsed statement node, or undefined if not a control flow keyword.
   */
  // skipcq: JS-R1005
  private parseControlFlowStatement(): FlintStatement | undefined {
    if (this.match('if')) return this.parseIfStatement();
    if (this.match('switch')) return this.parseSwitchStatement(this.previous().span);
    if (this.match('while')) {
      const start = this.previous().span;
      const condition = this.parseExpression();
      const body = this.parseBlock();
      return { kind: 'while', condition, body, span: mergeSpans(start, this.previous().span) };
    }
    if (this.match('for')) return this.parseForStatement();
    if (this.match('do')) {
      const start = this.previous().span;
      const body = this.parseBlock();
      this.expect('while', 'FLINT-PARSE-069', "Expected 'while' after a do block.");
      const condition = this.parseExpression();
      const end = this.expect(';', 'FLINT-PARSE-070', "Expected ';' after a do while statement.").span;
      return { kind: 'do-while', body, condition, span: mergeSpans(start, end) };
    }
    return undefined;
  }

  /**
   * Determines whether the current statement position begins an assignment target.
   *
   * @returns True if current position is an assignment.
   */
  private isAssignmentTarget(): boolean {
    return this.current().kind === 'identifier' && (this.isNext('=') || this.isIndexAssignment());
  }

  /**
   * Checks whether the current token is a rejected exception keyword.
   *
   * @returns True if keyword is try, catch, or throw.
   */
  private isExceptionKeyword(): boolean {
    return this.is('throw') || this.is('try') || this.is('catch');
  }

  /**
   * Parses declaration statements or assignment targets.
   *
   * @returns Parsed statement AST node or undefined.
   */
  // skipcq: JS-R1005
  private parseDeclarationOrAssignmentStatement(): FlintStatement | undefined {
    if (this.isAssignmentTarget()) return this.parseAssignmentStatement();
    if (this.match('let')) return this.parseLetStatement();
    if (this.match('return')) return this.parseReturnStatement();
    if (this.match('yield')) return this.parseYieldStatement();
    if (this.match('loop')) return this.parseIteratorLoopStatement();
    if (this.isExceptionKeyword()) return this.parseExceptionRejectStatement();
    return undefined;
  }

  /**
   * Parses a single statement AST node.
   *
   * @returns Parsed statement AST node.
   */
  private parseStatement(): FlintStatement {
    const declOrAssign = this.parseDeclarationOrAssignmentStatement();
    if (declOrAssign !== undefined) return declOrAssign;
    const controlFlow = this.parseControlFlowStatement();
    if (controlFlow !== undefined) return controlFlow;
    const start = this.current().span;
    const expression = this.parseExpression();
    const end = this.expect(';', 'FLINT-PARSE-025', "Expected ';' after an expression.").span;
    return { kind: 'expression-statement', expression, span: mergeSpans(start, end) };
  }

  /**
   * Parses a switch pattern matching statement.
   *
   * @param start - Starting source span.
   * @returns Parsed switch statement AST node.
   */
  // skipcq: JS-R1005
  private parseSwitchStatement(start: FlintSourceSpan): FlintStatement {
    const value = this.parseExpression();
    this.expect('{', 'FLINT-PARSE-084', "Expected '{' after a switch discriminant.");
    const cases: FlintSwitchCase[] = [];
    let defaultCase: readonly FlintStatement[] | undefined;
    while (!this.is('}') && !this.is('eof')) {
      const armStart = this.current().span;
      if (this.match('case')) {
        const caseValue = this.parseSwitchCaseValue();
        this.expect(':', 'FLINT-PARSE-085', "Expected ':' after a switch case.");
        const body = this.parseSwitchArmBody();
        cases.push({ kind: 'switch-case', value: caseValue, body, span: mergeSpans(armStart, this.previous().span) });
      } else if (this.match('default')) {
        this.expect(':', 'FLINT-PARSE-086', "Expected ':' after a switch default arm.");
        defaultCase = this.parseSwitchArmBody();
      } else {
        this.diagnostics.push(
          createDiagnostic(
            this.fileName,
            'parse',
            'FLINT-PARSE-087',
            "Expected 'case' or 'default' in a switch.",
            this.current().span,
          ),
        );
        this.consume();
      }
    }
    const end = this.expect('}', 'FLINT-PARSE-088', "Expected '}' after switch arms.").span;
    return {
      kind: 'switch',
      value,
      cases,
      ...(defaultCase === undefined ? {} : { defaultCase }),
      span: mergeSpans(start, end),
    };
  }

  /**
   * Parses a single case value expression within a switch arm.
   *
   * @returns Parsed case value string or number.
   */
  private parseSwitchCaseValue(): number | string {
    let negative = false;
    if (this.match('-')) negative = true;
    const token = this.current();
    if (token.kind === 'number') {
      this.consume();
      return (negative ? -1 : 1) * Number(token.text);
    }
    const name = this.expectIdentifier('FLINT-PARSE-089', 'Expected an integer or enum switch case.');
    return name ?? '<missing>';
  }

  /**
   * Parses the statement block belonging to a switch case arm.
   *
   * @returns Array of statements in arm body.
   */
  private parseSwitchArmBody(): readonly FlintStatement[] {
    if (this.is('{')) return this.parseBlock();
    return [this.parseStatement()];
  }

  /**
   * Checks if an assignment target has an indexed subscript expression.
   *
   * @returns True if current position is an indexed assignment.
   */
  // skipcq: JS-R1005
  private isIndexAssignment(): boolean {
    if (!this.isNext('[')) return false;
    let offset = 2;
    let depth = 1;
    while (this.tokenAt(this.index + offset) !== undefined && depth > 0) {
      const text = this.tokenAt(this.index + offset)?.text;
      if (text === '[') depth += 1;
      if (text === ']') depth -= 1;
      offset += 1;
    }
    return depth === 0 && this.tokenAt(this.index + offset)?.text === '=';
  }

  /**
   * Parses an initializer or update statement within a for-loop clause.
   *
   * @returns Parsed statement node.
   */
  // skipcq: JS-R1005
  private parseForClauseStatement(): FlintStatement {
    if (this.match('let')) {
      const start = this.previous().span;
      const mutable = this.match('mut');
      const name = this.expectIdentifier('FLINT-PARSE-020', 'Expected a local variable name.');
      this.expect(':', 'FLINT-PARSE-021', "Expected ':' after a local variable name.");
      const type = this.parseType();
      this.expect('=', 'FLINT-PARSE-022', "Expected '=' in a local variable declaration.");
      const value = this.parseExpression();
      return {
        kind: 'let',
        name: name ?? '<missing>',
        ...(mutable ? { mutable: true as const } : {}),
        type,
        value,
        span: mergeSpans(start, value.span),
      };
    }
    if (this.current().kind === 'identifier' && this.isNext('=')) {
      const start = this.consume().span;
      const name = this.previous().text;
      this.consume();
      const value = this.parseExpression();
      return { kind: 'assignment', name, value, span: mergeSpans(start, value.span) };
    }
    const start = this.current().span;
    const expression = this.parseExpression();
    return { kind: 'expression-statement', expression, span: mergeSpans(start, expression.span) };
  }

  /**
   * Parses an expression with binary operator precedence climbing.
   *
   * @param minPrecedence - Minimum operator precedence to consume.
   * @returns Parsed expression AST node.
   */
  private parseExpression(minPrecedence = 0): FlintExpression {
    let left = this.parsePrimary();
    const precedence: Readonly<Record<string, number>> = {
      '||': 1,
      '&&': 2,
      '==': 3,
      '!=': 3,
      '<': 4,
      '<=': 4,
      '>': 4,
      '>=': 4,
      '+': 5,
      '-': 5,
      '*': 6,
      '/': 6,
      '%': 6,
    };
    while (this.current().kind === 'operator' && (precedence[this.current().text] ?? -1) >= minPrecedence) {
      const operator = this.consume();
      const right = this.parseExpression((precedence[operator.text] ?? 0) + 1);
      left = {
        kind: 'binary',
        operator: operator.text as FlintBinaryOperator,
        left,
        right,
        span: mergeSpans(left.span, right.span),
      };
    }
    return left;
  }

  /**
   * Parses a fixed-size or dynamic array literal expression.
   *
   * @param startSpan - Starting source span.
   * @returns Parsed array literal expression AST node.
   */
  private parseArrayLiteral(startSpan: FlintSourceSpan): FlintExpression {
    const elements: FlintExpression[] = [];
    while (!this.is(']') && !this.is('eof')) {
      elements.push(this.parseExpression());
      if (!this.match(',')) break;
    }
    const end = this.expect(']', 'FLINT-PARSE-090', "Expected ']' after an array literal.").span;
    const element =
      elements[0]?.kind === 'literal'
        ? { kind: 'type-name' as const, name: elements[0].type, span: elements[0].span }
        : { kind: 'type-name' as const, name: 'unit' as const, span: startSpan };
    return {
      kind: 'array-literal',
      elements,
      type: {
        kind: 'type-name',
        name: 'unit',
        reference: 'Array',
        arguments: [element],
        length: elements.length,
        span: mergeSpans(startSpan, end),
      },
      span: mergeSpans(startSpan, end),
    };
  }

  /**
   * Parses a contiguous growable vector literal expression.
   *
   * @param startSpan - Starting source span.
   * @returns Parsed vector literal expression AST node.
   */
  private parseVectorLiteral(startSpan: FlintSourceSpan): FlintExpression {
    this.consume();
    this.consume();
    const elements: FlintExpression[] = [];
    while (!this.is(']') && !this.is('eof')) {
      elements.push(this.parseExpression());
      if (!this.match(',')) break;
    }
    const end = this.expect(']', 'FLINT-PARSE-091', "Expected ']' after a vector literal.").span;
    const element =
      elements[0]?.kind === 'literal'
        ? { kind: 'type-name' as const, name: elements[0].type, span: elements[0].span }
        : { kind: 'type-name' as const, name: 'unit' as const, span: startSpan };
    return {
      kind: 'vector-literal',
      elements,
      type: {
        kind: 'type-name',
        name: 'unit',
        reference: 'Vector',
        arguments: [element],
        span: mergeSpans(startSpan, end),
      },
      span: mergeSpans(startSpan, end),
    };
  }

  /**
   * Parses numeric, boolean, or string scalar literal expressions.
   *
   * @param token - Token to inspect.
   * @returns Parsed literal expression AST node or undefined.
   */
  private parseScalarLiteral(token: FlintToken): FlintExpression | undefined {
    if (token.kind === 'number') {
      this.consume();
      return { kind: 'literal', value: Number(token.text), type: 'i32', span: token.span };
    }
    if (token.kind === 'string') {
      this.consume();
      return { kind: 'literal', value: decodeString(token.text), type: 'string', span: token.span };
    }
    if (token.text === 'true' || token.text === 'false') {
      this.consume();
      return { kind: 'literal', value: token.text === 'true', type: 'bool', span: token.span };
    }
    return undefined;
  }

  /**
   * Parses a struct instantiation literal with field values.
   *
   * @param token - Struct type token.
   * @returns Parsed struct literal expression AST node.
   */
  private parseStructLiteral(token: FlintToken): FlintExpression {
    this.consume();
    const fields: Record<string, FlintExpression> = {};
    while (!this.is('}') && !this.is('eof')) {
      const field = this.expectIdentifier('FLINT-PARSE-056', 'Expected a struct field name.');
      this.expect(':', 'FLINT-PARSE-057', "Expected ':' after a struct field name.");
      if (field !== undefined) fields[field] = this.parseExpression();
      if (!this.match(',')) break;
    }
    const end = this.expect('}', 'FLINT-PARSE-058', "Expected '}' after a struct value.").span;
    return {
      kind: 'struct-value',
      type: { kind: 'type-name', name: 'unit', reference: token.text, span: token.span },
      fields,
      span: mergeSpans(token.span, end),
    };
  }

  /**
   * Parses chained member access and array indexing operations.
   *
   * @param initialExpression - Target expression to chain accesses onto.
   * @param initialQualifiedName - Qualified member path string.
   * @param tokenSpan - Starting token span.
   * @returns Chained expression AST node.
   */
  // skipcq: JS-R1005
  private parseMemberAndIndexChain(
    initialExpression: FlintExpression,
    initialQualifiedName: string,
    tokenSpan: FlintSourceSpan,
  ): FlintExpression {
    let expression = initialExpression;
    let qualifiedName = initialQualifiedName;
    while (qualifiedName.length > 0 && this.match('.')) {
      const member = this.expectMemberName('FLINT-PARSE-078', 'Expected a member name after ".".');
      qualifiedName = `${qualifiedName}.${member ?? '<missing>'}`;
      if (this.match('(')) {
        const arguments_: FlintExpression[] = [];
        while (!this.is(')') && !this.is('eof')) {
          arguments_.push(this.parseExpression());
          if (!this.match(',')) break;
        }
        const end = this.expect(')', 'FLINT-PARSE-079', "Expected ')' after member call arguments.").span;
        expression = {
          kind: 'call',
          callee: qualifiedName,
          arguments: arguments_,
          span: mergeSpans(tokenSpan, end),
        };
      } else {
        expression = { kind: 'identifier', name: qualifiedName, span: mergeSpans(tokenSpan, this.previous().span) };
      }
    }
    while (this.match('[')) {
      const index = this.parseExpression();
      const end = this.expect(']', 'FLINT-PARSE-092', "Expected ']' after an index expression.").span;
      expression = { kind: 'index', receiver: expression, index, span: mergeSpans(expression.span, end) };
    }
    return expression;
  }

  /**
   * Parses identifiers, function calls, or field access chains.
   *
   * @param token - Identifier token.
   * @returns Parsed expression AST node.
   */
  // skipcq: JS-R1005
  private parseIdentifierOrCallOrMemberExpression(token: FlintToken): FlintExpression {
    this.consume();
    let qualifiedName = token.text;
    let expression: FlintExpression = { kind: 'identifier', name: qualifiedName, span: token.span };
    if (this.match('::')) {
      const variant = this.expectIdentifier('FLINT-PARSE-093', "Expected an enum variant after '::'.");
      const constructorStart = token.span;
      qualifiedName = `${qualifiedName}::${variant ?? '<missing>'}`;
      const arguments_ = this.is('(') ? this.parseCallArguments('FLINT-PARSE-026') : [];
      expression = {
        kind: 'enum-value',
        type: { kind: 'type-name', name: 'unit', reference: token.text, span: constructorStart },
        variant: variant ?? '<missing>',
        arguments: arguments_,
        span: mergeSpans(constructorStart, this.previous().span),
      };
    } else if (this.match('(')) {
      const arguments_ = this.parseCallArguments('FLINT-PARSE-026', true);
      expression = {
        kind: 'call',
        callee: qualifiedName,
        arguments: arguments_,
        span: mergeSpans(token.span, this.previous().span),
      };
    }
    expression = this.parseMemberAndIndexChain(expression, qualifiedName, token.span);
    if (this.is('{') && this.tokens[this.index + 2]?.text === ':') {
      return this.parseStructLiteral(token);
    }
    return expression;
  }

  /**
   * Checks whether the next tokens represent a vector literal constructor.
   *
   * @param token - Token to inspect.
   * @returns True if starting a vector literal.
   */
  private isVectorLiteralStart(token: FlintToken): boolean {
    return token.kind === 'identifier' && token.text === 'vector' && this.tokenAt(this.index + 1)?.text === '[';
  }

  /**
   * Parses unary prefix operators (!, -, *, &, &mut).
   *
   * @param startSpan - Starting source span.
   * @param operator - Unary operator symbol.
   * @returns Parsed unary expression AST node.
   */
  private parseUnaryExpression(startSpan: FlintSourceSpan, operator: '!' | '-' | '*' | '&' | '&mut'): FlintExpression {
    return {
      kind: 'unary',
      operator,
      operand: this.parsePrimary(),
      span: mergeSpans(startSpan, this.previous().span),
    };
  }

  /**
   * Parses prefix expressions including unary operators and primaries.
   *
   * @returns Parsed prefix expression AST node or undefined.
   */
  // skipcq: JS-R1005
  private parsePrefixExpression(): FlintExpression | undefined {
    const token = this.current();
    if (this.match('match')) return this.parseMatchExpression(token.span);
    if (this.match('[')) return this.parseArrayLiteral(token.span);
    if (this.isVectorLiteralStart(token)) return this.parseVectorLiteral(token.span);
    if (this.match('fn')) {
      const name = this.expectIdentifier('FLINT-PARSE-055', 'Expected a function name after fn.');
      return { kind: 'function-value', name: name ?? '<missing>', span: mergeSpans(token.span, this.previous().span) };
    }
    if (this.match('!')) return this.parseUnaryExpression(token.span, '!');
    if (this.match('-')) return this.parseUnaryExpression(token.span, '-');
    if (this.match('*')) return this.parseUnaryExpression(token.span, '*');
    if (this.match('&')) {
      const isMut = this.match('mut');
      return this.parseUnaryExpression(token.span, isMut ? '&mut' : '&');
    }
    return undefined;
  }

  /**
   * Parses a primary atomic expression or parenthesized group.
   *
   * @returns Parsed primary expression AST node.
   */
  // skipcq: JS-R1005
  private parsePrimary(): FlintExpression {
    const prefix = this.parsePrefixExpression();
    if (prefix !== undefined) return prefix;
    const token = this.current();
    const scalar = this.parseScalarLiteral(token);
    if (scalar !== undefined) return scalar;
    if (token.kind === 'identifier') return this.parseIdentifierOrCallOrMemberExpression(token);
    if (this.match('(')) {
      const start = token.span;
      let expression = this.parseExpression();
      const end = this.expect(')', 'FLINT-PARSE-056', "Expected ')' after expression.").span;
      const initialQualifiedName = expression.kind === 'identifier' ? expression.name : '';
      expression = this.parseMemberAndIndexChain(expression, initialQualifiedName, mergeSpans(start, end));
      return expression;
    }
    if (this.match('{')) return this.parseStructLiteral(token);
    this.diagnostics.push(
      createDiagnostic(this.fileName, 'parse', 'FLINT-PARSE-027', 'Expected an expression.', token.span),
    );
    this.consume();
    return { kind: 'literal', value: 0, type: 'i32', span: token.span };
  }

  /**
   * Parses a pattern match expression.
   *
   * @param start - Starting source span.
   * @returns Parsed match expression AST node.
   */
  private parseMatchExpression(start: FlintSourceSpan): FlintExpression {
    const value = this.parseExpression();
    this.expect('{', 'FLINT-PARSE-059', "Expected '{' after a match value.");
    const arms: FlintMatchArm[] = [];
    while (!this.is('}') && !this.is('eof')) {
      const armStart = this.current().span;
      if (this.match('case')) {
        // The optional case keyword is accepted for readability.
      }
      const pattern = this.parsePattern();
      this.expect('=>', 'FLINT-PARSE-060', "Expected '=>' after a match pattern.");
      const armValue = this.parseExpression();
      const end = this.match(',') ? this.previous().span : armValue.span;
      arms.push({ kind: 'match-arm', pattern, value: armValue, span: mergeSpans(armStart, end) });
    }
    const end = this.expect('}', 'FLINT-PARSE-061', "Expected '}' after match arms.").span;
    return { kind: 'match', value, arms, span: mergeSpans(start, end) };
  }

  /**
   * Parses a literal pattern match arm.
   *
   * @param token - Candidate pattern token.
   * @returns Parsed pattern AST node or undefined.
   */
  private parseLiteralPattern(token: FlintToken): FlintPattern | undefined {
    if (token.kind === 'number') {
      this.consume();
      return { kind: 'literal', value: Number(token.text), span: token.span };
    }
    if (token.kind === 'string') {
      this.consume();
      return { kind: 'literal', value: decodeString(token.text), span: token.span };
    }
    if (token.text === 'true' || token.text === 'false') {
      this.consume();
      return { kind: 'literal', value: token.text === 'true', span: token.span };
    }
    return undefined;
  }

  /**
   * Parses an enum variant pattern match arm with payload destructuring.
   *
   * @param start - Start source span.
   * @param name - Variant constructor name.
   * @returns Parsed variant pattern AST node.
   */
  // skipcq: JS-R1005
  private parseVariantPattern(token: FlintToken): FlintPattern {
    const name = this.expectIdentifier('FLINT-PARSE-062', 'Expected a match pattern.');
    let qualifiedName = name ?? '<missing>';
    if (this.match('::')) {
      const variant = this.expectIdentifier('FLINT-PARSE-094', "Expected an enum variant after '::'.");
      qualifiedName = `${qualifiedName}::${variant ?? '<missing>'}`;
    }
    const bindings: string[] = [];
    if (this.match('(')) {
      while (!this.is(')') && !this.is('eof')) {
        const binding = this.expectIdentifier('FLINT-PARSE-063', 'Expected a pattern binding.');
        if (binding !== undefined) bindings.push(binding);
        if (!this.match(',')) break;
      }
      this.expect(')', 'FLINT-PARSE-064', "Expected ')' after pattern bindings.");
    }
    return { kind: 'variant', name: qualifiedName, bindings, span: mergeSpans(token.span, this.previous().span) };
  }

  /**
   * Parses a pattern matching arm.
   *
   * @returns Parsed pattern AST node.
   */
  private parsePattern(): FlintPattern {
    const token = this.current();
    if (this.match('_')) return { kind: 'wildcard', span: token.span };
    const literal = this.parseLiteralPattern(token);
    if (literal !== undefined) return literal;
    return this.parseVariantPattern(token);
  }

  /**
   * Parses comma-separated arguments for a function call expression.
   *
   * @param code - Diagnostic error code to report on unmatched closing paren.
   * @param allowTrailingComma - Whether trailing comma is permitted.
   * @returns Array of parsed argument expressions.
   */
  private parseCallArguments(code: string, alreadyOpened = false): FlintExpression[] {
    if (!alreadyOpened) this.expect('(', code, "Expected '(' before call arguments.");
    const arguments_: FlintExpression[] = [];
    while (!this.is(')') && !this.is('eof')) {
      arguments_.push(this.parseExpression());
      if (!this.match(',')) break;
    }
    this.expect(')', code, "Expected ')' after call arguments.");
    return arguments_;
  }

  /**
   * Returns the current token in the input stream.
   *
   * @returns Current token.
   */
  private current(): FlintToken {
    while (this.tokens[this.index]?.kind === 'comment') this.index += 1;
    return this.tokens[this.index] ?? this.tokens.at(-1);
  }

  /**
   * Returns the most recently consumed token in the input stream.
   *
   * @returns Previous token.
   */
  private previous(): FlintToken {
    for (let index = this.index - 1; index >= 0; index -= 1) {
      if (this.tokens[index]?.kind !== 'comment') return this.tokens[index];
    }
    return this.current();
  }

  /**
   * Checks whether the current token has the specified text.
   *
   * @param text - Expected token text.
   * @returns True if text matches.
   */
  private is(text: string): boolean {
    return this.current().text === text || (text === 'eof' && this.current().kind === 'eof');
  }

  /**
   * Checks whether the lookahead token has the specified text.
   *
   * @param text - Expected lookahead token text.
   * @returns True if lookahead text matches.
   */
  private isNext(text: string): boolean {
    return this.tokenAt(this.index + 1)?.text === text;
  }

  /**
   * Consumes the current token if it matches the specified text.
   *
   * @param text - Expected token text.
   * @returns True if matched and consumed.
   */
  private match(text: string): boolean {
    if (!this.is(text)) return false;
    this.consume();
    return true;
  }

  /**
   * Consumes and returns the current token, advancing parser state.
   *
   * @returns Consumed token.
   */
  private consume(): FlintToken {
    const token = this.current();
    if (token.kind !== 'eof') this.index += 1;
    return token;
  }

  /**
   * Returns the token at the given relative offset from the current position.
   *
   * @param index - Lookahead offset.
   * @returns Token at offset or undefined.
   */
  private tokenAt(index: number): FlintToken | undefined {
    let candidate = index;
    while (this.tokens[candidate]?.kind === 'comment') candidate += 1;
    return this.tokens[candidate];
  }

  /**
   * Consumes whitespace and doc comments preceding a top-level declaration.
   *
   * @returns Parsed documentation structure or undefined.
   */
  private consumeTopLevelTrivia(): FlintFunction['documentation'] | undefined {
    let documentation: FlintFunction['documentation'];
    while (this.tokens[this.index]?.kind === 'comment') {
      const comment = this.tokens[this.index];
      this.index += 1;
      if (comment.text.startsWith('/**')) documentation = parseFlintDocumentation(comment.text);
    }
    return documentation;
  }

  /**
   * Consumes the current token if it matches, or reports an error diagnostic.
   *
   * @param text - Expected token text.
   * @param code - Diagnostic error code.
   * @param message - Diagnostic actionable hint.
   * @returns Matched token or placeholder.
   */
  private expect(text: string, code: string, message: string): FlintToken {
    if (this.is(text)) return this.consume();
    this.diagnostics.push(createDiagnostic(this.fileName, 'parse', code, message, this.current().span));
    return { kind: 'punctuation', text, span: this.current().span };
  }

  /**
   * Consumes the current token if its kind matches, or reports an error diagnostic.
   *
   * @param kind - Expected token kind.
   * @param code - Diagnostic error code.
   * @param message - Diagnostic actionable hint.
   * @returns Matched token or placeholder.
   */
  private expectKind(kind: FlintToken['kind'], code: string, message: string): FlintToken {
    if (this.current().kind === kind) return this.consume();
    this.diagnostics.push(createDiagnostic(this.fileName, 'parse', code, message, this.current().span));
    return { kind, text: '', span: this.current().span };
  }

  /**
   * Consumes and returns an identifier token text, or reports an error diagnostic.
   *
   * @param code - Diagnostic error code.
   * @param message - Diagnostic actionable hint.
   * @returns Identifier text or undefined.
   */
  private expectIdentifier(code: string, message: string): string | undefined {
    if (this.current().kind === 'identifier') return this.consume().text;
    this.diagnostics.push(createDiagnostic(this.fileName, 'parse', code, message, this.current().span));
    return undefined;
  }

  /**
   * Consumes and returns a valid member name identifier or keyword.
   *
   * @param code - Diagnostic error code.
   * @param message - Diagnostic actionable hint.
   * @returns Member name string or undefined.
   */
  private expectMemberName(code: string, message: string): string | undefined {
    const token = this.current();
    if (token.kind === 'identifier' || token.text === 'iter' || token.text === 'next') return this.consume().text;
    this.diagnostics.push(createDiagnostic(this.fileName, 'parse', code, message, token.span));
    return undefined;
  }

  /**
   * Creates a placeholder error statement node for recovery.
   *
   * @param token - Source token for statement.
   * @returns Placeholder statement node.
   */
  // skipcq: JS-0105
  private static rejectedStatement(token: FlintToken): FlintStatement {
    return {
      kind: 'expression-statement',
      expression: { kind: 'literal', value: 0, type: 'i32', span: token.span },
      span: token.span,
    };
  }
}

/**
 * Merges start and end spans into a contiguous enclosing source span.
 *
 * @param start - Starting source span.
 * @param end - Ending source span.
 * @returns Combined source span.
 */
function mergeSpans(start: FlintSourceSpan, end: FlintSourceSpan): FlintSourceSpan {
  return {
    start: start.start,
    end: end.end,
    line: start.line,
    column: start.column,
    endLine: end.endLine,
    endColumn: end.endColumn,
  };
}

/**
 * Decodes escaped characters within a string literal token.
 *
 * @param token - Raw string literal text.
 * @returns Decoded string content.
 */
function decodeString(token: string): string {
  try {
    return JSON.parse(token) as string;
  } catch {
    return token.slice(1, -1);
  }
}

/**
 * Parses a Flint source string into a module AST and diagnostic report.
 *
 * @param source - Raw Flint source code string.
 * @param fileName - File name used for source span reporting.
 * @param options - Parser options.
 * @returns Parsed module AST and diagnostics.
 */
export function parseFlint(source: string, fileName = '<input>', options: FlintParseOptions = {}): FlintParseResult {
  const lexed = lexFlint(source, fileName);
  const result = new Parser(lexed.tokens, fileName, lexed.diagnostics).parse();
  if (result.module === undefined || options.root === undefined) return result;
  return { ...result, module: { ...result.module, name: deriveFlintModuleId(fileName, options.root) } };
}
