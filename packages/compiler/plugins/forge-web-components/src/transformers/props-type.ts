/**
 * Resolution of the component's own **props type** into the indexed-access
 * annotations the generated element's reactive fields carry.
 *
 * A neutral component states its inputs once, as the named interface (or type
 * alias) its props parameter is annotated with — `function ForgeButton(properties:
 * ButtonProperties)`. That declaration is retained verbatim in the generated
 * module, so the element class can point straight back at it:
 *
 * ```ts
 * variant: ButtonProperties['variant'];
 * ```
 *
 * which is exact (an optional member already yields `T | undefined`), keeps
 * doc comments and unions in one place, and stays correct when the interface
 * changes — no per-prop type reconstruction, and never `unknown`.
 *
 * A **required** member is widened with `| undefined`, because the field it is
 * emitted on genuinely is: `ForgeElement` populates a reactive property from its
 * observed attribute *after* construction, so nothing assigns it in the
 * constructor. An optional member needs no widening — the indexed access
 * already admits `undefined`.
 *
 * Two things must hold before that reference is emitted, and both are checked
 * here: the annotation must reduce to a **plain name** (`Readonly<…>`,
 * `Partial<…>` and parentheses are unwrapped), and that name must belong to a
 * declaration this module retains, whose body must actually declare the member.
 * A prop that is only discovered from a `properties.<x>` read — one the props
 * interface never declares, say — is not a member of the retained text, so the
 * caller falls back to its own resolution rather than emitting a dangling
 * reference.
 *
 * Member detection is deliberately conservative: only a member that follows the
 * opening `{`, a `;` or a `,` at the type's top level is recognised, so a
 * multi-line function type or a nested generic can never contribute a bogus
 * name. Missing a member costs the fallback annotation; inventing one would
 * cost a type error in the generated module.
 */

import type { GenericStatement } from "@mission-platform/forge-plugin-api";

/** Statement kinds that can declare a named props type in the generated module. */
const TYPE_DECLARATION_KINDS: ReadonlySet<GenericStatement["statementKind"]> =
  new Set(["interface", "type-alias"]);

/**
 * Generic wrappers that are transparent for member lookup: both preserve the
 * member set of their argument, so `Readonly<ButtonProperties>['variant']` and
 * `ButtonProperties['variant']` name the same type (modulo `readonly`/optional
 * modifiers, which a field annotation does not carry anyway).
 */
const TRANSPARENT_TYPE_WRAPPERS: ReadonlySet<string> = new Set([
  "Partial",
  "Readonly",
]);

/** A plain, referenceable type name. */
const PLAIN_TYPE_NAME = /^[A-Za-z_$][\w$]*$/;

/** `Wrapper<inner>` spanning the whole type text. */
const WRAPPED_TYPE = /^([A-Za-z_$][\w$]*)\s*<([\S\s]*)>$/;

/** A type member's name and its optionality, at a position where a member may start. */
const TYPE_MEMBER = /^(?:readonly\s+)?([A-Za-z_$][\w$]*)\s*(\?)?\s*[(:<]/;

/** The props type a component's fields can be annotated against. */
export interface PropsTypeReference {
  /** The retained declaration's name, as written in the generated module. */
  readonly name: string;
  /** The members the retained declaration itself declares, mapped to their optionality. */
  readonly members: ReadonlyMap<string, boolean>;
}

/** Whether the bracket opened at `text[start]` closes at the very end of `text`. */
function spansWholeText(text: string, open: string, close: string): boolean {
  let depth = 0;
  for (const [index, char] of [...text].entries()) {
    if (char === open) {
      depth += 1;
      continue;
    }
    if (char === close) {
      depth -= 1;
      if (depth === 0) {
        return index === text.length - 1;
      }
    }
  }
  return false;
}

/**
 * Reduce a props annotation to the plain name it references, unwrapping the
 * parentheses and member-preserving generic wrappers a component may write.
 */
export function unwrapPropsTypeName(
  text: string | undefined,
): string | undefined {
  let current = text?.trim() ?? "";
  // Each pass peels one layer; the bound only guards against pathological input.
  for (let pass = 0; pass < 8; pass += 1) {
    if (PLAIN_TYPE_NAME.test(current)) {
      return current;
    }
    if (current.startsWith("(") && spansWholeText(current, "(", ")")) {
      current = current.slice(1, -1).trim();
      continue;
    }
    const wrapped = WRAPPED_TYPE.exec(current);
    if (wrapped === null || !TRANSPARENT_TYPE_WRAPPERS.has(wrapped[1] ?? "")) {
      return undefined;
    }
    current = (wrapped[2] ?? "").trim();
  }
  return undefined;
}

/** Blank out comments so their prose can never look like a member declaration. */
function withoutComments(text: string): string {
  // Newlines are preserved so the blanked span keeps the original layout.
  return text.replace(/\/\*[\S\s]*?\*\/|\/\/[^\n]*/g, (comment) =>
    comment.replace(/[^\n]/g, " "),
  );
}

/**
 * The members a retained interface/type-alias body declares, mapped to whether
 * each one is optional (`name?: T`).
 *
 * Only members at the top level of the first `{…}` body are collected, and only
 * where a member may legitimately start (right after the opening brace, a `;`
 * or a `,`). Members contributed by an `extends`/`&` base are therefore *not*
 * reported — the caller treats them as unknown and falls back, which is the
 * safe direction.
 */
export function typeMembers(
  declarationText: string,
): ReadonlyMap<string, boolean> {
  const text = withoutComments(declarationText);
  const start = text.indexOf("{");
  const names = new Map<string, boolean>();
  if (start === -1) {
    return names;
  }
  let depth = 0;
  let memberStart = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index] ?? "";
    if (char === "{" || char === "(" || char === "[" || char === "<") {
      depth += 1;
      memberStart = depth === 1;
      continue;
    }
    // The `>` of an arrow closes nothing — it is part of `=>`.
    if (
      char === "}" ||
      char === ")" ||
      char === "]" ||
      (char === ">" && text[index - 1] !== "=")
    ) {
      depth -= 1;
      if (depth === 0) {
        break;
      }
      continue;
    }
    if (depth !== 1) {
      continue;
    }
    if (char === ";" || char === ",") {
      memberStart = true;
      continue;
    }
    if (/\s/.test(char)) {
      continue;
    }
    if (!memberStart) {
      continue;
    }
    memberStart = false;
    const member = TYPE_MEMBER.exec(text.slice(index));
    if (member?.[1] !== undefined) {
      names.set(member[1], member[2] === "?");
    }
  }
  return names;
}

/**
 * Resolve the props annotation against the module's retained declarations.
 *
 * Returns `undefined` when the annotation is not a plain name, or when no
 * interface / type alias of that name is retained beside the element class —
 * in either case the reference would not resolve in the generated module.
 */
export function resolvePropsTypeReference(
  annotation: string | undefined,
  declarations: readonly GenericStatement[],
): PropsTypeReference | undefined {
  const name = unwrapPropsTypeName(annotation);
  if (name === undefined) {
    return undefined;
  }
  const declaration = declarations.find(
    (candidate) =>
      candidate.name === name &&
      TYPE_DECLARATION_KINDS.has(candidate.statementKind),
  );
  if (declaration === undefined) {
    return undefined;
  }
  return { name, members: typeMembers(declaration.text.text) };
}

/**
 * The indexed-access annotation a member of the props type is emitted as.
 *
 * The member's own optionality is kept exactly: a required member is *not*
 * widened with `| undefined`. The element's field is only populated once the
 * runtime adopts its attribute, so it is genuinely unset in the constructor —
 * but that is expressed by emitting the field as `declare` (the runtime owns the
 * accessor), which exempts it from `strictPropertyInitialization` without making
 * every read of a required prop possibly-`undefined`.
 */
export function indexedAccessType(
  reference: PropsTypeReference,
  member: string,
): string {
  return `${reference.name}['${member}']`;
}
