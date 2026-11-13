import type { FlintSourceSpan } from "@mission-platform/flint-ast";

/**
 * Register representation in MachIR (virtual SSA register or mapped physical register).
 */
export interface MachRegister {
  readonly id: number;
  readonly isVirtual: boolean;
  readonly physicalClass?: "general" | "float" | "vector" | "special";
  readonly assignedHardwareIndex?: number;
  readonly isFixed?: boolean;
  readonly fixedRegisterName?: string;
  readonly spillSlot?: number;
}

/**
 * Target-agnostic 3-address pseudo-opcodes for abstract machine operations.
 */
export type MachOpcode =
  | "mov"
  | "load"
  | "store"
  | "add"
  | "sub"
  | "mul"
  | "div"
  | "and"
  | "or"
  | "xor"
  | "shl"
  | "shr"
  | "cmp"
  | "test"
  | "jmp"
  | "jcc"
  | "call"
  | "ret"
  | "phi"
  | "mmio_read"
  | "mmio_write"
  | "barrier"
  | "simd_op";

/**
 * Condition code for conditional jumps (jcc).
 */
export type MachCondition =
  | "eq"
  | "ne"
  | "lt"
  | "le"
  | "gt"
  | "ge"
  | "ult"
  | "ule"
  | "ugt"
  | "uge"
  | "always";

/**
 * Memory addressing offset descriptor.
 */
export interface MachMemoryOffset {
  readonly base: MachRegister;
  readonly offset: number;
  readonly scale?: number;
  readonly index?: MachRegister;
}

/**
 * Phi input mapping from predecessor basic block to incoming register.
 */
export interface MachPhiInput {
  readonly blockId: number;
  readonly register: MachRegister;
}

/**
 * Single target-independent machine pseudo-instruction.
 */
export interface MachInstruction {
  readonly id: number;
  readonly opcode: MachOpcode;
  readonly defs: readonly MachRegister[];
  readonly uses: readonly MachRegister[];
  readonly clobbers?: readonly MachRegister[];
  readonly immediate?: number | bigint | string;
  readonly condition?: MachCondition | string;
  readonly targetBlockId?: number;
  readonly targetBlockLabel?: string;
  readonly memoryOffset?: MachMemoryOffset;
  readonly phiInputs?: readonly MachPhiInput[];
  readonly span?: FlintSourceSpan;
}

/**
 * MachIR Basic Block containing a linearized sequence of pseudo-instructions and CFG edges.
 */
export interface MachBasicBlock {
  readonly id: number;
  readonly label: string;
  readonly instructions: readonly MachInstruction[];
  readonly predecessors: readonly number[];
  readonly successors: readonly number[];
  readonly loopNestingDepth?: number;
}

/**
 * Supported hardware and stack calling conventions.
 */
export type CallingConvention =
  "system_v" | "arm_aapcs" | "win64" | "wasm_stack" | "cdecl";

/**
 * Detailed register configuration for a calling convention.
 */
export interface CallingConventionDetails {
  readonly name: CallingConvention;
  readonly argumentRegisters: readonly number[];
  readonly returnRegisters: readonly number[];
  readonly callerSavedRegisters: readonly number[];
  readonly calleeSavedRegisters: readonly number[];
}

/**
 * MachIR Function with calling conventions and basic blocks.
 */
export interface MachFunction {
  readonly name: string;
  readonly blocks: readonly MachBasicBlock[];
  readonly stackFrameSize: number;
  readonly callingConvention: CallingConvention;
  readonly isInterruptHandler: boolean;
  readonly parameters?: readonly MachRegister[];
  readonly returnRegisters?: readonly MachRegister[];
}

/**
 * MachIR Module containing functions and global declarations.
 */
export interface MachModule {
  readonly name: string;
  readonly functions: readonly MachFunction[];
}
