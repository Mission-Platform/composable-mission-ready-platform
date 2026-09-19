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
 * Extracts normalized specifier records from an import declaration.
 *
 * @param decl - An OXC import declaration node.
 * @returns Array of parsed import specifiers.
 */
function parseSpecifiersFromDeclaration(
  decl: ImportDeclaration,
): ParsedSpecifier[] {
  const parsedSpecifiers: ParsedSpecifier[] = [];
  for (const specifier of decl.specifiers) {
    switch (specifier.type) {
      case "ImportDefaultSpecifier": {
        parsedSpecifiers.push({
          kind: "default",
          importedName: "default",
          localName: specifier.local.name,
          typeOnly: decl.importKind === "type",
        });
        break;
      }
      case "ImportNamespaceSpecifier": {
        parsedSpecifiers.push({
          kind: "namespace",
          importedName: "*",
          localName: specifier.local.name,
          typeOnly: decl.importKind === "type",
        });
        break;
      }
      case "ImportSpecifier": {
        const importedName =
          specifier.imported.type === "Identifier"
            ? specifier.imported.name
            : specifier.imported.value;
        parsedSpecifiers.push({
          kind: "named",
          importedName,
          localName: specifier.local.name,
          typeOnly:
            specifier.importKind === "type" || decl.importKind === "type",
        });
        break;
      }
      default: {
        break;
      }
    }
  }
  return parsedSpecifiers;
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
  const mapping = rules.find((m) =>
    m.sourceName === undefined
      ? m.localName === item.importedName ||
        m.localName === item.localName ||
        m.importedName === item.importedName
      : m.sourceName === item.importedName,
  );
  if (!mapping) return undefined;
  return {
    ...item,
    importedName: mapping.importedName,
    localName:
      item.localName === item.importedName
        ? (mapping.localName ?? item.localName)
        : item.localName,
  };
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
  const hasDefinedSpecifiers = moduleSpecs.some(
    (sp) => sp.specifiers !== undefined,
  );

  let keptSpecifiers: ParsedSpecifier[];
  if (hasDefinedSpecifiers) {
    const rules = moduleSpecs.flatMap((sp) => sp.specifiers ?? []);
    keptSpecifiers = parsed.flatMap((item) => {
      const mapped = mapSpecifierWithRules(item, rules);
      return mapped ? [mapped] : [];
    });
  } else if (totalModules === 1) {
    keptSpecifiers = [...parsed];
  } else {
    keptSpecifiers = [];
  }

  const hasRemoveUnused = moduleSpecs.some((sp) => sp.removeUnused);
  if (hasRemoveUnused && referencedIdentifiers) {
    keptSpecifiers = keptSpecifiers.filter((item) =>
      referencedIdentifiers.has(item.localName),
    );
  }

  return keptSpecifiers;
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
  const parts: string[] = [];

  const defaultSpec = keptSpecifiers.find(
    (item) => item.kind === "default" || item.importedName === "default",
  );
  if (defaultSpec) {
    parts.push(defaultSpec.localName);
  }

  const namespaceSpec = keptSpecifiers.find(
    (item) => item.kind === "namespace" || item.importedName === "*",
  );
  if (namespaceSpec) {
    parts.push(`* as ${namespaceSpec.localName}`);
  }

  const namedSpecs = keptSpecifiers.filter(
    (item) =>
      item.kind === "named" &&
      item.importedName !== "default" &&
      item.importedName !== "*",
  );
  if (namedSpecs.length > 0) {
    const namedStrings = namedSpecs.map((item) => {
      const inlineType = !isTypeOnly && item.typeOnly ? "type " : "";
      if (item.localName === item.importedName) {
        return `${inlineType}${item.importedName}`;
      }
      return `${inlineType}${item.importedName} as ${item.localName}`;
    });
    parts.push(`{ ${namedStrings.join(", ")} }`);
  }

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
  if (
    matchingSpecs.length !== 1 ||
    preserveNamedSpecifiers !== true ||
    matchingSpecs[0].specifiers !== undefined ||
    matchingSpecs[0].removeUnused
  ) {
    return false;
  }

  const singleSpec = matchingSpecs[0];
  if (!singleSpec.replacementModule) {
    removeDeclaration(magicString, source, decl.start, decl.end);
    return true;
  }

  const quote = source[decl.source.start];
  const validQuote = quote === "'" || quote === '"' ? quote : "'";
  magicString.overwrite(
    decl.source.start,
    decl.source.end,
    `${validQuote}${singleSpec.replacementModule}${validQuote}`,
  );
  return true;
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
  const rawQuote = source[decl.source.start];
  const quote = rawQuote === "'" || rawQuote === '"' ? rawQuote : "'";

  if (decl.specifiers.length === 0) {
    const emitted = [...specsByModule.keys()].map(
      (targetModule) => `import ${quote}${targetModule}${quote};`,
    );
    if (emitted.length === 0) {
      removeDeclaration(magicString, source, decl.start, decl.end);
    } else {
      magicString.overwrite(decl.start, decl.end, emitted.join(newline));
    }
    return;
  }

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
    const raw = source.slice(dyn.moduleRequest.start, dyn.moduleRequest.end);
    const quote = raw[0];
    const unquoted = raw.replaceAll(/^['"`]|['"`]$/g, "");
    const spec = specs.find((candidate) => candidate.targetModule === unquoted);
    if (!spec || !spec.replacementModule) continue;

    const validQuote =
      quote === "'" || quote === '"' || quote === "`" ? quote : "'";
    magicString.overwrite(
      dyn.moduleRequest.start,
      dyn.moduleRequest.end,
      `${validQuote}${spec.replacementModule}${validQuote}`,
    );
    transformed = true;
  }
  return transformed;
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
  if (
    specs.length === 0 ||
    !specs.some((spec) => source.includes(spec.targetModule))
  ) {
    return { code: source, map: undefined, transformed: false };
  }

  const ast = parseCst(source, options.sourceFileName);
  if (ast.errors.length > 0) {
    const firstError = ast.errors[0];
    throw new SyntaxError(
      `Failed to parse CST for ${options.sourceFileName ?? "source"}: ${firstError.message}`,
    );
  }

  const allImportDeclarations = getImportDeclarations(ast.program);
  const matchingDeclarations = allImportDeclarations.filter((decl) =>
    specs.some((spec) => spec.targetModule === decl.source.value),
  );
  const matchingDynamicImports = (ast.module.dynamicImports ?? []).filter(
    (dyn) => {
      const raw = source.slice(dyn.moduleRequest.start, dyn.moduleRequest.end);
      const unquoted = raw.replaceAll(/^['"`]|['"`]$/g, "");
      return specs.some((spec) => spec.targetModule === unquoted);
    },
  );

  if (
    matchingDeclarations.length === 0 &&
    matchingDynamicImports.length === 0
  ) {
    return { code: source, map: undefined, transformed: false };
  }

  const magicString = new MagicString(source);
  const hasRemoveUnused = specs.some((spec) => spec.removeUnused);
  const referencedIdentifiers = hasRemoveUnused
    ? collectReferencedIdentifiers(ast.program, allImportDeclarations)
    : undefined;

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

  const dynamicTransformed = rewriteDynamicImports(
    magicString,
    source,
    matchingDynamicImports,
    specs,
  );

  const transformed = matchingDeclarations.length > 0 || dynamicTransformed;
  if (!transformed) {
    return { code: source, map: undefined, transformed: false };
  }

  const map = magicString.generateMap({
    source: options.sourceFileName ?? "source.tsx",
    hires: "boundary",
    includeContent: true,
  });

  return {
    code: magicString.toString(),
    map,
    transformed: true,
  };
}
