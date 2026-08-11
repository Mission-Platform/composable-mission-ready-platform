/**
 * Expression-level lowering for the SolidJS target.
 *
 * Everything the neutral dialect expresses *inside* an expression — the
 * `h(Slot, …)` call form of the slot marker, `hasSlot('x')`, `i18next.t(…)`, the
 * props object of an explicit `h(…)` call, the neutral element type references
 * and the React-style reactive hooks — is rewritten here, on the exact source
 * text the generic AST carries. JSX itself is handled by the render-node printer
 * (`./jsx.ts`), which substitutes each lowered subtree into the surrounding text
 * *before* these rewrites run.
 *
 * Slot and dynamic semantics are the props-object reads Solid shares with React:
 * a named slot is a prop, so `<Slot name="x" />` reads `properties.x` and
 * `hasSlot('x')` becomes `properties.x != null`. What differs is reactivity (see
 * `./signals.ts`) and the DOM vocabulary (see `../runtime/aliases.ts`).
 */
import {
  aliasAttributeName,
  SOLID_ELEMENT_TYPE,
  SOLID_ELEMENT_TYPE_NAMES,
} from "../runtime/aliases.js";
import {
  DEFAULT_SLOT_PROPERTY,
  HAS_SLOT_CALLEE,
  SLOT_NAME_ATTRIBUTE,
  SLOT_TAG,
} from "../runtime/markers.js";

import {
  lowerReactiveCalls,
  rewriteGetterReads,
  rewriteStatementGetterReads,
} from "./signals.js";
import {
  memberAccess,
  parseObjectEntries,
  printObjectLiteral,
  printObjectMember,
  rewriteCalls,
  unquote,
} from "./text.js";

import type { SolidLoweringContext } from "./context.js";

/** The neutral render factory both dialects share. */
export const FACTORY_NAME = "h";

/** `i18next.t(…)` — the call form rewritten to the injected `useI18n()` binding. */
const I18NEXT_CALL = /\bi18next\s*\.\s*t\s*\(/g;

/** `<props>.<name>` — the Solid read of a named slot (the default slot is `children`). */
export function slotAccess(
  context: SolidLoweringContext,
  name: string | undefined,
): string {
  return memberAccess(context.propertiesName, name ?? DEFAULT_SLOT_PROPERTY);
}

/**
 * Safely invoke or forward a slot when a scope object is supplied:
 * `typeof <access> === 'function' ? <access>(scope) : <access>` — handling both
 * render-prop functions and plain elements.
 */
export function scopedSlotRead(
  access: string,
  scope: string | undefined,
): string {
  return scope === undefined
    ? access
    : `typeof ${access} === 'function' ? ${access}(${scope}) : ${access}`;
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

/** Rename the keys of an `h(…)` props object literal to their SolidJS DOM aliases. */
export function aliasObjectLiteralKeys(text: string): string {
  const entries = parseObjectEntries(text);
  if (entries === undefined) {
    return text.trim();
  }
  const members = entries.map((entry) =>
    entry.spread === undefined &&
    entry.key !== undefined &&
    entry.value !== undefined
      ? printObjectMember(aliasAttributeName(entry.key), entry.value)
      : `...${entry.spread ?? ""}`,
  );
  return printObjectLiteral(members) ?? "{}";
}

/** `i18next.t(…)` → `t(…)`, the binding the emitter's injected `useI18n()` provides. */
function rewriteI18nextCalls(
  text: string,
  context: SolidLoweringContext,
): string {
  if (!text.includes("i18next")) {
    return text;
  }
  const result = text.replaceAll(I18NEXT_CALL, "t(");
  if (result !== text) {
    context.runtime.i18n = true;
  }
  return result;
}

/**
 * `hasSlot('x')` → `(<props>.x != null)` — the props-object presence check.
 * The result is parenthesised so it composes with any surrounding operator.
 */
function rewriteHasSlotCalls(
  text: string,
  context: SolidLoweringContext,
): string {
  return rewriteCalls(text, new Set([HAS_SLOT_CALLEE]), (call) => {
    const first = call.args[0];
    return `(${slotAccess(context, first === undefined ? undefined : unquote(first))} != null)`;
  });
}

/** Read the slot name and remaining scope entries from an `h(Slot, { … })` props argument. */
function readSlotCallProperties(text: string | undefined): {
  name?: string;
  scope?: string;
} {
  const entries = text === undefined ? undefined : parseObjectEntries(text);
  if (entries === undefined) {
    return {};
  }
  let name: string | undefined;
  const scope: string[] = [];
  for (const entry of entries) {
    if (entry.spread !== undefined) {
      scope.push(`...${entry.spread}`);
      continue;
    }
    if (entry.key === undefined || entry.value === undefined) {
      continue;
    }
    if (entry.key === SLOT_NAME_ATTRIBUTE) {
      name = unquote(entry.value);
      continue;
    }
    scope.push(printObjectMember(entry.key, entry.value));
  }
  return { name, scope: printObjectLiteral(scope) };
}

/** The fallback argument list of an `h(Slot, …)` call, collapsed to one expression. */
function slotCallFallback(
  fallbackArguments: readonly string[],
): string | undefined {
  if (fallbackArguments.length === 0) {
    return undefined;
  }
  return fallbackArguments.length === 1
    ? fallbackArguments[0]
    : `[${fallbackArguments.join(", ")}]`;
}

/**
 * The `h(…)` call rewrites: the `h(Slot, { name: 'x' }, …fallback)` marker form
 * collapses to the same slot read as `<Slot name="x" />`, and every other
 * `h(tag, { … })` keeps its callee but has its props keys aliased to Solid's DOM
 * vocabulary.
 */
function rewriteFactoryCalls(
  text: string,
  context: SolidLoweringContext,
): string {
  return rewriteCalls(text, new Set([FACTORY_NAME]), (call) => {
    if (call.args[0] === SLOT_TAG) {
      const { name, scope } = readSlotCallProperties(call.args[1]);
      const read = scopedSlotRead(slotAccess(context, name), scope);
      return withSlotFallback(
        read,
        scope !== undefined,
        slotCallFallback(call.args.slice(2)),
      );
    }
    const properties = call.args[1];
    if (
      properties === undefined ||
      parseObjectEntries(properties) === undefined
    ) {
      return undefined;
    }
    const aliased = [
      call.args[0] ?? "undefined",
      aliasObjectLiteralKeys(properties),
      ...call.args.slice(2),
    ];
    return `${FACTORY_NAME}(${aliased.join(", ")})`;
  });
}

/**
 * `MpChild` / `MpElement` → Solid's `JSX.Element`. The neutral type import is
 * swapped for `import type { JSX } from 'solid-js'` by `./imports.ts`.
 */
export function renameNeutralElementTypes(text: string): string {
  let result = text;
  for (const name of SOLID_ELEMENT_TYPE_NAMES) {
    result = result.replaceAll(
      new RegExp(String.raw`\b${name}\b`, "g"),
      SOLID_ELEMENT_TYPE,
    );
  }
  return result;
}

/**
 * The rewrites shared by every fragment of neutral source: markers, i18n, the
 * hyperscript props vocabulary, the neutral element types and the reactive
 * primitives. Getter reads are *not* rewritten here — a declaration's binding
 * side must survive — so the callers below choose the right variant.
 */
function lowerNeutralText(text: string, context: SolidLoweringContext): string {
  let result = rewriteI18nextCalls(text, context);
  result = rewriteHasSlotCalls(result, context);
  result = rewriteFactoryCalls(result, context);
  result = lowerReactiveCalls(result, context.usage);
  return renameNeutralElementTypes(result);
}

/** Lower an expression fragment: the shared rewrites plus every getter read. */
export function lowerExpressionText(
  text: string,
  context: SolidLoweringContext,
): string {
  return rewriteGetterReads(lowerNeutralText(text, context), context.getters);
}

/** Lower a whole statement: the shared rewrites plus the getter reads outside its bindings. */
export function lowerStatementText(
  text: string,
  context: SolidLoweringContext,
): string {
  return rewriteStatementGetterReads(lowerNeutralText(text, context), context);
}

/** `ref={r}` → `ref={(el) => (r.current = el)}` — Solid assigns into the container. */
export function refCallback(name: string): string {
  return `(el) => (${name}.current = el)`;
}

/** A quoted attribute value for printed JSX (double quotes unless the value contains one). */
export function quoteAttributeValue(value: string): string {
  return value.includes('"')
    ? `'${value.replaceAll("'", "&apos;")}'`
    : `"${value}"`;
}

/** A single-quoted string literal for printed expressions. */
export function quoteExpressionString(value: string): string {
  return `'${value.replaceAll("\\", "\\\\").replaceAll("'", "\\'").replaceAll("\n", "\\n")}'`;
}
