/** Stable version of the shared Forge regex bytecode contract. */
export const FORGE_REGEX_BYTECODE_VERSION = "1" as const;

/** Opcodes consumed by the Forge backend and mirrored by the reference oracle. */
export const Op = {
  MATCH: 0,
  CHAR: 1,
  ANY: 2,
  CLASS: 3,
  SPLIT: 4,
  JMP: 5,
  SAVE: 6,
  BOL: 7,
  EOL: 8,
} as const;

export type Opcode = (typeof Op)[keyof typeof Op];

/** Width, in 32-bit integer operands, of every instruction. */
export const INSTR_WIDTH = 3;

/** Deterministic representation embedded by a Forge backend. */
export interface CompiledRegex {
  readonly program: number[];
  readonly classes: number[];
  readonly groupCount: number;
}
