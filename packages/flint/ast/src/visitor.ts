import type {
  FlintEnumDeclaration,
  FlintExpression,
  FlintFunction,
  FlintInterfaceDeclaration,
  FlintMacroDeclaration,
  FlintMarkupChild,
  FlintMatchArm,
  FlintModule,
  FlintStatement,
  FlintStyleCompanion,
  FlintStructDeclaration,
} from "./nodes.js";

/**
 * Generic visitor interface for traversing Flint AST nodes without mutation.
 */
export interface FlintAstVisitor {
  visitModule?(node: FlintModule): void;
  visitFunction?(node: FlintFunction): void;
  visitStruct?(node: FlintStructDeclaration): void;
  visitEnum?(node: FlintEnumDeclaration): void;
  visitInterface?(node: FlintInterfaceDeclaration): void;
  visitMacro?(node: FlintMacroDeclaration): void;
  visitStatement?(node: FlintStatement): void;
  visitExpression?(node: FlintExpression): void;
  visitMatchArm?(node: FlintMatchArm): void;
  visitMarkupChild?(node: FlintMarkupChild): void;
  visitStyleCompanion?(node: FlintStyleCompanion): void;
}

/**
 * Traverses a markup child recursively with a visitor.
 */
export function walkFlintMarkupChild(
  child: FlintMarkupChild,
  visitor: FlintAstVisitor,
): void {
  visitor.visitMarkupChild?.(child);

  switch (child.kind) {
    case "markup-element":
      if (typeof child.tag !== "string") {
        walkFlintExpression(child.tag, visitor);
      }
      for (const attr of child.attributes) {
        if (attr.kind === "markup-spread-attribute") {
          walkFlintExpression(attr.expression, visitor);
        } else if (attr.kind === "markup-slot-attribute") {
          walkFlintExpression(attr.payload, visitor);
        } else if (attr.value?.kind === "expression") {
          walkFlintExpression(attr.value.expression, visitor);
        }
      }
      for (const c of child.children) {
        walkFlintMarkupChild(c, visitor);
      }
      break;
    case "markup-expression":
      walkFlintExpression(child.expression, visitor);
      break;
    case "markup-slot":
      if (child.fallback) {
        for (const c of child.fallback) {
          walkFlintMarkupChild(c, visitor);
        }
      }
      break;
    case "markup-text":
      break;
    case "markup-conditional":
      walkFlintExpression(child.condition, visitor);
      for (const c of child.truthy) walkFlintMarkupChild(c, visitor);
      for (const branch of child.elseif ?? []) {
        walkFlintExpression(branch.condition, visitor);
        for (const c of branch.children) walkFlintMarkupChild(c, visitor);
      }
      for (const c of child.fallback ?? []) walkFlintMarkupChild(c, visitor);
      break;
    case "markup-for":
      walkFlintExpression(child.items, visitor);
      for (const c of child.children) walkFlintMarkupChild(c, visitor);
      break;
  }
}

/**
 * Traverses an AST expression recursively with a visitor.
 */
export function walkFlintExpression(
  expr: FlintExpression,
  visitor: FlintAstVisitor,
): void {
  visitor.visitExpression?.(expr);

  switch (expr.kind) {
    case "markup-block":
      for (const child of expr.children) walkFlintMarkupChild(child, visitor);
      break;
    case "binary":
      walkFlintExpression(expr.left, visitor);
      walkFlintExpression(expr.right, visitor);
      break;
    case "call":
      if (expr.receiver !== undefined)
        walkFlintExpression(expr.receiver, visitor);
      for (const arg of expr.arguments) {
        walkFlintExpression(arg, visitor);
      }
      break;
    case "unary":
      walkFlintExpression(expr.operand, visitor);
      break;
    case "struct-value":
      for (const val of Object.values(expr.fields)) {
        walkFlintExpression(val, visitor);
      }
      break;
    case "object":
      for (const val of Object.values(expr.fields)) {
        walkFlintExpression(val, visitor);
      }
      break;
    case "enum-value":
      for (const arg of expr.arguments) {
        walkFlintExpression(arg, visitor);
      }
      break;
    case "array-literal":
    case "vector-literal":
      for (const el of expr.elements) {
        walkFlintExpression(el, visitor);
      }
      break;
    case "index":
      walkFlintExpression(expr.receiver, visitor);
      walkFlintExpression(expr.index, visitor);
      for (const call of expr.calls ?? []) {
        for (const arg of call.arguments) {
          walkFlintExpression(arg, visitor);
        }
      }
      break;
    case "match":
      walkFlintExpression(expr.value, visitor);
      for (const arm of expr.arms) {
        visitor.visitMatchArm?.(arm);
        walkFlintExpression(arm.value, visitor);
      }
      break;
    case "comptime-expression":
      walkFlintExpression(expr.expression, visitor);
      break;
    case "literal":
    case "identifier":
    case "function-value":
      break;
  }
}

/**
 * Traverses an AST statement recursively with a visitor.
 */
export function walkFlintStatement(
  stmt: FlintStatement,
  visitor: FlintAstVisitor,
): void {
  visitor.visitStatement?.(stmt);

  switch (stmt.kind) {
    case "let":
      walkFlintExpression(stmt.value, visitor);
      break;
    case "assignment":
      if (stmt.index !== undefined) {
        walkFlintExpression(stmt.index, visitor);
      }
      walkFlintExpression(stmt.value, visitor);
      break;
    case "expression-statement":
      walkFlintExpression(stmt.expression, visitor);
      break;
    case "return":
      if (stmt.value !== undefined) {
        walkFlintExpression(stmt.value, visitor);
      }
      break;
    case "if":
      walkFlintExpression(stmt.condition, visitor);
      for (const s of stmt.consequent) {
        walkFlintStatement(s, visitor);
      }
      if (stmt.alternate !== undefined) {
        for (const s of stmt.alternate) {
          walkFlintStatement(s, visitor);
        }
      }
      break;
    case "while":
      walkFlintExpression(stmt.condition, visitor);
      for (const s of stmt.body) {
        walkFlintStatement(s, visitor);
      }
      break;
    case "for":
      if (stmt.initializer !== undefined) {
        walkFlintStatement(stmt.initializer, visitor);
      }
      walkFlintExpression(stmt.condition, visitor);
      if (stmt.update !== undefined) {
        walkFlintStatement(stmt.update, visitor);
      }
      for (const s of stmt.body) {
        walkFlintStatement(s, visitor);
      }
      break;
    case "do-while":
      for (const s of stmt.body) {
        walkFlintStatement(s, visitor);
      }
      walkFlintExpression(stmt.condition, visitor);
      break;
    case "yield":
      walkFlintExpression(stmt.value, visitor);
      break;
    case "iterator-loop":
      walkFlintExpression(stmt.iterator, visitor);
      for (const s of stmt.body) {
        walkFlintStatement(s, visitor);
      }
      break;
    case "match-statement":
      walkFlintExpression(stmt.value, visitor);
      for (const arm of stmt.arms) {
        visitor.visitMatchArm?.(arm);
        walkFlintExpression(arm.value, visitor);
      }
      break;
    case "switch":
      walkFlintExpression(stmt.value, visitor);
      for (const c of stmt.cases) {
        for (const s of c.body) {
          walkFlintStatement(s, visitor);
        }
      }
      if (stmt.defaultCase !== undefined) {
        for (const s of stmt.defaultCase) {
          walkFlintStatement(s, visitor);
        }
      }
      break;
    case "comptime-statement":
      for (const s of stmt.body) {
        walkFlintStatement(s, visitor);
      }
      break;
  }
}

/**
 * Traverses a complete Flint module AST recursively with a visitor.
 */
export function walkFlintModule(
  module: FlintModule,
  visitor: FlintAstVisitor,
): void {
  visitor.visitModule?.(module);

  for (const companion of module.styleCompanions ?? []) {
    visitor.visitStyleCompanion?.(companion);
  }

  for (const struct of module.structs) {
    visitor.visitStruct?.(struct);
  }
  for (const enumeration of module.enums) {
    visitor.visitEnum?.(enumeration);
  }
  for (const iface of module.interfaces) {
    visitor.visitInterface?.(iface);
  }
  if (module.macros !== undefined) {
    for (const macro of module.macros) {
      visitor.visitMacro?.(macro);
      for (const stmt of macro.body) {
        walkFlintStatement(stmt, visitor);
      }
    }
  }
  if (module.comptimeStatements !== undefined) {
    for (const ct of module.comptimeStatements) {
      for (const stmt of ct.body) {
        walkFlintStatement(stmt, visitor);
      }
    }
  }
  for (const fn of module.functions) {
    visitor.visitFunction?.(fn);
    for (const stmt of fn.body) {
      walkFlintStatement(stmt, visitor);
    }
  }
}
