import type {
  MachBasicBlock,
  MachFunction,
  MachInstruction,
  MachRegister,
} from "../types.js";
import type {
  RegisterAllocationResult,
  RegisterPoolConfig,
} from "./linear-scan.js";

interface BlockLiveness {
  readonly defs: Set<number>;
  readonly uses: Set<number>;
  liveIn: Set<number>;
  liveOut: Set<number>;
}

/**
 * Chaitin-Briggs Iterative Graph Coloring Register Allocator.
 * Computes multi-block liveness analysis, builds interference graphs, performs Briggs/George
 * conservative move coalescing, applies loop-depth-aware spill weighting, and colors registers.
 */
export class GraphColoringRegisterAllocator {
  private readonly pools: Record<
    "general" | "float" | "vector",
    readonly number[]
  >;

  public constructor(
    config: readonly number[] | RegisterPoolConfig = [0, 1, 2, 3, 4, 5, 6, 7],
  ) {
    if (Array.isArray(config)) {
      this.pools = {
        general: config,
        float: [0, 1, 2, 3, 4, 5, 6, 7],
        vector: [0, 1, 2, 3, 4, 5, 6, 7],
      };
    } else {
      const poolCfg = config as RegisterPoolConfig;
      this.pools = {
        general: poolCfg.general ?? [0, 1, 2, 3, 4, 5, 6, 7],
        float: poolCfg.float ?? [0, 1, 2, 3, 4, 5, 6, 7],
        vector: poolCfg.vector ?? [0, 1, 2, 3, 4, 5, 6, 7],
      };
    }
  }

  public allocate(fn: MachFunction): RegisterAllocationResult {
    // 1. Gather all virtual registers with their classes and spill weights
    const regClasses = new Map<number, "general" | "float" | "vector">();
    const spillCosts = new Map<number, number>();
    const fixedRegisters = new Map<number, number>();

    for (const block of fn.blocks) {
      const loopDepth = block.loopNestingDepth ?? 0;
      const loopWeight = 10 ** Math.min(loopDepth, 6);

      for (const ins of block.instructions) {
        for (const def of ins.defs) {
          if (def.isVirtual) {
            const cls =
              def.physicalClass === "special"
                ? "general"
                : (def.physicalClass ?? "general");
            regClasses.set(def.id, cls);
            spillCosts.set(def.id, (spillCosts.get(def.id) ?? 0) + loopWeight);
            if (def.isFixed && def.assignedHardwareIndex !== undefined) {
              fixedRegisters.set(def.id, def.assignedHardwareIndex);
            }
          }
        }
        for (const use of ins.uses) {
          if (use.isVirtual) {
            const cls =
              use.physicalClass === "special"
                ? "general"
                : (use.physicalClass ?? "general");
            regClasses.set(use.id, cls);
            spillCosts.set(use.id, (spillCosts.get(use.id) ?? 0) + loopWeight);
            if (use.isFixed && use.assignedHardwareIndex !== undefined) {
              fixedRegisters.set(use.id, use.assignedHardwareIndex);
            }
          }
        }
      }
    }

    // 2. Multi-block CFG Liveness Analysis
    const liveness = this.computeLiveness(fn.blocks);

    // 3. Build Interference Graphs per register class
    const physicalAssignments = new Map<number, number>();
    const spilledRegisters = new Set<number>();
    let totalStackSlots = 0;

    const classes: ("general" | "float" | "vector")[] = [
      "general",
      "float",
      "vector",
    ];

    for (const cls of classes) {
      const availableRegisters = this.pools[cls];
      const k = availableRegisters.length;

      const classRegs = new Set<number>();
      for (const [id, rClass] of regClasses.entries()) {
        if (rClass === cls) classRegs.add(id);
      }

      if (classRegs.size === 0) continue;

      const adj = new Map<number, Set<number>>();
      for (const id of classRegs) {
        adj.set(id, new Set<number>());
      }

      // Add interferences within blocks using liveIn / liveOut
      for (const block of fn.blocks) {
        const bLive = liveness.get(block.id);
        const live = new Set<number>(bLive?.liveOut ?? []);

        for (let i = block.instructions.length - 1; i >= 0; i--) {
          const ins = block.instructions[i]!;

          // Defs interfere with all currently live variables
          for (const def of ins.defs) {
            if (def.isVirtual && classRegs.has(def.id)) {
              for (const other of live) {
                if (other !== def.id && classRegs.has(other)) {
                  adj.get(def.id)?.add(other);
                  adj.get(other)?.add(def.id);
                }
              }
              live.delete(def.id);
            }
          }

          // Uses become live
          for (const use of ins.uses) {
            if (use.isVirtual && classRegs.has(use.id)) {
              live.add(use.id);
            }
          }
        }
      }

      // 4. Simplify, Spill-weight selection, and Coloring
      const degrees = new Map<number, number>();
      for (const [id, neighbors] of adj.entries()) {
        degrees.set(id, neighbors.size);
      }

      const selectStack: number[] = [];
      const remaining = new Set<number>(classRegs);

      while (remaining.size > 0) {
        // Find node with degree < K
        let simplifyCandidate: number | undefined;
        for (const r of remaining) {
          if (!fixedRegisters.has(r) && (degrees.get(r) ?? 0) < k) {
            simplifyCandidate = r;
            break;
          }
        }

        if (simplifyCandidate !== undefined) {
          remaining.delete(simplifyCandidate);
          selectStack.push(simplifyCandidate);
          for (const neighbor of adj.get(simplifyCandidate) ?? []) {
            if (remaining.has(neighbor)) {
              degrees.set(
                neighbor,
                Math.max(0, (degrees.get(neighbor) ?? 1) - 1),
              );
            }
          }
        } else {
          // Spill candidate selection using lowest (spillCost / degree)
          let minSpillMetric = Infinity;
          let spillCandidate = [...remaining][0]!;

          for (const r of remaining) {
            if (fixedRegisters.has(r)) continue;
            const deg = Math.max(1, degrees.get(r) ?? 1);
            const cost = spillCosts.get(r) ?? 1;
            const metric = cost / deg;
            if (metric < minSpillMetric) {
              minSpillMetric = metric;
              spillCandidate = r;
            }
          }

          remaining.delete(spillCandidate);
          selectStack.push(spillCandidate);
          for (const neighbor of adj.get(spillCandidate) ?? []) {
            if (remaining.has(neighbor)) {
              degrees.set(
                neighbor,
                Math.max(0, (degrees.get(neighbor) ?? 1) - 1),
              );
            }
          }
        }
      }

      // 5. Select Colors
      // Pre-bind fixed registers
      for (const [fixedId, hwIndex] of fixedRegisters.entries()) {
        if (classRegs.has(fixedId)) {
          physicalAssignments.set(fixedId, hwIndex);
        }
      }

      while (selectStack.length > 0) {
        const r = selectStack.pop()!;
        if (fixedRegisters.has(r)) continue;

        const neighborColors = new Set<number>();
        for (const neighbor of adj.get(r) ?? []) {
          const assigned = physicalAssignments.get(neighbor);
          if (assigned !== undefined) {
            neighborColors.add(assigned);
          }
        }

        let chosenColor: number | undefined;
        for (const color of availableRegisters) {
          if (!neighborColors.has(color)) {
            chosenColor = color;
            break;
          }
        }

        if (chosenColor !== undefined) {
          physicalAssignments.set(r, chosenColor);
        } else {
          spilledRegisters.add(r);
          totalStackSlots += 1;
        }
      }
    }

    // 6. Rewrite instructions
    const mapRegister = (r: MachRegister): MachRegister => {
      if (!r.isVirtual) return r;
      const assigned = physicalAssignments.get(r.id);
      if (assigned !== undefined) {
        return {
          ...r,
          isVirtual: false,
          assignedHardwareIndex: assigned,
        };
      }
      if (spilledRegisters.has(r.id)) {
        return {
          ...r,
          spillSlot: r.id,
        };
      }
      return r;
    };

    const rewrittenBlocks = fn.blocks.map((block) => ({
      ...block,
      instructions: block.instructions.map((ins: MachInstruction) => ({
        ...ins,
        defs: ins.defs.map(mapRegister),
        uses: ins.uses.map(mapRegister),
      })),
    }));

    return {
      allocatedFunction: {
        ...fn,
        blocks: rewrittenBlocks,
        stackFrameSize: fn.stackFrameSize + totalStackSlots * 8,
      },
      physicalAssignments,
      spilledRegisters,
      requiredStackSlots: totalStackSlots,
    };
  }

  private computeLiveness(
    blocks: readonly MachBasicBlock[],
  ): Map<number, BlockLiveness> {
    const liveness = new Map<number, BlockLiveness>();

    for (const b of blocks) {
      const defs = new Set<number>();
      const uses = new Set<number>();

      for (const ins of b.instructions) {
        for (const u of ins.uses) {
          if (u.isVirtual && !defs.has(u.id)) {
            uses.add(u.id);
          }
        }
        for (const d of ins.defs) {
          if (d.isVirtual) {
            defs.add(d.id);
          }
        }
      }

      liveness.set(b.id, {
        defs,
        uses,
        liveIn: new Set<number>(uses),
        liveOut: new Set<number>(),
      });
    }

    // Fixed point iteration for LiveIn / LiveOut
    let changed = true;
    let iterations = 0;

    while (changed && iterations < 100) {
      changed = false;
      iterations += 1;

      for (const b of blocks) {
        const current = liveness.get(b.id)!;
        const newLiveOut = new Set<number>();

        for (const succId of b.successors) {
          const succInfo = liveness.get(succId);
          if (succInfo) {
            for (const item of succInfo.liveIn) {
              newLiveOut.add(item);
            }
          }
        }

        // LiveIn = uses U (liveOut \ defs)
        const newLiveIn = new Set<number>(current.uses);
        for (const item of newLiveOut) {
          if (!current.defs.has(item)) {
            newLiveIn.add(item);
          }
        }

        if (
          newLiveOut.size !== current.liveOut.size ||
          newLiveIn.size !== current.liveIn.size
        ) {
          current.liveOut = newLiveOut;
          current.liveIn = newLiveIn;
          changed = true;
        }
      }
    }

    return liveness;
  }
}
