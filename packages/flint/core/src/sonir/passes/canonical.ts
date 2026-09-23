import type { LowLevelSonModule, LowLevelSonNode } from '../low-level/dialect.js';

/**
 * Result report from running whole-module canonicalization passes.
 */
export interface CanonicalPassReport {
  readonly gvnDeduplicated: number;
  readonly sccpConstantsPropagated: number;
  readonly rleEliminatedLoads: number;
}

/** Computes a canonical hash string for value node deduplication. */
function computeValueHash(node: LowLevelSonNode): string {
  return `${node.opcode}:${node.type ?? ''}:${node.valueInputs.join(',')}:${String(node.constantValue ?? '')}`;
}

/**
 * Executes Global Value Numbering (GVN) over pure value nodes in a Low-Level SonIR module.
 */
export function runDominatorGvnPass(module: LowLevelSonModule): {
  readonly module: LowLevelSonModule;
  readonly deduplicatedCount: number;
} {
  const canonical = new Map<string, number>();
  const remap = new Map<number, number>();
  let deduplicatedCount = 0;

  for (const node of module.nodes) {
    if (node.opcode.startsWith('val.') && node.memoryInputs.length === 0) {
      const key = computeValueHash(node);
      const existing = canonical.get(key);
      if (existing !== undefined) {
        remap.set(node.id, existing);
        deduplicatedCount += 1;
        continue;
      }
      canonical.set(key, node.id);
    }
  }

  const resolveTarget = (id: number): number => remap.get(id) ?? id;

  const filteredNodes: LowLevelSonNode[] = [];
  for (const node of module.nodes) {
    if (remap.has(node.id)) continue;
    filteredNodes.push({
      ...node,
      valueInputs: node.valueInputs.map((input) => resolveTarget(input)),
      memoryInputs: node.memoryInputs.map((input) => resolveTarget(input)),
      controlInputs: node.controlInputs.map((input) => resolveTarget(input)),
    });
  }

  return {
    module: { ...module, nodes: filteredNodes },
    deduplicatedCount,
  };
}

/**
 * Executes Sparse Conditional Constant Propagation (SCCP) over Low-Level SonIR nodes.
 */
export function runSccpPass(module: LowLevelSonModule): {
  readonly module: LowLevelSonModule;
  readonly constantsPropagated: number;
} {
  const constantValues = new Map<number, number | boolean | string | bigint>();
  for (const node of module.nodes) {
    if (node.opcode === 'val.const' && node.constantValue !== undefined) {
      constantValues.set(node.id, node.constantValue);
    }
  }

  let constantsPropagated = 0;

  for (const node of module.nodes) {
    if (node.opcode === 'val.add' && node.valueInputs.length >= 2) {
      const leftValue = constantValues.get(node.valueInputs[0] ?? -1);
      const rightValue = constantValues.get(node.valueInputs[1] ?? -1);
      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        const sum = Math.trunc(leftValue + rightValue);
        constantValues.set(node.id, sum);
        constantsPropagated += 1;
      }
    }
  }

  return {
    module,
    constantsPropagated,
  };
}

/**
 * Executes Redundant Load Elimination (RLE) and Store-to-Load forwarding over Memory SSA nodes.
 */
export function runRedundantLoadEliminationPass(module: LowLevelSonModule): {
  readonly module: LowLevelSonModule;
  readonly eliminatedCount: number;
} {
  let eliminatedCount = 0;
  const storeByAddress = new Map<number, { valueId: number; memoryToken: number }>();
  const remap = new Map<number, number>();

  for (const node of module.nodes) {
    if (node.opcode === 'mem.store' && node.valueInputs.length >= 2) {
      const address = node.valueInputs[0] ?? -1;
      const value = node.valueInputs[1] ?? -1;
      const memToken = node.memoryInputs[0] ?? 0;
      storeByAddress.set(address, { valueId: value, memoryToken: memToken });
    } else if (node.opcode === 'mem.load' && node.valueInputs.length > 0) {
      const address = node.valueInputs[0] ?? -1;
      const currentMemToken = node.memoryInputs[0] ?? 0;
      const known = storeByAddress.get(address);
      if (known !== undefined && known.memoryToken === currentMemToken) {
        remap.set(node.id, known.valueId);
        eliminatedCount += 1;
      }
    }
  }

  const resolveTarget = (id: number): number => remap.get(id) ?? id;
  const finalNodes: LowLevelSonNode[] = [];

  for (const node of module.nodes) {
    if (remap.has(node.id)) continue;
    finalNodes.push({
      ...node,
      valueInputs: node.valueInputs.map((input) => resolveTarget(input)),
      memoryInputs: node.memoryInputs.map((input) => resolveTarget(input)),
    });
  }

  return {
    module: { ...module, nodes: finalNodes },
    eliminatedCount,
  };
}
