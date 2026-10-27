import {
  lowerDynamicNodes,
  lowerListKeys,
  lowerStaticSubtrees,
  type NormalizedDynamicPlan,
  type NormalizedListKeyPlan,
  type NormalizedStaticSubtreePlan,
} from "./dynamic.js";
import { lowerEventIntentions, type NormalizedEventPlan } from "./events.js";
import {
  canonicalizePropsContract,
  type NormalizedPropsContract,
} from "./props.js";
import { normalizeSetupContract } from "./setup.js";
import { synthesizeSlotPlans, type NormalizedSlotsContract } from "./slots.js";

import type { TargetFrameworkId, TargetLoweredModule } from "../framework.js";
import type { SemanticModule } from "../ir.js";

/**
 * Standard baseline lowered plan that framework plugins can embed or build upon.
 */
export interface BaseLoweredModule extends TargetLoweredModule {
  readonly framework: TargetFrameworkId;
  readonly propsContract: NormalizedPropsContract;
  readonly setupContract: ReturnType<typeof normalizeSetupContract>;
  readonly slotsContract: NormalizedSlotsContract;
  readonly events: readonly NormalizedEventPlan[];
  readonly dynamicNodes: readonly NormalizedDynamicPlan[];
  readonly listKeys: readonly NormalizedListKeyPlan[];
  readonly staticSubtrees: readonly NormalizedStaticSubtreePlan[];
}

/**
 * Creates a base lowered module executing shared prop normalization, slot synthesis,
 * event lowering, dynamic node extraction, and list key normalization.
 *
 * @param module - Semantic module from frontend IR.
 * @param framework - The target framework ID.
 * @returns Standard base lowered module.
 */
export function createBaseLoweredModule(
  module: SemanticModule,
  framework: TargetFrameworkId,
): BaseLoweredModule {
  return {
    framework,
    appliedOptimizations: [],
    propsContract: canonicalizePropsContract(module),
    setupContract: normalizeSetupContract(module),
    slotsContract: synthesizeSlotPlans(module),
    events: lowerEventIntentions(module),
    dynamicNodes: lowerDynamicNodes(module),
    listKeys: lowerListKeys(module),
    staticSubtrees: lowerStaticSubtrees(module),
  };
}

/**
 * Validates that a lowered module conforms to required structural invariants.
 *
 * @param lowered - The lowered module to check.
 * @throws {TypeError} If invariant contracts are violated.
 */
export function validateLoweredInvariants(lowered: TargetLoweredModule): void {
  if (!lowered || typeof lowered !== "object") {
    throw new TypeError("Lowered module must be a non-null object");
  }
  if (typeof lowered.framework !== "string" || lowered.framework.length === 0) {
    throw new TypeError(
      "Lowered module must define a valid framework identifier string",
    );
  }
}

export { validateSetupContract } from "./setup.js";
