import { MP_STATIC_ATTR } from "../compiler/optimize.js";
import { attributeStringValue, findAttribute, walkRenderNodes } from "../ir.js";

import type { SemanticModule, SourceSpan } from "../ir.js";

/**
 * Normalized descriptor for a dynamic node `<Dynamic is={...}>`.
 */
export interface NormalizedDynamicPlan {
  readonly expression: string;
}

/**
 * Normalized descriptor for a list key binding.
 */
export interface NormalizedListKeyPlan {
  readonly source: string;
  readonly key?: string;
  readonly stable: boolean;
}

/**
 * Normalized descriptor for a hoisted static subtree.
 */
export interface NormalizedStaticSubtreePlan {
  readonly span: SourceSpan;
  readonly identifier?: string;
}

/**
 * Lowers dynamic node intentions and render tree `<Dynamic>` tags.
 */
export function lowerDynamicNodes(
  module: SemanticModule,
): readonly NormalizedDynamicPlan[] {
  const expressions = new Set<string>();

  for (const node of module.intentions.dynamicNodes) {
    if (node.expression.text) {
      expressions.add(node.expression.text.trim());
    }
  }

  walkRenderNodes(module.intentions.renderTree, (node) => {
    const tagName = typeof node.tag === "string" ? node.tag : undefined;
    if (tagName === "Dynamic") {
      const isAttr =
        findAttribute(node, "is") ?? findAttribute(node, "component");
      if (isAttr && isAttr.kind === "jsx-attribute" && isAttr.value) {
        if (isAttr.value.kind === "expression" && isAttr.value.expression) {
          expressions.add(isAttr.value.expression.text.trim());
        } else if (isAttr.value.kind === "string") {
          expressions.add(`"${isAttr.value.value}"`);
        }
      }
    }
  });

  return Array.from(expressions).map((expression) => ({ expression }));
}

/**
 * Lowers list key candidates from `SemanticModule`.
 */
export function lowerListKeys(
  module: SemanticModule,
): readonly NormalizedListKeyPlan[] {
  return module.intentions.listKeys.map((lk) => ({
    source: lk.source.text,
    key: lk.key?.text,
    stable: lk.stable,
  }));
}

/**
 * Lowers static subtree candidates marked with `mp-static`.
 */
export function lowerStaticSubtrees(
  module: SemanticModule,
): readonly NormalizedStaticSubtreePlan[] {
  const plans: NormalizedStaticSubtreePlan[] = [];

  for (const span of module.intentions.staticSubtrees) {
    plans.push({ span });
  }

  walkRenderNodes(module.intentions.renderTree, (node) => {
    const staticAttr = findAttribute(node, MP_STATIC_ATTR);
    if (staticAttr) {
      plans.push({
        span: node.span,
        identifier: attributeStringValue(node, MP_STATIC_ATTR),
      });
    }
  });

  return plans;
}
