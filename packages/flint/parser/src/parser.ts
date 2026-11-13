import {
  createDiagnostic,
  flintTypeNameToString,
  type FlintCapabilityImport,
  type FlintComponent,
  type FlintComponentRegion,
  type FlintComponentRegionKind,
  type FlintComptimeStatement,
  type FlintDiagnostic,
  type FlintEnumDeclaration,
  type FlintEventConfiguration,
  type FlintForeignCapabilityDeclaration,
  type FlintFunction,
  type FlintInterfaceDeclaration,
  type FlintModelDeclaration,
  type FlintMarkupBlockExpression,
  type FlintMarkupChild,
  type FlintMacroDeclaration,
  type FlintModule,
  type FlintOpaqueForeignTypeDeclaration,
  type FlintPropertyConfiguration,
  type FlintSourceModuleImport,
  type FlintSourceFileKind,
  type FlintStructDeclaration,
  type FlintToken,
} from "@mission-platform/flint-ast";

import { deriveFlintModuleId } from "./identity.js";
import { lexFlint } from "./lexer.js";
import { mergeSpans, ParserContext } from "./parser/context.js";
import {
  parseCssCompanionRegion,
  parseCssCompanions,
  validateCssClassMapPaths,
} from "./parser/css-parser.js";
import { DeclarationParser } from "./parser/declaration-parser.js";
import { ExpressionParser } from "./parser/expression-parser.js";
import { MarkupParser } from "./parser/markup-parser.js";
import { StatementParser } from "./parser/statement-parser.js";
import { TypeParser } from "./parser/type-parser.js";

export {
  MAX_INDEX_ASSIGNMENT_LOOKAHEAD,
  MAX_INDEX_BRACKET_DEPTH,
  mergeSpans,
  decodeString,
  parseNumericLiteral,
  type ParsedNumericLiteral,
  primitiveTypes,
  ParserContext,
} from "./parser/context.js";
export { TypeParser } from "./parser/type-parser.js";
export { ExpressionParser } from "./parser/expression-parser.js";
export { MarkupParser } from "./parser/markup-parser.js";
export { StatementParser } from "./parser/statement-parser.js";
export {
  DeclarationParser,
  type TopLevelDeclarations,
} from "./parser/declaration-parser.js";
export {
  AttributeParser,
  type ParsedAttribute,
} from "./parser/attribute-parser.js";
export {
  parseCssCompanionRegion,
  parseCssCompanions,
  scanCssPropertyBindings,
  type FlintCssBindingOccurrence,
  type FlintCssBindingScanResult,
  validateCssClassMapPaths,
} from "./parser/css-parser.js";

/**
 * Result object returned by the Flint parser containing the parsed module and diagnostics.
 */
export interface FlintParseResult {
  readonly module?: FlintModule;
  readonly diagnostics: readonly FlintDiagnostic[];
  readonly fileKind: FlintSourceFileKind;
  readonly component?: FlintComponent;
}

/**
 * Options configuring parsing behavior and diagnostic collection.
 */
export interface FlintParseOptions {
  readonly root?: string;
  readonly maxCallDepth?: number;
}

const componentRegionOrder: readonly FlintComponentRegionKind[] = [
  "script",
  "template",
  "style",
];

function sourceSpan(source: string, start: number, end: number) {
  const location = (offset: number) => {
    const lines = source.slice(0, offset).split(/\r\n|\r|\n/u);
    return { line: lines.length, column: (lines.at(-1)?.length ?? 0) + 1 };
  };
  const startLocation = location(start);
  const endLocation = location(end);
  return {
    start,
    end,
    line: startLocation.line,
    column: startLocation.column,
    endLine: endLocation.line,
    endColumn: endLocation.column,
  };
}

function componentDiagnostic(
  fileName: string,
  code: string,
  message: string,
  span: ReturnType<typeof sourceSpan>,
  hint: string,
): FlintDiagnostic {
  return createDiagnostic(
    fileName,
    "parse",
    code,
    message,
    span,
    "error",
    hint,
  );
}

interface ComponentRegionParseResult {
  readonly regions: readonly FlintComponentRegion[];
  readonly diagnostics: readonly FlintDiagnostic[];
}

function parseComponentRegions(
  source: string,
  fileName: string,
): ComponentRegionParseResult {
  const regions: FlintComponentRegion[] = [];
  const diagnostics: FlintDiagnostic[] = [];
  const tags = /<\/?(script|template|style)\b[^>]*>/giu;
  const seen = new Set<FlintComponentRegionKind>();
  let cursor = 0;
  let lastRegionIndex = -1;

  let match: RegExpExecArray | null;
  while ((match = tags.exec(source)) !== null) {
    const tag = match[0] ?? "";
    const region = match[1]?.toLowerCase() as
      FlintComponentRegionKind | undefined;
    const start = match.index ?? 0;
    if (region === undefined) continue;
    if (start > cursor && source.slice(cursor, start).trim().length > 0) {
      diagnostics.push(
        componentDiagnostic(
          fileName,
          "FLINT-COMPONENT-001",
          "Only explicit script, template, and style regions may appear at component level.",
          sourceSpan(source, cursor, start),
          "Move component code into the script, template, or style region.",
        ),
      );
    }
    if (tag.startsWith("</")) {
      diagnostics.push(
        componentDiagnostic(
          fileName,
          "FLINT-COMPONENT-001",
          `Unexpected closing ${region} region tag.`,
          sourceSpan(source, start, start + tag.length),
          `Add an opening <${region}> tag before this closing tag.`,
        ),
      );
      cursor = start + tag.length;
      continue;
    }
    if (tag !== `<${region}>`) {
      diagnostics.push(
        componentDiagnostic(
          fileName,
          "FLINT-COMPONENT-002",
          `The ${region} region does not accept attributes.`,
          sourceSpan(source, start, start + tag.length),
          `Use <${region}> without attributes.`,
        ),
      );
    }
    const close = new RegExp(`</${region}\\s*>`, "iu").exec(
      source.slice(start + tag.length),
    );
    const closeStart =
      close === null ? source.length : start + tag.length + close.index;
    const closeEnd =
      close === null ? source.length : closeStart + close[0].length;
    if (close === null) {
      diagnostics.push(
        componentDiagnostic(
          fileName,
          "FLINT-COMPONENT-003",
          `The ${region} region is not closed.`,
          sourceSpan(source, start, source.length),
          `Close the region with </${region}>.`,
        ),
      );
    }
    const regionIndex = componentRegionOrder.indexOf(region);
    if (seen.has(region)) {
      diagnostics.push(
        componentDiagnostic(
          fileName,
          "FLINT-COMPONENT-004",
          `The ${region} region is declared more than once.`,
          sourceSpan(source, start, closeEnd),
          "Keep exactly one region of each kind in a component.",
        ),
      );
    } else if (regionIndex < lastRegionIndex) {
      diagnostics.push(
        componentDiagnostic(
          fileName,
          "FLINT-COMPONENT-005",
          `The ${region} region is out of order.`,
          sourceSpan(source, start, closeEnd),
          "Order regions as <script>, <template>, then <style>.",
        ),
      );
    }
    seen.add(region);
    lastRegionIndex = Math.max(lastRegionIndex, regionIndex);
    const contentStart = start + tag.length;
    regions.push({
      kind: "component-region",
      region,
      content: source.slice(contentStart, closeStart),
      span: sourceSpan(source, start, closeEnd),
      contentSpan: sourceSpan(source, contentStart, closeStart),
    });
    cursor = closeEnd;
    tags.lastIndex = closeEnd;
  }

  if (cursor < source.length && source.slice(cursor).trim().length > 0) {
    diagnostics.push(
      componentDiagnostic(
        fileName,
        "FLINT-COMPONENT-001",
        "Only explicit script, template, and style regions may appear at component level.",
        sourceSpan(source, cursor, source.length),
        "Move component code into the script, template, or style region.",
      ),
    );
  }
  for (const region of componentRegionOrder) {
    if (!seen.has(region)) {
      diagnostics.push(
        componentDiagnostic(
          fileName,
          "FLINT-COMPONENT-006",
          `The required ${region} region is missing.`,
          sourceSpan(source, 0, 0),
          `Add a <${region}>...</${region}> region.`,
        ),
      );
    }
  }
  return { regions, diagnostics };
}

function maskOutsideScript(
  source: string,
  script: FlintComponentRegion | undefined,
): string {
  if (script === undefined) return source.replace(/[^\r\n]/gu, " ");
  const masked = source.split("");
  for (let index = 0; index < source.length; index += 1) {
    if (index < script.contentSpan.start || index >= script.contentSpan.end) {
      if (source[index] !== "\n" && source[index] !== "\r") masked[index] = " ";
    }
  }
  return masked.join("");
}

function maskOutsideRegion(
  source: string,
  region: FlintComponentRegion | undefined,
): string {
  if (region === undefined) return source.replace(/[^\r\n]/gu, " ");
  const masked = source.split("");
  for (let index = 0; index < source.length; index += 1) {
    if (index < region.contentSpan.start || index >= region.contentSpan.end) {
      if (source[index] !== "\n" && source[index] !== "\r") masked[index] = " ";
    }
  }
  return masked.join("");
}

interface TemplateParseResult {
  readonly template?: FlintMarkupBlockExpression;
  readonly diagnostics: readonly FlintDiagnostic[];
}

function parseTemplateRegion(
  source: string,
  fileName: string,
  region: FlintComponentRegion | undefined,
  maxCallDepth: number,
): TemplateParseResult {
  if (region === undefined) return { diagnostics: [] };
  const templateSource = maskOutsideRegion(source, region);
  const lexed = lexFlint(templateSource, fileName);
  const context = new ParserContext(
    lexed.tokens,
    fileName,
    lexed.diagnostics,
    maxCallDepth,
    templateSource,
  );
  const expressionParser = new ExpressionParser(context);
  const markupParser = new MarkupParser(context, expressionParser);
  let children: FlintMarkupChild[];
  if (context.is("{") && context.tokenAt(context.index + 1)?.text === "<") {
    const wrapper = context.consume();
    context.diagnostics.push(
      createDiagnostic(
        fileName,
        "parse",
        "FLINT-TEMPLATE-001",
        "Template markup must not be wrapped in an object-like brace expression.",
        wrapper.span,
        "error",
        "Place markup directly inside the template region.",
      ),
    );
    children = markupParser.parseMarkupChildrenUntilEnd("}");
    context.expectClosingDelimiter(
      "}",
      wrapper.span,
      "FLINT-TEMPLATE-001",
      "Expected '}' after the legacy template wrapper.",
    );
  } else {
    children = markupParser.parseMarkupChildrenUntilEnd();
  }
  if (children.length === 0) {
    return { diagnostics: context.diagnostics };
  }
  const first = children[0]!;
  const last = children.at(-1)!;
  const root: FlintMarkupChild =
    children.length === 1
      ? first
      : {
          kind: "markup-element",
          tag: "Fragment",
          tagKind: "fragment",
          selfClosing: false,
          attributes: [],
          children,
          span: mergeSpans(first.span, last.span),
        };
  return {
    template: {
      kind: "markup-block",
      children,
      root,
      span: region.contentSpan,
    },
    diagnostics: context.diagnostics,
  };
}

/**
 * Recursive descent parser orchestrator for the Flint programming language.
 */
export class Parser {
  private readonly context: ParserContext;
  private readonly declarationParser: DeclarationParser;
  private readonly source: string;

  /**
   * Initializes a new Parser instance for the given source file and token stream.
   *
   * @param tokens - Lexed token stream.
   * @param fileName - Canonical file path identifier.
   * @param diagnostics - Diagnostic report accumulator.
   * @param maxCallDepth - Maximum recursion call depth limit.
   */
  public constructor(
    tokens: readonly FlintToken[],
    fileName: string,
    diagnostics: readonly FlintDiagnostic[],
    source = "",
    maxCallDepth = 512,
  ) {
    this.source = source;
    this.context = new ParserContext(
      tokens,
      fileName,
      diagnostics,
      maxCallDepth,
      source,
    );
    const typeParser = new TypeParser(this.context);
    const expressionParser = new ExpressionParser(this.context);
    const statementParser = new StatementParser(
      this.context,
      typeParser,
      expressionParser,
    );
    this.declarationParser = new DeclarationParser(
      this.context,
      typeParser,
      expressionParser,
      statementParser,
    );
  }

  /**
   * Parses the loaded token stream into a complete AST module with diagnostics.
   *
   * @returns Parse result containing the compiled module and accumulated diagnostics.
   */
  // skipcq: JS-R1005
  public parse(): FlintParseResult {
    const start =
      this.context.tokens.find(({ kind }) => kind !== "comment")?.span ??
      this.context.current().span;
    const imports: FlintCapabilityImport[] = [];
    const sourceImports: FlintSourceModuleImport[] = [];
    const macros: FlintMacroDeclaration[] = [];
    const comptimeStatements: FlintComptimeStatement[] = [];
    const structs: FlintStructDeclaration[] = [];
    const enums: FlintEnumDeclaration[] = [];
    const interfaces: FlintInterfaceDeclaration[] = [];
    const functions: FlintFunction[] = [];
    const propertyConfigurations: FlintPropertyConfiguration[] = [];
    const eventConfigurations: FlintEventConfiguration[] = [];
    const models: FlintModelDeclaration[] = [];
    const foreignCapabilities: FlintForeignCapabilityDeclaration[] = [];
    const opaqueForeignTypes: FlintOpaqueForeignTypeDeclaration[] = [];
    let pendingDocumentation = this.context.consumeTopLevelTrivia();
    if (this.context.is("module")) {
      pendingDocumentation = undefined;
      const legacy = this.context.consume();
      this.context.diagnostics.push(
        createDiagnostic(
          this.context.fileName,
          "parse",
          "FLINT-PARSE-001",
          "Nested module declarations are no longer supported; declarations are file-scoped.",
          legacy.span,
          "error",
          "Remove the module name and surrounding braces from this file.",
        ),
      );
      this.context.expectIdentifier(
        "FLINT-PARSE-002",
        "Expected a legacy module name.",
      );
      this.context.expect(
        "{",
        "FLINT-PARSE-003",
        "Expected '{' after the legacy module name.",
      );
    }
    while (true) {
      const documentation =
        pendingDocumentation ?? this.context.consumeTopLevelTrivia();
      pendingDocumentation = undefined;
      if (this.context.is("}") || this.context.is("eof")) break;
      const startIndex = this.context.index;
      try {
        this.declarationParser.parseTopLevelDeclaration(documentation, {
          imports,
          sourceImports,
          macros,
          comptimeStatements,
          structs,
          enums,
          interfaces,
          functions,
          propertyConfigurations,
          eventConfigurations,
          models,
          foreignCapabilities,
          opaqueForeignTypes,
        });
      } catch {
        this.declarationParser.synchronizeTopLevel();
      }
      if (
        this.context.index === startIndex &&
        !this.context.is("}") &&
        !this.context.is("eof")
      ) {
        this.context.consume();
      }
    }
    const end = this.context.is("}")
      ? this.context.consume().span
      : this.context.previous().span;
    const moduleName = deriveFlintModuleId(this.context.fileName);
    const styleCompanions = parseCssCompanions(
      this.source,
      moduleName,
      this.context.fileName,
    );
    const styleDiagnostics = [
      ...styleCompanions.flatMap(({ diagnostics }) => diagnostics),
      ...validateCssClassMapPaths(
        this.source,
        styleCompanions,
        this.context.fileName,
      ),
    ];
    const module: FlintModule = {
      kind: "module",
      name: moduleName,
      imports,
      sourceImports,
      ...(macros.length === 0 ? {} : { macros }),
      ...(comptimeStatements.length === 0 ? {} : { comptimeStatements }),
      structs,
      enums,
      interfaces,
      functions,
      ...(propertyConfigurations.length === 0
        ? {}
        : { propertyConfigurations }),
      ...(eventConfigurations.length === 0 ? {} : { eventConfigurations }),
      ...(models.length === 0 ? {} : { models }),
      ...(foreignCapabilities.length === 0 ? {} : { foreignCapabilities }),
      ...(opaqueForeignTypes.length === 0 ? {} : { opaqueForeignTypes }),
      ...(styleCompanions.length === 0 ? {} : { styleCompanions }),
      span: mergeSpans(start, end),
    };
    const setupDiagnostics = validateSetupDeclarations(
      module,
      this.context.fileName,
    );
    return {
      module,
      diagnostics: [
        ...this.context.diagnostics,
        ...setupDiagnostics,
        ...styleDiagnostics,
      ],
      fileKind: "module",
    };
  }
}

function validateSetupDeclarations(
  module: FlintModule,
  fileName: string,
): readonly FlintDiagnostic[] {
  const diagnostics: FlintDiagnostic[] = [];
  const setupFunctions = module.functions.filter(
    ({ role }) => role === "setup",
  );
  const propertyDeclarations = (module.propertyConfigurations ?? []).flatMap(
    ({ properties }) => properties,
  );
  const eventDeclarations = (module.eventConfigurations ?? []).flatMap(
    ({ events }) => events,
  );
  const models = module.models ?? [];
  const hasPipelineDeclarations =
    setupFunctions.length > 0 ||
    propertyDeclarations.length > 0 ||
    eventDeclarations.length > 0 ||
    models.length > 0 ||
    module.functions.some(
      ({ role }) => role === "event-handler" || role === "event-emitter",
    );

  const report = (
    code: string,
    message: string,
    span: FlintFunction["span"],
    hint: string,
  ): void => {
    diagnostics.push(
      createDiagnostic(fileName, "parse", code, message, span, "error", hint),
    );
  };

  if (!hasPipelineDeclarations) return diagnostics;
  if (setupFunctions.length === 0) {
    report(
      "FLINT-SETUP-101",
      "A component setup pipeline requires exactly one 'setup' function.",
      propertyDeclarations[0]?.span ??
        eventDeclarations[0]?.span ??
        module.span,
      "Add 'export setup(...) -> ... { ... }' before configuring properties or events.",
    );
  }
  if (setupFunctions.length > 1) {
    for (const duplicate of setupFunctions.slice(1)) {
      report(
        "FLINT-SETUP-102",
        "Only one 'setup' function may be declared in a module.",
        duplicate.span,
        "Merge the setup computations into the first setup function.",
      );
    }
  }

  const propertyNames = new Set<string>();
  for (const property of propertyDeclarations) {
    if (propertyNames.has(property.name)) {
      report(
        "FLINT-SETUP-103",
        `Property '${property.name}' is configured more than once.`,
        property.span,
        "Keep each reactive property in exactly one properties configuration.",
      );
    }
    propertyNames.add(property.name);
  }

  const eventNames = new Set<string>();
  for (const event of eventDeclarations) {
    if (eventNames.has(event.name)) {
      report(
        "FLINT-SETUP-104",
        `Event '${event.name}' is configured more than once.`,
        event.span,
        "Keep each emitted event in exactly one event-emission configuration.",
      );
    }
    eventNames.add(event.name);
  }

  const setup = setupFunctions[0];
  if (setup !== undefined) {
    const parameterNames = new Set<string>();
    for (const parameter of setup.parameters) {
      if (parameterNames.has(parameter.name)) {
        report(
          "FLINT-SETUP-105",
          `Setup parameter '${parameter.name}' is declared more than once.`,
          parameter.span,
          "Give each setup property parameter a unique name.",
        );
      }
      parameterNames.add(parameter.name);
      const property = propertyDeclarations.find(
        ({ name }) => name === parameter.name,
      );
      if (property === undefined) {
        report(
          "FLINT-SETUP-106",
          `Setup parameter '${parameter.name}' has no property configuration.`,
          parameter.span,
          "Declare the parameter in the module-level properties configuration.",
        );
      } else if (
        flintTypeNameToString(property.type) !==
        flintTypeNameToString(parameter.type)
      ) {
        report(
          "FLINT-SETUP-107",
          `Property '${parameter.name}' has a different type in setup and configuration.`,
          parameter.span,
          "Use the same type in the setup parameter and properties configuration.",
        );
      }
    }
    for (const property of propertyDeclarations) {
      if (!parameterNames.has(property.name)) {
        report(
          "FLINT-SETUP-108",
          `Configured property '${property.name}' is missing from the setup signature.`,
          property.span,
          "Add the property as a typed setup parameter or remove its configuration.",
        );
      }
    }
  }

  for (const emitter of module.functions.filter(
    ({ role }) => role === "event-emitter",
  )) {
    if (!eventNames.has(emitter.name)) {
      report(
        "FLINT-SETUP-109",
        `Emitter '${emitter.name}' has no event-emission configuration.`,
        emitter.span,
        "Declare the emitted event in the module-level emits configuration.",
      );
    }
  }
  for (const model of models) {
    const property = propertyDeclarations.find(
      ({ name }) => name === model.name,
    );
    if (property === undefined) {
      report(
        "FLINT-SETUP-110",
        `Model '${model.name}' is not declared as a reactive property.`,
        model.span,
        "Add the model value to the properties configuration.",
      );
    } else if (
      flintTypeNameToString(property.type) !== flintTypeNameToString(model.type)
    ) {
      report(
        "FLINT-SETUP-111",
        `Model '${model.name}' has a different type from its property.`,
        model.span,
        "Use the same type for the model and its reactive property.",
      );
    }
    const updateEvent = eventDeclarations.find(
      ({ name }) => name === model.updateEventName,
    );
    if (updateEvent !== undefined) {
      const payload = updateEvent.parameters[0];
      if (
        updateEvent.parameters.length !== 1 ||
        payload === undefined ||
        flintTypeNameToString(payload.type) !==
          flintTypeNameToString(model.type)
      ) {
        report(
          "FLINT-SETUP-112",
          `Model update event '${model.updateEventName}' must carry exactly one value of the model type.`,
          updateEvent.span,
          "Declare one update-event payload whose type matches the model value.",
        );
      }
    }
  }
  return diagnostics;
}

function parseRegularFlint(
  source: string,
  fileName = "<input>",
  options: FlintParseOptions = {},
): FlintParseResult {
  const lexed = lexFlint(source, fileName);
  const result = new Parser(
    lexed.tokens,
    fileName,
    lexed.diagnostics,
    source,
    options.maxCallDepth ?? 512,
  ).parse();
  if (result.module === undefined || options.root === undefined) return result;
  return {
    ...result,
    module: {
      ...result.module,
      name: deriveFlintModuleId(fileName, options.root),
    },
  };
}

function isFlintComponentFile(fileName: string): boolean {
  return (
    fileName.split(/[?#]/u, 1)[0]?.toLowerCase().endsWith(".flintc") ?? false
  );
}

function parseFlintComponent(
  source: string,
  fileName: string,
  options: FlintParseOptions,
): FlintParseResult {
  const parsedRegions = parseComponentRegions(source, fileName);
  const script = parsedRegions.regions.find(
    ({ region }) => region === "script",
  );
  const parsed = parseRegularFlint(
    maskOutsideScript(source, script),
    fileName,
    options,
  );
  if (parsed.module === undefined) {
    return {
      ...parsed,
      fileKind: "component",
      diagnostics: [...parsed.diagnostics, ...parsedRegions.diagnostics],
    };
  }
  const moduleId = parsed.module.name;
  const styleRegion = parsedRegions.regions.find(
    ({ region }) => region === "style",
  );
  const templateRegion = parsedRegions.regions.find(
    ({ region }) => region === "template",
  );
  const parsedTemplate = parseTemplateRegion(
    source,
    fileName,
    templateRegion,
    options.maxCallDepth ?? 512,
  );
  const regionCompanion =
    styleRegion === undefined
      ? undefined
      : parseCssCompanionRegion(
          source,
          styleRegion.contentSpan.start,
          styleRegion.contentSpan.end,
          moduleId,
          "styles",
          undefined,
          fileName,
        );
  const styleCompanions = [
    ...(parsed.module.styleCompanions ?? []),
    ...(regionCompanion === undefined ? [] : [regionCompanion]),
  ];
  const styleDiagnostics = [
    ...styleCompanions.flatMap(({ diagnostics }) => diagnostics),
    ...validateCssClassMapPaths(source, styleCompanions, fileName),
  ];
  const module: FlintModule = {
    ...parsed.module,
    fileKind: "component",
    componentRegions: parsedRegions.regions,
    ...(parsedTemplate.template === undefined
      ? {}
      : { template: parsedTemplate.template }),
    ...(styleCompanions.length === 0 ? {} : { styleCompanions }),
  };
  const componentSpan = sourceSpan(source, 0, source.length);
  const component: FlintComponent = {
    kind: "component",
    fileKind: "component",
    template: parsedTemplate.template,
    regions: parsedRegions.regions,
    module,
    span: componentSpan,
  };
  return {
    module,
    component,
    fileKind: "component",
    diagnostics: [
      ...parsed.diagnostics,
      ...parsedRegions.diagnostics,
      ...parsedTemplate.diagnostics,
      ...styleDiagnostics,
    ],
  };
}

/**
 * Parses a Flint source string into a module or canonical component AST.
 *
 * `.flint` and `.flt` are regular Flint modules. `.flintc` files require
 * explicit script, template, and style regions and return component metadata.
 *
 * @param source - Raw Flint source code string.
 * @param fileName - File name used for source span reporting and dispatch.
 * @param options - Parser options.
 * @returns Parsed source AST and diagnostics.
 */
export function parseFlint(
  source: string,
  fileName = "<input>",
  options: FlintParseOptions = {},
): FlintParseResult {
  return isFlintComponentFile(fileName)
    ? parseFlintComponent(source, fileName, options)
    : parseRegularFlint(source, fileName, options);
}
