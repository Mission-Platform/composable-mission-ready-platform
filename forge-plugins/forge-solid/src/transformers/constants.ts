/**
 * Compile-time constant recognition over source fragments.
 *
 * Stage-2 folds a `useMemo` whose factory can never change into the bare value —
 * a Solid component body runs once, so wrapping a literal in `createMemo` only
 * adds a reactive node. The neutral optimizer works on parsed expressions;
 * against the generic AST the same question is answered from the fragment text,
 * which is enough for the literal shapes a constant memo can take.
 */
import { splitTopLevel, stripOuterParentheses, unquote } from "./text.js";

/** Literal keywords that are constant on their own. */
const CONSTANT_KEYWORDS: ReadonlySet<string> = new Set([
  "true",
  "false",
  "null",
  "undefined",
]);

/** Whether a fragment is a literal, or a pure combination of literals. */
export function isConstantExpression(text: string): boolean {
  const trimmed = stripOuterParentheses(text);
  if (trimmed === "") {
    return false;
  }
  if (CONSTANT_KEYWORDS.has(trimmed)) {
    return true;
  }
  if (/^[+-]?\d+(?:\.\d+)?$/.test(trimmed)) {
    return true;
  }
  if (trimmed.startsWith("!")) {
    return isConstantExpression(trimmed.slice(1));
  }
  if (unquote(trimmed) !== undefined) {
    return true;
  }
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return splitTopLevel(trimmed.slice(1, -1), ",").every(
      (element) => !element.startsWith("...") && isConstantExpression(element),
    );
  }
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return splitTopLevel(trimmed.slice(1, -1), ",").every((member) => {
      const colon = member.indexOf(":");
      return (
        colon !== -1 &&
        !member.startsWith("...") &&
        isConstantExpression(member.slice(colon + 1))
      );
    });
  }
  return false;
}

/**
 * The constant value a `useMemo` factory yields, or `undefined` when the memo is
 * genuinely reactive. Both the expression-bodied arrow (`() => 'x'`) and the
 * single-`return` block body (`() => { return 'x'; }`) fold, as does a factory
 * argument that is itself a constant.
 */
export function constantMemoValue(factory: string): string | undefined {
  const trimmed = stripOuterParentheses(factory);
  if (isConstantExpression(trimmed)) {
    return trimmed;
  }
  const arrow = /^(?:\(\s*\)|[A-Za-z_$][\w$]*)\s*=>\s*/.exec(trimmed);
  const functionExpression = /^function\s*\w*\s*\([^)]*\)\s*/.exec(trimmed);
  const header = arrow?.[0] ?? functionExpression?.[0];
  if (header === undefined) {
    return undefined;
  }
  const body = trimmed.slice(header.length).trim();
  if (body.startsWith("{") && body.endsWith("}") && arrow === null) {
    return constantBlockValue(body);
  }
  if (body.startsWith("{") && body.endsWith("}")) {
    // An expression-bodied arrow returning an object literal is written
    // `() => ({ … })`; the parentheses were stripped above, so a bare `{ … }`
    // here is the block body form.
    return (
      constantBlockValue(body) ??
      (isConstantExpression(body) ? body : undefined)
    );
  }
  return isConstantExpression(body) ? body : undefined;
}

/** The constant a `{ return <value>; }` body returns, or `undefined`. */
function constantBlockValue(body: string): string | undefined {
  const inner = body.slice(1, -1).trim();
  const returned = /^return\s+([\s\S]*?);?$/.exec(inner);
  const value = returned?.[1]?.trim();
  if (value === undefined) {
    return undefined;
  }
  return isConstantExpression(value) ? value : undefined;
}
