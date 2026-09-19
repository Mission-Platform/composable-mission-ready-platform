/**
 * Bounded self-hosted lex/token-normalization stage.
 *
 * The TypeScript seed and the hand-lowered VM bytecode implement the same
 * deterministic algorithm so interpret/JIT/AOT parity can fail on drift.
 * Full compiler ownership remains seed-backed outside this stage.
 */

import type { FlintOwnership } from '../ast.js';
import type { FlintAggregateLayout } from '../manifest.js';

export const FLINT_LEX_STAGE_SOURCE_LAYOUT = 'FlintSourceBytes';
export const FLINT_LEX_STAGE_ENTRY = 'lex_fingerprint';

const FNV_OFFSET = 2_166_136_261;
const FNV_PRIME = 16_777_619;

const KIND_EOF = 0;
const KIND_IDENT = 1;
const KIND_KEYWORD = 2;
const KIND_NUMBER = 3;
const KIND_STRING = 4;
const KIND_OPERATOR = 5;
const KIND_PUNCT = 6;
const KIND_COMMENT = 7;
const KIND_ERROR = 8;

const KEYWORDS = [
  'as',
  'capability',
  'case',
  'catch',
  'class',
  'constructor',
  'default',
  'else',
  'enum',
  'extends',
  'export',
  'do',
  'for',
  'fn',
  'iter',
  'if',
  'impl',
  'interface',
  'import',
  'inline',
  'let',
  'likely',
  'match',
  'module',
  'new',
  'noinline',
  'return',
  'struct',
  'switch',
  'trait',
  'loop',
  'try',
  'throw',
  'unlikely',
  'while',
  'yield',
] as const;

const TWO_CHAR_OPS = ['!=', '&&', '==', '||', '<=', '>=', '->', '=>', '::'] as const;
const ONE_CHAR_OPS = new Set(['!', '%', '*', '+', '-', '/', '<', '>', '=']);
const PUNCT = new Set(['{', '}', '(', ')', '[', ']', ':', ';', ',', '|', '.']);

/** Virtual machine instruction tuple executed during self-hosted lexing. */
export type FlintSelfHostedVmInstruction =
  | { readonly opcode: 'const'; readonly destination?: number; readonly constant: number }
  | { readonly opcode: 'move'; readonly destination: number; readonly source: number }
  | {
      readonly opcode: 'load';
      readonly destination: number;
      readonly address: number;
      readonly type: 'number';
      readonly numberType?: 'i32' | 'u32';
    }
  | { readonly opcode: 'store'; readonly address: number; readonly source: number }
  /** Allocate the number of bytes in `register[size]` and return its pointer. */
  | { readonly opcode: 'alloc'; readonly destination: number; readonly size: number }
  /** Expose a bounded linear-memory range as a pointer-length bytes value. */
  | {
      readonly opcode: 'bytes-from-memory';
      readonly destination: number;
      readonly pointer: number;
      readonly length: number;
      readonly ownership?: FlintOwnership;
    }
  /** Copy a bounded linear-memory range into an aggregate value. */
  | {
      readonly opcode: 'aggregate-from-memory';
      readonly destination: number;
      readonly layout: string;
      readonly pointer: number;
      readonly length: number;
      readonly ownership?: FlintOwnership;
    }
  /** Write an aggregate or pointer-length bytes value to linear memory. */
  | { readonly opcode: 'write-bytes'; readonly pointer: number; readonly source: number }
  | { readonly opcode: 'len'; readonly destination: number; readonly source: number }
  | {
      readonly opcode: 'byte-at';
      readonly destination: number;
      readonly source: number;
      readonly index: number;
    }
  | {
      readonly opcode: 'unary';
      readonly operation: 'not' | 'neg';
      readonly destination: number;
      readonly operand: number;
    }
  | {
      readonly opcode: 'binary';
      readonly operation: string;
      readonly destination: number;
      readonly left: number;
      readonly right: number;
    }
  | {
      readonly opcode: 'call';
      readonly destination?: number;
      readonly functionName: string;
      readonly arguments: readonly number[];
    }
  | { readonly opcode: 'branch'; readonly condition: number; readonly ifTrue: number; readonly ifFalse: number }
  | { readonly opcode: 'jump'; readonly target: number }
  | { readonly opcode: 'return'; readonly source?: number };

/** Constant value stored in the self-hosted VM constant pool. */
export type FlintSelfHostedVmValue =
  | { readonly kind: 'unit' }
  | { readonly kind: 'bool'; readonly value: boolean }
  | { readonly kind: 'number'; readonly type: 'i32' | 'u32'; readonly value: number }
  | {
      readonly kind: 'aggregate';
      readonly layout: string;
      readonly bytes: Uint8Array;
      readonly ownership: FlintOwnership;
    };

/** Function definition executed by the self-hosted virtual machine. */
export interface FlintSelfHostedVmFunction {
  readonly name: string;
  readonly parameters: readonly string[];
  readonly result: string;
  readonly registers: number;
  readonly code: readonly FlintSelfHostedVmInstruction[];
  readonly debugSpans: readonly [];
}

/** Self-hosted compiler VM module structure containing bytecode and constants. */
export interface FlintSelfHostedVmModule {
  readonly format: 'forge-web-script-vm-module';
  readonly version: '1.0';
  readonly functions: readonly FlintSelfHostedVmFunction[];
  readonly constants: readonly FlintSelfHostedVmValue[];
  readonly aggregateLayouts: readonly FlintAggregateLayout[];
  readonly specializations: readonly [];
  readonly capabilityImports: readonly [];
  readonly memory: {
    readonly pageSize: 65_536;
    readonly addressType: 'u32';
    readonly allocatorExport: 'fws_alloc';
    readonly deallocatorExport: 'fws_dealloc';
    readonly reallocatorExport: 'fws_realloc';
  };
  readonly sourceHash: string;
}

const encoder = new TextEncoder();

/** Bit-exact ToInt32 for FNV and VM parity (not floating truncation). */
function toInt32(value: number): number {
  // eslint-disable-next-line unicorn/prefer-math-trunc -- intentional ToInt32 wrap for hash parity
  return value | 0;
}

/** Mixes a single 32-bit word into the FNV-1a hash state. */
function fnvMix(hash: number, byte: number): number {
  return Math.imul(toInt32(hash) ^ (byte & 0xff), FNV_PRIME);
}

/** Computes the 32-bit FNV-1a hash of a UTF-8 string. */
function fnvText(text: string): number {
  let hash = FNV_OFFSET;
  for (const byte of encoder.encode(text)) hash = fnvMix(hash, byte);
  return hash;
}

const KEYWORD_HASHES = new Set(KEYWORDS.map((keyword) => fnvText(keyword)));

/** Evaluates whether a byte represents an ASCII or Unicode whitespace code. */
function isWhitespace(byte: number): boolean {
  return byte === 9 || byte === 10 || byte === 13 || byte === 32;
}

/** Evaluates whether a byte represents an ASCII alphabetic character. */
function isAlpha(byte: number): boolean {
  return (byte >= 65 && byte <= 90) || (byte >= 97 && byte <= 122) || byte === 95;
}

/** Evaluates whether a byte represents an ASCII decimal digit. */
function isDigit(byte: number): boolean {
  return byte >= 48 && byte <= 57;
}

/** Evaluates whether a byte represents an alphanumeric character. */
function isAlnum(byte: number): boolean {
  return isAlpha(byte) || isDigit(byte);
}

/**
 * Advances offset past consecutive whitespace bytes.
 *
 * @param bytes - Byte buffer.
 * @param offset - Initial offset.
 * @returns Offset after whitespace sequence.
 */
function skipWhitespaceBytes(bytes: Uint8Array, offset: number): number {
  let next = offset + 1;
  while (next < bytes.length && isWhitespace(bytes[next] ?? 0)) next += 1;
  return next;
}

/**
 * Scans a single-line comment in a byte buffer until newline or end-of-buffer.
 *
 * @param bytes - Byte buffer.
 * @param offset - Offset after '//'.
 * @returns Offset following comment.
 */
function scanLineCommentBytes(bytes: Uint8Array, offset: number): number {
  let next = offset;
  while (next < bytes.length && bytes[next] !== 10) next += 1;
  return next;
}

/**
 * Scans a block comment in a byte buffer until closing delimiter.
 *
 * @param bytes - Byte buffer.
 * @param offset - Offset after '/*'.
 * @returns Offset following closing delimiter.
 */
function scanBlockCommentBytes(bytes: Uint8Array, offset: number): number {
  let next = offset;
  while (next < bytes.length) {
    if (bytes[next] === 42 && next + 1 < bytes.length && bytes[next + 1] === 47) {
      next += 2;
      break;
    }
    next += 1;
  }
  return next;
}

/**
 * Scans a single-line or block comment in a byte buffer.
 *
 * @param bytes - Byte buffer.
 * @param offset - Initial offset at the leading slash.
 * @param byte - First byte.
 * @returns Offset after comment, or undefined if not a comment.
 */
function scanCommentBytes(bytes: Uint8Array, offset: number, byte: number): number | undefined {
  if (byte !== 47 || offset + 1 >= bytes.length) return undefined;
  const nextByte = bytes[offset + 1];
  if (nextByte === 47) return scanLineCommentBytes(bytes, offset + 2);
  if (nextByte === 42) return scanBlockCommentBytes(bytes, offset + 2);
  return undefined;
}

/**
 * Scans an alphabetic identifier and mixes its hash and kind into the hash state.
 *
 * @param bytes - Byte buffer.
 * @param offset - Initial offset of identifier.
 * @param currentHash - Current FNV-1a hash state.
 * @returns Tuple of next offset and updated hash.
 */
function scanIdentBytes(bytes: Uint8Array, offset: number, currentHash: number): [number, number] {
  const start = offset;
  let next = offset + 1;
  while (next < bytes.length && isAlnum(bytes[next] ?? 0)) next += 1;
  let identHash = FNV_OFFSET;
  for (let index = start; index < next; index += 1) identHash = fnvMix(identHash, bytes[index] ?? 0);
  let hash = fnvMix(currentHash, KEYWORD_HASHES.has(identHash) ? KIND_KEYWORD : KIND_IDENT);
  hash = fnvMix(hash, identHash & 0xff);
  hash = fnvMix(hash, (identHash >>> 8) & 0xff);
  hash = fnvMix(hash, (identHash >>> 16) & 0xff);
  hash = fnvMix(hash, (identHash >>> 24) & 0xff);
  return [next, hash];
}

/**
 * Scans a numeric literal and mixes its digits into the hash state.
 *
 * @param bytes - Byte buffer.
 * @param offset - Initial offset of number.
 * @param currentHash - Current FNV-1a hash state.
 * @returns Tuple of next offset and updated hash.
 */
function scanDigitBytes(bytes: Uint8Array, offset: number, currentHash: number): [number, number] {
  const start = offset;
  let next = offset + 1;
  while (next < bytes.length && isDigit(bytes[next] ?? 0)) next += 1;
  let hash = fnvMix(currentHash, KIND_NUMBER);
  for (let index = start; index < next; index += 1) hash = fnvMix(hash, bytes[index] ?? 0);
  return [next, hash];
}

/**
 * Scans a double-quoted string literal and mixes its bytes into the hash state.
 *
 * @param bytes - Byte buffer.
 * @param offset - Initial offset of opening double quote.
 * @param currentHash - Current FNV-1a hash state.
 * @returns Tuple of next offset and updated hash.
 */
function scanStringLiteralBytes(bytes: Uint8Array, offset: number, currentHash: number): [number, number] {
  const start = offset;
  let next = offset + 1;
  let terminated = false;
  while (next < bytes.length) {
    if (bytes[next] === 92) {
      next += 2;
      continue;
    }
    if (bytes[next] === 34) {
      next += 1;
      terminated = true;
      break;
    }
    next += 1;
  }
  let hash = fnvMix(currentHash, terminated ? KIND_STRING : KIND_ERROR);
  for (let index = start; index < next; index += 1) hash = fnvMix(hash, bytes[index] ?? 0);
  return [next, hash];
}

/**
 * Scans operator or punctuation symbols and updates hash state.
 *
 * @param bytes - Byte buffer.
 * @param offset - Initial offset.
 * @param byte - First byte value.
 * @param currentHash - Current FNV-1a hash state.
 * @returns Tuple of next offset and updated hash.
 */
function scanPunctOrOpBytes(bytes: Uint8Array, offset: number, byte: number, currentHash: number): [number, number] {
  if (offset + 1 < bytes.length) {
    const nextByte = bytes[offset + 1] ?? 0;
    const two = String.fromCodePoint(byte, nextByte);
    if ((TWO_CHAR_OPS as readonly string[]).includes(two)) {
      let hash = fnvMix(currentHash, KIND_OPERATOR);
      hash = fnvMix(hash, byte);
      hash = fnvMix(hash, nextByte);
      return [offset + 2, hash];
    }
  }
  const single = String.fromCodePoint(byte);
  if (ONE_CHAR_OPS.has(single)) {
    let hash = fnvMix(currentHash, KIND_OPERATOR);
    hash = fnvMix(hash, byte);
    return [offset + 1, hash];
  }
  if (PUNCT.has(single)) {
    let hash = fnvMix(currentHash, KIND_PUNCT);
    hash = fnvMix(hash, byte);
    return [offset + 1, hash];
  }
  let hash = fnvMix(currentHash, KIND_ERROR);
  hash = fnvMix(hash, byte);
  return [offset + 1, hash];
}

/**
 * Seed reference for the self-hosted lex stage.
 * Must stay behaviorally identical to {@link createFlintLexStageVmModule}.
 *
 * @param source - Flint source text.
 * @returns 32-bit signed integer fingerprint.
 */
export function computeFlintLexStageFingerprint(source: string): number {
  const bytes = encoder.encode(source);
  let hash = FNV_OFFSET;
  let offset = 0;

  while (offset < bytes.length) {
    const byte = bytes[offset] ?? 0;

    if (isWhitespace(byte)) {
      offset = skipWhitespaceBytes(bytes, offset);
      continue;
    }

    const commentEnd = scanCommentBytes(bytes, offset, byte);
    if (commentEnd !== undefined) {
      hash = fnvMix(hash, KIND_COMMENT);
      offset = commentEnd;
      continue;
    }

    if (isAlpha(byte)) {
      [offset, hash] = scanIdentBytes(bytes, offset, hash);
      continue;
    }

    if (isDigit(byte)) {
      [offset, hash] = scanDigitBytes(bytes, offset, hash);
      continue;
    }

    if (byte === 34) {
      [offset, hash] = scanStringLiteralBytes(bytes, offset, hash);
      continue;
    }

    [offset, hash] = scanPunctOrOpBytes(bytes, offset, byte, hash);
  }

  hash = fnvMix(hash, KIND_EOF);
  return toInt32(hash);
}

/** Encodes source code into the binary representation expected by the VM lexer stage. */
export function encodeFlintLexStageSource(source: string): {
  readonly kind: 'aggregate';
  readonly layout: typeof FLINT_LEX_STAGE_SOURCE_LAYOUT;
  readonly bytes: Uint8Array;
  readonly ownership: 'owned';
} {
  return {
    kind: 'aggregate',
    layout: FLINT_LEX_STAGE_SOURCE_LAYOUT,
    bytes: encoder.encode(source),
    ownership: 'owned',
  };
}

/** Fluent builder for generating self-hosted virtual machine bytecode instructions. */
export interface BytecodeBuilder {
  readonly registers: number;
  readonly code: FlintSelfHostedVmInstruction[];
  readonly labels: Map<string, number>;
  patches: { index: number; field: 'ifTrue' | 'ifFalse' | 'target'; label: string }[];
  alloc(count?: number): number;
  num(destination: number, constantIndex: number): void;
  move(destination: number, source: number): void;
  len(destination: number, source: number): void;
  byteAt(destination: number, source: number, index: number): void;
  binary(operation: string, destination: number, left: number, right: number): void;
  unary(operation: 'not' | 'neg', destination: number, operand: number): void;
  call(destination: number | undefined, functionName: string, arguments_: readonly number[]): void;
  label(name: string): void;
  jump(label: string): void;
  branch(condition: number, ifTrue: string, ifFalse: string): void;
  ret(source?: number): void;
  finish(): FlintSelfHostedVmInstruction[];
}

/** Creates a new BytecodeBuilder instance with the specified parameter count. */
export function createBuilder(parameterCount: number): BytecodeBuilder {
  let nextRegister = parameterCount;
  const code: FlintSelfHostedVmInstruction[] = [];
  const labels = new Map<string, number>();
  const patches: BytecodeBuilder['patches'] = [];

  return {
    /** Returns the maximum number of allocated virtual registers. */
    get registers() {
      return nextRegister;
    },
    code,
    labels,
    patches,
    /** Allocates a new virtual register index. */
    alloc(count = 1) {
      const start = nextRegister;
      nextRegister += count;
      return start;
    },
    /** Emits an instruction loading an immediate numeric constant into a register. */
    num(destination, constantIndex) {
      code.push({ opcode: 'const', destination, constant: constantIndex });
    },
    /** Emits a register-to-register move instruction. */
    move(destination, source) {
      code.push({ opcode: 'move', destination, source });
    },
    /** Emits an instruction retrieving the length of an aggregate or buffer. */
    len(destination, source) {
      code.push({ opcode: 'len', destination, source });
    },
    /** Emits an instruction reading a byte from an aggregate at an offset. */
    byteAt(destination, source, index) {
      code.push({ opcode: 'byte-at', destination, source, index });
    },
    /** Emits a binary arithmetic or comparison instruction. */
    binary(operation, destination, left, right) {
      code.push({ opcode: 'binary', operation, destination, left, right });
    },
    /** Emits a unary operation instruction. */
    unary(operation, destination, operand) {
      code.push({ opcode: 'unary', operation, destination, operand });
    },
    /** Emits a function call instruction passing arguments and binding result. */
    call(destination, functionName, arguments_) {
      code.push({
        opcode: 'call',
        ...(destination === undefined ? {} : { destination }),
        functionName,
        arguments: arguments_,
      });
    },
    /** Defines a jump target label in the instruction stream. */
    label(name) {
      labels.set(name, code.length);
    },
    /** Emits an unconditional jump to a label. */
    jump(label) {
      patches.push({ index: code.length, field: 'target', label });
      code.push({ opcode: 'jump', target: -1 });
    },
    /** Emits a conditional branch instruction based on a boolean register. */
    branch(condition, ifTrue, ifFalse) {
      const index = code.length;
      patches.push({ index, field: 'ifTrue', label: ifTrue }, { index, field: 'ifFalse', label: ifFalse });
      code.push({ opcode: 'branch', condition, ifTrue: -1, ifFalse: -1 });
    },
    /** Emits a return instruction returning a register value. */
    ret(source) {
      code.push(source === undefined ? { opcode: 'return' } : { opcode: 'return', source });
    },
    /** Finalizes and returns the complete bytecode instruction sequence. */
    finish() {
      for (const patch of patches) {
        const target = labels.get(patch.label);
        if (target === undefined) throw new Error(`Missing bytecode label '${patch.label}'.`);
        const instruction = code[patch.index] as {
          ifTrue?: number;
          ifFalse?: number;
          target?: number;
        };
        if (instruction === undefined) throw new Error(`Missing instruction for label patch '${patch.label}'.`);
        instruction[patch.field] = target;
      }
      return code;
    },
  };
}

/** Creates an int32 constant pool entry. */
function int32Constant(value: number): FlintSelfHostedVmValue {
  return { kind: 'number', type: 'i32', value: toInt32(value) };
}

/** Creates a word32 constant pool entry. */
function word32Constant(value: number): FlintSelfHostedVmValue {
  return { kind: 'number', type: 'i32', value: toInt32(value) };
}

/**
 * Hand-lowered VM module for the lex fingerprint stage.
 * Entry: lex_fingerprint(source: FlintSourceBytes) -> i32
 */
export function createFlintLexStageVmModule(sourceHash: string): FlintSelfHostedVmModule {
  const keywordHashes = KEYWORDS.map((keyword) => fnvText(keyword));
  const constants: FlintSelfHostedVmValue[] = [
    word32Constant(FNV_OFFSET), // 0
    int32Constant(FNV_PRIME), // 1
    int32Constant(0), // 2
    int32Constant(1), // 3
    int32Constant(2), // 4
    int32Constant(8), // 5
    int32Constant(16), // 6
    int32Constant(24), // 7
    int32Constant(0xff), // 8
    int32Constant(9), // 9 tab
    int32Constant(10), // 10 lf
    int32Constant(13), // 11 cr
    int32Constant(32), // 12 space
    int32Constant(34), // 13 quote
    int32Constant(47), // 14 slash
    int32Constant(48), // 15 '0'
    int32Constant(57), // 16 '9'
    int32Constant(65), // 17 'A'
    int32Constant(90), // 18 'Z'
    int32Constant(95), // 19 '_'
    int32Constant(97), // 20 'a'
    int32Constant(122), // 21 'z'
    int32Constant(92), // 22 backslash
    int32Constant(KIND_EOF), // 23
    int32Constant(KIND_IDENT), // 24
    int32Constant(KIND_KEYWORD), // 25
    int32Constant(KIND_NUMBER), // 26
    int32Constant(KIND_STRING), // 27
    int32Constant(KIND_OPERATOR), // 28
    int32Constant(KIND_PUNCT), // 29
    int32Constant(KIND_COMMENT), // 30
    int32Constant(KIND_ERROR), // 31
    // two-char op first/second bytes packed as pairs starting at 32
    int32Constant(33),
    int32Constant(61), // !=
    int32Constant(38),
    int32Constant(38), // &&
    int32Constant(61),
    int32Constant(61), // ==
    int32Constant(124),
    int32Constant(124), // ||
    int32Constant(60),
    int32Constant(61), // <=
    int32Constant(62),
    int32Constant(61), // >=
    int32Constant(45),
    int32Constant(62), // ->
    int32Constant(61),
    int32Constant(62), // =>
    int32Constant(58),
    int32Constant(58), // ::
    // one-char ops at 50..58
    int32Constant(33),
    int32Constant(37),
    int32Constant(42),
    int32Constant(43),
    int32Constant(45),
    int32Constant(47),
    int32Constant(60),
    int32Constant(62),
    int32Constant(61),
    // punct at 59..69
    int32Constant(123),
    int32Constant(125),
    int32Constant(40),
    int32Constant(41),
    int32Constant(91),
    int32Constant(93),
    int32Constant(58),
    int32Constant(59),
    int32Constant(44),
    int32Constant(124),
    int32Constant(46),
    // keyword hashes at 70..
    ...keywordHashes.map((hash) => word32Constant(hash)),
    int32Constant(42), // block-comment '*'
  ];

  const keywordConstantBase = 70;
  const blockCommentStarConstant = keywordConstantBase + keywordHashes.length;

  const fnvMixFunction = buildFnvMix();
  const isWsFunction = buildIsWs();
  const isAlphaFunction = buildIsAlpha();
  const isDigitFunction = buildIsDigit();
  const isAlnumFunction = buildIsAlnum();
  const isKeywordFunction = buildIsKeyword(keywordConstantBase, keywordHashes.length);
  const isTwoCharOpFunction = buildIsTwoCharOp();
  const isOneCharOpFunction = buildIsOneCharOp();
  const isPunctFunction = buildIsPunct();
  const lexFunction = buildLexFingerprint(blockCommentStarConstant);

  const sourceLayout: FlintAggregateLayout = {
    name: FLINT_LEX_STAGE_SOURCE_LAYOUT,
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
    functions: [
      fnvMixFunction,
      isWsFunction,
      isAlphaFunction,
      isDigitFunction,
      isAlnumFunction,
      isKeywordFunction,
      isTwoCharOpFunction,
      isOneCharOpFunction,
      isPunctFunction,
      lexFunction,
    ],
    constants,
    aggregateLayouts: [sourceLayout],
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

/** Builds the VM function for FNV-1a hash word mixing. */
function buildFnvMix(): FlintSelfHostedVmFunction {
  // fnv_mix(hash, byte) -> i32
  const b = createBuilder(2);
  const xored = b.alloc();
  const prime = b.alloc();
  const mixed = b.alloc();
  b.binary('^', xored, 0, 1);
  b.num(prime, 1);
  b.binary('*', mixed, xored, prime);
  b.ret(mixed);
  const code = b.finish();
  return {
    name: 'fnv_mix',
    parameters: ['i32', 'i32'],
    result: 'i32',
    registers: b.registers,
    code,
    debugSpans: [],
  };
}

/** Builds a jump-table equality predicate VM function for a set of constant values. */
function buildPredicateFromEquals(name: string, constantIndexes: readonly number[]): FlintSelfHostedVmFunction {
  const b = createBuilder(1);
  const temporary = b.alloc();
  const c = b.alloc();
  let next = 'c0';
  for (const [index, constantIndex] of constantIndexes.entries()) {
    b.label(next);
    b.num(c, constantIndex);
    b.binary('==', temporary, 0, c);
    const yes = 'yes';
    next = index === constantIndexes.length - 1 ? 'no' : `c${String(index + 1)}`;
    b.branch(temporary, yes, next);
  }
  b.label('yes');
  // true
  b.num(c, 2);
  b.num(temporary, 2);
  b.binary('==', temporary, c, temporary); // 0 == 0 => true
  b.ret(temporary);
  b.label('no');
  b.num(c, 2);
  b.num(temporary, 3);
  b.binary('==', temporary, c, temporary); // 0 == 1 => false
  b.ret(temporary);
  const code = b.finish();
  return {
    name,
    parameters: ['i32'],
    result: 'bool',
    registers: b.registers,
    code,
    debugSpans: [],
  };
}

/** Builds a predicate testing if a byte matches fixed ASCII whitespace characters. */
function buildIsWsFixed(): FlintSelfHostedVmFunction {
  return buildPredicateFromEquals('is_ws', [9, 10, 11, 12]);
}

/** Builds the VM predicate function for whitespace detection. */
function buildIsWs(): FlintSelfHostedVmFunction {
  return buildIsWsFixed();
}

/** Builds the VM predicate function for ASCII alphabetic detection. */
function buildIsAlpha(): FlintSelfHostedVmFunction {
  // (b >= 'A' && b <= 'Z') || (b >= 'a' && b <= 'z') || b == '_'
  const b = createBuilder(1);
  const temporary = b.alloc();
  const lo = b.alloc();
  const hi = b.alloc();
  const t1 = b.alloc();
  const t2 = b.alloc();

  b.num(lo, 17); // A
  b.num(hi, 18); // Z
  b.binary('>=', t1, 0, lo);
  b.binary('<=', t2, 0, hi);
  b.binary('&&', temporary, t1, t2);
  b.branch(temporary, 'yes', 'lower');

  b.label('lower');
  b.num(lo, 20); // a
  b.num(hi, 21); // z
  b.binary('>=', t1, 0, lo);
  b.binary('<=', t2, 0, hi);
  b.binary('&&', temporary, t1, t2);
  b.branch(temporary, 'yes', 'under');

  b.label('under');
  b.num(lo, 19); // _
  b.binary('==', temporary, 0, lo);
  b.branch(temporary, 'yes', 'no');

  b.label('yes');
  b.num(lo, 2);
  b.num(temporary, 2);
  b.binary('==', temporary, lo, temporary);
  b.ret(temporary);
  b.label('no');
  b.num(lo, 2);
  b.num(temporary, 3);
  b.binary('==', temporary, lo, temporary);
  b.ret(temporary);

  const code = b.finish();
  return {
    name: 'is_alpha',
    parameters: ['i32'],
    result: 'bool',
    registers: b.registers,
    code,
    debugSpans: [],
  };
}

/** Builds the VM predicate function for ASCII decimal digit detection. */
function buildIsDigit(): FlintSelfHostedVmFunction {
  const b = createBuilder(1);
  const temporary = b.alloc();
  const lo = b.alloc();
  const hi = b.alloc();
  const t1 = b.alloc();
  const t2 = b.alloc();
  b.num(lo, 15);
  b.num(hi, 16);
  b.binary('>=', t1, 0, lo);
  b.binary('<=', t2, 0, hi);
  b.binary('&&', temporary, t1, t2);
  b.ret(temporary);
  const code = b.finish();
  return {
    name: 'is_digit',
    parameters: ['i32'],
    result: 'bool',
    registers: b.registers,
    code,
    debugSpans: [],
  };
}

/** Builds the VM predicate function for alphanumeric character detection. */
function buildIsAlnum(): FlintSelfHostedVmFunction {
  const b = createBuilder(1);
  const temporary = b.alloc();
  const other = b.alloc();
  b.call(temporary, 'is_alpha', [0]);
  b.branch(temporary, 'yes', 'digit');
  b.label('digit');
  b.call(other, 'is_digit', [0]);
  b.ret(other);
  b.label('yes');
  b.num(temporary, 2);
  b.num(other, 2);
  b.binary('==', temporary, temporary, other);
  b.ret(temporary);
  const code = b.finish();
  return {
    name: 'is_alnum',
    parameters: ['i32'],
    result: 'bool',
    registers: b.registers,
    code,
    debugSpans: [],
  };
}

/** Builds the VM predicate function for reserved keyword detection. */
function buildIsKeyword(base: number, count: number): FlintSelfHostedVmFunction {
  const indexes = Array.from({ length: count }, (_, index) => base + index);
  return buildPredicateFromEquals('is_keyword', indexes);
}

/** Builds the VM predicate function for two-character operator detection. */
function buildIsTwoCharOp(): FlintSelfHostedVmFunction {
  // is_two_char_op(first, second) -> bool
  const pairs = [
    [32, 33],
    [34, 35],
    [36, 37],
    [38, 39],
    [40, 41],
    [42, 43],
    [44, 45],
    [46, 47],
    [48, 49],
  ] as const;
  const b = createBuilder(2);
  const temporary = b.alloc();
  const c1 = b.alloc();
  const c2 = b.alloc();
  const t1 = b.alloc();
  const t2 = b.alloc();
  let next = 'p0';
  for (const [index, [left, right]] of pairs.entries()) {
    b.label(next);
    b.num(c1, left);
    b.num(c2, right);
    b.binary('==', t1, 0, c1);
    b.binary('==', t2, 1, c2);
    b.binary('&&', temporary, t1, t2);
    next = index === pairs.length - 1 ? 'no' : `p${String(index + 1)}`;
    b.branch(temporary, 'yes', next);
  }
  b.label('yes');
  b.num(c1, 2);
  b.num(temporary, 2);
  b.binary('==', temporary, c1, temporary);
  b.ret(temporary);
  b.label('no');
  b.num(c1, 2);
  b.num(temporary, 3);
  b.binary('==', temporary, c1, temporary);
  b.ret(temporary);
  const code = b.finish();
  return {
    name: 'is_two_char_op',
    parameters: ['i32', 'i32'],
    result: 'bool',
    registers: b.registers,
    code,
    debugSpans: [],
  };
}

/** Builds the VM predicate function for single-character operator detection. */
function buildIsOneCharOp(): FlintSelfHostedVmFunction {
  return buildPredicateFromEquals('is_one_char_op', [50, 51, 52, 53, 54, 55, 56, 57, 58]);
}

/** Builds the VM predicate function for punctuation symbol detection. */
function buildIsPunct(): FlintSelfHostedVmFunction {
  return buildPredicateFromEquals('is_punct', [59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69]);
}

/** Builds the complete VM lexer fingerprinting bytecode function. */
function buildLexFingerprint(blockCommentStarConstant: number): FlintSelfHostedVmFunction {
  // lex_fingerprint(source: aggregate) -> i32
  // registers: 0 = source
  const b = createBuilder(1);
  const hash = b.alloc(); // 1
  const length = b.alloc(); // 2
  const offset = b.alloc(); // 3
  const byte = b.alloc(); // 4
  const temporary = b.alloc(); // 5
  const temporary2 = b.alloc(); // 6
  const start = b.alloc(); // 7
  const identHash = b.alloc(); // 8
  const one = b.alloc(); // 9
  const zero = b.alloc(); // 10
  const kind = b.alloc(); // 11
  const nextByte = b.alloc(); // 12
  const shifted = b.alloc(); // 13
  const mask = b.alloc(); // 14
  const cond = b.alloc(); // 15

  b.num(hash, 0); // FNV offset
  b.len(length, 0);
  b.num(offset, 2); // 0
  b.num(one, 3); // 1
  b.num(zero, 2); // 0
  b.num(mask, 8); // 0xff

  b.label('loop');
  b.binary('<', cond, offset, length);
  b.branch(cond, 'body', 'done');

  b.label('body');
  b.byteAt(byte, 0, offset);

  // whitespace
  b.call(cond, 'is_ws', [byte]);
  b.branch(cond, 'ws', 'comment');

  b.label('ws');
  b.binary('+', offset, offset, one);
  b.label('ws_loop');
  b.binary('<', cond, offset, length);
  b.branch(cond, 'ws_check', 'loop');
  b.label('ws_check');
  b.byteAt(byte, 0, offset);
  b.call(cond, 'is_ws', [byte]);
  b.branch(cond, 'ws_advance', 'loop');
  b.label('ws_advance');
  b.binary('+', offset, offset, one);
  b.jump('ws_loop');

  // // and /* */ comments
  b.label('comment');
  b.num(temporary, 14); // '/'
  b.binary('==', cond, byte, temporary);
  b.branch(cond, 'comment_second', 'ident');
  b.label('comment_second');
  b.binary('+', temporary2, offset, one);
  b.binary('<', cond, temporary2, length);
  b.branch(cond, 'comment_load', 'ident');
  b.label('comment_load');
  b.byteAt(nextByte, 0, temporary2);
  b.binary('==', cond, nextByte, temporary);
  b.branch(cond, 'line_comment_body', 'block_comment_start');
  b.label('block_comment_start');
  b.num(temporary, blockCommentStarConstant);
  b.binary('==', cond, nextByte, temporary);
  b.branch(cond, 'block_comment_body', 'ident');

  b.label('line_comment_body');
  b.binary('+', offset, offset, one);
  b.binary('+', offset, offset, one);
  b.label('comment_loop');
  b.binary('<', cond, offset, length);
  b.branch(cond, 'comment_check', 'comment_mix');
  b.label('comment_check');
  b.byteAt(byte, 0, offset);
  b.num(temporary, 10); // lf
  b.binary('==', cond, byte, temporary);
  b.branch(cond, 'comment_mix', 'comment_advance');
  b.label('comment_advance');
  b.binary('+', offset, offset, one);
  b.jump('comment_loop');
  b.label('comment_mix');
  b.num(kind, 30); // KIND_COMMENT
  b.call(hash, 'fnv_mix', [hash, kind]);
  b.jump('loop');

  b.label('block_comment_body');
  b.binary('+', offset, offset, one);
  b.binary('+', offset, offset, one);
  b.label('block_comment_loop');
  b.binary('<', cond, offset, length);
  b.branch(cond, 'block_comment_check', 'block_comment_mix');
  b.label('block_comment_check');
  b.byteAt(byte, 0, offset);
  b.num(temporary, blockCommentStarConstant);
  b.binary('==', cond, byte, temporary);
  b.branch(cond, 'block_comment_star', 'block_comment_advance');
  b.label('block_comment_star');
  b.binary('+', temporary2, offset, one);
  b.binary('<', cond, temporary2, length);
  b.branch(cond, 'block_comment_close_check', 'block_comment_advance');
  b.label('block_comment_close_check');
  b.byteAt(nextByte, 0, temporary2);
  b.num(temporary, 14); // '/'
  b.binary('==', cond, nextByte, temporary);
  b.branch(cond, 'block_comment_mix', 'block_comment_advance');
  b.label('block_comment_advance');
  b.binary('+', offset, offset, one);
  b.jump('block_comment_loop');
  b.label('block_comment_mix');
  b.binary('+', offset, offset, one);
  b.binary('+', offset, offset, one);
  b.num(kind, 30); // KIND_COMMENT
  b.call(hash, 'fnv_mix', [hash, kind]);
  b.jump('loop');

  // identifier / keyword
  b.label('ident');
  b.call(cond, 'is_alpha', [byte]);
  b.branch(cond, 'ident_body', 'number');
  b.label('ident_body');
  b.move(start, offset);
  b.binary('+', offset, offset, one);
  b.label('ident_loop');
  b.binary('<', cond, offset, length);
  b.branch(cond, 'ident_check', 'ident_finish');
  b.label('ident_check');
  b.byteAt(byte, 0, offset);
  b.call(cond, 'is_alnum', [byte]);
  b.branch(cond, 'ident_advance', 'ident_finish');
  b.label('ident_advance');
  b.binary('+', offset, offset, one);
  b.jump('ident_loop');
  b.label('ident_finish');
  b.num(identHash, 0); // FNV offset
  b.move(temporary, start);
  b.label('ident_hash_loop');
  b.binary('<', cond, temporary, offset);
  b.branch(cond, 'ident_hash_body', 'ident_kind');
  b.label('ident_hash_body');
  b.byteAt(byte, 0, temporary);
  b.call(identHash, 'fnv_mix', [identHash, byte]);
  b.binary('+', temporary, temporary, one);
  b.jump('ident_hash_loop');
  b.label('ident_kind');
  b.call(cond, 'is_keyword', [identHash]);
  b.branch(cond, 'ident_kw', 'ident_id');
  b.label('ident_kw');
  b.num(kind, 25);
  b.jump('ident_mix');
  b.label('ident_id');
  b.num(kind, 24);
  b.label('ident_mix');
  b.call(hash, 'fnv_mix', [hash, kind]);
  // mix 4 bytes of identHash
  b.binary('&', temporary, identHash, mask);
  b.call(hash, 'fnv_mix', [hash, temporary]);
  b.num(temporary2, 5); // 8
  b.binary('>>', shifted, identHash, temporary2);
  b.binary('&', temporary, shifted, mask);
  b.call(hash, 'fnv_mix', [hash, temporary]);
  b.num(temporary2, 6); // 16
  b.binary('>>', shifted, identHash, temporary2);
  b.binary('&', temporary, shifted, mask);
  b.call(hash, 'fnv_mix', [hash, temporary]);
  b.num(temporary2, 7); // 24
  b.binary('>>', shifted, identHash, temporary2);
  b.binary('&', temporary, shifted, mask);
  b.call(hash, 'fnv_mix', [hash, temporary]);
  b.jump('loop');

  // number
  b.label('number');
  b.call(cond, 'is_digit', [byte]);
  b.branch(cond, 'number_body', 'string');
  b.label('number_body');
  b.move(start, offset);
  b.binary('+', offset, offset, one);
  b.label('number_loop');
  b.binary('<', cond, offset, length);
  b.branch(cond, 'number_check', 'number_mix');
  b.label('number_check');
  b.byteAt(byte, 0, offset);
  b.call(cond, 'is_digit', [byte]);
  b.branch(cond, 'number_advance', 'number_mix');
  b.label('number_advance');
  b.binary('+', offset, offset, one);
  b.jump('number_loop');
  b.label('number_mix');
  b.num(kind, 26);
  b.call(hash, 'fnv_mix', [hash, kind]);
  b.move(temporary, start);
  b.label('number_hash_loop');
  b.binary('<', cond, temporary, offset);
  b.branch(cond, 'number_hash_body', 'loop');
  b.label('number_hash_body');
  b.byteAt(byte, 0, temporary);
  b.call(hash, 'fnv_mix', [hash, byte]);
  b.binary('+', temporary, temporary, one);
  b.jump('number_hash_loop');

  // string
  b.label('string');
  b.num(temporary, 13); // quote
  b.binary('==', cond, byte, temporary);
  b.branch(cond, 'string_body', 'two_char');
  b.label('string_body');
  b.move(start, offset);
  b.binary('+', offset, offset, one);
  b.num(temporary2, 2); // terminated = 0 (false-ish, use flag)
  // use temporary2 as terminated flag: 0 = false, 1 = true
  b.label('string_loop');
  b.binary('<', cond, offset, length);
  b.branch(cond, 'string_check', 'string_mix');
  b.label('string_check');
  b.byteAt(byte, 0, offset);
  b.num(temporary, 22); // backslash
  b.binary('==', cond, byte, temporary);
  b.branch(cond, 'string_escape', 'string_quote');
  b.label('string_escape');
  b.binary('+', offset, offset, one);
  b.binary('+', offset, offset, one);
  b.jump('string_loop');
  b.label('string_quote');
  b.num(temporary, 13);
  b.binary('==', cond, byte, temporary);
  b.branch(cond, 'string_end', 'string_advance');
  b.label('string_end');
  b.binary('+', offset, offset, one);
  b.num(temporary2, 3); // terminated = 1
  b.jump('string_mix');
  b.label('string_advance');
  b.binary('+', offset, offset, one);
  b.jump('string_loop');
  b.label('string_mix');
  b.num(temporary, 3); // 1
  b.binary('==', cond, temporary2, temporary);
  b.branch(cond, 'string_ok', 'string_err');
  b.label('string_ok');
  b.num(kind, 27);
  b.jump('string_hash');
  b.label('string_err');
  b.num(kind, 31);
  b.label('string_hash');
  b.call(hash, 'fnv_mix', [hash, kind]);
  b.move(temporary, start);
  b.label('string_hash_loop');
  b.binary('<', cond, temporary, offset);
  b.branch(cond, 'string_hash_body', 'loop');
  b.label('string_hash_body');
  b.byteAt(byte, 0, temporary);
  b.call(hash, 'fnv_mix', [hash, byte]);
  b.binary('+', temporary, temporary, one);
  b.jump('string_hash_loop');

  // two-char operator
  b.label('two_char');
  b.binary('+', temporary2, offset, one);
  b.binary('<', cond, temporary2, length);
  b.branch(cond, 'two_char_load', 'one_char');
  b.label('two_char_load');
  b.byteAt(nextByte, 0, temporary2);
  b.call(cond, 'is_two_char_op', [byte, nextByte]);
  b.branch(cond, 'two_char_mix', 'one_char');
  b.label('two_char_mix');
  b.num(kind, 28);
  b.call(hash, 'fnv_mix', [hash, kind]);
  b.call(hash, 'fnv_mix', [hash, byte]);
  b.call(hash, 'fnv_mix', [hash, nextByte]);
  b.binary('+', offset, offset, one);
  b.binary('+', offset, offset, one);
  b.jump('loop');

  // one-char operator
  b.label('one_char');
  b.call(cond, 'is_one_char_op', [byte]);
  b.branch(cond, 'one_char_mix', 'punct');
  b.label('one_char_mix');
  b.num(kind, 28);
  b.call(hash, 'fnv_mix', [hash, kind]);
  b.call(hash, 'fnv_mix', [hash, byte]);
  b.binary('+', offset, offset, one);
  b.jump('loop');

  // punctuation
  b.label('punct');
  b.call(cond, 'is_punct', [byte]);
  b.branch(cond, 'punct_mix', 'error');
  b.label('punct_mix');
  b.num(kind, 29);
  b.call(hash, 'fnv_mix', [hash, kind]);
  b.call(hash, 'fnv_mix', [hash, byte]);
  b.binary('+', offset, offset, one);
  b.jump('loop');

  // error / other
  b.label('error');
  b.num(kind, 31);
  b.call(hash, 'fnv_mix', [hash, kind]);
  b.call(hash, 'fnv_mix', [hash, byte]);
  b.binary('+', offset, offset, one);
  b.jump('loop');

  b.label('done');
  b.num(kind, 23); // EOF
  b.call(hash, 'fnv_mix', [hash, kind]);
  b.ret(hash);

  const code = b.finish();
  return {
    name: FLINT_LEX_STAGE_ENTRY,
    parameters: [FLINT_LEX_STAGE_SOURCE_LAYOUT],
    result: 'i32',
    registers: b.registers,
    code,
    debugSpans: [],
  };
}
