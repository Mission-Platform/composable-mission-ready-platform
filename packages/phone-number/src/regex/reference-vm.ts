// Reference (TypeScript) implementation of the bytecode VM.
//
// This mirrors — instruction for instruction — the AssemblyScript VM in
// `assembly/regex.ts`. It exists so the compiler and the matching semantics can
// be exercised with fast, dependency-free unit tests, and so the two
// implementations can be diff-tested against each other.
//
// The matcher is a recursive, leftmost-first backtracker (matching JavaScript
// `RegExp` priority), with capture slots saved/restored across `SPLIT` branches.

import { type CompiledRegex, INSTR_WIDTH, Op } from './bytecode.js';

/** A successful match: capture slots as `[start0, end0, start1, end1, ...]`. */
export type Captures = number[];

function classMatches(classes: number[], offset: number, code: number): boolean {
  const count = classes[offset];
  let i = offset + 1;
  for (let r = 0; r < count; r++) {
    const lo = classes[i];
    const hi = classes[i + 1];
    if (code >= lo && code <= hi) return true;
    i += 2;
  }
  return false;
}

class Runner {
  private readonly program: number[];
  private readonly classes: number[];
  private readonly input: string;
  private readonly requireEnd: boolean;

  constructor(program: number[], classes: number[], input: string, requireEnd: boolean) {
    this.program = program;
    this.classes = classes;
    this.input = input;
    this.requireEnd = requireEnd;
  }

  run(pc: number, sp: number, saves: number[]): boolean {
    const { program, input } = this;
    for (;;) {
      const base = pc * INSTR_WIDTH;
      const op = program[base];
      const a = program[base + 1];
      const b = program[base + 2];
      switch (op) {
        case Op.MATCH:
          return this.requireEnd ? sp === input.length : true;
        case Op.CHAR:
          if (sp < input.length && input.charCodeAt(sp) === a) {
            pc += 1;
            sp += 1;
            continue;
          }
          return false;
        case Op.ANY:
          if (sp < input.length) {
            pc += 1;
            sp += 1;
            continue;
          }
          return false;
        case Op.CLASS: {
          if (sp >= input.length) return false;
          const hit = classMatches(this.classes, a, input.charCodeAt(sp));
          if (hit === (b === 0)) {
            pc += 1;
            sp += 1;
            continue;
          }
          return false;
        }
        case Op.BOL:
          if (sp === 0) {
            pc += 1;
            continue;
          }
          return false;
        case Op.EOL:
          if (sp === input.length) {
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
          for (let i = 0; i < snapshot.length; i++) saves[i] = snapshot[i];
          pc = b;
          continue;
        }
        default:
          return false;
      }
    }
  }
}

function newSaves(groupCount: number): number[] {
  const slots = 2 * (groupCount + 1);
  return new Array<number>(slots).fill(-1);
}

function attempt(re: CompiledRegex, input: string, start: number, requireEnd: boolean): Captures | null {
  const saves = newSaves(re.groupCount);
  const runner = new Runner(re.program, re.classes, input, requireEnd);
  return runner.run(0, start, saves) ? saves : null;
}

/** Whole-string match: anchored at position 0 and must consume all of `input`. */
export function fullMatch(re: CompiledRegex, input: string): Captures | null {
  return attempt(re, input, 0, true);
}

/** Anchored (position 0) match that need not consume the whole input. */
export function prefixMatch(re: CompiledRegex, input: string): Captures | null {
  return attempt(re, input, 0, false);
}

/** Leftmost match at or after `start` (not required to reach end-of-input). */
export function search(re: CompiledRegex, input: string, start = 0): Captures | null {
  for (let i = start; i <= input.length; i++) {
    const captures = attempt(re, input, i, false);
    if (captures !== null) return captures;
  }
  return null;
}

/** `true` when `input` matches `re` in its entirety. */
export function test(re: CompiledRegex, input: string): boolean {
  return fullMatch(re, input) !== null;
}
