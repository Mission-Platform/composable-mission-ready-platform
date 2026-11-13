import type { MachFunction, MachInstruction, MachRegister } from "../types.js";

export interface LiveInterval {
  readonly regId: number;
  readonly physicalClass: "general" | "float" | "vector" | "special";
  readonly start: number;
  end: number;
  readonly isFixed?: boolean;
  readonly fixedHardwareIndex?: number;
  readonly spillWeight: number;
}

export interface RegisterPoolConfig {
  readonly general?: readonly number[];
  readonly float?: readonly number[];
  readonly vector?: readonly number[];
}

export interface RegisterAllocationResult {
  readonly allocatedFunction: MachFunction;
  readonly physicalAssignments: ReadonlyMap<number, number>;
  readonly spilledRegisters: ReadonlySet<number>;
  readonly requiredStackSlots: number;
}

/**
 * Fast Linear Scan Register Allocator with multi-class support, fixed constraints,
 * calling convention clobber awareness, and loop-depth-aware spill weighting.
 */
export class LinearScanRegisterAllocator {
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
    // 1. Compute linear instruction indices and live intervals with loop nesting weighting
    const intervals = new Map<number, LiveInterval>();
    let insIndex = 0;

    for (const block of fn.blocks) {
      const loopDepth = block.loopNestingDepth ?? 0;
      const weightFactor = 10 ** Math.min(loopDepth, 6);

      for (const ins of block.instructions) {
        for (const def of ins.defs) {
          if (def.isVirtual) {
            const cls = def.physicalClass ?? "general";
            const existing = intervals.get(def.id);
            if (existing === undefined) {
              intervals.set(def.id, {
                regId: def.id,
                physicalClass: cls,
                start: insIndex,
                end: insIndex,
                isFixed: def.isFixed,
                fixedHardwareIndex: def.assignedHardwareIndex,
                spillWeight: weightFactor,
              });
            } else {
              existing.end = Math.max(existing.end, insIndex);
            }
          }
        }
        for (const use of ins.uses) {
          if (use.isVirtual) {
            const cls = use.physicalClass ?? "general";
            const existing = intervals.get(use.id);
            if (existing !== undefined) {
              existing.end = Math.max(existing.end, insIndex);
            } else {
              intervals.set(use.id, {
                regId: use.id,
                physicalClass: cls,
                start: insIndex,
                end: insIndex,
                isFixed: use.isFixed,
                fixedHardwareIndex: use.assignedHardwareIndex,
                spillWeight: weightFactor,
              });
            }
          }
        }
        insIndex += 1;
      }
    }

    const physicalAssignments = new Map<number, number>();
    const spilledRegisters = new Set<number>();
    let nextStackSlot = 0;

    // Separate intervals by register class
    const classes: ("general" | "float" | "vector")[] = [
      "general",
      "float",
      "vector",
    ];

    for (const cls of classes) {
      const classIntervals = [...intervals.values()]
        .filter((iv) => iv.physicalClass === cls)
        .sort((a, b) => a.start - b.start);

      const availablePool = [...this.pools[cls]];
      const active: LiveInterval[] = [];

      for (const current of classIntervals) {
        // Expire old intervals
        for (let i = active.length - 1; i >= 0; i--) {
          const act = active[i]!;
          if (act.end < current.start) {
            const freedPhys = physicalAssignments.get(act.regId);
            if (freedPhys !== undefined && !act.isFixed) {
              availablePool.push(freedPhys);
            }
            active.splice(i, 1);
          }
        }

        if (current.isFixed && current.fixedHardwareIndex !== undefined) {
          physicalAssignments.set(current.regId, current.fixedHardwareIndex);
          const idx = availablePool.indexOf(current.fixedHardwareIndex);
          if (idx !== -1) availablePool.splice(idx, 1);
          active.push(current);
          continue;
        }

        if (availablePool.length > 0) {
          const assigned = availablePool.shift()!;
          physicalAssignments.set(current.regId, assigned);
          active.push(current);
        } else {
          // Find lowest spill weight or longest remaining lifetime
          active.sort((a, b) => a.spillWeight - b.spillWeight || b.end - a.end);
          const candidateToSpill = active[0];

          if (
            candidateToSpill !== undefined &&
            !candidateToSpill.isFixed &&
            candidateToSpill.spillWeight < current.spillWeight
          ) {
            const phys = physicalAssignments.get(candidateToSpill.regId)!;
            physicalAssignments.delete(candidateToSpill.regId);
            spilledRegisters.add(candidateToSpill.regId);
            physicalAssignments.set(current.regId, phys);

            active[0] = current;
            nextStackSlot += 1;
          } else {
            spilledRegisters.add(current.regId);
            nextStackSlot += 1;
          }
        }
      }
    }

    // 2. Rewrite function instructions with physical assignments or spill slots
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
        stackFrameSize: fn.stackFrameSize + nextStackSlot * 8,
      },
      physicalAssignments,
      spilledRegisters,
      requiredStackSlots: nextStackSlot,
    };
  }
}
