/**
 * Expression scoping for the Svelte target.
 *
 * Every expression the emitters print comes out of the generic AST as source
 * text, so the rewrites that used to run as TypeScript node transforms run here
 * as an identifier-aware pass over that text:
 * - `hasSlot('x')` → `x != null` (a named slot is a snippet prop; the default
 *   slot's marker becomes `children != null`),
 * - `<ref>.current` → bare `<ref>` (a `useRef` collapses to a `$state`
 *   declaration holding the element directly),
 * - `<propsParameter>.x` → bare `x` (destructured from `$props()`), honouring
 *   the per-prop rename a colliding local forces,
 * - `setX(value)` → `x = value` (a `useState` setter becomes an assignment).
 *
 * The pass never reparses: it walks characters, copies strings, template
 * literals and comments verbatim, and only ever reinterprets an identifier that
 * appears in value position.
 */

import { CHILDREN_SNIPPET, snippetName } from "../runtime/names.js";
import { endOfLiteral } from "../runtime/source-text.js";

/** The bindings an expression is rewritten against. */
export interface SvelteScope {
  /** The neutral props parameter name (`properties`) whose member reads collapse to bare names. */
  readonly propsParameter: string;
  /**
   * Per-prop rename applied to `<propsParameter>.<name>` reads — identity for
   * every prop except one whose name collides with a separately declared local
   * (a same-named wrapper `const onLocaleChange = (v) => { properties.onLocaleChange?.(v); };`
   * would otherwise redeclare `onLocaleChange` once the read collapses to the
   * bare prop name). The `$props()` destructure binds the aliased name instead.
   */
  readonly propAliases: ReadonlyMap<string, string>;
  /** `useRef` names, whose `.current` indirection disappears in Svelte. */
  readonly refNames: ReadonlySet<string>;
  /** `useState` setter names mapped to the state they assign. */
  readonly setterNames: ReadonlyMap<string, string>;
}

const IDENTIFIER_START = /[A-Za-z_$]/;
const IDENTIFIER_PART = /[\w$]/;

/** An empty scope, for expressions that need no rewriting. */
export const EMPTY_SCOPE: SvelteScope = {
  propsParameter: "properties",
  propAliases: new Map(),
  refNames: new Set(),
  setterNames: new Map(),
};

/** The index just past the identifier starting at `start`. */
function endOfIdentifier(text: string, start: number): number {
  let index = start;
  while (index < text.length && IDENTIFIER_PART.test(text[index]!)) {
    index += 1;
  }
  return index;
}

/** The index just past the line or block comment opened at `start`. */
function endOfComment(text: string, start: number): number {
  if (text[start + 1] === "/") {
    const newline = text.indexOf("\n", start);
    return newline === -1 ? text.length : newline;
  }
  const close = text.indexOf("*/", start + 2);
  return close === -1 ? text.length : close + 2;
}

/** The index of the first non-whitespace character at or after `start`. */
function skipWhitespace(text: string, start: number): number {
  let index = start;
  while (index < text.length && /\s/.test(text[index]!)) {
    index += 1;
  }
  return index;
}

/** The index just past the `(…)` group opened at `start`, or `-1`. */
function endOfCall(text: string, start: number): number {
  let depth = 0;
  let index = start;
  while (index < text.length) {
    const char = text[index]!;
    if (char === "'" || char === '"' || char === "`") {
      index = endOfLiteral(text, index);
      continue;
    }
    if (char === "(" || char === "[" || char === "{") {
      depth += 1;
    } else if (char === ")" || char === "]" || char === "}") {
      depth -= 1;
      if (depth === 0) {
        return index + 1;
      }
    }
    index += 1;
  }
  return -1;
}

/** A property access (`.name` / `?.name`) starting at `start`. */
function readMemberAccess(
  text: string,
  start: number,
): { name: string; end: number } | undefined {
  let index = skipWhitespace(text, start);
  if (text[index] === "?" && text[index + 1] === ".") {
    index += 2;
  } else if (text[index] === ".") {
    index += 1;
  } else {
    return undefined;
  }
  index = skipWhitespace(text, index);
  if (index >= text.length || !IDENTIFIER_START.test(text[index]!)) {
    return undefined;
  }
  const end = endOfIdentifier(text, index);
  return { name: text.slice(index, end), end };
}

/** The slot name a `hasSlot(…)` argument list names. */
function hasSlotName(argumentText: string): string {
  const trimmed = argumentText.trim();
  const quoted = /^(['"])(.*)\1$/.exec(trimmed);
  return quoted === null
    ? snippetName(trimmed === "" ? undefined : trimmed)
    : snippetName(quoted[2]);
}

/**
 * Print a template literal (backtick string) with every `${…}` interpolation
 * scoped through {@link scopeExpression}, while every other character — the
 * surrounding backticks and the literal text between interpolations — is
 * copied verbatim. `start` must index the opening backtick; the result's
 * `end` is the index just past the matching closing one.
 *
 * A plain `endOfLiteral` skip (as every other quote uses) treats the whole
 * template — including any `properties.x`/ref/setter read inside a `${…}` —
 * as opaque text, so those reads print unrewritten and throw a
 * `ReferenceError` once `properties` no longer exists as a bare identifier.
 */
function scopeTemplateLiteral(
  text: string,
  start: number,
  scope: SvelteScope,
): { printed: string; end: number } {
  let out = "`";
  let index = start + 1;
  while (index < text.length) {
    const char = text[index]!;
    if (char === "\\") {
      out += text.slice(index, index + 2);
      index += 2;
      continue;
    }
    if (char === "`") {
      out += "`";
      index += 1;
      break;
    }
    if (char === "$" && text[index + 1] === "{") {
      const close = endOfCall(text, index + 1);
      if (close === -1) {
        out += text.slice(index);
        index = text.length;
        break;
      }
      out += `\${${scopeExpression(text.slice(index + 2, close - 1), scope)}}`;
      index = close;
      continue;
    }
    out += char;
    index += 1;
  }
  return { printed: out, end: index };
}

/**
 * Print an expression with every Svelte scoping rewrite applied throughout its
 * text. Plain strings and comments are copied verbatim; a template literal's
 * `${…}` interpolations are scoped too (see {@link scopeTemplateLiteral}). A
 * name in member position (`foo.properties`) is never mistaken for a binding.
 */
export function scopeExpression(text: string, scope: SvelteScope): string {
  let out = "";
  let index = 0;
  let previous = "";
  while (index < text.length) {
    const char = text[index]!;
    if (char === "`") {
      const { printed, end } = scopeTemplateLiteral(text, index, scope);
      out += printed;
      index = end;
      previous = '"';
      continue;
    }
    if (char === "'" || char === '"') {
      const end = endOfLiteral(text, index);
      out += text.slice(index, end);
      index = end;
      previous = '"';
      continue;
    }
    if (char === "/" && (text[index + 1] === "/" || text[index + 1] === "*")) {
      const end = endOfComment(text, index);
      out += text.slice(index, end);
      index = end;
      continue;
    }
    if (!IDENTIFIER_START.test(char)) {
      out += char;
      if (!/\s/.test(char)) {
        previous = char;
      }
      index += 1;
      continue;
    }
    const end = endOfIdentifier(text, index);
    const name = text.slice(index, end);
    const wasMember = previous === ".";
    index = end;
    previous = "a";
    if (wasMember) {
      out += name;
      continue;
    }
    if (name === "hasSlot") {
      const open = skipWhitespace(text, index);
      const close = text[open] === "(" ? endOfCall(text, open) : -1;
      if (close !== -1) {
        out += `${hasSlotName(text.slice(open + 1, close - 1))} != null`;
        index = close;
        continue;
      }
    }
    const setterTarget = scope.setterNames.get(name);
    if (setterTarget !== undefined) {
      const open = skipWhitespace(text, index);
      const close = text[open] === "(" ? endOfCall(text, open) : -1;
      if (close !== -1) {
        const argument = text.slice(open + 1, close - 1).trim();
        out += `${setterTarget} = ${argument === "" ? "undefined" : scopeExpression(argument, scope)}`;
        index = close;
        continue;
      }
    }
    if (name === scope.propsParameter) {
      const member = readMemberAccess(text, index);
      if (member !== undefined) {
        out += scope.propAliases.get(member.name) ?? member.name;
        index = member.end;
        continue;
      }
    }
    if (scope.refNames.has(name)) {
      const member = readMemberAccess(text, index);
      if (member?.name === "current") {
        out += name;
        index = member.end;
        continue;
      }
    }
    out += name;
  }
  return out;
}

/**
 * The inner expression for a Svelte `class={…}` binding.
 *
 * Svelte 5's `class` attribute resolves its value through `clsx`, so it accepts
 * the same array/object-of-truthy-values forms as Vue's `:class` binding. A
 * neutral `classNames(a, b, { c: cond })` helper call is therefore unwrapped
 * into a native Svelte class **array** (`[a, b, { c: cond }]`) — letting
 * Svelte's built-in `clsx` resolve it instead of the forge runtime helper. A
 * lone argument passes through directly (it is already a valid `ClassValue`),
 * and any non-`classNames` expression (a plain string variable, an
 * array/object literal, a ternary) is emitted unchanged.
 */
export function svelteClassValue(
  text: string,
  scope: SvelteScope,
  argumentTexts: readonly string[] | undefined,
): string {
  if (argumentTexts === undefined) {
    return scopeExpression(text, scope);
  }
  if (argumentTexts.length === 1) {
    return scopeExpression(argumentTexts[0]!, scope);
  }
  return `[${argumentTexts.map((argument) => scopeExpression(argument, scope)).join(", ")}]`;
}

/**
 * Whether an expression text reads the component's `children` — bare
 * (`{children}`) or through any object (`properties.children`). The component
 * destructures the `children` snippet prop from `$props()`, so such a read
 * renders the default snippet rather than a `{children}` text hole (which
 * Svelte would print as an opaque object).
 */
export function readsChildren(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed === CHILDREN_SNIPPET) {
    return true;
  }
  return new RegExp(
    `^[A-Za-z_$][\\w$]*\\s*\\??\\.\\s*${CHILDREN_SNIPPET}$`,
  ).test(trimmed);
}
