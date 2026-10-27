import {
  createDiagnostic,
  type FlintComptimeStatement,
  type FlintExpression,
  type FlintSourceSpan,
  type FlintStatement,
  type FlintSwitchCase,
  type FlintTypeName,
} from "@mission-platform/flint-ast";

import {
  MAX_INDEX_ASSIGNMENT_LOOKAHEAD,
  MAX_INDEX_BRACKET_DEPTH,
  mergeSpans,
  parseNumericLiteral,
  ParserContext,
} from "./context.js";

import type { ExpressionParser } from "./expression-parser.js";
import type { TypeParser } from "./type-parser.js";

/**
 * Sub-parser responsible for statement parsing, control flow constructs, bindings, and block synchronization.
 */
export class StatementParser {
  private readonly context: ParserContext;
  private readonly typeParser: TypeParser;
  private readonly expressionParser: ExpressionParser;

  public constructor(
    context: ParserContext,
    typeParser: TypeParser,
    expressionParser: ExpressionParser,
  ) {
    this.context = context;
    this.typeParser = typeParser;
    this.expressionParser = expressionParser;
  }

  /**
   * Parses a block of statements enclosed in curly braces with statement-level error recovery.
   *
   * @returns Array of parsed statement AST nodes.
   */
  // skipcq: JS-R1005
  public parseBlock(): FlintStatement[] {
    return this.context.withDepthGuard<FlintStatement[]>(
      () => [],
      () => {
        const openToken = this.context.expect(
          "{",
          "FLINT-PARSE-018",
          "Expected '{' to start a block.",
        );
        const statements: FlintStatement[] = [];
        while (!this.context.is("}") && !this.context.is("eof")) {
          const startIndex = this.context.index;
          try {
            statements.push(this.parseStatement());
          } catch {
            this.synchronizeStatement();
          }
          if (
            this.context.index === startIndex &&
            !this.context.is("}") &&
            !this.context.is("eof")
          ) {
            this.context.consume();
          }
        }
        this.context.expectClosingDelimiter(
          "}",
          openToken.span,
          "FLINT-PARSE-019",
          "Expected '}' to close a block.",
        );
        return statements;
      },
    );
  }

  /**
   * Resynchronizes statement parser state upon encountering syntax errors.
   */
  public synchronizeStatement(): void {
    while (!this.context.is("eof") && !this.context.is("}")) {
      if (this.context.is(";")) {
        this.context.consume();
        return;
      }
      this.context.consume();
    }
  }

  /**
   * Checks if an assignment target has an indexed subscript expression with bounded lookahead.
   *
   * @returns True if current position is an indexed assignment.
   */
  // skipcq: JS-R1005
  private isIndexAssignment(): boolean {
    if (!this.context.isNext("[")) return false;
    let offset = 2;
    let depth = 1;
    while (
      offset < MAX_INDEX_ASSIGNMENT_LOOKAHEAD &&
      depth > 0 &&
      depth <= MAX_INDEX_BRACKET_DEPTH &&
      this.context.tokenAt(this.context.index + offset) !== undefined
    ) {
      const text = this.context.tokenAt(this.context.index + offset)?.text;
      if (text === "[") depth += 1;
      if (text === "]") depth -= 1;
      offset += 1;
    }
    return (
      depth === 0 &&
      this.context.tokenAt(this.context.index + offset)?.text === "="
    );
  }

  /**
   * Determines whether the current statement position begins an assignment target.
   *
   * @returns True if current position is an assignment.
   */
  private isAssignmentTarget(): boolean {
    return (
      this.context.current().kind === "identifier" &&
      (this.context.isNext("=") || this.isIndexAssignment())
    );
  }

  /**
   * Checks whether the current token is a rejected exception keyword.
   *
   * @returns True if keyword is try, catch, or throw.
   */
  private isExceptionKeyword(): boolean {
    return (
      this.context.is("throw") ||
      this.context.is("try") ||
      this.context.is("catch")
    );
  }

  /**
   * Parses a variable or indexed array element assignment statement.
   *
   * @returns Parsed assignment statement AST node.
   */
  private parseAssignmentStatement(): FlintStatement {
    const start = this.context.consume().span;
    const name = this.context.previous().text;
    let index: FlintExpression | undefined;
    if (this.context.match("[")) {
      const openSpan = this.context.previous().span;
      index = this.expressionParser.parseExpression();
      this.context.expectClosingDelimiter(
        "]",
        openSpan,
        "FLINT-PARSE-083",
        "Expected ']' after an indexed assignment target.",
      );
    }
    this.context.consume();
    const value = this.expressionParser.parseExpression();
    const end = this.context.expect(
      ";",
      "FLINT-PARSE-030",
      "Expected ';' after an assignment.",
    ).span;
    return {
      kind: "assignment",
      name,
      ...(index === undefined ? {} : { index }),
      value,
      span: mergeSpans(start, end),
    };
  }

  /**
   * Parses a local variable declaration statement.
   *
   * @returns Parsed let statement AST node.
   */
  private parseLetStatement(): FlintStatement {
    const start = this.context.previous().span;
    const mutable = this.context.match("mut");
    const name = this.context.expectIdentifier(
      "FLINT-PARSE-020",
      "Expected a local variable name.",
    );
    let type: FlintTypeName = {
      kind: "type-name",
      name: "unit",
      span: start,
    };
    let explicitType = false;
    if (this.context.match(":")) {
      explicitType = true;
      type = this.typeParser.parseType();
    }
    this.context.expect(
      "=",
      "FLINT-PARSE-022",
      "Expected '=' in a local variable declaration.",
    );
    const value = this.expressionParser.parseExpression();
    const end = this.context.expect(
      ";",
      "FLINT-PARSE-023",
      "Expected ';' after a local variable declaration.",
    ).span;
    return {
      kind: "let",
      name: name ?? "<missing>",
      ...(mutable ? { mutable: true as const } : {}),
      ...(explicitType ? { explicitType: true as const } : {}),
      type,
      value,
      span: mergeSpans(start, end),
    };
  }

  /**
   * Parses a function return statement with optional return value.
   *
   * @returns Parsed return statement AST node.
   */
  private parseReturnStatement(): FlintStatement {
    const start = this.context.previous().span;
    const value = this.context.is(";")
      ? undefined
      : this.expressionParser.parseExpression();
    const end = this.context.expect(
      ";",
      "FLINT-PARSE-024",
      "Expected ';' after a return statement.",
    ).span;
    return {
      kind: "return",
      ...(value === undefined ? {} : { value }),
      span: mergeSpans(start, end),
    };
  }

  /**
   * Parses a generator yield statement.
   *
   * @returns Parsed yield statement AST node.
   */
  private parseYieldStatement(): FlintStatement {
    const start = this.context.previous().span;
    const value = this.expressionParser.parseExpression();
    const end = this.context.expect(
      ";",
      "FLINT-PARSE-071",
      "Expected ';' after a yield statement.",
    ).span;
    return { kind: "yield", value, span: mergeSpans(start, end) };
  }

  /**
   * Parses an iterator loop statement over an iterable collection.
   *
   * @returns Parsed iterator loop statement AST node.
   */
  private parseIteratorLoopStatement(): FlintStatement {
    const start = this.context.previous().span;
    const binding =
      this.context.expectIdentifier(
        "FLINT-PARSE-072",
        "Expected an iterator loop binding after 'loop'.",
      ) ?? "<missing>";
    this.context.expect(
      "=",
      "FLINT-PARSE-073",
      "Expected '=' after an iterator loop binding.",
    );
    const iterator = this.expressionParser.parseExpression();
    const body = this.parseBlock();
    return {
      kind: "iterator-loop",
      binding,
      iterator,
      body,
      span: mergeSpans(start, this.context.previous().span),
    };
  }

  /**
   * Emits diagnostics rejecting exception handling keywords (try, catch, throw).
   *
   * @returns Error recovery statement node.
   */
  private parseExceptionRejectStatement(): FlintStatement {
    const token = this.context.consume();
    this.context.diagnostics.push(
      createDiagnostic(
        this.context.fileName,
        "parse",
        "FLINT-PARSE-074",
        `Exception construct '${token.text}' is not supported; return a Result or Option instead.`,
        token.span,
        "error",
        "Use an explicit Result<T, E> value and pattern matching for recoverable failures.",
      ),
    );
    while (
      !this.context.is(";") &&
      !this.context.is("}") &&
      !this.context.is("eof")
    )
      this.context.consume();
    this.context.match(";");
    return ParserContext.rejectedStatement(token);
  }

  /**
   * Parses an if-else conditional branching statement.
   *
   * @returns Parsed if statement AST node.
   */
  // skipcq: JS-R1005
  private parseIfStatement(): FlintStatement {
    const start = this.context.previous().span;
    const conditionalHint = this.context.match("likely")
      ? "likely"
      : this.context.match("unlikely")
        ? "unlikely"
        : undefined;
    const condition = this.expressionParser.parseExpression();
    const consequent = this.parseBlock();
    const alternate = this.context.match("else")
      ? this.parseBlock()
      : undefined;
    return {
      kind: "if",
      condition,
      consequent,
      ...(alternate === undefined ? {} : { alternate }),
      ...(conditionalHint === undefined ? {} : { conditionalHint }),
      span: mergeSpans(start, this.context.previous().span),
    };
  }

  /**
   * Parses an initializer or update statement within a for-loop clause.
   *
   * @returns Parsed statement node.
   */
  // skipcq: JS-R1005
  private parseForClauseStatement(): FlintStatement {
    if (this.context.match("let")) {
      const start = this.context.previous().span;
      const mutable = this.context.match("mut");
      const name = this.context.expectIdentifier(
        "FLINT-PARSE-020",
        "Expected a local variable name.",
      );
      this.context.expect(
        ":",
        "FLINT-PARSE-021",
        "Expected ':' after a local variable name.",
      );
      const type = this.typeParser.parseType();
      this.context.expect(
        "=",
        "FLINT-PARSE-022",
        "Expected '=' in a local variable declaration.",
      );
      const value = this.expressionParser.parseExpression();
      return {
        kind: "let",
        name: name ?? "<missing>",
        ...(mutable ? { mutable: true as const } : {}),
        explicitType: true,
        type,
        value,
        span: mergeSpans(start, value.span),
      };
    }
    if (
      this.context.current().kind === "identifier" &&
      this.context.isNext("=")
    ) {
      const start = this.context.consume().span;
      const name = this.context.previous().text;
      this.context.consume();
      const value = this.expressionParser.parseExpression();
      return {
        kind: "assignment",
        name,
        value,
        span: mergeSpans(start, value.span),
      };
    }
    const start = this.context.current().span;
    const expression = this.expressionParser.parseExpression();
    return {
      kind: "expression-statement",
      expression,
      span: mergeSpans(start, expression.span),
    };
  }

  /**
   * Parses a standard C-style for-loop statement.
   *
   * @returns Parsed for-loop statement AST node.
   */
  private parseForStatement(): FlintStatement {
    const start = this.context.previous().span;
    this.context.diagnostics.push(
      createDiagnostic(
        this.context.fileName,
        "parse",
        "FLINT-PARSE-076",
        "Imperative 'for' loops are not part of FLINT; use an iterator loop.",
        start,
        "error",
      ),
    );
    const openParen = this.context.expect(
      "(",
      "FLINT-PARSE-065",
      "Expected '(' after for.",
    );
    if (!this.context.is(";")) this.parseForClauseStatement();
    this.context.expect(
      ";",
      "FLINT-PARSE-066",
      "Expected ';' after a for initializer.",
    );
    this.expressionParser.parseExpression();
    this.context.expect(
      ";",
      "FLINT-PARSE-067",
      "Expected ';' after a for condition.",
    );
    if (!this.context.is(")")) this.parseForClauseStatement();
    this.context.expectClosingDelimiter(
      ")",
      openParen.span,
      "FLINT-PARSE-068",
      "Expected ')' after a for clause.",
    );
    this.parseBlock();
    return ParserContext.rejectedStatement({
      kind: "keyword",
      text: "for",
      span: start,
    });
  }

  /**
   * Parses a single case value expression within a switch arm.
   *
   * @returns Parsed case value string or number.
   */
  private parseSwitchCaseValue(): number | string {
    let negative = false;
    if (this.context.match("-")) negative = true;
    const token = this.context.current();
    if (token.kind === "number") {
      this.context.consume();
      const parsed = parseNumericLiteral(token.text);
      return (negative ? -1 : 1) * parsed.value;
    }
    const name = this.context.expectIdentifier(
      "FLINT-PARSE-089",
      "Expected an integer or enum switch case.",
    );
    return name ?? "<missing>";
  }

  /**
   * Parses the statement block belonging to a switch case arm.
   *
   * @returns Array of statements in arm body.
   */
  private parseSwitchArmBody(): readonly FlintStatement[] {
    if (this.context.is("{")) return this.parseBlock();
    return [this.parseStatement()];
  }

  /**
   * Parses a switch pattern matching statement.
   *
   * @param start - Starting source span.
   * @returns Parsed switch statement AST node.
   */
  // skipcq: JS-R1005
  private parseSwitchStatement(start: FlintSourceSpan): FlintStatement {
    const value = this.expressionParser.parseExpression();
    const openToken = this.context.expect(
      "{",
      "FLINT-PARSE-084",
      "Expected '{' after a switch discriminant.",
    );
    const cases: FlintSwitchCase[] = [];
    let defaultCase: readonly FlintStatement[] | undefined;
    while (!this.context.is("}") && !this.context.is("eof")) {
      const armStart = this.context.current().span;
      if (this.context.match("case")) {
        const caseValue = this.parseSwitchCaseValue();
        this.context.expect(
          ":",
          "FLINT-PARSE-085",
          "Expected ':' after a switch case.",
        );
        const body = this.parseSwitchArmBody();
        cases.push({
          kind: "switch-case",
          value: caseValue,
          body,
          span: mergeSpans(armStart, this.context.previous().span),
        });
      } else if (this.context.match("default")) {
        this.context.expect(
          ":",
          "FLINT-PARSE-086",
          "Expected ':' after a switch default arm.",
        );
        defaultCase = this.parseSwitchArmBody();
      } else {
        this.context.diagnostics.push(
          createDiagnostic(
            this.context.fileName,
            "parse",
            "FLINT-PARSE-087",
            "Expected 'case' or 'default' in a switch.",
            this.context.current().span,
          ),
        );
        this.context.consume();
      }
    }
    const end = this.context.expectClosingDelimiter(
      "}",
      openToken.span,
      "FLINT-PARSE-088",
      "Expected '}' after switch arms.",
    ).span;
    return {
      kind: "switch",
      value,
      cases,
      ...(defaultCase === undefined ? {} : { defaultCase }),
      span: mergeSpans(start, end),
    };
  }

  /**
   * Dispatches control flow statement parsing (return, yield, if, loops).
   *
   * @returns Parsed statement node, or undefined if not a control flow keyword.
   */
  // skipcq: JS-R1005
  private parseControlFlowStatement(): FlintStatement | undefined {
    if (this.context.match("if")) return this.parseIfStatement();
    if (this.context.match("switch"))
      return this.parseSwitchStatement(this.context.previous().span);
    if (this.context.match("while")) {
      const start = this.context.previous().span;
      const condition = this.expressionParser.parseExpression();
      const body = this.parseBlock();
      return {
        kind: "while",
        condition,
        body,
        span: mergeSpans(start, this.context.previous().span),
      };
    }
    if (this.context.match("for")) return this.parseForStatement();
    if (this.context.match("do")) {
      const start = this.context.previous().span;
      const body = this.parseBlock();
      this.context.expect(
        "while",
        "FLINT-PARSE-069",
        "Expected 'while' after a do block.",
      );
      const condition = this.expressionParser.parseExpression();
      const end = this.context.expect(
        ";",
        "FLINT-PARSE-070",
        "Expected ';' after a do while statement.",
      ).span;
      return {
        kind: "do-while",
        body,
        condition,
        span: mergeSpans(start, end),
      };
    }
    return undefined;
  }

  /**
   * Parses declaration statements or assignment targets.
   *
   * @returns Parsed statement AST node or undefined.
   */
  // skipcq: JS-R1005
  private parseDeclarationOrAssignmentStatement(): FlintStatement | undefined {
    if (this.isAssignmentTarget()) return this.parseAssignmentStatement();
    if (this.context.match("let")) return this.parseLetStatement();
    if (this.context.match("return")) return this.parseReturnStatement();
    if (this.context.match("yield")) return this.parseYieldStatement();
    if (this.context.match("loop")) return this.parseIteratorLoopStatement();
    if (this.context.match("comptime"))
      return this.parseComptimeStatement(this.context.previous().span);
    if (this.isExceptionKeyword()) return this.parseExceptionRejectStatement();
    return undefined;
  }

  /**
   * Parses a compile-time block statement: comptime { ... }.
   *
   * @param start - Starting source span.
   * @returns Parsed comptime statement AST node.
   */
  public parseComptimeStatement(
    start: FlintSourceSpan,
  ): FlintComptimeStatement {
    const body = this.parseBlock();
    return {
      kind: "comptime-statement",
      body,
      span: mergeSpans(start, this.context.previous().span),
    };
  }

  /**
   * Parses a single statement AST node.
   *
   * @returns Parsed statement AST node.
   */
  public parseStatement(): FlintStatement {
    return this.context.withDepthGuard<FlintStatement>(
      () => ParserContext.rejectedStatement(this.context.current()),
      () => {
        const declOrAssign = this.parseDeclarationOrAssignmentStatement();
        if (declOrAssign !== undefined) return declOrAssign;
        const controlFlow = this.parseControlFlowStatement();
        if (controlFlow !== undefined) return controlFlow;
        const start = this.context.current().span;
        const isCssCompanion =
          this.context.current().text === "css" &&
          this.context.tokenAt(this.context.index + 1)?.text === "!";
        const expression = this.expressionParser.parseExpression();
        if (isCssCompanion) {
          return {
            kind: "expression-statement",
            expression,
            span: mergeSpans(start, expression.span),
          };
        }
        const end = this.context.expect(
          ";",
          "FLINT-PARSE-025",
          "Expected ';' after an expression.",
        ).span;
        return {
          kind: "expression-statement",
          expression,
          span: mergeSpans(start, end),
        };
      },
    );
  }
}
