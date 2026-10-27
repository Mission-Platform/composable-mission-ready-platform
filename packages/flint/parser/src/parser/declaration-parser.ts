import {
  createDiagnostic,
  type FlintAttributeAnnotation,
  type FlintCapabilityImport,
  type FlintComptimeStatement,
  type FlintEnumDeclaration,
  type FlintEnumVariant,
  type FlintForeignCapabilityDeclaration,
  type FlintForeignFunctionDeclaration,
  type FlintForeignFunctionParameter,
  type FlintFunction,
  type FlintEventConfiguration,
  type FlintEventDeclaration,
  type FlintInterfaceDeclaration,
  type FlintInterfaceFunction,
  type FlintMacroDeclaration,
  type FlintOpaqueForeignTypeDeclaration,
  type FlintParameter,
  type FlintModelDeclaration,
  type FlintPropertyConfiguration,
  type FlintPropertyDeclaration,
  type FlintSourceModuleImportBinding,
  type FlintSourceModuleImport,
  type FlintStructDeclaration,
  type FlintStructField,
  type FlintStructRepr,
} from "@mission-platform/flint-ast";

import { AttributeParser } from "./attribute-parser.js";
import { decodeString, mergeSpans, ParserContext } from "./context.js";

import type { ExpressionParser } from "./expression-parser.js";
import type { StatementParser } from "./statement-parser.js";
import type { TypeParser } from "./type-parser.js";

export interface TopLevelDeclarations {
  readonly imports: FlintCapabilityImport[];
  readonly sourceImports: FlintSourceModuleImport[];
  readonly macros: FlintMacroDeclaration[];
  readonly comptimeStatements: FlintComptimeStatement[];
  readonly structs: FlintStructDeclaration[];
  readonly enums: FlintEnumDeclaration[];
  readonly interfaces: FlintInterfaceDeclaration[];
  readonly functions: FlintFunction[];
  readonly propertyConfigurations: FlintPropertyConfiguration[];
  readonly eventConfigurations: FlintEventConfiguration[];
  readonly models: FlintModelDeclaration[];
  readonly foreignCapabilities: FlintForeignCapabilityDeclaration[];
  readonly opaqueForeignTypes: FlintOpaqueForeignTypeDeclaration[];
}

/**
 * Sub-parser responsible for top-level declarations, imports, capabilities, structs, records, enums, interfaces, and functions.
 */
export class DeclarationParser {
  private readonly context: ParserContext;
  private readonly typeParser: TypeParser;
  private readonly expressionParser: ExpressionParser;
  private readonly statementParser: StatementParser;
  private readonly attributeParser: AttributeParser;

  public constructor(
    context: ParserContext,
    typeParser: TypeParser,
    expressionParser: ExpressionParser,
    statementParser: StatementParser,
    attributeParser?: AttributeParser,
  ) {
    this.context = context;
    this.typeParser = typeParser;
    this.expressionParser = expressionParser;
    this.statementParser = statementParser;
    this.attributeParser =
      attributeParser ?? new AttributeParser(context, expressionParser);
  }

  /**
   * Resynchronizes top-level module parser state to the next declaration keyword.
   */
  // skipcq: JS-R1005
  public synchronizeTopLevel(): void {
    while (!this.context.is("eof") && !this.context.is("}")) {
      if (
        this.context.is("fn") ||
        this.context.is("export") ||
        this.context.is("struct") ||
        this.context.is("record") ||
        this.context.is("enum") ||
        this.context.is("interface") ||
        this.context.is("import") ||
        this.context.is("foreign") ||
        this.context.is("opaque") ||
        this.context.is("comptime") ||
        this.context.is("macro") ||
        this.context.is("derive") ||
        this.context.is("setup") ||
        this.context.is("event") ||
        this.context.is("emit") ||
        this.context.is("property") ||
        this.context.is("properties") ||
        this.context.is("emits") ||
        this.context.is("events") ||
        this.context.is("model") ||
        this.context.is("#")
      ) {
        return;
      }
      this.context.consume();
    }
  }

  /**
   * Parses a macro or derive declaration.
   *
   * @param _documentation - Optional documentation comment.
   * @returns Parsed macro declaration AST node.
   */
  private parseMacroDeclaration(
    _documentation?: FlintFunction["documentation"],
  ): FlintMacroDeclaration {
    const start = this.context.current().span;
    const isDerive = this.context.match("derive");
    if (!isDerive)
      this.context.expect(
        "macro",
        "FLINT-PARSE-120",
        "Expected 'macro' or 'derive'.",
      );
    const name = this.context.expectIdentifier(
      "FLINT-PARSE-121",
      "Expected macro name.",
    );
    const parameters = this.parseParameters();
    const body = this.statementParser.parseBlock();
    return {
      kind: "macro-declaration",
      name: name ?? "<missing>",
      macroType: isDerive ? "derive" : "procedural",
      parameters,
      body,
      span: mergeSpans(start, this.context.previous().span),
    };
  }

  /**
   * Parses a single top-level module declaration item.
   *
   * @param documentation - Optional documentation comment attached to declaration.
   * @param declarations - Target container collecting parsed declarations.
   */
  // skipcq: JS-R1005
  public parseTopLevelDeclaration(
    documentation: FlintFunction["documentation"] | undefined,
    declarations: TopLevelDeclarations,
  ): void {
    const attributes: FlintAttributeAnnotation[] = [];
    let repr: FlintStructRepr | undefined;
    while (this.context.is("#") || this.context.is("@")) {
      const parsedAttr = this.attributeParser.parseAttributeAnnotation();
      if (parsedAttr !== undefined) {
        attributes.push(parsedAttr.annotation);
        if (parsedAttr.repr !== undefined) {
          repr = parsedAttr.repr;
        }
      }
      const attributeDocument = this.context.consumeTopLevelTrivia();
      if (attributeDocument !== undefined) documentation = attributeDocument;
    }

    if (this.context.is("comptime")) {
      const start = this.context.consume().span;
      declarations.comptimeStatements.push(
        this.statementParser.parseComptimeStatement(start),
      );
    } else if (this.context.is("macro") || this.context.is("derive")) {
      declarations.macros.push(this.parseMacroDeclaration(documentation));
    } else if (this.context.is("foreign")) {
      declarations.foreignCapabilities.push(this.parseForeignCapability());
    } else if (this.context.is("opaque") && this.context.isNext("foreign")) {
      declarations.opaqueForeignTypes.push(this.parseOpaqueForeignType());
    } else if (this.context.is("import")) {
      this.parseTopLevelImport(declarations);
    } else if (this.context.is("property") || this.context.is("properties")) {
      declarations.propertyConfigurations.push(
        this.parsePropertyConfiguration(),
      );
    } else if (this.context.is("emits") || this.context.is("events")) {
      declarations.eventConfigurations.push(this.parseEventConfiguration());
    } else if (this.context.is("model")) {
      declarations.models.push(this.parseModelDeclaration());
    } else if (
      this.context.is("struct") ||
      this.context.is("record") ||
      (this.context.is("export") &&
        (this.context.isNext("struct") || this.context.isNext("record")))
    ) {
      declarations.structs.push(
        this.parseStruct(
          documentation,
          this.context.is("record") ||
            (this.context.is("export") && this.context.isNext("record")),
          repr,
          attributes,
        ),
      );
    } else if (this.context.current().text === "c_struct") {
      this.context.diagnostics.push(
        createDiagnostic(
          this.context.fileName,
          "parse",
          "FLINT-PARSE-034",
          "The 'c_struct' keyword is removed; use '#[repr(C)] struct' instead.",
          this.context.current().span,
        ),
      );
      this.context.consume();
      while (!this.context.is("}") && !this.context.is("eof")) {
        this.context.consume();
      }
      if (this.context.is("}")) this.context.consume();
    } else if (
      this.context.is("enum") ||
      (this.context.is("export") && this.context.isNext("enum"))
    ) {
      declarations.enums.push(this.parseEnum(documentation, attributes));
    } else if (
      this.context.is("interface") ||
      (this.context.is("export") && this.context.isNext("interface"))
    ) {
      declarations.interfaces.push(
        this.parseInterface(documentation, attributes),
      );
    } else if (this.context.isDisallowedClassKeyword()) {
      this.rejectClassDeclaration();
    } else {
      declarations.functions.push(
        this.parseFunction(documentation, attributes),
      );
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
      const documentation = this.context.consumeTopLevelTrivia();
      if (this.context.is("}") || this.context.is("eof")) break;
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
    const start = this.context.consume().span;
    const abiToken = this.context.expectKind(
      "string",
      "FLINT-PARSE-110",
      'Expected ABI string (e.g. "C") after foreign.',
    );
    const decodedAbi =
      abiToken === undefined ? "C" : decodeString(abiToken.text);
    if (decodedAbi !== "C") {
      this.context.diagnostics.push(
        createDiagnostic(
          this.context.fileName,
          "parse",
          "FLINT-PARSE-074",
          `Unsupported foreign ABI '${decodedAbi}'; only "C" is currently supported.`,
          abiToken?.span ?? start,
        ),
      );
    }
    const abi = "C";
    this.context.expect(
      "capability",
      "FLINT-PARSE-111",
      "Expected 'capability' after foreign ABI.",
    );
    const libraryToken = this.context.expectKind(
      "string",
      "FLINT-PARSE-112",
      "Expected library name string after capability.",
    );
    const library =
      libraryToken === undefined
        ? "<missing>"
        : decodeString(libraryToken.text);
    const openToken = this.context.expect(
      "{",
      "FLINT-PARSE-113",
      "Expected '{' to start foreign capability block.",
    );
    const functions = this.parseForeignCapabilityFunctions();
    const end = this.context.expectClosingDelimiter(
      "}",
      openToken.span,
      "FLINT-PARSE-114",
      "Expected '}' after foreign capability block.",
    ).span;
    return {
      kind: "foreign-capability",
      abi,
      library,
      callingConvention: "wasm-c-abi",
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
    while (!this.context.is(")") && !this.context.is("eof")) {
      const parameterStart = this.context.current().span;
      const parameterName = this.context.expectIdentifier(
        "FLINT-PARSE-118",
        "Expected parameter name.",
      );
      this.context.expect(
        ":",
        "FLINT-PARSE-119",
        "Expected ':' after parameter name.",
      );
      const type = this.typeParser.parseType();
      const parameterEnd = this.context.previous().span;
      parameters.push({
        name: parameterName ?? "<missing>",
        type,
        span: mergeSpans(parameterStart, parameterEnd),
      });
      if (!this.context.match(",")) break;
    }
    return parameters;
  }

  /**
   * Parses an individual foreign function prototype inside a foreign capability block.
   *
   * @param documentation - Optional documentation comment.
   * @returns Parsed foreign function declaration AST node.
   */
  private parseForeignFunction(
    documentation?: FlintFunction["documentation"],
  ): FlintForeignFunctionDeclaration {
    const start = this.context.current().span;
    this.context.expect(
      "fn",
      "FLINT-PARSE-115",
      "Expected 'fn' in foreign capability declaration.",
    );
    const name = this.context.expectIdentifier(
      "FLINT-PARSE-116",
      "Expected function name in foreign capability declaration.",
    );
    const openToken = this.context.expect(
      "(",
      "FLINT-PARSE-117",
      "Expected '(' after function name.",
    );
    const parameters = this.parseForeignParameters();
    this.context.expectClosingDelimiter(
      ")",
      openToken.span,
      "FLINT-PARSE-120",
      "Expected ')' after parameter list.",
    );
    this.context.expect(
      "->",
      "FLINT-PARSE-121",
      "Expected '->' after parameter list.",
    );
    const result = this.typeParser.parseType();
    const end = this.context.expect(
      ";",
      "FLINT-PARSE-122",
      "Expected ';' after foreign function declaration.",
    ).span;
    return {
      kind: "foreign-function",
      name: name ?? "<missing>",
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
    const start = this.context.consume().span;
    this.context.expect(
      "foreign",
      "FLINT-PARSE-123",
      "Expected 'foreign' after 'opaque'.",
    );
    this.context.expect(
      "type",
      "FLINT-PARSE-124",
      "Expected 'type' after 'opaque foreign'.",
    );
    const name = this.context.expectIdentifier(
      "FLINT-PARSE-125",
      "Expected type name after opaque foreign type.",
    );
    const end = this.context.expect(
      ";",
      "FLINT-PARSE-126",
      "Expected ';' after opaque foreign type declaration.",
    ).span;
    return {
      kind: "opaque-foreign-type",
      name: name ?? "<missing>",
      span: mergeSpans(start, end),
    };
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
    if (this.context.isNext("capability"))
      declarations.imports.push(this.parseImport());
    else declarations.sourceImports.push(this.parseSourceImport());
  }

  /**
   * Parses a source module import statement binding an external module.
   *
   * @returns Parsed source module import AST node.
   */
  private parseSourceImport(): FlintSourceModuleImport {
    const start = this.context.consume().span;
    if (this.context.is("module")) this.context.consume();

    if (this.context.current().kind === "string") {
      const source = this.context.expectKind(
        "string",
        "FLINT-PARSE-026",
        "Expected a quoted source module path.",
      );
      this.context.expect(
        "as",
        "FLINT-PARSE-027",
        "Expected 'as' followed by the source module alias.",
      );
      const alias = this.context.expectIdentifier(
        "FLINT-PARSE-028",
        "Expected a source module alias.",
      );
      const end = this.context.expect(
        ";",
        "FLINT-PARSE-029",
        "Expected ';' after a source module import.",
      ).span;
      const localName = alias ?? "<missing>";
      return {
        kind: "source-module-import",
        source: source === undefined ? "<missing>" : decodeString(source.text),
        alias: localName,
        span: mergeSpans(start, end),
      };
    }

    const bindings: FlintSourceModuleImportBinding[] = [];
    if (this.context.is("{")) {
      this.context.consume();
      const localNames = new Set<string>();
      while (!this.context.is("}") && !this.context.is("eof")) {
        const bindingStart = this.context.current().span;
        const imported = this.context.expectIdentifier(
          "FLINT-PARSE-030",
          "Expected an imported name.",
        );
        const importedName = imported ?? "<missing>";
        const local = this.context.match("as")
          ? this.context.expectIdentifier(
              "FLINT-PARSE-031",
              "Expected a local name after import alias.",
            )
          : imported;
        const localName = local ?? "<missing>";
        if (localNames.has(localName)) {
          this.context.diagnostics.push(
            createDiagnostic(
              this.context.fileName,
              "parse",
              "FLINT-PARSE-032",
              `Duplicate imported local name '${localName}'.`,
              bindingStart,
              "error",
              "Rename one binding or remove the duplicate import.",
            ),
          );
        }
        localNames.add(localName);
        bindings.push({
          kind: "named",
          importedName,
          localName,
          span: bindingStart,
        });
        if (!this.context.match(",")) break;
      }
      this.context.expect(
        "}",
        "FLINT-PARSE-033",
        "Expected '}' after named imports.",
      );
      this.context.expect(
        "from",
        "FLINT-PARSE-034",
        "Expected 'from' after named imports.",
      );
    } else if (this.context.is("*")) {
      const bindingStart = this.context.consume().span;
      this.context.expect("as", "FLINT-PARSE-035", "Expected 'as' after '*'.");
      const local = this.context.expectIdentifier(
        "FLINT-PARSE-036",
        "Expected a namespace import name.",
      );
      const localName = local ?? "<missing>";
      bindings.push({
        kind: "namespace",
        localName,
        span: bindingStart,
      });
      this.context.expect(
        "from",
        "FLINT-PARSE-037",
        "Expected 'from' after namespace import.",
      );
    } else {
      const invalidToken = this.context.current();
      this.context.diagnostics.push(
        createDiagnostic(
          this.context.fileName,
          "parse",
          "FLINT-PARSE-038",
          "Expected named imports or '*'; default imports are not supported.",
          invalidToken.span,
          "error",
          'Use `import { Name } from "./module.flint"` or `import * as Module from "./module.flint"`.',
        ),
      );
      while (!this.context.is(";") && !this.context.is("eof"))
        this.context.consume();
      const end = this.context.is(";")
        ? this.context.consume().span
        : this.context.current().span;
      return {
        kind: "source-module-import",
        source: "<invalid>",
        alias: "<missing>",
        bindingKind: "named",
        bindings: [],
        span: mergeSpans(start, end),
      };
    }

    const source = this.context.expectKind(
      "string",
      "FLINT-PARSE-039",
      "Expected a quoted source module path.",
    );
    const end = this.context.expect(
      ";",
      "FLINT-PARSE-040",
      "Expected ';' after a source module import.",
    ).span;
    const alias = bindings[0]?.localName ?? "<missing>";
    return {
      kind: "source-module-import",
      source: source === undefined ? "<missing>" : decodeString(source.text),
      alias,
      bindingKind: bindings[0]?.kind ?? "named",
      bindings,
      span: mergeSpans(start, end),
    };
  }

  /**
   * Parses a host capability import statement binding a host interface.
   *
   * @returns Parsed capability import AST node.
   */
  private parseImport(): FlintCapabilityImport {
    const start = this.context.consume().span;
    this.context.expect(
      "capability",
      "FLINT-PARSE-005",
      "Expected 'capability' after 'import'.",
    );
    const capabilityToken = this.context.expectKind(
      "string",
      "FLINT-PARSE-006",
      "Expected a quoted capability name.",
    );
    this.context.expect(
      "as",
      "FLINT-PARSE-007",
      "Expected 'as' followed by the local capability alias.",
    );
    const alias = this.context.expectIdentifier(
      "FLINT-PARSE-008",
      "Expected a capability alias.",
    );
    const parameters = this.parseParameters();
    this.context.expect(
      "->",
      "FLINT-PARSE-009",
      "Expected '->' before the capability result type.",
    );
    const result = this.typeParser.parseType();
    const end = this.context.expect(
      ";",
      "FLINT-PARSE-010",
      "Expected ';' after a capability declaration.",
    ).span;
    return {
      kind: "capability-import",
      capability: decodeString(capabilityToken.text),
      alias: alias ?? "<missing>",
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
    inlinePolicy?: FlintFunction["inlinePolicy"];
  } {
    let exported = false;
    let iterable = false;
    let inlinePolicy: FlintFunction["inlinePolicy"];
    while (true) {
      if (this.context.match("export")) exported = true;
      else if (this.context.match("iter")) iterable = true;
      else if (this.context.match("inline")) inlinePolicy = "always";
      else if (this.context.match("noinline")) inlinePolicy = "noinline";
      else break;
    }
    return { exported, iterable, inlinePolicy };
  }

  /**
   * Parses function or capability parameter lists enclosed in parentheses.
   *
   * @returns Array of parsed parameter AST nodes.
   */
  // skipcq: JS-R1005
  public parseParameters(): FlintParameter[] {
    const openToken = this.context.expect(
      "(",
      "FLINT-PARSE-014",
      "Expected '('.",
    );
    const parameters: FlintParameter[] = [];
    while (!this.context.is(")") && !this.context.is("eof")) {
      const start = this.context.current().span;
      const mutable = this.context.match("mut");
      const name = this.context.expectIdentifier(
        "FLINT-PARSE-015",
        "Expected a parameter name.",
      );
      this.context.expect(
        ":",
        "FLINT-PARSE-016",
        "Expected ':' after a parameter name.",
      );
      const type = this.typeParser.parseType();
      parameters.push({
        kind: "parameter",
        name: name ?? "<missing>",
        ...(mutable ? { mutable: true as const } : {}),
        type,
        span: mergeSpans(start, type.span),
      });
      if (!this.context.match(",")) break;
    }
    this.context.expectClosingDelimiter(
      ")",
      openToken.span,
      "FLINT-PARSE-017",
      "Expected ')'.",
    );
    return parameters;
  }

  /**
   * Parses a function declaration AST node.
   *
   * @param documentation - Optional attached documentation comment.
   * @param attributes - Optional attached attribute annotations.
   * @returns Complete function declaration AST node.
   */
  private parseFunction(
    documentation?: FlintFunction["documentation"],
    attributes?: readonly FlintAttributeAnnotation[],
  ): FlintFunction {
    const start = this.context.current().span;
    const { exported, iterable, inlinePolicy } = this.parseFunctionModifiers();
    let role: FlintFunction["role"];
    let name: string | undefined;
    if (this.context.match("setup")) {
      role = "setup";
      name = "setup";
    } else if (this.context.match("event")) {
      role = "event-handler";
      this.context.expect(
        "fn",
        "FLINT-PARSE-011",
        "Expected 'fn' after 'event'.",
      );
    } else if (this.context.match("emit")) {
      role = "event-emitter";
      this.context.expect(
        "fn",
        "FLINT-PARSE-011",
        "Expected 'fn' after 'emit'.",
      );
    } else {
      this.context.expect(
        "fn",
        "FLINT-PARSE-011",
        "Expected 'fn', 'setup', 'event fn', or 'emit fn'.",
      );
    }
    const parsedName =
      name ??
      this.context.expectIdentifier(
        "FLINT-PARSE-012",
        "Expected a function name.",
      );
    const genericParameters = this.typeParser.parseGenericParameters();
    const parameters = this.parseParameters();
    this.context.expect(
      "->",
      "FLINT-PARSE-013",
      "Expected '->' before the function result type.",
    );
    const result = this.typeParser.parseType();
    const body = this.statementParser.parseBlock();
    return {
      kind: "function",
      name: parsedName ?? "<missing>",
      exported,
      ...(role === undefined ? {} : { role }),
      ...(iterable ? { iterable: true } : {}),
      ...(inlinePolicy === undefined ? {} : { inlinePolicy }),
      ...(attributes === undefined || attributes.length === 0
        ? {}
        : { attributes }),
      ...(documentation === undefined ? {} : { documentation }),
      genericParameters,
      parameters,
      result,
      body,
      span: mergeSpans(start, this.context.previous().span),
    };
  }

  /** Parses a module-level `properties { name: Type [= value]; }` declaration. */
  private parsePropertyConfiguration(): FlintPropertyConfiguration {
    const start = this.context.consume().span;
    if (this.context.is("property")) this.context.consume();
    const open = this.context.expect(
      "{",
      "FLINT-SETUP-001",
      "Expected '{' after a property configuration.",
    );
    const properties: FlintPropertyDeclaration[] = [];
    while (!this.context.is("}") && !this.context.is("eof")) {
      const propertyStart = this.context.current().span;
      const readonly = this.context.match("readonly");
      const name = this.context.expectIdentifier(
        "FLINT-SETUP-002",
        "Expected a property name.",
      );
      this.context.expect(
        ":",
        "FLINT-SETUP-003",
        "Expected ':' after a property name.",
      );
      const type = this.typeParser.parseType();
      const defaultValue = this.context.match("=")
        ? this.expressionParser.parseExpression()
        : undefined;
      const end = this.context.match(",")
        ? this.context.previous().span
        : this.context.expect(
            ";",
            "FLINT-SETUP-004",
            "Expected ';' after a property declaration.",
          ).span;
      properties.push({
        kind: "property-declaration",
        name: name ?? "<missing>",
        type,
        ...(defaultValue === undefined ? {} : { defaultValue }),
        ...(readonly ? { readonly: true as const } : {}),
        span: mergeSpans(propertyStart, end),
      });
    }
    const end = this.context.expectClosingDelimiter(
      "}",
      open.span,
      "FLINT-SETUP-005",
      "Expected '}' after a property configuration.",
    );
    return {
      kind: "property-configuration",
      properties,
      span: mergeSpans(start, end.span),
    };
  }

  /** Parses a module-level `emits { event(payload: Type); }` declaration. */
  private parseEventConfiguration(): FlintEventConfiguration {
    const start = this.context.consume().span;
    const open = this.context.expect(
      "{",
      "FLINT-SETUP-006",
      "Expected '{' after an event-emission configuration.",
    );
    const events: FlintEventDeclaration[] = [];
    while (!this.context.is("}") && !this.context.is("eof")) {
      const eventStart = this.context.current().span;
      const name = this.context.expectIdentifier(
        "FLINT-SETUP-007",
        "Expected an emitted event name.",
      );
      const parameters = this.parseParameters();
      const end = this.context.match(",")
        ? this.context.previous().span
        : this.context.expect(
            ";",
            "FLINT-SETUP-008",
            "Expected ';' after an emitted event declaration.",
          ).span;
      events.push({
        kind: "event-declaration",
        name: name ?? "<missing>",
        parameters,
        span: mergeSpans(eventStart, end),
      });
    }
    const end = this.context.expectClosingDelimiter(
      "}",
      open.span,
      "FLINT-SETUP-009",
      "Expected '}' after an event-emission configuration.",
    );
    return {
      kind: "event-configuration",
      events,
      span: mergeSpans(start, end.span),
    };
  }

  /** Parses a neutral controlled-value model declaration. */
  private parseModelDeclaration(): FlintModelDeclaration {
    const start = this.context.consume().span;
    const name = this.context.expectIdentifier(
      "FLINT-SETUP-010",
      "Expected a model property name.",
    );
    this.context.expect(
      ":",
      "FLINT-SETUP-011",
      "Expected ':' after a model property name.",
    );
    const type = this.typeParser.parseType();
    const end = this.context.expect(
      ";",
      "FLINT-SETUP-012",
      "Expected ';' after a model declaration.",
    ).span;
    return {
      kind: "model-declaration",
      name: name ?? "<missing>",
      type,
      updateEventName: `update:${name ?? "<missing>"}`,
      span: mergeSpans(start, end),
    };
  }

  /**
   * Parses a single field declaration within a struct body.
   *
   * @param fieldDocumentation - Optional field-level documentation.
   * @returns Parsed struct field AST node.
   */
  private parseStructField(
    fieldDocumentation?: FlintFunction["documentation"],
  ): FlintStructField {
    const fieldStart = this.context.current().span;
    const fieldName = this.context.expectMemberName(
      "FLINT-PARSE-036",
      "Expected a struct field name.",
    );
    this.context.expect(
      ":",
      "FLINT-PARSE-037",
      "Expected ':' after a struct field name.",
    );
    const type = this.typeParser.parseType();
    const end = this.context.match(",")
      ? this.context.previous().span
      : this.context.expect(
          ";",
          "FLINT-PARSE-038",
          "Expected ';' after a struct field.",
        ).span;
    return {
      kind: "struct-field",
      name: fieldName ?? "<missing>",
      type,
      ...(fieldDocumentation === undefined
        ? {}
        : { documentation: fieldDocumentation }),
      span: mergeSpans(fieldStart, end),
    };
  }

  /**
   * Parses a struct or record type declaration.
   *
   * @param documentation - Optional attached documentation comment.
   * @param record - True if declared as a value record.
   * @param repr - Optional representation attribute metadata.
   * @param attributes - Optional attached attribute annotations.
   * @returns Parsed struct declaration AST node.
   */
  // skipcq: JS-R1005
  private parseStruct(
    documentation?: FlintFunction["documentation"],
    record = false,
    repr?: FlintStructRepr,
    attributes?: readonly FlintAttributeAnnotation[],
  ): FlintStructDeclaration {
    const start = this.context.current().span;
    const exported = this.context.match("export");
    this.context.consume();
    const name = this.context.expectIdentifier(
      "FLINT-PARSE-034",
      "Expected a struct name.",
    );
    const genericParameters = this.typeParser.parseGenericParameters();
    const openToken = this.context.expect(
      "{",
      "FLINT-PARSE-035",
      "Expected '{' after a struct name.",
    );
    const fields: FlintStructField[] = [];
    while (true) {
      const fieldDocumentation = this.context.consumeTopLevelTrivia();
      if (this.context.is("}") || this.context.is("eof")) break;
      fields.push(this.parseStructField(fieldDocumentation));
    }
    const end = this.context.expectClosingDelimiter(
      "}",
      openToken.span,
      "FLINT-PARSE-039",
      "Expected '}' after a struct declaration.",
    ).span;
    return {
      kind: "struct",
      name: name ?? "<missing>",
      ...(exported ? { exported: true } : {}),
      ...(record ? { record: true as const } : {}),
      ...(repr?.kind === "c" ? { c_struct: true as const } : {}),
      ...(repr === undefined ? {} : { repr }),
      ...(repr?.kind === "packed" ? { packed: repr.alignment } : {}),
      ...(repr?.kind === "align" ? { align: repr.alignment } : {}),
      ...(attributes === undefined || attributes.length === 0
        ? {}
        : { attributes }),
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
    if (this.context.match("=")) {
      const negative = this.context.match("-");
      const value = this.context.expectKind(
        "number",
        "FLINT-PARSE-045",
        "Expected an integer enum discriminant.",
      );
      tag = (negative ? -1 : 1) * Number(value.text || "0");
    }
    return tag;
  }

  /**
   * Enum variant payloads accept either named fields (`value: T`) or the
   * positional bare-type form used by Option/Result (`T`).
   */
  // skipcq: JS-R1005
  private parseVariantFields(): FlintParameter[] {
    const openToken = this.context.expect(
      "(",
      "FLINT-PARSE-014",
      "Expected '('.",
    );
    const fields: FlintParameter[] = [];
    let index = 0;
    while (!this.context.is(")") && !this.context.is("eof")) {
      const start = this.context.current().span;
      const named =
        (this.context.current().kind === "identifier" ||
          this.context.current().kind === "keyword") &&
        this.context.isNext(":");
      if (named) {
        const name = this.context.expectIdentifier(
          "FLINT-PARSE-015",
          "Expected a parameter name.",
        );
        this.context.expect(
          ":",
          "FLINT-PARSE-016",
          "Expected ':' after a parameter name.",
        );
        const type = this.typeParser.parseType();
        fields.push({
          kind: "parameter",
          name: name ?? "<missing>",
          type,
          span: mergeSpans(start, type.span),
        });
      } else {
        const type = this.typeParser.parseType();
        fields.push({
          kind: "parameter",
          name: `_${index}`,
          type,
          span: mergeSpans(start, type.span),
        });
      }
      index += 1;
      if (!this.context.match(",")) break;
    }
    this.context.expectClosingDelimiter(
      ")",
      openToken.span,
      "FLINT-PARSE-017",
      "Expected ')'.",
    );
    return fields;
  }

  /**
   * Parses an enum variant declaration with optional payload fields.
   *
   * @param previousTag - Preceding numeric discriminant tag.
   * @returns Parsed enum variant AST node.
   */
  // skipcq: JS-R1005
  private parseEnumVariant(previousTag: number): FlintEnumVariant {
    const variantStart = this.context.current().span;
    const variantToken = this.context.current();
    const variantName =
      variantToken.kind === "identifier" || variantToken.kind === "keyword"
        ? this.context.consume().text
        : this.context.expectIdentifier(
            "FLINT-PARSE-042",
            "Expected an enum variant name.",
          );
    if (
      variantName === undefined &&
      !this.context.is("}") &&
      !this.context.is(",") &&
      !this.context.is("eof")
    ) {
      this.context.consume();
    }
    const fields = this.context.is("(") ? this.parseVariantFields() : [];
    const tag = this.parseEnumVariantTag(previousTag);
    const separated = this.context.match(",");
    const end = separated
      ? this.context.previous().span
      : variantName === undefined
        ? this.context.current().span
        : this.context.previous().span;
    if (!separated && !this.context.is("}") && !this.context.is("eof"))
      this.context.expect(
        ",",
        "FLINT-PARSE-043",
        "Expected ',' between enum variants.",
      );
    return {
      kind: "enum-variant",
      name: variantName ?? "<missing>",
      fields,
      tag,
      span: mergeSpans(variantStart, end),
    };
  }

  /**
   * Parses an enum type declaration.
   *
   * @param documentation - Optional attached documentation comment.
   * @param attributes - Optional attached attribute annotations.
   * @returns Parsed enum declaration AST node.
   */
  // skipcq: JS-R1005
  private parseEnum(
    documentation?: FlintFunction["documentation"],
    attributes?: readonly FlintAttributeAnnotation[],
  ): FlintEnumDeclaration {
    const start = this.context.current().span;
    const exported = this.context.match("export");
    this.context.expect(
      "enum",
      "FLINT-PARSE-040",
      "Expected 'enum' or 'export enum'.",
    );
    const name = this.context.expectIdentifier(
      "FLINT-PARSE-040",
      "Expected an enum name.",
    );
    const genericParameters = this.typeParser.parseGenericParameters();
    const openToken = this.context.expect(
      "{",
      "FLINT-PARSE-041",
      "Expected '{' after an enum name.",
    );
    const variants: FlintEnumVariant[] = [];
    while (!this.context.is("}") && !this.context.is("eof")) {
      const previousIndex = this.context.index;
      const previousTag =
        variants.length === 0 ? -1 : (variants.at(-1)?.tag ?? 0);
      variants.push(this.parseEnumVariant(previousTag));
      if (this.context.index === previousIndex) this.context.consume();
    }
    const end = this.context.expectClosingDelimiter(
      "}",
      openToken.span,
      "FLINT-PARSE-044",
      "Expected '}' after an enum declaration.",
    ).span;
    return {
      kind: "enum",
      name: name ?? "<missing>",
      exported,
      ...(attributes === undefined || attributes.length === 0
        ? {}
        : { attributes }),
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
   * @param attributes - Optional attached attribute annotations.
   * @returns Parsed interface declaration AST node.
   */
  // skipcq: JS-R1005
  private parseInterface(
    documentation?: FlintFunction["documentation"],
    attributes?: readonly FlintAttributeAnnotation[],
  ): FlintInterfaceDeclaration {
    const start = this.context.current().span;
    const exported = this.context.match("export");
    this.context.expect(
      "interface",
      "FLINT-PARSE-045",
      "Expected 'interface'.",
    );
    const name = this.context.expectIdentifier(
      "FLINT-PARSE-045",
      "Expected an interface name.",
    );
    const genericParameters = this.typeParser.parseGenericParameters();
    const openToken = this.context.expect(
      "{",
      "FLINT-PARSE-046",
      "Expected '{' after an interface name.",
    );
    const functions: FlintInterfaceFunction[] = [];
    while (true) {
      const documentation = this.context.consumeTopLevelTrivia();
      if (this.context.is("}") || this.context.is("eof")) break;
      const functionStart = this.context.current().span;
      this.context.expect(
        "fn",
        "FLINT-PARSE-047",
        "Expected 'fn' in an interface declaration.",
      );
      const functionName = this.context.expectIdentifier(
        "FLINT-PARSE-048",
        "Expected an interface function name.",
      );
      const functionGenerics = this.typeParser.parseGenericParameters();
      const parameters = this.parseParameters();
      this.context.expect(
        "->",
        "FLINT-PARSE-049",
        "Expected '->' before an interface function result type.",
      );
      const result = this.typeParser.parseType();
      const end = this.context.expect(
        ";",
        "FLINT-PARSE-050",
        "Expected ';' after an interface function.",
      ).span;
      functions.push({
        kind: "interface-function",
        name: functionName ?? "<missing>",
        ...(documentation === undefined ? {} : { documentation }),
        genericParameters: functionGenerics,
        parameters,
        result,
        span: mergeSpans(functionStart, end),
      });
    }
    const end = this.context.expectClosingDelimiter(
      "}",
      openToken.span,
      "FLINT-PARSE-051",
      "Expected '}' after an interface declaration.",
    ).span;
    return {
      kind: "interface",
      name: name ?? "<missing>",
      ...(exported ? { exported: true } : {}),
      ...(attributes === undefined || attributes.length === 0
        ? {}
        : { attributes }),
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
    const start = this.context.consume().span;
    this.context.diagnostics.push(
      createDiagnostic(
        this.context.fileName,
        "parse",
        "FLINT-PARSE-052",
        "Class and object-oriented declarations are not supported; use an immutable struct or enum.",
        start,
        "error",
        "Replace the class with a struct and pure functions.",
      ),
    );
    let braces = 0;
    while (!this.context.is("eof")) {
      if (this.context.is("{")) braces += 1;
      if (this.context.is("}")) {
        braces -= 1;
        this.context.consume();
        if (braces <= 0) break;
        continue;
      }
      if (braces === 0 && this.context.is(";")) {
        this.context.consume();
        break;
      }
      this.context.consume();
    }
  }
}
