/**
 * Expression-level lowering for the React target.
 *
 * Everything the neutral dialect expresses *inside* an expression — the
 * `h(Slot, …)` call form of the slot marker, `hasSlot('x')`, `i18next.t(…)`,
 * the props object of an explicit `h(…)` call and neutral type references — is
 * rewritten here, on the exact source text the generic AST carries. JSX itself
 * is handled by the render-node printer (`./jsx.js`), which substitutes each
 * lowered subtree into the surrounding text *before* these rewrites run; every
 * rewrite below is idempotent, so re-visiting already-lowered text is safe.
 */
import { REACT_TYPE_ALIASES } from "@mission-platform/forge-plugin-api/compiler/ast.js";

import { aliasAttributeName } from "./aliases.js";
import {
  isIdentifierName,
  memberAccess,
  quoteString,
  readStringLiteral,
  rewriteCalls,
  splitTopLevelArguments,
} from "./source-text.js";

import type { ReactLoweringContext } from "./context.js";

/** The neutral compile-time slot marker's tag / callee name. */
export const SLOT_TAG = "Slot";

/** The neutral compile-time dynamic-component marker's tag name. */
export const DYNAMIC_TAG = "Dynamic";

/** The neutral render factory both dialects share. */
const FACTORY_NAME = "h";

/** `<props>.<name>` — the React read of a named slot (the default slot is `children`). */
export function slotAccess(
  context: ReactLoweringContext,
  name: string | undefined,
): string {
  return memberAccess(context.propertiesParameterName, name ?? "children");
}

/**
 * Safely invoke or forward a slot when a scope object is supplied:
 * `typeof <access> === "function" ? <access>(scope) : <access>` — handling both
 * render-prop functions and plain React nodes.
 */
export function scopedSlotRead(
  access: string,
  scope: string | undefined,
): string {
  return scope === undefined
    ? access
    : `typeof ${access} === "function" ? ${access}(${scope}) : ${access}`;
}

/** Append `?? <fallback>` to a slot read, parenthesising the lower-precedence scoped form. */
export function withSlotFallback(
  read: string,
  scoped: boolean,
  fallback: string | undefined,
): string {
  if (fallback === undefined) {
    return read;
  }
  return `${scoped ? `(${read})` : read} ?? ${fallback}`;
}

/** An object-literal property entry, quoting keys that are not bare identifiers. */
export function propertyEntry(name: string, value: string): string {
  return `${isIdentifierName(name) ? name : quoteString(name)}: ${value}`;
}

/** `{ a: 1, b: 2 }`, or `undefined` when there is nothing to pass. */
export function objectLiteral(entries: readonly string[]): string | undefined {
  return entries.length === 0 ? undefined : `{ ${entries.join(", ")} }`;
}

/** Whether the text is (syntactically) an object literal. */
function isObjectLiteral(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.startsWith("{") && trimmed.endsWith("}");
}

/** Rename the keys of an `h(…)` props object literal to their React aliases. */
export function aliasObjectLiteralKeys(text: string): string {
  const trimmed = text.trim();
  const inner = trimmed.slice(1, -1);
  const entries = splitTopLevelArguments(inner);
  if (entries.length === 0) {
    return trimmed;
  }
  const aliased = entries.map((entry) => {
    const match =
      /^(?<quote>['"]?)(?<key>[A-Za-z_$][\w$-]*)\k<quote>\s*:(?<rest>[\s\S]*)$/.exec(
        entry,
      );
    const key = match?.groups?.key;
    const rest = match?.groups?.rest;
    if (key === undefined || rest === undefined) {
      return entry;
    }
    const alias = aliasAttributeName(key);
    return propertyEntry(alias, rest.trim());
  });
  return `{ ${aliased.join(", ")} }`;
}

/** `i18next.t(…)` → `t(…)` (the `useI18n()` binding the emitter injects). */
function rewriteI18nextCalls(text: string): string {
  return text.replaceAll(/\bi18next\s*\.\s*t\s*\(/g, "t(");
}

/**
 * `hasSlot('x')` → `(<props>.x != null)` — React's native slot-presence check.
 * The result is parenthesised so it composes with any surrounding operator.
 */
function rewriteHasSlotCalls(
  text: string,
  context: ReactLoweringContext,
): string {
  return rewriteCalls(text, "hasSlot", (argumentList) => {
    const name =
      argumentList[0] === undefined
        ? undefined
        : readStringLiteral(argumentList[0]);
    return `(${slotAccess(context, name)} != null)`;
  });
}

/** Read the slot name and remaining scope entries from an `h(Slot, { … })` props argument. */
function readSlotCallProperties(text: string | undefined): {
  name?: string;
  scope?: string;
} {
  if (text === undefined || !isObjectLiteral(text)) {
    return {};
  }
  const entries = splitTopLevelArguments(text.trim().slice(1, -1));
  let name: string | undefined;
  const scope: string[] = [];
  for (const entry of entries) {
    const match =
      /^(?<quote>['"]?)(?<key>[A-Za-z_$][\w$-]*)\k<quote>\s*:(?<rest>[\s\S]*)$/.exec(
        entry,
      );
    const key = match?.groups?.key;
    const rest = match?.groups?.rest;
    if (key === undefined || rest === undefined) {
      scope.push(entry);
      continue;
    }
    if (key === "name") {
      name = readStringLiteral(rest);
      continue;
    }
    scope.push(propertyEntry(key, rest.trim()));
  }
  return { name, scope: objectLiteral(scope) };
}

/**
 * The `h(…)` call rewrites: the `h(Slot, { name: 'x' }, …fallback)` marker form
 * collapses to the same slot read as `<Slot name="x" />`, and every other
 * `h(tag, { … })` gets its props keys aliased to React's vocabulary.
 */
function rewriteFactoryCalls(
  text: string,
  context: ReactLoweringContext,
): string {
  return rewriteCalls(text, FACTORY_NAME, (argumentList) => {
    if (argumentList[0] === SLOT_TAG && context.hasSlots) {
      const { name, scope } = readSlotCallProperties(argumentList[1]);
      const fallbackArguments = argumentList.slice(2);
      const fallback =
        fallbackArguments.length === 0
          ? undefined
          : fallbackArguments.length === 1
            ? fallbackArguments[0]
            : `[${fallbackArguments.join(", ")}]`;
      const read = scopedSlotRead(slotAccess(context, name), scope);
      return withSlotFallback(read, scope !== undefined, fallback);
    }
    const properties = argumentList[1];
    if (properties === undefined || !isObjectLiteral(properties)) {
      return undefined;
    }
    return `${FACTORY_NAME}(${[argumentList[0] ?? "undefined", aliasObjectLiteralKeys(properties), ...argumentList.slice(2)].join(", ")})`;
  });
}

/**
 * Rename a neutral type that has a first-class React equivalent (`MpChild` →
 * `ReactNode`) at every reference, so the emitted annotations read idiomatically
 * for React — `buildReactImports` imports the React name from `react`.
 */
function renameNeutralTypes(text: string): string {
  let result = text;
  for (const [neutralName, reactName] of Object.entries(REACT_TYPE_ALIASES)) {
    result = result.replaceAll(
      new RegExp(String.raw`\b${neutralName}\b`, "g"),
      reactName,
    );
  }
  return result;
}

/**
 * Lower a fragment of neutral source text (an expression, or a whole statement)
 * to React. JSX must already have been substituted by the render-node printer.
 */
export function lowerExpressionText(
  text: string,
  context: ReactLoweringContext,
): string {
  let result = rewriteI18nextCalls(text);
  if (context.hasSlots) {
    result = rewriteHasSlotCalls(result, context);
  }
  result = rewriteFactoryCalls(result, context);
  return renameNeutralTypes(result);
}
