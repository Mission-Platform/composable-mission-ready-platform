import {
  isFunctionExpressionText,
  isPureExpressionText,
  matchingBracket,
  splitTopLevel,
  topLevelAssignmentIndex,
} from "../transformers/expression.js";
import { propsBindingStatement } from "../transformers/props-binding.js";

import { referencesIdentifier, referencesLocal } from "./identifier.js";

import type { PropsBindingSite } from "./props-plan.js";
import type { GenericStatement } from "@mission-platform/forge-plugin-api";

const LIFTED_HOOK_DECLARATION = /\buse(?:State|Ref|Memo)\s*[(<]/;
const LIFTED_HOOK_EFFECT = /\buseEffect\s*\(/;
const GENERATED_ID_DECLARATION =
  /^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::\s*[^=]+)?=\s*useId\s*\(\s*\)\s*;?$/;

/** Whether a component-body statement is a hook lifted into a field or lifecycle callback. */
export function isHookStatement(statement: GenericStatement): boolean {
  const text = statement.text.text;
  if (statement.statementKind === "variable") {
    return (
      LIFTED_HOOK_DECLARATION.test(text) ||
      generatedIdName(statement) !== undefined
    );
  }
  return (
    statement.statementKind === "expression" && LIFTED_HOOK_EFFECT.test(text)
  );
}

/** The name a `const <name> = useId();` statement binds, when it has that exact shape. */
export function generatedIdName(
  statement: GenericStatement,
): string | undefined {
  if (statement.statementKind !== "variable") {
    return undefined;
  }
  return GENERATED_ID_DECLARATION.exec(statement.text.text.trim())?.[1];
}

/** Whether a component-body statement is a pure no-op (`void x;`, empty) that never affects render. */
export function isNoOpStatement(statement: GenericStatement): boolean {
  const text = statement.text.text.trim();
  if (text.length === 0 || text === ";") {
    return true;
  }
  return statement.statementKind === "expression" && /^void\b/.test(text);
}

/**
 * Replay the props patterns a lifted scope reads as `const { … } = this;`.
 *
 * A memo getter and a lifecycle callback are lifted *out* of the render body, so
 * the locals the pattern bound there no longer exist. Re-stating the pattern
 * against the element restores them with their original defaults, which is why
 * the reads themselves are left bare rather than rewritten to `this.<member>`.
 */
export function replayedPropsBindings(
  sites: readonly PropsBindingSite[],
  texts: readonly string[],
): string[] {
  const isRead = (name: string): boolean =>
    texts.some((text) => referencesIdentifier(text, name));
  return sites.flatMap((site) => {
    const statement = propsBindingStatement(site.binding, isRead);
    return statement === undefined ? [] : [statement];
  });
}

/**
 * The alias map for a **field-initializer** position.
 *
 * A class field initializer has no statement slot in front of it, so a props
 * pattern cannot be replayed there — `useRef(clamp(modelValue, min, max))`
 * lowers to a field whose initializer still reads the pattern's locals. Each
 * single-name entry therefore maps to its member read with the default folded
 * in, which is the one place the default has to be inlined rather than replayed.
 */
export function fieldInitializerAliases(
  sites: readonly PropsBindingSite[],
): Map<string, string> {
  const aliases = new Map<string, string>();
  for (const site of sites) {
    for (const entry of site.binding.entries) {
      const local = entry.locals.length === 1 ? entry.locals[0] : undefined;
      if (
        entry.member === undefined ||
        local === undefined ||
        aliases.has(local)
      ) {
        continue;
      }
      const read = `this['${entry.member}']`;
      aliases.set(
        local,
        entry.defaultValue === undefined
          ? read
          : `(${read} ?? ${entry.defaultValue})`,
      );
    }
  }
  return aliases;
}

/**
 * The `const <name> = <initializer>;` a render-head statement declares, when it
 * has exactly that shape.
 */
export function headConstant(
  statement: GenericStatement,
): { name: string; initializer: string } | undefined {
  const text = statement.text.text.trim();
  const keyword = /^const\s+/.exec(text);
  if (statement.statementKind !== "variable" || keyword === null) {
    return undefined;
  }
  const body = text.slice(keyword[0].length).replace(/;$/, "");
  if (splitTopLevel(body, ",").length > 1) {
    return undefined;
  }
  const assignment = topLevelAssignmentIndex(body);
  if (assignment < 0) {
    return undefined;
  }
  const name = /^([A-Za-z_$][\w$]*)\s*(?::[\S\s]+)?$/.exec(
    body.slice(0, assignment).trim(),
  )?.[1];
  const initializer = body.slice(assignment + 1).trim();
  return name === undefined || initializer.length === 0
    ? undefined
    : { name, initializer };
}

/**
 * Every name a render-head statement binds.
 */
export function declaredHeadNames(statement: GenericStatement): string[] {
  if (
    statement.statementKind === "function" ||
    statement.statementKind === "class"
  ) {
    return statement.name === undefined ? [] : [statement.name];
  }
  return statement.statementKind === "variable"
    ? declaredNamesOfText(statement.text.text)
    : [];
}

/**
 * Every name a **planned** head statement text binds.
 */
export function declaredNamesOfText(text: string): string[] {
  const trimmed = text.trim();
  const declaration = /^(?:function|class)\s+([A-Za-z_$][\w$]*)/.exec(trimmed);
  if (declaration?.[1] !== undefined) {
    return [declaration[1]];
  }
  const keyword = /^(?:const|let|var)\s+/.exec(trimmed);
  if (keyword === null) {
    return [];
  }
  const names: string[] = [];
  for (const declarator of splitTopLevel(
    trimmed.slice(keyword[0].length).replace(/;$/, ""),
    ",",
  )) {
    const assignment = topLevelAssignmentIndex(declarator);
    const binding = (
      assignment < 0 ? declarator : declarator.slice(0, assignment)
    ).trim();
    const simple = /^([A-Za-z_$][\w$]*)\s*(?::[\S\s]+)?$/.exec(binding)?.[1];
    if (simple !== undefined) {
      names.push(simple);
      continue;
    }
    if (/^[[{]/.test(binding)) {
      names.push(
        ...patternNames(binding.slice(0, matchingBracket(binding, 0) + 1)),
      );
    }
  }
  return names;
}

/**
 * Every name a destructuring pattern **binds**.
 */
export function patternNames(pattern: string): string[] {
  const names: string[] = [];
  for (const element of splitTopLevel(pattern.slice(1, -1), ",")) {
    const assignment = topLevelAssignmentIndex(element);
    const binding = (assignment < 0 ? element : element.slice(0, assignment))
      .replace(/^\s*\.{3}/, "")
      .trim();
    if (binding.length === 0) {
      continue;
    }
    const keyed = splitTopLevel(binding, ":");
    const bound = (
      keyed.length > 1 ? keyed.slice(1).join(":") : binding
    ).trim();
    if (/^[[{]/.test(bound)) {
      names.push(
        ...patternNames(bound.slice(0, matchingBracket(bound, 0) + 1)),
      );
      continue;
    }
    const name = /^([A-Za-z_$][\w$]*)/.exec(bound)?.[1];
    if (name !== undefined) {
      names.push(name);
    }
  }
  return names;
}

/** A render-head constant that may become a member, and how it would be emitted. */
export interface PromotionCandidate {
  readonly name: string;
  readonly initializer: string;
  readonly kind: "field" | "getter";
}

/**
 * Decide which render-head constants are promoted to element members.
 */
export function promotedHeadLocals(
  head: readonly GenericStatement[],
  liftedTexts: readonly string[],
  members: ReadonlySet<string>,
  replayableLocals: ReadonlySet<string>,
  aliasedLocals: ReadonlySet<string>,
): PromotionCandidate[] {
  const candidates = new Map<string, PromotionCandidate>();
  const headNames = new Set<string>();
  for (const statement of head) {
    for (const name of declaredHeadNames(statement)) {
      headNames.add(name);
    }
  }
  for (const statement of head) {
    const constant = headConstant(statement);
    if (
      constant === undefined ||
      members.has(constant.name) ||
      candidates.has(constant.name)
    ) {
      continue;
    }
    const kind = isFunctionExpressionText(constant.initializer)
      ? "field"
      : isPureExpressionText(constant.initializer)
        ? "getter"
        : undefined;
    if (kind !== undefined) {
      candidates.set(constant.name, { ...constant, kind });
    }
  }

  const promoted = new Set<string>();
  for (const name of candidates.keys()) {
    if (liftedTexts.some((text) => referencesLocal(text, name))) {
      promoted.add(name);
    }
  }

  const rejected = new Set<string>();
  let settled = false;
  while (!settled) {
    settled = true;
    for (const [name, candidate] of candidates) {
      if (!promoted.has(name)) {
        continue;
      }
      if (rejected.has(name)) {
        promoted.delete(name);
        settled = false;
        continue;
      }
      const reachable =
        candidate.kind === "field" ? aliasedLocals : replayableLocals;
      for (const local of headNames) {
        if (
          local === name ||
          reachable.has(local) ||
          !referencesLocal(candidate.initializer, local)
        ) {
          continue;
        }
        if (candidates.has(local) && !rejected.has(local)) {
          if (!promoted.has(local)) {
            promoted.add(local);
            settled = false;
          }
          continue;
        }
        rejected.add(name);
        promoted.delete(name);
        settled = false;
        break;
      }
    }
  }

  return [...candidates.values()].filter((candidate) =>
    promoted.has(candidate.name),
  );
}

/** A planned render-head statement and the names it declares. */
export interface HeadStatement {
  readonly text: string;
  readonly declares: readonly string[];
}

/**
 * Whether a head statement can be **replayed** in another scope.
 */
export function isReplayableHeadStatement(text: string): boolean {
  return /^(?:const|function)\s/.test(text.trim());
}

/** Pair each planned head statement with the names it declares. */
export function plannedHeadStatements(
  head: readonly string[],
): HeadStatement[] {
  return head.map((text) => ({ text, declares: declaredNamesOfText(text) }));
}

/**
 * The head statements a scope outside `render()` must replay to evaluate `texts`.
 */
export function headReplay(
  head: readonly HeadStatement[],
  texts: readonly string[],
  restored: ReadonlySet<string>,
): readonly string[] | undefined {
  const declared = new Set(
    head.flatMap((statement) => [...statement.declares]),
  );
  const wanted = new Set<string>();
  const chosen = new Set<number>();
  const pending = [...texts];
  while (pending.length > 0) {
    const text = pending.pop() ?? "";
    for (const name of declared) {
      if (wanted.has(name) || !referencesLocal(text, name)) {
        continue;
      }
      wanted.add(name);
      if (restored.has(name)) {
        continue;
      }
      const index = head.findIndex((statement) =>
        statement.declares.includes(name),
      );
      const statement = head[index];
      if (
        statement === undefined ||
        !isReplayableHeadStatement(statement.text)
      ) {
        return undefined;
      }
      if (!chosen.has(index)) {
        chosen.add(index);
        pending.push(statement.text);
      }
    }
  }
  return [...chosen]
    .sort((first, second) => first - second)
    .map((index) => head[index]?.text ?? "");
}
