import type {
  FlintExpression,
  FlintStatement,
} from "@mission-platform/flint-ast";

/**
 * Manages unique identifier generation and lexical hygiene scopes during macro expansions.
 */
export class FlintMacroHygiene {
  private counter = 0;
  private readonly scopePrefix: string;

  public constructor(scopePrefix = "__flint_hygiene_") {
    this.scopePrefix = scopePrefix;
  }

  /**
   * Generates an unforgeable, hygienic identifier unique to this macro expansion scope.
   */
  public generateIdentifier(base = "temp"): string {
    this.counter += 1;
    return `${this.scopePrefix}${base}_${this.counter}`;
  }

  /**
   * Renames matching identifiers in an expression to preserve hygienic lexical scoping.
   */
  public renameInExpression(
    expr: FlintExpression,
    oldName: string,
    newName: string,
  ): FlintExpression {
    switch (expr.kind) {
      case "identifier":
        return expr.name === oldName ? { ...expr, name: newName } : expr;
      case "binary":
        return {
          ...expr,
          left: this.renameInExpression(expr.left, oldName, newName),
          right: this.renameInExpression(expr.right, oldName, newName),
        };
      case "unary":
        return {
          ...expr,
          operand: this.renameInExpression(expr.operand, oldName, newName),
        };
      case "call":
        return {
          ...expr,
          callee: expr.callee === oldName ? newName : expr.callee,
          arguments: expr.arguments.map((arg) =>
            this.renameInExpression(arg, oldName, newName),
          ),
        };
      case "match":
        return {
          ...expr,
          value: this.renameInExpression(expr.value, oldName, newName),
          arms: expr.arms.map((arm) => ({
            ...arm,
            value: this.renameInExpression(arm.value, oldName, newName),
          })),
        };
      case "struct-value": {
        const fields: Record<string, FlintExpression> = {};
        for (const [k, v] of Object.entries(expr.fields)) {
          fields[k] = this.renameInExpression(v, oldName, newName);
        }
        return { ...expr, fields };
      }
      case "enum-value":
        return {
          ...expr,
          arguments: expr.arguments.map((arg) =>
            this.renameInExpression(arg, oldName, newName),
          ),
        };
      case "array-literal":
      case "vector-literal":
        return {
          ...expr,
          elements: expr.elements.map((el) =>
            this.renameInExpression(el, oldName, newName),
          ),
        };
      case "index":
        return {
          ...expr,
          receiver: this.renameInExpression(expr.receiver, oldName, newName),
          index: this.renameInExpression(expr.index, oldName, newName),
        };
      case "comptime-expression":
        return {
          ...expr,
          expression: this.renameInExpression(
            expr.expression,
            oldName,
            newName,
          ),
        };
      default:
        return expr;
    }
  }

  /**
   * Renames matching identifiers in a statement.
   */
  public renameInStatement(
    stmt: FlintStatement,
    oldName: string,
    newName: string,
  ): FlintStatement {
    switch (stmt.kind) {
      case "let":
        return {
          ...stmt,
          name: stmt.name === oldName ? newName : stmt.name,
          value: this.renameInExpression(stmt.value, oldName, newName),
        };
      case "assignment":
        return {
          ...stmt,
          name: stmt.name === oldName ? newName : stmt.name,
          value: this.renameInExpression(stmt.value, oldName, newName),
          ...(stmt.index === undefined
            ? {}
            : { index: this.renameInExpression(stmt.index, oldName, newName) }),
        };
      case "return":
        return {
          ...stmt,
          ...(stmt.value === undefined
            ? {}
            : { value: this.renameInExpression(stmt.value, oldName, newName) }),
        };
      case "expression-statement":
        return {
          ...stmt,
          expression: this.renameInExpression(
            stmt.expression,
            oldName,
            newName,
          ),
        };
      case "if":
        return {
          ...stmt,
          condition: this.renameInExpression(stmt.condition, oldName, newName),
          consequent: stmt.consequent.map((s) =>
            this.renameInStatement(s, oldName, newName),
          ),
          alternate: stmt.alternate?.map((s) =>
            this.renameInStatement(s, oldName, newName),
          ),
        };
      case "while":
        return {
          ...stmt,
          condition: this.renameInExpression(stmt.condition, oldName, newName),
          body: stmt.body.map((s) =>
            this.renameInStatement(s, oldName, newName),
          ),
        };
      case "do-while":
        return {
          ...stmt,
          condition: this.renameInExpression(stmt.condition, oldName, newName),
          body: stmt.body.map((s) =>
            this.renameInStatement(s, oldName, newName),
          ),
        };
      case "yield":
        return {
          ...stmt,
          value: this.renameInExpression(stmt.value, oldName, newName),
        };
      case "iterator-loop":
        return {
          ...stmt,
          binding: stmt.binding === oldName ? newName : stmt.binding,
          iterator: this.renameInExpression(stmt.iterator, oldName, newName),
          body: stmt.body.map((s) =>
            this.renameInStatement(s, oldName, newName),
          ),
        };
      case "match-statement":
        return {
          ...stmt,
          value: this.renameInExpression(stmt.value, oldName, newName),
          arms: stmt.arms.map((arm) => ({
            ...arm,
            value: this.renameInExpression(arm.value, oldName, newName),
          })),
        };
      case "switch":
        return {
          ...stmt,
          value: this.renameInExpression(stmt.value, oldName, newName),
          cases: stmt.cases.map((c) => ({
            ...c,
            body: c.body.map((s) =>
              this.renameInStatement(s, oldName, newName),
            ),
          })),
          defaultCase: stmt.defaultCase?.map((s) =>
            this.renameInStatement(s, oldName, newName),
          ),
        };
      case "comptime-statement":
        return {
          ...stmt,
          body: stmt.body.map((s) =>
            this.renameInStatement(s, oldName, newName),
          ),
        };
      default:
        return stmt;
    }
  }
}
