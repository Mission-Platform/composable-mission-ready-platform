import { type CompiledRegex, INSTR_WIDTH, Op } from "./bytecode.js";

/**
 * Linear-time PikeVM execution engine and reference VM for Flint regular expressions.
 *
 * Guarantees O(M * N) execution time and complete immunity to ReDoS catastrophic backtracking
 * across pathological nested quantifiers. Serves as the production matching engine and
 * conformance oracle for the Forge regex bytecode specification.
 */

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

abstract class BaseRunner {
  protected readonly program: readonly number[];
  protected readonly classes: readonly number[];
  protected readonly input: string;
  protected readonly requireEnd: boolean;

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
}

interface Thread {
  pc: number;
  saves: number[];
}

/**
 * Linear-time non-backtracking PikeVM execution engine.
 * Guarantees O(M * N) time complexity where M is instruction count and N is input length,
 * completely immune to ReDoS (Regular Expression Denial of Service).
 */
export class PikeRunner extends BaseRunner {
  public run(start: number, initialSaves: number[]): Captures | null {
    const instructionCount = Math.floor(this.program.length / INSTR_WIDTH);
    if (instructionCount === 0) {
      // eslint-disable-next-line unicorn/no-null -- null represents no match in reference VM contract.
      return null;
    }

    const visited = new Int32Array(instructionCount).fill(-1);
    // eslint-disable-next-line unicorn/no-null -- null represents no match in reference VM contract.
    let matchedSaves: Captures | null = null;
    let currentThreads: Thread[] = [];

    const addThread = (
      pc: number,
      sp: number,
      saves: number[],
      targetThreads: Thread[],
    ): boolean => {
      if (pc >= instructionCount) return false;
      if (visited[pc] !== -1) return false;
      visited[pc] = 1;

      const base = pc * INSTR_WIDTH;
      const op = this.program[base];
      const a = this.program[base + 1];
      const b = this.program[base + 2];

      switch (op) {
        case Op.MATCH: {
          if (this.requireEnd) {
            if (sp === this.input.length && matchedSaves === null) {
              matchedSaves = [...saves];
              return true;
            }
          } else {
            matchedSaves = [...saves];
            return true;
          }
          return false;
        }
        case Op.JMP: {
          return addThread(a, sp, saves, targetThreads);
        }
        case Op.SPLIT: {
          const matchA = addThread(a, sp, saves, targetThreads);
          // If branch A matched and we don't require end:
          // Branch A has higher priority than branch B, so branch B cannot beat branch A.
          if (matchA && !this.requireEnd) {
            return true;
          }
          if (matchA && this.requireEnd && sp === this.input.length) {
            return true;
          }
          const matchB = addThread(b, sp, saves, targetThreads);
          return matchA || matchB;
        }
        case Op.SAVE: {
          const nextSaves = [...saves];
          nextSaves[a] = sp;
          return addThread(pc + 1, sp, nextSaves, targetThreads);
        }
        case Op.BOL: {
          if (sp === 0) {
            return addThread(pc + 1, sp, saves, targetThreads);
          }
          return false;
        }
        case Op.EOL: {
          if (sp === this.input.length) {
            return addThread(pc + 1, sp, saves, targetThreads);
          }
          return false;
        }
        case Op.CHAR:
        case Op.ANY:
        case Op.CLASS: {
          targetThreads.push({ pc, saves });
          return false;
        }
        default: {
          return false;
        }
      }
    };

    // Initial epsilon expansion at start
    visited.fill(-1);
    const initialMatched = addThread(0, start, initialSaves, currentThreads);

    if (this.requireEnd) {
      if (start === this.input.length && matchedSaves !== null) {
        return matchedSaves;
      }
    } else if (initialMatched && currentThreads.length === 0) {
      return matchedSaves;
    }

    // Step through the input string
    for (let sp = start; sp < this.input.length; sp++) {
      if (currentThreads.length === 0) {
        break;
      }

      const active = currentThreads;
      currentThreads = [];
      visited.fill(-1);

      // eslint-disable-next-line unicorn/prefer-code-point -- VM mirrors the UTF-16 bytecode contract.
      const code = this.input.charCodeAt(sp);
      let matchedAtThisSp = false;

      for (const thread of active) {
        if (matchedAtThisSp) {
          // A higher-priority thread in active already matched at sp + 1;
          // no lower-priority thread in active can beat it.
          break;
        }

        const base = thread.pc * INSTR_WIDTH;
        const op = this.program[base];
        const a = this.program[base + 1];
        const b = this.program[base + 2];

        let consumes = false;
        switch (op) {
          case Op.CHAR: {
            consumes = code === a;
            break;
          }
          case Op.ANY: {
            consumes = true;
            break;
          }
          case Op.CLASS: {
            consumes = classMatches(this.classes, a, code) === (b === 0);
            break;
          }
          default: {
            break;
          }
        }

        if (consumes) {
          const matched = addThread(
            thread.pc + 1,
            sp + 1,
            thread.saves,
            currentThreads,
          );
          if (matched) {
            matchedAtThisSp = true;
          }
        }
      }

      if (!this.requireEnd && matchedAtThisSp && currentThreads.length === 0) {
        return matchedSaves;
      }
    }

    return matchedSaves;
  }

  /**
   * Perform an unanchored leftmost search starting at position `start` in linear time O(M * N).
   *
   * Injects new search threads progressively at each input position while extending active
   * threads from the leftmost start position, guaranteeing ReDoS immunity.
   */
  public search(start: number, initialSaves: number[]): Captures | null {
    const instructionCount = Math.floor(this.program.length / INSTR_WIDTH);
    if (instructionCount === 0) {
      // eslint-disable-next-line unicorn/no-null -- null represents no match in reference VM contract.
      return null;
    }

    const visited = new Int32Array(instructionCount).fill(-1);
    // eslint-disable-next-line unicorn/no-null -- null represents no match in reference VM contract.
    let matchedSaves: Captures | null = null;
    let currentThreads: Thread[] = [];

    const addThread = (
      pc: number,
      sp: number,
      saves: number[],
      targetThreads: Thread[],
    ): boolean => {
      if (pc >= instructionCount) return false;
      if (visited[pc] !== -1) return false;
      visited[pc] = 1;

      const base = pc * INSTR_WIDTH;
      const op = this.program[base];
      const a = this.program[base + 1];
      const b = this.program[base + 2];

      switch (op) {
        case Op.MATCH: {
          if (matchedSaves === null || saves[0] <= matchedSaves[0]) {
            matchedSaves = [...saves];
            return true;
          }
          return false;
        }
        case Op.JMP: {
          return addThread(a, sp, saves, targetThreads);
        }
        case Op.SPLIT: {
          const matchA = addThread(a, sp, saves, targetThreads);
          if (matchA) {
            return true;
          }
          const matchB = addThread(b, sp, saves, targetThreads);
          return matchA || matchB;
        }
        case Op.SAVE: {
          const nextSaves = [...saves];
          nextSaves[a] = sp;
          return addThread(pc + 1, sp, nextSaves, targetThreads);
        }
        case Op.BOL: {
          if (sp === 0) {
            return addThread(pc + 1, sp, saves, targetThreads);
          }
          return false;
        }
        case Op.EOL: {
          if (sp === this.input.length) {
            return addThread(pc + 1, sp, saves, targetThreads);
          }
          return false;
        }
        case Op.CHAR:
        case Op.ANY:
        case Op.CLASS: {
          targetThreads.push({ pc, saves });
          return false;
        }
        default: {
          return false;
        }
      }
    };

    for (let sp = start; sp <= this.input.length; sp++) {
      visited.fill(-1);

      if (matchedSaves === null) {
        addThread(0, sp, initialSaves, currentThreads);
        if (matchedSaves !== null && currentThreads.length === 0) {
          return matchedSaves;
        }
      }

      if (sp === this.input.length) {
        break;
      }

      const active = currentThreads;
      currentThreads = [];
      visited.fill(-1);

      // eslint-disable-next-line unicorn/prefer-code-point -- VM mirrors the UTF-16 bytecode contract.
      const code = this.input.charCodeAt(sp);
      let matchedAtThisSp = false;

      for (const thread of active) {
        if (matchedAtThisSp) {
          break;
        }

        const base = thread.pc * INSTR_WIDTH;
        const op = this.program[base];
        const a = this.program[base + 1];
        const b = this.program[base + 2];

        let consumes = false;
        switch (op) {
          case Op.CHAR: {
            consumes = code === a;
            break;
          }
          case Op.ANY: {
            consumes = true;
            break;
          }
          case Op.CLASS: {
            consumes = classMatches(this.classes, a, code) === (b === 0);
            break;
          }
          default: {
            break;
          }
        }

        if (consumes) {
          const matched = addThread(
            thread.pc + 1,
            sp + 1,
            thread.saves,
            currentThreads,
          );
          if (matched) {
            matchedAtThisSp = true;
          }
        }
      }

      if (matchedSaves !== null) {
        const bestStart = matchedSaves[0] >= 0 ? matchedSaves[0] : start;
        currentThreads = currentThreads.filter(
          (thread) => thread.saves[0] <= bestStart,
        );
        if (currentThreads.length === 0) {
          return matchedSaves;
        }
      }
    }

    return matchedSaves;
  }
}

export class Runner extends BaseRunner {
  public run(pc: number, sp: number, saves: number[]): boolean {
    for (;;) {
      const base = pc * INSTR_WIDTH;
      const op = this.program[base];
      const a = this.program[base + 1];
      const b = this.program[base + 2];
      switch (op) {
        case Op.MATCH: {
          return this.requireEnd ? sp === this.input.length : true;
        }
        case Op.CHAR: {
          // eslint-disable-next-line unicorn/prefer-code-point -- VM mirrors the UTF-16 bytecode contract.
          if (sp < this.input.length && this.input.charCodeAt(sp) === a) {
            pc += 1;
            sp += 1;
            continue;
          }
          return false;
        }
        case Op.ANY: {
          if (sp < this.input.length) {
            pc += 1;
            sp += 1;
            continue;
          }
          return false;
        }
        case Op.CLASS: {
          if (sp >= this.input.length) return false;
          if (
            // eslint-disable-next-line unicorn/prefer-code-point -- VM mirrors the UTF-16 bytecode contract.
            classMatches(this.classes, a, this.input.charCodeAt(sp)) ===
            (b === 0)
          ) {
            pc += 1;
            sp += 1;
            continue;
          }
          return false;
        }
        case Op.BOL: {
          if (sp === 0) {
            pc += 1;
            continue;
          }
          return false;
        }
        case Op.EOL: {
          if (sp === this.input.length) {
            pc += 1;
            continue;
          }
          return false;
        }
        case Op.SAVE: {
          saves[a] = sp;
          pc += 1;
          continue;
        }
        case Op.JMP: {
          pc = a;
          continue;
        }
        case Op.SPLIT: {
          const snapshot = [...saves];
          if (this.run(a, sp, saves)) return true;
          for (let index = 0; index < snapshot.length; index++)
            saves[index] = snapshot[index];
          pc = b;
          continue;
        }
        default: {
          return false;
        }
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
  const saves = Array.from({ length: 2 * (re.groupCount + 1) }, () => -1);
  return new Runner(re.program, re.classes, input, requireEnd).run(
    0,
    start,
    saves,
  )
    ? saves
    : // eslint-disable-next-line unicorn/no-null -- failed attempts are part of the reference VM contract.
      null;
}

/**
 * Execute a linear-time match attempt using PikeRunner initialized with default capture slots.
 */
function attemptPike(
  re: CompiledRegex,
  input: string,
  start: number,
  requireEnd: boolean,
): Captures | null {
  const saves = Array.from({ length: 2 * (re.groupCount + 1) }, () => -1);
  return new PikeRunner(re.program, re.classes, input, requireEnd).run(
    start,
    saves,
  );
}

/** Whole-string match, anchored at position zero (uses linear-time PikeVM by default). */
export function fullMatch(re: CompiledRegex, input: string): Captures | null {
  return attemptPike(re, input, 0, true);
}

/**
 * Whole-string match using the linear-time PikeVM engine.
 * Guarantees O(M * N) execution and immunity to ReDoS backtracking.
 */
export function fullMatchLinear(
  re: CompiledRegex,
  input: string,
): Captures | null {
  return attemptPike(re, input, 0, true);
}

/** Backtracking whole-string match reference oracle. */
export function fullMatchBacktracking(
  re: CompiledRegex,
  input: string,
): Captures | null {
  return attempt(re, input, 0, true);
}

/** Prefix match, anchored at position zero but not at the end (uses linear-time PikeVM by default). */
export function prefixMatch(re: CompiledRegex, input: string): Captures | null {
  return attemptPike(re, input, 0, false);
}

/**
 * Prefix match using the linear-time PikeVM engine.
 * Guarantees O(M * N) execution and immunity to ReDoS backtracking.
 */
export function prefixMatchLinear(
  re: CompiledRegex,
  input: string,
): Captures | null {
  return attemptPike(re, input, 0, false);
}

/** Backtracking prefix match reference oracle. */
export function prefixMatchBacktracking(
  re: CompiledRegex,
  input: string,
): Captures | null {
  return attempt(re, input, 0, false);
}

/** Leftmost match at or after `start` (uses linear-time PikeVM by default). */
export function search(
  re: CompiledRegex,
  input: string,
  start = 0,
): Captures | null {
  const saves = Array.from({ length: 2 * (re.groupCount + 1) }, () => -1);
  return new PikeRunner(re.program, re.classes, input, false).search(
    start,
    saves,
  );
}

/**
 * Leftmost match at or after `start` using the linear-time PikeVM engine.
 * Immune to catastrophic backtracking on unanchored search patterns.
 */
export function searchLinear(
  re: CompiledRegex,
  input: string,
  start = 0,
): Captures | null {
  return search(re, input, start);
}

/** Backtracking search reference oracle. */
export function searchBacktracking(
  re: CompiledRegex,
  input: string,
  start = 0,
): Captures | null {
  for (let position = start; position <= input.length; position++) {
    const captures = attempt(re, input, position, false);
    if (captures !== null) return captures;
  }
  // eslint-disable-next-line unicorn/no-null -- failed searches are part of the reference VM contract.
  return null;
}

/** Whole-string boolean match (uses linear-time PikeVM by default). */
export function test(re: CompiledRegex, input: string): boolean {
  return fullMatch(re, input) !== null;
}

/**
 * Whole-string boolean match using the linear-time PikeVM engine.
 * Immune to catastrophic backtracking on pathological regular expressions.
 */
export function testLinear(re: CompiledRegex, input: string): boolean {
  return fullMatchLinear(re, input) !== null;
}

/** Backtracking boolean match reference oracle. */
export function testBacktracking(re: CompiledRegex, input: string): boolean {
  return fullMatchBacktracking(re, input) !== null;
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

export { FORGE_REGEX_BYTECODE_VERSION } from "./bytecode.js";
