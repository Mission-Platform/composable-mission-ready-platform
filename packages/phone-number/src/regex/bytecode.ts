// Shared bytecode contract for the regex engine.
//
// libphonenumber drives validation and formatting with JavaScript `RegExp`
// against per-region patterns stored in the metadata. AssemblyScript has no
// native `RegExp`, so — per the chosen "precompile patterns" strategy — each
// pattern is compiled (at build time, in TypeScript) into a compact, flat
// bytecode program that a tiny virtual machine executes at runtime (both in a
// TypeScript reference implementation here and, identically, in the
// AssemblyScript/WebAssembly core).
//
// The bytecode is intentionally trivial to marshal across the wasm boundary:
// two flat `i32` arrays (`program` and `classes`) plus a group count.
//
// Program layout: a flat array of fixed-width, 3-int instructions. The program
// counter (`pc`) addresses instructions, so the backing offset is `pc * 3`.

/** Opcodes. Kept in lock-step with the AssemblyScript VM (`assembly/regex.ts`). */
export const Op = {
  /** Accept the current thread. */
  MATCH: 0,
  /** Match a single literal char whose code is operand `a`. */
  CHAR: 1,
  /** Match any single char (`.`). */
  ANY: 2,
  /**
   * Match a single char against the character class at `classes` offset `a`.
   * Operand `b` is the negation flag (`1` = negated).
   */
  CLASS: 3,
  /** Fork execution into two threads at pcs `a` (higher priority) and `b`. */
  SPLIT: 4,
  /** Jump to pc `a`. */
  JMP: 5,
  /** Record the current input position into capture slot `a`. */
  SAVE: 6,
  /** Assert start-of-input (`^`). */
  BOL: 7,
  /** Assert end-of-input (`$`). */
  EOL: 8,
} as const;

export type Opcode = (typeof Op)[keyof typeof Op];

/** Width, in ints, of a single bytecode instruction. */
export const INSTR_WIDTH = 3;

/**
 * A compiled regex program.
 *
 * `classes` is a flat table of character-class records. Each record referenced
 * by a {@link Op.CLASS} instruction is laid out as `[rangeCount, lo0, hi0, lo1,
 * hi1, ...]` where each `[lo, hi]` pair is an inclusive code-point range.
 */
export interface CompiledRegex {
  /** Flat instruction stream (`INSTR_WIDTH` ints per instruction). */
  program: number[];
  /** Flat character-class range table. */
  classes: number[];
  /** Number of capturing groups (excluding the implicit whole-match group 0). */
  groupCount: number;
}
