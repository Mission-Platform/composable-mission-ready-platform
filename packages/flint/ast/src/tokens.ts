import type { FlintSourceSpan } from "./span.js";

/**
 * Valid lexical token kinds recognized by the Flint lexer.
 */
export type FlintTokenKind =
  | "eof"
  | "comment"
  | "identifier"
  | "number"
  | "string"
  | "keyword"
  | "operator"
  | "punctuation";

/**
 * Structured token representing a recognized lexical element in Flint source code.
 */
export interface FlintToken {
  readonly kind: FlintTokenKind;
  readonly text: string;
  readonly span: FlintSourceSpan;
}

export const FLINT_KEYWORDS: ReadonlySet<string> = new Set([
  "as",
  "capability",
  "case",
  "class",
  "comptime",
  "constructor",
  "default",
  "derive",
  "else",
  "enum",
  "extends",
  "export",
  "do",
  "for",
  "foreign",
  "from",
  "fn",
  "iter",
  "if",
  "impl",
  "interface",
  "import",
  "let",
  "macro",
  "match",
  "module",
  "mut",
  "new",
  "opaque",
  "return",
  "struct",
  "record",
  "switch",
  "trait",
  "type",
  "while",
  "loop",
  "yield",
  "throw",
  "try",
  "catch",
  "setup",
  "event",
  "emit",
  "property",
  "properties",
  "emits",
  "events",
  "model",
  "readonly",
  "inline",
  "noinline",
  "likely",
  "unlikely",
]);

export const TWO_CHAR_OPS: ReadonlySet<string> = new Set([
  "!=",
  "&&",
  "==",
  "||",
  "<=",
  ">=",
  "->",
  "=>",
  "::",
  "|>",
]);

export const ONE_CHAR_OPS: ReadonlySet<string> = new Set([
  "!",
  "%",
  "*",
  "+",
  "-",
  "/",
  "<",
  ">",
  "=",
  "&",
  "?",
]);

export const PUNCTUATION_SYMBOLS: ReadonlySet<string> = new Set([
  "{",
  "}",
  "(",
  ")",
  "[",
  "]",
  ":",
  ";",
  ",",
  "|",
  ".",
  "#",
  "@",
]);
