import { describe, expect, it } from "vitest";

import {
  FLINT_SECURITY_SOURCE_TOO_LARGE,
  MAX_SOURCE_INPUT_BYTES,
} from "@mission-platform/flint-ast";

import { lexFlint } from "./lexer.js";

function expectBoundedSpans(source: string): void {
  const result = lexFlint(source, "strings.flint");
  for (const token of result.tokens) {
    expect(token.span.start).toBeGreaterThanOrEqual(0);
    expect(token.span.end).toBeLessThanOrEqual(source.length);
  }
  for (const diagnostic of result.diagnostics) {
    expect(diagnostic.span.start).toBeGreaterThanOrEqual(0);
    expect(diagnostic.span.end).toBeLessThanOrEqual(source.length);
  }
}

describe("Flint string lexing", () => {
  it("accepts every JSON-compatible escape and preserves the token text", () => {
    const source = String.raw`"\\ \" \/ \b \f \n \r \t \u0041"`;
    const result = lexFlint(source, "strings.flint");

    expect(result.diagnostics).toEqual([]);
    expect(result.tokens[0]).toMatchObject({ kind: "string", text: source });
    expect(result.tokens[0]?.span.end).toBe(source.length);
    expectBoundedSpans(source);
  });

  it.each([
    [String.raw`"\q"`, "FLINT-LEX-004"],
    [String.raw`"\u12z4"`, "FLINT-LEX-004"],
  ])("rejects invalid escape syntax: %s", (source, code) => {
    const result = lexFlint(source, "strings.flint");

    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code }),
    );
    expectBoundedSpans(source);
  });

  it("rejects raw line terminators inside strings", () => {
    const source = '"line\ntext"';
    const result = lexFlint(source, "strings.flint");

    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "FLINT-LEX-005" }),
    );
    expectBoundedSpans(source);
  });

  it("reports unterminated strings without exceeding the source bounds", () => {
    const source = '"unterminated';
    const result = lexFlint(source, "strings.flint");

    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "FLINT-LEX-001" }),
    );
    expectBoundedSpans(source);
  });

  it("handles a trailing backslash without exceeding the source bounds", () => {
    const source = '"trailing' + "\\";
    const result = lexFlint(source, "strings.flint");

    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "FLINT-LEX-001" }),
    );
    expect(result.tokens[0]?.span.end).toBe(source.length);
    expectBoundedSpans(source);
  });
});

describe("Flint grammar-directed lexing", () => {
  it("uses longest-match operators and preserves punctuation boundaries", () => {
    const source = "= == ! != - -> | || : :: => |>";
    const result = lexFlint(source, "operators.flint");

    expect(result.diagnostics).toEqual([]);
    expect(result.tokens.map(({ kind, text }) => ({ kind, text }))).toEqual([
      { kind: "operator", text: "=" },
      { kind: "operator", text: "==" },
      { kind: "operator", text: "!" },
      { kind: "operator", text: "!=" },
      { kind: "operator", text: "-" },
      { kind: "operator", text: "->" },
      { kind: "punctuation", text: "|" },
      { kind: "operator", text: "||" },
      { kind: "punctuation", text: ":" },
      { kind: "operator", text: "::" },
      { kind: "operator", text: "=>" },
      { kind: "operator", text: "|>" },
      { kind: "eof", text: "" },
    ]);
  });

  it("retains comments while skipping all grammar whitespace", () => {
    const source =
      "\uFEFFfn\u2003value/* block\r\ncomment */ // line\r\nreturn";
    const result = lexFlint(source, "comments.flint");

    expect(result.diagnostics).toEqual([]);
    expect(result.tokens.map(({ kind, text }) => ({ kind, text }))).toEqual([
      { kind: "keyword", text: "fn" },
      { kind: "identifier", text: "value" },
      { kind: "comment", text: "/* block\r\ncomment */" },
      { kind: "comment", text: "// line\r" },
      { kind: "keyword", text: "return" },
      { kind: "eof", text: "" },
    ]);
  });

  it("classifies reserved words without consuming identifier prefixes", () => {
    const source = "fn fnValue _private value2 true false";
    const result = lexFlint(source, "identifiers.flint");

    expect(result.diagnostics).toEqual([]);
    expect(
      result.tokens.slice(0, -1).map(({ kind, text }) => ({ kind, text })),
    ).toEqual([
      { kind: "keyword", text: "fn" },
      { kind: "identifier", text: "fnValue" },
      { kind: "identifier", text: "_private" },
      { kind: "identifier", text: "value2" },
      { kind: "identifier", text: "true" },
      { kind: "identifier", text: "false" },
    ]);
  });

  it("keeps CRLF and UTF-16 source spans stable", () => {
    const source = 'fn value() -> i32 {\r\n  return "🙂";\n}';
    const result = lexFlint(source, "spans.flint");
    const returnToken = result.tokens.find((token) => token.text === "return");
    const stringToken = result.tokens.find((token) => token.kind === "string");

    expect(result.diagnostics).toEqual([]);
    expect(returnToken?.span).toMatchObject({
      start: 23,
      end: 29,
      line: 2,
      column: 3,
      endLine: 2,
      endColumn: 9,
    });
    expect(stringToken?.span).toMatchObject({
      start: 30,
      end: 34,
      line: 2,
      column: 10,
      endLine: 2,
      endColumn: 14,
    });
    expectBoundedSpans(source);
  });

  it.each([
    ["/* unterminated", "FLINT-LEX-003"],
    ["$", "FLINT-LEX-002"],
  ])("reports bounded recovery for malformed source: %s", (source, code) => {
    const result = lexFlint(source, "recovery.flint");

    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code }),
    );
    expect(result.tokens.at(-1)).toMatchObject({
      kind: "eof",
      span: { start: source.length, end: source.length },
    });
    expectBoundedSpans(source);
  });

  it("rejects non-ASCII oversized sources based on actual byte count, not character count", () => {
    const emojiChar = "😀";
    const charCount = Math.floor(MAX_SOURCE_INPUT_BYTES / 4) + 1;
    const hugeNonAsciiSource = emojiChar.repeat(charCount);

    const result = lexFlint(hugeNonAsciiSource, "huge-emoji.flint");

    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.diagnostics[0]?.code).toBe(FLINT_SECURITY_SOURCE_TOO_LARGE);
    expect(result.tokens[0]?.kind).toBe("eof");
  });

  it("scans multi-radix integers, floats, exponents, digit separators, and type suffixes", () => {
    const source =
      "0xFF 0x1A_2B 0b1010 0b1111_0000 0o777 1_000_000 3.14159 1.5e-3 2E+10 0xFF_u32 0b1010_i64 100_u64 0.5_f32 42.toString()";
    const result = lexFlint(source, "numbers.flint");

    expect(result.diagnostics).toEqual([]);
    const numberTokens = result.tokens.filter((t) => t.kind === "number");
    expect(numberTokens.map((t) => t.text)).toEqual([
      "0xFF",
      "0x1A_2B",
      "0b1010",
      "0b1111_0000",
      "0o777",
      "1_000_000",
      "3.14159",
      "1.5e-3",
      "2E+10",
      "0xFF_u32",
      "0b1010_i64",
      "100_u64",
      "0.5_f32",
      "42",
    ]);

    const methodTokens = result.tokens.slice(-6, -1);
    expect(methodTokens.map((t) => ({ kind: t.kind, text: t.text }))).toEqual([
      { kind: "number", text: "42" },
      { kind: "punctuation", text: "." },
      { kind: "identifier", text: "toString" },
      { kind: "punctuation", text: "(" },
      { kind: "punctuation", text: ")" },
    ]);
  });
});
