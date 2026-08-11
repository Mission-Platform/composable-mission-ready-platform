/**
 * Reference rewriting for the Vue target.
 *
 * A neutral component is authored against React-style primitives, so every
 * source-backed fragment the generic AST carries still speaks that dialect:
 * `count` is a plain value, `setCount(1)` a setter call, `inputRef.current` a
 * mutable box, `onChange(value)` a callback prop. Vue needs the reactive
 * spelling of each: `count.value`, `count.value = 1`, `inputRef.value`,
 * `emit('change', value)`.
 *
 * The old emitter did this with TypeScript transformers over a re-parsed tree.
 * The IR-first emitter rewrites the recorded **text** instead, using the
 * literal/comment mask from `./text.js` so a rewrite never reaches inside a
 * string, a template chunk or a comment. Every rewrite is anchored on a whole
 * identifier token, which keeps `setCounter` from matching inside `setCounters`.
 */
import { scanJsx, type JsxRegions } from "./jsx-scan.js";
import {
  indexOfTopLevel,
  isIdentifierPart,
  isIdentifierStart,
  matchBracket,
  maskLiterals,
  splitTopLevel,
  unwrapParentheses,
} from "./text.js";

/** An event prop (`on<Event>`) lowered to a `defineEmits` entry. */
export interface VueEvent {
  /** The emitted event name (`onChange` → `change`). */
  readonly eventName: string;
  /** The handler's parameter declarations, used in script forwarding arrows. */
  readonly paramsText: string;
  /** The handler's parameter names, used to build a forwarding arrow. */
  readonly paramNames: readonly string[];
}

/**
 * Everything the rewriter needs to know about a component's bindings: which
 * identifiers are props, reactive state, refs, memos, models or events.
 */
export interface VueScope {
  /** The props parameter's local name (`properties`). */
  readonly propsParameterName: string;
  /** Locals bound by `const { … } = properties`. */
  readonly destructuredProps: ReadonlySet<string>;
  /** Renamed destructuring bindings (local name → real prop name). */
  readonly propAliases: ReadonlyMap<string, string>;
  /** `useState` value locals, which become `ref`s. */
  readonly stateNames: ReadonlySet<string>;
  /** `useState` setter locals (setter name → state name). */
  readonly setterToState: ReadonlyMap<string, string>;
  /** `useRef` locals, whose `.current` collapses to `.value`. */
  readonly refNames: ReadonlySet<string>;
  /** `useMemo` / hoisted derived locals, which become `computed`s. */
  readonly memoNames: ReadonlySet<string>;
  /** CSS-Module default-import locals, whose member reads collapse to class names. */
  readonly styleModuleNames: ReadonlySet<string>;
  /** Event props declared with `defineEmits`, keyed by prop name. */
  readonly eventProps: ReadonlyMap<string, VueEvent>;
  /** Props fused into a `defineModel` two-way binding. */
  readonly modelProps: ReadonlySet<string>;
  /** A model's paired change-event prop name → the model prop name. */
  readonly modelEvents: ReadonlyMap<string, string>;
}

/**
 * Which dialect a fragment is printed in.
 *
 * `script` is the `<script setup>` body: a `ref` is read through `.value` and a
 * destructured prop resolves back to `properties.<name>`.
 *
 * `template` is the markup: Vue unwraps a `ref` automatically and resolves a
 * prop by its bare name, so every reactive read stays bare. Only the shapes with
 * no template meaning are rewritten — a setter call becomes an assignment, an
 * event prop becomes `emit(…)`, `properties.children` becomes `$slots.default`
 * and a CSS-Module read collapses to its class name.
 */
type RewriteMode = "script" | "template";

/** An empty scope, useful for composables and tests. */
export function emptyScope(propsParameterName = "properties"): VueScope {
  return {
    propsParameterName,
    destructuredProps: new Set(),
    propAliases: new Map(),
    stateNames: new Set(),
    setterToState: new Map(),
    refNames: new Set(),
    memoNames: new Set(),
    styleModuleNames: new Set(),
    eventProps: new Map(),
    modelProps: new Set(),
    modelEvents: new Map(),
  };
}

/** Keywords that introduce a *declaration*, whose bound name must not be rewritten. */
const DECLARATION_KEYWORDS: ReadonlySet<string> = new Set([
  "const",
  "let",
  "var",
  "function",
  "class",
  "interface",
]);

/** The neutral translation namespace (`i18next.t(…)`). */
const I18N_NAMESPACE = "i18next";

/** The workspace package exporting the framework-agnostic `useI18n` composable. */
export const I18N_MODULE = "@mission-platform/i18n";

/** The `<script setup>` line that binds `t` for a translating component. */
export const I18N_SETUP_LINE = "const { t } = useI18n();";

/**
 * Whether a fragment calls the neutral translator. The call is lowered to the
 * `useI18n()` composable's `t`, which has to be bound in `setup` first.
 */
export function usesTranslation(text: string): boolean {
  const mask = maskLiterals(text);
  for (const match of text.matchAll(/\bi18next\s*\.\s*t\s*\(/g)) {
    if (!mask[match.index]) {
      return true;
    }
  }
  return false;
}

/**
 * Index of the first character before `end` that is neither whitespace nor
 * literal/comment content, or `-1`.
 *
 * The mask matters: a line comment ending in a full stop would otherwise make
 * the next identifier look like a member access (`… leading.\ncount` reads as
 * `.count`), and a prop read directly after a documented line would be skipped.
 */
function previousIndex(
  text: string,
  end: number,
  mask: readonly boolean[],
): number {
  let index = end - 1;
  while (index >= 0 && (/\s/.test(text[index]) || mask[index] === true)) {
    index -= 1;
  }
  return index;
}

/** The identifier token ending at `end` (exclusive), or `undefined`. */
function previousToken(
  text: string,
  end: number,
  mask: readonly boolean[],
): string | undefined {
  const index = previousIndex(text, end, mask);
  if (index < 0 || !isIdentifierPart(text[index])) {
    return undefined;
  }
  let start = index;
  while (start > 0 && isIdentifierPart(text[start - 1])) {
    start -= 1;
  }
  return text.slice(start, index + 1);
}

/** The first significant character before `end`, or `''`. */
function previousChar(
  text: string,
  end: number,
  mask: readonly boolean[],
): string {
  const index = previousIndex(text, end, mask);
  return index < 0 ? "" : text[index];
}

/** The first non-whitespace character at or after `start`, or `''`. */
function nextChar(text: string, start: number): string {
  let index = start;
  while (index < text.length && /\s/.test(text[index])) {
    index += 1;
  }
  return index >= text.length ? "" : text[index];
}

/** Index of the first non-whitespace character at or after `start`. */
function nextIndex(text: string, start: number): number {
  let index = start;
  while (index < text.length && /\s/.test(text[index])) {
    index += 1;
  }
  return index;
}

/** The comma-separated arguments of the call whose `(` sits at `open`. */
function callArguments(
  text: string,
  open: number,
): { args: string[]; end: number } | undefined {
  const close = matchBracket(text, open);
  if (close === -1) {
    return undefined;
  }
  return {
    args: splitTopLevel(text.slice(open + 1, close), ","),
    end: close + 1,
  };
}

/**
 * Whether the identifier at `[start, end)` is a *binding* occurrence rather than
 * a read: an object-literal key (`{ count: 1 }`), an accessor name
 * (`get count() { … }`), a declaration name (`const count = …`), a member name
 * (`a.count`) or a labelled property.
 */
function isBindingPosition(
  text: string,
  start: number,
  end: number,
  mask: readonly boolean[],
): boolean {
  const before = previousChar(text, start, mask);
  if (before === ".") {
    // `...rest` is a spread, whose operand is an ordinary read.
    const dot = previousIndex(text, start, mask);
    return text[dot - 1] !== ".";
  }
  if (before === "?" && text[start - 2] === "?") {
    // `a ?? count` is a read; only `?.` is a member access.
    return false;
  }
  const keyword = previousToken(text, start, mask);
  if (keyword !== undefined && DECLARATION_KEYWORDS.has(keyword)) {
    return true;
  }
  // An accessor's name (`get onClose() { … }`). The reactive-options rewrite
  // and the composable return both re-spell entries as getters *before* this
  // pass runs, so without this an event prop's key would become `emit(…)`.
  // `map.get(key)` is a call, not an accessor, so the keyword must itself not
  // be a member access — and only `get`/`set` followed by a *name* qualifies.
  if ((keyword === "get" || keyword === "set") && nextChar(text, end) === "(") {
    const keywordEnd = previousIndex(text, start, mask) + 1;
    if (previousChar(text, keywordEnd - keyword.length, mask) !== ".") {
      return true;
    }
  }
  // An object-literal key (`{ count: 1 }`) — but not a ternary arm or a type
  // annotation on a declared name, which never follow `{` or `,`.
  if ((before === "{" || before === ",") && nextChar(text, end) === ":") {
    return true;
  }
  return false;
}

/**
 * The Vue spelling of a CSS-Module read: `styles.host` / `styles['host']`
 * collapse to the plain BEM class name the inlined `<style>` block declares.
 */
function styleModuleRead(
  text: string,
  end: number,
  scope: VueScope,
  mode: RewriteMode,
): { value: string; end: number } | undefined {
  const index = nextIndex(text, end);
  if (text[index] === ".") {
    let cursor = index + 1;
    const start = cursor;
    while (cursor < text.length && isIdentifierPart(text[cursor])) {
      cursor += 1;
    }
    return cursor > start
      ? { value: `'${text.slice(start, cursor)}'`, end: cursor }
      : undefined;
  }
  if (text[index] === "[") {
    const close = matchBracket(text, index);
    if (close === -1) {
      return undefined;
    }
    const key = text.slice(index + 1, close).trim();
    if (/^(['"]).*\1$/.test(key)) {
      return { value: `'${key.slice(1, -1)}'`, end: close + 1 };
    }
    // A modifier class is keyed by a template literal, as in a `host--${size}`
    // lookup. The class names survive un-hashed, so the key *is* the class name —
    // but its interpolations are real code and still need the dialect's rewriting.
    if (key.startsWith("`") && key.endsWith("`") && key.length > 1) {
      return { value: rewriteFragment(key, scope, mode), end: close + 1 };
    }
    return undefined;
  }
  return undefined;
}

/**
 * Rewrite a source-backed fragment into its Vue spelling. The fragment may be a
 * statement or an expression — the rewriter is purely token-level, so it treats
 * both alike.
 */
export function rewriteExpression(source: string, scope: VueScope): string {
  return rewriteFragment(source, scope, "script");
}

/** Rewrite a source-backed fragment in one of the two dialects. */
function rewriteFragment(
  source: string,
  scope: VueScope,
  mode: RewriteMode,
): string {
  // `hasSlot` is compile-time vocabulary: it has no runtime existence, so every
  // fragment the script dialect prints — a lifted `computed`, a `watchEffect`
  // body, a retained declaration, a handler — must carry the lowered presence
  // test instead. The template dialect is pre-lowered against `$slots` by
  // {@link rewriteTemplateExpression}, which reaches markup-only positions.
  const text =
    mode === "script" ? replaceHasSlot(source, "slots", true) : source;
  const mask = maskLiterals(text);
  // A render-closure fragment mixes JavaScript with verbatim JSX; markup is
  // reported so tag names, attribute names and element text survive untouched.
  const jsx = scanJsx(text);
  let output = "";
  let index = 0;
  while (index < text.length) {
    if (
      mask[index] ||
      jsx.verbatim[index] === true ||
      !isIdentifierStart(text[index]) ||
      isIdentifierPart(text[index - 1])
    ) {
      output += text[index];
      index += 1;
      continue;
    }
    let end = index;
    while (end < text.length && isIdentifierPart(text[end])) {
      end += 1;
    }
    const name = text.slice(index, end);
    if (
      isHyphenatedAttributeName(text, index, end) ||
      isBindingPosition(text, index, end, mask)
    ) {
      output += name;
      index = end;
      continue;
    }
    const member =
      name === scope.propsParameterName
        ? propsMemberRead(text, end, scope, mode)
        : undefined;
    if (member !== undefined) {
      output += member.text;
      index = member.end;
      continue;
    }
    const replacement = rewriteIdentifier(text, name, end, scope, mode);
    if (replacement === undefined) {
      output += name;
      index = end;
      continue;
    }
    output += isShorthandProperty(text, mask, jsx, index, end)
      ? `${name}: ${replacement.text}`
      : replacement.text;
    index = replacement.end;
  }
  return output;
}

/**
 * Whether the identifier at `[start, end)` is an object-literal **shorthand**
 * property (`{ threshold }`): rewriting the read in place would produce the
 * invalid `{ properties.threshold }`, so the key has to be re-stated
 * (`{ threshold: properties.threshold }`).
 */
function isShorthandProperty(
  text: string,
  mask: readonly boolean[],
  jsx: JsxRegions,
  start: number,
  end: number,
): boolean {
  let before = start - 1;
  while (before >= 0 && /\s/.test(text[before] ?? "")) {
    before -= 1;
  }
  const opener = text[before];
  if (
    before < 0 ||
    mask[before] === true ||
    (opener !== "{" && opener !== ",")
  ) {
    return false;
  }
  let after = end;
  while (after < text.length && /\s/.test(text[after] ?? "")) {
    after += 1;
  }
  const closer = text[after];
  if (
    after >= text.length ||
    mask[after] === true ||
    (closer !== "," && closer !== "}")
  ) {
    return false;
  }
  // A `,`-separated element is only a property when its enclosing bracket is an
  // object literal — in `[a, b]` the same shape is an array element.
  const brace =
    opener === "{" ? before : enclosingBracketIndex(text, mask, before);
  if (brace === -1 || text[brace] !== "{") {
    return false;
  }
  // A JSX expression container looks exactly like an object literal, but the
  // child `{label}` is a read — restating the key would not even parse.
  return !jsx.containers.has(brace);
}

/**
 * Whether the identifier is the tail of a hyphenated JSX **attribute name**
 * (`aria-current={…}`, `data-in-view={…}`). Only the attribute *value* is
 * rewritten; the name must survive verbatim.
 */
function isHyphenatedAttributeName(
  text: string,
  start: number,
  end: number,
): boolean {
  if (text[start - 1] !== "-") {
    return false;
  }
  let after = end;
  while (after < text.length && /\s/.test(text[after] ?? "")) {
    after += 1;
  }
  return text[after] === "=" && text[after + 1] !== "=";
}

/** The index of the nearest unclosed opening bracket at or before `from`, or `-1`. */
function enclosingBracketIndex(
  text: string,
  mask: readonly boolean[],
  from: number,
): number {
  let depth = 0;
  for (let index = from; index >= 0; index -= 1) {
    if (mask[index] === true) {
      continue;
    }
    const character = text[index];
    if (character === ")" || character === "]" || character === "}") {
      depth += 1;
    } else if (character === "(" || character === "[" || character === "{") {
      if (depth === 0) {
        return index;
      }
      depth -= 1;
    }
  }
  return -1;
}

/**
 * Rewrite a `properties.<name>` read. An event prop is an emit in both dialects;
 * in the markup `properties.children` is the default slot and every other prop
 * is resolved by its bare name (`:src="src"`, never `:src="properties.src"`).
 */
function propsMemberRead(
  text: string,
  end: number,
  scope: VueScope,
  mode: RewriteMode,
): { text: string; end: number } | undefined {
  const dot = nextIndex(text, end);
  if (text[dot] !== ".") {
    return undefined;
  }
  let cursor = nextIndex(text, dot + 1);
  const start = cursor;
  while (cursor < text.length && isIdentifierPart(text[cursor])) {
    cursor += 1;
  }
  if (cursor === start) {
    return undefined;
  }
  const property = text.slice(start, cursor);
  const event = scope.eventProps.get(property);
  if (event !== undefined) {
    return emitEventRead(text, cursor, event, scope, mode);
  }
  // A model's paired change event drives the two-way ref, so calling it through
  // the props object writes the model exactly as a bare call would.
  const model = scope.modelEvents.get(property);
  if (model !== undefined) {
    return modelWrite(text, cursor, model, scope, mode);
  }
  // `<script setup>` exposes the `defineProps` result, so a `properties.<name>`
  // read is valid markup as it stands; only the children read has no prop form.
  if (mode === "template" && property === "children") {
    return { text: "$slots.default", end: cursor };
  }
  return undefined;
}

/** Whether an updater callback declares a parameter for the previous value. */
function hasUpdaterParameter(text: string): boolean {
  const trimmed = unwrapParentheses(text);
  if (trimmed.startsWith("function")) {
    const open = trimmed.indexOf("(");
    const close = open === -1 ? -1 : matchBracket(trimmed, open);
    return (
      open !== -1 &&
      close !== -1 &&
      trimmed.slice(open + 1, close).trim().length > 0
    );
  }
  const arrow = indexOfTopLevel(trimmed, "=>");
  if (arrow === -1) {
    return false;
  }
  return unwrapParentheses(trimmed.slice(0, arrow)).trim().length > 0;
}

/**
 * Rewrite a read of an event prop: a call becomes `emit('<event>', …)`, and a
 * bare reference becomes a forwarding arrow so the handler can still be passed
 * down to a child.
 */
function emitEventRead(
  text: string,
  end: number,
  event: VueEvent,
  scope: VueScope,
  mode: RewriteMode,
): { text: string; end: number } {
  // A binding value is double-quoted markup, so the event name is single-quoted
  // there (`@click="emit('close')"`); the script keeps the printer's quoting.
  const name =
    mode === "template" ? `'${event.eventName}'` : `"${event.eventName}"`;
  // A callback prop is usually invoked optionally (`properties.onChange?.(v)`);
  // the emit is unconditional, so the `?.` is consumed with the call.
  let callIndex = nextIndex(text, end);
  if (text[callIndex] === "?" && text[callIndex + 1] === ".") {
    callIndex = nextIndex(text, callIndex + 2);
  }
  if (text[callIndex] === "(") {
    const call = callArguments(text, callIndex);
    if (call !== undefined) {
      const payload = call.args.map((argument) =>
        rewriteFragment(argument, scope, mode),
      );
      return { text: `emit(${[name, ...payload].join(", ")})`, end: call.end };
    }
  }
  const parameters =
    mode === "template" ? event.paramNames.join(", ") : event.paramsText;
  const parameterNames = event.paramNames.join(", ");
  return {
    text: `((${parameters}) => emit(${name}${parameterNames.length > 0 ? `, ${parameterNames}` : ""}))`,
    end,
  };
}

/**
 * Rewrite a call of a model's paired change event into a write of the model's
 * own ref (`onValueChange?.(next)` → `modelValue.value = next`). A read that is
 * not a call has no assignment form and is left to the caller.
 */
function modelWrite(
  text: string,
  end: number,
  modelName: string,
  scope: VueScope,
  mode: RewriteMode,
): { text: string; end: number } | undefined {
  const box = mode === "template" ? "" : ".value";
  let callIndex = nextIndex(text, end);
  if (text[callIndex] === "?" && text[callIndex + 1] === ".") {
    callIndex = nextIndex(text, callIndex + 2);
  }
  if (text[callIndex] !== "(") {
    return undefined;
  }
  const call = callArguments(text, callIndex);
  if (call === undefined) {
    return undefined;
  }
  const [argument] = call.args;
  return {
    text: `${modelName}${box} = ${argument === undefined ? "undefined" : rewriteFragment(argument, scope, mode)}`,
    end: call.end,
  };
}

/** Rewrite a single identifier occurrence, or `undefined` to keep it verbatim. */
function rewriteIdentifier(
  text: string,
  name: string,
  end: number,
  scope: VueScope,
  mode: RewriteMode,
): { text: string; end: number } | undefined {
  const callIndex = nextIndex(text, end);
  const isCall = text[callIndex] === "(";
  // In the markup a `ref` is unwrapped by Vue, so the reactive box is addressed
  // by its bare name; in the script it needs the explicit `.value`.
  const box = mode === "template" ? "" : ".value";

  // `i18next.t(…)` is the neutral translation call; Vue reads `t` off the
  // injected `useI18n()` composable (see `I18N_NAMESPACE`).
  if (name === I18N_NAMESPACE) {
    const dot = nextIndex(text, end);
    const translator = nextIndex(text, dot + 1);
    if (
      text[dot] === "." &&
      text[translator] === "t" &&
      !isIdentifierPart(text[translator + 1])
    ) {
      return { text: "t", end: translator + 1 };
    }
  }

  // `setCount(next)` → `count.value = next`; the updater form
  // `setCount((previous) => …)` applies the callback to the current value.
  const stateName = scope.setterToState.get(name);
  if (stateName !== undefined && isCall) {
    const call = callArguments(text, callIndex);
    if (call !== undefined) {
      const [argument] = call.args;
      if (argument === undefined) {
        return { text: `${stateName}${box} = undefined`, end: call.end };
      }
      const rewritten = rewriteFragment(argument, scope, mode);
      const isUpdater =
        /=>/.test(rewritten) || rewritten.startsWith("function");
      // An updater without a parameter never reads the previous value, so it is
      // invoked bare (`state = (() => next)()`).
      const forwards = isUpdater && hasUpdaterParameter(rewritten);
      return {
        text: isUpdater
          ? `${stateName}${box} = (${rewritten})(${forwards ? `${stateName}${box}` : ""})`
          : `${stateName}${box} = ${rewritten}`,
        end: call.end,
      };
    }
  }

  // A model's paired change event (`onUpdateValue(next)`) writes the model ref.
  const modelName = scope.modelEvents.get(name);
  if (modelName !== undefined) {
    const write = modelWrite(text, end, modelName, scope, mode);
    if (write !== undefined) {
      return write;
    }
  }

  // An event prop is a `defineEmits` entry: a call becomes `emit(…)` and a bare
  // reference becomes a forwarding arrow so it can still be passed down.
  const event = scope.eventProps.get(name);
  if (event !== undefined) {
    return emitEventRead(text, end, event, scope, mode);
  }

  // `styles.host` → `'host'` (the inlined `<style>` block keeps the BEM names).
  if (scope.styleModuleNames.has(name)) {
    const read = styleModuleRead(text, end, scope, mode);
    if (read !== undefined) {
      return { text: read.value, end: read.end };
    }
  }

  // `inputRef.current` → `inputRef.value`.
  if (scope.refNames.has(name)) {
    const memberIndex = nextIndex(text, end);
    if (
      text.startsWith(".current", memberIndex) &&
      !isIdentifierPart(text[memberIndex + 8])
    ) {
      return { text: `${name}.value`, end: memberIndex + 8 };
    }
    return undefined;
  }

  // Reactive reads: state, memos and models are all refs in the emitted setup.
  // Vue unwraps them in the markup, so only the script needs the `.value`.
  if (
    scope.stateNames.has(name) ||
    scope.memoNames.has(name) ||
    scope.modelProps.has(name)
  ) {
    return mode === "template" ? undefined : { text: `${name}.value`, end };
  }

  // Children are represented by Vue's default slot rather than a declared prop.
  // This applies to both `properties.children` and a destructured `children`
  // binding, otherwise the template reads an undeclared `_ctx.children` value.
  if (scope.destructuredProps.has(name)) {
    const real = scope.propAliases.get(name) ?? name;
    if (mode === "template") {
      if (real === "children") {
        return { text: "$slots.default?.()", end };
      }
      return real === name ? undefined : { text: real, end };
    }
    return { text: `${scope.propsParameterName}.${real}`, end };
  }

  return undefined;
}

/**
 * Rewrite an expression for **template** use: identical to
 * {@link rewriteExpression} except that `hasSlot('x')` — the neutral
 * slot-presence marker — becomes Vue's `$slots.x` test, which is only meaningful
 * inside markup.
 */
export function rewriteTemplateExpression(
  source: string,
  scope: VueScope,
): string {
  return rewriteFragment(replaceHasSlot(source, "$slots"), scope, "template");
}

/**
 * Splice `name → text` substitutions into a fragment.
 *
 * Vue's `<template>` has no per-item statement scope, so the leading scalar
 * `const`s of a `.map(…)` callback (and the derived consts of an inlined helper)
 * have to be inlined into every expression printed inside the loop. Each
 * substitution is parenthesised so operator precedence is preserved, and a
 * shorthand property (`{ open }`) is expanded to `{ open: (…) }`.
 */
export function inlineIdentifiers(
  source: string,
  substitutions: ReadonlyMap<string, string>,
): string {
  if (substitutions.size === 0) {
    return source;
  }
  const text = source;
  const mask = maskLiterals(text);
  let output = "";
  let index = 0;
  while (index < text.length) {
    if (
      mask[index] ||
      !isIdentifierStart(text[index]) ||
      isIdentifierPart(text[index - 1])
    ) {
      output += text[index];
      index += 1;
      continue;
    }
    let end = index;
    while (end < text.length && isIdentifierPart(text[end])) {
      end += 1;
    }
    const name = text.slice(index, end);
    const value = substitutions.get(name);
    if (value === undefined || previousChar(text, index, mask) === ".") {
      output += name;
      index = end;
      continue;
    }
    // `{ open }` → `{ open: (…) }`; a declaration name is never substituted.
    const before = previousChar(text, index, mask);
    const after = nextChar(text, end);
    if (DECLARATION_KEYWORDS.has(previousToken(text, index, mask) ?? "")) {
      output += name;
      index = end;
      continue;
    }
    // `${name}` inside a template literal opens an interpolation, not an object
    // literal, so it must never be expanded into a `key: value` pair.
    let scan = index - 1;
    while (scan >= 0 && /\s/.test(text[scan])) {
      scan -= 1;
    }
    const interpolation = text[scan] === "{" && text[scan - 1] === "$";
    const inObject = (before === "{" && !interpolation) || before === ",";
    if (inObject && (after === "," || after === "}")) {
      output += `${name}: (${value})`;
      index = end;
      continue;
    }
    if (inObject && after === ":") {
      output += name;
      index = end;
      continue;
    }
    output += `(${value})`;
    index = end;
  }
  return output;
}

/**
 * Rewrite `hasSlot('name')` markers to `<accessor>.name` presence tests. A
 * kebab-case slot name is not an identifier, so it is reached by bracket access.
 * Outside markup the result is coerced to a boolean: `slots.x` is the slot
 * *function*, whereas the marker means "is this slot filled".
 */
export function replaceHasSlot(
  source: string,
  accessor: string,
  coerce = false,
): string {
  let text = source;
  let from = 0;
  for (;;) {
    // The mask is recomputed per replacement because the text shifts; a marker
    // named inside a string, a template chunk or a doc comment is prose, not a
    // call, and must be left exactly as authored.
    const mask = maskLiterals(text);
    const pattern = /\bhasSlot\s*\(/g;
    pattern.lastIndex = from;
    const match = pattern.exec(text);
    if (match === null) {
      return text;
    }
    const open = match.index + match[0].length - 1;
    const close = matchBracket(text, open);
    if (mask[match.index] === true || close === -1) {
      from = match.index + 1;
      continue;
    }
    const argument = unwrapParentheses(text.slice(open + 1, close));
    const name = /^(['"])(.*)\1$/.exec(argument)?.[2] ?? "default";
    const read = /^[A-Za-z_$][\w$]*$/.test(name)
      ? `${accessor}.${name}`
      : `${accessor}['${name}']`;
    text = `${text.slice(0, match.index)}${coerce ? `!!${read}` : read}${text.slice(close + 1)}`;
    from = match.index;
  }
}
