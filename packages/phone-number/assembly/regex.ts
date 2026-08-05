// AssemblyScript bytecode VM for precompiled regular expressions.
//
// This is the runtime counterpart of the build-time compiler in
// `src/regex/compiler.ts`; it mirrors, instruction for instruction, the
// TypeScript reference VM in `src/regex/reference-vm.ts`. libphonenumber's
// patterns are compiled to flat `i32` bytecode ahead of time, so this module
// contains no JavaScript `RegExp` (which AssemblyScript lacks) — only a small
// leftmost-first backtracking matcher with capture-group support.
//
// Program layout: a flat `Int32Array` of fixed-width, 3-int instructions; the
// program counter addresses instructions (backing offset = `pc * 3`). Character
// classes live in a second flat `Int32Array`, each record laid out as
// `[rangeCount, lo0, hi0, ...]`.

// Opcodes — kept in lock-step with `src/regex/bytecode.ts`.
const OP_MATCH: i32 = 0;
const OP_CHAR: i32 = 1;
const OP_ANY: i32 = 2;
const OP_CLASS: i32 = 3;
const OP_SPLIT: i32 = 4;
const OP_JMP: i32 = 5;
const OP_SAVE: i32 = 6;
const OP_BOL: i32 = 7;
const OP_EOL: i32 = 8;

const INSTR_WIDTH: i32 = 3;

/** A compiled program plus its class table, ready to be matched repeatedly. */
export class Program {
  program: Int32Array;
  classes: Int32Array;
  groupCount: i32;

  constructor(program: Int32Array, classes: Int32Array, groupCount: i32) {
    this.program = program;
    this.classes = classes;
    this.groupCount = groupCount;
  }

  slotCount(): i32 {
    return 2 * (this.groupCount + 1);
  }
}

function classMatches(classes: Int32Array, offset: i32, code: i32): bool {
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
  program: Int32Array;
  classes: Int32Array;
  input: string;
  requireEnd: bool;
  len: i32;

  constructor(prog: Program, input: string, requireEnd: bool) {
    this.program = prog.program;
    this.classes = prog.classes;
    this.input = input;
    this.requireEnd = requireEnd;
    this.len = input.length;
  }

  run(pc: i32, sp: i32, saves: Int32Array): bool {
    const program = this.program;
    const input = this.input;
    const len = this.len;
    for (;;) {
      const base = pc * INSTR_WIDTH;
      const op = program[base];
      const a = program[base + 1];
      const b = program[base + 2];
      if (op == OP_MATCH) {
        return this.requireEnd ? sp == len : true;
      } else if (op == OP_CHAR) {
        if (sp < len && input.charCodeAt(sp) == a) {
          pc += 1;
          sp += 1;
          continue;
        }
        return false;
      } else if (op == OP_ANY) {
        if (sp < len) {
          pc += 1;
          sp += 1;
          continue;
        }
        return false;
      } else if (op == OP_CLASS) {
        if (sp >= len) return false;
        const hit = classMatches(this.classes, a, input.charCodeAt(sp));
        if (hit == (b == 0)) {
          pc += 1;
          sp += 1;
          continue;
        }
        return false;
      } else if (op == OP_BOL) {
        if (sp == 0) {
          pc += 1;
          continue;
        }
        return false;
      } else if (op == OP_EOL) {
        if (sp == len) {
          pc += 1;
          continue;
        }
        return false;
      } else if (op == OP_SAVE) {
        saves[a] = sp;
        pc += 1;
        continue;
      } else if (op == OP_JMP) {
        pc = a;
        continue;
      } else if (op == OP_SPLIT) {
        const n = saves.length;
        const snapshot = new Int32Array(n);
        for (let i = 0; i < n; i++) snapshot[i] = saves[i];
        if (this.run(a, sp, saves)) return true;
        for (let i = 0; i < n; i++) saves[i] = snapshot[i];
        pc = b;
        continue;
      } else {
        return false;
      }
    }
    return false;
  }
}

function newSaves(prog: Program): Int32Array {
  const slots = prog.slotCount();
  const saves = new Int32Array(slots);
  for (let i = 0; i < slots; i++) saves[i] = -1;
  return saves;
}

/** Run `prog` against `input` from `start`; returns capture slots or `null`. */
export function matchProgram(prog: Program, input: string, start: i32, requireEnd: bool): Int32Array | null {
  const saves = newSaves(prog);
  const runner = new Runner(prog, input, requireEnd);
  if (runner.run(0, start, saves)) return saves;
  return null;
}

/** Whole-string match: anchored at 0 and must consume all of `input`. */
export function fullMatch(prog: Program, input: string): Int32Array | null {
  return matchProgram(prog, input, 0, true);
}

/** Anchored (position 0) match not required to consume the whole input. */
export function prefixMatch(prog: Program, input: string): Int32Array | null {
  return matchProgram(prog, input, 0, false);
}

/** Leftmost match at or after `start`. */
export function searchProgram(prog: Program, input: string, start: i32): Int32Array | null {
  for (let i = start; i <= input.length; i++) {
    const caps = matchProgram(prog, input, i, false);
    if (caps != null) return caps;
  }
  return null;
}

/** `true` when `input` matches `prog` in its entirety. */
export function testProgram(prog: Program, input: string): bool {
  return fullMatch(prog, input) != null;
}

// ---------------------------------------------------------------------------
// Test entry points (exported so the wasm VM can be diff-tested from vitest
// against the reference implementation).
// ---------------------------------------------------------------------------

/** Full-match test driven by raw bytecode arrays. Returns 1 on match, else 0. */
export function reTest(
  program: Int32Array,
  classes: Int32Array,
  groupCount: i32,
  input: string,
  requireEnd: bool,
): i32 {
  const prog = new Program(program, classes, groupCount);
  return matchProgram(prog, input, 0, requireEnd) != null ? 1 : 0;
}

/**
 * Full-match with captures, driven by raw bytecode arrays. Returns the capture
 * slots (`[start0, end0, ...]`) on success, or an empty array on failure.
 */
export function reCaptures(
  program: Int32Array,
  classes: Int32Array,
  groupCount: i32,
  input: string,
  start: i32,
  requireEnd: bool,
): Int32Array {
  const prog = new Program(program, classes, groupCount);
  const caps = matchProgram(prog, input, start, requireEnd);
  return caps != null ? caps : new Int32Array(0);
}
