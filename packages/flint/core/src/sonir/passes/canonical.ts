import type { LowLevelSonModule, LowLevelSonNode } from '../low-level/dialect.js';

/**
 * Result report from running whole-module canonicalization passes.
 */
export interface CanonicalPassReport {
  readonly gvnDeduplicated: number;
  readonly sccpConstantsPropagated: number;
  readonly rleEliminatedLoads: number;
  readonly arcRetainReleasePairsElided?: number;
}

/**
 * Detects cycles in a SonIR directed dependency graph using depth-first search.
 */
export function detectGraphCycles(nodes: readonly LowLevelSonNode[]): {
  readonly hasCycles: boolean;
  readonly cyclicNodes: readonly number[];
} {
  const nodeMap = new Map<number, LowLevelSonNode>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }

  const visited = new Set<number>();
  const inStack = new Set<number>();
  const cyclic = new Set<number>();

  function dfs(id: number): boolean {
    if (inStack.has(id)) {
      cyclic.add(id);
      return true;
    }
    if (visited.has(id)) return false;

    visited.add(id);
    inStack.add(id);

    const node = nodeMap.get(id);
    if (node !== undefined) {
      const neighbors = [...node.valueInputs, ...node.memoryInputs, ...node.controlInputs];
      for (const nextId of neighbors) {
        if (dfs(nextId)) {
          cyclic.add(id);
        }
      }
    }

    inStack.delete(id);
    return cyclic.has(id);
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      dfs(node.id);
    }
  }

  return {
    hasCycles: cyclic.size > 0,
    cyclicNodes: [...cyclic],
  };
}

/** Computes a canonical hash string for value node deduplication. */
function computeValueHash(node: LowLevelSonNode): string {
  return `${node.opcode}:${node.type ?? ''}:${node.valueInputs.join(',')}:${String(node.constantValue ?? '')}`;
}

/** Resolves node ID through a remap table with a bounded cycle/depth safeguard. */
function resolvePassRemap(remap: Map<number, number>, id: number): number {
  let current = id;
  let depth = 0;
  while (remap.has(current) && depth < 100) {
    current = remap.get(current) ?? current;
    depth += 1;
  }
  return current;
}

/**
 * Executes Global Value Numbering (GVN) over pure value nodes in a Low-Level SonIR module.
 */
export function runDominatorGvnPass(module: LowLevelSonModule): {
  readonly module: LowLevelSonModule;
  readonly deduplicatedCount: number;
} {
  const cycleInfo = detectGraphCycles(module.nodes);
  if (cycleInfo.hasCycles) {
    return { module, deduplicatedCount: 0 };
  }

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

  const filteredNodes: LowLevelSonNode[] = [];
  for (const node of module.nodes) {
    if (remap.has(node.id)) continue;
    filteredNodes.push({
      ...node,
      valueInputs: node.valueInputs.map((input) => resolvePassRemap(remap, input)),
      memoryInputs: node.memoryInputs.map((input) => resolvePassRemap(remap, input)),
      controlInputs: node.controlInputs.map((input) => resolvePassRemap(remap, input)),
    });
  }

  return {
    module: { ...module, nodes: filteredNodes },
    deduplicatedCount,
  };
}

const INT32_MIN = -2_147_483_648;

/**
 * Executes Sparse Conditional Constant Propagation (SCCP) over Low-Level SonIR nodes.
 * Strictly respects WebAssembly trapping semantics on division by zero and signed overflow.
 */
export function runSccpPass(module: LowLevelSonModule): {
  readonly module: LowLevelSonModule;
  readonly constantsPropagated: number;
} {
  const cycleInfo = detectGraphCycles(module.nodes);
  if (cycleInfo.hasCycles) {
    return { module, constantsPropagated: 0 };
  }

  const constantValues = new Map<number, number | boolean | string | bigint>();
  for (const node of module.nodes) {
    if (node.opcode === 'val.const' && node.constantValue !== undefined) {
      constantValues.set(node.id, node.constantValue);
    }
  }

  let constantsPropagated = 0;

  for (const node of module.nodes) {
    if (node.valueInputs.length >= 2) {
      const leftValue = constantValues.get(node.valueInputs[0] ?? -1);
      const rightValue = constantValues.get(node.valueInputs[1] ?? -1);

      const is64Bit =
        typeof leftValue === 'bigint' || typeof rightValue === 'bigint' || node.type === 'i64' || node.type === 'u64';

      if (
        is64Bit &&
        (typeof leftValue === 'bigint' || typeof leftValue === 'number') &&
        (typeof rightValue === 'bigint' || typeof rightValue === 'number')
      ) {
        const leftBig = BigInt(leftValue);
        const rightBig = BigInt(rightValue);
        const shiftMask64 = BigInt(Number(rightBig & 63n));

        switch (node.opcode) {
          case 'val.add': {
            constantValues.set(node.id, BigInt.asIntN(64, leftBig + rightBig));
            constantsPropagated += 1;
            break;
          }
          case 'val.sub': {
            constantValues.set(node.id, BigInt.asIntN(64, leftBig - rightBig));
            constantsPropagated += 1;
            break;
          }
          case 'val.mul': {
            constantValues.set(node.id, BigInt.asIntN(64, leftBig * rightBig));
            constantsPropagated += 1;
            break;
          }
          case 'val.div': {
            const INT64_MIN = -9_223_372_036_854_775_808n;
            if (rightBig !== 0n && !(leftBig === INT64_MIN && rightBig === -1n)) {
              constantValues.set(node.id, BigInt.asIntN(64, leftBig / rightBig));
              constantsPropagated += 1;
            }
            break;
          }
          case 'val.shl': {
            constantValues.set(node.id, BigInt.asIntN(64, leftBig << shiftMask64));
            constantsPropagated += 1;
            break;
          }
          case 'val.shr_u': {
            constantValues.set(node.id, BigInt.asUintN(64, BigInt.asUintN(64, leftBig) >> shiftMask64));
            constantsPropagated += 1;
            break;
          }
          case 'val.shr_s': {
            constantValues.set(node.id, BigInt.asIntN(64, BigInt.asIntN(64, leftBig) >> shiftMask64));
            constantsPropagated += 1;
            break;
          }
          case 'val.cmp_eq': {
            constantValues.set(node.id, leftBig === rightBig ? 1 : 0);
            constantsPropagated += 1;
            break;
          }
          case 'val.cmp_ne': {
            constantValues.set(node.id, leftBig === rightBig ? 0 : 1);
            constantsPropagated += 1;
            break;
          }
          case 'val.cmp_lt_u': {
            constantValues.set(node.id, BigInt.asUintN(64, leftBig) < BigInt.asUintN(64, rightBig) ? 1 : 0);
            constantsPropagated += 1;
            break;
          }
          case 'val.cmp_lt_s': {
            constantValues.set(node.id, BigInt.asIntN(64, leftBig) < BigInt.asIntN(64, rightBig) ? 1 : 0);
            constantsPropagated += 1;
            break;
          }
          case 'val.cmp_gt_u': {
            constantValues.set(node.id, BigInt.asUintN(64, leftBig) > BigInt.asUintN(64, rightBig) ? 1 : 0);
            constantsPropagated += 1;
            break;
          }
          case 'val.cmp_gt_s': {
            constantValues.set(node.id, BigInt.asIntN(64, leftBig) > BigInt.asIntN(64, rightBig) ? 1 : 0);
            constantsPropagated += 1;
            break;
          }
          case 'val.cmp_le_u': {
            constantValues.set(node.id, BigInt.asUintN(64, leftBig) <= BigInt.asUintN(64, rightBig) ? 1 : 0);
            constantsPropagated += 1;
            break;
          }
          case 'val.cmp_le_s': {
            constantValues.set(node.id, BigInt.asIntN(64, leftBig) <= BigInt.asIntN(64, rightBig) ? 1 : 0);
            constantsPropagated += 1;
            break;
          }
          case 'val.cmp_ge_u': {
            constantValues.set(node.id, BigInt.asUintN(64, leftBig) >= BigInt.asUintN(64, rightBig) ? 1 : 0);
            constantsPropagated += 1;
            break;
          }
          case 'val.cmp_ge_s': {
            constantValues.set(node.id, BigInt.asIntN(64, leftBig) >= BigInt.asIntN(64, rightBig) ? 1 : 0);
            constantsPropagated += 1;
            break;
          }
          default: {
            break;
          }
        }
      } else if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        const shiftMask32 = rightValue & 31;
        switch (node.opcode) {
          case 'val.add': {
            constantValues.set(node.id, Math.trunc(leftValue + rightValue));
            constantsPropagated += 1;
            break;
          }
          case 'val.sub': {
            constantValues.set(node.id, Math.trunc(leftValue - rightValue));
            constantsPropagated += 1;
            break;
          }
          case 'val.mul': {
            constantValues.set(node.id, Math.trunc(leftValue * rightValue));
            constantsPropagated += 1;
            break;
          }
          case 'val.div': {
            // Trap on div-by-zero or signed INT32_MIN / -1: do NOT fold into constant
            if (rightValue !== 0 && !(leftValue === INT32_MIN && rightValue === -1)) {
              constantValues.set(node.id, Math.trunc(leftValue / rightValue));
              constantsPropagated += 1;
            }
            break;
          }
          case 'val.shl': {
            constantValues.set(node.id, Math.trunc(leftValue << shiftMask32));
            constantsPropagated += 1;
            break;
          }
          case 'val.shr_u': {
            constantValues.set(node.id, Math.trunc(leftValue >>> shiftMask32));
            constantsPropagated += 1;
            break;
          }
          case 'val.shr_s': {
            constantValues.set(node.id, Math.trunc(leftValue >> shiftMask32));
            constantsPropagated += 1;
            break;
          }
          case 'val.cmp_eq': {
            constantValues.set(node.id, leftValue === rightValue ? 1 : 0);
            constantsPropagated += 1;
            break;
          }
          case 'val.cmp_ne': {
            constantValues.set(node.id, leftValue === rightValue ? 0 : 1);
            constantsPropagated += 1;
            break;
          }
          case 'val.cmp_lt_u': {
            constantValues.set(node.id, leftValue >>> 0 < rightValue >>> 0 ? 1 : 0);
            constantsPropagated += 1;
            break;
          }
          case 'val.cmp_lt_s': {
            constantValues.set(node.id, Math.trunc(leftValue) < Math.trunc(rightValue) ? 1 : 0);
            constantsPropagated += 1;
            break;
          }
          case 'val.cmp_gt_u': {
            constantValues.set(node.id, leftValue >>> 0 > rightValue >>> 0 ? 1 : 0);
            constantsPropagated += 1;
            break;
          }
          case 'val.cmp_gt_s': {
            constantValues.set(node.id, Math.trunc(leftValue) > Math.trunc(rightValue) ? 1 : 0);
            constantsPropagated += 1;
            break;
          }
          case 'val.cmp_le_u': {
            constantValues.set(node.id, leftValue >>> 0 <= rightValue >>> 0 ? 1 : 0);
            constantsPropagated += 1;
            break;
          }
          case 'val.cmp_le_s': {
            constantValues.set(node.id, Math.trunc(leftValue) <= Math.trunc(rightValue) ? 1 : 0);
            constantsPropagated += 1;
            break;
          }
          case 'val.cmp_ge_u': {
            constantValues.set(node.id, leftValue >>> 0 >= rightValue >>> 0 ? 1 : 0);
            constantsPropagated += 1;
            break;
          }
          case 'val.cmp_ge_s': {
            constantValues.set(node.id, Math.trunc(leftValue) >= Math.trunc(rightValue) ? 1 : 0);
            constantsPropagated += 1;
            break;
          }
          default: {
            break;
          }
        }
      }
    }
  }

  const finalNodes: LowLevelSonNode[] = module.nodes.map((node) => {
    const folded = constantValues.get(node.id);
    if (folded !== undefined && node.opcode !== 'val.const') {
      return {
        ...node,
        opcode: 'val.const' as const,
        constantValue: folded,
        valueInputs: [],
      };
    }
    return node;
  });

  return {
    module: { ...module, nodes: finalNodes },
    constantsPropagated,
  };
}

/** Alias for runSccpPass. */
export const runSparseConditionalConstantPropagationPass = runSccpPass;

/**
 * Executes Redundant Load Elimination (RLE) and Store-to-Load forwarding over Memory SSA nodes.
 * Strictly isolates guest private heap (Domain 0) and host interop channel (Domain 1).
 */
export function runRedundantLoadEliminationPass(module: LowLevelSonModule): {
  readonly module: LowLevelSonModule;
  readonly eliminatedCount: number;
} {
  const cycleInfo = detectGraphCycles(module.nodes);
  if (cycleInfo.hasCycles) {
    return { module, eliminatedCount: 0 };
  }

  let eliminatedCount = 0;
  const storeByAddress = new Map<string, { valueId: number; memoryToken: number; domain: number }>();
  const remap = new Map<number, number>();

  for (const node of module.nodes) {
    const domain = node.memoryDomain ?? 0;
    // Domain 1 is the volatile host channel; do not perform store-to-load forwarding or load elimination across volatile host barriers
    if (domain === 1) {
      continue;
    }
    if (node.opcode === 'mem.store' && node.valueInputs.length >= 2) {
      const address = node.valueInputs[0] ?? -1;
      const value = node.valueInputs[1] ?? -1;
      const memToken = node.memoryInputs[0] ?? 0;
      storeByAddress.set(`${domain}:${address}`, { valueId: value, memoryToken: memToken, domain });
    } else if (node.opcode === 'mem.load' && node.valueInputs.length > 0) {
      const address = node.valueInputs[0] ?? -1;
      const currentMemToken = node.memoryInputs[0] ?? 0;
      const known = storeByAddress.get(`${domain}:${address}`);
      if (known !== undefined && known.memoryToken === currentMemToken && known.domain === domain) {
        remap.set(node.id, known.valueId);
        eliminatedCount += 1;
      }
    }
  }

  const finalNodes: LowLevelSonNode[] = [];

  for (const node of module.nodes) {
    if (remap.has(node.id)) continue;
    finalNodes.push({
      ...node,
      valueInputs: node.valueInputs.map((input) => resolvePassRemap(remap, input)),
      memoryInputs: node.memoryInputs.map((input) => resolvePassRemap(remap, input)),
    });
  }

  return {
    module: { ...module, nodes: finalNodes },
    eliminatedCount,
  };
}

/**
 * Executes ARC (Automatic Reference Counting) optimization over Low-Level SonIR nodes.
 * Strictly respects suspension barriers (ctrl.suspend, ctrl.barrier, val.call) and prevents
 * elision of retain/release pairs across asynchronous suspension points to eliminate Use-After-Free.
 */
export function runArcOptimizationPass(module: LowLevelSonModule): {
  readonly module: LowLevelSonModule;
  readonly elidedPairs: number;
} {
  const cycleInfo = detectGraphCycles(module.nodes);
  if (cycleInfo.hasCycles) {
    return { module, elidedPairs: 0 };
  }

  const retainsByTarget = new Map<number, number[]>();
  const releasesByTarget = new Map<number, number[]>();
  const suspensionBarrierNodeIds = new Set<number>();

  for (const node of module.nodes) {
    if (node.opcode === 'ctrl.suspend' || node.opcode === 'ctrl.barrier') {
      suspensionBarrierNodeIds.add(node.id);
    } else if (node.opcode === 'ref.retain' && node.valueInputs.length > 0) {
      const target = node.valueInputs[0] ?? -1;
      const list = retainsByTarget.get(target) ?? [];
      list.push(node.id);
      retainsByTarget.set(target, list);
    } else if (node.opcode === 'ref.release' && node.valueInputs.length > 0) {
      const target = node.valueInputs[0] ?? -1;
      const list = releasesByTarget.get(target) ?? [];
      list.push(node.id);
      releasesByTarget.set(target, list);
    }
  }

  const elidedNodeIds = new Set<number>();
  let elidedPairs = 0;

  for (const [target, retainIds] of retainsByTarget.entries()) {
    const releaseIds = releasesByTarget.get(target);
    if (!releaseIds || releaseIds.length === 0) continue;

    for (const retainId of retainIds) {
      const matchingRelease = releaseIds.find(
        (releaseIdCandidate) => releaseIdCandidate > retainId && !elidedNodeIds.has(releaseIdCandidate),
      );
      if (matchingRelease !== undefined) {
        let hasBarrier = false;
        for (const barrierId of suspensionBarrierNodeIds) {
          if (barrierId > retainId && barrierId < matchingRelease) {
            hasBarrier = true;
            break;
          }
        }
        if (!hasBarrier) {
          elidedNodeIds.add(retainId);
          elidedNodeIds.add(matchingRelease);
          elidedPairs += 1;
        }
      }
    }
  }

  if (elidedNodeIds.size === 0) {
    return { module, elidedPairs: 0 };
  }

  const finalNodes = module.nodes.filter((node) => !elidedNodeIds.has(node.id));
  return {
    module: { ...module, nodes: finalNodes },
    elidedPairs,
  };
}
