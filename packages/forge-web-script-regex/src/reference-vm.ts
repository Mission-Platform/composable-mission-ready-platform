import {
  type CompiledRegex,
  FORGE_REGEX_BYTECODE_VERSION,
  INSTR_WIDTH,
  Op,
} from "./bytecode.js";

/**
 * This module is an oracle only. Production regex execution is emitted into
 * Forge Web Script WASM by the backend; no TypeScript matcher is a runtime
 * implementation of the standard library.
 */
export { FORGE_REGEX_BYTECODE_VERSION };

/** Capture slots are `[start0, end0, start1, end1, ...]`; `-1` means unset. */
export type Captures = number[];

function classMatches(
  classes: readonly number[],
  offset: number,
  code: number,
): boolean {
  const count = classes[offset];
  let index = offset + 1;
  for (let range = 0; range < count; range++) {
    const lo = classes[index];
    const hi = classes[index + 1];
    if (code >= lo && code <= hi) return true;
    index += 2;
  }
  return false;
}

class Runner {
  private readonly program: readonly number[];
  private readonly classes: readonly number[];
  private readonly input: string;
  private readonly requireEnd: boolean;

  public constructor(
    program: readonly number[],
    classes: readonly number[],
    input: string,
    requireEnd: boolean,
  ) {
    this.program = program;
    this.classes = classes;
    this.input = input;
    this.requireEnd = requireEnd;
  }

  public run(pc: number, sp: number, saves: number[]): boolean {
    for (;;) {
      const base = pc * INSTR_WIDTH;
      const op = this.program[base];
      const a = this.program[base + 1];
      const b = this.program[base + 2];
      switch (op) {
        case Op.MATCH:
          return this.requireEnd ? sp === this.input.length : true;
        case Op.CHAR:
          if (sp < this.input.length && this.input.charCodeAt(sp) === a) {
            pc += 1;
            sp += 1;
            continue;
          }
          return false;
        case Op.ANY:
          if (sp < this.input.length) {
            pc += 1;
            sp += 1;
            continue;
          }
          return false;
        case Op.CLASS:
          if (sp >= this.input.length) return false;
          if (
            classMatches(this.classes, a, this.input.charCodeAt(sp)) ===
            (b === 0)
          ) {
            pc += 1;
            sp += 1;
            continue;
          }
          return false;
        case Op.BOL:
          if (sp === 0) {
            pc += 1;
            continue;
          }
          return false;
        case Op.EOL:
          if (sp === this.input.length) {
            pc += 1;
            continue;
          }
          return false;
        case Op.SAVE:
          saves[a] = sp;
          pc += 1;
          continue;
        case Op.JMP:
          pc = a;
          continue;
        case Op.SPLIT: {
          const snapshot = saves.slice();
          if (this.run(a, sp, saves)) return true;
          for (let index = 0; index < snapshot.length; index++)
            saves[index] = snapshot[index];
          pc = b;
          continue;
        }
        default:
          return false;
      }
    }
  }
}

function attempt(
  re: CompiledRegex,
  input: string,
  start: number,
  requireEnd: boolean,
): Captures | null {
  const saves = new Array<number>(2 * (re.groupCount + 1)).fill(-1);
  return new Runner(re.program, re.classes, input, requireEnd).run(
    0,
    start,
    saves,
  )
    ? saves
    : null;
}

/** Whole-string match, anchored at position zero. */
export function fullMatch(re: CompiledRegex, input: string): Captures | null {
  return attempt(re, input, 0, true);
}

/** Prefix match, anchored at position zero but not at the end. */
export function prefixMatch(re: CompiledRegex, input: string): Captures | null {
  return attempt(re, input, 0, false);
}

/** Leftmost match at or after `start`. */
export function search(
  re: CompiledRegex,
  input: string,
  start = 0,
): Captures | null {
  for (let position = start; position <= input.length; position++) {
    const captures = attempt(re, input, position, false);
    if (captures !== null) return captures;
  }
  return null;
}

/** Whole-string boolean match. */
export function test(re: CompiledRegex, input: string): boolean {
  return fullMatch(re, input) !== null;
}

/** Read a capture start without exposing the bytecode slot layout to callers. */
export function captureStart(captures: Captures | null, group: number): number {
  return captures === null || group < 0 || group * 2 >= captures.length
    ? -1
    : (captures[group * 2] ?? -1);
}

/** Read a capture end without exposing the bytecode slot layout to callers. */
export function captureEnd(captures: Captures | null, group: number): number {
  return captures === null || group < 0 || group * 2 + 1 >= captures.length
    ? -1
    : (captures[group * 2 + 1] ?? -1);
}
