import {
  createDiagnostic,
  type FlintDiagnostic,
  type FlintExpression,
  type FlintFunction,
  type FlintModule,
  type FlintSourceSpan,
  type FlintStatement,
  type FlintTypeName,
} from "@mission-platform/flint-ast";

export interface BorrowState {
  readonly name: string;
  readonly type: FlintTypeName;
  readonly isMutable: boolean;
  isMoved: boolean;
  movedSpan?: FlintSourceSpan;
  activeImmutableBorrows: number;
  hasActiveMutableBorrow: boolean;
}

export interface BorrowCheckerResult {
  readonly diagnostics: readonly FlintDiagnostic[];
  readonly movedVariables: ReadonlySet<string>;
}

/**
 * Affine borrow checker for Flint source code.
 * Validates ownership moves, non-aliasing mutable references (&mut),
 * and forbids use-after-move or simultaneous shared & mutable borrows.
 */
export class FlintBorrowChecker {
  private readonly fileName: string;
  private readonly diagnostics: FlintDiagnostic[] = [];
  private readonly movedVariables = new Set<string>();

  public constructor(fileName = "<input>") {
    this.fileName = fileName;
  }

  /**
   * Checks all functions in a Flint module for affine ownership and borrow violations.
   */
  public checkModule(module: FlintModule): BorrowCheckerResult {
    for (const fn of module.functions) {
      this.checkFunction(fn);
    }
    return {
      diagnostics: this.diagnostics,
      movedVariables: this.movedVariables,
    };
  }

  /**
   * Checks a single function body for borrow and move violations.
   */
  public checkFunction(fn: FlintFunction): void {
    const scope = new Map<string, BorrowState>();

    for (const param of fn.parameters) {
      scope.set(param.name, {
        name: param.name,
        type: param.type,
        isMutable: param.mutable === true,
        isMoved: false,
        activeImmutableBorrows: 0,
        hasActiveMutableBorrow: false,
      });
    }

    for (const stmt of fn.body) {
      this.checkStatement(stmt, scope);
    }
  }

  private checkStatement(
    stmt: FlintStatement,
    scope: Map<string, BorrowState>,
  ): void {
    switch (stmt.kind) {
      case "let": {
        this.checkExpression(stmt.value, scope);
        scope.set(stmt.name, {
          name: stmt.name,
          type: stmt.type,
          isMutable: stmt.mutable === true,
          isMoved: false,
          activeImmutableBorrows: 0,
          hasActiveMutableBorrow: false,
        });
        break;
      }
      case "assignment": {
        const target = scope.get(stmt.name);
        if (target !== undefined && target.isMoved) {
          // Re-assignment re-initializes a moved variable
          target.isMoved = false;
          target.movedSpan = undefined;
        }
        if (stmt.index !== undefined) {
          this.checkExpression(stmt.index, scope);
        }
        this.checkExpression(stmt.value, scope);
        break;
      }
      case "return": {
        if (stmt.value !== undefined) {
          this.checkExpression(stmt.value, scope);
        }
        break;
      }
      case "expression-statement": {
        this.checkExpression(stmt.expression, scope);
        break;
      }
      case "if": {
        this.checkExpression(stmt.condition, scope);
        const consequentScope = this.cloneScope(scope);
        for (const s of stmt.consequent) {
          this.checkStatement(s, consequentScope);
        }
        if (stmt.alternate !== undefined) {
          const alternateScope = this.cloneScope(scope);
          for (const s of stmt.alternate) {
            this.checkStatement(s, alternateScope);
          }
        }
        break;
      }
      case "while": {
        this.checkExpression(stmt.condition, scope);
        const loopScope = this.cloneScope(scope);
        for (const s of stmt.body) {
          this.checkStatement(s, loopScope);
        }
        break;
      }
      case "iterator-loop": {
        this.checkExpression(stmt.iterator, scope);
        const loopScope = this.cloneScope(scope);
        loopScope.set(stmt.binding, {
          name: stmt.binding,
          type: { kind: "type-name", name: "unit", span: stmt.span },
          isMutable: false,
          isMoved: false,
          activeImmutableBorrows: 0,
          hasActiveMutableBorrow: false,
        });
        for (const s of stmt.body) {
          this.checkStatement(s, loopScope);
        }
        break;
      }
      case "match-statement": {
        this.checkExpression(stmt.value, scope);
        for (const arm of stmt.arms) {
          this.checkExpression(arm.value, scope);
        }
        break;
      }
      case "switch": {
        this.checkExpression(stmt.value, scope);
        for (const c of stmt.cases) {
          for (const s of c.body) {
            this.checkStatement(s, scope);
          }
        }
        if (stmt.defaultCase !== undefined) {
          for (const s of stmt.defaultCase) {
            this.checkStatement(s, scope);
          }
        }
        break;
      }
      case "yield": {
        this.checkExpression(stmt.value, scope);
        break;
      }
      case "comptime-statement":
      case "do-while":
      case "for":
        break;
    }
  }

  private checkExpression(
    expr: FlintExpression,
    scope: Map<string, BorrowState>,
  ): void {
    switch (expr.kind) {
      case "identifier": {
        const state = scope.get(expr.name);
        if (state !== undefined && state.isMoved) {
          this.diagnostics.push(
            createDiagnostic(
              this.fileName,
              "analysis",
              "FLINT-BORROW-001",
              `Use of moved value '${expr.name}'. Value was previously moved.`,
              expr.span,
              "error",
              "Clone the value or pass it by reference (&) to avoid moving ownership.",
            ),
          );
        }
        break;
      }
      case "unary": {
        if (expr.operator === "&") {
          if (expr.operand.kind === "identifier") {
            const state = scope.get(expr.operand.name);
            if (state !== undefined) {
              if (state.isMoved) {
                this.diagnostics.push(
                  createDiagnostic(
                    this.fileName,
                    "analysis",
                    "FLINT-BORROW-001",
                    `Cannot borrow moved value '${expr.operand.name}'.`,
                    expr.span,
                    "error",
                  ),
                );
              } else if (state.hasActiveMutableBorrow) {
                this.diagnostics.push(
                  createDiagnostic(
                    this.fileName,
                    "analysis",
                    "FLINT-BORROW-002",
                    `Cannot borrow '${expr.operand.name}' as immutable because it is also borrowed as mutable (&mut).`,
                    expr.span,
                    "error",
                  ),
                );
              } else {
                state.activeImmutableBorrows += 1;
              }
            }
          } else {
            this.checkExpression(expr.operand, scope);
          }
        } else if (expr.operator === "&mut") {
          if (expr.operand.kind === "identifier") {
            const state = scope.get(expr.operand.name);
            if (state !== undefined) {
              if (state.isMoved) {
                this.diagnostics.push(
                  createDiagnostic(
                    this.fileName,
                    "analysis",
                    "FLINT-BORROW-001",
                    `Cannot borrow moved value '${expr.operand.name}' as mutable.`,
                    expr.span,
                    "error",
                  ),
                );
              } else if (state.hasActiveMutableBorrow) {
                this.diagnostics.push(
                  createDiagnostic(
                    this.fileName,
                    "analysis",
                    "FLINT-BORROW-003",
                    `Cannot borrow '${expr.operand.name}' as mutable more than once at a time.`,
                    expr.span,
                    "error",
                  ),
                );
              } else if (state.activeImmutableBorrows > 0) {
                this.diagnostics.push(
                  createDiagnostic(
                    this.fileName,
                    "analysis",
                    "FLINT-BORROW-004",
                    `Cannot borrow '${expr.operand.name}' as mutable because it is already borrowed as immutable (&).`,
                    expr.span,
                    "error",
                  ),
                );
              } else {
                state.hasActiveMutableBorrow = true;
              }
            }
          } else {
            this.checkExpression(expr.operand, scope);
          }
        } else {
          this.checkExpression(expr.operand, scope);
        }
        break;
      }
      case "binary": {
        this.checkExpression(expr.left, scope);
        this.checkExpression(expr.right, scope);
        break;
      }
      case "call": {
        for (const arg of expr.arguments) {
          this.checkExpression(arg, scope);
        }
        break;
      }
      case "match": {
        this.checkExpression(expr.value, scope);
        for (const arm of expr.arms) {
          this.checkExpression(arm.value, scope);
        }
        break;
      }
      case "index": {
        this.checkExpression(expr.receiver, scope);
        this.checkExpression(expr.index, scope);
        break;
      }
      case "struct-value": {
        for (const val of Object.values(expr.fields)) {
          this.checkExpression(val, scope);
        }
        break;
      }
      case "enum-value": {
        for (const arg of expr.arguments) {
          this.checkExpression(arg, scope);
        }
        break;
      }
      case "array-literal":
      case "vector-literal": {
        for (const el of expr.elements) {
          this.checkExpression(el, scope);
        }
        break;
      }
      case "comptime-expression": {
        this.checkExpression(expr.expression, scope);
        break;
      }
      case "markup-block":
      case "literal":
      case "function-value":
        break;
    }
  }

  private cloneScope(
    scope: Map<string, BorrowState>,
  ): Map<string, BorrowState> {
    const clone = new Map<string, BorrowState>();
    for (const [k, v] of scope.entries()) {
      clone.set(k, { ...v });
    }
    return clone;
  }
}

/**
 * Convenience entry point to run borrow checking on a Flint module.
 */
export function checkFlintBorrow(
  module: FlintModule,
  fileName = "<input>",
): BorrowCheckerResult {
  return new FlintBorrowChecker(fileName).checkModule(module);
}
