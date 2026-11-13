import {
  createDiagnostic,
  type FlintBinaryOperator,
  type FlintExpression,
  type FlintMatchArm,
  type FlintPattern,
  type FlintSourceSpan,
  type FlintToken,
} from "@mission-platform/flint-ast";

import {
  decodeString,
  mergeSpans,
  parseNumericLiteral,
  type ParserContext,
} from "./context.js";
import { MarkupParser } from "./markup-parser.js";

/**
 * Sub-parser responsible for expression parsing, operator precedence climbing, literals, and pattern matching.
 */
export class ExpressionParser {
  private readonly context: ParserContext;
  private readonly markupParser: MarkupParser;

  public constructor(context: ParserContext) {
    this.context = context;
    this.markupParser = new MarkupParser(context, this);
  }

  /**
   * Parses an expression with binary operator precedence climbing.
   *
   * @param minPrecedence - Minimum operator precedence to consume.
   * @returns Parsed expression AST node.
   */
  public parseExpression(minPrecedence = 0): FlintExpression {
    return this.context.withDepthGuard<FlintExpression>(
      () => ({
        kind: "literal",
        value: 0,
        type: "i32",
        span: this.context.current().span,
      }),
      () => {
        let left = this.parsePrimary();
        const precedence: Readonly<Record<string, number>> = {
          "|>": 1,
          "||": 2,
          "&&": 3,
          "==": 4,
          "!=": 4,
          "<": 5,
          "<=": 5,
          ">": 5,
          ">=": 5,
          "+": 6,
          "-": 6,
          "*": 7,
          "/": 7,
          "%": 7,
        };
        while (
          this.context.current().kind === "operator" &&
          (precedence[this.context.current().text] ?? -1) >= minPrecedence
        ) {
          const operator = this.context.consume();
          const right = this.parseExpression(
            (precedence[operator.text] ?? 0) + 1,
          );
          left = {
            kind: "binary",
            operator: operator.text as FlintBinaryOperator,
            left,
            right,
            span: mergeSpans(left.span, right.span),
          };
        }

        if (this.context.match("?")) {
          const consequent = this.parseExpression(0);
          this.context.expect(
            ":",
            "FLINT-PARSE-099",
            "Expected ':' in ternary conditional expression.",
          );
          const alternate = this.parseExpression(0);
          left = {
            kind: "match",
            value: left,
            arms: [
              {
                kind: "match-arm",
                pattern: {
                  kind: "literal",
                  value: true,
                  span: consequent.span,
                },
                value: consequent,
                span: consequent.span,
              },
              {
                kind: "match-arm",
                pattern: {
                  kind: "wildcard",
                  span: alternate.span,
                },
                value: alternate,
                span: alternate.span,
              },
            ],
            span: mergeSpans(left.span, alternate.span),
          };
        }

        return left;
      },
    );
  }

  /**
   * Parses a fixed-size or dynamic array literal expression.
   *
   * @param startSpan - Starting source span.
   * @returns Parsed array literal expression AST node.
   */
  private parseArrayLiteral(startSpan: FlintSourceSpan): FlintExpression {
    const elements: FlintExpression[] = [];
    while (!this.context.is("]") && !this.context.is("eof")) {
      elements.push(this.parseExpression());
      if (!this.context.match(",")) break;
    }
    const end = this.context.expectClosingDelimiter(
      "]",
      startSpan,
      "FLINT-PARSE-090",
      "Expected ']' after an array literal.",
    ).span;
    const element =
      elements[0]?.kind === "literal"
        ? {
            kind: "type-name" as const,
            name: elements[0].type,
            span: elements[0].span,
          }
        : {
            kind: "type-name" as const,
            name: "unit" as const,
            span: startSpan,
          };
    return {
      kind: "array-literal",
      elements,
      type: {
        kind: "type-name",
        name: "unit",
        reference: "Array",
        arguments: [element],
        length: elements.length,
        span: mergeSpans(startSpan, end),
      },
      span: mergeSpans(startSpan, end),
    };
  }

  /**
   * Parses a contiguous growable vector literal expression.
   *
   * @param startSpan - Starting source span.
   * @returns Parsed vector literal expression AST node.
   */
  private parseVectorLiteral(startSpan: FlintSourceSpan): FlintExpression {
    this.context.consume();
    this.context.consume();
    const elements: FlintExpression[] = [];
    while (!this.context.is("]") && !this.context.is("eof")) {
      elements.push(this.parseExpression());
      if (!this.context.match(",")) break;
    }
    const end = this.context.expectClosingDelimiter(
      "]",
      startSpan,
      "FLINT-PARSE-091",
      "Expected ']' after a vector literal.",
    ).span;
    const element =
      elements[0]?.kind === "literal"
        ? {
            kind: "type-name" as const,
            name: elements[0].type,
            span: elements[0].span,
          }
        : {
            kind: "type-name" as const,
            name: "unit" as const,
            span: startSpan,
          };
    return {
      kind: "vector-literal",
      elements,
      type: {
        kind: "type-name",
        name: "unit",
        reference: "Vector",
        arguments: [element],
        span: mergeSpans(startSpan, end),
      },
      span: mergeSpans(startSpan, end),
    };
  }

  /**
   * Parses numeric, boolean, or string scalar literal expressions.
   *
   * @param token - Token to inspect.
   * @returns Parsed literal expression AST node or undefined.
   */
  private parseScalarLiteral(token: FlintToken): FlintExpression | undefined {
    if (token.kind === "number") {
      this.context.consume();
      const parsed = parseNumericLiteral(token.text);
      return {
        kind: "literal",
        value: parsed.value,
        type: parsed.type,
        span: token.span,
      };
    }
    if (token.kind === "string") {
      this.context.consume();
      return {
        kind: "literal",
        value: decodeString(token.text),
        type: "string",
        span: token.span,
      };
    }
    if (token.text === "true" || token.text === "false") {
      this.context.consume();
      return {
        kind: "literal",
        value: token.text === "true",
        type: "bool",
        span: token.span,
      };
    }
    return undefined;
  }

  /**
   * Parses a struct instantiation literal with field values.
   *
   * @param token - Struct type token.
   * @returns Parsed struct literal expression AST node.
   */
  private parseStructLiteral(token: FlintToken): FlintExpression {
    const openSpan = this.context.current().span;
    this.context.consume();
    const fields: Record<string, FlintExpression> = {};
    while (!this.context.is("}") && !this.context.is("eof")) {
      const field = this.context.expectIdentifier(
        "FLINT-PARSE-056",
        "Expected a struct field name.",
      );
      this.context.expect(
        ":",
        "FLINT-PARSE-057",
        "Expected ':' after a struct field name.",
      );
      if (field !== undefined) fields[field] = this.parseExpression();
      if (!this.context.match(",")) break;
    }
    const end = this.context.expectClosingDelimiter(
      "}",
      openSpan,
      "FLINT-PARSE-058",
      "Expected '}' after a struct value.",
    ).span;
    return {
      kind: "struct-value",
      type: {
        kind: "type-name",
        name: "unit",
        reference: token.text,
        span: token.span,
      },
      fields,
      span: mergeSpans(token.span, end),
    };
  }

  /** Parses an anonymous object literal used by typed template payloads. */
  private parseObjectLiteral(): FlintExpression {
    const start = this.context.expect(
      "{",
      "FLINT-PARSE-061",
      "Expected '{' to start an object expression.",
    ).span;
    const fields: Record<string, FlintExpression> = {};
    while (!this.context.is("}") && !this.context.is("eof")) {
      const name = this.context.expectIdentifier(
        "FLINT-PARSE-062",
        "Expected an object field name.",
      );
      this.context.expect(
        ":",
        "FLINT-PARSE-063",
        "Expected ':' after an object field name.",
      );
      if (name !== undefined) fields[name] = this.parseExpression();
      if (!this.context.match(",")) break;
    }
    const end = this.context.expectClosingDelimiter(
      "}",
      start,
      "FLINT-PARSE-064",
      "Expected '}' after an object expression.",
    ).span;
    return { kind: "object", fields, span: mergeSpans(start, end) };
  }

  /**
   * Parses chained member access and array indexing operations.
   *
   * @param initialExpression - Target expression to chain accesses onto.
   * @param initialQualifiedName - Qualified member path string.
   * @param tokenSpan - Starting token span.
   * @returns Chained expression AST node.
   */
  // skipcq: JS-R1005
  private parseMemberAndIndexChain(
    initialExpression: FlintExpression,
    initialQualifiedName: string,
    tokenSpan: FlintSourceSpan,
  ): FlintExpression {
    let expression = initialExpression;
    let qualifiedName = initialQualifiedName;

    while (
      this.context.is(".") ||
      this.context.is("[") ||
      (this.context.is("(") && expression.kind === "index")
    ) {
      if (this.context.is("(") && expression.kind === "index") {
        const openSpan = this.context.consume().span;
        const arguments_ = this.parseCallArguments("FLINT-PARSE-079", true);
        const end = this.context.previous().span;
        const calls = [
          ...(expression.calls ?? []),
          {
            memberPathLength: expression.memberPath?.length ?? 0,
            arguments: arguments_,
            span: mergeSpans(openSpan, end),
          },
        ];
        expression = {
          ...expression,
          calls,
          span: mergeSpans(expression.span, end),
        };
        continue;
      }
      if (this.context.match(".")) {
        const member = this.context.expectMemberName(
          "FLINT-PARSE-078",
          'Expected a member name after ".".',
        );
        const memberSpan = this.context.previous().span;
        if (qualifiedName === "" && expression.kind !== "index") {
          const memberName = member ?? "<missing>";
          if (this.context.is("(")) {
            this.context.consume();
            const arguments_ = this.parseCallArguments("FLINT-PARSE-079", true);
            expression = {
              kind: "call",
              callee: memberName,
              receiver: expression,
              arguments: arguments_,
              span: mergeSpans(expression.span, this.context.previous().span),
            };
          } else {
            this.context.diagnostics.push(
              createDiagnostic(
                this.context.fileName,
                "parse",
                "FLINT-PARSE-127",
                `Member access '.${memberName}' is only supported when called on this expression.`,
                memberSpan,
                "error",
                undefined,
                { blocking: true },
              ),
            );
          }
        } else if (expression.kind === "index") {
          expression = {
            ...expression,
            memberPath: [
              ...(expression.memberPath ?? []),
              member ?? "<missing>",
            ],
            span: mergeSpans(expression.span, this.context.previous().span),
          };
        } else {
          if (expression.kind === "call") {
            if (this.context.match("(")) {
              const arguments_ = this.parseCallArguments(
                "FLINT-PARSE-079",
                true,
              );
              expression = {
                kind: "call",
                callee: member ?? "<missing>",
                receiver: expression,
                arguments: arguments_,
                span: mergeSpans(expression.span, this.context.previous().span),
              };
              continue;
            }
            this.context.diagnostics.push(
              createDiagnostic(
                this.context.fileName,
                "parse",
                "FLINT-PARSE-127",
                `Member access '.${member ?? "<missing>"}' is only supported when called on this expression.`,
                memberSpan,
                "error",
                undefined,
                { blocking: true },
              ),
            );
            continue;
          }
          qualifiedName =
            qualifiedName.length > 0
              ? `${qualifiedName}.${member ?? "<missing>"}`
              : `${member ?? "<missing>"}`;
          if (this.context.match("(")) {
            const openSpan = this.context.previous().span;
            const arguments_: FlintExpression[] = [];
            while (!this.context.is(")") && !this.context.is("eof")) {
              arguments_.push(this.parseExpression());
              if (!this.context.match(",")) break;
            }
            const end = this.context.expectClosingDelimiter(
              ")",
              openSpan,
              "FLINT-PARSE-079",
              "Expected ')' after member call arguments.",
            ).span;
            expression = {
              kind: "call",
              callee: qualifiedName,
              arguments: arguments_,
              span: mergeSpans(tokenSpan, end),
            };
          } else {
            expression = {
              kind: "identifier",
              name: qualifiedName,
              span: mergeSpans(tokenSpan, this.context.previous().span),
            };
          }
        }
      } else if (this.context.match("[")) {
        const openSpan = this.context.previous().span;
        const index = this.parseExpression();
        const end = this.context.expectClosingDelimiter(
          "]",
          openSpan,
          "FLINT-PARSE-092",
          "Expected ']' after an index expression.",
        ).span;
        expression = {
          kind: "index",
          receiver: expression,
          index,
          span: mergeSpans(expression.span, end),
        };
      }
    }
    return expression;
  }

  /**
   * Parses identifiers, function calls, or field access chains.
   *
   * @param token - Identifier token.
   * @returns Parsed expression AST node.
   */
  // skipcq: JS-R1005
  private parseIdentifierOrCallOrMemberExpression(
    token: FlintToken,
  ): FlintExpression {
    this.context.consume();
    let qualifiedName = token.text;
    let expression: FlintExpression = {
      kind: "identifier",
      name: qualifiedName,
      span: token.span,
    };
    if (this.context.match("::")) {
      const variant = this.context.expectIdentifier(
        "FLINT-PARSE-093",
        "Expected an enum variant after '::'.",
      );
      const constructorStart = token.span;
      qualifiedName = `${qualifiedName}::${variant ?? "<missing>"}`;
      const arguments_ = this.context.is("(")
        ? this.parseCallArguments("FLINT-PARSE-026")
        : [];
      expression = {
        kind: "enum-value",
        type: {
          kind: "type-name",
          name: "unit",
          reference: token.text,
          span: constructorStart,
        },
        variant: variant ?? "<missing>",
        arguments: arguments_,
        span: mergeSpans(constructorStart, this.context.previous().span),
      };
    } else if (this.context.match("(")) {
      const arguments_ = this.parseCallArguments("FLINT-PARSE-026", true);
      expression = {
        kind: "call",
        callee: qualifiedName,
        arguments: arguments_,
        span: mergeSpans(token.span, this.context.previous().span),
      };
    }
    expression = this.parseMemberAndIndexChain(
      expression,
      qualifiedName,
      token.span,
    );
    if (
      this.context.is("{") &&
      this.context.tokens[this.context.index + 2]?.text === ":"
    ) {
      return this.parseStructLiteral(token);
    }
    return expression;
  }

  /**
   * Checks whether the next tokens represent a vector literal constructor.
   *
   * @param token - Token to inspect.
   * @returns True if starting a vector literal.
   */
  private isVectorLiteralStart(token: FlintToken): boolean {
    return (
      token.kind === "identifier" &&
      token.text === "vector" &&
      this.context.tokenAt(this.context.index + 1)?.text === "["
    );
  }

  /**
   * Parses unary prefix operators (!, -, *, &, &mut).
   *
   * @param startSpan - Starting source span.
   * @param operator - Unary operator symbol.
   * @returns Parsed unary expression AST node.
   */
  private parseUnaryExpression(
    startSpan: FlintSourceSpan,
    operator: "!" | "-" | "*" | "&" | "&mut" | "?",
  ): FlintExpression {
    return {
      kind: "unary",
      operator,
      operand: this.parsePrimary(),
      span: mergeSpans(startSpan, this.context.previous().span),
    };
  }

  /**
   * Parses prefix expressions including unary operators and primaries.
   *
   * @returns Parsed prefix expression AST node or undefined.
   */
  // skipcq: JS-R1005
  private parsePrefixExpression(): FlintExpression | undefined {
    const token = this.context.current();
    if (
      token.text === "css" &&
      this.context.tokenAt(this.context.index + 1)?.text === "!"
    ) {
      return this.markupParser.parseCssPlaceholder();
    }
    if (this.markupParser.isMarkupStart()) {
      return this.markupParser.parseMarkupBlock();
    }
    if (this.context.match("comptime")) {
      const expr = this.parseExpression();
      return {
        kind: "comptime-expression",
        expression: expr,
        span: mergeSpans(token.span, expr.span),
      };
    }
    if (this.context.match("match"))
      return this.parseMatchExpression(token.span);
    if (this.context.match("[")) {
      const arr = this.parseArrayLiteral(token.span);
      return this.parseMemberAndIndexChain(arr, "", arr.span);
    }
    if (this.context.is("{")) return this.parseObjectLiteral();
    if (this.isVectorLiteralStart(token)) {
      const vec = this.parseVectorLiteral(token.span);
      return this.parseMemberAndIndexChain(vec, "", vec.span);
    }
    if (this.context.match("fn")) {
      const name = this.context.expectIdentifier(
        "FLINT-PARSE-055",
        "Expected a function name after fn.",
      );
      return {
        kind: "function-value",
        name: name ?? "<missing>",
        span: mergeSpans(token.span, this.context.previous().span),
      };
    }
    if (this.context.match("!"))
      return this.parseUnaryExpression(token.span, "!");
    if (this.context.match("-"))
      return this.parseUnaryExpression(token.span, "-");
    if (this.context.match("*"))
      return this.parseUnaryExpression(token.span, "*");
    if (this.context.match("&")) {
      const isMut = this.context.match("mut");
      return this.parseUnaryExpression(token.span, isMut ? "&mut" : "&");
    }
    return undefined;
  }

  /**
   * Parses a primary atomic expression or parenthesized group.
   *
   * @returns Parsed primary expression AST node.
   */
  // skipcq: JS-R1005
  public parsePrimary(): FlintExpression {
    const prefix = this.parsePrefixExpression();
    if (prefix !== undefined) return prefix;
    const token = this.context.current();
    const scalar = this.parseScalarLiteral(token);
    if (scalar !== undefined) return scalar;
    if (
      token.kind === "identifier" ||
      (token.kind === "keyword" &&
        [
          "setup",
          "event",
          "emit",
          "property",
          "properties",
          "emits",
          "events",
          "model",
          "readonly",
        ].includes(token.text))
    )
      return this.parseIdentifierOrCallOrMemberExpression(token);
    if (this.context.match("(")) {
      const start = token.span;
      let expression = this.parseExpression();
      const end = this.context.expectClosingDelimiter(
        ")",
        start,
        "FLINT-PARSE-056",
        "Expected ')' after expression.",
      ).span;
      const initialQualifiedName =
        expression.kind === "identifier" ? expression.name : "";
      expression = this.parseMemberAndIndexChain(
        expression,
        initialQualifiedName,
        mergeSpans(start, end),
      );
      return expression;
    }
    if (this.context.match("{")) return this.parseStructLiteral(token);
    this.context.diagnostics.push(
      createDiagnostic(
        this.context.fileName,
        "parse",
        "FLINT-PARSE-027",
        "Expected an expression.",
        token.span,
      ),
    );
    this.context.consume();
    return { kind: "literal", value: 0, type: "i32", span: token.span };
  }

  /**
   * Parses a pattern match expression.
   *
   * @param start - Starting source span.
   * @returns Parsed match expression AST node.
   */
  private parseMatchExpression(start: FlintSourceSpan): FlintExpression {
    const value = this.parseExpression();
    const openToken = this.context.expect(
      "{",
      "FLINT-PARSE-059",
      "Expected '{' after a match value.",
    );
    const arms: FlintMatchArm[] = [];
    while (!this.context.is("}") && !this.context.is("eof")) {
      const armStart = this.context.current().span;
      if (this.context.match("case")) {
        // The optional case keyword is accepted for readability.
      }
      const pattern = this.parsePattern();
      this.context.expect(
        "=>",
        "FLINT-PARSE-060",
        "Expected '=>' after a match pattern.",
      );
      const armValue = this.parseExpression();
      const end = this.context.match(",")
        ? this.context.previous().span
        : armValue.span;
      arms.push({
        kind: "match-arm",
        pattern,
        value: armValue,
        span: mergeSpans(armStart, end),
      });
    }
    const end = this.context.expectClosingDelimiter(
      "}",
      openToken.span,
      "FLINT-PARSE-061",
      "Expected '}' after match arms.",
    ).span;
    return { kind: "match", value, arms, span: mergeSpans(start, end) };
  }

  /**
   * Parses a literal pattern match arm.
   *
   * @param token - Candidate pattern token.
   * @returns Parsed pattern AST node or undefined.
   */
  private parseLiteralPattern(token: FlintToken): FlintPattern | undefined {
    if (token.kind === "number") {
      this.context.consume();
      const parsed = parseNumericLiteral(token.text);
      return { kind: "literal", value: parsed.value, span: token.span };
    }
    if (token.kind === "string") {
      this.context.consume();
      return {
        kind: "literal",
        value: decodeString(token.text),
        span: token.span,
      };
    }
    if (token.text === "true" || token.text === "false") {
      this.context.consume();
      return {
        kind: "literal",
        value: token.text === "true",
        span: token.span,
      };
    }
    return undefined;
  }

  /**
   * Parses an enum variant pattern match arm with payload destructuring.
   *
   * @param token - Variant token.
   * @returns Parsed variant pattern AST node.
   */
  // skipcq: JS-R1005
  private parseVariantPattern(token: FlintToken): FlintPattern {
    const name = this.context.expectIdentifier(
      "FLINT-PARSE-062",
      "Expected a match pattern.",
    );
    let qualifiedName = name ?? "<missing>";
    if (this.context.match("::")) {
      const variant = this.context.expectIdentifier(
        "FLINT-PARSE-094",
        "Expected an enum variant after '::'.",
      );
      qualifiedName = `${qualifiedName}::${variant ?? "<missing>"}`;
    }
    const bindings: string[] = [];
    if (this.context.match("(")) {
      const openSpan = this.context.previous().span;
      while (!this.context.is(")") && !this.context.is("eof")) {
        const binding = this.context.expectIdentifier(
          "FLINT-PARSE-063",
          "Expected a pattern binding.",
        );
        if (binding !== undefined) bindings.push(binding);
        if (!this.context.match(",")) break;
      }
      this.context.expectClosingDelimiter(
        ")",
        openSpan,
        "FLINT-PARSE-064",
        "Expected ')' after pattern bindings.",
      );
    }
    return {
      kind: "variant",
      name: qualifiedName,
      bindings,
      span: mergeSpans(token.span, this.context.previous().span),
    };
  }

  /**
   * Parses a pattern matching arm.
   *
   * @returns Parsed pattern AST node.
   */
  public parsePattern(): FlintPattern {
    const token = this.context.current();
    if (this.context.match("_")) return { kind: "wildcard", span: token.span };
    const literal = this.parseLiteralPattern(token);
    if (literal !== undefined) return literal;
    return this.parseVariantPattern(token);
  }

  /**
   * Parses comma-separated arguments for a function call expression.
   *
   * @param code - Diagnostic error code to report on unmatched closing paren.
   * @param alreadyOpened - Whether opening paren was already consumed.
   * @returns Array of parsed argument expressions.
   */
  public parseCallArguments(
    code: string,
    alreadyOpened = false,
  ): FlintExpression[] {
    const openSpan = alreadyOpened
      ? this.context.previous().span
      : this.context.expect("(", code, "Expected '(' before call arguments.")
          .span;
    const arguments_: FlintExpression[] = [];
    while (!this.context.is(")") && !this.context.is("eof")) {
      arguments_.push(this.parseExpression());
      if (!this.context.match(",")) break;
    }
    this.context.expectClosingDelimiter(
      ")",
      openSpan,
      code,
      "Expected ')' after call arguments.",
    );
    return arguments_;
  }
}
