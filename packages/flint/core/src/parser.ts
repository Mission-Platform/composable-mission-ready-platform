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
} from './ast.js';

export { deriveFlintModuleId } from './identity.js';

export interface FlintParseResult {
  readonly module?: FlintModule;
  readonly diagnostics: readonly FlintDiagnostic[];
}

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
]);

class Parser {
  private readonly diagnostics: FlintDiagnostic[];
  private index = 0;

  private readonly tokens: readonly FlintToken[];
  private readonly fileName: string;

  public constructor(tokens: readonly FlintToken[], fileName: string, diagnostics: readonly FlintDiagnostic[]) {
    this.tokens = tokens;
    this.fileName = fileName;
    this.diagnostics = [...diagnostics];
  }

  public parse(): FlintParseResult {
    const start = this.tokens.find(({ kind }) => kind !== 'comment')?.span ?? this.current().span;
    const imports: FlintCapabilityImport[] = [];
    const sourceImports: FlintSourceModuleImport[] = [];
    const structs: FlintStructDeclaration[] = [];
    const enums: FlintEnumDeclaration[] = [];
    const interfaces: FlintInterfaceDeclaration[] = [];
    const functions: FlintFunction[] = [];
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
      if (this.is('import')) {
        if (this.isNext('capability')) imports.push(this.parseImport());
        else sourceImports.push(this.parseSourceImport());
      } else if (this.is('struct') || this.is('record'))
        structs.push(this.parseStruct(documentation, this.is('record')));
      else if (this.is('enum') || (this.is('export') && this.isNext('enum'))) enums.push(this.parseEnum(documentation));
      else if (this.is('interface')) interfaces.push(this.parseInterface(documentation));
      else if (
        this.is('class') ||
        this.is('constructor') ||
        this.is('extends') ||
        this.is('impl') ||
        this.is('new') ||
        this.is('trait')
      )
        this.rejectClassDeclaration();
      else functions.push(this.parseFunction(documentation));
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
      span: mergeSpans(start, end),
    };
    return { ...(module === undefined ? {} : { module }), diagnostics: this.diagnostics };
  }

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

  private parseFunction(documentation?: FlintFunction['documentation']): FlintFunction {
    const start = this.current().span;
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

  private parseStruct(documentation?: FlintFunction['documentation'], record = false): FlintStructDeclaration {
    const start = this.consume().span;
    const name = this.expectIdentifier('FLINT-PARSE-034', 'Expected a struct name.');
    const genericParameters = this.parseGenericParameters();
    this.expect('{', 'FLINT-PARSE-035', "Expected '{' after a struct name.");
    const fields: FlintStructField[] = [];
    while (true) {
      const fieldDocumentation = this.consumeTopLevelTrivia();
      if (this.is('}') || this.is('eof')) break;
      const fieldStart = this.current().span;
      const fieldName = this.expectIdentifier('FLINT-PARSE-036', 'Expected a struct field name.');
      this.expect(':', 'FLINT-PARSE-037', "Expected ':' after a struct field name.");
      const type = this.parseType();
      const end = this.match(',')
        ? this.previous().span
        : this.expect(';', 'FLINT-PARSE-038', "Expected ';' after a struct field.").span;
      fields.push({
        kind: 'struct-field',
        name: fieldName ?? '<missing>',
        type,
        ...(fieldDocumentation === undefined ? {} : { documentation: fieldDocumentation }),
        span: mergeSpans(fieldStart, end),
      });
    }
    const end = this.expect('}', 'FLINT-PARSE-039', "Expected '}' after a struct declaration.").span;
    return {
      kind: 'struct',
      name: name ?? '<missing>',
      ...(record ? { record: true as const } : {}),
      ...(documentation === undefined ? {} : { documentation }),
      genericParameters,
      fields,
      immutable: true,
      span: mergeSpans(start, end),
    };
  }

  private parseEnum(documentation?: FlintFunction['documentation']): FlintEnumDeclaration {
    const start = this.current().span;
    const exported = this.match('export');
    this.expect('enum', 'FLINT-PARSE-040', "Expected 'enum' or 'export enum'.");
    const name = this.expectIdentifier('FLINT-PARSE-040', 'Expected an enum name.');
    const genericParameters = this.parseGenericParameters();
    this.expect('{', 'FLINT-PARSE-041', "Expected '{' after an enum name.");
    const variants: FlintEnumVariant[] = [];
    while (!this.is('}') && !this.is('eof')) {
      const variantStart = this.current().span;
      const variantName = this.expectIdentifier('FLINT-PARSE-042', 'Expected an enum variant name.');
      const fields = this.is('(') ? this.parseVariantFields() : [];
      let tag = variants.length === 0 ? 0 : (variants.at(-1)?.tag ?? 0) + 1;
      if (this.match('=')) {
        let negative = false;
        if (this.match('-')) negative = true;
        const value = this.expectKind('number', 'FLINT-PARSE-045', 'Expected an integer enum discriminant.');
        tag = (negative ? -1 : 1) * Number(value.text || '0');
      }
      const separated = this.match(',');
      const end = separated
        ? this.previous().span
        : variantName === undefined
          ? this.current().span
          : this.previous().span;
      variants.push({
        kind: 'enum-variant',
        name: variantName ?? '<missing>',
        fields,
        tag,
        span: mergeSpans(variantStart, end),
      });
      if (!separated && !this.is('}') && !this.is('eof'))
        this.expect(',', 'FLINT-PARSE-043', "Expected ',' between enum variants.");
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

  private parseType(): FlintTypeName {
    const token = this.current();
    const referenceStart = this.match('&');
    const mutableReference = referenceStart && this.match('mut');
    const typeStart = referenceStart ? token.span : this.current().span;
    if (this.match('[')) {
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
    const nameToken = this.current();
    const name = nameToken.kind === 'identifier' || nameToken.kind === 'keyword' ? nameToken.text : 'unit';
    this.consume();
    const arguments_ = this.is('<') ? this.parseTypeArguments() : undefined;
    const primitive = primitiveTypes.has(name as FlintPrimitiveType) ? (name as FlintPrimitiveType) : 'unit';
    const baseType: FlintTypeName = {
      kind: 'type-name',
      name: primitive,
      ...(primitive === 'unit' && name !== 'unit' ? { reference: name } : {}),
      ...(arguments_ === undefined ? {} : { arguments: arguments_ }),
      ...(referenceStart ? { referenceMode: mutableReference ? ('mut-ref' as const) : ('ref' as const) } : {}),
      span: mergeSpans(typeStart, this.previous().span),
    };
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

  private parseBlock(): FlintStatement[] {
    this.expect('{', 'FLINT-PARSE-018', "Expected '{' to start a block.");
    const statements: FlintStatement[] = [];
    while (!this.is('}') && !this.is('eof')) statements.push(this.parseStatement());
    this.expect('}', 'FLINT-PARSE-019', "Expected '}' to close a block.");
    return statements;
  }

  private parseStatement(): FlintStatement {
    if (this.current().kind === 'identifier' && (this.isNext('=') || this.isIndexAssignment())) {
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
    if (this.match('let')) {
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
    if (this.match('return')) {
      const start = this.previous().span;
      const value = this.is(';') ? undefined : this.parseExpression();
      const end = this.expect(';', 'FLINT-PARSE-024', "Expected ';' after a return statement.").span;
      return { kind: 'return', ...(value === undefined ? {} : { value }), span: mergeSpans(start, end) };
    }
    if (this.match('yield')) {
      const start = this.previous().span;
      const value = this.parseExpression();
      const end = this.expect(';', 'FLINT-PARSE-071', "Expected ';' after a yield statement.").span;
      return { kind: 'yield', value, span: mergeSpans(start, end) };
    }
    if (this.match('loop')) {
      const start = this.previous().span;
      const binding =
        this.expectIdentifier('FLINT-PARSE-072', "Expected an iterator loop binding after 'loop'.") ?? '<missing>';
      this.expect('=', 'FLINT-PARSE-073', "Expected '=' after an iterator loop binding.");
      const iterator = this.parseExpression();
      const body = this.parseBlock();
      return { kind: 'iterator-loop', binding, iterator, body, span: mergeSpans(start, this.previous().span) };
    }
    if (this.is('throw') || this.is('try') || this.is('catch')) {
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
      return this.rejectedStatement(token);
    }
    if (this.match('if')) {
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
    if (this.match('switch')) return this.parseSwitchStatement(this.previous().span);
    if (this.match('while')) {
      const start = this.previous().span;
      const condition = this.parseExpression();
      const body = this.parseBlock();
      return { kind: 'while', condition, body, span: mergeSpans(start, this.previous().span) };
    }
    if (this.match('for')) {
      const start = this.previous().span;
      this.diagnostics.push(
        createDiagnostic(
          this.fileName,
          'parse',
          'FLINT-PARSE-076',
          "Imperative 'for' loops are not part of FWS; use an iterator loop.",
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
      return this.rejectedStatement({ kind: 'keyword', text: 'for', span: start });
    }
    if (this.match('do')) {
      const start = this.previous().span;
      const body = this.parseBlock();
      this.expect('while', 'FLINT-PARSE-069', "Expected 'while' after a do block.");
      const condition = this.parseExpression();
      const end = this.expect(';', 'FLINT-PARSE-070', "Expected ';' after a do while statement.").span;
      return { kind: 'do-while', body, condition, span: mergeSpans(start, end) };
    }
    const start = this.current().span;
    const expression = this.parseExpression();
    const end = this.expect(';', 'FLINT-PARSE-025', "Expected ';' after an expression.").span;
    return { kind: 'expression-statement', expression, span: mergeSpans(start, end) };
  }

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

  private parseSwitchArmBody(): readonly FlintStatement[] {
    if (this.is('{')) return this.parseBlock();
    return [this.parseStatement()];
  }

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

  private parsePrimary(): FlintExpression {
    const token = this.current();
    if (this.match('match')) return this.parseMatchExpression(token.span);
    if (this.match('[')) {
      const elements: FlintExpression[] = [];
      while (!this.is(']') && !this.is('eof')) {
        elements.push(this.parseExpression());
        if (!this.match(',')) break;
      }
      const end = this.expect(']', 'FLINT-PARSE-090', "Expected ']' after an array literal.").span;
      const element =
        elements[0]?.kind === 'literal'
          ? { kind: 'type-name' as const, name: elements[0].type, span: elements[0].span }
          : { kind: 'type-name' as const, name: 'unit' as const, span: token.span };
      return {
        kind: 'array-literal',
        elements,
        type: {
          kind: 'type-name',
          name: 'unit',
          reference: 'Array',
          arguments: [element],
          length: elements.length,
          span: mergeSpans(token.span, end),
        },
        span: mergeSpans(token.span, end),
      };
    }
    if (token.kind === 'identifier' && token.text === 'vector' && this.tokenAt(this.index + 1)?.text === '[') {
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
          : { kind: 'type-name' as const, name: 'unit' as const, span: token.span };
      return {
        kind: 'vector-literal',
        elements,
        type: {
          kind: 'type-name',
          name: 'unit',
          reference: 'Vector',
          arguments: [element],
          span: mergeSpans(token.span, end),
        },
        span: mergeSpans(token.span, end),
      };
    }
    if (this.match('fn')) {
      const name = this.expectIdentifier('FLINT-PARSE-055', 'Expected a function name after fn.');
      return { kind: 'function-value', name: name ?? '<missing>', span: mergeSpans(token.span, this.previous().span) };
    }
    if (this.match('!') || this.match('-'))
      return {
        kind: 'unary',
        operator: this.previous().text as '!' | '-',
        operand: this.parsePrimary(),
        span: mergeSpans(token.span, this.previous().span),
      };
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
    if (token.kind === 'identifier') {
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
      while (this.match('.')) {
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
            span: mergeSpans(token.span, end),
          };
        } else {
          expression = { kind: 'identifier', name: qualifiedName, span: mergeSpans(token.span, this.previous().span) };
        }
      }
      while (this.match('[')) {
        const index = this.parseExpression();
        const end = this.expect(']', 'FLINT-PARSE-092', "Expected ']' after an index expression.").span;
        expression = { kind: 'index', receiver: expression, index, span: mergeSpans(expression.span, end) };
      }
      if (this.is('{') && this.tokens[this.index + 2]?.text === ':') {
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
      return expression;
    }
    this.diagnostics.push(
      createDiagnostic(this.fileName, 'parse', 'FLINT-PARSE-027', 'Expected an expression.', token.span),
    );
    this.consume();
    return { kind: 'literal', value: 0, type: 'i32', span: token.span };
  }

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

  private parsePattern(): FlintPattern {
    const token = this.current();
    if (this.match('_')) return { kind: 'wildcard', span: token.span };
    if (token.kind === 'number' || token.kind === 'string' || token.text === 'true' || token.text === 'false') {
      this.consume();
      return {
        kind: 'literal',
        value:
          token.kind === 'number'
            ? Number(token.text)
            : token.kind === 'string'
              ? decodeString(token.text)
              : token.text === 'true',
        span: token.span,
      };
    }
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

  private current(): FlintToken {
    while (this.tokens[this.index]?.kind === 'comment') this.index += 1;
    return this.tokens[this.index] ?? this.tokens.at(-1);
  }

  private previous(): FlintToken {
    for (let index = this.index - 1; index >= 0; index -= 1) {
      if (this.tokens[index]?.kind !== 'comment') return this.tokens[index];
    }
    return this.current();
  }

  private is(text: string): boolean {
    return this.current().text === text || (text === 'eof' && this.current().kind === 'eof');
  }

  private isNext(text: string): boolean {
    return this.tokenAt(this.index + 1)?.text === text;
  }

  private match(text: string): boolean {
    if (!this.is(text)) return false;
    this.consume();
    return true;
  }

  private consume(): FlintToken {
    const token = this.current();
    if (token.kind !== 'eof') this.index += 1;
    return token;
  }

  private tokenAt(index: number): FlintToken | undefined {
    let candidate = index;
    while (this.tokens[candidate]?.kind === 'comment') candidate += 1;
    return this.tokens[candidate];
  }

  private consumeTopLevelTrivia(): FlintFunction['documentation'] | undefined {
    let documentation: FlintFunction['documentation'];
    while (this.tokens[this.index]?.kind === 'comment') {
      const comment = this.tokens[this.index];
      this.index += 1;
      if (comment.text.startsWith('/**')) documentation = parseFlintDocumentation(comment.text);
    }
    return documentation;
  }

  private expect(text: string, code: string, message: string): FlintToken {
    if (this.is(text)) return this.consume();
    this.diagnostics.push(createDiagnostic(this.fileName, 'parse', code, message, this.current().span));
    return { kind: 'punctuation', text, span: this.current().span };
  }

  private expectKind(kind: FlintToken['kind'], code: string, message: string): FlintToken {
    if (this.current().kind === kind) return this.consume();
    this.diagnostics.push(createDiagnostic(this.fileName, 'parse', code, message, this.current().span));
    return { kind, text: '', span: this.current().span };
  }

  private expectIdentifier(code: string, message: string): string | undefined {
    if (this.current().kind === 'identifier') return this.consume().text;
    this.diagnostics.push(createDiagnostic(this.fileName, 'parse', code, message, this.current().span));
    return undefined;
  }

  private expectMemberName(code: string, message: string): string | undefined {
    const token = this.current();
    if (token.kind === 'identifier' || token.text === 'iter' || token.text === 'next') return this.consume().text;
    this.diagnostics.push(createDiagnostic(this.fileName, 'parse', code, message, token.span));
    return undefined;
  }

  private rejectedStatement(token: FlintToken): FlintStatement {
    return {
      kind: 'expression-statement',
      expression: { kind: 'literal', value: 0, type: 'i32', span: token.span },
      span: token.span,
    };
  }
}

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

function decodeString(token: string): string {
  try {
    return JSON.parse(token) as string;
  } catch {
    return token.slice(1, -1);
  }
}

export function parseFlint(source: string, fileName = '<input>', options: FlintParseOptions = {}): FlintParseResult {
  const lexed = lexFlint(source, fileName);
  const result = new Parser(lexed.tokens, fileName, lexed.diagnostics).parse();
  if (result.module === undefined || options.root === undefined) return result;
  return { ...result, module: { ...result.module, name: deriveFlintModuleId(fileName, options.root) } };
}
