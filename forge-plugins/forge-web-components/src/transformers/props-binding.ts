/**
 * Analysis of a **props object pattern** — the `{ … }` a component destructures
 * its props into, either in the parameter (`function C({ a, b = 1 }: P)`) or in
 * the body (`const { a, b = 1 } = properties;`).
 *
 * The neutral frontend only reports a prop when the *parameter* declares it, so
 * a component that takes a whole props object and destructures it in the body
 * used to contribute no reactive properties at all: the generated element got no
 * `static properties` map and no fields, its attributes were never adopted, and
 * `const { a } = this;` did not typecheck. This module recovers those members.
 *
 * Two facts about each entry matter, and they are different:
 * - the **member** it reads off the props object (`format` in
 *   `{ format: alias = 'dd' }`) — that is the reactive property, and the
 *   observed attribute;
 * - the **locals** it binds (`alias`) — those shadow the element's fields, so a
 *   bare read of `alias` must *not* be rewritten to `this.alias`.
 *
 * The pattern text is therefore kept verbatim and replayed as
 * `const { … } = this;` wherever those locals are read (the render head, and
 * every scope lifted out of it — a lifecycle callback, a memo getter). Replaying
 * it, rather than rewriting each read to `this.<name>`, is what preserves the
 * pattern's own semantics exactly: defaults (`b = 1`), renames, nested patterns
 * and rest elements all keep working, and no field needs an initializer — which
 * matters because a generated field initializer would shadow the reactive
 * prototype accessor `ForgeElement` installs and silently break reactivity.
 */
import {
  matchingBracket,
  splitTopLevel,
  topLevelAssignmentIndex,
} from "./expression.js";

/** One entry of a props object pattern. */
export interface PropsBindingEntry {
  /** The props member the entry reads, or `undefined` for a rest element. */
  readonly member: string | undefined;
  /** Every local name the entry introduces (more than one for a nested pattern). */
  readonly locals: readonly string[];
  /** The entry's default expression text (`0.15` in `threshold = 0.15`), when it has one. */
  readonly defaultValue?: string;
  /** The entry's source text, verbatim, so it can be replayed unchanged. */
  readonly text: string;
}

/** A props object pattern, decomposed into the members it reads and the locals it binds. */
export interface PropsBinding {
  readonly entries: readonly PropsBindingEntry[];
  /** The props members the pattern reads, in source order. */
  readonly members: readonly string[];
  /** Every local name the pattern binds. */
  readonly locals: readonly string[];
}

/** A rest element binds the remaining members, so it has no single member name. */
const REST_PREFIX = "...";

/** Whether `text` is a single plain identifier. */
function isIdentifier(text: string): boolean {
  return /^[A-Za-z_$][\w$]*$/.test(text);
}

/** The member name a pattern key denotes, unquoting a string key. */
function keyName(text: string): string | undefined {
  const key = text.trim();
  if (isIdentifier(key)) {
    return key;
  }
  const quoted = /^(['"])([^'"]*)\1$/.exec(key);
  return quoted?.[2];
}

/** The `{ … }` / `[ … ]` pattern body of `text`, or `undefined` when it is not one. */
function patternBody(text: string): string | undefined {
  const trimmed = text.trim();
  const open = trimmed[0];
  if (open !== "{" && open !== "[") {
    return undefined;
  }
  // Only a pattern that spans the whole text is one; `{ a } && b` is not.
  return matchingBracket(trimmed, 0) === trimmed.length - 1
    ? trimmed.slice(1, -1)
    : undefined;
}

/**
 * Every local name a (possibly nested) binding target introduces.
 *
 * Returns `undefined` for a shape this module does not model, so the caller can
 * fall back rather than emit a half-understood pattern.
 */
function targetLocals(text: string): string[] | undefined {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return [];
  }
  if (isIdentifier(trimmed)) {
    return [trimmed];
  }
  const body = patternBody(trimmed);
  if (body === undefined) {
    return undefined;
  }
  const locals: string[] = [];
  for (const part of splitTopLevel(body, ",")) {
    const entry = parseEntry(part);
    if (entry === undefined) {
      return undefined;
    }
    locals.push(...entry.locals);
  }
  return locals;
}

/** Decompose one comma-separated pattern entry. */
function parseEntry(text: string): PropsBindingEntry | undefined {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  if (trimmed.startsWith(REST_PREFIX)) {
    const rest = trimmed.slice(REST_PREFIX.length).trim();
    return isIdentifier(rest)
      ? { member: undefined, locals: [rest], text: trimmed }
      : undefined;
  }

  // Strip a default (`b = 1`); the default is an expression, never a binding.
  const assignment = topLevelAssignmentIndex(trimmed);
  const binding = (
    assignment === -1 ? trimmed : trimmed.slice(0, assignment)
  ).trim();
  const defaultValue =
    assignment === -1 ? undefined : trimmed.slice(assignment + 1).trim();

  const colon = splitTopLevel(binding, ":");
  if (colon.length > 2) {
    return undefined;
  }
  if (colon.length === 1) {
    return isIdentifier(binding)
      ? { member: binding, locals: [binding], defaultValue, text: trimmed }
      : undefined;
  }

  const member = keyName(colon[0] ?? "");
  const locals = targetLocals(colon[1] ?? "");
  if (member === undefined || locals === undefined) {
    return undefined;
  }
  return { member, locals, defaultValue, text: trimmed };
}

/**
 * The object pattern that *starts* `text`, discarding whatever follows.
 *
 * A parameter's source text carries its annotation (`{ a, b }: Readonly<P>`),
 * so the pattern has to be cut out before it can be decomposed.
 */
export function leadingObjectPattern(text: string): string | undefined {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{")) {
    return undefined;
  }
  const close = matchingBracket(trimmed, 0);
  return close <= 0 ? undefined : trimmed.slice(0, close + 1);
}

/**
 * Decompose a props object pattern.
 *
 * Returns `undefined` when the text is not an object pattern, or contains an
 * entry this module does not model (a computed key, say) — the caller then keeps
 * its previous behaviour instead of acting on a partial reading.
 */
export function parsePropsBinding(
  patternText: string,
): PropsBinding | undefined {
  const trimmed = patternText.trim();
  if (!trimmed.startsWith("{")) {
    return undefined;
  }
  const body = patternBody(trimmed);
  if (body === undefined) {
    return undefined;
  }
  const entries: PropsBindingEntry[] = [];
  for (const part of splitTopLevel(body, ",")) {
    if (part.trim().length === 0) {
      continue;
    }
    const entry = parseEntry(part);
    if (entry === undefined) {
      return undefined;
    }
    entries.push(entry);
  }
  if (entries.length === 0) {
    return undefined;
  }
  return {
    entries,
    members: [
      ...new Set(
        entries.flatMap((entry) =>
          entry.member === undefined ? [] : [entry.member],
        ),
      ),
    ],
    locals: [...new Set(entries.flatMap((entry) => entry.locals))],
  };
}

/**
 * Replay a props pattern as `const { … } = this;`, restricted to the entries
 * whose locals the target scope actually reads.
 *
 * Restricting it keeps a lifted scope free of bindings it never uses (which a
 * `noUnusedLocals` build would reject) while leaving each retained entry — and
 * so its default — byte-identical to the authored one.
 */
export function propsBindingStatement(
  binding: PropsBinding,
  isRead: (name: string) => boolean,
): string | undefined {
  const entries = binding.entries.filter((entry) =>
    entry.locals.some((local) => isRead(local)),
  );
  return entries.length === 0
    ? undefined
    : `const { ${entries.map((entry) => entry.text).join(", ")} } = this;`;
}
