/**
 * Reactive-primitive lowering for the SolidJS target.
 *
 * A SolidJS component runs its function body exactly once; reactivity is carried
 * by signals rather than by re-invoking the component. These rewrites turn the
 * neutral React-style hook usage into SolidJS primitives, working on the source
 * fragments the generic AST carries (statement text, attribute values,
 * interpolations) rather than on a parsed tree:
 *
 * - `useState(init)` → `createSignal(init)`. The first tuple element becomes a
 *   getter **function**, so every read of it is rewritten to a call (`open` →
 *   `open()`); the setter is left as a call (`setOpen(v)`).
 * - `useMemo(fn, deps)` → `createMemo(fn)`; its binding is likewise a getter.
 *   A factory that can never change folds to the bare constant instead.
 * - `useEffect(fn, [])` → `onMount(fn)`; `useEffect(fn, deps)` → `createEffect(fn)`.
 * - `useRef(init)` → a `{ current: init }` container; element refs passed as
 *   `ref={r}` become the callback form `ref={(el) => (r.current = el)}` (see
 *   `./jsx.ts`, which owns attribute printing).
 * - `useId()` → `createUniqueId()`.
 * - `useCallback(fn, deps)` → `fn` (Solid needs no memoised callbacks).
 *
 * Props are never destructured — the component parameter is emitted verbatim, so
 * a component authored against a `props` object keeps its reactive reads.
 */
import { constantMemoValue } from "./constants.js";
import {
  indexOfAssignment,
  isEqualsBinding,
  isParameterList,
  rewriteCalls,
  rewriteIdentifiers,
  skipTrivia,
} from "./text.js";

import type { SolidLoweringContext, SolidPrimitiveUsage } from "./context.js";

/** The neutral hooks lowered to SolidJS primitives. */
const NEUTRAL_HOOKS: ReadonlySet<string> = new Set([
  "useState",
  "useMemo",
  "useEffect",
  "useId",
  "useCallback",
  "useRef",
]);

/** Keywords after which an identifier is a binding rather than a read. */
const BINDING_KEYWORDS: ReadonlySet<string> = new Set([
  "const",
  "let",
  "var",
  "function",
  "class",
  "as",
  "case",
]);

/** Keywords that introduce a destructuring binding pattern. */
const DECLARATION_KEYWORDS: ReadonlySet<string> = new Set([
  "const",
  "let",
  "var",
]);

/** Statements whose text is entirely a type declaration and holds no value reads. */
const TYPE_STATEMENT_PREFIX =
  /^(?:export\s+)?(?:declare\s+)?(?:interface|type|enum)\b/;

/** Whether a statement declares only types, so no read may be rewritten inside it. */
export function isTypeOnlyStatement(text: string): boolean {
  return TYPE_STATEMENT_PREFIX.test(text.trim());
}

/**
 * Whether the bracket enclosing an identifier opens a **declaration binding** —
 * the `[open, setOpen]` of `const [open, setOpen] = createSignal(false)`, or the
 * `{ open }` of `const { open } = source`. The names there are bound, not read,
 * even when the declaration is nested inside a larger statement.
 */
function isDeclarationBinding(text: string, bracketStart: number): boolean {
  const bracket = bracketStart < 0 ? "" : text.charAt(bracketStart);
  if (bracket !== "[" && bracket !== "{") {
    return false;
  }
  let cursor = bracketStart - 1;
  while (cursor >= 0 && /\s/.test(text.charAt(cursor))) {
    cursor -= 1;
  }
  const end = cursor + 1;
  while (cursor >= 0 && /[\w$]/.test(text.charAt(cursor))) {
    cursor -= 1;
  }
  return DECLARATION_KEYWORDS.has(text.slice(cursor + 1, end));
}

/** Whether the `?` following an identifier introduces an optional member (`open?: string`). */
function isOptionalMember(text: string, end: number): boolean {
  const question = skipTrivia(text, end);
  return text.charAt(skipTrivia(text, question + 1)) === ":";
}

/** Render the recorded type arguments back to source (`''` when the call had none). */
function typeArguments(text: string | undefined): string {
  return text === undefined ? "" : `<${text}>`;
}

/** Whether an effect's dependency argument is the empty array (a mount-only effect). */
function isMountDependencies(dependencies: string | undefined): boolean {
  return (
    dependencies !== undefined && dependencies.replaceAll(/\s+/g, "") === "[]"
  );
}

/**
 * Rewrite the neutral hook calls in a fragment to their Solid primitives,
 * recording on `usage` which primitives the import builder must include.
 */
export function lowerReactiveCalls(
  text: string,
  usage: SolidPrimitiveUsage,
): string {
  return rewriteCalls(text, NEUTRAL_HOOKS, (call) => {
    const generics = typeArguments(call.typeArguments);
    const first = call.args[0];
    switch (call.name) {
      case "useState": {
        usage.createSignal = true;
        return `createSignal${generics}(${call.args.join(", ")})`;
      }
      case "useMemo": {
        // A constant factory needs no reactive node — fold to the value itself
        // (the binding is dropped from the getter set, so its reads stay bare).
        const constant =
          first === undefined ? undefined : constantMemoValue(first);
        if (constant !== undefined) {
          return constant;
        }
        usage.createMemo = true;
        return `createMemo${generics}(${first ?? ""})`;
      }
      case "useEffect": {
        if (isMountDependencies(call.args[1])) {
          usage.onMount = true;
          return `onMount${generics}(${first ?? ""})`;
        }
        usage.createEffect = true;
        return `createEffect${generics}(${first ?? ""})`;
      }
      case "useId": {
        usage.createUniqueId = true;
        return "createUniqueId()";
      }
      case "useCallback": {
        return first ?? "";
      }
      case "useRef": {
        return `{ current: ${first ?? "undefined"} }`;
      }
      default: {
        return undefined;
      }
    }
  });
}

/**
 * Rewrite reads of the getter names to calls (`open` → `open()`), expanding
 * object shorthand (`{ open }` → `{ open: open() }`) so the value is carried
 * rather than the getter.
 *
 * Only genuine **value reads** are rewritten. Every binding position is left
 * alone: member names, declaration bindings, property keys, parameter lists,
 * assignment targets, JSX attribute names and existing callees. The shorthand
 * expansion is narrower still — it needs a real object literal, so a
 * template-literal substitution (`` `${open}px` ``) and a JSX expression
 * container (`expanded={open}`) only have their read called.
 */
export function rewriteGetterReads(
  text: string,
  getters: ReadonlySet<string>,
): string {
  if (getters.size === 0) {
    return text;
  }
  return rewriteIdentifiers(text, (occurrence) => {
    const { name, before, after, bracket, bracketStart, previousWord } =
      occurrence;
    if (!getters.has(name)) {
      return undefined;
    }
    // `x.open` — the member side of a property access is not a read of `open`.
    if (before === "." || before === "#") {
      return undefined;
    }
    // `open(…)` — already a call; calling again would yield `open()()`.
    if (after === "(") {
      return undefined;
    }
    if (BINDING_KEYWORDS.has(previousWord)) {
      return undefined;
    }
    // `open = …` / `open={…}` / `open => …` — bound by the following `=`, never
    // read through it (`open === other` is a read and keeps its call).
    if (isEqualsBinding(text, occurrence.end)) {
      return undefined;
    }
    // `const [open, setOpen] = …` / `const { open } = …` — a binding pattern,
    // which a nested declaration reaches even when the statement as a whole is
    // a function.
    if (isDeclarationBinding(text, bracketStart)) {
      return undefined;
    }
    // `{ open: … }` / `(open: number, …)` — an object-literal key, a type member
    // or an annotated parameter, never a read.
    if (
      after === ":" &&
      (before === "{" ||
        before === "(" ||
        before === "," ||
        before === ";" ||
        before === "")
    ) {
      return undefined;
    }
    // `open?: string` — an optional member. A `?` that does **not** introduce a
    // type annotation opens a ternary, whose condition *is* a read
    // (`open ? 'yes' : 'no'`).
    if (after === "?" && isOptionalMember(text, occurrence.end)) {
      return undefined;
    }
    // `(open) => …` / `function build(open, …)` — a parameter binding, not a read.
    if (bracket === "(" && isParameterList(text, bracketStart)) {
      return undefined;
    }
    // `{ open }` / `{ open, … }` — object shorthand carries the value. A brace
    // that is not an object literal carries no shorthand, so only the read is
    // rewritten there.
    if (
      occurrence.braceKind === "object-literal" &&
      (before === "{" || before === ",") &&
      (after === "}" || after === ",")
    ) {
      return `${name}: ${name}()`;
    }
    return `${name}()`;
  });
}

/**
 * Apply the getter rewrite to a whole statement. A declaration's binding side is
 * left untouched — `const [open, setOpen] = createSignal(false)` must keep its
 * tuple names — so only the initializer is rewritten.
 */
export function rewriteStatementGetterReads(
  text: string,
  context: SolidLoweringContext,
): string {
  if (isTypeOnlyStatement(text)) {
    return text;
  }
  if (/^\s*(?:export\s+)?(?:const|let|var)\b/.test(text)) {
    const assignment = indexOfAssignment(text);
    if (assignment !== -1) {
      const initializer = text.slice(assignment + 1);
      return (
        text.slice(0, assignment + 1) +
        rewriteGetterReads(initializer, context.getters)
      );
    }
    return text;
  }
  return rewriteGetterReads(text, context.getters);
}
