/**
 * Imperative-to-declarative statement lifting.
 *
 * Vue's `<template>` has no statement scope, so a component body that *builds* a
 * value step by step — a `let` refined by `if`s, an object filled in
 * conditionally, an array grown by `push` — cannot be templated as written. Each
 * of these shapes has an exact declarative equivalent, and folding it into a
 * single initializer before the reactive-declaration pass runs is what lets that
 * pass lift it to a `computed` (or, for markup, to a native `v-for`) instead of
 * rejecting the mutation steps and falling back to a render closure.
 *
 * The lifts are conservative by construction: each one only fires when the
 * declaration is immediately followed by a contiguous run of build steps it
 * fully understands, and when no later statement mutates the binding again — so
 * the folded initializer is always the complete value.
 */
import { EMPTY_SPAN, sourceBacked } from "@mission-platform/forge-plugin-api";

import { readVariableStatement } from "./statements.js";
import {
  indexOfTopLevel,
  maskLiterals,
  matchBracket,
  splitTopLevel,
} from "./text.js";

import type {
  GenericRenderNode,
  GenericStatement,
} from "@mission-platform/forge-plugin-api";

/**
 * The fresh accumulator a lifted `let` build is folded onto. It is deliberately
 * not the original name: the rewriter must not mistake the internal binding for
 * the reactive declaration the lift produces.
 */
const LIFTED_ACCUMULATOR = "__lifted";

/** Build a synthesized statement carrying the render nodes of the folded run. */
function syntheticStatement(
  text: string,
  renderNodes: readonly GenericRenderNode[],
): GenericStatement {
  return {
    kind: "statement",
    statementKind: "variable",
    exported: false,
    text: sourceBacked(text, "statement"),
    renderNodes,
    span: EMPTY_SPAN,
  };
}

/** Every render node recorded across a run of statements. */
function renderNodesOf(
  statements: readonly GenericStatement[],
): readonly GenericRenderNode[] {
  return statements.flatMap((statement) => statement.renderNodes);
}

/** Rename every standalone occurrence of `from` to `to`. */
function renameIdentifier(text: string, from: string, to: string): string {
  const mask = maskLiterals(text);
  const pattern = new RegExp(`\\b${from}\\b`, "g");
  let result = "";
  let cursor = 0;
  for (
    let match = pattern.exec(text);
    match !== null;
    match = pattern.exec(text)
  ) {
    const index = match.index;
    const before = text.slice(0, index).trimEnd();
    if (mask[index] === true || before.endsWith(".") || before.endsWith("?.")) {
      continue;
    }
    result += text.slice(cursor, index) + to;
    cursor = index + from.length;
  }
  return result + text.slice(cursor);
}

/**
 * A statement's text with its recorded markup blanked out. JSX attribute syntax
 * (`style={style}`) is indistinguishable from an assignment to a token scanner,
 * so a statement that merely *renders* a binding would otherwise read as one
 * that reassigns it — and veto every fold of that binding.
 */
function textOutsideMarkup(statement: GenericStatement): string {
  let text = statement.text.text;
  for (const node of statement.renderNodes) {
    const markup = node.expression?.text;
    if (markup !== undefined && markup.length > 0) {
      text = text.replace(markup, "");
    }
  }
  return text;
}

/** The head of an assignment: a binding, optional member path, optional compound operator. */
const ASSIGNMENT =
  /([A-Za-z_$][\w$]*)((?:\.[\w$]+)*)\s*(?:[+\-*/]|\|\||\?\?|&&)?=(?![=>])/g;

/** Every identifier this statement assigns to at the top of an assignment. */
function assignedNames(text: string): readonly string[] {
  const mask = maskLiterals(text);
  const names: string[] = [];
  ASSIGNMENT.lastIndex = 0;
  for (
    let match = ASSIGNMENT.exec(text);
    match !== null;
    match = ASSIGNMENT.exec(text)
  ) {
    if (mask[match.index] !== true && text[match.index - 1] !== ".") {
      names.push(match[1]);
    }
  }
  return names;
}

/**
 * Fold `let <name> = <init>; if (…) <name> = …; …` into
 * `const <name> = (() => { let __lifted = <init>; …; return __lifted; })();`
 *
 * The IIFE is the faithful declarative form of the refinement sequence, and the
 * reactive-declaration pass templates it as a `computed` whose body is exactly
 * the authored control flow.
 */
function liftConditionalLets(
  statements: readonly GenericStatement[],
): readonly GenericStatement[] {
  const result: GenericStatement[] = [];
  for (let index = 0; index < statements.length; index += 1) {
    const statement = statements[index];
    const text = statement.text.text.trim();
    const parts = /^let\s/.test(text) ? readVariableStatement(text) : undefined;
    if (
      parts !== undefined &&
      /^[A-Za-z_$][\w$]*$/.test(parts.binding) &&
      statement.renderNodes.length === 0
    ) {
      const name = parts.binding;
      let cursor = index + 1;
      // Consume the contiguous run of statements that refine `name` and nothing else.
      while (cursor < statements.length) {
        const candidate = textOutsideMarkup(statements[cursor]);
        const targets = assignedNames(candidate);
        if (targets.length === 0 || targets.some((target) => target !== name)) {
          break;
        }
        cursor += 1;
      }
      const consumed = statements.slice(index + 1, cursor);
      const laterMutates = statements
        .slice(cursor)
        .some((rest) => assignedNames(textOutsideMarkup(rest)).includes(name));
      if (consumed.length > 0 && !laterMutates) {
        const type = parts.typeText === undefined ? "" : `: ${parts.typeText}`;
        const steps = consumed
          .map((entry) =>
            renameIdentifier(entry.text.text.trim(), name, LIFTED_ACCUMULATOR),
          )
          .join(" ");
        const folded =
          `const ${name} = (() => { let ${LIFTED_ACCUMULATOR}${type} = ${parts.initializer}; ` +
          `${steps} return ${LIFTED_ACCUMULATOR}; })();`;
        result.push(syntheticStatement(folded, renderNodesOf(consumed)));
        index = cursor - 1;
        continue;
      }
    }
    result.push(statement);
  }
  return result;
}

/** A conditional single-property assignment folded into an object spread. */
interface StyleEntry {
  readonly condition: string;
  readonly key: string;
  readonly value: string;
}

/** Read `if (<cond>) <object>.<key> = <value>;` (block body allowed, no `else`). */
function readConditionalAssignment(
  text: string,
  objectName: string,
): StyleEntry | undefined {
  const trimmed = text.trim();
  if (!trimmed.startsWith("if")) {
    return undefined;
  }
  const open = trimmed.indexOf("(");
  if (open === -1) {
    return undefined;
  }
  const close = matchBracket(trimmed, open);
  if (close === -1) {
    return undefined;
  }
  const condition = trimmed.slice(open + 1, close).trim();
  let body = trimmed.slice(close + 1).trim();
  if (body.startsWith("{")) {
    const end = matchBracket(body, 0);
    if (end === -1 || body.slice(end + 1).trim() !== "") {
      return undefined;
    }
    body = body.slice(1, end).trim();
  } else if (/\belse\b/.test(body)) {
    return undefined;
  }
  const assignment = new RegExp(
    `^${objectName}(?:\\.([A-Za-z_$][\\w$]*)|\\[(['"])([^'"]+)\\2\\])\\s*=\\s*([\\s\\S]+?);?$`,
  ).exec(body);
  if (assignment === null) {
    return undefined;
  }
  return {
    condition,
    key: assignment[1] ?? assignment[3],
    value: assignment[4].trim(),
  };
}

/**
 * Fold `const style = {}; if (c) style.k = v; …` into
 * `const style = { ...(c ? { k: v } : {}), … };` so the value becomes a single
 * reactive `computed` the template can bind as `:style`.
 */
function liftStyleObjects(
  statements: readonly GenericStatement[],
): readonly GenericStatement[] {
  const result: GenericStatement[] = [];
  for (let index = 0; index < statements.length; index += 1) {
    const statement = statements[index];
    const parts = readVariableStatement(statement.text.text);
    if (
      parts !== undefined &&
      /^[A-Za-z_$][\w$]*$/.test(parts.binding) &&
      /^\{\s*\}$/.test(parts.initializer) &&
      /^const\s/.test(statement.text.text.trim())
    ) {
      const name = parts.binding;
      const entries: StyleEntry[] = [];
      let cursor = index + 1;
      for (; cursor < statements.length; cursor += 1) {
        const entry = readConditionalAssignment(
          statements[cursor].text.text,
          name,
        );
        if (entry === undefined) {
          break;
        }
        entries.push(entry);
      }
      const laterMutates = statements
        .slice(cursor)
        .some((rest) => assignedNames(textOutsideMarkup(rest)).includes(name));
      if (entries.length > 0 && !laterMutates) {
        const spreads = entries
          .map(
            (entry) =>
              `  ...(${entry.condition} ? { ${entry.key}: ${entry.value} } : {}),`,
          )
          .join("\n");
        result.push(
          syntheticStatement(`const ${name} = {\n${spreads}\n};`, []),
        );
        index = cursor - 1;
        continue;
      }
    }
    result.push(statement);
  }
  return result;
}

/** One folded contribution to an imperative array build. */
interface ArrayStep {
  /** The spread-ready expression contributing zero or more elements. */
  readonly spread?: string;
  /** A single element expression. */
  readonly element?: string;
}

/** Array methods that mutate the receiver, so a later call invalidates a fold. */
const MUTATORS = "push|pop|shift|unshift|splice|sort|reverse|fill|copyWithin";

/** Whether a statement mutates the array named `name` in place. */
function mutatesArray(text: string, name: string): boolean {
  return new RegExp(`\\b${name}\\s*\\.\\s*(?:${MUTATORS})\\s*\\(`).test(text);
}

/** Read `<name>.push(<arguments>);` and return its argument expressions. */
function readPush(text: string, name: string): readonly string[] | undefined {
  const trimmed = text.trim().replace(/;$/, "").trim();
  if (!trimmed.startsWith(`${name}.push(`)) {
    return undefined;
  }
  const open = trimmed.indexOf("(");
  const close = matchBracket(trimmed, open);
  if (close === -1 || trimmed.slice(close + 1).trim() !== "") {
    return undefined;
  }
  return splitTopLevel(trimmed.slice(open + 1, close), ",")
    .map((argument) => argument.trim())
    .filter((argument) => argument.length > 0);
}

/** Read one build step contributing to the array named `name`. */
function readArrayStep(
  statement: GenericStatement,
  name: string,
): readonly ArrayStep[] | undefined {
  const text = statement.text.text.trim();
  const pushed = readPush(text, name);
  if (pushed !== undefined) {
    return pushed.map((argument) => ({ element: argument }));
  }
  // `if (<cond>) <name>.push(<x>);`
  if (text.startsWith("if")) {
    const open = text.indexOf("(");
    const close = open === -1 ? -1 : matchBracket(text, open);
    if (close === -1) {
      return undefined;
    }
    const condition = text.slice(open + 1, close).trim();
    let body = text.slice(close + 1).trim();
    if (body.startsWith("{")) {
      const end = matchBracket(body, 0);
      if (end === -1 || body.slice(end + 1).trim() !== "") {
        return undefined;
      }
      body = body.slice(1, end).trim();
    } else if (/\belse\b/.test(body)) {
      return undefined;
    }
    const inner = readPush(body, name);
    return inner === undefined
      ? undefined
      : [{ spread: `(${condition} ? [${inner.join(", ")}] : [])` }];
  }
  // `for (const <item> of <source>) <name>.push(<expression>);`
  if (text.startsWith("for")) {
    const open = text.indexOf("(");
    const close = open === -1 ? -1 : matchBracket(text, open);
    if (close === -1) {
      return undefined;
    }
    const header = text.slice(open + 1, close);
    const of = indexOfTopLevel(header, " of ");
    if (of === -1) {
      return undefined;
    }
    const item = header
      .slice(0, of)
      .replace(/^(?:const|let|var)\s+/, "")
      .trim();
    const source = header.slice(of + 4).trim();
    if (!/^[A-Za-z_$][\w$]*$/.test(item)) {
      return undefined;
    }
    let body = text.slice(close + 1).trim();
    if (body.startsWith("{")) {
      const end = matchBracket(body, 0);
      if (end === -1 || body.slice(end + 1).trim() !== "") {
        return undefined;
      }
      body = body.slice(1, end).trim();
    }
    const inner = readPush(body, name);
    if (inner === undefined || inner.length !== 1) {
      return undefined;
    }
    return [{ spread: `${source}.map((${item}) => (${inner[0]}))` }];
  }
  return undefined;
}

/**
 * Fold `const rows = []; for (…) rows.push(<Child/>); …` into a single
 * declarative initializer. A lone `for`-of push over an empty seed folds to the
 * bare projection `<source>.map((item) => (<Child/>))` — the exact shape the
 * template path turns into a native `v-for` — while any richer build folds to an
 * array literal of spreads.
 */
function liftImperativeArrayBuilds(
  statements: readonly GenericStatement[],
): readonly GenericStatement[] {
  const result: GenericStatement[] = [];
  for (let index = 0; index < statements.length; index += 1) {
    const statement = statements[index];
    const parts = readVariableStatement(statement.text.text);
    if (parts !== undefined && /^[A-Za-z_$][\w$]*$/.test(parts.binding)) {
      const name = parts.binding;
      const steps: ArrayStep[] = [];
      let cursor = index + 1;
      for (; cursor < statements.length; cursor += 1) {
        const step = readArrayStep(statements[cursor], name);
        if (step === undefined) {
          break;
        }
        steps.push(...step);
      }
      const laterMutates = statements
        .slice(cursor)
        .some(
          (rest) =>
            mutatesArray(rest.text.text, name) ||
            assignedNames(textOutsideMarkup(rest)).includes(name),
        );
      if (steps.length > 0 && !laterMutates) {
        const consumed = statements.slice(index + 1, cursor);
        const seedIsEmpty = /^\[\s*\]$/.test(parts.initializer);
        const annotation =
          parts.typeText === undefined ? "" : `: ${parts.typeText}`;
        const single =
          steps.length === 1 && steps[0].spread !== undefined && seedIsEmpty;
        const initializer = single
          ? (steps[0].spread as string)
          : [
              "[",
              ...(seedIsEmpty ? [] : [`  ...${parts.initializer},`]),
              ...steps.map((step) =>
                step.spread === undefined
                  ? `  ${step.element as string},`
                  : `  ...${step.spread},`,
              ),
              "]",
            ].join("\n");
        result.push(
          // The seed's own JSX roots travel with the fold: a `.map()` seed keeps
          // the element its projection returns.
          syntheticStatement(
            `const ${name}${annotation} = ${initializer};`,
            renderNodesOf([statement, ...consumed]),
          ),
        );
        index = cursor - 1;
        continue;
      }
    }
    result.push(statement);
  }
  return result;
}

/**
 * Fold every imperative build in a component body into its declarative
 * equivalent. Applied before the body is classified, so the reactive pass only
 * ever sees single-initializer declarations.
 */
export function liftImperativeStatements(
  statements: readonly GenericStatement[],
): readonly GenericStatement[] {
  return liftConditionalLets(
    liftStyleObjects(liftImperativeArrayBuilds(statements)),
  );
}
