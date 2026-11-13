import {
  createDiagnostic,
  FLINT_PARSE_STACK_OVERFLOW,
  type FlintDiagnostic,
  type FlintFunction,
  type FlintPrimitiveType,
  type FlintSourceSpan,
  type FlintStatement,
  type FlintToken,
} from "@mission-platform/flint-ast";

import { parseFlintDocumentation } from "../documentation.js";

const contextualIdentifierKeywords = new Set([
  "setup",
  "event",
  "emit",
  "property",
  "properties",
  "emits",
  "events",
  "model",
  "readonly",
]);

/** Maximum token lookahead budget for indexed assignment resolution. */
export const MAX_INDEX_ASSIGNMENT_LOOKAHEAD = 64;

/** Maximum bracket nesting depth for indexed assignment resolution. */
export const MAX_INDEX_BRACKET_DEPTH = 32;

export const primitiveTypes = new Set<FlintPrimitiveType>([
  "bool",
  "bytes",
  "f32",
  "f64",
  "i32",
  "i64",
  "string",
  "u32",
  "u64",
  "unit",
  "u8",
  "i8",
  "c_char",
  "c_uchar",
  "c_short",
  "c_ushort",
  "c_int",
  "c_uint",
  "c_long",
  "c_ulong",
  "c_longlong",
  "c_ulonglong",
  "c_size",
  "c_ssize",
  "c_float",
  "c_double",
  "c_void",
]);

/**
 * Result of parsing a raw numeric literal token string.
 */
export interface ParsedNumericLiteral {
  readonly value: number;
  readonly type: FlintPrimitiveType;
  readonly raw: string;
}

export const NUMERIC_TYPE_SUFFIXES: readonly FlintPrimitiveType[] = [
  "c_ulonglong",
  "c_longlong",
  "c_ushort",
  "c_uchar",
  "c_double",
  "c_ssize",
  "c_float",
  "c_short",
  "c_ulong",
  "c_uint",
  "c_size",
  "c_char",
  "c_long",
  "c_void",
  "c_int",
  "i64",
  "u64",
  "f64",
  "i32",
  "u32",
  "f32",
  "i8",
  "u8",
];

/**
 * Merges start and end spans into a contiguous enclosing source span.
 *
 * @param start - Starting source span.
 * @param end - Ending source span.
 * @returns Combined source span.
 */
export function mergeSpans(
  start: FlintSourceSpan,
  end: FlintSourceSpan,
): FlintSourceSpan {
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
export function decodeString(token: string): string {
  try {
    return JSON.parse(token) as string;
  } catch {
    return token.slice(1, -1);
  }
}

/**
 * Parses a raw numeric literal token into its numerical value and Flint primitive type.
 *
 * @param raw - Raw token text.
 * @returns Parsed numeric literal object containing value, primitive type, and original raw text.
 */
export function parseNumericLiteral(raw: string): ParsedNumericLiteral {
  let body = raw;
  let explicitType: FlintPrimitiveType | undefined;

  for (const suffix of NUMERIC_TYPE_SUFFIXES) {
    if (body.endsWith(suffix)) {
      const before = body.slice(0, body.length - suffix.length);
      if (before.endsWith("_")) {
        body = before.slice(0, -1);
        explicitType = suffix;
        break;
      } else if (before.length > 0) {
        const lastChar = before.at(-1);
        if (
          lastChar !== undefined &&
          ((lastChar >= "0" && lastChar <= "9") ||
            (lastChar >= "a" && lastChar <= "f") ||
            (lastChar >= "A" && lastChar <= "F"))
        ) {
          body = before;
          explicitType = suffix;
          break;
        }
      }
    }
  }

  const cleanBody = body.replaceAll("_", "");
  let value: number;
  let inferredType: FlintPrimitiveType = "i32";

  if (cleanBody.startsWith("0x") || cleanBody.startsWith("0X")) {
    value = Number.parseInt(cleanBody.slice(2), 16);
  } else if (cleanBody.startsWith("0b") || cleanBody.startsWith("0B")) {
    value = Number.parseInt(cleanBody.slice(2), 2);
  } else if (cleanBody.startsWith("0o") || cleanBody.startsWith("0O")) {
    value = Number.parseInt(cleanBody.slice(2), 8);
  } else if (
    cleanBody.includes(".") ||
    cleanBody.includes("e") ||
    cleanBody.includes("E")
  ) {
    value = Number.parseFloat(cleanBody);
    inferredType = "f64";
  } else {
    value = Number(cleanBody);
  }

  return {
    value: Number.isNaN(value) ? 0 : value,
    type: explicitType ?? inferredType,
    raw,
  };
}

/**
 * Shared context and streaming state for Flint recursive-descent parsing.
 */
export class ParserContext {
  public readonly tokens: readonly FlintToken[];
  public readonly fileName: string;
  public readonly diagnostics: FlintDiagnostic[];
  public readonly maxCallDepth: number;
  public index = 0;
  public callDepth = 0;
  public hasReportedStackOverflow = false;

  public constructor(
    tokens: readonly FlintToken[],
    fileName: string,
    diagnostics: readonly FlintDiagnostic[],
    maxCallDepth = 512,
    source = "",
  ) {
    this.tokens = tokens;
    this.fileName = fileName;
    this.diagnostics = [...diagnostics];
    this.maxCallDepth = maxCallDepth;
    this.source = source;
  }

  public readonly source: string;

  /**
   * Returns the current token in the input stream.
   *
   * @returns Current token.
   */
  public current(): FlintToken {
    while (this.tokens[this.index]?.kind === "comment") this.index += 1;
    return this.tokens[this.index] ?? this.tokens.at(-1)!;
  }

  /**
   * Returns the most recently consumed token in the input stream.
   *
   * @returns Previous token.
   */
  public previous(): FlintToken {
    for (let index = this.index - 1; index >= 0; index -= 1) {
      if (this.tokens[index]?.kind !== "comment") return this.tokens[index]!;
    }
    return this.current();
  }

  /**
   * Checks whether the current token has the specified text.
   *
   * @param text - Expected token text.
   * @returns True if text matches.
   */
  public is(text: string): boolean {
    return (
      this.current().text === text ||
      (text === "eof" && this.current().kind === "eof")
    );
  }

  /**
   * Checks whether the lookahead token has the specified text.
   *
   * @param text - Expected lookahead token text.
   * @returns True if lookahead text matches.
   */
  public isNext(text: string): boolean {
    return this.tokenAt(this.index + 1)?.text === text;
  }

  /**
   * Consumes the current token if it matches the specified text.
   *
   * @param text - Expected token text.
   * @returns True if matched and consumed.
   */
  public match(text: string): boolean {
    if (!this.is(text)) return false;
    this.consume();
    return true;
  }

  /**
   * Consumes and returns the current token, advancing parser state.
   *
   * @returns Consumed token.
   */
  public consume(): FlintToken {
    const token = this.current();
    if (token.kind !== "eof") this.index += 1;
    return token;
  }

  /**
   * Returns the token at the given relative offset from the current position.
   *
   * @param index - Lookahead offset.
   * @returns Token at offset or undefined.
   */
  public tokenAt(index: number): FlintToken | undefined {
    let candidate = index;
    while (this.tokens[candidate]?.kind === "comment") candidate += 1;
    return this.tokens[candidate];
  }

  /**
   * Consumes whitespace and doc comments preceding a top-level declaration.
   *
   * @returns Parsed documentation structure or undefined.
   */
  public consumeTopLevelTrivia(): FlintFunction["documentation"] | undefined {
    let documentation: FlintFunction["documentation"];
    while (this.tokens[this.index]?.kind === "comment") {
      const comment = this.tokens[this.index]!;
      this.index += 1;
      if (comment.text.startsWith("/**"))
        documentation = parseFlintDocumentation(comment.text);
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
  public expect(text: string, code: string, message: string): FlintToken {
    if (this.is(text)) return this.consume();
    this.diagnostics.push(
      createDiagnostic(
        this.fileName,
        "parse",
        code,
        message,
        this.current().span,
      ),
    );
    return { kind: "punctuation", text, span: this.current().span };
  }

  /**
   * Consumes the current token if its kind matches, or reports an error diagnostic.
   *
   * @param kind - Expected token kind.
   * @param code - Diagnostic error code.
   * @param message - Diagnostic actionable hint.
   * @returns Matched token or placeholder.
   */
  public expectKind(
    kind: FlintToken["kind"],
    code: string,
    message: string,
  ): FlintToken {
    if (this.current().kind === kind) return this.consume();
    this.diagnostics.push(
      createDiagnostic(
        this.fileName,
        "parse",
        code,
        message,
        this.current().span,
      ),
    );
    return { kind, text: "", span: this.current().span };
  }

  /**
   * Consumes and returns an identifier token text, or reports an error diagnostic.
   *
   * @param code - Diagnostic error code.
   * @param message - Diagnostic actionable hint.
   * @returns Identifier text or undefined.
   */
  public expectIdentifier(code: string, message: string): string | undefined {
    if (
      this.current().kind === "identifier" ||
      (this.current().kind === "keyword" &&
        contextualIdentifierKeywords.has(this.current().text))
    )
      return this.consume().text;
    this.diagnostics.push(
      createDiagnostic(
        this.fileName,
        "parse",
        code,
        message,
        this.current().span,
      ),
    );
    return undefined;
  }

  /**
   * Consumes the expected closing delimiter token. If EOF is reached before the closing
   * delimiter, emits FLINT-PARSE-004 anchored to the opening delimiter span. Otherwise,
   * if a non-EOF unexpected token is encountered, emits the fallback diagnostic.
   *
   * @param text - Expected closing delimiter text.
   * @param openSpan - Source span of the matching opening delimiter.
   * @param fallbackCode - Fallback diagnostic code if unexpected non-EOF token is met.
   * @param fallbackMessage - Fallback diagnostic message.
   * @returns Matched token or placeholder.
   */
  public expectClosingDelimiter(
    text: string,
    openSpan: FlintSourceSpan,
    fallbackCode: string,
    fallbackMessage: string,
  ): FlintToken {
    if (this.is(text)) return this.consume();
    if (this.is("eof")) {
      const alreadyReported = this.diagnostics.some(
        (d) =>
          d.code === "FLINT-PARSE-004" &&
          d.span.start === openSpan.start &&
          d.span.end === openSpan.end,
      );
      if (!alreadyReported) {
        this.diagnostics.push(
          createDiagnostic(
            this.fileName,
            "parse",
            "FLINT-PARSE-004",
            "Unclosed delimiter: missing matching closing delimiter.",
            openSpan,
            "error",
            `Insert matching closing delimiter '${text}'.`,
          ),
        );
      }
      return { kind: "punctuation", text, span: this.current().span };
    }
    this.diagnostics.push(
      createDiagnostic(
        this.fileName,
        "parse",
        fallbackCode,
        fallbackMessage,
        this.current().span,
      ),
    );
    return { kind: "punctuation", text, span: this.current().span };
  }

  /**
   * Consumes and returns a valid member name identifier or keyword.
   *
   * @param code - Diagnostic error code.
   * @param message - Diagnostic actionable hint.
   * @returns Member name string or undefined.
   */
  public expectMemberName(code: string, message: string): string | undefined {
    const token = this.current();
    if (token.kind === "identifier" || token.kind === "keyword")
      return this.consume().text;
    this.diagnostics.push(
      createDiagnostic(this.fileName, "parse", code, message, token.span),
    );
    return undefined;
  }

  /**
   * Creates a placeholder error statement node for recovery.
   *
   * @param token - Source token for statement.
   * @returns Placeholder statement node.
   */
  public static rejectedStatement(token: FlintToken): FlintStatement {
    return {
      kind: "expression-statement",
      expression: { kind: "literal", value: 0, type: "i32", span: token.span },
      span: token.span,
    };
  }

  /**
   * Checks whether the current token matches a disallowed object-oriented keyword.
   *
   * @returns True if current token is a forbidden class keyword.
   */
  // skipcq: JS-R1005
  public isDisallowedClassKeyword(): boolean {
    return (
      this.is("class") ||
      this.is("constructor") ||
      this.is("extends") ||
      this.is("impl") ||
      this.is("new") ||
      this.is("trait")
    );
  }

  /** Validates that an alignment number is a positive power of two. */
  public static isPositivePowerOfTwo(value: number): boolean {
    return Number.isInteger(value) && value > 0 && (value & (value - 1)) === 0;
  }

  /**
   * Executes a parsing action within a tracked and bounded call depth stack.
   *
   * @param fallback - Callback producing a placeholder value if the recursion budget is exceeded.
   * @param action - The parsing action to execute.
   * @returns The parsed result or fallback AST placeholder.
   */
  public withDepthGuard<
    T extends
      | object
      | string
      | number
      | boolean
      | null
      | undefined
      | readonly unknown[],
  >(fallback: () => T, action: () => T): T {
    if (this.callDepth >= this.maxCallDepth) {
      if (!this.hasReportedStackOverflow) {
        this.hasReportedStackOverflow = true;
        this.diagnostics.push(
          createDiagnostic(
            this.fileName,
            "parse",
            FLINT_PARSE_STACK_OVERFLOW,
            `Maximum recursion call depth (${this.maxCallDepth}) exceeded.`,
            this.current().span,
            "error",
            "Reduce syntactic nesting depth or increase maxCallDepth.",
          ),
        );
      }
      return fallback();
    }
    this.callDepth += 1;
    try {
      return action();
    } finally {
      this.callDepth -= 1;
    }
  }
}
