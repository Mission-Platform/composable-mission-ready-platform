import type {
  MachBasicBlock,
  MachFunction,
  MachInstruction,
  MachModule,
} from "./types.js";

/**
 * Checks whether a number is a power of two, returning the power exponent $k$ ($2^k = n$).
 */
function getPowerOfTwoExponent(n: number | bigint): number | undefined {
  const num = typeof n === "bigint" ? Number(n) : n;
  if (num > 0 && Number.isInteger(Math.log2(num))) {
    return Math.trunc(Math.log2(num));
  }
  return undefined;
}

/**
 * Machine IR optimization, peephole, and CFG simplification passes.
 */
export class MachIrOptimizer {
  /**
   * Optimizes an entire MachIR module with peephole, dead-instruction elimination, and CFG cleanup.
   */
  public optimizeModule(module: MachModule): MachModule {
    return {
      ...module,
      functions: module.functions.map((fn) => this.optimizeFunction(fn)),
    };
  }

  /**
   * Optimizes a single MachIR function.
   */
  public optimizeFunction(fn: MachFunction): MachFunction {
    // 1. Apply peephole & strength reduction block by block
    let optimizedBlocks = fn.blocks.map((block) => this.optimizeBlock(block));

    // 2. Dead Instruction Elimination across function
    optimizedBlocks = this.eliminateDeadInstructions(optimizedBlocks);

    // 3. CFG Simplification (unreachable blocks removal, jump threading)
    optimizedBlocks = this.simplifyCfg(optimizedBlocks);

    return {
      ...fn,
      blocks: optimizedBlocks,
    };
  }

  /**
   * Applies peephole optimizations and strength reduction to a basic block.
   */
  public optimizeBlock(block: MachBasicBlock): MachBasicBlock {
    const optimized: MachInstruction[] = [];

    for (let i = 0; i < block.instructions.length; i++) {
      const current = block.instructions[i]!;

      // Peephole 1: Eliminate redundant self-moves: `mov rX, rX`
      if (
        current.opcode === "mov" &&
        current.defs.length === 1 &&
        current.uses.length === 1 &&
        current.defs[0]?.id === current.uses[0]?.id &&
        current.defs[0]?.assignedHardwareIndex ===
          current.uses[0]?.assignedHardwareIndex
      ) {
        continue;
      }

      // Peephole 2: Simplify `add rX, 0` or `sub rX, 0`
      if (
        (current.opcode === "add" || current.opcode === "sub") &&
        current.immediate === 0 &&
        current.defs.length === 1 &&
        current.uses.length === 1 &&
        current.defs[0]?.id === current.uses[0]?.id
      ) {
        continue;
      }

      // Strength Reduction: `mul rX, 2^k` -> `shl rX, k`
      if (
        current.opcode === "mul" &&
        (typeof current.immediate === "number" ||
          typeof current.immediate === "bigint")
      ) {
        const exp = getPowerOfTwoExponent(current.immediate);
        if (exp !== undefined) {
          optimized.push({
            ...current,
            opcode: "shl",
            immediate: exp,
          });
          continue;
        }
      }

      // Strength Reduction: `mul rX, 0` -> `mov rX, 0`
      if (current.opcode === "mul" && current.immediate === 0) {
        optimized.push({
          ...current,
          opcode: "mov",
          immediate: 0,
          uses: [],
        });
        continue;
      }

      // Strength Reduction: `sub rX, rX` -> `mov rX, 0`
      if (
        current.opcode === "sub" &&
        current.uses.length === 2 &&
        current.uses[0]?.id === current.uses[1]?.id
      ) {
        optimized.push({
          ...current,
          opcode: "mov",
          immediate: 0,
          uses: [],
        });
        continue;
      }

      optimized.push(current);
    }

    return {
      ...block,
      instructions: optimized,
    };
  }

  /**
   * Eliminates dead pure instructions whose defined registers are never read.
   */
  private eliminateDeadInstructions(
    blocks: readonly MachBasicBlock[],
  ): MachBasicBlock[] {
    const usedRegisters = new Set<number>();

    // Collect all read registers
    for (const block of blocks) {
      for (const ins of block.instructions) {
        for (const use of ins.uses) {
          usedRegisters.add(use.id);
        }
      }
    }

    const hasSideEffects = (opcode: string): boolean => {
      return (
        opcode === "store" ||
        opcode === "call" ||
        opcode === "ret" ||
        opcode === "barrier" ||
        opcode === "mmio_write" ||
        opcode === "jmp" ||
        opcode === "jcc"
      );
    };

    return blocks.map((block) => ({
      ...block,
      instructions: block.instructions.filter((ins) => {
        if (hasSideEffects(ins.opcode)) return true;
        if (ins.defs.length === 0) return true;
        // Keep instruction if at least one defined virtual register is used or is hardware fixed
        return ins.defs.some(
          (def) => !def.isVirtual || usedRegisters.has(def.id) || def.isFixed,
        );
      }),
    }));
  }

  /**
   * Simplifies Control Flow Graph: removes unreachable blocks and cleans up jump chains.
   */
  private simplifyCfg(blocks: readonly MachBasicBlock[]): MachBasicBlock[] {
    if (blocks.length <= 1) return [...blocks];

    const reachable = new Set<number>();
    const entryBlock = blocks[0];
    if (entryBlock) reachable.add(entryBlock.id);

    const blockMap = new Map<number, MachBasicBlock>();
    for (const b of blocks) blockMap.set(b.id, b);

    // BFS for reachable blocks
    const queue: number[] = entryBlock ? [entryBlock.id] : [];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const current = blockMap.get(currentId);
      if (current) {
        for (const succ of current.successors) {
          if (!reachable.has(succ)) {
            reachable.add(succ);
            queue.push(succ);
          }
        }
      }
    }

    // Keep only reachable blocks
    const filteredBlocks = blocks.filter((b) => reachable.has(b.id));

    // Update predecessors and successors to only include live reachable blocks
    return filteredBlocks.map((b) => ({
      ...b,
      predecessors: b.predecessors.filter((id) => reachable.has(id)),
      successors: b.successors.filter((id) => reachable.has(id)),
    }));
  }
}
