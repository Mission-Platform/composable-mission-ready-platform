import MagicString, { type SourceMap } from "magic-string";

import { parseCst, getImportDeclarations, Visitor } from "./cst.js";

import type { ImportDeclaration, Program } from "oxc-parser";

/**
 * Specification for rewriting imports targeting a specific module.
 */
export interface ImportRewriteSpec {
  /** The module specifier to target (e.g. '@mission-platform/router'). */
  readonly targetModule: string;
  /** The replacement module specifier. If omitted or undefined, the import is removed. */
  readonly replacementModule?: string;
  /** Specific specifiers to keep, map, or rename. */
  readonly specifiers?: readonly {
    readonly importedName: string;
    readonly localName?: string;
    readonly sourceName?: string;
  }[];
  /** Whether to remove imported bindings that are not referenced in the file. */
  readonly removeUnused?: boolean;
}

/**
 * Options configuring CST-based import rewriting.
 */
export interface RewriteImportsOptions {
  /** A list of import rewrite specifications. */
  readonly rewrites?: readonly ImportRewriteSpec[];
  /** Shorthand target module if rewrites is omitted. */
  readonly targetModule?: string;
  /** Shorthand replacement module if rewrites is omitted. */
  readonly replacementModule?: string;
  /**
   * When true, preserves existing named specifiers, whitespace, comments,
   * and formatting exactly as authored, only updating the source specifier.
   */
  readonly preserveNamedSpecifiers?: boolean;
  /** Shorthand specifiers filter/mapping if rewrites is omitted. */
  readonly specifiers?: readonly {
    readonly importedName: string;
    readonly localName?: string;
    readonly sourceName?: string;
  }[];
  /** Shorthand removeUnused flag if rewrites is omitted. */
  readonly removeUnused?: boolean;
  /** Logical source file name for source map generation. */
  readonly sourceFileName?: string;
}

/**
 * Result of a CST import rewrite transformation.
 */
export interface RewriteResult {
  readonly code: string;
  readonly map?: SourceMap;
  readonly transformed: boolean;
}

interface ParsedSpecifier {
  kind: "named" | "default" | "namespace";
  importedName: string;
  localName: string;
  typeOnly: boolean;
}

/**
 * Computes trailing newline length after a given offset.
 *
 * @param source - Original source string.
 * @param offset - Offset after declaration end.
 * @returns Number of newline characters following the offset.
 */
function getTrailingNewlineLength(source: string, offset: number): number {
  if (source.startsWith("\r\n", offset)) return 2;
  if (source.startsWith("\n", offset)) return 1;
  return 0;
}

/**
 * Removes an import declaration from the source code, trimming enclosing whitespace and newlines.
 *
 * @param magicString - The MagicString instance being mutated.
 * @param source - The original source code string.
 * @param start - The declaration start offset.
 * @param end - The declaration end offset.
 */
function removeDeclaration(
  magicString: MagicString,
  source: string,
  start: number,
  end: number,
): void {
  const lineStart = Math.max(0, source.lastIndexOf("\n", start - 1) + 1);
  const isLineStartWhitespace = source.slice(lineStart, start).trim() === "";

  if (isLineStartWhitespace) {
    const newlineLength = getTrailingNewlineLength(source, end);
    const removeEnd = end === source.length ? end : end + newlineLength;
    magicString.remove(lineStart, removeEnd);
    return;
  }

  magicString.remove(start, end);
}

/**
 * Collects all identifier names referenced outside of import declarations in a program.
 *
 * @param program - The AST root of the parsed program.
 * @param importDeclarations - The import declarations to exclude from reference collection.
 * @returns A set of identifier names referenced in the program body.
 */
function collectReferencedIdentifiers(
  program: Program,
  importDeclarations: readonly ImportDeclaration[],
): Set<string> {
  const importSpans = importDeclarations.map((decl) => ({
    start: decl.start,
    end: decl.end,
  }));
  const referenced = new Set<string>();

  const visitor = new Visitor({
    Identifier(node) {
      const isInsideImport = importSpans.some(
        (span) => node.start >= span.start && node.end <= span.end,
      );
      if (!isInsideImport) {
        referenced.add(node.name);
      }
    },
    JSXIdentifier(node) {
      const isInsideImport = importSpans.some(
        (span) => node.start >= span.start && node.end <= span.end,
      );
      if (!isInsideImport) {
        referenced.add(node.name);
      }
    },
  });

  visitor.visit(program);
  return referenced;
}

/**
 * Normalizes rewrite options into a list of import rewrite specifications.
 *
 * @param options - CST rewrite options.
 * @returns Array of normalized import rewrite specifications.
 */
function normalizeRewriteSpecs(
  options: RewriteImportsOptions,
): ImportRewriteSpec[] {
  if (options.rewrites && options.rewrites.length > 0) {
    return [...options.rewrites];
  }
  if (options.targetModule !== undefined) {
    return [
      {
        targetModule: options.targetModule,
        replacementModule: options.replacementModule,
        specifiers: options.specifiers,
        removeUnused: options.removeUnused,
      },
    ];
  }
  return [];
}

/**
 * Extracts the imported symbol name from an OXC import specifier.
 *
 * @param specifier - The named import specifier.
 * @returns The imported symbol name.
 */
function parseNamedImportName(specifier: ImportSpecifier): string {
  return specifier.imported.type === "Identifier"
    ? specifier.imported.name
    : specifier.imported.value;
}

/**
 * Parses a single import specifier node into a normalized record.
 *
 * @param specifier - The AST specifier node.
 * @param isTypeDecl - Whether the parent declaration is type-only.
 * @returns Normalized specifier record or undefined if unrecognized.
 */
function parseSpecifier(
  specifier: ImportDeclaration["specifiers"][number],
  isTypeDecl: boolean,
): ParsedSpecifier | undefined {
  if (specifier.type === "ImportDefaultSpecifier") {
    return {
      kind: "default",
      importedName: "default",
      localName: specifier.local.name,
      typeOnly: isTypeDecl,
    };
  }
  if (specifier.type === "ImportNamespaceSpecifier") {
    return {
      kind: "namespace",
      importedName: "*",
      localName: specifier.local.name,
      typeOnly: isTypeDecl,
    };
  }
  if (specifier.type === "ImportSpecifier") {
    return {
      kind: "named",
      importedName: parseNamedImportName(specifier),
      localName: specifier.local.name,
      typeOnly: isTypeDecl || specifier.importKind === "type",
    };
  }
  return undefined;
}

/**
 * Extracts normalized specifier records from an import declaration.
 *
 * @param decl - An OXC import declaration node.
 * @returns Array of parsed import specifiers.
 */
function parseSpecifiersFromDeclaration(
  decl: ImportDeclaration,
): ParsedSpecifier[] {
  const isTypeDecl = decl.importKind === "type";
  const parsedSpecifiers: ParsedSpecifier[] = [];
  for (const specifier of decl.specifiers) {
    const parsed = parseSpecifier(specifier, isTypeDecl);
    if (parsed !== undefined) {
      parsedSpecifiers.push(parsed);
    }
  }
  return parsedSpecifiers;
}

/**
 * Checks whether a rule matches the given parsed specifier.
 *
 * @param rule - Candidate mapping rule.
 * @param item - Parsed import specifier.
 * @returns True if rule matches the specifier.
 */
function matchesRule(
  rule: {
    readonly importedName: string;
    readonly localName?: string;
    readonly sourceName?: string;
  },
  item: ParsedSpecifier,
): boolean {
  if (rule.sourceName !== undefined) {
    return rule.sourceName === item.importedName;
  }
  return (
    rule.localName === item.importedName ||
    rule.localName === item.localName ||
    rule.importedName === item.importedName
  );
}

/**
 * Resolves the remapped local name for a matched specifier.
 *
 * @param item - Parsed import specifier.
 * @param ruleLocalName - Optional local alias from mapping rule.
 * @returns Resolved local identifier name.
 */
function resolveRemappedLocalName(
  item: ParsedSpecifier,
  ruleLocalName?: string,
): string {
  if (item.localName !== item.importedName) {
    return item.localName;
  }
  return ruleLocalName ?? item.localName;
}

/**
 * Maps a single parsed specifier against rewrite rules.
 *
 * @param item - Parsed import specifier.
 * @param rules - Module specifier mapping rules.
 * @returns Remapped parsed specifier, or undefined if not matching any rule.
 */
function mapSpecifierWithRules(
  item: ParsedSpecifier,
  rules: readonly {
    readonly importedName: string;
    readonly localName?: string;
    readonly sourceName?: string;
  }[],
): ParsedSpecifier | undefined {
  const mapping = rules.find((rule) => matchesRule(rule, item));
  if (!mapping) return undefined;
  return {
    ...item,
    importedName: mapping.importedName,
    localName: resolveRemappedLocalName(item, mapping.localName),
  };
}

/**
 * Resolves the initial array of kept specifiers prior to usage-based pruning.
 *
 * @param parsed - Parsed specifiers.
 * @param moduleSpecs - Specifications for the module.
 * @param totalModules - Total number of target modules.
 * @returns Array of kept specifiers.
 */
function resolveInitialKeptSpecifiers(
  parsed: readonly ParsedSpecifier[],
  moduleSpecs: readonly ImportRewriteSpec[],
  totalModules: number,
): ParsedSpecifier[] {
  const hasDefinedSpecifiers = moduleSpecs.some(
    (sp) => sp.specifiers !== undefined,
  );
  if (hasDefinedSpecifiers) {
    const rules = moduleSpecs.flatMap((sp) => sp.specifiers ?? []);
    return parsed.flatMap((item) => {
      const mapped = mapSpecifierWithRules(item, rules);
      return mapped ? [mapped] : [];
    });
  }
  return totalModules === 1 ? [...parsed] : [];
}

/**
 * Filters and renames parsed specifiers according to rewrite rules and usage.
 *
 * @param parsed - All parsed specifiers for the declaration.
 * @param moduleSpecs - Rewrite specs for the target module.
 * @param totalModules - Total number of replacement modules targeted.
 * @param referencedIdentifiers - Referenced identifier set if removeUnused is enabled.
 * @returns Filtered and remapped specifiers.
 */
function filterKeptSpecifiers(
  parsed: readonly ParsedSpecifier[],
  moduleSpecs: readonly ImportRewriteSpec[],
  totalModules: number,
  referencedIdentifiers?: Set<string>,
): ParsedSpecifier[] {
  const keptSpecifiers = resolveInitialKeptSpecifiers(
    parsed,
    moduleSpecs,
    totalModules,
  );
  const hasRemoveUnused = moduleSpecs.some((sp) => sp.removeUnused);
  if (!hasRemoveUnused || !referencedIdentifiers) {
    return keptSpecifiers;
  }
  return keptSpecifiers.filter((item) =>
    referencedIdentifiers.has(item.localName),
  );
}

/**
 * Formats named specifiers into a curly-brace import clause.
 *
 * @param namedSpecs - Named import specifiers.
 * @param isTypeOnly - Whether the import declaration is type-only.
 * @returns Formatted curly-brace clause or undefined if empty.
 */
function formatNamedSpecifiersClause(
  namedSpecs: readonly ParsedSpecifier[],
  isTypeOnly: boolean,
): string | undefined {
  if (namedSpecs.length === 0) {
    return undefined;
  }
  const namedStrings = namedSpecs.map((item) => {
    const inlineType = !isTypeOnly && item.typeOnly ? "type " : "";
    if (item.localName === item.importedName) {
      return `${inlineType}${item.importedName}`;
    }
    return `${inlineType}${item.importedName} as ${item.localName}`;
  });
  return `{ ${namedStrings.join(", ")} }`;
}

/**
 * Finds the default specifier local identifier if present.
 *
 * @param keptSpecifiers - List of kept specifiers.
 * @returns Local identifier or undefined.
 */
function findDefaultSpecifierClause(
  keptSpecifiers: readonly ParsedSpecifier[],
): string | undefined {
  const defaultSpec = keptSpecifiers.find(
    (item) => item.kind === "default" || item.importedName === "default",
  );
  return defaultSpec?.localName;
}

/**
 * Finds the namespace specifier import clause if present.
 *
 * @param keptSpecifiers - List of kept specifiers.
 * @returns Formatted namespace clause or undefined.
 */
function findNamespaceSpecifierClause(
  keptSpecifiers: readonly ParsedSpecifier[],
): string | undefined {
  const namespaceSpec = keptSpecifiers.find(
    (item) => item.kind === "namespace" || item.importedName === "*",
  );
  return namespaceSpec ? `* as ${namespaceSpec.localName}` : undefined;
}

/**
 * Finds the named specifiers clause if present.
 *
 * @param keptSpecifiers - List of kept specifiers.
 * @param isTypeOnly - Whether the import declaration is type-only.
 * @returns Formatted named specifiers clause or undefined.
 */
function findNamedSpecifiersClause(
  keptSpecifiers: readonly ParsedSpecifier[],
  isTypeOnly: boolean,
): string | undefined {
  const namedSpecs = keptSpecifiers.filter(
    (item) =>
      item.kind === "named" &&
      item.importedName !== "default" &&
      item.importedName !== "*",
  );
  return formatNamedSpecifiersClause(namedSpecs, isTypeOnly);
}

/**
 * Collects formatted import specifier clauses for the statement.
 *
 * @param keptSpecifiers - Filtered import specifiers.
 * @param isTypeOnly - Whether declaration is type-only.
 * @returns Array of formatted import clause segments.
 */
function collectImportClauseParts(
  keptSpecifiers: readonly ParsedSpecifier[],
  isTypeOnly: boolean,
): string[] {
  const parts: string[] = [];

  const defaultClause = findDefaultSpecifierClause(keptSpecifiers);
  if (defaultClause) {
    parts.push(defaultClause);
  }

  const namespaceClause = findNamespaceSpecifierClause(keptSpecifiers);
  if (namespaceClause) {
    parts.push(namespaceClause);
  }

  const namedClause = findNamedSpecifiersClause(keptSpecifiers, isTypeOnly);
  if (namedClause) {
    parts.push(namedClause);
  }

  return parts;
}

/**
 * Builds an import statement string from kept specifiers.
 *
 * @param replacementModule - Replacement module specifier.
 * @param keptSpecifiers - Filtered import specifiers.
 * @param isTypeOnly - Whether the import declaration has type-only modifier.
 * @param quote - The quote character to use.
 * @returns The formatted import statement string.
 */
function buildImportStatement(
  replacementModule: string,
  keptSpecifiers: readonly ParsedSpecifier[],
  isTypeOnly: boolean,
  quote: string,
): string {
  const typePrefix = isTypeOnly ? "type " : "";
  const parts = collectImportClauseParts(keptSpecifiers, isTypeOnly);
  return `import ${typePrefix}${parts.join(", ")} from ${quote}${replacementModule}${quote};`;
}

/**
 * Groups matching rewrite specs by replacement module.
 *
 * @param matchingSpecs - Specifications matching a target declaration.
 * @returns Map of replacement module to matching specifications.
 */
function groupSpecsByReplacementModule(
  matchingSpecs: readonly ImportRewriteSpec[],
): Map<string, ImportRewriteSpec[]> {
  const specsByModule = new Map<string, ImportRewriteSpec[]>();
  for (const spec of matchingSpecs) {
    if (!spec.replacementModule) continue;
    const list = specsByModule.get(spec.replacementModule) ?? [];
    list.push(spec);
    specsByModule.set(spec.replacementModule, list);
  }
  return specsByModule;
}

/**
 * Extracts a valid quote character from the source position.
 *
 * @param source - Original source string.
 * @param position - Character index in source.
 * @returns Valid single or double quote character.
 */
function extractValidQuote(source: string, position: number): string {
  const quote = source[position];
  return quote === "'" || quote === '"' ? quote : "'";
}

/**
 * Checks whether matching rewrite specs are eligible for the single-module fast path.
 *
 * @param matchingSpecs - Matching rewrite specs.
 * @param preserveNamedSpecifiers - Preservation option flag.
 * @returns True if eligible for fast path.
 */
function isEligibleForPreserveFastPath(
  matchingSpecs: readonly ImportRewriteSpec[],
  preserveNamedSpecifiers: boolean | undefined,
): boolean {
  if (preserveNamedSpecifiers !== true || matchingSpecs.length !== 1) {
    return false;
  }
  const spec = matchingSpecs[0];
  return spec.specifiers === undefined && !spec.removeUnused;
}

/**
 * Fast-path check for single module specifier preservation without rewriting named tokens.
 *
 * @param matchingSpecs - Matching rewrite specs.
 * @param preserveNamedSpecifiers - Options flag.
 * @param decl - Import declaration.
 * @param magicString - MagicString being modified.
 * @param source - Original source.
 * @returns True if handled via fast path.
 */
function tryPreserveSpecifiersFastPath(
  matchingSpecs: readonly ImportRewriteSpec[],
  preserveNamedSpecifiers: boolean | undefined,
  decl: ImportDeclaration,
  magicString: MagicString,
  source: string,
): boolean {
  if (!isEligibleForPreserveFastPath(matchingSpecs, preserveNamedSpecifiers)) {
    return false;
  }

  const singleSpec = matchingSpecs[0];
  if (!singleSpec.replacementModule) {
    removeDeclaration(magicString, source, decl.start, decl.end);
    return true;
  }

  const validQuote = extractValidQuote(source, decl.source.start);
  magicString.overwrite(
    decl.source.start,
    decl.source.end,
    `${validQuote}${singleSpec.replacementModule}${validQuote}`,
  );
  return true;
}

/**
 * Rewrites an import declaration that contains no specifiers (side-effect import).
 *
 * @param decl - Import declaration.
 * @param specsByModule - Replacement specs grouped by module.
 * @param magicString - MagicString being mutated.
 * @param source - Original source code.
 * @param quote - Quote character to use.
 * @param newline - Newline string.
 */
function rewriteSideEffectImport(
  decl: ImportDeclaration,
  specsByModule: Map<string, ImportRewriteSpec[]>,
  magicString: MagicString,
  source: string,
  quote: string,
  newline: string,
): void {
  const emitted = [...specsByModule.keys()].map(
    (targetModule) => `import ${quote}${targetModule}${quote};`,
  );
  if (emitted.length === 0) {
    removeDeclaration(magicString, source, decl.start, decl.end);
  } else {
    magicString.overwrite(decl.start, decl.end, emitted.join(newline));
  }
}

/**
 * Rewrites an import declaration containing named/default/namespace specifiers.
 *
 * @param decl - Import declaration.
 * @param specsByModule - Replacement specs grouped by module.
 * @param magicString - MagicString being mutated.
 * @param source - Original source code.
 * @param quote - Quote character to use.
 * @param newline - Newline string.
 * @param referencedIdentifiers - Referenced identifiers for pruning unused imports.
 */
function rewriteNamedImportDeclaration(
  decl: ImportDeclaration,
  specsByModule: Map<string, ImportRewriteSpec[]>,
  magicString: MagicString,
  source: string,
  quote: string,
  newline: string,
  referencedIdentifiers?: Set<string>,
): void {
  const parsedSpecifiers = parseSpecifiersFromDeclaration(decl);
  const emittedImports: string[] = [];

  for (const [replacementModule, moduleSpecs] of specsByModule) {
    const kept = filterKeptSpecifiers(
      parsedSpecifiers,
      moduleSpecs,
      specsByModule.size,
      referencedIdentifiers,
    );
    if (kept.length > 0) {
      emittedImports.push(
        buildImportStatement(
          replacementModule,
          kept,
          decl.importKind === "type",
          quote,
        ),
      );
    }
  }

  if (emittedImports.length === 0) {
    removeDeclaration(magicString, source, decl.start, decl.end);
  } else {
    magicString.overwrite(decl.start, decl.end, emittedImports.join(newline));
  }
}

/**
 * Rewrites a single static import declaration.
 *
 * @param decl - Import declaration to rewrite.
 * @param matchingSpecs - Specifications matching this declaration.
 * @param magicString - The MagicString instance being mutated.
 * @param source - Original source code.
 * @param preserveNamedSpecifiers - Whether to preserve exact authored specifiers.
 * @param newline - Newline style of source.
 * @param referencedIdentifiers - Referenced identifiers for unused binding pruning.
 */
function rewriteStaticImportDeclaration(
  decl: ImportDeclaration,
  matchingSpecs: readonly ImportRewriteSpec[],
  magicString: MagicString,
  source: string,
  preserveNamedSpecifiers: boolean | undefined,
  newline: string,
  referencedIdentifiers?: Set<string>,
): void {
  if (
    tryPreserveSpecifiersFastPath(
      matchingSpecs,
      preserveNamedSpecifiers,
      decl,
      magicString,
      source,
    )
  ) {
    return;
  }

  const specsByModule = groupSpecsByReplacementModule(matchingSpecs);
  const quote = extractValidQuote(source, decl.source.start);

  if (decl.specifiers.length === 0) {
    rewriteSideEffectImport(
      decl,
      specsByModule,
      magicString,
      source,
      quote,
      newline,
    );
    return;
  }

  rewriteNamedImportDeclaration(
    decl,
    specsByModule,
    magicString,
    source,
    quote,
    newline,
    referencedIdentifiers,
  );
}

/**
 * Resolves the single valid replacement module for a dynamic import request.
 *
 * @param matchingSpecs - Specifications matching the dynamic import target.
 * @param unquoted - Unquoted module request string.
 * @returns The unique replacement module identifier.
 */
function resolveDynamicReplacementModule(
  matchingSpecs: readonly ImportRewriteSpec[],
  unquoted: string,
): string {
  const replacementModules = [
    ...new Set(
      matchingSpecs
        .map((spec) => spec.replacementModule)
        .filter(
          (moduleName): moduleName is string =>
            typeof moduleName === "string" && moduleName.length > 0,
        ),
    ),
  ];
  const hasRemoval = matchingSpecs.some((s) => !s.replacementModule);
  if (replacementModules.length !== 1 || hasRemoval) {
    throw new Error(
      `Dynamic import("${unquoted}") cannot be rewritten: expected exactly one distinct replacementModule without removals, but found ${
        replacementModules.length === 0
          ? "no replacement or removal"
          : `conflicting replacements (${replacementModules.join(", ")})`
      }.`,
    );
  }
  return replacementModules[0];
}

/**
 * Rewrites a single dynamic import if matching rewrite specifications exist.
 *
 * @param dyn - Dynamic import metadata.
 * @param source - Original source text.
 * @param specs - Rewrite specifications.
 * @param magicString - MagicString being mutated.
 * @returns True if the dynamic import was rewritten.
 */
function rewriteSingleDynamicImport(
  dyn: {
    readonly moduleRequest: { readonly start: number; readonly end: number };
  },
  source: string,
  specs: readonly ImportRewriteSpec[],
  magicString: MagicString,
): boolean {
  const raw = source.slice(dyn.moduleRequest.start, dyn.moduleRequest.end);
  const unquoted = raw.replaceAll(/^['"`]|['"`]$/g, "");
  const matchingSpecs = specs.filter(
    (candidate) => candidate.targetModule === unquoted,
  );
  if (matchingSpecs.length === 0) {
    return false;
  }

  const replacementModule = resolveDynamicReplacementModule(
    matchingSpecs,
    unquoted,
  );
  const quote = raw[0];
  const validQuote =
    quote === "'" || quote === '"' || quote === "`" ? quote : "'";
  magicString.overwrite(
    dyn.moduleRequest.start,
    dyn.moduleRequest.end,
    `${validQuote}${replacementModule}${validQuote}`,
  );
  return true;
}

/**
 * Rewrites dynamic import expressions matching target module specifications.
 *
 * @param magicString - The MagicString instance being mutated.
 * @param source - Original source code.
 * @param dynamicImports - Array of dynamic import metadata from the parser.
 * @param specs - List of rewrite specifications.
 * @returns True if at least one dynamic import was rewritten.
 */
function rewriteDynamicImports(
  magicString: MagicString,
  source: string,
  dynamicImports: readonly {
    readonly moduleRequest: { readonly start: number; readonly end: number };
  }[],
  specs: readonly ImportRewriteSpec[],
): boolean {
  let transformed = false;
  for (const dyn of dynamicImports) {
    if (rewriteSingleDynamicImport(dyn, source, specs, magicString)) {
      transformed = true;
    }
  }
  return transformed;
}

/**
 * Checks whether any rewrite specification target module appears in the source text.
 *
 * @param source - Source code to inspect.
 * @param specs - Rewrite specifications.
 * @returns True if at least one target module is found.
 */
function containsTargetModule(
  source: string,
  specs: readonly ImportRewriteSpec[],
): boolean {
  return specs.some((spec) => source.includes(spec.targetModule));
}

/**
 * Filters dynamic imports matching target rewrite specifications.
 *
 * @param source - Source text.
 * @param dynamicImports - Dynamic imports from AST.
 * @param specs - Target rewrite specs.
 * @returns Filtered matching dynamic imports.
 */
function filterMatchingDynamicImports(
  source: string,
  dynamicImports: readonly {
    readonly moduleRequest: { readonly start: number; readonly end: number };
  }[],
  specs: readonly ImportRewriteSpec[],
): {
  readonly moduleRequest: { readonly start: number; readonly end: number };
}[] {
  return dynamicImports.filter((dyn) => {
    const raw = source.slice(dyn.moduleRequest.start, dyn.moduleRequest.end);
    const unquoted = raw.replaceAll(/^['"`]|['"`]$/g, "");
    return specs.some((spec) => spec.targetModule === unquoted);
  });
}

/**
 * Rewrites all matching static import declarations in the source.
 *
 * @param matchingDeclarations - Declarations that match rewrite specs.
 * @param specs - Rewrite specs.
 * @param magicString - MagicString being mutated.
 * @param source - Original source text.
 * @param options - Rewrite options.
 * @param referencedIdentifiers - Referenced identifiers for pruning.
 */
function applyMatchingStaticRewrites(
  matchingDeclarations: readonly ImportDeclaration[],
  specs: readonly ImportRewriteSpec[],
  magicString: MagicString,
  source: string,
  options: RewriteImportsOptions,
  referencedIdentifiers?: Set<string>,
): void {
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  for (const decl of matchingDeclarations) {
    const matchingSpecs = specs.filter(
      (candidate) => candidate.targetModule === decl.source.value,
    );
    if (matchingSpecs.length > 0) {
      rewriteStaticImportDeclaration(
        decl,
        matchingSpecs,
        magicString,
        source,
        options.preserveNamedSpecifiers,
        newline,
        referencedIdentifiers,
      );
    }
  }
}

/**
 * Asserts that AST parsed successfully without errors.
 *
 * @param ast - CST parse result.
 * @param sourceFileName - Source file name for diagnostic reporting.
 */
function assertAstParseSuccess(
  ast: ParseResult,
  sourceFileName?: string,
): void {
  if (ast.errors.length > 0) {
    const firstError = ast.errors[0];
    throw new SyntaxError(
      `Failed to parse CST for ${sourceFileName ?? "source"}: ${firstError.message}`,
    );
  }
}

/**
 * Matched imports found in an AST program.
 */
interface MatchedImports {
  readonly staticDeclarations: readonly ImportDeclaration[];
  readonly dynamicImports: readonly {
    readonly moduleRequest: { readonly start: number; readonly end: number };
  }[];
  readonly allDeclarations: readonly ImportDeclaration[];
}

/**
 * Checks whether rewrite processing can be skipped early.
 *
 * @param source - Original source code.
 * @param specs - Normalized rewrite specs.
 * @returns True if rewrite can be skipped.
 */
function canSkipRewrite(
  source: string,
  specs: readonly ImportRewriteSpec[],
): boolean {
  if (specs.length === 0) {
    return true;
  }
  return !containsTargetModule(source, specs);
}

/**
 * Finds all static and dynamic imports matching rewrite specifications.
 *
 * @param ast - CST parse result.
 * @param source - Original source code.
 * @param specs - Normalized rewrite specs.
 * @returns Matched imports record.
 */
function findMatchedImports(
  ast: ParseResult,
  source: string,
  specs: readonly ImportRewriteSpec[],
): MatchedImports {
  const allDeclarations = getImportDeclarations(ast.program);
  const staticDeclarations = allDeclarations.filter((decl) =>
    specs.some((spec) => spec.targetModule === decl.source.value),
  );
  const dynamicImports = filterMatchingDynamicImports(
    source,
    ast.module.dynamicImports ?? [],
    specs,
  );
  return { staticDeclarations, dynamicImports, allDeclarations };
}

/**
 * Checks if at least one matching import was identified.
 *
 * @param matched - Matched imports record.
 * @returns True if any import matched.
 */
function hasAnyMatchedImports(matched: MatchedImports): boolean {
  if (matched.staticDeclarations.length > 0) {
    return true;
  }
  return matched.dynamicImports.length > 0;
}

/**
 * Resolves referenced identifiers for unused import binding removal.
 *
 * @param program - AST program node.
 * @param declarations - All import declarations.
 * @param specs - Rewrite specifications.
 * @returns Set of referenced identifiers if pruning is requested.
 */
function resolveReferencedIdentifiers(
  program: Program,
  declarations: readonly ImportDeclaration[],
  specs: readonly ImportRewriteSpec[],
): Set<string> | undefined {
  const hasRemoveUnused = specs.some((spec) => spec.removeUnused);
  if (hasRemoveUnused) {
    return collectReferencedIdentifiers(program, declarations);
  }
  return undefined;
}

/**
 * Checks whether at least one static or dynamic transformation was applied.
 *
 * @param staticCount - Number of matching static declarations.
 * @param dynamicTransformed - Whether dynamic imports were transformed.
 * @returns True if transformations were performed.
 */
function hasAppliedTransformations(
  staticCount: number,
  dynamicTransformed: boolean,
): boolean {
  if (staticCount > 0) {
    return true;
  }
  return dynamicTransformed;
}

/**
 * Constructs the successful rewrite result with generated source map.
 *
 * @param magicString - Mutated MagicString instance.
 * @param sourceFileName - Source file name for source map.
 * @returns Structured rewrite result.
 */
function createRewriteResult(
  magicString: MagicString,
  sourceFileName?: string,
): RewriteResult {
  const fileName =
    typeof sourceFileName === "string" ? sourceFileName : "source.tsx";
  return {
    code: magicString.toString(),
    map: magicString.generateMap({
      source: fileName,
      hires: "boundary",
      includeContent: true,
    }),
    transformed: true,
  };
}

/**
 * Rewrite imports in TypeScript/TSX source code using an accurate Concrete Syntax Tree (CST).
 *
 * Preserves comments, multiline formatting, and AST integrity without fragile regex parsing.
 */
export function rewriteImportsWithCst(
  source: string,
  options: RewriteImportsOptions,
): RewriteResult {
  const specs = normalizeRewriteSpecs(options);
  if (canSkipRewrite(source, specs)) {
    return { code: source, map: undefined, transformed: false };
  }

  const ast = parseCst(source, options.sourceFileName);
  assertAstParseSuccess(ast, options.sourceFileName);

  const matched = findMatchedImports(ast, source, specs);
  if (!hasAnyMatchedImports(matched)) {
    return { code: source, map: undefined, transformed: false };
  }

  const magicString = new MagicString(source);
  const referencedIdentifiers = resolveReferencedIdentifiers(
    ast.program,
    matched.allDeclarations,
    specs,
  );

  applyMatchingStaticRewrites(
    matched.staticDeclarations,
    specs,
    magicString,
    source,
    options,
    referencedIdentifiers,
  );

  const dynamicTransformed = rewriteDynamicImports(
    magicString,
    source,
    matched.dynamicImports,
    specs,
  );

  if (
    !hasAppliedTransformations(
      matched.staticDeclarations.length,
      dynamicTransformed,
    )
  ) {
    return { code: source, map: undefined, transformed: false };
  }

  return createRewriteResult(magicString, options.sourceFileName);
}
