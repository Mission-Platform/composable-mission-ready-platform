import {
  createDiagnostic,
  type FlintAttributeAnnotation,
  type FlintExpression,
  type FlintStructRepr,
} from "@mission-platform/flint-ast";

import { mergeSpans, ParserContext } from "./context.js";

import type { ExpressionParser } from "./expression-parser.js";

export interface ParsedAttribute {
  readonly annotation: FlintAttributeAnnotation;
  readonly repr?: FlintStructRepr;
}

/**
 * Sub-parser responsible for attribute annotations (`@attribute(...)`, `#[derive(...)]`, `#[repr(...)]`).
 */
export class AttributeParser {
  private readonly context: ParserContext;
  private readonly expressionParser: ExpressionParser;

  public constructor(
    context: ParserContext,
    expressionParser: ExpressionParser,
  ) {
    this.context = context;
    this.expressionParser = expressionParser;
  }

  /**
   * Parses the argument clause of a `#[repr(packed(...))]` attribute.
   *
   * @returns Parsed packed struct representation directive.
   */
  // skipcq: JS-R1005
  private parsePackedRepr(): FlintStructRepr {
    let alignment = 1;
    if (this.context.match("(")) {
      const openSpan = this.context.previous().span;
      const number_ = this.context.expectKind(
        "number",
        "FLINT-PARSE-094",
        "Expected packed alignment number.",
      );
      alignment = Number(number_?.text || "1");
      if (!ParserContext.isPositivePowerOfTwo(alignment)) {
        this.context.diagnostics.push(
          createDiagnostic(
            this.context.fileName,
            "parse",
            "FLINT-PARSE-073",
            `Packed alignment must be a positive power of two, got ${alignment}.`,
            number_?.span ?? this.context.previous().span,
          ),
        );
      }
      this.context.expectClosingDelimiter(
        ")",
        openSpan,
        "FLINT-PARSE-095",
        "Expected ')' after packed alignment.",
      );
    }
    return { kind: "packed", alignment };
  }

  /**
   * Parses the argument clause of a `#[repr(align(...))]` attribute.
   *
   * @returns Parsed align struct representation directive.
   */
  // skipcq: JS-R1005
  private parseAlignRepr(): FlintStructRepr {
    const openToken = this.context.expect(
      "(",
      "FLINT-PARSE-096",
      "Expected '(' after 'align'.",
    );
    const number_ = this.context.expectKind(
      "number",
      "FLINT-PARSE-097",
      "Expected alignment number.",
    );
    const alignment = Number(number_?.text || "8");
    if (!ParserContext.isPositivePowerOfTwo(alignment)) {
      this.context.diagnostics.push(
        createDiagnostic(
          this.context.fileName,
          "parse",
          "FLINT-PARSE-073",
          `Struct alignment must be a positive power of two, got ${alignment}.`,
          number_?.span ?? this.context.previous().span,
        ),
      );
    }
    this.context.expectClosingDelimiter(
      ")",
      openToken.span,
      "FLINT-PARSE-098",
      "Expected ')' after alignment.",
    );
    return { kind: "align", alignment };
  }

  /**
   * Parses the representation kind inside a `#[repr(...)]` attribute clause.
   *
   * @returns Parsed struct representation directive or undefined if unrecognized.
   */
  private parseReprClause(): FlintStructRepr | undefined {
    const openToken = this.context.expect(
      "(",
      "FLINT-PARSE-092",
      "Expected '(' after 'repr'.",
    );
    const kind = this.context.expectIdentifier(
      "FLINT-PARSE-093",
      "Expected repr identifier ('C', 'packed', 'align', 'flint').",
    );
    let repr: FlintStructRepr | undefined;
    switch (kind) {
      case "C": {
        repr = { kind: "c" };
        break;
      }
      case "packed": {
        repr = this.parsePackedRepr();
        break;
      }
      case "align": {
        repr = this.parseAlignRepr();
        break;
      }
      case "flint": {
        repr = { kind: "flint" };
        break;
      }
      default: {
        break;
      }
    }
    this.context.expectClosingDelimiter(
      ")",
      openToken.span,
      "FLINT-PARSE-099",
      "Expected ')' after repr attribute arguments.",
    );
    return repr;
  }

  /**
   * Parses an attribute annotation such as @macro(...) or #[derive(...)].
   *
   * @returns Parsed attribute annotation AST node or undefined.
   */
  public parseAttributeAnnotation(): ParsedAttribute | undefined {
    if (this.context.is("@")) {
      const start = this.context.consume().span;
      const nameToken = this.context.current();
      const isName =
        nameToken.kind === "identifier" || nameToken.kind === "keyword";
      let name = "<missing>";
      if (isName) {
        name = this.context.consume().text;
      } else {
        this.context.diagnostics.push(
          createDiagnostic(
            this.context.fileName,
            "parse",
            "FLINT-PARSE-091",
            "Expected attribute or macro name.",
            nameToken.span,
          ),
        );
      }
      const args: FlintExpression[] = [];
      if (this.context.match("(")) {
        const openParenSpan = this.context.previous().span;
        while (!this.context.is(")") && !this.context.is("eof")) {
          if (
            (this.context.current().kind === "identifier" ||
              this.context.current().kind === "keyword") &&
            (this.context.isNext(",") || this.context.isNext(")"))
          ) {
            const token = this.context.consume();
            args.push({
              kind: "identifier",
              name: token.text,
              span: token.span,
            });
          } else {
            args.push(this.expressionParser.parseExpression());
          }
          if (!this.context.match(",")) break;
        }
        this.context.expectClosingDelimiter(
          ")",
          openParenSpan,
          "FLINT-PARSE-099",
          "Expected ')' after attribute arguments.",
        );
      }
      return {
        annotation: {
          kind: "attribute-annotation",
          name,
          arguments: args,
          span: mergeSpans(start, this.context.previous().span),
        },
      };
    }
    if (this.context.is("#")) {
      const start = this.context.consume().span;
      const openBracket = this.context.expect(
        "[",
        "FLINT-PARSE-090",
        "Expected '[' after '#'.",
      );
      const nameToken = this.context.current();
      const isName =
        nameToken.kind === "identifier" || nameToken.kind === "keyword";
      let name = "<missing>";
      if (isName) {
        name = this.context.consume().text;
      } else {
        this.context.diagnostics.push(
          createDiagnostic(
            this.context.fileName,
            "parse",
            "FLINT-PARSE-091",
            "Expected attribute name.",
            nameToken.span,
          ),
        );
      }
      let repr: FlintStructRepr | undefined;
      const args: FlintExpression[] = [];
      if (name === "repr") {
        const reprStart = this.context.current().span;
        repr = this.parseReprClause();
        if (repr !== undefined) {
          if (repr.kind === "c") {
            args.push({ kind: "identifier", name: "C", span: reprStart });
          } else if (repr.kind === "flint") {
            args.push({ kind: "identifier", name: "flint", span: reprStart });
          } else if (repr.kind === "packed") {
            args.push({
              kind: "call",
              callee: "packed",
              arguments: [
                {
                  kind: "literal",
                  value: repr.alignment,
                  type: "i32",
                  span: reprStart,
                },
              ],
              span: reprStart,
            });
          } else if (repr.kind === "align") {
            args.push({
              kind: "call",
              callee: "align",
              arguments: [
                {
                  kind: "literal",
                  value: repr.alignment,
                  type: "i32",
                  span: reprStart,
                },
              ],
              span: reprStart,
            });
          }
        }
      } else if (this.context.match("(")) {
        const openParenSpan = this.context.previous().span;
        while (!this.context.is(")") && !this.context.is("eof")) {
          if (
            (this.context.current().kind === "identifier" ||
              this.context.current().kind === "keyword") &&
            (this.context.isNext(",") || this.context.isNext(")"))
          ) {
            const token = this.context.consume();
            args.push({
              kind: "identifier",
              name: token.text,
              span: token.span,
            });
          } else {
            args.push(this.expressionParser.parseExpression());
          }
          if (!this.context.match(",")) break;
        }
        this.context.expectClosingDelimiter(
          ")",
          openParenSpan,
          "FLINT-PARSE-099",
          "Expected ')' after attribute arguments.",
        );
      }
      this.context.expectClosingDelimiter(
        "]",
        openBracket.span,
        "FLINT-PARSE-100",
        "Expected ']' after attribute.",
      );
      return {
        annotation: {
          kind: "attribute-annotation",
          name,
          arguments: args,
          span: mergeSpans(start, this.context.previous().span),
        },
        ...(repr === undefined ? {} : { repr }),
      };
    }
    return undefined;
  }
}
