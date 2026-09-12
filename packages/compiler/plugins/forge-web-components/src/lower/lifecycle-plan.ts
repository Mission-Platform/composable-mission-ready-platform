import type { SemanticModule } from "@mission-platform/forge-plugin-api";
import {
  type ElementScope,
  rewriteExpressionText,
} from "../transformers/expression.js";
import {
  type HeadStatement,
  headReplay,
  replayedPropsBindings,
} from "./head-analysis.js";
import type { PropsBindingSite } from "./props-plan.js";
import type {
  WebComponentsCleanupField,
  WebComponentsLifecycleHook,
} from "./types.js";

export const CLEANUP_FIELD_PREFIX = "__mpCleanup";
export const CLEANUP_FIELD_TYPE = "(() => void) | undefined";

/** Invoke an effect callback while keeping recorded cleanup in its lexical scope. */
export function effectInvocation(body: string, cleanup: string | undefined): string {
  if (cleanup === undefined) {
    return `(${body})();`;
  }
  const trimmedBody = body.trim();
  const closingBrace = trimmedBody.lastIndexOf("}");
  const arrow = trimmedBody.indexOf("=>");
  if (
    arrow !== -1 &&
    closingBrace > arrow &&
    trimmedBody.slice(closingBrace + 1).trim() === ""
  ) {
    const bodyWithCleanup = `${trimmedBody.slice(0, closingBrace).trimEnd()} return ${cleanup}; ${trimmedBody.slice(closingBrace)}`;
    return `(${bodyWithCleanup})();`;
  }
  return `(() => { const result = (${body})(); return typeof result === "function" ? result : ${cleanup}; })()`;
}

/** The lifecycle callbacks and cleanup fields the component's effects lower to. */
export function loweredLifecycle(
  module: SemanticModule,
  scope: ElementScope,
  bindings: readonly PropsBindingSite[],
  head: readonly HeadStatement[],
): {
  lifecycle: WebComponentsLifecycleHook[];
  cleanupFields: WebComponentsCleanupField[];
} {
  const connected: string[] = [];
  const disconnected: string[] = [];
  const updated: string[] = [];
  const cleanupFields: WebComponentsCleanupField[] = [];
  const bodies: string[] = [];

  for (const [index, effect] of module.intentions.effects.entries()) {
    const body = rewriteExpressionText(effect.body.text.trim(), scope);
    const dependencies = effect.dependencies?.map((dependency) =>
      rewriteExpressionText(dependency.text.trim(), scope),
    );
    const dependencyField = `__mpEffectDeps${index}`;
    const nextDependencies = `nextDeps${index}`;
    bodies.push(body);
    // An effect that returns a teardown keeps it in a field so the element can
    // run it when it leaves the document; one that returns nothing is simply
    // invoked, so no field (and no `disconnectedCallback`) is generated.
    if (effect.cleanup === undefined) {
      connected.push(`(${body})();`);
      if (dependencies === undefined) {
        updated.push(`(${body})();`);
      } else if (dependencies.length > 0) {
        connected.splice(
          -1,
          0,
          `this.${dependencyField} = [${dependencies.join(", ")}];`,
        );
        updated.push(
          `const ${nextDependencies} = [${dependencies.join(", ")}];`,
          `if (!this.${dependencyField}?.every((value, index) => Object.is(value, ${nextDependencies}[index]))) {`,
          `  this.${dependencyField} = ${nextDependencies};`,
          `  (${body})();`,
          "}",
        );
      }
      continue;
    }
    const field = `${CLEANUP_FIELD_PREFIX}${index}`;
    cleanupFields.push({ name: field, type: CLEANUP_FIELD_TYPE });
    connected.push(
      `this.${field} = ${effectInvocation(body, rewriteExpressionText(effect.cleanup.text, scope))}`,
    );
    if (dependencies !== undefined && dependencies.length > 0) {
      connected.splice(
        -1,
        0,
        `this.${dependencyField} = [${dependencies.join(", ")}];`,
      );
    }
    disconnected.push(`this.${field}?.();`, `this.${field} = undefined;`);
    const rerun = [
      `this.${field}?.();`,
      `this.${field} = undefined;`,
      `this.${field} = ${effectInvocation(body, rewriteExpressionText(effect.cleanup.text, scope))}`,
    ];
    if (dependencies === undefined) {
      updated.push(...rerun);
    } else if (dependencies.length > 0) {
      updated.push(
        `const ${nextDependencies} = [${dependencies.join(", ")}];`,
        `if (!this.${dependencyField}?.every((value, index) => Object.is(value, ${nextDependencies}[index]))) {`,
        `  this.${dependencyField} = ${nextDependencies};`,
        ...rerun.map((statement) => `  ${statement}`),
        "}",
      );
    }
  }

  // Every effect body is an arrow declared *inside* the callback, so it closes
  // over the callback's own scope: replaying what it reads at the top of the
  // callback is enough to restore the locals it saw in the render body — the
  // props patterns, and any render-head constant that could not be promoted to a
  // member.
  const replayedHead =
    headReplay(
      head,
      bodies,
      new Set(bindings.flatMap((site) => [...site.binding.locals])),
    ) ?? [];
  const replay = replayedPropsBindings(bindings, [...bodies, ...replayedHead]);

  const lifecycle: WebComponentsLifecycleHook[] = [];
  if (connected.length > 0) {
    // `ForgeElement.connectedCallback` adopts attributes and renders, so the
    // generated override must chain to it before running any effect. The props
    // patterns come first, since a replayed head statement may read them.
    lifecycle.push({
      callback: "connectedCallback",
      callsSuper: true,
      statements: [...replay, ...replayedHead, ...connected],
    });
  }
  if (disconnected.length > 0) {
    // `HTMLElement` declares no `disconnectedCallback`, so this one stands alone.
    lifecycle.push({
      callback: "disconnectedCallback",
      callsSuper: true,
      statements: disconnected,
    });
  }
  if (updated.length > 0) {
    lifecycle.push({
      callback: "updatedCallback",
      callsSuper: true,
      statements: [...replay, ...replayedHead, ...updated],
    });
  }
  return { lifecycle, cleanupFields };
}
