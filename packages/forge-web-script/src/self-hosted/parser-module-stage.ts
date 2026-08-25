/**
 * Bounded self-hosted parser-module stage.
 *
 * Unlike {@link ./parser-stage.ts} (which only proves an independent
 * structural fingerprint), this module executes a real, hand-lowered
 * recursive-descent scan+parse directly in the VM and emits a serialized
 * `ForgeWebScriptModule` payload byte-for-byte compatible with
 * {@link ./stage-codec.ts}'s `encodeForgeWebScriptSelfHostedModule` framing.
 *
 * Bounded grammar (v1): zero or more top-level function declarations
 * (`export`? `fn` NAME `(` params `)` `->` TYPE `{` body `}`), a body made of
 * `return` statements, and expressions limited to number literals,
 * identifiers, calls with unary-level arguments, a single unary `-`, and a
 * single (non-chained) binary operator. A leading `class`-family declaration
 * is recognized and rejected with the same `FWS-PARSE-052` diagnostic the seed
 * parser produces, mirroring `rejectClassDeclaration`. Comments, strings,
 * `let`/`if`, generics, and imports are intentionally out of scope for this
 * pass: encountering them sets a stable "unsupported" failure flag (checked
 * before any output is trusted) rather than guessing at behavior the VM has
 * not implemented, so divergence is explicit instead of a silent seed
 * fallback.
 */

import type { ForgeWebScriptAggregateLayout } from '../manifest.js';
import {
  createBuilder,
  type BytecodeBuilder,
  type ForgeWebScriptSelfHostedVmFunction,
  type ForgeWebScriptSelfHostedVmModule,
  type ForgeWebScriptSelfHostedVmValue,
} from './lex-stage.js';

export const FORGE_WEB_SCRIPT_PARSER_MODULE_STAGE_ENTRY = 'parse_module_stage';
const SOURCE_LAYOUT = 'ForgeWebScriptSourceBytes';
const BYTES_BLOB_LAYOUT = 'ForgeWebScriptSelfHostedBytesBlob';

/** Fixed global memory addresses (u32 slots), reserved via a leading dummy allocation. */
const G = {
  SCRATCH: 0,
  SCAN_OFFSET: 8,
  SCAN_LINE: 16,
  SCAN_COL: 24,
  OUT_CURSOR: 32,
  FAIL_FLAG: 40,
  OUTPUT_BASE: 48,
  SOURCE_BASE: 56,
  SOURCE_LEN: 64,
  DIAG_FLAG: 72,
  DIAG_START: 80,
  DIAG_END: 88,
  DIAG_LINE: 96,
  DIAG_COL: 104,
  DIAG_END_LINE: 112,
  DIAG_END_COL: 120,
  LAST_START: 128,
  LAST_END: 136,
  LAST_LINE: 144,
  LAST_COL: 152,
  LAST_END_LINE: 160,
  LAST_END_COL: 168,
  PEEK_KIND: 176,
  PEEK_START: 184,
  PEEK_END: 192,
  PEEK_LINE: 200,
  PEEK_COL: 208,
  PEEK_END_LINE: 216,
  PEEK_END_COL: 224,
  PEEK_BYTE0: 232,
  PEEK_BYTE1: 240,
  LEFT_BUF_BASE: 248,
} as const;
const RESERVED_GLOBALS_SIZE = 300;
const ENVELOPE_HEADER_SIZE = 32;
const OUTPUT_CAPACITY = 16_384;
const LEFT_BUF_CAPACITY = 4_096;

/** Token peek kinds (distinct from `ForgeWebScriptTokenKind`; internal to this stage). */
const PK_EOF = 0;
const PK_ALPHA = 1;
const PK_NUMBER = 2;
const PK_OP = 3;
const PK_FAIL = 4;

const textEncoder = new TextEncoder();

function u32Value(value: number): ForgeWebScriptSelfHostedVmValue {
  return { kind: 'number', type: 'u32', value: value >>> 0 };
}

class ConstPool {
  readonly values: ForgeWebScriptSelfHostedVmValue[] = [];
  private readonly numCache = new Map<number, number>();
  private readonly bytesCache = new Map<string, number>();

  public u32(value: number): number {
    const key = value >>> 0;
    const cached = this.numCache.get(key);
    if (cached !== undefined) return cached;
    const index = this.values.length;
    this.values.push(u32Value(key));
    this.numCache.set(key, index);
    return index;
  }

  public bytesConst(bytes: Uint8Array): number {
    const key = [...bytes].join(',');
    const cached = this.bytesCache.get(key);
    if (cached !== undefined) return cached;
    const index = this.values.length;
    this.values.push({ kind: 'aggregate', layout: BYTES_BLOB_LAYOUT, bytes, ownership: 'owned' });
    this.bytesCache.set(key, index);
    return index;
  }

  /** A wire-formatted `writer.string(text)` blob: u32 LE length prefix + UTF-8 payload. */
  public wireString(text: string): number {
    const payload = textEncoder.encode(text);
    const blob = new Uint8Array(4 + payload.byteLength);
    new DataView(blob.buffer).setUint32(0, payload.byteLength, true);
    blob.set(payload, 4);
    return this.bytesConst(blob);
  }
}

function st(b: BytecodeBuilder, address: number, source: number): void {
  b.code.push({ opcode: 'store', address, source });
}

function ld(b: BytecodeBuilder, destination: number, address: number): void {
  b.code.push({ opcode: 'load', destination, address, type: 'number', numberType: 'u32' });
}

function allocOp(b: BytecodeBuilder, destination: number, size: number): void {
  b.code.push({ opcode: 'alloc', destination, size });
}

function bytesFromMemory(b: BytecodeBuilder, destination: number, pointer: number, length: number): void {
  b.code.push({ opcode: 'bytes-from-memory', destination, pointer, length });
}

function writeBytesOp(b: BytecodeBuilder, pointer: number, source: number): void {
  b.code.push({ opcode: 'write-bytes', pointer, source });
}

/** A register holding the constant `value` (u32), allocated fresh in `b`. */
function K(b: BytecodeBuilder, pool: ConstPool, value: number): number {
  const register = b.alloc();
  b.num(register, pool.u32(value));
  return register;
}

function fn(
  name: string,
  parameters: readonly string[],
  result: string,
  b: BytecodeBuilder,
): ForgeWebScriptSelfHostedVmFunction {
  return { name, parameters, result, registers: b.registers, code: b.finish(), debugSpans: [] };
}

// ---------------------------------------------------------------------------
// Byte-level primitives.
// ---------------------------------------------------------------------------

/** pm_read_byte(offset: u32) -> u32 : byte at SOURCE_BASE + offset. */
function buildReadByte(pool: ConstPool): ForgeWebScriptSelfHostedVmFunction {
  const b = createBuilder(1);
  const base = b.alloc();
  const ptr = b.alloc();
  const one = K(b, pool, 1);
  const slice = b.alloc();
  const zero = K(b, pool, 0);
  const result = b.alloc();
  ld(b, base, G.SOURCE_BASE);
  b.binary('+', ptr, base, 0);
  bytesFromMemory(b, slice, ptr, one);
  b.byteAt(result, slice, zero);
  b.ret(result);
  return fn('pm_read_byte', ['u32'], 'u32', b);
}

function buildIsAlpha(pool: ConstPool): ForgeWebScriptSelfHostedVmFunction {
  const b = createBuilder(1);
  const t1 = b.alloc();
  const t2 = b.alloc();
  const temporary = b.alloc();
  b.binary('>=', t1, 0, K(b, pool, 65));
  b.binary('<=', t2, 0, K(b, pool, 90));
  b.binary('&&', temporary, t1, t2);
  b.branch(temporary, 'yes', 'lower');
  b.label('lower');
  b.binary('>=', t1, 0, K(b, pool, 97));
  b.binary('<=', t2, 0, K(b, pool, 122));
  b.binary('&&', temporary, t1, t2);
  b.branch(temporary, 'yes', 'under');
  b.label('under');
  b.binary('==', temporary, 0, K(b, pool, 95));
  b.branch(temporary, 'yes', 'no');
  b.label('yes');
  b.num(t1, pool.u32(0));
  b.binary('==', temporary, t1, t1);
  b.ret(temporary);
  b.label('no');
  b.num(t1, pool.u32(0));
  b.num(t2, pool.u32(1));
  b.binary('==', temporary, t1, t2);
  b.ret(temporary);
  return fn('pm_is_alpha', ['u32'], 'bool', b);
}

function buildIsDigit(pool: ConstPool): ForgeWebScriptSelfHostedVmFunction {
  const b = createBuilder(1);
  const t1 = b.alloc();
  const t2 = b.alloc();
  const temporary = b.alloc();
  b.binary('>=', t1, 0, K(b, pool, 48));
  b.binary('<=', t2, 0, K(b, pool, 57));
  b.binary('&&', temporary, t1, t2);
  b.ret(temporary);
  return fn('pm_is_digit', ['u32'], 'bool', b);
}

function buildIsAlnum(): ForgeWebScriptSelfHostedVmFunction {
  const b = createBuilder(1);
  const a = b.alloc();
  const d = b.alloc();
  b.call(a, 'pm_is_alpha', [0]);
  b.branch(a, 'yes', 'digit');
  b.label('digit');
  b.call(d, 'pm_is_digit', [0]);
  b.ret(d);
  b.label('yes');
  b.num(a, 0);
  b.ret(a);
  return fn('pm_is_alnum', ['u32'], 'bool', b);
}

function buildIsTwoCharOp(pool: ConstPool): ForgeWebScriptSelfHostedVmFunction {
  const pairs: readonly [number, number][] = [
    [45, 62], // ->
    [61, 61], // ==
    [33, 61], // !=
    [60, 61], // <=
    [62, 61], // >=
    [38, 38], // &&
    [124, 124], // ||
  ];
  const b = createBuilder(2);
  const t1 = b.alloc();
  const t2 = b.alloc();
  const temporary = b.alloc();
  let next = 'p0';
  for (const [index, [left, right]] of pairs.entries()) {
    b.label(next);
    b.binary('==', t1, 0, K(b, pool, left));
    b.binary('==', t2, 1, K(b, pool, right));
    b.binary('&&', temporary, t1, t2);
    next = index === pairs.length - 1 ? 'no' : `p${String(index + 1)}`;
    b.branch(temporary, 'yes', next);
  }
  b.label('yes');
  b.num(temporary, 0);
  b.ret(temporary);
  b.label('no');
  b.num(t1, pool.u32(0));
  b.num(t2, pool.u32(1));
  b.binary('==', temporary, t1, t2);
  b.ret(temporary);
  return fn('pm_is_two_char_op', ['u32', 'u32'], 'bool', b);
}

function buildIsOneCharOp(pool: ConstPool): ForgeWebScriptSelfHostedVmFunction {
  const chars = [40, 41, 123, 125, 58, 59, 44, 43, 45, 42, 47, 60, 62, 61, 33];
  const b = createBuilder(1);
  const temporary = b.alloc();
  const c = b.alloc();
  let next = 'c0';
  for (const [index, value] of chars.entries()) {
    b.label(next);
    b.num(c, pool.u32(value));
    b.binary('==', temporary, 0, c);
    next = index === chars.length - 1 ? 'no' : `c${String(index + 1)}`;
    b.branch(temporary, 'yes', next);
  }
  b.label('yes');
  b.num(temporary, 0);
  b.ret(temporary);
  b.label('no');
  b.num(c, pool.u32(0));
  b.num(temporary, pool.u32(1));
  b.binary('==', temporary, c, temporary);
  b.ret(temporary);
  return fn('pm_is_one_char_op', ['u32'], 'bool', b);
}

// ---------------------------------------------------------------------------
// Output-buffer emission primitives (append-only, cursor tracked in globals).
// ---------------------------------------------------------------------------

/** pm_emit_slice(bytes) -> unit : append a memory-backed slice (from `bytes-from-memory`). */
function buildEmitSlice(): ForgeWebScriptSelfHostedVmFunction {
  const b = createBuilder(1);
  const length = b.alloc();
  const outBase = b.alloc();
  const cursor = b.alloc();
  const target = b.alloc();
  const newCursor = b.alloc();
  b.len(length, 0);
  ld(b, outBase, G.OUTPUT_BASE);
  ld(b, cursor, G.OUT_CURSOR);
  b.binary('+', target, outBase, cursor);
  writeBytesOp(b, target, 0);
  b.binary('+', newCursor, cursor, length);
  st(b, G.OUT_CURSOR, newCursor);
  b.ret();
  return fn('pm_emit_slice', ['bytes'], 'unit', b);
}

/** pm_emit_const(bytes: BYTES_BLOB_LAYOUT) -> unit : append a precomputed wire blob. */
function buildEmitConst(): ForgeWebScriptSelfHostedVmFunction {
  const b = createBuilder(1);
  const length = b.alloc();
  const outBase = b.alloc();
  const cursor = b.alloc();
  const target = b.alloc();
  const newCursor = b.alloc();
  b.len(length, 0);
  ld(b, outBase, G.OUTPUT_BASE);
  ld(b, cursor, G.OUT_CURSOR);
  b.binary('+', target, outBase, cursor);
  writeBytesOp(b, target, 0);
  b.binary('+', newCursor, cursor, length);
  st(b, G.OUT_CURSOR, newCursor);
  b.ret();
  return fn('pm_emit_const', [BYTES_BLOB_LAYOUT], 'unit', b);
}

/** pm_emit_u32(value: u32) -> unit : append 4 little-endian bytes. */
function buildEmitU32(pool: ConstPool): ForgeWebScriptSelfHostedVmFunction {
  const b = createBuilder(1);
  const zero = K(b, pool, 0);
  const four = K(b, pool, 4);
  const tmp = b.alloc();
  st(b, G.SCRATCH, 0);
  bytesFromMemory(b, tmp, zero, four);
  b.call(undefined, 'pm_emit_slice', [tmp]);
  b.ret();
  return fn('pm_emit_u32', ['u32'], 'unit', b);
}

/** pm_emit_u8(value: u32, 0 or 1) -> unit : append exactly 1 byte (LE low byte of value). */
function buildEmitU8(pool: ConstPool): ForgeWebScriptSelfHostedVmFunction {
  const b = createBuilder(1);
  const zero = K(b, pool, 0);
  const one = K(b, pool, 1);
  const tmp = b.alloc();
  st(b, G.SCRATCH, 0);
  bytesFromMemory(b, tmp, zero, one);
  b.call(undefined, 'pm_emit_slice', [tmp]);
  b.ret();
  return fn('pm_emit_u8', ['u32'], 'unit', b);
}

/** pm_emit_dyn_string(start: u32, end: u32) -> unit : length-prefixed source slice. */
function buildEmitDynString(): ForgeWebScriptSelfHostedVmFunction {
  const b = createBuilder(2);
  const length = b.alloc();
  const base = b.alloc();
  const ptr = b.alloc();
  const slice = b.alloc();
  b.binary('-', length, 1, 0);
  b.call(undefined, 'pm_emit_u32', [length]);
  ld(b, base, G.SOURCE_BASE);
  b.binary('+', ptr, base, 0);
  bytesFromMemory(b, slice, ptr, length);
  b.call(undefined, 'pm_emit_slice', [slice]);
  b.ret();
  return fn('pm_emit_dyn_string', ['u32', 'u32'], 'unit', b);
}

/** pm_emit_span(start, end, line, column, endLine, endColumn) -> unit. */
function buildEmitSpan(): ForgeWebScriptSelfHostedVmFunction {
  const b = createBuilder(6);
  for (let index = 0; index < 6; index += 1) b.call(undefined, 'pm_emit_u32', [index]);
  b.ret();
  return fn('pm_emit_span', ['u32', 'u32', 'u32', 'u32', 'u32', 'u32'], 'unit', b);
}

/** pm_patch_u32(offset: u32, value: u32) -> unit : overwrite 4 bytes at OUTPUT_BASE + offset. */
function buildPatchU32(pool: ConstPool): ForgeWebScriptSelfHostedVmFunction {
  const b = createBuilder(2);
  const outBase = b.alloc();
  const target = b.alloc();
  const zero = K(b, pool, 0);
  const four = K(b, pool, 4);
  const tmp = b.alloc();
  ld(b, outBase, G.OUTPUT_BASE);
  b.binary('+', target, outBase, 0);
  st(b, G.SCRATCH, 1);
  bytesFromMemory(b, tmp, zero, four);
  writeBytesOp(b, target, tmp);
  b.ret();
  return fn('pm_patch_u32', ['u32', 'u32'], 'unit', b);
}

// ---------------------------------------------------------------------------
// Tokenizer: pm_peek (non-destructive) + pm_consume (commits PEEK_* -> SCAN_*/LAST_*).
// ---------------------------------------------------------------------------

function buildPeek(pool: ConstPool): ForgeWebScriptSelfHostedVmFunction {
  const b = createBuilder(0);
  const offset = b.alloc();
  const line = b.alloc();
  const col = b.alloc();
  const srcLen = b.alloc();
  const cond = b.alloc();
  const byte = b.alloc();
  const nextByte = b.alloc();
  const start = b.alloc();
  const startLine = b.alloc();
  const startCol = b.alloc();
  const end = b.alloc();
  const one = K(b, pool, 1);
  const two = K(b, pool, 2);
  const zero = K(b, pool, 0);
  const tmp = b.alloc();
  const tmp2 = b.alloc();
  const len = b.alloc();

  ld(b, offset, G.SCAN_OFFSET);
  ld(b, line, G.SCAN_LINE);
  ld(b, col, G.SCAN_COL);
  ld(b, srcLen, G.SOURCE_LEN);

  b.label('trivia_loop');
  b.binary('>=', cond, offset, srcLen);
  b.branch(cond, 'eof', 'trivia_check');
  b.label('trivia_check');
  b.call(byte, 'pm_read_byte', [offset]);
  b.num(tmp, pool.u32(32));
  b.binary('==', cond, byte, tmp);
  b.branch(cond, 'space', 'tab_check');
  b.label('tab_check');
  b.num(tmp, pool.u32(9));
  b.binary('==', cond, byte, tmp);
  b.branch(cond, 'space', 'cr_check');
  b.label('cr_check');
  b.num(tmp, pool.u32(13));
  b.binary('==', cond, byte, tmp);
  b.branch(cond, 'space', 'lf_check');
  b.label('lf_check');
  b.num(tmp, pool.u32(10));
  b.binary('==', cond, byte, tmp);
  b.branch(cond, 'newline', 'not_trivia');

  b.label('space');
  b.binary('+', offset, offset, one);
  b.binary('+', col, col, one);
  b.jump('trivia_loop');

  b.label('newline');
  b.binary('+', offset, offset, one);
  b.binary('+', line, line, one);
  b.num(col, pool.u32(1));
  b.jump('trivia_loop');

  b.label('not_trivia');
  b.move(start, offset);
  b.move(startLine, line);
  b.move(startCol, col);
  b.call(byte, 'pm_read_byte', [offset]);

  b.call(cond, 'pm_is_alpha', [byte]);
  b.branch(cond, 'alpha', 'digit_check');

  b.label('digit_check');
  b.call(cond, 'pm_is_digit', [byte]);
  b.branch(cond, 'digit', 'op_check');

  b.label('alpha');
  b.move(end, offset);
  b.binary('+', end, end, one);
  b.label('alpha_loop');
  b.binary('>=', cond, end, srcLen);
  b.branch(cond, 'alpha_done', 'alpha_check');
  b.label('alpha_check');
  b.call(byte, 'pm_read_byte', [end]);
  b.call(cond, 'pm_is_alnum', [byte]);
  b.branch(cond, 'alpha_advance', 'alpha_done');
  b.label('alpha_advance');
  b.binary('+', end, end, one);
  b.jump('alpha_loop');
  b.label('alpha_done');
  b.num(tmp, pool.u32(PK_ALPHA));
  b.binary('-', len, end, start);
  b.binary('+', col, startCol, len);
  st(b, G.PEEK_KIND, tmp);
  st(b, G.PEEK_START, start);
  st(b, G.PEEK_END, end);
  st(b, G.PEEK_LINE, startLine);
  st(b, G.PEEK_COL, startCol);
  st(b, G.PEEK_END_LINE, startLine);
  st(b, G.PEEK_END_COL, col);
  b.ret();

  b.label('digit');
  b.move(end, offset);
  b.binary('+', end, end, one);
  b.label('digit_loop');
  b.binary('>=', cond, end, srcLen);
  b.branch(cond, 'digit_done', 'digit_check2');
  b.label('digit_check2');
  b.call(byte, 'pm_read_byte', [end]);
  b.call(cond, 'pm_is_digit', [byte]);
  b.branch(cond, 'digit_advance', 'digit_done');
  b.label('digit_advance');
  b.binary('+', end, end, one);
  b.jump('digit_loop');
  b.label('digit_done');
  b.num(tmp, pool.u32(PK_NUMBER));
  b.binary('-', len, end, start);
  b.binary('+', col, startCol, len);
  st(b, G.PEEK_KIND, tmp);
  st(b, G.PEEK_START, start);
  st(b, G.PEEK_END, end);
  st(b, G.PEEK_LINE, startLine);
  st(b, G.PEEK_COL, startCol);
  st(b, G.PEEK_END_LINE, startLine);
  st(b, G.PEEK_END_COL, col);
  b.ret();

  b.label('op_check');
  b.binary('+', tmp2, offset, one);
  b.binary('<', cond, tmp2, srcLen);
  b.branch(cond, 'op_two_load', 'op_one');
  b.label('op_two_load');
  b.call(nextByte, 'pm_read_byte', [tmp2]);
  b.call(cond, 'pm_is_two_char_op', [byte, nextByte]);
  b.branch(cond, 'op_two', 'op_one');

  b.label('op_two');
  b.move(end, offset);
  b.binary('+', end, end, two);
  b.num(tmp, pool.u32(PK_OP));
  st(b, G.PEEK_KIND, tmp);
  st(b, G.PEEK_START, start);
  st(b, G.PEEK_END, end);
  st(b, G.PEEK_LINE, startLine);
  st(b, G.PEEK_COL, startCol);
  st(b, G.PEEK_END_LINE, startLine);
  b.binary('+', col, startCol, two);
  st(b, G.PEEK_END_COL, col);
  st(b, G.PEEK_BYTE0, byte);
  st(b, G.PEEK_BYTE1, nextByte);
  b.ret();

  b.label('op_one');
  b.call(cond, 'pm_is_one_char_op', [byte]);
  b.branch(cond, 'op_single', 'fail');

  b.label('op_single');
  b.move(end, offset);
  b.binary('+', end, end, one);
  b.num(tmp, pool.u32(PK_OP));
  st(b, G.PEEK_KIND, tmp);
  st(b, G.PEEK_START, start);
  st(b, G.PEEK_END, end);
  st(b, G.PEEK_LINE, startLine);
  st(b, G.PEEK_COL, startCol);
  st(b, G.PEEK_END_LINE, startLine);
  b.binary('+', col, startCol, one);
  st(b, G.PEEK_END_COL, col);
  st(b, G.PEEK_BYTE0, byte);
  b.num(tmp, zero);
  st(b, G.PEEK_BYTE1, tmp);
  b.ret();

  b.label('fail');
  b.num(tmp, pool.u32(1));
  st(b, G.FAIL_FLAG, tmp);
  b.num(tmp, pool.u32(PK_FAIL));
  st(b, G.PEEK_KIND, tmp);
  st(b, G.PEEK_START, start);
  st(b, G.PEEK_END, start);
  st(b, G.PEEK_LINE, startLine);
  st(b, G.PEEK_COL, startCol);
  st(b, G.PEEK_END_LINE, startLine);
  st(b, G.PEEK_END_COL, startCol);
  b.ret();

  b.label('eof');
  b.num(tmp, pool.u32(PK_EOF));
  st(b, G.PEEK_KIND, tmp);
  st(b, G.PEEK_START, offset);
  st(b, G.PEEK_END, offset);
  st(b, G.PEEK_LINE, line);
  st(b, G.PEEK_COL, col);
  st(b, G.PEEK_END_LINE, line);
  st(b, G.PEEK_END_COL, col);
  b.ret();

  return fn('pm_peek', [], 'unit', b);
}

/** pm_consume() -> unit : commit PEEK_* into SCAN_* and LAST_*. Must follow a pm_peek() call. */
function buildConsume(): ForgeWebScriptSelfHostedVmFunction {
  const b = createBuilder(0);
  const value = b.alloc();
  for (const [from, to] of [
    [G.PEEK_START, G.LAST_START],
    [G.PEEK_END, G.LAST_END],
    [G.PEEK_LINE, G.LAST_LINE],
    [G.PEEK_COL, G.LAST_COL],
    [G.PEEK_END_LINE, G.LAST_END_LINE],
    [G.PEEK_END_COL, G.LAST_END_COL],
  ]) {
    ld(b, value, from);
    st(b, to, value);
  }
  ld(b, value, G.PEEK_END);
  st(b, G.SCAN_OFFSET, value);
  ld(b, value, G.PEEK_END_LINE);
  st(b, G.SCAN_LINE, value);
  ld(b, value, G.PEEK_END_COL);
  st(b, G.SCAN_COL, value);
  b.ret();
  return fn('pm_consume', [], 'unit', b);
}

/** pm_word_equals(word: BYTES_BLOB_LAYOUT) -> bool : PEEK_START..PEEK_END text equals `word`. */
function buildWordEquals(pool: ConstPool): ForgeWebScriptSelfHostedVmFunction {
  const b = createBuilder(1);
  const wordLen = b.alloc();
  const peekStart = b.alloc();
  const peekEnd = b.alloc();
  const tokenLen = b.alloc();
  const cond = b.alloc();
  const result = b.alloc();
  const index = b.alloc();
  const sourceBase = b.alloc();
  const ptr = b.alloc();
  const tokenByte = b.alloc();
  const wordByte = b.alloc();
  const zero = K(b, pool, 0);
  const one = K(b, pool, 1);
  b.len(wordLen, 0);
  ld(b, peekStart, G.PEEK_START);
  ld(b, peekEnd, G.PEEK_END);
  b.binary('-', tokenLen, peekEnd, peekStart);
  b.binary('==', cond, tokenLen, wordLen);
  b.branch(cond, 'compare', 'no');
  b.label('compare');
  b.move(index, zero);
  b.label('loop');
  b.binary('<', cond, index, tokenLen);
  b.branch(cond, 'body', 'yes');
  b.label('body');
  ld(b, sourceBase, G.SOURCE_BASE);
  b.binary('+', ptr, sourceBase, peekStart);
  b.binary('+', ptr, ptr, index);
  b.call(tokenByte, 'pm_read_byte', [ptr]);
  b.byteAt(wordByte, 0, index);
  b.binary('==', cond, tokenByte, wordByte);
  b.branch(cond, 'advance', 'no');
  b.label('advance');
  b.binary('+', index, index, one);
  b.jump('loop');
  b.label('yes');
  b.num(result, pool.u32(0));
  b.binary('==', result, result, result);
  b.ret(result);
  b.label('no');
  b.num(result, pool.u32(0));
  b.binary('==', result, result, one);
  b.ret(result);
  return fn('pm_word_equals', [BYTES_BLOB_LAYOUT], 'bool', b);
}

// ---------------------------------------------------------------------------
// Bounded grammar: type, primary/unary/binary expressions, parameters,
// return statements, blocks, function declarations, class-family rejection.
// ---------------------------------------------------------------------------

const PRIMITIVE_TYPE_NAMES = ['bool', 'bytes', 'f32', 'f64', 'i32', 'i64', 'string', 'u32', 'u64', 'unit'] as const;

interface TypeWire {
  readonly rawWord: number;
  readonly wire: number;
}

function buildParseType(pool: ConstPool, types: readonly TypeWire[]): ForgeWebScriptSelfHostedVmFunction {
  const b = createBuilder(0);
  const kind = b.alloc();
  const cond = b.alloc();
  const wantAlpha = K(b, pool, PK_ALPHA);
  const one = K(b, pool, 1);
  const flag = b.alloc();
  const last = {
    start: b.alloc(),
    end: b.alloc(),
    line: b.alloc(),
    col: b.alloc(),
    endLine: b.alloc(),
    endCol: b.alloc(),
  };
  b.call(undefined, 'pm_peek', []);
  ld(b, kind, G.PEEK_KIND);
  b.binary('==', cond, kind, wantAlpha);
  b.branch(cond, 'ok', 'fail');
  b.label('fail');
  st(b, G.FAIL_FLAG, one);
  b.ret();
  b.label('ok');
  b.call(undefined, 'pm_consume', []);
  let branch = 'p0';
  for (const [index, type] of types.entries()) {
    b.label(branch);
    const word = b.alloc();
    b.num(word, type.rawWord);
    b.call(cond, 'pm_word_equals', [word]);
    branch = index === types.length - 1 ? 'no_match' : `p${String(index + 1)}`;
    b.branch(cond, `emit_${String(index)}`, branch);
    b.label(`emit_${String(index)}`);
    const wire = b.alloc();
    b.num(wire, type.wire);
    b.call(undefined, 'pm_emit_const', [wire]);
    b.jump('after_name');
  }
  b.label('no_match');
  st(b, G.FAIL_FLAG, one);
  b.ret();
  b.label('after_name');
  const zero = K(b, pool, 0);
  b.call(undefined, 'pm_emit_u8', [zero]); // no reference
  b.call(undefined, 'pm_emit_u8', [zero]); // no type arguments
  b.call(undefined, 'pm_emit_u8', [zero]); // no fixed length
  b.call(undefined, 'pm_emit_u8', [zero]); // no ownership annotation
  ld(b, last.start, G.LAST_START);
  ld(b, last.end, G.LAST_END);
  ld(b, last.line, G.LAST_LINE);
  ld(b, last.col, G.LAST_COL);
  ld(b, last.endLine, G.LAST_END_LINE);
  ld(b, last.endCol, G.LAST_END_COL);
  b.call(undefined, 'pm_emit_span', [last.start, last.end, last.line, last.col, last.endLine, last.endCol]);
  b.ret();
  void flag;
  return fn('pm_parse_type', [], 'unit', b);
}

interface ExpressionWire {
  readonly literal: number;
  readonly identifier: number;
  readonly call: number;
  readonly binary: number;
  readonly unary: number;
  readonly i32Type: number;
  readonly unaryMinus: number;
  readonly opPlus: number;
  readonly opMinus: number;
  readonly opStar: number;
  readonly opSlash: number;
  readonly opLt: number;
  readonly opGt: number;
  readonly opLe: number;
  readonly opGe: number;
  readonly opEq: number;
  readonly opNe: number;
}

function buildParsePrimary(pool: ConstPool, wire: ExpressionWire): ForgeWebScriptSelfHostedVmFunction {
  const b = createBuilder(0);
  const kind = b.alloc();
  const cond = b.alloc();
  const one = K(b, pool, 1);
  const zero = K(b, pool, 0);
  const openParen = K(b, pool, 40);
  const closeParen = K(b, pool, 41);
  const comma = K(b, pool, 44);
  const wantNumber = K(b, pool, PK_NUMBER);
  const wantAlpha = K(b, pool, PK_ALPHA);
  const wantOp = K(b, pool, PK_OP);
  const identStart = b.alloc();
  const identEnd = b.alloc();
  const identLine = b.alloc();
  const identCol = b.alloc();
  const identEndLine = b.alloc();
  const identEndCol = b.alloc();
  const byte0 = b.alloc();
  const savedOffset = b.alloc();
  const argCount = b.alloc();
  const literalWire = b.alloc();
  const i32Wire = b.alloc();
  const three = b.alloc();
  const callWire = b.alloc();
  const identWire = b.alloc();

  b.call(undefined, 'pm_peek', []);
  ld(b, kind, G.PEEK_KIND);
  b.binary('==', cond, kind, wantNumber);
  b.branch(cond, 'number', 'alpha_check');

  b.label('number');
  b.call(undefined, 'pm_consume', []);
  b.num(literalWire, wire.literal);
  b.call(undefined, 'pm_emit_const', [literalWire]);
  b.num(i32Wire, wire.i32Type);
  b.call(undefined, 'pm_emit_const', [i32Wire]);
  b.num(three, pool.u32(3));
  b.call(undefined, 'pm_emit_u8', [three]);
  ld(b, identStart, G.LAST_START);
  ld(b, identEnd, G.LAST_END);
  ld(b, identLine, G.LAST_LINE);
  ld(b, identCol, G.LAST_COL);
  ld(b, identEndLine, G.LAST_END_LINE);
  ld(b, identEndCol, G.LAST_END_COL);
  b.call(undefined, 'pm_emit_dyn_string', [identStart, identEnd]);
  b.call(undefined, 'pm_emit_span', [identStart, identEnd, identLine, identCol, identEndLine, identEndCol]);
  b.ret();

  b.label('alpha_check');
  b.binary('==', cond, kind, wantAlpha);
  b.branch(cond, 'alpha', 'fail');

  b.label('fail');
  st(b, G.FAIL_FLAG, one);
  b.ret();

  b.label('alpha');
  b.call(undefined, 'pm_consume', []);
  ld(b, identStart, G.LAST_START);
  ld(b, identEnd, G.LAST_END);
  ld(b, identLine, G.LAST_LINE);
  ld(b, identCol, G.LAST_COL);
  ld(b, identEndLine, G.LAST_END_LINE);
  ld(b, identEndCol, G.LAST_END_COL);
  b.call(undefined, 'pm_peek', []);
  ld(b, kind, G.PEEK_KIND);
  b.binary('==', cond, kind, wantOp);
  b.branch(cond, 'op_check_paren', 'plain_identifier');

  b.label('op_check_paren');
  ld(b, byte0, G.PEEK_BYTE0);
  b.binary('==', cond, byte0, openParen);
  b.branch(cond, 'is_call', 'plain_identifier');

  b.label('plain_identifier');
  b.num(identWire, wire.identifier);
  b.call(undefined, 'pm_emit_const', [identWire]);
  b.call(undefined, 'pm_emit_dyn_string', [identStart, identEnd]);
  b.call(undefined, 'pm_emit_span', [identStart, identEnd, identLine, identCol, identEndLine, identEndCol]);
  b.ret();

  b.label('is_call');
  b.call(undefined, 'pm_consume', []); // '('
  b.num(callWire, wire.call);
  b.call(undefined, 'pm_emit_const', [callWire]);
  b.call(undefined, 'pm_emit_dyn_string', [identStart, identEnd]);
  ld(b, savedOffset, G.OUT_CURSOR);
  b.call(undefined, 'pm_emit_u32', [zero]);
  b.move(argCount, zero);
  b.call(undefined, 'pm_peek', []);
  b.label('args_loop');
  ld(b, kind, G.PEEK_KIND);
  b.binary('==', cond, kind, wantOp);
  b.branch(cond, 'args_op_check', 'args_parse');
  b.label('args_op_check');
  ld(b, byte0, G.PEEK_BYTE0);
  b.binary('==', cond, byte0, closeParen);
  b.branch(cond, 'args_done', 'args_parse');
  b.label('args_parse');
  b.call(undefined, 'pm_parse_unary', []);
  {
    const failed = b.alloc();
    ld(b, failed, G.FAIL_FLAG);
    b.branch(failed, 'bail', 'args_after');
  }
  b.label('args_after');
  b.binary('+', argCount, argCount, one);
  b.call(undefined, 'pm_peek', []);
  ld(b, kind, G.PEEK_KIND);
  b.binary('==', cond, kind, wantOp);
  b.branch(cond, 'args_comma_check', 'args_done');
  b.label('args_comma_check');
  ld(b, byte0, G.PEEK_BYTE0);
  b.binary('==', cond, byte0, comma);
  b.branch(cond, 'args_comma', 'args_done');
  b.label('args_comma');
  b.call(undefined, 'pm_consume', []);
  b.call(undefined, 'pm_peek', []);
  b.jump('args_loop');
  b.label('args_done');
  ld(b, kind, G.PEEK_KIND);
  b.binary('==', cond, kind, wantOp);
  b.branch(cond, 'args_close_check', 'bail');
  b.label('args_close_check');
  ld(b, byte0, G.PEEK_BYTE0);
  b.binary('==', cond, byte0, closeParen);
  b.branch(cond, 'args_close', 'bail');
  b.label('args_close');
  b.call(undefined, 'pm_consume', []); // ')'
  b.call(undefined, 'pm_patch_u32', [savedOffset, argCount]);
  {
    const lastEnd = b.alloc();
    const lastEndLine = b.alloc();
    const lastEndCol = b.alloc();
    ld(b, lastEnd, G.LAST_END);
    ld(b, lastEndLine, G.LAST_END_LINE);
    ld(b, lastEndCol, G.LAST_END_COL);
    b.call(undefined, 'pm_emit_span', [identStart, lastEnd, identLine, identCol, lastEndLine, lastEndCol]);
  }
  b.ret();
  b.label('bail');
  st(b, G.FAIL_FLAG, one);
  b.ret();

  return fn('pm_parse_primary', [], 'unit', b);
}

function buildParseUnary(pool: ConstPool, wire: ExpressionWire): ForgeWebScriptSelfHostedVmFunction {
  const b = createBuilder(0);
  const kind = b.alloc();
  const cond = b.alloc();
  const byte0 = b.alloc();
  const byte1 = b.alloc();
  const wantOp = K(b, pool, PK_OP);
  const minusByte = K(b, pool, 45);
  const zero = K(b, pool, 0);
  const start = b.alloc();
  const line = b.alloc();
  const col = b.alloc();
  const unaryWire = b.alloc();
  const minusWire = b.alloc();

  b.call(undefined, 'pm_peek', []);
  ld(b, kind, G.PEEK_KIND);
  b.binary('==', cond, kind, wantOp);
  b.branch(cond, 'op_check', 'primary');

  b.label('op_check');
  ld(b, byte0, G.PEEK_BYTE0);
  ld(b, byte1, G.PEEK_BYTE1);
  {
    const isMinus = b.alloc();
    const isSingle = b.alloc();
    b.binary('==', isMinus, byte0, minusByte);
    b.binary('==', isSingle, byte1, zero);
    b.binary('&&', cond, isMinus, isSingle);
  }
  b.branch(cond, 'minus', 'primary');

  b.label('minus');
  ld(b, start, G.PEEK_START);
  ld(b, line, G.PEEK_LINE);
  ld(b, col, G.PEEK_COL);
  b.call(undefined, 'pm_consume', []);
  b.num(unaryWire, wire.unary);
  b.call(undefined, 'pm_emit_const', [unaryWire]);
  b.num(minusWire, wire.unaryMinus);
  b.call(undefined, 'pm_emit_const', [minusWire]);
  b.call(undefined, 'pm_parse_primary', []);
  {
    const lastEnd = b.alloc();
    const lastEndLine = b.alloc();
    const lastEndCol = b.alloc();
    ld(b, lastEnd, G.LAST_END);
    ld(b, lastEndLine, G.LAST_END_LINE);
    ld(b, lastEndCol, G.LAST_END_COL);
    b.call(undefined, 'pm_emit_span', [start, lastEnd, line, col, lastEndLine, lastEndCol]);
  }
  b.ret();

  b.label('primary');
  b.call(undefined, 'pm_parse_primary', []);
  b.ret();

  return fn('pm_parse_unary', [], 'unit', b);
}

function buildParseExpression(pool: ConstPool, wire: ExpressionWire): ForgeWebScriptSelfHostedVmFunction {
  const b = createBuilder(0);
  const start = b.alloc();
  const line = b.alloc();
  const col = b.alloc();
  const savedBase = b.alloc();
  const savedCursor = b.alloc();
  const leftBase = b.alloc();
  const leftLen = b.alloc();
  const leftSlice = b.alloc();
  const kind = b.alloc();
  const byte0 = b.alloc();
  const byte1 = b.alloc();
  const cond = b.alloc();
  const wantOp = K(b, pool, PK_OP);
  const zero = K(b, pool, 0);
  const opConst = b.alloc();

  b.call(undefined, 'pm_peek', []);
  ld(b, start, G.PEEK_START);
  ld(b, line, G.PEEK_LINE);
  ld(b, col, G.PEEK_COL);

  ld(b, savedBase, G.OUTPUT_BASE);
  ld(b, savedCursor, G.OUT_CURSOR);
  ld(b, leftBase, G.LEFT_BUF_BASE);
  st(b, G.OUTPUT_BASE, leftBase);
  st(b, G.OUT_CURSOR, zero);
  b.call(undefined, 'pm_parse_unary', []);
  ld(b, leftLen, G.OUT_CURSOR);
  st(b, G.OUTPUT_BASE, savedBase);
  st(b, G.OUT_CURSOR, savedCursor);

  {
    const failed = b.alloc();
    ld(b, failed, G.FAIL_FLAG);
    b.branch(failed, 'bail', 'check_operator');
  }

  b.label('check_operator');
  b.call(undefined, 'pm_peek', []);
  ld(b, kind, G.PEEK_KIND);
  b.binary('==', cond, kind, wantOp);
  b.branch(cond, 'match_operator', 'no_operator');

  b.label('match_operator');
  ld(b, byte0, G.PEEK_BYTE0);
  ld(b, byte1, G.PEEK_BYTE1);
  {
    const candidates: readonly [number, number, number][] = [
      [43, 0, wire.opPlus],
      [45, 0, wire.opMinus],
      [42, 0, wire.opStar],
      [47, 0, wire.opSlash],
      [60, 61, wire.opLe],
      [62, 61, wire.opGe],
      [60, 0, wire.opLt],
      [62, 0, wire.opGt],
      [61, 61, wire.opEq],
      [33, 61, wire.opNe],
    ];
    let branch = 'm0';
    for (const [index, [b0, b1, wireIndex]] of candidates.entries()) {
      b.label(branch);
      const t1 = b.alloc();
      const t2 = b.alloc();
      const both = b.alloc();
      b.num(t1, pool.u32(b0));
      b.num(t2, pool.u32(b1));
      const eq0 = b.alloc();
      const eq1 = b.alloc();
      b.binary('==', eq0, byte0, t1);
      b.binary('==', eq1, byte1, t2);
      b.binary('&&', both, eq0, eq1);
      branch = index === candidates.length - 1 ? 'no_operator' : `m${String(index + 1)}`;
      b.branch(both, `hit_${String(index)}`, branch);
      b.label(`hit_${String(index)}`);
      b.num(opConst, wireIndex);
      b.jump('emit_binary');
    }
  }

  b.label('emit_binary');
  b.call(undefined, 'pm_consume', []);
  {
    const binaryWire = b.alloc();
    b.num(binaryWire, wire.binary);
    b.call(undefined, 'pm_emit_const', [binaryWire]);
  }
  b.call(undefined, 'pm_emit_const', [opConst]);
  bytesFromMemory(b, leftSlice, leftBase, leftLen);
  b.call(undefined, 'pm_emit_slice', [leftSlice]);
  b.call(undefined, 'pm_parse_unary', []);
  {
    const failed = b.alloc();
    ld(b, failed, G.FAIL_FLAG);
    b.branch(failed, 'bail', 'finish_binary');
  }
  b.label('finish_binary');
  {
    const lastEnd = b.alloc();
    const lastEndLine = b.alloc();
    const lastEndCol = b.alloc();
    ld(b, lastEnd, G.LAST_END);
    ld(b, lastEndLine, G.LAST_END_LINE);
    ld(b, lastEndCol, G.LAST_END_COL);
    b.call(undefined, 'pm_emit_span', [start, lastEnd, line, col, lastEndLine, lastEndCol]);
  }
  b.ret();

  b.label('no_operator');
  bytesFromMemory(b, leftSlice, leftBase, leftLen);
  b.call(undefined, 'pm_emit_slice', [leftSlice]);
  {
    const lastEnd = b.alloc();
    const lastEndLine = b.alloc();
    const lastEndCol = b.alloc();
    ld(b, lastEnd, G.LAST_END);
    ld(b, lastEndLine, G.LAST_END_LINE);
    ld(b, lastEndCol, G.LAST_END_COL);
    b.call(undefined, 'pm_emit_span', [start, lastEnd, line, col, lastEndLine, lastEndCol]);
  }
  b.ret();

  b.label('bail');
  {
    const one = K(b, pool, 1);
    st(b, G.FAIL_FLAG, one);
  }
  b.ret();

  return fn('pm_parse_expression', [], 'unit', b);
}

function buildParseParameters(pool: ConstPool): ForgeWebScriptSelfHostedVmFunction {
  const b = createBuilder(0);
  const kind = b.alloc();
  const cond = b.alloc();
  const byte0 = b.alloc();
  const wantOp = K(b, pool, PK_OP);
  const wantAlpha = K(b, pool, PK_ALPHA);
  const openParen = K(b, pool, 40);
  const closeParen = K(b, pool, 41);
  const colon = K(b, pool, 58);
  const comma = K(b, pool, 44);
  const one = K(b, pool, 1);
  const zero = K(b, pool, 0);
  const savedOffset = b.alloc();
  const count = b.alloc();
  const nameStart = b.alloc();
  const nameEnd = b.alloc();
  const nameLine = b.alloc();
  const nameCol = b.alloc();

  b.call(undefined, 'pm_peek', []);
  ld(b, kind, G.PEEK_KIND);
  b.binary('==', cond, kind, wantOp);
  b.branch(cond, 'open_check', 'fail');
  b.label('open_check');
  ld(b, byte0, G.PEEK_BYTE0);
  b.binary('==', cond, byte0, openParen);
  b.branch(cond, 'open_ok', 'fail');
  b.label('fail');
  st(b, G.FAIL_FLAG, one);
  b.ret();

  b.label('open_ok');
  b.call(undefined, 'pm_consume', []);
  ld(b, savedOffset, G.OUT_CURSOR);
  b.call(undefined, 'pm_emit_u32', [zero]);
  b.move(count, zero);
  b.call(undefined, 'pm_peek', []);

  b.label('loop');
  ld(b, kind, G.PEEK_KIND);
  b.binary('==', cond, kind, wantOp);
  b.branch(cond, 'close_check', 'param');
  b.label('close_check');
  ld(b, byte0, G.PEEK_BYTE0);
  b.binary('==', cond, byte0, closeParen);
  b.branch(cond, 'done', 'param');

  b.label('param');
  b.binary('==', cond, kind, wantAlpha);
  b.branch(cond, 'param_name', 'fail');
  b.label('param_name');
  b.call(undefined, 'pm_consume', []);
  ld(b, nameStart, G.LAST_START);
  ld(b, nameEnd, G.LAST_END);
  ld(b, nameLine, G.LAST_LINE);
  ld(b, nameCol, G.LAST_COL);
  b.call(undefined, 'pm_emit_dyn_string', [nameStart, nameEnd]);
  b.call(undefined, 'pm_peek', []);
  ld(b, kind, G.PEEK_KIND);
  b.binary('==', cond, kind, wantOp);
  b.branch(cond, 'colon_check', 'fail');
  b.label('colon_check');
  ld(b, byte0, G.PEEK_BYTE0);
  b.binary('==', cond, byte0, colon);
  b.branch(cond, 'colon_ok', 'fail');
  b.label('colon_ok');
  b.call(undefined, 'pm_consume', []);
  b.call(undefined, 'pm_parse_type', []);
  {
    const failed = b.alloc();
    ld(b, failed, G.FAIL_FLAG);
    b.branch(failed, 'bail', 'param_span');
  }
  b.label('param_span');
  {
    const lastEnd = b.alloc();
    const lastEndLine = b.alloc();
    const lastEndCol = b.alloc();
    ld(b, lastEnd, G.LAST_END);
    ld(b, lastEndLine, G.LAST_END_LINE);
    ld(b, lastEndCol, G.LAST_END_COL);
    b.call(undefined, 'pm_emit_span', [nameStart, lastEnd, nameLine, nameCol, lastEndLine, lastEndCol]);
  }
  b.binary('+', count, count, one);
  b.call(undefined, 'pm_peek', []);
  ld(b, kind, G.PEEK_KIND);
  b.binary('==', cond, kind, wantOp);
  b.branch(cond, 'comma_check', 'done');
  b.label('comma_check');
  ld(b, byte0, G.PEEK_BYTE0);
  b.binary('==', cond, byte0, comma);
  b.branch(cond, 'comma_ok', 'done');
  b.label('comma_ok');
  b.call(undefined, 'pm_consume', []);
  b.call(undefined, 'pm_peek', []);
  b.jump('loop');

  b.label('done');
  ld(b, kind, G.PEEK_KIND);
  b.binary('==', cond, kind, wantOp);
  b.branch(cond, 'close_final_check', 'bail');
  b.label('close_final_check');
  ld(b, byte0, G.PEEK_BYTE0);
  b.binary('==', cond, byte0, closeParen);
  b.branch(cond, 'close_ok', 'bail');
  b.label('close_ok');
  b.call(undefined, 'pm_consume', []);
  b.call(undefined, 'pm_patch_u32', [savedOffset, count]);
  b.ret();

  b.label('bail');
  st(b, G.FAIL_FLAG, one);
  b.ret();

  return fn('pm_parse_parameters', [], 'unit', b);
}

function buildParseReturnStatement(pool: ConstPool, returnWire: number): ForgeWebScriptSelfHostedVmFunction {
  const b = createBuilder(0);
  const start = b.alloc();
  const line = b.alloc();
  const col = b.alloc();
  const kind = b.alloc();
  const byte0 = b.alloc();
  const cond = b.alloc();
  const wantOp = K(b, pool, PK_OP);
  const semi = K(b, pool, 59);
  const zero = K(b, pool, 0);
  const one = K(b, pool, 1);
  const wire = b.alloc();

  ld(b, start, G.PEEK_START);
  ld(b, line, G.PEEK_LINE);
  ld(b, col, G.PEEK_COL);
  b.call(undefined, 'pm_consume', []); // 'return'
  b.num(wire, returnWire);
  b.call(undefined, 'pm_emit_const', [wire]);
  b.call(undefined, 'pm_peek', []);
  ld(b, kind, G.PEEK_KIND);
  b.binary('==', cond, kind, wantOp);
  b.branch(cond, 'semi_check', 'has_value');
  b.label('semi_check');
  ld(b, byte0, G.PEEK_BYTE0);
  b.binary('==', cond, byte0, semi);
  b.branch(cond, 'no_value', 'has_value');

  b.label('no_value');
  b.call(undefined, 'pm_emit_u8', [zero]);
  b.call(undefined, 'pm_consume', []); // ';'
  b.jump('finish');

  b.label('has_value');
  b.call(undefined, 'pm_emit_u8', [one]);
  b.call(undefined, 'pm_parse_expression', []);
  {
    const failed = b.alloc();
    ld(b, failed, G.FAIL_FLAG);
    b.branch(failed, 'bail', 'expect_semi');
  }
  b.label('expect_semi');
  b.call(undefined, 'pm_peek', []);
  ld(b, kind, G.PEEK_KIND);
  b.binary('==', cond, kind, wantOp);
  b.branch(cond, 'semi_check2', 'bail');
  b.label('semi_check2');
  ld(b, byte0, G.PEEK_BYTE0);
  b.binary('==', cond, byte0, semi);
  b.branch(cond, 'semi_ok', 'bail');
  b.label('semi_ok');
  b.call(undefined, 'pm_consume', []); // ';'

  b.label('finish');
  {
    const lastEnd = b.alloc();
    const lastEndLine = b.alloc();
    const lastEndCol = b.alloc();
    ld(b, lastEnd, G.LAST_END);
    ld(b, lastEndLine, G.LAST_END_LINE);
    ld(b, lastEndCol, G.LAST_END_COL);
    b.call(undefined, 'pm_emit_span', [start, lastEnd, line, col, lastEndLine, lastEndCol]);
  }
  b.ret();

  b.label('bail');
  st(b, G.FAIL_FLAG, one);
  b.ret();

  return fn('pm_parse_return_statement', [], 'unit', b);
}

function buildParseBlock(pool: ConstPool, returnWord: number): ForgeWebScriptSelfHostedVmFunction {
  const b = createBuilder(0);
  const kind = b.alloc();
  const byte0 = b.alloc();
  const cond = b.alloc();
  const wantOp = K(b, pool, PK_OP);
  const wantAlpha = K(b, pool, PK_ALPHA);
  const wantEof = K(b, pool, PK_EOF);
  const openBrace = K(b, pool, 123);
  const closeBrace = K(b, pool, 125);
  const one = K(b, pool, 1);
  const zero = K(b, pool, 0);
  const savedOffset = b.alloc();
  const count = b.alloc();

  b.call(undefined, 'pm_peek', []);
  ld(b, kind, G.PEEK_KIND);
  b.binary('==', cond, kind, wantOp);
  b.branch(cond, 'open_check', 'fail');
  b.label('open_check');
  ld(b, byte0, G.PEEK_BYTE0);
  b.binary('==', cond, byte0, openBrace);
  b.branch(cond, 'open_ok', 'fail');
  b.label('fail');
  st(b, G.FAIL_FLAG, one);
  b.ret();

  b.label('open_ok');
  b.call(undefined, 'pm_consume', []);
  ld(b, savedOffset, G.OUT_CURSOR);
  b.call(undefined, 'pm_emit_u32', [zero]);
  b.move(count, zero);
  b.call(undefined, 'pm_peek', []);

  b.label('loop');
  ld(b, kind, G.PEEK_KIND);
  b.binary('==', cond, kind, wantOp);
  b.branch(cond, 'close_check', 'eof_check');
  b.label('close_check');
  ld(b, byte0, G.PEEK_BYTE0);
  b.binary('==', cond, byte0, closeBrace);
  b.branch(cond, 'done', 'stmt_check');

  b.label('eof_check');
  b.binary('==', cond, kind, wantEof);
  b.branch(cond, 'fail', 'stmt_check');

  b.label('stmt_check');
  b.binary('==', cond, kind, wantAlpha);
  b.branch(cond, 'stmt_word_check', 'fail');
  b.label('stmt_word_check');
  {
    const word = b.alloc();
    b.num(word, returnWord);
    b.call(cond, 'pm_word_equals', [word]);
  }
  b.branch(cond, 'stmt_return', 'fail');

  b.label('stmt_return');
  b.call(undefined, 'pm_parse_return_statement', []);
  {
    const failed = b.alloc();
    ld(b, failed, G.FAIL_FLAG);
    b.branch(failed, 'bail', 'stmt_ok');
  }
  b.label('stmt_ok');
  b.binary('+', count, count, one);
  b.call(undefined, 'pm_peek', []);
  b.jump('loop');

  b.label('done');
  b.call(undefined, 'pm_consume', []);
  b.call(undefined, 'pm_patch_u32', [savedOffset, count]);
  b.ret();

  b.label('bail');
  st(b, G.FAIL_FLAG, one);
  b.ret();

  return fn('pm_parse_block', [], 'unit', b);
}

function buildParseFunction(pool: ConstPool, exportWord: number, fnWord: number): ForgeWebScriptSelfHostedVmFunction {
  const b = createBuilder(0);
  const kind = b.alloc();
  const cond = b.alloc();
  const byte0 = b.alloc();
  const byte1 = b.alloc();
  const wantAlpha = K(b, pool, PK_ALPHA);
  const wantOp = K(b, pool, PK_OP);
  const arrowByte0 = K(b, pool, 45);
  const arrowByte1 = K(b, pool, 62);
  const one = K(b, pool, 1);
  const zero = K(b, pool, 0);
  const start = b.alloc();
  const line = b.alloc();
  const col = b.alloc();
  const exported = b.alloc();
  const nameStart = b.alloc();
  const nameEnd = b.alloc();

  ld(b, start, G.PEEK_START);
  ld(b, line, G.PEEK_LINE);
  ld(b, col, G.PEEK_COL);
  b.move(exported, zero);

  ld(b, kind, G.PEEK_KIND);
  b.binary('==', cond, kind, wantAlpha);
  b.branch(cond, 'export_check', 'want_fn');
  b.label('export_check');
  {
    const word = b.alloc();
    b.num(word, exportWord);
    b.call(cond, 'pm_word_equals', [word]);
  }
  b.branch(cond, 'consume_export', 'want_fn');
  b.label('consume_export');
  b.call(undefined, 'pm_consume', []);
  b.move(exported, one);
  b.call(undefined, 'pm_peek', []);

  b.label('want_fn');
  ld(b, kind, G.PEEK_KIND);
  b.binary('==', cond, kind, wantAlpha);
  b.branch(cond, 'fn_word_check', 'fail');
  b.label('fn_word_check');
  {
    const word = b.alloc();
    b.num(word, fnWord);
    b.call(cond, 'pm_word_equals', [word]);
  }
  b.branch(cond, 'consume_fn', 'fail');
  b.label('fail');
  st(b, G.FAIL_FLAG, one);
  b.ret();

  b.label('consume_fn');
  b.call(undefined, 'pm_consume', []);
  b.call(undefined, 'pm_peek', []);
  ld(b, kind, G.PEEK_KIND);
  b.binary('==', cond, kind, wantAlpha);
  b.branch(cond, 'have_name', 'fail');
  b.label('have_name');
  b.call(undefined, 'pm_consume', []);
  ld(b, nameStart, G.LAST_START);
  ld(b, nameEnd, G.LAST_END);
  b.call(undefined, 'pm_emit_dyn_string', [nameStart, nameEnd]);
  b.call(undefined, 'pm_emit_u8', [exported]);
  b.call(undefined, 'pm_emit_u8', [zero]); // iterable
  b.call(undefined, 'pm_emit_u8', [zero]); // inline policy
  b.call(undefined, 'pm_emit_u8', [zero]); // documentation
  b.call(undefined, 'pm_emit_u32', [zero]); // generic parameters
  b.call(undefined, 'pm_parse_parameters', []);
  {
    const failed = b.alloc();
    ld(b, failed, G.FAIL_FLAG);
    b.branch(failed, 'bail', 'want_arrow');
  }
  b.label('want_arrow');
  b.call(undefined, 'pm_peek', []);
  ld(b, kind, G.PEEK_KIND);
  b.binary('==', cond, kind, wantOp);
  b.branch(cond, 'arrow_check', 'bail');
  b.label('arrow_check');
  ld(b, byte0, G.PEEK_BYTE0);
  ld(b, byte1, G.PEEK_BYTE1);
  {
    const e0 = b.alloc();
    const e1 = b.alloc();
    b.binary('==', e0, byte0, arrowByte0);
    b.binary('==', e1, byte1, arrowByte1);
    b.binary('&&', cond, e0, e1);
  }
  b.branch(cond, 'consume_arrow', 'bail');
  b.label('consume_arrow');
  b.call(undefined, 'pm_consume', []);
  b.call(undefined, 'pm_parse_type', []);
  {
    const failed = b.alloc();
    ld(b, failed, G.FAIL_FLAG);
    b.branch(failed, 'bail', 'want_block');
  }
  b.label('want_block');
  b.call(undefined, 'pm_parse_block', []);
  {
    const failed = b.alloc();
    ld(b, failed, G.FAIL_FLAG);
    b.branch(failed, 'bail', 'finish');
  }
  b.label('finish');
  {
    const lastEnd = b.alloc();
    const lastEndLine = b.alloc();
    const lastEndCol = b.alloc();
    ld(b, lastEnd, G.LAST_END);
    ld(b, lastEndLine, G.LAST_END_LINE);
    ld(b, lastEndCol, G.LAST_END_COL);
    b.call(undefined, 'pm_emit_span', [start, lastEnd, line, col, lastEndLine, lastEndCol]);
  }
  b.ret();

  b.label('bail');
  st(b, G.FAIL_FLAG, one);
  b.ret();

  return fn('pm_parse_function', [], 'unit', b);
}

function buildSkipClassBody(pool: ConstPool): ForgeWebScriptSelfHostedVmFunction {
  const b = createBuilder(0);
  const kind = b.alloc();
  const byte0 = b.alloc();
  const cond = b.alloc();
  const wantOp = K(b, pool, PK_OP);
  const wantEof = K(b, pool, PK_EOF);
  const openBrace = K(b, pool, 123);
  const closeBrace = K(b, pool, 125);
  const semi = K(b, pool, 59);
  const one = K(b, pool, 1);
  const zero = K(b, pool, 0);
  const braces = b.alloc();

  b.call(undefined, 'pm_consume', []); // the class-family keyword
  st(b, G.DIAG_FLAG, one);
  {
    const value = b.alloc();
    for (const [source, target] of [
      [G.LAST_START, G.DIAG_START],
      [G.LAST_END, G.DIAG_END],
      [G.LAST_LINE, G.DIAG_LINE],
      [G.LAST_COL, G.DIAG_COL],
      [G.LAST_END_LINE, G.DIAG_END_LINE],
      [G.LAST_END_COL, G.DIAG_END_COL],
    ]) {
      ld(b, value, source);
      st(b, target, value);
    }
  }
  b.move(braces, zero);
  b.call(undefined, 'pm_peek', []);

  b.label('loop');
  ld(b, kind, G.PEEK_KIND);
  b.binary('==', cond, kind, wantEof);
  b.branch(cond, 'stop', 'op_check');
  b.label('op_check');
  b.binary('==', cond, kind, wantOp);
  b.branch(cond, 'brace_check', 'advance');
  b.label('brace_check');
  ld(b, byte0, G.PEEK_BYTE0);
  b.binary('==', cond, byte0, openBrace);
  b.branch(cond, 'open_brace', 'close_check');
  b.label('open_brace');
  b.binary('+', braces, braces, one);
  b.call(undefined, 'pm_consume', []);
  b.call(undefined, 'pm_peek', []);
  b.jump('loop');
  b.label('close_check');
  b.binary('==', cond, byte0, closeBrace);
  b.branch(cond, 'close_brace', 'semi_check');
  b.label('close_brace');
  {
    const isZero = b.alloc();
    b.binary('==', isZero, braces, zero);
    b.branch(isZero, 'stop_and_consume', 'dec_and_continue');
  }
  b.label('dec_and_continue');
  b.binary('-', braces, braces, one);
  b.call(undefined, 'pm_consume', []);
  {
    const isZeroNow = b.alloc();
    b.binary('==', isZeroNow, braces, zero);
    b.branch(isZeroNow, 'stop', 'continue_peek');
  }
  b.label('continue_peek');
  b.call(undefined, 'pm_peek', []);
  b.jump('loop');
  b.label('stop_and_consume');
  b.call(undefined, 'pm_consume', []);
  b.jump('stop');
  b.label('semi_check');
  {
    const isZero = b.alloc();
    const isSemi = b.alloc();
    b.binary('==', isZero, braces, zero);
    b.binary('==', isSemi, byte0, semi);
    b.binary('&&', cond, isZero, isSemi);
  }
  b.branch(cond, 'stop_and_consume', 'advance');
  b.label('advance');
  b.call(undefined, 'pm_consume', []);
  b.call(undefined, 'pm_peek', []);
  b.jump('loop');
  b.label('stop');
  b.ret();

  return fn('pm_skip_class_body', [], 'unit', b);
}

// ---------------------------------------------------------------------------
// Entry point: reserves memory, copies the source, drives the top-level
// loop, backpatches the module span/function count, and assembles the
// envelope returned to the host.
// ---------------------------------------------------------------------------

function buildEntry(
  pool: ConstPool,
  nameWire: number,
  classWord: number,
  exportWord: number,
  fnWord: number,
): ForgeWebScriptSelfHostedVmFunction {
  const b = createBuilder(1); // parameter 0 = source aggregate
  const dummy = b.alloc();
  const srcLen = b.alloc();
  const sourceBase = b.alloc();
  const leftBuf = b.alloc();
  const envelopeBase = b.alloc();
  const outputBase = b.alloc();
  const zero = K(b, pool, 0);
  const one = K(b, pool, 1);
  const moduleStart = b.alloc();
  const moduleStartLine = b.alloc();
  const moduleStartCol = b.alloc();
  const spanOffset = b.alloc();
  const funcCountOffset = b.alloc();
  const funcCount = b.alloc();
  const kind = b.alloc();
  const cond = b.alloc();
  const nameWireReg = b.alloc();

  allocOp(b, dummy, K(b, pool, RESERVED_GLOBALS_SIZE));
  st(b, G.SCAN_OFFSET, zero);
  st(b, G.SCAN_LINE, one);
  st(b, G.SCAN_COL, one);
  st(b, G.OUT_CURSOR, zero);
  st(b, G.FAIL_FLAG, zero);
  st(b, G.DIAG_FLAG, zero);

  b.len(srcLen, 0);
  st(b, G.SOURCE_LEN, srcLen);
  allocOp(b, sourceBase, srcLen);
  st(b, G.SOURCE_BASE, sourceBase);
  writeBytesOp(b, sourceBase, 0);

  allocOp(b, leftBuf, K(b, pool, LEFT_BUF_CAPACITY));
  st(b, G.LEFT_BUF_BASE, leftBuf);

  allocOp(b, envelopeBase, K(b, pool, ENVELOPE_HEADER_SIZE));
  allocOp(b, outputBase, K(b, pool, OUTPUT_CAPACITY));
  st(b, G.OUTPUT_BASE, outputBase);

  b.call(undefined, 'pm_peek', []);
  ld(b, moduleStart, G.PEEK_START);
  ld(b, moduleStartLine, G.PEEK_LINE);
  ld(b, moduleStartCol, G.PEEK_COL);

  // magic 'FWSM' + payload version 1
  {
    const header = b.alloc();
    b.num(header, pool.bytesConst(new Uint8Array([0x46, 0x57, 0x53, 0x4d, 1])));
    b.call(undefined, 'pm_emit_const', [header]);
  }
  b.num(nameWireReg, nameWire);
  b.call(undefined, 'pm_emit_const', [nameWireReg]);

  ld(b, spanOffset, G.OUT_CURSOR);
  for (let index = 0; index < 6; index += 1) b.call(undefined, 'pm_emit_u32', [zero]);
  b.call(undefined, 'pm_emit_u32', [zero]); // imports
  b.call(undefined, 'pm_emit_u32', [zero]); // sourceImports
  b.call(undefined, 'pm_emit_u32', [zero]); // structs
  b.call(undefined, 'pm_emit_u32', [zero]); // enums
  b.call(undefined, 'pm_emit_u32', [zero]); // interfaces
  ld(b, funcCountOffset, G.OUT_CURSOR);
  b.call(undefined, 'pm_emit_u32', [zero]); // functions placeholder
  b.move(funcCount, zero);

  b.label('top_loop');
  ld(b, kind, G.PEEK_KIND);
  {
    const wantEof = K(b, pool, PK_EOF);
    b.binary('==', cond, kind, wantEof);
  }
  b.branch(cond, 'top_done', 'top_alpha_check');

  b.label('top_alpha_check');
  {
    const wantAlpha = K(b, pool, PK_ALPHA);
    b.binary('==', cond, kind, wantAlpha);
  }
  b.branch(cond, 'top_class_check', 'top_fail');

  b.label('top_class_check');
  {
    const word = b.alloc();
    b.num(word, classWord);
    b.call(cond, 'pm_word_equals', [word]);
  }
  b.branch(cond, 'top_class', 'top_fn_check');

  b.label('top_class');
  b.call(undefined, 'pm_skip_class_body', []);
  {
    const failed = b.alloc();
    ld(b, failed, G.FAIL_FLAG);
    b.branch(failed, 'top_done', 'top_continue');
  }

  b.label('top_fn_check');
  {
    const exportWordReg = b.alloc();
    const fnWordReg = b.alloc();
    const isExport = b.alloc();
    const isFn = b.alloc();
    b.num(exportWordReg, exportWord);
    b.call(isExport, 'pm_word_equals', [exportWordReg]);
    b.num(fnWordReg, fnWord);
    b.call(isFn, 'pm_word_equals', [fnWordReg]);
    b.binary('||', cond, isExport, isFn);
  }
  b.branch(cond, 'top_function', 'top_fail');

  b.label('top_function');
  b.call(undefined, 'pm_parse_function', []);
  {
    const failed = b.alloc();
    ld(b, failed, G.FAIL_FLAG);
    b.branch(failed, 'top_done', 'top_count');
  }
  b.label('top_count');
  b.binary('+', funcCount, funcCount, one);

  b.label('top_continue');
  b.call(undefined, 'pm_peek', []);
  b.jump('top_loop');

  b.label('top_fail');
  st(b, G.FAIL_FLAG, one);
  b.jump('top_done');

  b.label('top_done');
  b.call(undefined, 'pm_patch_u32', [funcCountOffset, funcCount]);
  {
    const failed = b.alloc();
    const moduleEnd = b.alloc();
    const moduleEndLine = b.alloc();
    const moduleEndCol = b.alloc();
    ld(b, failed, G.FAIL_FLAG);
    ld(b, moduleEnd, G.LAST_END);
    ld(b, moduleEndLine, G.LAST_END_LINE);
    ld(b, moduleEndCol, G.LAST_END_COL);
    // pm_patch_u32(offset, value) writes at OUTPUT_BASE + offset; span fields are 4 bytes apart.
    const off0 = b.alloc();
    const off4 = b.alloc();
    const off8 = b.alloc();
    const off12 = b.alloc();
    const off16 = b.alloc();
    const off20 = b.alloc();
    const four = K(b, pool, 4);
    const eight = K(b, pool, 8);
    const twelve = K(b, pool, 12);
    const sixteen = K(b, pool, 16);
    const twenty = K(b, pool, 20);
    b.move(off0, spanOffset);
    b.binary('+', off4, spanOffset, four);
    b.binary('+', off8, spanOffset, eight);
    b.binary('+', off12, spanOffset, twelve);
    b.binary('+', off16, spanOffset, sixteen);
    b.binary('+', off20, spanOffset, twenty);
    b.call(undefined, 'pm_patch_u32', [off0, moduleStart]);
    b.call(undefined, 'pm_patch_u32', [off4, moduleEnd]);
    b.call(undefined, 'pm_patch_u32', [off8, moduleStartLine]);
    b.call(undefined, 'pm_patch_u32', [off12, moduleStartCol]);
    b.call(undefined, 'pm_patch_u32', [off16, moduleEndLine]);
    b.call(undefined, 'pm_patch_u32', [off20, moduleEndCol]);

    // Envelope header (32 bytes, at envelopeBase, independent of OUTPUT_BASE/OUT_CURSOR):
    // [0] failFlag [4] diagFlag [8..32) diagnostic span.
    const failValue = b.alloc();
    ld(b, failValue, G.FAIL_FLAG);
    writeU32At(b, pool, envelopeBase, 0, failValue);
    {
      const diagFlagValue = b.alloc();
      ld(b, diagFlagValue, G.DIAG_FLAG);
      writeU32At(b, pool, envelopeBase, 4, diagFlagValue);
    }
    {
      const value = b.alloc();
      const offsets: readonly [number, number][] = [
        [G.DIAG_START, 8],
        [G.DIAG_END, 12],
        [G.DIAG_LINE, 16],
        [G.DIAG_COL, 20],
        [G.DIAG_END_LINE, 24],
        [G.DIAG_END_COL, 28],
      ];
      for (const [source, offset] of offsets) {
        ld(b, value, source);
        writeU32At(b, pool, envelopeBase, offset, value);
      }
    }

    const outCursor = b.alloc();
    const totalLen = b.alloc();
    const envelopeSize = K(b, pool, ENVELOPE_HEADER_SIZE);
    ld(b, outCursor, G.OUT_CURSOR);
    b.binary('+', totalLen, envelopeSize, outCursor);
    const result = b.alloc();
    bytesFromMemory(b, result, envelopeBase, totalLen);
    b.ret(result);
    void failed;
  }

  return fn(FORGE_WEB_SCRIPT_PARSER_MODULE_STAGE_ENTRY, [SOURCE_LAYOUT], 'bytes', b);
}

/** Writes `value` (u32, LE) directly at `base + offset` without touching OUT_CURSOR. */
function writeU32At(b: BytecodeBuilder, pool: ConstPool, base: number, offset: number, value: number): void {
  const target = b.alloc();
  const off = K(b, pool, offset);
  const zero = K(b, pool, 0);
  const four = K(b, pool, 4);
  const tmp = b.alloc();
  b.binary('+', target, base, off);
  st(b, G.SCRATCH, value);
  bytesFromMemory(b, tmp, zero, four);
  writeBytesOp(b, target, tmp);
}

export interface ForgeWebScriptParserModuleStageOptions {
  /** XOR applied to the emitted module magic bytes to prove divergence in tests. */
  readonly saltXor?: number;
}

/**
 * Derives the deterministic module name from `fileName` the way
 * `deriveForgeWebScriptModuleId` does for bare, extension-suffixed file names
 * (no directory segments, no explicit `root`) — the bounded fixture shape
 * this stage supports. This is a pure function of an already-known identity
 * (not something that needs VM parsing) and is baked into the module as a
 * constant ahead of time.
 */
function deriveBoundedModuleName(fileName: string): string {
  const base = fileName.split(/[/\\]/u).at(-1) ?? fileName;
  return base.replace(/\.fws$/u, '');
}

/**
 * The hand-lowered VM module for the bounded parser-module stage.
 * Entry: parse_module_stage(source: ForgeWebScriptSourceBytes) -> bytes envelope.
 *
 * Envelope layout (all u32 little-endian):
 *   [0]  failFlag  (1 = grammar outside the bounded v1 subset; module payload absent)
 *   [4]  diagFlag  (1 = a single bounded FWS-PARSE-052 diagnostic was recorded)
 *   [8..32) diagnostic span (start,end,line,column,endLine,endColumn)
 *   [32..) module payload bytes (only meaningful when failFlag = 0)
 */
export function createForgeWebScriptParserModuleVmModule(
  sourceHash: string,
  fileName: string,
  options: ForgeWebScriptParserModuleStageOptions = {},
): ForgeWebScriptSelfHostedVmModule {
  const pool = new ConstPool();
  const saltXor = options.saltXor ?? 0;
  const nameWire = pool.wireString(deriveBoundedModuleName(fileName));

  const classWord = pool.bytesConst(textEncoder.encode('class'));
  const exportWord = pool.bytesConst(textEncoder.encode('export'));
  const fnWord = pool.bytesConst(textEncoder.encode('fn'));
  const returnWord = pool.bytesConst(textEncoder.encode('return'));
  const returnWire = pool.wireString('return');

  const expressionWire: ExpressionWire = {
    literal: pool.wireString('literal'),
    identifier: pool.wireString('identifier'),
    call: pool.wireString('call'),
    binary: pool.wireString('binary'),
    unary: pool.wireString('unary'),
    i32Type: pool.wireString('i32'),
    unaryMinus: pool.wireString('-'),
    opPlus: pool.wireString('+'),
    opMinus: pool.wireString('-'),
    opStar: pool.wireString('*'),
    opSlash: pool.wireString('/'),
    opLt: pool.wireString('<'),
    opGt: pool.wireString('>'),
    opLe: pool.wireString('<='),
    opGe: pool.wireString('>='),
    opEq: pool.wireString('=='),
    opNe: pool.wireString('!='),
  };

  const typeWires: readonly TypeWire[] = PRIMITIVE_TYPE_NAMES.map((name) => ({
    rawWord: pool.bytesConst(textEncoder.encode(name)),
    wire: pool.wireString(name),
  }));

  const functions: ForgeWebScriptSelfHostedVmFunction[] = [
    buildReadByte(pool),
    buildIsAlpha(pool),
    buildIsDigit(pool),
    buildIsAlnum(),
    buildIsTwoCharOp(pool),
    buildIsOneCharOp(pool),
    buildEmitSlice(),
    buildEmitConst(),
    buildEmitU32(pool),
    buildEmitU8(pool),
    buildEmitDynString(),
    buildEmitSpan(),
    buildPatchU32(pool),
    buildPeek(pool),
    buildConsume(),
    buildWordEquals(pool),
    buildParseType(pool, typeWires),
    buildParsePrimary(pool, expressionWire),
    buildParseUnary(pool, expressionWire),
    buildParseExpression(pool, expressionWire),
    buildParseParameters(pool),
    buildParseReturnStatement(pool, returnWire),
    buildParseBlock(pool, returnWord),
    buildParseFunction(pool, exportWord, fnWord),
    buildSkipClassBody(pool),
    buildEntry(pool, nameWire, classWord, exportWord, fnWord),
  ];

  if (saltXor !== 0) {
    // Deliberate-divergence hook for tests: XOR the module-magic constant so
    // the emitted envelope bytes differ from the seed without touching any
    // grammar logic. Located after construction so the salt only ever
    // affects the VM path, never the seed oracle.
    const target = functions.find((candidate) => candidate.name === FORGE_WEB_SCRIPT_PARSER_MODULE_STAGE_ENTRY);
    void target;
    const magicIndex = [...pool.values.keys()].find((index) => {
      const value = pool.values[index];
      return value?.kind === 'aggregate' && value.bytes.length === 5 && value.bytes[0] === 0x46;
    });
    if (magicIndex !== undefined) {
      const original = pool.values[magicIndex] as Extract<
        ForgeWebScriptSelfHostedVmValue,
        { readonly kind: 'aggregate' }
      >;
      const mutated = new Uint8Array(original.bytes);
      mutated[4] = (mutated[4] ?? 0) ^ (saltXor & 0xff);
      pool.values[magicIndex] = { ...original, bytes: mutated };
    }
  }

  const sourceLayout: ForgeWebScriptAggregateLayout = {
    name: SOURCE_LAYOUT,
    kind: 'struct',
    size: 4,
    alignment: 4,
    fields: [{ name: 'bytes', type: 'bytes', offset: 0, size: 4, alignment: 4, ownership: 'owned' }],
    immutable: true,
  };
  const bytesBlobLayout: ForgeWebScriptAggregateLayout = {
    name: BYTES_BLOB_LAYOUT,
    kind: 'struct',
    size: 4,
    alignment: 4,
    fields: [{ name: 'bytes', type: 'bytes', offset: 0, size: 4, alignment: 4, ownership: 'owned' }],
    immutable: true,
  };

  return {
    format: 'forge-web-script-vm-module',
    version: '1.0',
    sourceHash,
    functions,
    constants: pool.values,
    aggregateLayouts: [sourceLayout, bytesBlobLayout],
    specializations: [],
    capabilityImports: [],
    memory: {
      pageSize: 65_536,
      addressType: 'u32',
      allocatorExport: 'fws_alloc',
      deallocatorExport: 'fws_dealloc',
      reallocatorExport: 'fws_realloc',
    },
  };
}

/** Decoded envelope returned by {@link FORGE_WEB_SCRIPT_PARSER_MODULE_STAGE_ENTRY}. */
export interface ForgeWebScriptParserModuleEnvelope {
  readonly failed: boolean;
  readonly diagnosticSpan?: {
    readonly start: number;
    readonly end: number;
    readonly line: number;
    readonly column: number;
    readonly endLine: number;
    readonly endColumn: number;
  };
  readonly modulePayload: Uint8Array;
}

export function decodeForgeWebScriptParserModuleEnvelope(bytes: Uint8Array): ForgeWebScriptParserModuleEnvelope {
  if (bytes.byteLength < ENVELOPE_HEADER_SIZE)
    throw new Error('Invalid Forge Web Script parser-module envelope: truncated header');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const failed = view.getUint32(0, true) !== 0;
  const diagFlag = view.getUint32(4, true) !== 0;
  const diagnosticSpan = diagFlag
    ? {
        start: view.getUint32(8, true),
        end: view.getUint32(12, true),
        line: view.getUint32(16, true),
        column: view.getUint32(20, true),
        endLine: view.getUint32(24, true),
        endColumn: view.getUint32(28, true),
      }
    : undefined;
  return {
    failed,
    ...(diagnosticSpan === undefined ? {} : { diagnosticSpan }),
    modulePayload: bytes.slice(ENVELOPE_HEADER_SIZE),
  };
}
