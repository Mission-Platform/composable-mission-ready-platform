import { attributeStringValue, findAttribute, walkRenderNodes } from "../ir.js";

import type {
  GenericRenderNode,
  SemanticModule,
  SourceBackedExpression,
} from "../ir.js";

/**
 * Normalized descriptor for a component slot.
 */
export interface NormalizedSlotPlan {
  readonly name: string;
  readonly isDefault: boolean;
  readonly fallbackText?: string;
  readonly payload?: SourceBackedExpression;
}

/**
 * Normalized collection of all slots synthesised for a component.
 */
export interface NormalizedSlotsContract {
  readonly slots: readonly NormalizedSlotPlan[];
  readonly hasDefaultSlot: boolean;
  readonly hasNamedSlots: boolean;
  readonly slotNames: readonly string[];
}

/** Default slot name across all supported target frameworks. */
export const DEFAULT_SLOT_NAME = "default";

/**
 * Determines whether a slot name is the default slot.
 */
export function isDefaultSlotName(name: string): boolean {
  return name === DEFAULT_SLOT_NAME || name === "children" || name === "";
}

/**
 * Determines if a render node represents a slot placeholder tag (`<Slot>` or `<slot>`).
 */
export function isSlotRenderNode(node: GenericRenderNode): boolean {
  const tagName = typeof node.tag === "string" ? node.tag : undefined;
  return tagName === "Slot" || tagName === "slot";
}

/**
 * Synthesizes a unified slot contract for a `SemanticModule`.
 *
 * @param module - The semantic module to analyze.
 * @returns Normalized slot plan contract.
 */
export function synthesizeSlotPlans(
  module: SemanticModule,
): NormalizedSlotsContract {
  const slotMap = new Map<string, NormalizedSlotPlan>();

  // 1. Process explicit slot intentions from the semantic frontend
  for (const slot of module.intentions.slots) {
    const rawName = slot.name.trim();
    const isDefault = isDefaultSlotName(rawName);
    const canonicalName = isDefault ? DEFAULT_SLOT_NAME : rawName;

    if (!slotMap.has(canonicalName)) {
      slotMap.set(canonicalName, {
        name: canonicalName,
        isDefault,
        fallbackText: slot.fallback?.text,
      });
    }
  }

  // 2. Discover slot placeholders in the generic render tree
  walkRenderNodes(module.intentions.renderTree, (node) => {
    for (const attribute of node.attributes) {
      if (attribute.kind !== "slot-attribute") continue;
      const canonicalName = isDefaultSlotName(attribute.name)
        ? DEFAULT_SLOT_NAME
        : attribute.name;
      if (!slotMap.has(canonicalName)) {
        slotMap.set(canonicalName, {
          name: canonicalName,
          isDefault: canonicalName === DEFAULT_SLOT_NAME,
          payload: attribute.payload,
        });
      }
    }
    if (isSlotRenderNode(node)) {
      const rawName = attributeStringValue(node, "name") ?? "default";
      const isDefault = isDefaultSlotName(rawName);
      const canonicalName = isDefault ? DEFAULT_SLOT_NAME : rawName;

      if (!slotMap.has(canonicalName)) {
        const fallbackAttr = findAttribute(node, "fallback");
        let fallbackText: string | undefined;
        if (
          fallbackAttr &&
          fallbackAttr.kind === "jsx-attribute" &&
          fallbackAttr.value
        ) {
          if (fallbackAttr.value.kind === "string") {
            fallbackText = `"${fallbackAttr.value.value}"`;
          } else if (fallbackAttr.value.expression) {
            fallbackText = fallbackAttr.value.expression.text;
          }
        }

        slotMap.set(canonicalName, {
          name: canonicalName,
          isDefault,
          fallbackText,
        });
      }
    }
  });

  const slots = Array.from(slotMap.values());
  const hasDefaultSlot = slots.some((s) => s.isDefault);
  const hasNamedSlots = slots.some((s) => !s.isDefault);
  const slotNames = slots.map((s) => s.name);

  return {
    slots,
    hasDefaultSlot,
    hasNamedSlots,
    slotNames,
  };
}
