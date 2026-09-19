import { parseSync, type ParserOptions } from "oxc-parser";

/**
 * Options configuring CST parsing.
 */
export interface ParseCstOptions extends ParserOptions {
  readonly fileName?: string;
}

const EXTENSION_LANGUAGE_MAP: readonly (readonly [
  string,
  NonNullable<ParserOptions["lang"]>,
])[] = [
  [".d.ts", "dts"],
  [".tsx", "tsx"],
  [".ts", "ts"],
  [".jsx", "jsx"],
  [".js", "js"],
  [".mjs", "js"],
  [".cjs", "js"],
];

/**
 * Detects the language variant for OXC parser based on file extension.
 *
 * @param fileName - File name or path to inspect.
 * @returns The matching parser language identifier.
 */
function detectSourceLanguage(
  fileName: string,
): NonNullable<ParserOptions["lang"]> {
  const matched = EXTENSION_LANGUAGE_MAP.find(([extension]) =>
    fileName.endsWith(extension),
  );
  return matched ? matched[1] : "tsx";
}

/**
 * Parse TypeScript/JavaScript/TSX source text into a Concrete Syntax Tree (CST)
 * with token positions, comments, and full AST metadata.
 */
export function parseCst(
  source: string,
  options?: ParseCstOptions | string,
): ParseResult {
  const fileName =
    typeof options === "string" ? options : (options?.fileName ?? "source.tsx");
  const explicitOptions =
    typeof options === "object" && options !== null ? options : {};

  const lang = explicitOptions.lang ?? detectSourceLanguage(fileName);

  return parseSync(fileName, source, {
    lang,
    sourceType: "module",
    astType: "ts",
    ...explicitOptions,
  });
}

/**
 * Extract all top-level import declarations from a parsed program AST.
 */
export function getImportDeclarations(
  program: Program,
): readonly ImportDeclaration[] {
  return program.body.filter(
    (node): node is ImportDeclaration => node.type === "ImportDeclaration",
  );
}

export {
  type ParseResult,
  type Comment,
  type OxcError,
  type Program,
  type ImportDeclaration,
  type Statement,
  Visitor,
  parseSync,
  type ParserOptions,
} from "oxc-parser";
