import {
  type ElementScope,
  rewriteExpressionText,
} from "../transformers/expression.js";

import { generatedIdName } from "./head-analysis.js";
import {
  UNKNOWN_TYPE,
  type WebComponentsElementRef,
  type WebComponentsGeneratedId,
} from "./types.js";

import type {
  GenericComponent,
  SemanticModule,
  StateIntention,
} from "@mission-platform/forge-plugin-api";

/** Lower every `const <name> = useId();` in the component body into an instance field. */
export function loweredGeneratedIds(
  component: GenericComponent,
): WebComponentsGeneratedId[] {
  const ids: WebComponentsGeneratedId[] = [];
  for (const statement of component.body) {
    const name = generatedIdName(statement);
    if (name !== undefined) {
      ids.push({ name, type: "string" });
    }
  }
  return ids;
}

/** The declared, else literal-inferred, else `unknown` type of a state field. */
export function stateTypeOf(field: StateIntention): {
  type: string;
  declared: boolean;
} {
  const declared = field.type?.text.trim();
  if (declared !== undefined && declared.length > 0) {
    return { type: declared, declared: true };
  }
  const inferred = field.inferredType?.trim();
  if (inferred !== undefined && inferred.length > 0) {
    return { type: inferred, declared: true };
  }
  return { type: UNKNOWN_TYPE, declared: false };
}

/** The scopes and the deferral test a member seed is planned against. */
export interface SeedScopes {
  /** Rewriting scope for a constructor-position seed (props patterns inlined). */
  readonly field: ElementScope;
  /** Rewriting scope for a `setup()`-position seed (props patterns replayed). */
  readonly setup: ElementScope;
  /**
   * Whether the named member's constructor-position seed reads something only
   * `render()` holds. The implementation records a deferred member, so a seed
   * planned after it that reads it is deferred with it rather than reading a
   * cell nothing has filled yet.
   */
  readonly defer: (name: string, text: string) => boolean;
}

/** A member's seed: the text to emit, and the site it is emitted at. */
export interface SeedPlan {
  readonly text: string | undefined;
  readonly deferred: boolean;
}

/**
 * Resolve where a member's seed runs, and rewrite it for that site.
 *
 * The constructor form is the default; a seed that would read a render-head local
 * (or an already-deferred member) is rewritten for `setup()` instead, where a
 * statement slot exists and the props patterns can be replayed rather than
 * inlined as `this['name']` reads.
 */
export function planSeed(
  name: string,
  source: string | undefined,
  scopes: SeedScopes,
): SeedPlan {
  const trimmed = source?.trim();
  if (trimmed === undefined || trimmed.length === 0) {
    return { text: undefined, deferred: false };
  }
  const constructed = rewriteExpressionText(trimmed, scopes.field);
  return scopes.defer(name, constructed)
    ? { text: rewriteExpressionText(trimmed, scopes.setup), deferred: true }
    : { text: constructed, deferred: false };
}

/** Lower the component's refs into `{ current }` cells owned by the element. */
export function loweredElementRefs(
  module: SemanticModule,
  scopes: SeedScopes,
): WebComponentsElementRef[] {
  return module.intentions.refs.map((reference) => {
    const declared = reference.elementType?.text.trim();
    const elementType =
      declared === undefined || declared.length === 0 ? UNKNOWN_TYPE : declared;
    const seed = planSeed(reference.name, reference.initializer?.text, scopes);
    return {
      name: reference.name,
      elementType,
      initializer: seed.text ?? "undefined",
      deferred: seed.deferred,
    };
  });
}
