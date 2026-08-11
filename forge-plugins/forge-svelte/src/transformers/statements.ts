/**
 * Statement-shape analysis for the Svelte target.
 *
 * A `GenericStatement` exposes its exact source text and the JSX roots nested
 * inside it, so the component emitter recognises the statement forms it must
 * lower by reading that text rather than by matching TypeScript node kinds.
 * Everything here is pure: it answers "what shape is this statement?" and hands
 * back the sub-texts (binding, initializer, condition, returned value) the
 * emitter re-prints through the scoping/template transformers.
 */

import {
  blockStatements,
  indexOfTopLevel,
  isBalanced,
  isIdentifierText,
  scanSource,
  splitList,
  stripParentheses,
  stripSemicolon,
} from "../runtime/source-text.js";

/** The parts of a single-declarator variable statement. */
export interface VariableStatement {
  /** The declared binding text: `count`, `[count, setCount]` or `{ a, b = 1 }`. */
  readonly binding: string;
  /** The declared type annotation, when the source carries one. */
  readonly type?: string;
  /** The initializer expression text, when the declarator has one. */
  readonly initializer?: string;
}

/** The parts of an `if (…) … [else …]` statement. */
export interface IfStatement {
  readonly condition: string;
  readonly thenBranch: string;
  readonly elseBranch?: string;
}

/** A destructuring entry of `const { a = 1, b: c } = properties;`. */
export interface DestructuredProperty {
  readonly propName: string;
  readonly localName: string;
  readonly defaultValue?: string;
}

/** A `<target>.push(<argument>, …);` statement. */
export interface PushStatement {
  readonly target: string;
  readonly values: readonly string[];
}

/** Read a single-declarator `const`/`let`/`var` statement. */
export function readVariableStatement(
  text: string,
  opaqueFragments: readonly string[] = [],
): VariableStatement | undefined {
  const statement = stripSemicolon(text.trim().replace(/^export\s+/, ""));
  const keyword = /^(?:const|let|var)\s+/.exec(statement);
  if (keyword === null) {
    return undefined;
  }
  const rest = statement.slice(keyword[0].length).trim();
  const scan = scanSource(rest, opaqueFragments);
  const equals = indexOfTopLevel(scan, "=");
  const head = (equals === -1 ? rest : rest.slice(0, equals)).trim();
  const initializer = equals === -1 ? undefined : rest.slice(equals + 1).trim();
  const headScan = scanSource(head);
  const colon = indexOfTopLevel(headScan, ":");
  return {
    binding: (colon === -1 ? head : head.slice(0, colon)).trim(),
    type: colon === -1 ? undefined : head.slice(colon + 1).trim(),
    initializer:
      initializer === undefined || initializer.length === 0
        ? undefined
        : initializer,
  };
}

/** The names bound by an array-destructuring binding (`[count, setCount]`). */
export function arrayBindingNames(binding: string): string[] {
  const trimmed = binding.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
    return [];
  }
  return splitList(trimmed.slice(1, -1));
}

/** The entries of an object-destructuring binding (`{ a = 1, b: c }`). */
export function objectBindingEntries(binding: string): DestructuredProperty[] {
  const trimmed = binding.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    return [];
  }
  const entries: DestructuredProperty[] = [];
  for (const member of splitList(trimmed.slice(1, -1))) {
    if (member.startsWith("...")) {
      continue;
    }
    const scan = scanSource(member);
    const equals = indexOfTopLevel(scan, "=");
    const head = (equals === -1 ? member : member.slice(0, equals)).trim();
    const defaultValue =
      equals === -1 ? undefined : member.slice(equals + 1).trim();
    const colon = indexOfTopLevel(scanSource(head), ":");
    const propName = (colon === -1 ? head : head.slice(0, colon)).trim();
    const localName = (colon === -1 ? head : head.slice(colon + 1)).trim();
    if (!isIdentifierText(propName) || !isIdentifierText(localName)) {
      continue;
    }
    entries.push({ propName, localName, defaultValue });
  }
  return entries;
}

/**
 * Whether a `const <localName> = …;` initializer merely re-reads the local's
 * **own** prop (`properties.<localName>`, optionally `??`/`||`-defaulted) — the
 * shape a normalising statement like `const children = properties.children;` or
 * `const variant = properties.variant ?? 'neutral';` takes. Printing either
 * verbatim after prop-access scoping would redeclare `<localName>` (the
 * `$props()` destructure already binds it), so the caller folds the default (if
 * any) into that destructure entry and drops the statement instead.
 */
export function readSameNamePropDefault(
  localName: string,
  initializer: string,
  propsParameter: string,
): { propName: string; fallback?: string } | undefined {
  const trimmed = stripParentheses(initializer);
  const read = `${propsParameter}.${localName}`;
  if (trimmed === read) {
    return { propName: localName };
  }
  if (!trimmed.startsWith(read)) {
    return undefined;
  }
  const rest = trimmed.slice(read.length).trim();
  const operator = rest.startsWith("??")
    ? "??"
    : rest.startsWith("||")
      ? "||"
      : undefined;
  if (operator === undefined) {
    return undefined;
  }
  const fallback = rest.slice(operator.length).trim();
  return fallback.length > 0 && isBalanced(fallback)
    ? { propName: localName, fallback }
    : undefined;
}

/**
 * Whether a `const <name> = (…) => { … };` initializer is a **wrapper** closing
 * over its own same-named prop — `const onLocaleChange = (value) => {
 * properties.onLocaleChange?.(value); };` — the shape a component takes when it
 * deliberately avoids destructuring an event prop so it can wrap it. Once
 * `properties.onLocaleChange` collapses to the bare prop name this would
 * redeclare the wrapper, so the caller aliases the **prop**'s destructure entry.
 */
export function isSelfShadowingWrapper(
  name: string,
  initializer: string,
  propsParameter: string,
): boolean {
  if (!/^(?:\(|[\w$]+\s*=>|async\b|function\b)/.test(initializer.trim())) {
    return false;
  }
  return new RegExp(`\\b${propsParameter}\\s*\\??\\.\\s*${name}\\b`).test(
    initializer,
  );
}

/**
 * Whether a `const <name> = …;` initializer normalises the component's
 * `children` into a variadic array — the `children === undefined ? [] :
 * Array.isArray(children) ? [...children] : [children]` shape a component takes
 * when it must forward its slot to a hyperscript `h(tag, props, ...childList)`
 * render. Svelte has no such array (`children` is a snippet prop), so the
 * caller registers `<name>` as a `children` alias instead.
 */
export function isChildrenListNormalization(
  initializer: string,
  propsParameter: string,
): boolean {
  const scan = scanSource(initializer);
  if (
    indexOfTopLevel(scan, "?") === -1 ||
    !initializer.includes("Array.isArray")
  ) {
    return false;
  }
  return (
    initializer.includes("children") ||
    initializer.includes(`${propsParameter}.children`)
  );
}

/** Read an `if (…) … [else …]` statement. */
export function readIfStatement(
  text: string,
  opaqueFragments: readonly string[] = [],
): IfStatement | undefined {
  const statement = text.trim();
  if (!/^if\s*\(/.test(statement)) {
    return undefined;
  }
  const open = statement.indexOf("(");
  let depth = 0;
  let close = -1;
  for (let index = open; index < statement.length; index += 1) {
    const char = statement[index];
    if (char === "(") {
      depth += 1;
    } else if (char === ")") {
      depth -= 1;
      if (depth === 0) {
        close = index;
        break;
      }
    }
  }
  if (close === -1) {
    return undefined;
  }
  const body = statement.slice(close + 1).trim();
  const bodyScan = scanSource(body, opaqueFragments);
  const elseIndex = indexOfTopLevel(bodyScan, "else");
  return {
    condition: statement.slice(open + 1, close).trim(),
    thenBranch: (elseIndex === -1 ? body : body.slice(0, elseIndex)).trim(),
    elseBranch: elseIndex === -1 ? undefined : body.slice(elseIndex + 4).trim(),
  };
}

/** The statements of a branch, whether it is a block or a single statement. */
export function branchStatements(
  text: string,
  opaqueFragments: readonly string[] = [],
): string[] {
  const trimmed = text.trim();
  return trimmed.startsWith("{")
    ? blockStatements(trimmed, opaqueFragments)
    : [stripSemicolon(trimmed)].filter((statement) => statement.length > 0);
}

/** Read the expression of a `return …` statement. */
export function readReturnExpression(text: string): string | undefined {
  const statement = stripSemicolon(text.trim());
  if (!/^return\b/.test(statement)) {
    return undefined;
  }
  const expression = statement.slice("return".length).trim();
  return expression.length === 0 ? undefined : stripParentheses(expression);
}

/** Read a `<target>.push(<value>, …)` statement. */
export function readPushStatement(
  text: string,
  opaqueFragments: readonly string[] = [],
): PushStatement | undefined {
  const statement = stripSemicolon(text.trim());
  const match = /^([A-Za-z_$][\w$]*)\s*\.\s*push\s*\(/.exec(statement);
  if (match === null || !statement.endsWith(")")) {
    return undefined;
  }
  const inner = statement.slice(match[0].length, -1);
  if (!isBalanced(inner)) {
    return undefined;
  }
  return { target: match[1]!, values: splitList(inner, opaqueFragments) };
}

/** Every `<propsParameter>.<name>` read in a source text, in first-read order. */
export function readPropNames(
  texts: readonly string[],
  propsParameter: string,
): string[] {
  const names: string[] = [];
  const pattern = new RegExp(
    `\\b${propsParameter}\\s*\\??\\.\\s*([A-Za-z_$][\\w$]*)`,
    "g",
  );
  for (const text of texts) {
    for (const match of text.matchAll(pattern)) {
      const name = match[1]!;
      if (!names.includes(name)) {
        names.push(name);
      }
    }
  }
  return names;
}
