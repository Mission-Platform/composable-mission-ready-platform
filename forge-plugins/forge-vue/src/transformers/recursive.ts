/**
 * Recursive render-helper extraction.
 *
 * A neutral component may render a tree with a **self-recursive** helper:
 *
 * ```tsx
 * const renderItems = (entries: MenusNode[], parentPath: string, nested: boolean): MpElement[] =>
 *   entries.map((item, index) => {
 *     const path = …;
 *     return <li>…{renderItems(item.children as MenusNode[], path, true)}…</li>;
 *   });
 * ```
 *
 * A Vue `<template>` has no recursion of its own, so the helper is extracted
 * into an **auxiliary single-file component**: the `.map()` element becomes that
 * component's root, the per-item data and every captured handler become its
 * props, and the self-call becomes a `v-for` of the component referencing
 * itself. The parent then renders one `v-for` of the auxiliary component.
 *
 * Everything here is read off the recorded text of the derived const and the
 * render node the IR already carries — nothing is re-parsed.
 */
import { splitStatements } from "./statements.js";
import {
  indexOfTopLevel,
  matchBracket,
  maskLiterals,
  splitTopLevel,
  unwrapParentheses,
} from "./text.js";

import type { DerivedConst } from "./scope.js";
import type { GenericRenderNode } from "@mission-platform/forge-plugin-api";

/** A typed name — a helper parameter or a captured handler lifted to a prop. */
export interface RecursiveProp {
  /** The prop name. */
  readonly name: string;
  /** The declared type text. */
  readonly typeText: string;
}

/** The recognised self-recursive, array-returning render helper. */
export interface RecursiveHelper {
  /** The helper const's name (`renderItems`). */
  readonly helperName: string;
  /** The auxiliary component's tag (`ForgeMenusItem`). */
  readonly componentName: string;
  /** The auxiliary module's flat base name (`forge-menus-item`). */
  readonly base: string;
  /** The `.map()` callback's item parameter (`item`). */
  readonly itemParam: string;
  /** The `.map()` callback's index parameter, when it declares one. */
  readonly indexParam?: string;
  /** The helper's parameters after the entries array (`parentPath`, `nested`). */
  readonly restParams: readonly RecursiveProp[];
  /** Captured, non-markup function consts lifted to props (`isPathOpen`). */
  readonly capturedHandlers: readonly RecursiveProp[];
  /** The element the callback returns — the auxiliary component's root. */
  readonly node: GenericRenderNode;
  /** The callback's leading consts, inlined into the auxiliary markup. */
  readonly substitutions: ReadonlyMap<string, string>;
  /** Every prop the auxiliary component declares, in order. */
  readonly props: readonly RecursiveProp[];
}

/** `ForgeMenus` → `forge-menus`. */
function pascalToKebab(name: string): string {
  return name
    .replace(/([a-z\d])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

/** Whether `name` occurs as a whole identifier token outside literals. */
function referencesName(text: string, name: string): boolean {
  const mask = maskLiterals(text);
  for (const match of text.matchAll(new RegExp(String.raw`\b${name}\b`, "g"))) {
    if (!mask[match.index]) {
      return true;
    }
  }
  return false;
}

/** Split a `name: Type` pair, or `undefined` when it is not annotated. */
function typedParameter(text: string): RecursiveProp | undefined {
  const colon = indexOfTopLevel(text, ":");
  if (colon === -1) {
    return undefined;
  }
  const name = text.slice(0, colon).trim();
  const typeText = text.slice(colon + 1).trim();
  return /^[A-Za-z_$][\w$]*$/.test(name) && typeText.length > 0
    ? { name, typeText }
    : undefined;
}

/** The parameter list and body of an arrow function's recorded text. */
interface ArrowParts {
  readonly parameters: string[];
  readonly returnType?: string;
  readonly body: string;
}

/** Read `(a: A, b: B): R => body` from its recorded text. */
function readArrow(text: string): ArrowParts | undefined {
  const trimmed = unwrapParentheses(text);
  if (!trimmed.startsWith("(")) {
    return undefined;
  }
  const close = matchBracket(trimmed, 0);
  // The scan starts *after* the parameter list: beginning on its `)` would open
  // at depth -1 and the arrow of a nested callback would match first.
  const arrow = close === -1 ? -1 : indexOfTopLevel(trimmed, "=>", close + 1);
  if (arrow === -1) {
    return undefined;
  }
  const annotation = trimmed.slice(close + 1, arrow).trim();
  return {
    parameters: splitTopLevel(trimmed.slice(1, close), ",")
      .map((parameter) => parameter.trim())
      .filter((parameter) => parameter.length > 0),
    returnType: annotation.startsWith(":")
      ? annotation.slice(1).trim()
      : undefined,
    body: trimmed.slice(arrow + 2).trim(),
  };
}

/** The function **type** a captured handler exposes (`(path: string) => boolean`). */
function handlerType(initializer: string): string | undefined {
  const arrow = readArrow(initializer);
  if (arrow === undefined || arrow.returnType === undefined) {
    return undefined;
  }
  return arrow.parameters.every(
    (parameter) => typedParameter(parameter) !== undefined,
  )
    ? `(${arrow.parameters.join(", ")}) => ${arrow.returnType}`
    : undefined;
}

/** The `.map((item, index) => …)` call an expression body is, or `undefined`. */
function readMapCall(
  body: string,
  source: string,
): { parameters: string[]; body: string } | undefined {
  const trimmed = unwrapParentheses(body);
  const head = `${source}.map(`;
  if (
    !trimmed.startsWith(head) ||
    matchBracket(trimmed, head.length - 1) !== trimmed.length - 1
  ) {
    return undefined;
  }
  const callback = readArrow(trimmed.slice(head.length, -1).trim());
  return callback === undefined
    ? undefined
    : { parameters: callback.parameters, body: callback.body };
}

/**
 * Drop the leading line and block comments a statement's recorded text carries.
 * The statement splitter masks comments rather than removing them, so a
 * documented declaration arrives with its comment still attached.
 */
function stripLeadingComments(text: string): string {
  let rest = text.trimStart();
  while (rest.startsWith("//") || rest.startsWith("/*")) {
    if (rest.startsWith("//")) {
      const newline = rest.indexOf("\n");
      if (newline === -1) {
        return "";
      }
      rest = rest.slice(newline + 1).trimStart();
      continue;
    }
    const close = rest.indexOf("*/");
    if (close === -1) {
      return "";
    }
    rest = rest.slice(close + 2).trimStart();
  }
  return rest;
}

/** A single-declaration `const` split into its name and initializer text. */
interface ConstDeclaration {
  readonly name: string;
  readonly initializer: string;
}

/**
 * Read `const name[: Type] = initializer` from a statement's text. The type
 * annotation is skipped structurally rather than by pattern, so a generic,
 * a union or a function type never confuses the assignment's position.
 */
function readConstDeclaration(text: string): ConstDeclaration | undefined {
  const match = /^const\s+([A-Za-z_$][\w$]*)\s*(?=[:=])/.exec(text);
  if (match === null) {
    return undefined;
  }
  let cursor = match[0].length;
  if (text[cursor] === ":") {
    // A function type's `=>` must not be mistaken for the assignment.
    do {
      const next = indexOfTopLevel(text, "=", cursor + 1);
      if (next === -1) {
        return undefined;
      }
      cursor = text[next + 1] === ">" ? next + 1 : next;
    } while (text[cursor] === ">");
  }
  if (text[cursor] !== "=") {
    return undefined;
  }
  const initializer = text.slice(cursor + 1).trim();
  return initializer.length > 0
    ? { name: match[1] ?? "", initializer }
    : undefined;
}

/**
 * Split a `.map()` callback's block body into its leading single-declaration
 * consts (inlined into the auxiliary markup) and the expression it returns.
 */
function readCallbackBlock(
  body: string,
): { substitutions: Map<string, string>; returned: string } | undefined {
  const trimmed = body.trim();
  if (!trimmed.startsWith("{")) {
    return { substitutions: new Map(), returned: trimmed };
  }
  if (matchBracket(trimmed, 0) !== trimmed.length - 1) {
    return undefined;
  }
  const substitutions = new Map<string, string>();
  let returned: string | undefined;
  for (const statement of splitStatements(trimmed.slice(1, -1))) {
    const text = stripLeadingComments(statement).replace(/;$/, "").trim();
    if (text.length === 0) {
      continue;
    }
    if (text.startsWith("return")) {
      returned = text.slice("return".length).trim();
      continue;
    }
    const declaration = readConstDeclaration(text);
    if (declaration === undefined || returned !== undefined) {
      return undefined;
    }
    substitutions.set(declaration.name, `(${declaration.initializer})`);
  }
  return returned === undefined ? undefined : { substitutions, returned };
}

/**
 * Detect the extractable recursive helper among a component's derived consts,
 * or `undefined` when no declaration matches the shape exactly.
 */
export function detectRecursiveHelper(
  derived: readonly DerivedConst[],
  componentName: string,
): RecursiveHelper | undefined {
  const handlers = new Map(
    derived
      .filter((entry) => entry.isHandler)
      .map((entry) => [entry.name, entry]),
  );
  for (const entry of derived) {
    if (!entry.isHandler || entry.renderNodes.length === 0) {
      continue;
    }
    const helper = readArrow(entry.initializer);
    const entriesParam =
      helper === undefined
        ? undefined
        : typedParameter(helper.parameters[0] ?? "");
    if (
      helper === undefined ||
      entriesParam === undefined ||
      !entriesParam.typeText.endsWith("[]")
    ) {
      continue;
    }
    const map = readMapCall(helper.body, entriesParam.name);
    if (map === undefined || !referencesName(map.body, entry.name)) {
      continue;
    }
    const block = readCallbackBlock(map.body);
    const [itemParam, indexParam] = map.parameters.map((parameter) =>
      parameter.trim(),
    );
    if (
      block === undefined ||
      itemParam === undefined ||
      !/^[A-Za-z_$][\w$]*$/.test(itemParam)
    ) {
      continue;
    }
    const node = entry.renderNodes.find(
      (candidate) =>
        unwrapParentheses(candidate.expression?.text ?? "") ===
        unwrapParentheses(block.returned),
    );
    if (node === undefined) {
      continue;
    }
    const restParams = helper.parameters
      .slice(1)
      .map((parameter) => typedParameter(parameter));
    if (restParams.includes(undefined)) {
      continue;
    }
    // A captured, non-markup function const becomes a typed prop; one without a
    // full signature cannot, so the whole extraction is abandoned.
    const capturedHandlers: RecursiveProp[] = [];
    let bail = false;
    for (const [name, captured] of handlers) {
      if (
        name === entry.name ||
        captured.renderNodes.length > 0 ||
        !referencesName(map.body, name)
      ) {
        continue;
      }
      const typeText = handlerType(captured.initializer);
      if (typeText === undefined) {
        bail = true;
        break;
      }
      capturedHandlers.push({ name, typeText });
    }
    if (bail) {
      continue;
    }
    const rest = restParams.filter(
      (parameter): parameter is RecursiveProp => parameter !== undefined,
    );
    const base = `${pascalToKebab(componentName)}-item`;
    const props: RecursiveProp[] = [
      { name: "item", typeText: entriesParam.typeText.slice(0, -2) },
      ...(indexParam === undefined
        ? []
        : [{ name: indexParam, typeText: "number" }]),
      ...rest,
      ...capturedHandlers,
    ];
    return {
      helperName: entry.name,
      componentName: `${componentName}Item`,
      base,
      itemParam,
      indexParam,
      restParams: rest,
      capturedHandlers,
      node,
      substitutions: block.substitutions,
      props,
    };
  }
  return undefined;
}
