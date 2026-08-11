/**
 * Compile-time constant recognition over source fragments.
 *
 * A `useMemo` whose factory can never change folds to the bare value: a Vue
 * `setup` (and a composable body) runs once, so wrapping a literal in
 * `computed` only adds a reactive node that can never invalidate. The neutral
 * optimizer answers this question on parsed expressions; against the generic
 * AST it is answered from the recorded fragment text, which covers every
 * literal shape a constant memo can take.
 */
import { splitTopLevel, unwrapParentheses } from "./text.js";

/** Literal keywords that are constant on their own. */
const CONSTANT_KEYWORDS: ReadonlySet<string> = new Set([
  "true",
  "false",
  "null",
  "undefined",
]);

/** Whether a fragment is a literal, or a pure combination of literals. */
export function isConstantExpression(text: string): boolean {
  const trimmed = unwrapParentheses(text).trim();
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
  if (/^(['"]).*\1$/s.test(trimmed)) {
    return true;
  }
  // A template literal is constant only when it interpolates nothing.
  if (/^`[^`]*`$/s.test(trimmed) && !trimmed.includes("${")) {
    return true;
  }
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return splitTopLevel(trimmed.slice(1, -1), ",")
      .map((element) => element.trim())
      .filter((element) => element.length > 0)
      .every(
        (element) =>
          !element.startsWith("...") && isConstantExpression(element),
      );
  }
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return splitTopLevel(trimmed.slice(1, -1), ",")
      .map((member) => member.trim())
      .filter((member) => member.length > 0)
      .every((member) => {
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

/** The constant a `{ return <value>; }` body returns, or `undefined`. */
function constantBlockValue(body: string): string | undefined {
  const inner = body.slice(1, -1).trim();
  const value = /^return\s+([\s\S]*?);?$/.exec(inner)?.[1]?.trim();
  if (value === undefined) {
    return undefined;
  }
  return isConstantExpression(value) ? value : undefined;
}

/**
 * The constant value a `useMemo` factory yields, or `undefined` when the memo is
 * genuinely reactive. Both the expression-bodied arrow (`() => 'x'`) and the
 * single-`return` block body (`() => { return 'x'; }`) fold, as does a factory
 * argument that is already a constant.
 */
export function constantMemoValue(factory: string): string | undefined {
  const trimmed = unwrapParentheses(factory).trim();
  if (isConstantExpression(trimmed)) {
    return trimmed;
  }
  const header =
    /^(?:\(\s*\)|[A-Za-z_$][\w$]*)\s*=>\s*/.exec(trimmed)?.[0] ??
    /^function\s*\w*\s*\(\s*\)\s*/.exec(trimmed)?.[0];
  if (header === undefined) {
    return undefined;
  }
  const body = trimmed.slice(header.length).trim();
  if (body.startsWith("{") && body.endsWith("}")) {
    // An expression-bodied arrow returning an object literal is written
    // `() => ({ … })`; the parentheses were stripped above, so a bare `{ … }`
    // here is either the block body or that object literal.
    return (
      constantBlockValue(body) ??
      (isConstantExpression(body) ? body : undefined)
    );
  }
  return isConstantExpression(body) ? body : undefined;
}
