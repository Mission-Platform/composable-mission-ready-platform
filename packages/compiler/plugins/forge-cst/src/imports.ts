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

function removeDeclaration(
  s: MagicString,
  source: string,
  start: number,
  end: number,
): void {
  let lineStart = source.lastIndexOf("\n", start - 1);
  lineStart = lineStart === -1 ? 0 : lineStart + 1;
  const isLineStartWhitespace = source.slice(lineStart, start).trim() === "";

  let removeEnd = end;
  if (isLineStartWhitespace) {
    if (source[removeEnd] === "\r" && source[removeEnd + 1] === "\n") {
      removeEnd += 2;
      s.remove(lineStart, removeEnd);
      return;
    }
    if (source[removeEnd] === "\n") {
      removeEnd += 1;
      s.remove(lineStart, removeEnd);
      return;
    }
    if (removeEnd === source.length) {
      s.remove(lineStart, removeEnd);
      return;
    }
  }

  s.remove(start, end);
}

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
 * Rewrite imports in TypeScript/TSX source code using an accurate Concrete Syntax Tree (CST).
 *
 * Preserves comments, multiline formatting, and AST integrity without fragile regex parsing.
 */
export function rewriteImportsWithCst(
  source: string,
  options: RewriteImportsOptions,
): RewriteResult {
  const specs: ImportRewriteSpec[] = [];
  if (options.rewrites && options.rewrites.length > 0) {
    specs.push(...options.rewrites);
  } else if (options.targetModule !== undefined) {
    specs.push({
      targetModule: options.targetModule,
      replacementModule: options.replacementModule,
      specifiers: options.specifiers,
      removeUnused: options.removeUnused,
    });
  }

  if (specs.length === 0) {
    return { code: source, map: undefined, transformed: false };
  }

  // Fast check: if the source does not even contain any target module name, return unmodified
  if (!specs.some((spec) => source.includes(spec.targetModule))) {
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

  // Dynamic imports matching specs
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

  const s = new MagicString(source);
  let transformed = false;

  const hasRemoveUnused = specs.some((spec) => spec.removeUnused);
  let referencedIdentifiers: Set<string> | undefined;
  if (hasRemoveUnused) {
    referencedIdentifiers = collectReferencedIdentifiers(
      ast.program,
      allImportDeclarations,
    );
  }

  for (const decl of matchingDeclarations) {
    const spec = specs.find(
      (candidate) => candidate.targetModule === decl.source.value,
    );
    if (!spec) continue;

    // Removal case: replacementModule is omitted or explicitly undefined/empty
    if (spec.replacementModule === undefined || spec.replacementModule === "") {
      removeDeclaration(s, source, decl.start, decl.end);
      transformed = true;
      continue;
    }

    const shouldPreserve =
      options.preserveNamedSpecifiers === true ||
      (spec.specifiers === undefined && !spec.removeUnused);

    if (shouldPreserve) {
      // Non-destructive module specifier rewrite: preserves all comments and layout
      const quote = source[decl.source.start];
      const validQuote = quote === "'" || quote === '"' ? quote : "'";
      s.overwrite(
        decl.source.start,
        decl.source.end,
        `${validQuote}${spec.replacementModule}${validQuote}`,
      );
      transformed = true;
      continue;
    }

    // Specifier-level rewriting and filtering
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
        // No default
      }
    }

    let keptSpecifiers = parsedSpecifiers;

    if (spec.specifiers !== undefined) {
      keptSpecifiers = keptSpecifiers.flatMap((item) => {
        const mapping = spec.specifiers?.find(
          (m) =>
            m.importedName === item.importedName ||
            m.localName === item.localName,
        );
        if (!mapping) return [];
        return [
          {
            ...item,
            importedName: mapping.importedName,
            localName: mapping.localName ?? item.localName,
          },
        ];
      });
    }

    if (spec.removeUnused && referencedIdentifiers) {
      keptSpecifiers = keptSpecifiers.filter((item) =>
        referencedIdentifiers.has(item.localName),
      );
    }

    if (keptSpecifiers.length === 0) {
      removeDeclaration(s, source, decl.start, decl.end);
      transformed = true;
      continue;
    }

    const quote = source[decl.source.start];
    const validQuote = quote === "'" || quote === '"' ? quote : "'";
    const isTypeOnly = decl.importKind === "type";
    const typePrefix = isTypeOnly ? "type " : "";
    const parts: string[] = [];

    const defaultSpec = keptSpecifiers.find((item) => item.kind === "default");
    if (defaultSpec) {
      parts.push(defaultSpec.localName);
    }

    const namespaceSpec = keptSpecifiers.find(
      (item) => item.kind === "namespace",
    );
    if (namespaceSpec) {
      parts.push(`* as ${namespaceSpec.localName}`);
    }

    const namedSpecs = keptSpecifiers.filter((item) => item.kind === "named");
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

    const newImport = `import ${typePrefix}${parts.join(", ")} from ${validQuote}${spec.replacementModule}${validQuote};`;
    s.overwrite(decl.start, decl.end, newImport);
    transformed = true;
  }

  // Handle dynamic imports
  for (const dyn of matchingDynamicImports) {
    const raw = source.slice(dyn.moduleRequest.start, dyn.moduleRequest.end);
    const quote = raw[0];
    const unquoted = raw.replaceAll(/^['"`]|['"`]$/g, "");
    const spec = specs.find((candidate) => candidate.targetModule === unquoted);
    if (!spec || !spec.replacementModule) continue;

    const validQuote =
      quote === "'" || quote === '"' || quote === "`" ? quote : "'";
    s.overwrite(
      dyn.moduleRequest.start,
      dyn.moduleRequest.end,
      `${validQuote}${spec.replacementModule}${validQuote}`,
    );
    transformed = true;
  }

  if (!transformed) {
    return { code: source, map: undefined, transformed: false };
  }

  const map = s.generateMap({
    source: options.sourceFileName ?? "source.tsx",
    hires: "boundary",
    includeContent: true,
  });

  return {
    code: s.toString(),
    map,
    transformed: true,
  };
}
