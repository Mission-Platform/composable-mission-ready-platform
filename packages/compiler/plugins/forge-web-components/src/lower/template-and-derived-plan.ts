import {
  type ElementScope,
  rewriteExpressionText,
  splitArrowFactoryBody,
} from "../transformers/expression.js";
import {
  lowerStatementText,
  type TemplateContext,
} from "../transformers/template.js";

import { replayedPropsBindings } from "./head-analysis.js";

import type { PropsBindingSite } from "./props-plan.js";
import type {
  WebComponentsDerivedBody,
  WebComponentsDerivedValue,
} from "./types.js";
import type { SemanticModule } from "@mission-platform/forge-plugin-api";

/** The name of the module-level constant a hoisted static template is bound to. */
export const STATIC_TEMPLATE_PREFIX = "__mpStaticTpl";

/** The module-level constant name of the nth hoisted static template. */
export function staticTemplateName(index: number): string {
  return `${STATIC_TEMPLATE_PREFIX}_${index}`;
}

/**
 * Split a block body into the dedented lines the emitter re-indents into the
 * getter, so a factory's original indentation does not leak into the class.
 */
export function blockBodyLines(text: string): string[] {
  const lines = text.split("\n");
  while (lines.length > 0 && (lines[0] ?? "").trim().length === 0) {
    lines.shift();
  }
  while (lines.length > 0 && (lines.at(-1) ?? "").trim().length === 0) {
    lines.pop();
  }
  const indents = lines
    .filter((line) => line.trim().length > 0)
    .map((line) => line.length - line.trimStart().length);
  const shift = indents.length === 0 ? 0 : Math.min(...indents);
  return lines.map((line) =>
    line.trim().length === 0 ? "" : line.slice(shift),
  );
}

/**
 * The getter body a memo factory lowers to.
 */
export function derivedBody(
  factoryText: string,
  scope: ElementScope,
  bindings: readonly PropsBindingSite[],
): WebComponentsDerivedBody {
  const factory = factoryText.trim();
  const split = splitArrowFactoryBody(factory);
  const lowered =
    split === undefined
      ? {
          kind: "expression" as const,
          text: rewriteExpressionText(`(${factory})()`, scope),
        }
      : { kind: split.kind, text: rewriteExpressionText(split.text, scope) };

  // The getter is lifted out of `render()`, so any props pattern it reads has to
  // be re-stated against the element before its statements run.
  const replay = replayedPropsBindings(bindings, [lowered.text]);
  if (lowered.kind === "block") {
    return {
      kind: "block",
      statements: [...replay, ...blockBodyLines(lowered.text)],
    };
  }
  if (replay.length === 0) {
    return { kind: "expression", expression: lowered.text };
  }
  return { kind: "block", statements: [...replay, `return ${lowered.text};`] };
}

/** Lower the component's memos into recomputed getters. */
export function loweredDerived(
  module: SemanticModule,
  scope: ElementScope,
  bindings: readonly PropsBindingSite[],
): WebComponentsDerivedValue[] {
  return module.intentions.memos.map((memo) => ({
    name: memo.name,
    body: derivedBody(memo.factory.text, scope, bindings),
    dependencies: memo.dependencies?.map((dependency) =>
      rewriteExpressionText(dependency.text, scope),
    ),
  }));
}

export function lowerDynamicElementCalls(text: string): string {
  return text.replace(/\bh\s*\(/gu, "dynamicElement(");
}

export function lowerRootDynamicElement(text: string): string {
  const lowered = lowerDynamicElementCalls(text);
  if (/^dynamicElement\(/u.test(lowered.trim())) {
    return `\${${lowered}}`;
  }
  const wrapped = /^html`\$\{(dynamicElement\([\s\S]*\))\}`$/u.exec(
    lowered.trim(),
  );
  return wrapped?.[1] === undefined ? lowered : `\${${wrapped[1]}}`;
}

/** Lower retained neutral dynamic-element calls to the native runtime helper. */
export function lowerRetainedDeclarations(
  module: SemanticModule,
  context: TemplateContext,
): string[] {
  return module.ast.declarations.map((declaration) =>
    lowerStatementText(
      declaration.text.text,
      declaration.renderNodes,
      context,
    ).replace(/\bh\s*\(/gu, "dynamicElement("),
  );
}
