/**
 * Compiler-owned regex VM emitted into generated Forge WASM.
 *
 * Semantics mirror `@mission-platform/forge-web-script-regex` and the legacy
 * AssemblyScript oracle: leftmost-first backtracking over the shared bytecode
 * contract. No host RegExp and no TypeScript runtime participate.
 *
 * Control-flow strategy: opcode handlers only `return` on terminal success/failure.
 * Successful non-terminal steps fall through a single `br 0` at the loop body
 * depth so branch labels stay valid regardless of nested `if` depth.
 */

import { Op } from '@mission-platform/forge-web-script-regex';

function unsignedLeb(value: number): number[] {
  const result: number[] = [];
  let remaining = value >>> 0;
  do {
    const byte = remaining & 0x7f;
    remaining >>>= 7;
    result.push(remaining === 0 ? byte : byte | 0x80);
  } while (remaining !== 0);
  return result;
}

function signedLeb(value: number): number[] {
  const result: number[] = [];
  let remaining = BigInt(value);
  let more = true;
  while (more) {
    const byte = Number(remaining & 0x7fn);
    remaining >>= 7n;
    more = !((remaining === 0n && (byte & 0x40) === 0) || (remaining === -1n && (byte & 0x40) !== 0));
    result.push(more ? byte | 0x80 : byte);
  }
  return result;
}

const get = (index: number): number[] => [0x20, ...unsignedLeb(index)];
const set = (index: number): number[] => [0x21, ...unsignedLeb(index)];
const c = (value: number): number[] => [0x41, ...signedLeb(value)];
const load = (): number[] => [0x28, 0x02, 0x00];
const load8 = (): number[] => [0x2d, 0x00, 0x00];
const store = (): number[] => [0x36, 0x02, 0x00];
const memoryCopy = (): number[] => [0xfc, 0x0a, 0x00, 0x00];
const add = (): number[] => [0x6a];
const mul = (): number[] => [0x6c];
const eq = (): number[] => [0x46];
const lt_s = (): number[] => [0x48];
const lt_u = (): number[] => [0x49];
const gt_u = (): number[] => [0x4b];
const le_s = (): number[] => [0x4c];
const ge_s = (): number[] => [0x4e];
const ge_u = (): number[] => [0x4f];
const and = (): number[] => [0x71];
const call = (index: number): number[] => [0x10, ...unsignedLeb(index)];
const ret = (): number[] => [0x0f];
const end = (): number[] => [0x0b];

/** Convert an i32-slot index to a byte offset (`index * 4`). */
const slotBytes = (indexLocal: number): number[] => [...get(indexLocal), ...c(4), ...mul()];

/** i32 locals declaration: one group of `count` i32 locals. */
function i32Locals(count: number): number[] {
  if (count <= 0) return [...unsignedLeb(0)];
  return [...unsignedLeb(1), count, 0x7f];
}

/**
 * classMatches(classes, offset, code) -> i32
 * `offset` is an i32-index into the class table (bytecode operand `a`).
 */
function regexClassMatchBody(): number[] {
  const classes = 0;
  const offset = 1;
  const code = 2;
  const count = 3;
  const index = 4;
  const lo = 5;
  const hi = 6;
  const body: number[] = [...i32Locals(4)];

  body.push(...get(classes), ...slotBytes(offset), ...add(), ...load(), ...set(count));
  body.push(...c(0), ...set(index));
  body.push(0x02, 0x40); // block $done
  body.push(0x03, 0x40); // loop
  body.push(...get(index), ...get(count), ...ge_u(), 0x0d, 0x01);

  // lo = classes[offset + 1 + index*2]
  body.push(
    ...get(classes),
    ...get(offset),
    ...c(1),
    ...add(),
    ...get(index),
    ...c(2),
    ...mul(),
    ...add(),
    ...c(4),
    ...mul(),
    ...add(),
    ...load(),
    ...set(lo),
  );
  // hi = classes[offset + 2 + index*2]
  body.push(
    ...get(classes),
    ...get(offset),
    ...c(2),
    ...add(),
    ...get(index),
    ...c(2),
    ...mul(),
    ...add(),
    ...c(4),
    ...mul(),
    ...add(),
    ...load(),
    ...set(hi),
  );
  body.push(...get(code), ...get(lo), ...ge_s());
  body.push(...get(code), ...get(hi), ...le_s());
  body.push(...and(), 0x04, 0x40, ...c(1), ...ret(), ...end());
  body.push(...get(index), ...c(1), ...add(), ...set(index));
  body.push(0x0c, 0x00);
  body.push(...end(), ...end());
  body.push(...c(0), ...ret(), ...end());
  return body;
}

/**
 * Recursive backtracking runner.
 * params: program, classes, input, len, pc, sp, requireEnd, captures, scratch, slots, depth -> i32
 */
function regexRunBody(runIndex: number, classIndex: number): number[] {
  const program = 0;
  const classes = 1;
  const input = 2;
  const len = 3;
  const pc = 4;
  const sp = 5;
  const requireEnd = 6;
  const captures = 7;
  const scratch = 8;
  const slots = 9;
  const depth = 10;
  const base = 11;
  const op = 12;
  const a = 13;
  const b = 14;
  const tmp = 15;
  const frame = 16;

  const body: number[] = [...i32Locals(6)];

  // loop $dispatch — single continue point at label 0 from the loop body.
  body.push(0x03, 0x40);

  // base = program + pc * 12
  body.push(...get(program), ...get(pc), ...c(12), ...mul(), ...add(), ...set(base));
  body.push(...get(base), ...load(), ...set(op));
  body.push(...get(base), ...c(4), ...add(), ...load(), ...set(a));
  body.push(...get(base), ...c(8), ...add(), ...load(), ...set(b));

  // if op == MATCH
  body.push(...get(op), ...c(Op.MATCH), ...eq(), 0x04, 0x40);
  body.push(...get(requireEnd), 0x04, 0x40);
  body.push(...get(sp), ...get(len), ...eq(), ...ret());
  body.push(0x05, ...c(1), ...ret(), ...end());
  body.push(0x05); // else

  // if op == CHAR
  body.push(...get(op), ...c(Op.CHAR), ...eq(), 0x04, 0x40);
  body.push(...get(sp), ...get(len), ...lt_u());
  body.push(...get(input), ...get(sp), ...add(), ...load8(), ...get(a), ...eq(), ...and());
  body.push(0x04, 0x40);
  body.push(...get(pc), ...c(1), ...add(), ...set(pc));
  body.push(...get(sp), ...c(1), ...add(), ...set(sp));
  body.push(0x05, ...c(0), ...ret(), ...end());
  body.push(0x05); // else

  // if op == ANY
  body.push(...get(op), ...c(Op.ANY), ...eq(), 0x04, 0x40);
  body.push(...get(sp), ...get(len), ...lt_u(), 0x04, 0x40);
  body.push(...get(pc), ...c(1), ...add(), ...set(pc));
  body.push(...get(sp), ...c(1), ...add(), ...set(sp));
  body.push(0x05, ...c(0), ...ret(), ...end());
  body.push(0x05); // else

  // if op == CLASS
  body.push(...get(op), ...c(Op.CLASS), ...eq(), 0x04, 0x40);
  body.push(...get(sp), ...get(len), ...ge_u(), 0x04, 0x40, ...c(0), ...ret(), ...end());
  body.push(
    ...get(classes),
    ...get(a),
    ...get(input),
    ...get(sp),
    ...add(),
    ...load8(),
    ...call(classIndex),
    ...set(tmp),
  );
  body.push(...get(tmp), ...get(b), ...c(0), ...eq(), ...eq(), 0x04, 0x40);
  body.push(...get(pc), ...c(1), ...add(), ...set(pc));
  body.push(...get(sp), ...c(1), ...add(), ...set(sp));
  body.push(0x05, ...c(0), ...ret(), ...end());
  body.push(0x05); // else

  // if op == BOL
  body.push(...get(op), ...c(Op.BOL), ...eq(), 0x04, 0x40);
  body.push(...get(sp), ...c(0), ...eq(), 0x04, 0x40);
  body.push(...get(pc), ...c(1), ...add(), ...set(pc));
  body.push(0x05, ...c(0), ...ret(), ...end());
  body.push(0x05); // else

  // if op == EOL
  body.push(...get(op), ...c(Op.EOL), ...eq(), 0x04, 0x40);
  body.push(...get(sp), ...get(len), ...eq(), 0x04, 0x40);
  body.push(...get(pc), ...c(1), ...add(), ...set(pc));
  body.push(0x05, ...c(0), ...ret(), ...end());
  body.push(0x05); // else

  // if op == SAVE
  body.push(...get(op), ...c(Op.SAVE), ...eq(), 0x04, 0x40);
  body.push(...get(captures), ...slotBytes(a), ...add(), ...get(sp), ...store());
  body.push(...get(pc), ...c(1), ...add(), ...set(pc));
  body.push(0x05); // else

  // if op == JMP
  body.push(...get(op), ...c(Op.JMP), ...eq(), 0x04, 0x40);
  body.push(...get(a), ...set(pc));
  body.push(0x05); // else

  // if op == SPLIT
  body.push(...get(op), ...c(Op.SPLIT), ...eq(), 0x04, 0x40);
  // frame = scratch + depth * slots * 4
  body.push(...get(scratch), ...get(depth), ...get(slots), ...mul(), ...c(4), ...mul(), ...add(), ...set(frame));
  // snapshot captures -> frame
  body.push(...get(frame), ...get(captures), ...get(slots), ...c(4), ...mul(), ...memoryCopy());
  // if run(a, sp, depth+1): return 1
  body.push(
    ...get(program),
    ...get(classes),
    ...get(input),
    ...get(len),
    ...get(a),
    ...get(sp),
    ...get(requireEnd),
    ...get(captures),
    ...get(scratch),
    ...get(slots),
    ...get(depth),
    ...c(1),
    ...add(),
    ...call(runIndex),
    0x04,
    0x40,
    ...c(1),
    ...ret(),
    ...end(),
  );
  // restore captures from frame
  body.push(...get(captures), ...get(frame), ...get(slots), ...c(4), ...mul(), ...memoryCopy());
  body.push(...get(b), ...set(pc));
  body.push(0x05); // else unknown
  body.push(...c(0), ...ret());

  // close if-else chain: SPLIT, JMP, SAVE, EOL, BOL, CLASS, ANY, CHAR, MATCH
  for (let n = 0; n < 9; n++) body.push(...end());

  // continue dispatch (label 0 = loop, from loop-body depth)
  body.push(0x0c, 0x00);
  body.push(...end()); // end loop
  // unreachable
  body.push(...c(0), ...ret());
  body.push(...end());
  return body;
}

/**
 * Top-level entry matching the 13-parameter stdlib call convention:
 * program, classes, input, len, pc_unused, sp, mode, captures, scratch, slots,
 * depth_unused, group, captureEnd -> i32
 *
 * mode: 0=prefix, 1=full, 2=search
 * group < 0 => boolean result (1/0); else capture slot value or -1
 */
function regexEntryBody(runIndex: number): number[] {
  const program = 0;
  const classes = 1;
  const input = 2;
  const len = 3;
  const sp = 5;
  const mode = 6;
  const captures = 7;
  const scratch = 8;
  const slots = 9;
  const group = 11;
  const captureEnd = 12;
  const attempt = 13;
  const i = 14;
  const matched = 15;
  const requireEnd = 16;

  const body: number[] = [...i32Locals(4)];

  const initCaptures = (): number[] => {
    const out: number[] = [];
    out.push(...c(0), ...set(i));
    out.push(0x02, 0x40, 0x03, 0x40);
    out.push(...get(i), ...get(slots), ...ge_u(), 0x0d, 0x01);
    out.push(...get(captures), ...slotBytes(i), ...add(), ...c(-1), ...store());
    out.push(...get(i), ...c(1), ...add(), ...set(i));
    out.push(0x0c, 0x00, ...end(), ...end());
    return out;
  };

  const callRun = (startLocal: number): number[] => [
    ...get(program),
    ...get(classes),
    ...get(input),
    ...get(len),
    ...c(0),
    ...get(startLocal),
    ...get(requireEnd),
    ...get(captures),
    ...get(scratch),
    ...get(slots),
    ...c(0),
    ...call(runIndex),
  ];

  const returnResult = (): number[] => {
    const out: number[] = [];
    out.push(...get(group), ...c(0), ...lt_s(), 0x04, 0x40);
    out.push(...get(matched), ...ret());
    out.push(...end());
    out.push(...get(matched), ...c(0), ...eq(), 0x04, 0x40, ...c(-1), ...ret(), ...end());
    out.push(
      ...get(captures),
      ...get(group),
      ...c(2),
      ...mul(),
      ...get(captureEnd),
      ...add(),
      ...c(4),
      ...mul(),
      ...add(),
      ...load(),
      ...ret(),
    );
    return out;
  };

  body.push(...get(mode), ...c(1), ...eq(), ...set(requireEnd));
  body.push(...c(0), ...set(matched));

  // search mode
  // Control-flow layout:
  //   if mode==2
  //     block $done
  //       loop $search
  //         ...
  //         if matched: br $done   // depth 2 from inside the if
  body.push(...get(mode), ...c(2), ...eq(), 0x04, 0x40);
  body.push(...get(sp), ...set(attempt));
  body.push(0x02, 0x40); // block $done
  body.push(0x03, 0x40); // loop $search
  body.push(...get(attempt), ...get(len), ...gt_u(), 0x0d, 0x01); // -> $done
  body.push(...initCaptures());
  body.push(...callRun(attempt), 0x04, 0x40);
  body.push(...c(1), ...set(matched));
  // From inside this if: 0=if, 1=loop, 2=block($done)
  body.push(0x0c, 0x02);
  body.push(...end()); // end if matched
  body.push(...get(attempt), ...c(1), ...add(), ...set(attempt));
  body.push(0x0c, 0x00); // continue $search
  body.push(...end()); // end loop
  body.push(...end()); // end block
  body.push(...returnResult());

  body.push(0x05); // else single attempt
  body.push(...initCaptures());
  body.push(...callRun(sp), ...set(matched));
  body.push(...returnResult());
  body.push(...end());

  body.push(...c(0), ...ret());
  body.push(...end());
  return body;
}

/** Number of internal regex functions linked when the runtime is present. */
export const REGEX_RUNTIME_FUNCTION_COUNT = 3;

export type RegexRuntimeBodies = {
  readonly classMatch: number[];
  readonly run: number[];
  readonly entry: number[];
};

/**
 * Build the three internal regex functions.
 * Function index layout starting at `baseIndex`:
 *   baseIndex+0 = classMatch
 *   baseIndex+1 = run
 *   baseIndex+2 = entry  (stdlib call target)
 */
export function buildRegexRuntimeBodies(baseIndex: number): RegexRuntimeBodies {
  const classIndex = baseIndex;
  const runIndex = baseIndex + 1;
  return {
    classMatch: regexClassMatchBody(),
    run: regexRunBody(runIndex, classIndex),
    entry: regexEntryBody(runIndex),
  };
}
