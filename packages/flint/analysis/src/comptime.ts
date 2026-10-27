import {
  createDiagnostic,
  type FlintBinaryExpression,
  type FlintCallExpression,
  type FlintDiagnostic,
  type FlintExpression,
  type FlintLiteralExpression,
  type FlintModule,
  type FlintPrimitiveType,
  type FlintStatement,
  type FlintUnaryExpression,
} from "@mission-platform/flint-ast";

import { FlintIntrospectionEngine } from "./introspection.js";

/**
 * Constant expression evaluation environment mapping identifiers to known compile-time values.
 */
export interface FlintComptimeEnvironment {
  readonly bindings: ReadonlyMap<string, boolean | number | string>;
  readonly introspection: FlintIntrospectionEngine;
  readonly fileName: string;
}

/**
 * Result of evaluating a constant compile-time expression.
 */
export interface FlintComptimeEvaluationResult {
  readonly value?: boolean | number | string;
  readonly type?: FlintPrimitiveType;
  readonly expression?: FlintLiteralExpression;
  readonly diagnostics: readonly FlintDiagnostic[];
}

/**
 * Compile-time Constant Expression Evaluator.
 */
export class FlintComptimeEvaluator {
  private readonly introspection: FlintIntrospectionEngine;
  private readonly fileName: string;

  public constructor(
    fileName = "<input>",
    introspection?: FlintIntrospectionEngine,
  ) {
    this.fileName = fileName;
    this.introspection =
      introspection ?? new FlintIntrospectionEngine("wasm32");
  }

  /**
   * Registers declarations from a module for compile-time layout inspection.
   */
  public registerModule(module: FlintModule): void {
    this.introspection.registerModule(module);
  }

  /**
   * Evaluates an AST expression in the constant expression evaluator.
   */
  public evaluate(
    expression: FlintExpression,
    envBindings: ReadonlyMap<string, boolean | number | string> = new Map(),
  ): FlintComptimeEvaluationResult {
    const diagnostics: FlintDiagnostic[] = [];

    const value = this.evaluateInternal(expression, envBindings, diagnostics);
    if (value === undefined) {
      return { diagnostics };
    }

    let type: FlintPrimitiveType = "i32";
    if (typeof value === "boolean") {
      type = "bool";
    } else if (typeof value === "string") {
      type = "string";
    } else if (!Number.isInteger(value)) {
      type = "f64";
    }

    const literalExpression: FlintLiteralExpression = {
      kind: "literal",
      value,
      type,
      span: expression.span,
    };

    return {
      value,
      type,
      expression: literalExpression,
      diagnostics,
    };
  }

  /**
   * Evaluates a comptime block or statement sequence.
   */
  public evaluateStatement(
    statement: FlintStatement,
    envBindings: Map<string, boolean | number | string> = new Map(),
  ): readonly FlintDiagnostic[] {
    const diagnostics: FlintDiagnostic[] = [];
    if (statement.kind === "comptime-statement") {
      for (const stmt of statement.body) {
        diagnostics.push(...this.evaluateStatement(stmt, envBindings));
      }
      return diagnostics;
    }

    if (statement.kind === "let") {
      const evalResult = this.evaluate(statement.value, envBindings);
      diagnostics.push(...evalResult.diagnostics);
      if (evalResult.value !== undefined) {
        envBindings.set(statement.name, evalResult.value);
      }
    } else if (statement.kind === "expression-statement") {
      const evalResult = this.evaluate(statement.expression, envBindings);
      diagnostics.push(...evalResult.diagnostics);
    }

    return diagnostics;
  }

  // skipcq: JS-R1005
  private evaluateInternal(
    expression: FlintExpression,
    envBindings: ReadonlyMap<string, boolean | number | string>,
    diagnostics: FlintDiagnostic[],
  ): boolean | number | string | undefined {
    switch (expression.kind) {
      case "literal": {
        return expression.value;
      }
      case "identifier": {
        if (envBindings.has(expression.name)) {
          return envBindings.get(expression.name);
        }
        diagnostics.push(
          createDiagnostic(
            this.fileName,
            "type-check",
            "FLINT-COMPTIME-001",
            `Unknown compile-time identifier '${expression.name}'.`,
            expression.span,
            "error",
          ),
        );
        return undefined;
      }
      case "comptime-expression": {
        return this.evaluateInternal(
          expression.expression,
          envBindings,
          diagnostics,
        );
      }
      case "unary": {
        return this.evaluateUnary(expression, envBindings, diagnostics);
      }
      case "binary": {
        return this.evaluateBinary(expression, envBindings, diagnostics);
      }
      case "call": {
        return this.evaluateCall(expression, envBindings, diagnostics);
      }
      default: {
        diagnostics.push(
          createDiagnostic(
            this.fileName,
            "type-check",
            "FLINT-COMPTIME-002",
            `Expression kind '${expression.kind}' is not supported in compile-time constant evaluation.`,
            expression.span,
            "error",
          ),
        );
        return undefined;
      }
    }
  }

  private evaluateUnary(
    expression: FlintUnaryExpression,
    envBindings: ReadonlyMap<string, boolean | number | string>,
    diagnostics: FlintDiagnostic[],
  ): boolean | number | string | undefined {
    const operand = this.evaluateInternal(
      expression.operand,
      envBindings,
      diagnostics,
    );
    if (operand === undefined) return undefined;

    if (expression.operator === "!") {
      return !operand;
    }
    if (expression.operator === "-") {
      if (typeof operand === "number") return -operand;
      diagnostics.push(
        createDiagnostic(
          this.fileName,
          "type-check",
          "FLINT-COMPTIME-003",
          `Cannot apply unary minus to non-numeric type '${typeof operand}'.`,
          expression.span,
          "error",
        ),
      );
      return undefined;
    }

    diagnostics.push(
      createDiagnostic(
        this.fileName,
        "type-check",
        "FLINT-COMPTIME-004",
        `Unsupported unary operator '${expression.operator}' in constant expression.`,
        expression.span,
        "error",
      ),
    );
    return undefined;
  }

  // skipcq: JS-R1005
  private evaluateBinary(
    expression: FlintBinaryExpression,
    envBindings: ReadonlyMap<string, boolean | number | string>,
    diagnostics: FlintDiagnostic[],
  ): boolean | number | string | undefined {
    const left = this.evaluateInternal(
      expression.left,
      envBindings,
      diagnostics,
    );
    const right = this.evaluateInternal(
      expression.right,
      envBindings,
      diagnostics,
    );
    if (left === undefined || right === undefined) return undefined;

    switch (expression.operator) {
      case "+": {
        if (typeof left === "number" && typeof right === "number")
          return left + right;
        if (typeof left === "string" || typeof right === "string")
          return `${String(left)}${String(right)}`;
        break;
      }
      case "-": {
        if (typeof left === "number" && typeof right === "number")
          return left - right;
        break;
      }
      case "*": {
        if (typeof left === "number" && typeof right === "number")
          return left * right;
        break;
      }
      case "/": {
        if (typeof left === "number" && typeof right === "number") {
          if (right === 0) {
            diagnostics.push(
              createDiagnostic(
                this.fileName,
                "type-check",
                "FLINT-COMPTIME-005",
                "Division by zero in compile-time constant expression.",
                expression.span,
                "error",
              ),
            );
            return undefined;
          }
          return Math.trunc(left / right);
        }
        break;
      }
      case "%": {
        if (typeof left === "number" && typeof right === "number") {
          if (right === 0) {
            diagnostics.push(
              createDiagnostic(
                this.fileName,
                "type-check",
                "FLINT-COMPTIME-005",
                "Division by zero in compile-time constant expression.",
                expression.span,
                "error",
              ),
            );
            return undefined;
          }
          return left % right;
        }
        break;
      }
      case "==":
        return left === right;
      case "!=":
        return left !== right;
      case "<":
        return left < right;
      case "<=":
        return left <= right;
      case ">":
        return left > right;
      case ">=":
        return left >= right;
      case "&&":
        return Boolean(left && right);
      case "||":
        return Boolean(left || right);
      default:
        break;
    }

    diagnostics.push(
      createDiagnostic(
        this.fileName,
        "type-check",
        "FLINT-COMPTIME-006",
        `Operator '${expression.operator}' cannot be applied to types '${typeof left}' and '${typeof right}'.`,
        expression.span,
        "error",
      ),
    );
    return undefined;
  }

  // skipcq: JS-R1005
  private evaluateCall(
    expression: FlintCallExpression,
    envBindings: ReadonlyMap<string, boolean | number | string>,
    diagnostics: FlintDiagnostic[],
  ): boolean | number | string | undefined {
    const callee = expression.callee;

    if (callee === "assert" || callee === "static_assert") {
      const condition = this.evaluateInternal(
        expression.arguments[0] as FlintExpression,
        envBindings,
        diagnostics,
      );
      if (condition === false) {
        let message = "Static assertion failed.";
        if (expression.arguments[1]) {
          const customMsg = this.evaluateInternal(
            expression.arguments[1],
            envBindings,
            diagnostics,
          );
          if (typeof customMsg === "string") message = customMsg;
        }
        diagnostics.push(
          createDiagnostic(
            this.fileName,
            "type-check",
            "FLINT-COMPTIME-ASSERT",
            message,
            expression.span,
            "error",
          ),
        );
        return false;
      }
      return true;
    }

    if (
      callee === "size_of" ||
      callee === "std::meta::size_of" ||
      callee === "meta::size_of"
    ) {
      const typeArg = this.extractTypeNameFromCall(expression);
      if (typeArg) {
        return this.introspection.sizeOf(typeArg);
      }
    }

    if (
      callee === "align_of" ||
      callee === "std::meta::align_of" ||
      callee === "meta::align_of"
    ) {
      const typeArg = this.extractTypeNameFromCall(expression);
      if (typeArg) {
        return this.introspection.alignOf(typeArg);
      }
    }

    if (
      callee === "offset_of" ||
      callee === "std::meta::offset_of" ||
      callee === "meta::offset_of"
    ) {
      const typeArg = this.extractTypeNameFromCall(expression);
      const fieldArg = expression.arguments[1]
        ? this.evaluateInternal(
            expression.arguments[1],
            envBindings,
            diagnostics,
          )
        : undefined;
      if (typeArg && typeof fieldArg === "string") {
        try {
          return this.introspection.offsetOf(typeArg, fieldArg);
        } catch (error) {
          diagnostics.push(
            createDiagnostic(
              this.fileName,
              "type-check",
              "FLINT-COMPTIME-007",
              error instanceof Error ? error.message : String(error),
              expression.span,
              "error",
            ),
          );
          return undefined;
        }
      }
    }

    diagnostics.push(
      createDiagnostic(
        this.fileName,
        "type-check",
        "FLINT-COMPTIME-008",
        `Function '${callee}' cannot be evaluated at compile time.`,
        expression.span,
        "error",
      ),
    );
    return undefined;
  }

  private extractTypeNameFromCall(
    expression: FlintCallExpression,
  ): string | undefined {
    const firstArg = expression.arguments[0];
    if (firstArg && firstArg.kind === "identifier") {
      return firstArg.name;
    }
    if (
      firstArg &&
      firstArg.kind === "literal" &&
      typeof firstArg.value === "string"
    ) {
      return firstArg.value;
    }
    return undefined;
  }
}
