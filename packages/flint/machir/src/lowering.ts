import type {
  LowLevelSonModule,
  LowLevelSonNode,
} from "@mission-platform/flint-sonir";

import type {
  CallingConvention,
  CallingConventionDetails,
  MachBasicBlock,
  MachCondition,
  MachFunction,
  MachInstruction,
  MachModule,
  MachOpcode,
  MachPhiInput,
  MachRegister,
} from "./types.js";

/**
 * Returns calling convention register details for hardware and stack platforms.
 */
export function getCallingConventionDetails(
  cc: CallingConvention,
): CallingConventionDetails {
  switch (cc) {
    case "system_v":
      return {
        name: "system_v",
        argumentRegisters: [0, 1, 2, 3, 4, 5], // RDI, RSI, RDX, RCX, R8, R9
        returnRegisters: [0, 2], // RAX, RDX
        callerSavedRegisters: [0, 1, 2, 3, 4, 5, 8, 9, 10, 11], // RAX, RDI, RSI, RDX, RCX, R8-R11
        calleeSavedRegisters: [6, 7, 12, 13, 14, 15], // RBX, RSP, RBP, R12-R15
      };
    case "arm_aapcs":
      return {
        name: "arm_aapcs",
        argumentRegisters: [0, 1, 2, 3], // R0-R3
        returnRegisters: [0, 1], // R0, R1
        callerSavedRegisters: [0, 1, 2, 3, 12, 14], // R0-R3, R12 (IP), R14 (LR)
        calleeSavedRegisters: [4, 5, 6, 7, 8, 9, 10, 11], // R4-R11
      };
    case "win64":
      return {
        name: "win64",
        argumentRegisters: [3, 2, 4, 5], // RCX, RDX, R8, R9
        returnRegisters: [0], // RAX
        callerSavedRegisters: [0, 2, 3, 4, 5, 10, 11], // RAX, RDX, RCX, R8, R9, R10, R11
        calleeSavedRegisters: [6, 7, 1, 0, 12, 13, 14, 15], // RBX, RBP, RDI, RSI, R12-R15
      };
    case "wasm_stack":
    case "cdecl":
    default:
      return {
        name: cc,
        argumentRegisters: [0, 1, 2, 3],
        returnRegisters: [0],
        callerSavedRegisters: [0, 1, 2, 3],
        calleeSavedRegisters: [4, 5, 6, 7],
      };
  }
}

/**
 * Creates a virtual MachRegister reference.
 */
export function reg(
  id: number,
  physicalClass: MachRegister["physicalClass"] = "general",
): MachRegister {
  return { id, isVirtual: true, physicalClass };
}

/**
 * Creates a fixed hardware MachRegister reference.
 */
export function fixedReg(
  hwIndex: number,
  name?: string,
  physicalClass: MachRegister["physicalClass"] = "general",
): MachRegister {
  return {
    id: hwIndex,
    isVirtual: false,
    assignedHardwareIndex: hwIndex,
    isFixed: true,
    fixedRegisterName: name,
    physicalClass,
  };
}

/**
 * Map SonIR comparison opcodes to MachCondition.
 */
function mapComparisonCondition(opcode: string): MachCondition {
  switch (opcode) {
    case "val.cmp_eq":
      return "eq";
    case "val.cmp_ne":
      return "ne";
    case "val.cmp_lt_s":
      return "lt";
    case "val.cmp_le_s":
      return "le";
    case "val.cmp_gt_s":
      return "gt";
    case "val.cmp_ge_s":
      return "ge";
    case "val.cmp_lt_u":
      return "ult";
    case "val.cmp_le_u":
      return "ule";
    case "val.cmp_gt_u":
      return "ugt";
    case "val.cmp_ge_u":
      return "uge";
    default:
      return "eq";
  }
}

/**
 * Lowers a Low-Level SonIR module with Memory SSA into a multi-block CFG MachIR module.
 */
export function lowerLowLevelSonToMachIr(
  sonModule: LowLevelSonModule,
  callingConvention: CallingConvention = "system_v",
): MachModule {
  const ccDetails = getCallingConventionDetails(callingConvention);

  // Group nodes into basic blocks based on control-flow nodes
  const rawBlocks: {
    id: number;
    label: string;
    instructions: MachInstruction[];
    predecessors: number[];
    successors: number[];
    loopNestingDepth: number;
  }[] = [];

  let currentBlockId = 1;
  let currentBlockLabel = "entry";
  let currentInstructions: MachInstruction[] = [];
  let currentPredecessors: number[] = [];
  let currentSuccessors: number[] = [];
  let currentLoopDepth = 0;
  let insId = 1;

  // Find branch targets
  const branchTargets = new Map<
    number,
    { trueBlockId: number; falseBlockId: number }
  >();
  let nextBlockId = 2;

  for (const node of sonModule.nodes) {
    if (node.opcode === "ctrl.branch") {
      const trueId = nextBlockId++;
      const falseId = nextBlockId++;
      branchTargets.set(node.id, {
        trueBlockId: trueId,
        falseBlockId: falseId,
      });
    }
  }

  for (let i = 0; i < sonModule.nodes.length; i++) {
    const node = sonModule.nodes[i];
    if (!node) continue;

    // Check for loop depth
    if (node.opcode === "ctrl.jump" && node.controlInputs.length > 0) {
      currentLoopDepth = Math.max(0, currentLoopDepth);
    }

    // Lower standard value / memory operations
    const machInsList = lowerSonNodeToMach(
      node,
      insId,
      ccDetails,
      branchTargets,
    );
    if (machInsList.length > 0) {
      insId += machInsList.length;
      currentInstructions.push(...machInsList);
    }

    // Check if this node terminates the current basic block
    if (node.opcode === "ctrl.branch") {
      const targets = branchTargets.get(node.id) ?? {
        trueBlockId: nextBlockId++,
        falseBlockId: nextBlockId++,
      };
      currentSuccessors = [targets.trueBlockId, targets.falseBlockId];

      rawBlocks.push({
        id: currentBlockId,
        label: currentBlockLabel,
        instructions: currentInstructions,
        predecessors: currentPredecessors,
        successors: currentSuccessors,
        loopNestingDepth: currentLoopDepth,
      });

      // Start new true block
      currentBlockId = targets.trueBlockId;
      currentBlockLabel = `block_${targets.trueBlockId}`;
      currentInstructions = [];
      currentPredecessors = [rawBlocks[rawBlocks.length - 1]!.id];
      currentSuccessors = [];
    } else if (node.opcode === "ctrl.return") {
      currentSuccessors = [];
      rawBlocks.push({
        id: currentBlockId,
        label: currentBlockLabel,
        instructions: currentInstructions,
        predecessors: currentPredecessors,
        successors: currentSuccessors,
        loopNestingDepth: currentLoopDepth,
      });

      if (i + 1 < sonModule.nodes.length) {
        currentBlockId = nextBlockId++;
        currentBlockLabel = `block_${currentBlockId}`;
        currentInstructions = [];
        currentPredecessors = [];
        currentSuccessors = [];
      }
    }
  }

  // If there are remaining instructions in the active block, seal it
  if (currentInstructions.length > 0 || rawBlocks.length === 0) {
    if (rawBlocks.length > 0 && currentPredecessors.length === 0) {
      currentPredecessors = [rawBlocks[rawBlocks.length - 1]!.id];
      if (rawBlocks[rawBlocks.length - 1]!.successors.length === 0) {
        rawBlocks[rawBlocks.length - 1]!.successors = [currentBlockId];
      }
    }
    rawBlocks.push({
      id: currentBlockId,
      label: currentBlockLabel,
      instructions: currentInstructions,
      predecessors: currentPredecessors,
      successors: currentSuccessors,
      loopNestingDepth: currentLoopDepth,
    });
  }

  // Ensure predecessor and successor graph consistency
  const blockMap = new Map<number, (typeof rawBlocks)[number]>();
  for (const b of rawBlocks) blockMap.set(b.id, b);

  for (const b of rawBlocks) {
    for (const succId of b.successors) {
      const succBlock = blockMap.get(succId);
      if (succBlock && !succBlock.predecessors.includes(b.id)) {
        succBlock.predecessors.push(b.id);
      }
    }
  }

  const blocks: MachBasicBlock[] = rawBlocks.map((b) => ({
    id: b.id,
    label: b.label,
    instructions: b.instructions,
    predecessors: b.predecessors,
    successors: b.successors,
    loopNestingDepth: b.loopNestingDepth,
  }));

  const mainFunction: MachFunction = {
    name: sonModule.name,
    blocks,
    stackFrameSize: 0,
    callingConvention,
    isInterruptHandler: false,
  };

  return {
    name: sonModule.name,
    functions: [mainFunction],
  };
}

function lowerSonNodeToMach(
  node: LowLevelSonNode,
  startInsId: number,
  ccDetails: CallingConventionDetails,
  branchTargets: Map<number, { trueBlockId: number; falseBlockId: number }>,
): MachInstruction[] {
  let insId = startInsId;

  if (node.opcode === "val.const") {
    return [
      {
        id: insId,
        opcode: "mov",
        defs: [reg(node.id)],
        uses: [],
        immediate:
          typeof node.constantValue === "number" ||
          typeof node.constantValue === "bigint"
            ? node.constantValue
            : 0,
        span: node.span,
      },
    ];
  }

  if (
    node.opcode === "val.add" ||
    node.opcode === "val.sub" ||
    node.opcode === "val.mul" ||
    node.opcode === "val.div"
  ) {
    const opcodeMap: Record<string, MachOpcode> = {
      "val.add": "add",
      "val.sub": "sub",
      "val.mul": "mul",
      "val.div": "div",
    };
    return [
      {
        id: insId,
        opcode: opcodeMap[node.opcode]!,
        defs: [reg(node.id)],
        uses: node.valueInputs.map((id) => reg(id)),
        span: node.span,
      },
    ];
  }

  if (
    node.opcode === "val.and" ||
    node.opcode === "val.or" ||
    node.opcode === "val.xor"
  ) {
    const opcodeMap: Record<string, MachOpcode> = {
      "val.and": "and",
      "val.or": "or",
      "val.xor": "xor",
    };
    return [
      {
        id: insId,
        opcode: opcodeMap[node.opcode]!,
        defs: [reg(node.id)],
        uses: node.valueInputs.map((id) => reg(id)),
        span: node.span,
      },
    ];
  }

  if (
    node.opcode === "val.shl" ||
    node.opcode === "val.shr_u" ||
    node.opcode === "val.shr_s"
  ) {
    const opcode: MachOpcode = node.opcode === "val.shl" ? "shl" : "shr";
    return [
      {
        id: insId,
        opcode,
        defs: [reg(node.id)],
        uses: node.valueInputs.map((id) => reg(id)),
        span: node.span,
      },
    ];
  }

  if (node.opcode.startsWith("val.cmp_")) {
    const cond = mapComparisonCondition(node.opcode);
    return [
      {
        id: insId++,
        opcode: "cmp",
        defs: [],
        uses: node.valueInputs.map((id) => reg(id)),
        condition: cond,
        span: node.span,
      },
      {
        id: insId,
        opcode: "mov",
        defs: [reg(node.id)],
        uses: [],
        condition: cond,
        span: node.span,
      },
    ];
  }

  if (node.opcode === "val.call") {
    const callerClobbers = ccDetails.callerSavedRegisters.map((hwIndex) =>
      fixedReg(hwIndex),
    );
    return [
      {
        id: insId,
        opcode: "call",
        defs: [reg(node.id)],
        uses: node.valueInputs.map((id) => reg(id)),
        clobbers: callerClobbers,
        span: node.span,
      },
    ];
  }

  if (node.opcode === "val.phi" || node.opcode === "mem.phi") {
    const phiInputs: MachPhiInput[] = node.valueInputs.map((valId, idx) => ({
      blockId: node.controlInputs[idx] ?? idx + 1,
      register: reg(valId),
    }));
    return [
      {
        id: insId,
        opcode: "phi",
        defs: [reg(node.id)],
        uses: node.valueInputs.map((id) => reg(id)),
        phiInputs,
        span: node.span,
      },
    ];
  }

  if (node.opcode === "mem.load") {
    const baseReg = reg(node.valueInputs[0] ?? 0);
    return [
      {
        id: insId,
        opcode: "load",
        defs: [reg(node.id)],
        uses: [baseReg],
        memoryOffset: { base: baseReg, offset: 0 },
        span: node.span,
      },
    ];
  }

  if (node.opcode === "mem.store") {
    const baseReg = reg(node.valueInputs[0] ?? 0);
    const valueReg = reg(node.valueInputs[1] ?? 0);
    return [
      {
        id: insId,
        opcode: "store",
        defs: [],
        uses: [baseReg, valueReg],
        memoryOffset: { base: baseReg, offset: 0 },
        span: node.span,
      },
    ];
  }

  if (node.opcode === "mmio.read") {
    return [
      {
        id: insId,
        opcode: "mmio_read",
        defs: [reg(node.id)],
        uses: node.valueInputs.map((id) => reg(id)),
        span: node.span,
      },
    ];
  }

  if (node.opcode === "mmio.write") {
    return [
      {
        id: insId,
        opcode: "mmio_write",
        defs: [],
        uses: node.valueInputs.map((id) => reg(id)),
        span: node.span,
      },
    ];
  }

  if (node.opcode === "ctrl.barrier" || node.opcode === "ctrl.suspend") {
    return [
      {
        id: insId,
        opcode: "barrier",
        defs: [],
        uses: [],
        span: node.span,
      },
    ];
  }

  if (node.opcode === "ctrl.branch") {
    const targets = branchTargets.get(node.id) ?? {
      trueBlockId: 2,
      falseBlockId: 3,
    };
    const condReg = node.valueInputs[0] ? reg(node.valueInputs[0]) : undefined;
    return [
      {
        id: insId++,
        opcode: "jcc",
        defs: [],
        uses: condReg ? [condReg] : [],
        condition: "ne",
        targetBlockId: targets.trueBlockId,
        targetBlockLabel: `block_${targets.trueBlockId}`,
        span: node.span,
      },
      {
        id: insId,
        opcode: "jmp",
        defs: [],
        uses: [],
        targetBlockId: targets.falseBlockId,
        targetBlockLabel: `block_${targets.falseBlockId}`,
        span: node.span,
      },
    ];
  }

  if (node.opcode === "ctrl.return") {
    return [
      {
        id: insId,
        opcode: "ret",
        defs: [],
        uses: node.valueInputs.map((id) => reg(id)),
        span: node.span,
      },
    ];
  }

  if (node.opcode.startsWith("val.simd.")) {
    return [
      {
        id: insId,
        opcode: "simd_op",
        defs: [reg(node.id, "vector")],
        uses: node.valueInputs.map((id) => reg(id, "vector")),
        span: node.span,
      },
    ];
  }

  return [];
}
