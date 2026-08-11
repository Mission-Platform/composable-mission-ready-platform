/**
 * Inlinable render helpers.
 *
 * A component may factor part of its tree into a local function
 * (`const renderItems = (entries) => entries.map((item) => <li/>)`) and call it
 * from the returned markup. A Vue `<template>` has no binding form for a VNode
 * factory, so such a call would otherwise force the render-closure fallback.
 *
 * When the helper is safe to inline — one expression body, never recursive, and
 * referenced **only** as a call callee — its body can be spliced into each call
 * site with the arguments bound to the parameters, and the surrounding tree
 * renders natively (a `.map()` helper becomes a `v-for`, and so on). A helper
 * that is also passed around as a *value* is deliberately left alone: dropping
 * its declaration would leave that reference dangling, so the component keeps
 * the safe fallback.
 *
 * Everything here works on the recorded source text with the literal-aware
 * scanners from `./text.js` — no parsing.
 */
import { readVariableStatement, splitStatements } from "./statements.js";
import {
  indexOfTopLevel,
  maskLiterals,
  matchBracket,
  splitTopLevel,
  unwrapParentheses,
} from "./text.js";

import type { GenericRenderNode } from "@mission-platform/forge-plugin-api";

/** A function-valued const whose body is a single markup-producing expression. */
export interface InlinableHelper {
  /** The parameter names, in order. */
  readonly parameters: readonly string[];
  /** Each parameter's default, when it declares one. */
  readonly defaults: readonly (string | undefined)[];
  /** The body expression's recorded text. */
  readonly body: string;
  /** Consts declared in a block body, spliced into the inlined markup. */
  readonly substitutions: ReadonlyMap<string, string>;
  /** The JSX roots recorded inside the declaration. */
  readonly renderNodes: readonly GenericRenderNode[];
}

/** One place a helper name may be referenced from. */
export interface HelperUsage {
  /** The name the statement declares, when it declares one. */
  readonly name?: string;
  /** The statement's recorded text. */
  readonly text: string;
}

/** A declaration considered for inlining. */
export interface HelperCandidate {
  /** The declared name. */
  readonly name: string;
  /** The initializer's recorded text. */
  readonly initializer: string;
  /** The JSX roots recorded inside the declaration. */
  readonly renderNodes: readonly GenericRenderNode[];
}

/** Fold guard arms and a final value into a nested conditional expression. */
function conditionalChain(
  guards: readonly { condition: string; value: string }[],
  fallback: string,
): string {
  let chain = fallback;
  for (const guard of guards.toReversed()) {
    chain = `${guard.condition} ? (${guard.value}) : (${chain})`;
  }
  return chain;
}

/** Escape a name for use inside a regular expression. */
function escapeName(name: string): string {
  return name.replaceAll(/[$()*+.?[\\\]^{|}]/g, String.raw`\$&`);
}

/** Read one parameter's name and default out of a parameter-list entry. */
function readParameter(
  entry: string,
): { name: string; fallback?: string } | undefined {
  const equals = indexOfTopLevel(entry, "=");
  const head = (equals === -1 ? entry : entry.slice(0, equals)).trim();
  const fallback = equals === -1 ? undefined : entry.slice(equals + 1).trim();
  const name = head.split(":")[0].trim();
  return /^[A-Za-z_$][\w$]*$/.test(name) ? { name, fallback } : undefined;
}

/** Read a parenthesised parameter list into names and defaults. */
function readParameterList(
  head: string,
): { parameters: string[]; defaults: (string | undefined)[] } | undefined {
  const entries: string[] = [];
  if (head.startsWith("(")) {
    const close = matchBracket(head, 0);
    if (close === -1) {
      return undefined;
    }
    const inner = head.slice(1, close).trim();
    if (inner.length > 0) {
      entries.push(...splitTopLevel(inner, ","));
    }
  } else if (head.length > 0) {
    entries.push(head);
  }
  const parameters: string[] = [];
  const defaults: (string | undefined)[] = [];
  for (const entry of entries) {
    const parameter = readParameter(entry);
    if (parameter === undefined) {
      return undefined;
    }
    parameters.push(parameter.name);
    defaults.push(parameter.fallback);
  }
  return { parameters, defaults };
}

/** Read `if (<condition>) return <value>;` — one arm of a guard chain. */
function readGuardReturn(
  statement: string,
): { condition: string; value: string } | undefined {
  if (!/^if\s*\(/.test(statement)) {
    return undefined;
  }
  const open = statement.indexOf("(");
  const close = matchBracket(statement, open);
  if (close === -1) {
    return undefined;
  }
  let rest = statement.slice(close + 1).trim();
  if (rest.startsWith("{")) {
    if (matchBracket(rest, 0) !== rest.length - 1) {
      return undefined;
    }
    rest = rest.slice(1, -1).trim();
  }
  rest = rest.replace(/;$/, "").trim();
  if (!/^return\s/.test(rest)) {
    return undefined;
  }
  const value = rest.slice("return".length).trim();
  return value.length === 0
    ? undefined
    : { condition: statement.slice(open + 1, close).trim(), value };
}

/** One `case`/`default` clause of a switch statement. */
interface SwitchClause {
  /** The case test, or `undefined` for `default`. */
  readonly test?: string;
  /** Where the clause body starts. */
  readonly start: number;
  /** Where the clause keyword starts. */
  readonly keyword: number;
}

/** Locate the `case`/`default` clauses of a switch body at nesting depth zero. */
function readSwitchClauses(inner: string): SwitchClause[] | undefined {
  const mask = maskLiterals(inner);
  const clauses: SwitchClause[] = [];
  let depth = 0;
  let index = 0;
  while (index < inner.length) {
    if (mask[index]) {
      index += 1;
      continue;
    }
    const character = inner[index];
    if (character === "(" || character === "[" || character === "{") {
      depth += 1;
      index += 1;
      continue;
    }
    if (character === ")" || character === "]" || character === "}") {
      depth -= 1;
      index += 1;
      continue;
    }
    if (
      depth === 0 &&
      inner.startsWith("case", index) &&
      !/[\w$]/.test(inner[index + 4] ?? "")
    ) {
      const colon = indexOfTopLevel(inner.slice(index), ":");
      if (colon === -1) {
        return undefined;
      }
      clauses.push({
        test: inner.slice(index + 4, index + colon).trim(),
        start: index + colon + 1,
        keyword: index,
      });
      index += colon + 1;
      continue;
    }
    if (
      depth === 0 &&
      inner.startsWith("default", index) &&
      !/[\w$]/.test(inner[index + 7] ?? "")
    ) {
      const colon = inner.indexOf(":", index);
      if (colon === -1) {
        return undefined;
      }
      clauses.push({ start: colon + 1, keyword: index });
      index = colon + 1;
      continue;
    }
    index += 1;
  }
  return clauses.length === 0 ? undefined : clauses;
}

/** The expression a switch clause returns, when that is all it does. */
function switchClauseValue(body: string): string | undefined {
  let text = body.trim();
  if (text.startsWith("{")) {
    if (matchBracket(text, 0) !== text.length - 1) {
      return undefined;
    }
    text = text.slice(1, -1).trim();
  }
  const statements = splitStatements(text).map((entry) =>
    entry.trim().replace(/;$/, "").trim(),
  );
  const kept = statements.filter(
    (entry) => entry.length > 0 && entry !== "break",
  );
  if (kept.length !== 1 || !/^return\s/.test(kept[0])) {
    return undefined;
  }
  const value = kept[0].slice("return".length).trim();
  return value.length === 0 ? undefined : value;
}

/**
 * Fold `switch (subject) { case 'a': return <A/>; default: return <D/>; }` into
 * an equivalent conditional chain, which the template lowers to `v-if`/`v-else`.
 */
function readSwitchExpression(statement: string): string | undefined {
  if (!/^switch\s*\(/.test(statement)) {
    return undefined;
  }
  const open = statement.indexOf("(");
  const close = matchBracket(statement, open);
  if (close === -1) {
    return undefined;
  }
  const subject = statement.slice(open + 1, close).trim();
  const brace = statement.indexOf("{", close);
  if (brace === -1 || matchBracket(statement, brace) !== statement.length - 1) {
    return undefined;
  }
  const inner = statement.slice(brace + 1, -1);
  const clauses = readSwitchClauses(inner);
  if (clauses === undefined) {
    return undefined;
  }
  const guards: { condition: string; value: string }[] = [];
  let fallback: string | undefined;
  for (const [index, clause] of clauses.entries()) {
    const end = clauses[index + 1]?.keyword ?? inner.length;
    const value = switchClauseValue(inner.slice(clause.start, end));
    if (value === undefined) {
      return undefined;
    }
    if (clause.test === undefined) {
      fallback = value;
    } else {
      guards.push({ condition: `${subject} === ${clause.test}`, value });
    }
  }
  return fallback === undefined
    ? undefined
    : conditionalChain(guards, fallback);
}

/**
 * Read a block body into one expression.
 *
 * Leading single-declaration consts become substitutions (a `<template>` has no
 * statement scope, so they are spliced into the markup), a run of
 * `if (…) return <jsx>;` guards folds into a conditional chain, and the final
 * `return` supplies the last arm.
 */
function readBlockBody(
  inner: string,
): { body: string; substitutions: Map<string, string> } | undefined {
  const substitutions = new Map<string, string>();
  // A `switch` is scanned whole: its `case` clause braces are block braces, so
  // the statement splitter would chop it into fragments.
  const switched = readSwitchExpression(inner.trim());
  if (switched !== undefined) {
    return { body: switched, substitutions };
  }
  const guards: { condition: string; value: string }[] = [];
  for (const raw of splitStatements(inner)) {
    const statement = raw.trim().replace(/;$/, "").trim();
    if (statement.length === 0) {
      continue;
    }
    if (/^return\s/.test(statement)) {
      const value = statement.slice("return".length).trim();
      if (value.length === 0) {
        return undefined;
      }
      return { body: conditionalChain(guards, value), substitutions };
    }
    const guard = readGuardReturn(statement);
    if (guard !== undefined) {
      guards.push(guard);
      continue;
    }
    const switched = readSwitchExpression(statement);
    if (switched !== undefined) {
      return { body: conditionalChain(guards, switched), substitutions };
    }
    const declaration = readVariableStatement(`${statement};`);
    if (
      declaration === undefined ||
      !/^[A-Za-z_$][\w$]*$/.test(declaration.binding.trim())
    ) {
      return undefined;
    }
    substitutions.set(declaration.binding.trim(), declaration.initializer);
  }
  return undefined;
}

/**
 * Read `(a, b = 1): T => <body>` or `function name(a): T { … }` into parameters,
 * one body expression, and any consts the block body declared.
 */
export function readHelperFunction(text: string):
  | {
      parameters: string[];
      defaults: (string | undefined)[];
      body: string;
      substitutions: Map<string, string>;
      rawBody: string;
    }
  | undefined {
  const trimmed = unwrapParentheses(text.trim());
  const declared = /^(?:export\s+)?function\b/.test(trimmed);
  const arrow = declared ? -1 : indexOfTopLevel(trimmed, "=>");
  if (!declared && arrow === -1) {
    return undefined;
  }
  const open = declared ? trimmed.indexOf("(") : -1;
  const head = declared
    ? open === -1
      ? ""
      : trimmed.slice(open, matchBracket(trimmed, open) + 1)
    : trimmed.slice(0, arrow).trim();
  const list = readParameterList(head);
  if (list === undefined) {
    return undefined;
  }

  let body: string;
  if (declared) {
    const brace = trimmed.indexOf("{", matchBracket(trimmed, open));
    if (brace === -1 || matchBracket(trimmed, brace) !== trimmed.length - 1) {
      return undefined;
    }
    body = trimmed.slice(brace, matchBracket(trimmed, brace) + 1);
  } else {
    body = trimmed.slice(arrow + 2).trim();
  }

  if (body.startsWith("{")) {
    if (matchBracket(body, 0) !== body.length - 1) {
      return undefined;
    }
    const inner = body.slice(1, -1).trim();
    const block = readBlockBody(inner);
    return block === undefined
      ? undefined
      : {
          ...list,
          body: unwrapParentheses(block.body),
          substitutions: block.substitutions,
          rawBody: inner,
        };
  }
  return body.length === 0
    ? undefined
    : {
        ...list,
        body: unwrapParentheses(body),
        substitutions: new Map<string, string>(),
        rawBody: body,
      };
}

/** How often `name` occurs in `text`, and how often it is the callee of a call. */
export function countNameRefs(
  name: string,
  text: string,
): { total: number; callee: number } {
  // Literals and comments are blanked so a name mentioned in a string or a
  // comment never counts as a reference.
  const mask = maskLiterals(text);
  const scanned = [...text]
    .map((character, index) => (mask[index] ? " " : character))
    .join("");
  const pattern = new RegExp(
    String.raw`(?<![\w$.])${escapeName(name)}(?![\w$])`,
    "g",
  );
  let total = 0;
  let callee = 0;
  for (const match of scanned.matchAll(pattern)) {
    total += 1;
    if (/^\s*\(/.test(scanned.slice(match.index + name.length))) {
      callee += 1;
    }
  }
  return { total, callee };
}

/**
 * Whether the body compares a parameter to a literal (`side === 'start'`).
 *
 * Inlining such a helper at a call site with a literal argument would splice a
 * literal-vs-literal comparison into the template, which TypeScript rejects, so
 * the component keeps the type-correct render closure instead.
 */
function comparesParameterToLiteral(
  body: string,
  parameters: readonly string[],
): boolean {
  return parameters.some((parameter) => {
    const name = escapeName(parameter);
    return (
      new RegExp(String.raw`(?<![\w$.])${name}\s*[!=]==?\s*(['"\`]|-?\d)`).test(
        body,
      ) ||
      new RegExp(String.raw`(['"\`]|\d)\s*[!=]==?\s*${name}(?![\w$])`).test(
        body,
      )
    );
  });
}

/**
 * Collect the helpers that are safe to splice into their call sites: a
 * single-expression, markup-producing, non-recursive function referenced only as
 * a call callee across `usages`.
 */
export function collectInlinableHelpers(
  candidates: readonly HelperCandidate[],
  usages: readonly HelperUsage[],
): Map<string, InlinableHelper> {
  const helpers = new Map<string, InlinableHelper>();
  for (const candidate of candidates) {
    if (candidate.renderNodes.length === 0) {
      continue;
    }
    const parts = readHelperFunction(candidate.initializer);
    if (parts === undefined) {
      continue;
    }
    // A body naming its own binding is recursive: inlining would not terminate.
    if (countNameRefs(candidate.name, parts.body).total > 0) {
      continue;
    }
    // The check reads the *authored* body: a `switch` fold introduces
    // comparisons of its own, which are not the hazard this guards against.
    if (comparesParameterToLiteral(parts.rawBody, parts.parameters)) {
      continue;
    }
    let total = 0;
    let callee = 0;
    for (const usage of usages) {
      // The helper's own declaration is not a use of it.
      if (usage.name === candidate.name) {
        continue;
      }
      const refs = countNameRefs(candidate.name, usage.text);
      total += refs.total;
      callee += refs.callee;
    }
    // Callee-only and used at least once.
    if (callee >= 1 && total === callee) {
      helpers.set(candidate.name, {
        parameters: parts.parameters,
        defaults: parts.defaults,
        body: parts.body,
        substitutions: parts.substitutions,
        renderNodes: candidate.renderNodes,
      });
    }
  }
  return helpers;
}

/** Read `fn(a, b)` against the inlinable helpers, binding arguments to parameters. */
export function readHelperCall(
  text: string,
  helpers: ReadonlyMap<string, InlinableHelper>,
): { helper: InlinableHelper; bindings: Map<string, string> } | undefined {
  if (helpers.size === 0) {
    return undefined;
  }
  const open = text.indexOf("(");
  if (open <= 0) {
    return undefined;
  }
  const helper = helpers.get(text.slice(0, open).trim());
  if (helper === undefined || matchBracket(text, open) !== text.length - 1) {
    return undefined;
  }
  const inner = text.slice(open + 1, -1).trim();
  const args =
    inner.length === 0
      ? []
      : splitTopLevel(inner, ",").map((argument) => argument.trim());
  const bindings = new Map<string, string>(helper.substitutions);
  helper.parameters.forEach((parameter, index) => {
    const value = args[index] ?? helper.defaults[index];
    // An argument spelled exactly like its parameter needs no substitution, and
    // recording it would only wrap the identifier in redundant parentheses.
    if (value !== undefined && value !== parameter) {
      bindings.set(parameter, value);
    }
  });
  return { helper, bindings };
}
