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
// skipcq: JS-R1005
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
// skipcq: JS-R1005
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
// skipcq: JS-R1005
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
// skipcq: JS-R1005
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
// skipcq: JS-R1005
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
  invoke(destination: number | undefined, functionName: string, arguments_: readonly number[]): void;
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
    invoke(destination, functionName, arguments_) {
      code.push({
        opcode: 'call',
        ...(destination === undefined ? {} : { destination }),
        functionName,
        arguments: arguments_,
      });
    },
    /** Emits a function call instruction passing arguments and binding result (alias for invoke). */
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
  // skipcq: JS-C1002
  // fnv_mix(hash, byte) -> i32
  const builder = createBuilder(2);
  const xored = builder.alloc();
  const prime = builder.alloc();
  const mixed = builder.alloc();
  builder.binary('^', xored, 0, 1);
  builder.num(prime, 1);
  builder.binary('*', mixed, xored, prime);
  builder.ret(mixed);
  const code = builder.finish();
  return {
    name: 'fnv_mix',
    parameters: ['i32', 'i32'],
    result: 'i32',
    registers: builder.registers,
    code,
    debugSpans: [],
  };
}

/** Builds a jump-table equality predicate VM function for a set of constant values. */
// skipcq: JS-C1002
function buildPredicateFromEquals(name: string, constantIndexes: readonly number[]): FlintSelfHostedVmFunction {
  const builder = createBuilder(1);
  // skipcq: JS-C1002
  const temporary = builder.alloc();
  const constantRegister = builder.alloc();
  let next = 'c0';
  for (const [index, constantIndex] of constantIndexes.entries()) {
    builder.label(next);
    builder.num(constantRegister, constantIndex);
    builder.binary('==', temporary, 0, constantRegister);
    const yes = 'yes';
    next = index === constantIndexes.length - 1 ? 'no' : `c${String(index + 1)}`;
    builder.branch(temporary, yes, next);
  }
  builder.label('yes');
  // true
  builder.num(constantRegister, 2);
  builder.num(temporary, 2);
  builder.binary('==', temporary, constantRegister, temporary); // 0 == 0 => true
  builder.ret(temporary);
  builder.label('no');
  builder.num(constantRegister, 2);
  builder.num(temporary, 3);
  builder.binary('==', temporary, constantRegister, temporary); // 0 == 1 => false
  builder.ret(temporary);
  const code = builder.finish();
  return {
    name,
    parameters: ['i32'],
    result: 'bool',
    registers: builder.registers,
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
  // skipcq: JS-C1002
  // (b >= 'A' && b <= 'Z') || (b >= 'a' && b <= 'z') || b == '_'
  const builder = createBuilder(1);
  const temporary = builder.alloc();
  const lo = builder.alloc();
  const hi = builder.alloc();
  const t1 = builder.alloc();
  const t2 = builder.alloc();

  builder.num(lo, 17); // A
  builder.num(hi, 18); // Z
  builder.binary('>=', t1, 0, lo);
  builder.binary('<=', t2, 0, hi);
  builder.binary('&&', temporary, t1, t2);
  builder.branch(temporary, 'yes', 'lower');

  builder.label('lower');
  builder.num(lo, 20); // a
  builder.num(hi, 21); // z
  builder.binary('>=', t1, 0, lo);
  builder.binary('<=', t2, 0, hi);
  builder.binary('&&', temporary, t1, t2);
  builder.branch(temporary, 'yes', 'under');

  builder.label('under');
  builder.num(lo, 19); // _
  builder.binary('==', temporary, 0, lo);
  builder.branch(temporary, 'yes', 'no');

  builder.label('yes');
  builder.num(lo, 2);
  builder.num(temporary, 2);
  builder.binary('==', temporary, lo, temporary);
  builder.ret(temporary);
  builder.label('no');
  builder.num(lo, 2);
  builder.num(temporary, 3);
  builder.binary('==', temporary, lo, temporary);
  builder.ret(temporary);

  const code = builder.finish();
  return {
    name: 'is_alpha',
    parameters: ['i32'],
    result: 'bool',
    registers: builder.registers,
    code,
    debugSpans: [],
  };
}

/** Builds the VM predicate function for ASCII decimal digit detection. */
// skipcq: JS-C1002
function buildIsDigit(): FlintSelfHostedVmFunction {
  const builder = createBuilder(1);
  const temporary = builder.alloc();
  const lo = builder.alloc();
  const hi = builder.alloc();
  const t1 = builder.alloc();
  const t2 = builder.alloc();
  builder.num(lo, 15);
  builder.num(hi, 16);
  builder.binary('>=', t1, 0, lo);
  builder.binary('<=', t2, 0, hi);
  builder.binary('&&', temporary, t1, t2);
  builder.ret(temporary);
  const code = builder.finish();
  return {
    name: 'is_digit',
    parameters: ['i32'],
    result: 'bool',
    registers: builder.registers,
    code,
    debugSpans: [],
  };
}

/** Builds the VM predicate function for alphanumeric character detection. */
// skipcq: JS-C1002
function buildIsAlnum(): FlintSelfHostedVmFunction {
  const builder = createBuilder(1);
  const temporary = builder.alloc();
  const other = builder.alloc();
  builder.call(temporary, 'is_alpha', [0]);
  builder.branch(temporary, 'yes', 'digit');
  builder.label('digit');
  builder.call(other, 'is_digit', [0]);
  builder.ret(other);
  builder.label('yes');
  builder.num(temporary, 2);
  builder.num(other, 2);
  builder.binary('==', temporary, temporary, other);
  builder.ret(temporary);
  const code = builder.finish();
  return {
    name: 'is_alnum',
    parameters: ['i32'],
    result: 'bool',
    registers: builder.registers,
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
  const builder = createBuilder(2);
  // skipcq: JS-C1002
  const temporary = builder.alloc();
  const c1 = builder.alloc();
  const c2 = builder.alloc();
  const t1 = builder.alloc();
  const t2 = builder.alloc();
  let next = 'p0';
  for (const [index, [left, right]] of pairs.entries()) {
    builder.label(next);
    builder.num(c1, left);
    builder.num(c2, right);
    builder.binary('==', t1, 0, c1);
    builder.binary('==', t2, 1, c2);
    builder.binary('&&', temporary, t1, t2);
    next = index === pairs.length - 1 ? 'no' : `p${String(index + 1)}`;
    builder.branch(temporary, 'yes', next);
  }
  builder.label('yes');
  builder.num(c1, 2);
  builder.num(temporary, 2);
  builder.binary('==', temporary, c1, temporary);
  builder.ret(temporary);
  builder.label('no');
  builder.num(c1, 2);
  builder.num(temporary, 3);
  builder.binary('==', temporary, c1, temporary);
  builder.ret(temporary);
  const code = builder.finish();
  return {
    name: 'is_two_char_op',
    parameters: ['i32', 'i32'],
    result: 'bool',
    registers: builder.registers,
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
  const builder = createBuilder(1);
  // skipcq: JS-C1002
  const hash = builder.alloc(); // 1
  const length = builder.alloc(); // 2
  const offset = builder.alloc(); // 3
  const byte = builder.alloc(); // 4
  const temporary = builder.alloc(); // 5
  const temporary2 = builder.alloc(); // 6
  const start = builder.alloc(); // 7
  const identHash = builder.alloc(); // 8
  const one = builder.alloc(); // 9
  const zero = builder.alloc(); // 10
  const kind = builder.alloc(); // 11
  const nextByte = builder.alloc(); // 12
  const shifted = builder.alloc(); // 13
  const mask = builder.alloc(); // 14
  const cond = builder.alloc(); // 15

  builder.num(hash, 0); // FNV offset
  builder.len(length, 0);
  builder.num(offset, 2); // 0
  builder.num(one, 3); // 1
  builder.num(zero, 2); // 0
  builder.num(mask, 8); // 0xff

  builder.label('loop');
  builder.binary('<', cond, offset, length);
  builder.branch(cond, 'body', 'done');

  builder.label('body');
  builder.byteAt(byte, 0, offset);

  // whitespace
  builder.call(cond, 'is_ws', [byte]);
  builder.branch(cond, 'ws', 'comment');

  builder.label('ws');
  builder.binary('+', offset, offset, one);
  builder.label('ws_loop');
  builder.binary('<', cond, offset, length);
  builder.branch(cond, 'ws_check', 'loop');
  builder.label('ws_check');
  builder.byteAt(byte, 0, offset);
  builder.call(cond, 'is_ws', [byte]);
  builder.branch(cond, 'ws_advance', 'loop');
  builder.label('ws_advance');
  builder.binary('+', offset, offset, one);
  builder.jump('ws_loop');

  // // and /* */ comments
  builder.label('comment');
  builder.num(temporary, 14); // '/'
  builder.binary('==', cond, byte, temporary);
  builder.branch(cond, 'comment_second', 'ident');
  builder.label('comment_second');
  builder.binary('+', temporary2, offset, one);
  builder.binary('<', cond, temporary2, length);
  builder.branch(cond, 'comment_load', 'ident');
  builder.label('comment_load');
  builder.byteAt(nextByte, 0, temporary2);
  builder.binary('==', cond, nextByte, temporary);
  builder.branch(cond, 'line_comment_body', 'block_comment_start');
  builder.label('block_comment_start');
  builder.num(temporary, blockCommentStarConstant);
  builder.binary('==', cond, nextByte, temporary);
  builder.branch(cond, 'block_comment_body', 'ident');

  builder.label('line_comment_body');
  builder.binary('+', offset, offset, one);
  builder.binary('+', offset, offset, one);
  builder.label('comment_loop');
  builder.binary('<', cond, offset, length);
  builder.branch(cond, 'comment_check', 'comment_mix');
  builder.label('comment_check');
  builder.byteAt(byte, 0, offset);
  builder.num(temporary, 10); // lf
  builder.binary('==', cond, byte, temporary);
  builder.branch(cond, 'comment_mix', 'comment_advance');
  builder.label('comment_advance');
  builder.binary('+', offset, offset, one);
  builder.jump('comment_loop');
  builder.label('comment_mix');
  builder.num(kind, 30); // KIND_COMMENT
  builder.call(hash, 'fnv_mix', [hash, kind]);
  builder.jump('loop');

  builder.label('block_comment_body');
  builder.binary('+', offset, offset, one);
  builder.binary('+', offset, offset, one);
  builder.label('block_comment_loop');
  builder.binary('<', cond, offset, length);
  builder.branch(cond, 'block_comment_check', 'block_comment_mix');
  builder.label('block_comment_check');
  builder.byteAt(byte, 0, offset);
  builder.num(temporary, blockCommentStarConstant);
  builder.binary('==', cond, byte, temporary);
  builder.branch(cond, 'block_comment_star', 'block_comment_advance');
  builder.label('block_comment_star');
  builder.binary('+', temporary2, offset, one);
  builder.binary('<', cond, temporary2, length);
  builder.branch(cond, 'block_comment_close_check', 'block_comment_advance');
  builder.label('block_comment_close_check');
  builder.byteAt(nextByte, 0, temporary2);
  builder.num(temporary, 14); // '/'
  builder.binary('==', cond, nextByte, temporary);
  builder.branch(cond, 'block_comment_mix', 'block_comment_advance');
  builder.label('block_comment_advance');
  builder.binary('+', offset, offset, one);
  builder.jump('block_comment_loop');
  builder.label('block_comment_mix');
  builder.binary('+', offset, offset, one);
  builder.binary('+', offset, offset, one);
  builder.num(kind, 30); // KIND_COMMENT
  builder.call(hash, 'fnv_mix', [hash, kind]);
  builder.jump('loop');

  // identifier / keyword
  builder.label('ident');
  builder.call(cond, 'is_alpha', [byte]);
  builder.branch(cond, 'ident_body', 'number');
  builder.label('ident_body');
  builder.move(start, offset);
  builder.binary('+', offset, offset, one);
  builder.label('ident_loop');
  builder.binary('<', cond, offset, length);
  builder.branch(cond, 'ident_check', 'ident_finish');
  builder.label('ident_check');
  builder.byteAt(byte, 0, offset);
  builder.call(cond, 'is_alnum', [byte]);
  builder.branch(cond, 'ident_advance', 'ident_finish');
  builder.label('ident_advance');
  builder.binary('+', offset, offset, one);
  builder.jump('ident_loop');
  builder.label('ident_finish');
  builder.num(identHash, 0); // FNV offset
  builder.move(temporary, start);
  builder.label('ident_hash_loop');
  builder.binary('<', cond, temporary, offset);
  builder.branch(cond, 'ident_hash_body', 'ident_kind');
  builder.label('ident_hash_body');
  builder.byteAt(byte, 0, temporary);
  builder.call(identHash, 'fnv_mix', [identHash, byte]);
  builder.binary('+', temporary, temporary, one);
  builder.jump('ident_hash_loop');
  builder.label('ident_kind');
  builder.call(cond, 'is_keyword', [identHash]);
  builder.branch(cond, 'ident_kw', 'ident_id');
  builder.label('ident_kw');
  builder.num(kind, 25);
  builder.jump('ident_mix');
  builder.label('ident_id');
  builder.num(kind, 24);
  builder.label('ident_mix');
  builder.call(hash, 'fnv_mix', [hash, kind]);
  // mix 4 bytes of identHash
  builder.binary('&', temporary, identHash, mask);
  builder.call(hash, 'fnv_mix', [hash, temporary]);
  builder.num(temporary2, 5); // 8
  builder.binary('>>', shifted, identHash, temporary2);
  builder.binary('&', temporary, shifted, mask);
  builder.call(hash, 'fnv_mix', [hash, temporary]);
  builder.num(temporary2, 6); // 16
  builder.binary('>>', shifted, identHash, temporary2);
  builder.binary('&', temporary, shifted, mask);
  builder.call(hash, 'fnv_mix', [hash, temporary]);
  builder.num(temporary2, 7); // 24
  builder.binary('>>', shifted, identHash, temporary2);
  builder.binary('&', temporary, shifted, mask);
  builder.call(hash, 'fnv_mix', [hash, temporary]);
  builder.jump('loop');

  // number
  builder.label('number');
  builder.call(cond, 'is_digit', [byte]);
  builder.branch(cond, 'number_body', 'string');
  builder.label('number_body');
  builder.move(start, offset);
  builder.binary('+', offset, offset, one);
  builder.label('number_loop');
  builder.binary('<', cond, offset, length);
  builder.branch(cond, 'number_check', 'number_mix');
  builder.label('number_check');
  builder.byteAt(byte, 0, offset);
  builder.call(cond, 'is_digit', [byte]);
  builder.branch(cond, 'number_advance', 'number_mix');
  builder.label('number_advance');
  builder.binary('+', offset, offset, one);
  builder.jump('number_loop');
  builder.label('number_mix');
  builder.num(kind, 26);
  builder.call(hash, 'fnv_mix', [hash, kind]);
  builder.move(temporary, start);
  builder.label('number_hash_loop');
  builder.binary('<', cond, temporary, offset);
  builder.branch(cond, 'number_hash_body', 'loop');
  builder.label('number_hash_body');
  builder.byteAt(byte, 0, temporary);
  builder.call(hash, 'fnv_mix', [hash, byte]);
  builder.binary('+', temporary, temporary, one);
  builder.jump('number_hash_loop');

  // string
  builder.label('string');
  builder.num(temporary, 13); // quote
  builder.binary('==', cond, byte, temporary);
  builder.branch(cond, 'string_body', 'two_char');
  builder.label('string_body');
  builder.move(start, offset);
  builder.binary('+', offset, offset, one);
  builder.num(temporary2, 2); // terminated = 0 (false-ish, use flag)
  // use temporary2 as terminated flag: 0 = false, 1 = true
  builder.label('string_loop');
  builder.binary('<', cond, offset, length);
  builder.branch(cond, 'string_check', 'string_mix');
  builder.label('string_check');
  builder.byteAt(byte, 0, offset);
  builder.num(temporary, 22); // backslash
  builder.binary('==', cond, byte, temporary);
  builder.branch(cond, 'string_escape', 'string_quote');
  builder.label('string_escape');
  builder.binary('+', offset, offset, one);
  builder.binary('+', offset, offset, one);
  builder.jump('string_loop');
  builder.label('string_quote');
  builder.num(temporary, 13);
  builder.binary('==', cond, byte, temporary);
  builder.branch(cond, 'string_end', 'string_advance');
  builder.label('string_end');
  builder.binary('+', offset, offset, one);
  builder.num(temporary2, 3); // terminated = 1
  builder.jump('string_mix');
  builder.label('string_advance');
  builder.binary('+', offset, offset, one);
  builder.jump('string_loop');
  builder.label('string_mix');
  builder.num(temporary, 3); // 1
  builder.binary('==', cond, temporary2, temporary);
  builder.branch(cond, 'string_ok', 'string_err');
  builder.label('string_ok');
  builder.num(kind, 27);
  builder.jump('string_hash');
  builder.label('string_err');
  builder.num(kind, 31);
  builder.label('string_hash');
  builder.call(hash, 'fnv_mix', [hash, kind]);
  builder.move(temporary, start);
  builder.label('string_hash_loop');
  builder.binary('<', cond, temporary, offset);
  builder.branch(cond, 'string_hash_body', 'loop');
  builder.label('string_hash_body');
  builder.byteAt(byte, 0, temporary);
  builder.call(hash, 'fnv_mix', [hash, byte]);
  builder.binary('+', temporary, temporary, one);
  builder.jump('string_hash_loop');

  // two-char operator
  builder.label('two_char');
  builder.binary('+', temporary2, offset, one);
  builder.binary('<', cond, temporary2, length);
  builder.branch(cond, 'two_char_load', 'one_char');
  builder.label('two_char_load');
  builder.byteAt(nextByte, 0, temporary2);
  builder.call(cond, 'is_two_char_op', [byte, nextByte]);
  builder.branch(cond, 'two_char_mix', 'one_char');
  builder.label('two_char_mix');
  builder.num(kind, 28);
  builder.call(hash, 'fnv_mix', [hash, kind]);
  builder.call(hash, 'fnv_mix', [hash, byte]);
  builder.call(hash, 'fnv_mix', [hash, nextByte]);
  builder.binary('+', offset, offset, one);
  builder.binary('+', offset, offset, one);
  builder.jump('loop');

  // one-char operator
  builder.label('one_char');
  builder.call(cond, 'is_one_char_op', [byte]);
  builder.branch(cond, 'one_char_mix', 'punct');
  builder.label('one_char_mix');
  builder.num(kind, 28);
  builder.call(hash, 'fnv_mix', [hash, kind]);
  builder.call(hash, 'fnv_mix', [hash, byte]);
  builder.binary('+', offset, offset, one);
  builder.jump('loop');

  // punctuation
  builder.label('punct');
  builder.call(cond, 'is_punct', [byte]);
  builder.branch(cond, 'punct_mix', 'error');
  builder.label('punct_mix');
  builder.num(kind, 29);
  builder.call(hash, 'fnv_mix', [hash, kind]);
  builder.call(hash, 'fnv_mix', [hash, byte]);
  builder.binary('+', offset, offset, one);
  builder.jump('loop');

  // error / other
  builder.label('error');
  builder.num(kind, 31);
  builder.call(hash, 'fnv_mix', [hash, kind]);
  builder.call(hash, 'fnv_mix', [hash, byte]);
  builder.binary('+', offset, offset, one);
  builder.jump('loop');

  builder.label('done');
  builder.num(kind, 23); // EOF
  builder.call(hash, 'fnv_mix', [hash, kind]);
  builder.ret(hash);

  const code = builder.finish();
  return {
    name: FLINT_LEX_STAGE_ENTRY,
    parameters: [FLINT_LEX_STAGE_SOURCE_LAYOUT],
    result: 'i32',
    registers: builder.registers,
    code,
    debugSpans: [],
  };
}
