/**
 * Bounded self-hosted parser stage.
 *
 * The TypeScript seed and hand-lowered VM bytecode implement the same
 * structural parse-fingerprint algorithm. Unlike the lex stage, comments are
 * ignored, brace depth is tracked, and declaration/statement keywords are mixed
 * as parser events so the identity is independent of the lex fingerprint.
 *
 * Full recursive-descent AST construction remains seed-owned at the adapter
 * boundary; this stage proves independent VM execution and parity gating.
 */

import {
  FLINT_LEX_STAGE_SOURCE_LAYOUT,
  type FlintSelfHostedVmFunction,
  type FlintSelfHostedVmInstruction,
  type FlintSelfHostedVmModule,
  type FlintSelfHostedVmValue,
} from './lex-stage.js';

import type { FlintAggregateLayout } from '../manifest.js';

export const FLINT_PARSER_STAGE_ENTRY = 'parse_stage';

/** Optional factory knobs used by deliberate divergence tests. */
export interface FlintParserStageVmModuleOptions {
  /** XOR applied to the parse salt constant inside the VM module only. */
  readonly saltXor?: number;
}

const FNV_OFFSET = 2_166_136_261;
const FNV_PRIME = 16_777_619;
/** Distinct from the lex-stage basis so parser identity cannot echo lex. */
const PARSE_SALT = 0x50_52_53_31; // 'PRS1'

const TAG_STRING = 1;
const TAG_NUMBER = 2;
const TAG_DECL = 3;
const TAG_STMT = 4;
const TAG_KEYWORD = 5;
const TAG_IDENT = 6;
const TAG_LBRACE = 7;
const TAG_RBRACE = 8;
const TAG_LPAREN = 9;
const TAG_RPAREN = 10;
const TAG_ARROW = 11;
const TAG_COLON = 12;
const TAG_SEMI = 13;
const TAG_COMMA = 14;
const TAG_OP = 15;
const TAG_PUNCT = 16;
const TAG_ERROR = 17;
const TAG_EOF = 18;

const DECL_KEYWORDS = new Map<string, number>([
  ['export', 1],
  ['fn', 2],
  ['import', 3],
  ['capability', 4],
  ['struct', 5],
  ['enum', 6],
  ['interface', 7],
  ['class', 8],
  ['module', 9],
]);

const STMT_KEYWORDS = new Map<string, number>([
  ['let', 1],
  ['return', 2],
  ['if', 3],
  ['else', 4],
  ['while', 5],
  ['for', 6],
  ['match', 7],
  ['do', 8],
]);

const ALL_KEYWORDS = [
  'as',
  'capability',
  'case',
  'class',
  'constructor',
  'else',
  'enum',
  'extends',
  'export',
  'do',
  'for',
  'fn',
  'if',
  'impl',
  'interface',
  'import',
  'let',
  'match',
  'module',
  'new',
  'return',
  'struct',
  'trait',
  'while',
] as const;

const TWO_CHAR_OPS = ['!=', '&&', '==', '||', '<=', '>=', '->', '=>'] as const;
const ONE_CHAR_OPS = new Set(['!', '%', '*', '+', '-', '/', '<', '>', '=']);
const PUNCT = new Set(['{', '}', '(', ')', ':', ';', ',', '|']);

const encoder = new TextEncoder();

/**
 * toInt32 implementation.
 * @param value - The value parameter.
 * @returns The number result.
 */
function toInt32(value: number): number {
  // eslint-disable-next-line unicorn/prefer-math-trunc -- intentional ToInt32 wrap for hash parity
  return value | 0;
}

/**
 * fnvMix implementation.
 * @param hash - The hash parameter.
 * @param byte - The byte parameter.
 * @returns The number result.
 */
function fnvMix(hash: number, byte: number): number {
  return Math.imul(toInt32(hash) ^ (byte & 0xff), FNV_PRIME);
}

/**
 * fnvText implementation.
 * @param text - The text parameter.
 * @returns The number result.
 */
function fnvText(text: string): number {
  let hash = FNV_OFFSET;
  for (const byte of encoder.encode(text)) hash = fnvMix(hash, byte);
  return hash;
}

/**
 * isWhitespace implementation.
 * @param byte - The byte parameter.
 * @returns The boolean result.
 */
function isWhitespace(byte: number): boolean {
  return byte === 9 || byte === 10 || byte === 13 || byte === 32;
}

/**
 * isAlpha implementation.
 * @param byte - The byte parameter.
 * @returns The boolean result.
 */
function isAlpha(byte: number): boolean {
  return (byte >= 65 && byte <= 90) || (byte >= 97 && byte <= 122) || byte === 95;
}

/**
 * isDigit implementation.
 * @param byte - The byte parameter.
 * @returns The boolean result.
 */
function isDigit(byte: number): boolean {
  return byte >= 48 && byte <= 57;
}

/**
 * isAlnum implementation.
 * @param byte - The byte parameter.
 * @returns The boolean result.
 */
function isAlnum(byte: number): boolean {
  return isAlpha(byte) || isDigit(byte);
}

/**
 * mixU32 implementation.
 * @param hash - The hash parameter.
 * @param value - The value parameter.
 * @returns The number result.
 */
function mixU32(hash: number, value: number): number {
  let next = hash;
  next = fnvMix(next, value & 0xff);
  next = fnvMix(next, (value >>> 8) & 0xff);
  next = fnvMix(next, (value >>> 16) & 0xff);
  next = fnvMix(next, (value >>> 24) & 0xff);
  return next;
}

/**
 * Seed reference for the self-hosted parser stage.
 * Must stay behaviorally identical to {@link createFlintParserStageVmModule}.
 */
const PUNCT_TAGS = new Map<number, number>([
  [40, TAG_LPAREN],
  [41, TAG_RPAREN],
  [58, TAG_COLON],
  [59, TAG_SEMI],
  [44, TAG_COMMA],
]);

/**
 * Scans a string literal to update parser fingerprint and hash.
 *
 * @param bytes - Source byte buffer.
 * @param offset - Starting offset of string literal.
 * @param hash - Current running fingerprint hash.
 * @param depth - Current syntactic nesting depth.
 * @returns Updated offset, hash, and depth.
 */
function parseStringFingerprint(
  bytes: Uint8Array,
  offset: number,
  hash: number,
  depth: number,
): { offset: number; hash: number; depth: number } {
  const start = offset;
  let next = offset + 1;
  while (next < bytes.length) {
    if (bytes[next] === 92) {
      next += 2;
      continue;
    }
    if (bytes[next] === 34) {
      next += 1;
      break;
    }
    next += 1;
  }
  let nextHash = fnvMix(hash, TAG_STRING);
  for (let index = start; index < next; index += 1) {
    const b = bytes[index];
    if (b !== undefined) nextHash = fnvMix(nextHash, b);
  }
  return { offset: next, hash: nextHash, depth };
}

/**
 * Scans a numeric literal to update parser fingerprint and hash.
 *
 * @param bytes - Source byte buffer.
 * @param offset - Starting offset of numeric literal.
 * @param hash - Current running fingerprint hash.
 * @param depth - Current syntactic nesting depth.
 * @returns Updated offset, hash, and depth.
 */
function parseNumberFingerprint(
  bytes: Uint8Array,
  offset: number,
  hash: number,
  depth: number,
): { offset: number; hash: number; depth: number } {
  const start = offset;
  let next = offset + 1;
  while (next < bytes.length) {
    const nextByte = bytes[next];
    if (nextByte === undefined || !isDigit(nextByte)) break;
    next += 1;
  }
  let nextHash = fnvMix(hash, TAG_NUMBER);
  for (let index = start; index < next; index += 1) {
    const b = bytes[index];
    if (b !== undefined) nextHash = fnvMix(nextHash, b);
  }
  return { offset: next, hash: nextHash, depth };
}

/**
 * Resolves keyword identification fallback when declaration or statement context is absent.
 *
 * @param declId - Optional declaration keyword tag identifier.
 * @param stmtId - Optional statement keyword tag identifier.
 * @param text - Identifier token string representation.
 * @returns Resolved keyword identifier or undefined if not a keyword.
 */
function isKeywordFallback(declId: number | undefined, stmtId: number | undefined, text: string): number | undefined {
  if (declId !== undefined) return declId;
  if (stmtId !== undefined) return stmtId;
  const keywords: readonly string[] = ALL_KEYWORDS;
  if (keywords.includes(text)) return 0;
  return undefined;
}

/**
 * Mixes identifier tags and contextual declaration or statement token kind into running hash.
 *
 * @param hash - Current running fingerprint hash.
 * @param depth - Current syntactic nesting depth.
 * @param text - Identifier token text.
 * @param identHash - Hash of identifier bytes.
 * @returns Updated hash incorporating token kind and identifier content.
 */
function mixIdentTags(hash: number, depth: number, text: string, identHash: number): number {
  const declId = DECL_KEYWORDS.get(text);
  const stmtId = STMT_KEYWORDS.get(text);

  if (declId !== undefined && depth === 0) {
    let h = fnvMix(hash, TAG_DECL);
    h = fnvMix(h, declId);
    return mixU32(h, identHash);
  }

  if (stmtId !== undefined && depth > 0) {
    let h = fnvMix(hash, TAG_STMT);
    h = fnvMix(h, stmtId);
    return mixU32(h, identHash);
  }

  const kwId = isKeywordFallback(declId, stmtId, text);
  if (kwId !== undefined) {
    let h = fnvMix(hash, TAG_KEYWORD);
    h = fnvMix(h, kwId);
    return mixU32(h, identHash);
  }

  let h = fnvMix(hash, TAG_IDENT);
  h = fnvMix(h, 0);
  return mixU32(h, identHash);
}

/**
 * Scans an identifier or keyword to update parser fingerprint and context depth.
 *
 * @param bytes - Source byte buffer.
 * @param offset - Starting offset of identifier.
 * @param hash - Current running fingerprint hash.
 * @param depth - Current syntactic nesting depth.
 * @returns Updated offset, hash, and depth.
 */
function parseIdentFingerprint(
  bytes: Uint8Array,
  offset: number,
  hash: number,
  depth: number,
): { offset: number; hash: number; depth: number } {
  const start = offset;
  let next = offset + 1;
  while (next < bytes.length) {
    const nextByte = bytes[next];
    if (nextByte === undefined || !isAlnum(nextByte)) break;
    next += 1;
  }
  let identHash = FNV_OFFSET;
  for (let index = start; index < next; index += 1) {
    const byte = bytes[index];
    if (byte !== undefined) identHash = fnvMix(identHash, byte);
  }
  const text = new TextDecoder().decode(bytes.subarray(start, next));
  return { offset: next, hash: mixIdentTags(hash, depth, text, identHash), depth };
}

/**
 * Scans multi-character and single-character operator punctuation to update parser fingerprint.
 *
 * @param bytes - Source byte buffer.
 * @param offset - Starting offset of operator.
 * @param byte - First byte of operator token.
 * @param hash - Current running fingerprint hash.
 * @param depth - Current syntactic nesting depth.
 * @returns Updated offset, hash, and depth, or undefined if not recognized.
 */
function parsePunctuationOpFingerprint(
  bytes: Uint8Array,
  offset: number,
  byte: number,
  hash: number,
  depth: number,
): { offset: number; hash: number; depth: number } | undefined {
  if (offset + 1 < bytes.length) {
    const nextByte = bytes[offset + 1];
    if (nextByte !== undefined) {
      const two = String.fromCodePoint(byte, nextByte);
      const ops: readonly string[] = TWO_CHAR_OPS;
      if (ops.includes(two)) {
        if (two === '->') return { offset: offset + 2, hash: fnvMix(hash, TAG_ARROW), depth };
        let nextHash = fnvMix(hash, TAG_OP);
        nextHash = fnvMix(nextHash, byte);
        nextHash = fnvMix(nextHash, nextByte);
        return { offset: offset + 2, hash: nextHash, depth };
      }
    }
  }

  const single = String.fromCodePoint(byte);
  if (ONE_CHAR_OPS.has(single)) {
    let nextHash = fnvMix(hash, TAG_OP);
    nextHash = fnvMix(nextHash, byte);
    return { offset: offset + 1, hash: nextHash, depth };
  }
  if (PUNCT.has(single)) {
    let nextHash = fnvMix(hash, TAG_PUNCT);
    nextHash = fnvMix(nextHash, byte);
    return { offset: offset + 1, hash: nextHash, depth };
  }
  return undefined;
}

/**
 * Parses structural punctuation tokens and braces to adjust nesting depth and update fingerprint.
 *
 * @param bytes - Source byte buffer.
 * @param offset - Starting offset of punctuation.
 * @param byte - First byte of punctuation token.
 * @param hash - Current running fingerprint hash.
 * @param depth - Current syntactic nesting depth.
 * @returns Updated offset, hash, and depth, or undefined if not recognized.
 */
function parsePunctuationFingerprint(
  bytes: Uint8Array,
  offset: number,
  byte: number,
  hash: number,
  depth: number,
): { offset: number; hash: number; depth: number } | undefined {
  if (byte === 123) {
    const nextDepth = depth + 1;
    let nextHash = fnvMix(hash, TAG_LBRACE);
    nextHash = fnvMix(nextHash, nextDepth & 0xff);
    return { offset: offset + 1, hash: nextHash, depth: nextDepth };
  }
  if (byte === 125) {
    let nextHash = fnvMix(hash, TAG_RBRACE);
    nextHash = fnvMix(nextHash, depth & 0xff);
    return { offset: offset + 1, hash: nextHash, depth: Math.max(0, depth - 1) };
  }
  const simpleTag = PUNCT_TAGS.get(byte);
  if (simpleTag !== undefined) {
    return { offset: offset + 1, hash: fnvMix(hash, simpleTag), depth };
  }
  if (byte === 45 && offset + 1 < bytes.length && bytes[offset + 1] === 62) {
    return { offset: offset + 2, hash: fnvMix(hash, TAG_ARROW), depth };
  }

  return parsePunctuationOpFingerprint(bytes, offset, byte, hash, depth);
}

/**
 * Scans past a line comment in the source buffer.
 *
 * @param bytes - Source byte buffer.
 * @param offset - Starting offset of line comment.
 * @returns Offset following line terminator.
 */
function scanLineComment(bytes: Uint8Array, offset: number): number {
  let next = offset + 2;
  while (next < bytes.length && bytes[next] !== 10) next += 1;
  return next;
}

/**
 * Scans past a block comment in the source buffer.
 *
 * @param bytes - Source byte buffer.
 * @param offset - Starting offset of block comment.
 * @returns Offset following comment closure.
 */
function scanBlockComment(bytes: Uint8Array, offset: number): number {
  let next = offset + 2;
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
 * Scans line or block comments when encountering comment prefix bytes.
 *
 * @param bytes - Source byte buffer.
 * @param offset - Current byte offset.
 * @param hash - Current running fingerprint hash.
 * @param depth - Current syntactic nesting depth.
 * @param byte - First byte at offset.
 * @returns Updated offset, hash, and depth, or undefined if not a comment.
 */
function parseCommentFingerprint(
  bytes: Uint8Array,
  offset: number,
  hash: number,
  depth: number,
  byte: number,
): { offset: number; hash: number; depth: number } | undefined {
  if (byte === 47 && offset + 1 < bytes.length) {
    const nextByte = bytes[offset + 1];
    if (nextByte === 47) return { offset: scanLineComment(bytes, offset), hash, depth };
    if (nextByte === 42) return { offset: scanBlockComment(bytes, offset), hash, depth };
  }
  return undefined;
}

/**
 * Evaluates fallback token kinds (literals, identifiers, punctuation, or errors) for fingerprinting.
 *
 * @param bytes - Source byte buffer.
 * @param offset - Current byte offset.
 * @param hash - Current running fingerprint hash.
 * @param depth - Current syntactic nesting depth.
 * @param byte - First byte at offset.
 * @returns Updated offset, hash, and depth.
 */
function parseTokenStepFallbacks(
  bytes: Uint8Array,
  offset: number,
  hash: number,
  depth: number,
  byte: number,
): { offset: number; hash: number; depth: number } {
  if (byte === 34) return parseStringFingerprint(bytes, offset, hash, depth);
  if (isDigit(byte)) return parseNumberFingerprint(bytes, offset, hash, depth);
  if (isAlpha(byte)) return parseIdentFingerprint(bytes, offset, hash, depth);

  const punct = parsePunctuationFingerprint(bytes, offset, byte, hash, depth);
  if (punct !== undefined) return punct;

  let nextHash = fnvMix(hash, TAG_ERROR);
  nextHash = fnvMix(nextHash, byte);
  return { offset: offset + 1, hash: nextHash, depth };
}

/**
 * Dispatches a single lexical token processing step during parser fingerprint computation.
 *
 * @param bytes - Source byte buffer.
 * @param offset - Current byte offset.
 * @param hash - Current running fingerprint hash.
 * @param depth - Current syntactic nesting depth.
 * @param byte - First byte at offset.
 * @returns Updated offset, hash, and depth.
 */
function parseTokenFingerprintStep(
  bytes: Uint8Array,
  offset: number,
  hash: number,
  depth: number,
  byte: number,
): { offset: number; hash: number; depth: number } {
  if (isWhitespace(byte)) return { offset: offset + 1, hash, depth };

  const comment = parseCommentFingerprint(bytes, offset, hash, depth, byte);
  if (comment !== undefined) return comment;

  return parseTokenStepFallbacks(bytes, offset, hash, depth, byte);
}

/**
 * Computes a deterministic 32-bit FNV fingerprint for the self-hosted parser stage.
 *
 * @param source - Flint source code string.
 * @returns Deterministic 32-bit signed integer fingerprint.
 */
export function computeFlintParserStageFingerprint(source: string): number {
  const bytes = encoder.encode(source);
  let hash = toInt32(FNV_OFFSET ^ PARSE_SALT);
  let offset = 0;
  let depth = 0;

  while (offset < bytes.length) {
    const byte = bytes[offset];
    if (byte === undefined) {
      offset += 1;
      continue;
    }
    const result = parseTokenFingerprintStep(bytes, offset, hash, depth, byte);
    offset = result.offset;
    hash = result.hash;
    depth = result.depth;
  }

  hash = fnvMix(hash, TAG_EOF);
  hash = fnvMix(hash, depth & 0xff);
  return toInt32(hash);
}

/**
 * BytecodeBuilder implementation.
 */
interface BytecodeBuilder {
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

/**
 * createBuilder implementation.
 * @param parameterCount - The parameterCount parameter.
 * @returns The BytecodeBuilder result.
 */
function createBuilder(parameterCount: number): BytecodeBuilder {
  let nextRegister = parameterCount;
  const code: FlintSelfHostedVmInstruction[] = [];
  const labels = new Map<string, number>();
  const patches: BytecodeBuilder['patches'] = [];

  return {
    /**
     * registers implementation.
     */
    get registers() {
      return nextRegister;
    },
    code,
    labels,
    patches,
    /**
     * alloc implementation.
     * @param count - The count parameter.
     * @returns The unknown result.
     */
    alloc(count = 1) {
      const start = nextRegister;
      nextRegister += count;
      return start;
    },
    /**
     * num implementation.
     * @param destination - The destination parameter.
     * @param constantIndex - The constantIndex parameter.
     * @returns The unknown result.
     */
    num(destination, constantIndex) {
      code.push({ opcode: 'const', destination, constant: constantIndex });
    },
    /**
     * move implementation.
     * @param destination - The destination parameter.
     * @param source - The source parameter.
     * @returns The unknown result.
     */
    move(destination, source) {
      code.push({ opcode: 'move', destination, source });
    },
    /**
     * len implementation.
     * @param destination - The destination parameter.
     * @param source - The source parameter.
     * @returns The unknown result.
     */
    len(destination, source) {
      code.push({ opcode: 'len', destination, source });
    },
    /**
     * byteAt implementation.
     * @param destination - The destination parameter.
     * @param source - The source parameter.
     * @param index - The index parameter.
     * @returns The unknown result.
     */
    byteAt(destination, source, index) {
      code.push({ opcode: 'byte-at', destination, source, index });
    },
    /**
     * binary implementation.
     * @param operation - The operation parameter.
     * @param destination - The destination parameter.
     * @param left - The left parameter.
     * @param right - The right parameter.
     * @returns The unknown result.
     */
    binary(operation, destination, left, right) {
      code.push({ opcode: 'binary', operation, destination, left, right });
    },
    /**
     * unary implementation.
     * @param operation - The operation parameter.
     * @param destination - The destination parameter.
     * @param operand - The operand parameter.
     * @returns The unknown result.
     */
    unary(operation, destination, operand) {
      code.push({ opcode: 'unary', operation, destination, operand });
    },
    /**
     * call implementation.
     * @param destination - The destination parameter.
     * @param functionName - The functionName parameter.
     * @param arguments_ - The arguments_ parameter.
     * @returns The unknown result.
     */
    call(destination, functionName, arguments_) {
      code.push(
        destination === undefined
          ? { opcode: 'call', functionName, arguments: arguments_ }
          : { opcode: 'call', destination, functionName, arguments: arguments_ },
      );
    },
    /**
     * label implementation.
     * @param name - The name parameter.
     * @returns The unknown result.
     */
    label(name) {
      labels.set(name, code.length);
    },
    /**
     * jump implementation.
     * @param label - The label parameter.
     * @returns The unknown result.
     */
    jump(label) {
      patches.push({ index: code.length, field: 'target', label });
      code.push({ opcode: 'jump', target: -1 });
    },
    /**
     * branch implementation.
     * @param condition - The condition parameter.
     * @param ifTrue - The ifTrue parameter.
     * @param ifFalse - The ifFalse parameter.
     * @returns The unknown result.
     */
    branch(condition, ifTrue, ifFalse) {
      patches.push(
        { index: code.length, field: 'ifTrue', label: ifTrue },
        { index: code.length, field: 'ifFalse', label: ifFalse },
      );
      code.push({ opcode: 'branch', condition, ifTrue: -1, ifFalse: -1 });
    },
    /**
     * ret implementation.
     * @param source - The source parameter.
     * @returns The unknown result.
     */
    ret(source) {
      code.push(source === undefined ? { opcode: 'return' } : { opcode: 'return', source });
    },
    /**
     * finish implementation.
     * @returns The unknown result.
     */
    finish() {
      for (const patch of patches) {
        const target = labels.get(patch.label);
        if (target === undefined) throw new Error(`Unknown label '${patch.label}'`);
        const instruction = code[patch.index] as unknown as Record<string, number>;
        instruction[patch.field] = target;
      }
      return code;
    },
  };
}

/**
 * int32Constant implementation.
 * @param value - The value parameter.
 * @returns The FlintSelfHostedVmValue result.
 */
function int32Constant(value: number): FlintSelfHostedVmValue {
  return { kind: 'number', type: 'i32', value: toInt32(value) };
}

/**
 * buildFnvMix implementation.
 * @returns The FlintSelfHostedVmFunction result.
 */
function buildFnvMix(): FlintSelfHostedVmFunction {
  const b = createBuilder(2);
  const xored = b.alloc();
  const prime = b.alloc();
  const mixed = b.alloc();
  b.binary('^', xored, 0, 1);
  b.num(prime, 1);
  b.binary('*', mixed, xored, prime);
  b.ret(mixed);
  return {
    name: 'fnv_mix',
    parameters: ['i32', 'i32'],
    result: 'i32',
    registers: b.registers,
    code: b.finish(),
    debugSpans: [],
  };
}

/**
 * buildPredicateFromEquals implementation.
 * @param name - The name parameter.
 * @param constantIndexes - The constantIndexes parameter.
 * @returns The FlintSelfHostedVmFunction result.
 */
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
  b.num(c, 2);
  b.num(temporary, 2);
  b.binary('==', temporary, c, temporary);
  b.ret(temporary);
  b.label('no');
  b.num(c, 2);
  b.num(temporary, 3);
  b.binary('==', temporary, c, temporary);
  b.ret(temporary);
  return {
    name,
    parameters: ['i32'],
    result: 'bool',
    registers: b.registers,
    code: b.finish(),
    debugSpans: [],
  };
}

/**
 * buildIsWs implementation.
 * @returns The FlintSelfHostedVmFunction result.
 */
function buildIsWs(): FlintSelfHostedVmFunction {
  return buildPredicateFromEquals('is_ws', [9, 10, 11, 12]);
}

/**
 * buildIsAlpha implementation.
 * @returns The FlintSelfHostedVmFunction result.
 */
function buildIsAlpha(): FlintSelfHostedVmFunction {
  const b = createBuilder(1);
  const temporary = b.alloc();
  const lo = b.alloc();
  const hi = b.alloc();
  const t1 = b.alloc();
  const t2 = b.alloc();

  b.num(lo, 17);
  b.num(hi, 18);
  b.binary('>=', t1, 0, lo);
  b.binary('<=', t2, 0, hi);
  b.binary('&&', temporary, t1, t2);
  b.branch(temporary, 'yes', 'lower');

  b.label('lower');
  b.num(lo, 20);
  b.num(hi, 21);
  b.binary('>=', t1, 0, lo);
  b.binary('<=', t2, 0, hi);
  b.binary('&&', temporary, t1, t2);
  b.branch(temporary, 'yes', 'under');

  b.label('under');
  b.num(lo, 19);
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

  return {
    name: 'is_alpha',
    parameters: ['i32'],
    result: 'bool',
    registers: b.registers,
    code: b.finish(),
    debugSpans: [],
  };
}

/**
 * buildIsDigit implementation.
 * @returns The FlintSelfHostedVmFunction result.
 */
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
  return {
    name: 'is_digit',
    parameters: ['i32'],
    result: 'bool',
    registers: b.registers,
    code: b.finish(),
    debugSpans: [],
  };
}

/**
 * buildIsAlnum implementation.
 * @returns The FlintSelfHostedVmFunction result.
 */
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
  return {
    name: 'is_alnum',
    parameters: ['i32'],
    result: 'bool',
    registers: b.registers,
    code: b.finish(),
    debugSpans: [],
  };
}

/**
 * buildIsTwoCharOp implementation.
 * @returns The FlintSelfHostedVmFunction result.
 */
function buildIsTwoCharOp(): FlintSelfHostedVmFunction {
  const pairs = [
    [32, 33],
    [34, 35],
    [36, 37],
    [38, 39],
    [40, 41],
    [42, 43],
    [44, 45],
    [46, 47],
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
  return {
    name: 'is_two_char_op',
    parameters: ['i32', 'i32'],
    result: 'bool',
    registers: b.registers,
    code: b.finish(),
    debugSpans: [],
  };
}

/**
 * buildIsOneCharOp implementation.
 * @returns The FlintSelfHostedVmFunction result.
 */
function buildIsOneCharOp(): FlintSelfHostedVmFunction {
  return buildPredicateFromEquals('is_one_char_op', [48, 49, 50, 51, 52, 53, 54, 55, 56]);
}

/**
 * buildIsPunct implementation.
 * @returns The FlintSelfHostedVmFunction result.
 */
function buildIsPunct(): FlintSelfHostedVmFunction {
  return buildPredicateFromEquals('is_punct', [57, 58, 59, 60, 61, 62, 63, 64]);
}

/**
 * buildMixU32 implementation.
 * @returns The FlintSelfHostedVmFunction result.
 */
function buildMixU32(): FlintSelfHostedVmFunction {
  // mix_u32(hash, value) -> i32
  const b = createBuilder(2);
  const hash = b.alloc();
  const byte = b.alloc();
  const mask = b.alloc();
  const shifted = b.alloc();
  const eight = b.alloc();
  const sixteen = b.alloc();
  const twentyFour = b.alloc();

  b.move(hash, 0);
  b.num(mask, 8);
  b.num(eight, 5);
  b.num(sixteen, 6);
  b.num(twentyFour, 7);

  b.binary('&', byte, 1, mask);
  b.call(hash, 'fnv_mix', [hash, byte]);

  b.binary('>>', shifted, 1, eight);
  b.binary('&', byte, shifted, mask);
  b.call(hash, 'fnv_mix', [hash, byte]);

  b.binary('>>', shifted, 1, sixteen);
  b.binary('&', byte, shifted, mask);
  b.call(hash, 'fnv_mix', [hash, byte]);

  b.binary('>>', shifted, 1, twentyFour);
  b.binary('&', byte, shifted, mask);
  b.call(hash, 'fnv_mix', [hash, byte]);
  b.ret(hash);

  return {
    name: 'mix_u32',
    parameters: ['i32', 'i32'],
    result: 'i32',
    registers: b.registers,
    code: b.finish(),
    debugSpans: [],
  };
}

/**
 * Classify an identifier hash into parser event metadata.
 * Returns packed i32: (tag << 8) | id  where tag is TAG_DECL/STMT/KEYWORD/IDENT
 * and id is the keyword id (0 for plain ident / generic keyword).
 *
 * Parameters: identHash, depth
 */
function buildClassifyIdent(keywordHashBase: number, _keywordCount: number): FlintSelfHostedVmFunction {
  // Keyword order matches ALL_KEYWORDS; map each to decl/stmt ids.
  const keywordMeta = ALL_KEYWORDS.map((keyword) => {
    const declId = DECL_KEYWORDS.get(keyword);
    const stmtId = STMT_KEYWORDS.get(keyword);
    if (declId !== undefined) return { kind: 1 as const, id: declId }; // decl-capable
    if (stmtId !== undefined) return { kind: 2 as const, id: stmtId }; // stmt-capable
    return { kind: 3 as const, id: 0 }; // other keyword
  });

  const b = createBuilder(2);
  // 0 = identHash, 1 = depth
  const temporary = b.alloc();
  const c = b.alloc();
  const packed = b.alloc();
  const tag = b.alloc();
  const eight = b.alloc();
  b.num(eight, 5);

  let next = 'k0';
  for (const [index, meta] of keywordMeta.entries()) {
    b.label(next);
    b.num(c, keywordHashBase + index);
    b.binary('==', temporary, 0, c);
    next = index === keywordMeta.length - 1 ? 'ident' : `k${String(index + 1)}`;
    b.branch(temporary, `hit_${String(index)}`, next);

    b.label(`hit_${String(index)}`);
    if (meta.kind === 1) {
      // decl keyword: TAG_DECL if depth==0 else TAG_KEYWORD
      b.num(c, 2); // 0
      b.binary('==', temporary, 1, c);
      b.branch(temporary, `decl_${String(index)}`, `kw_${String(index)}`);
      b.label(`decl_${String(index)}`);
      b.num(tag, 70); // TAG_DECL constant index
      b.num(c, 80 + meta.id); // decl id constants start at 80
      b.binary('<<', packed, tag, eight);
      b.binary('|', packed, packed, c);
      b.ret(packed);
      b.label(`kw_${String(index)}`);
      b.num(tag, 72); // TAG_KEYWORD
      b.num(c, 80 + meta.id);
      b.binary('<<', packed, tag, eight);
      b.binary('|', packed, packed, c);
      b.ret(packed);
    } else if (meta.kind === 2) {
      // stmt keyword: TAG_STMT if depth>0 else TAG_KEYWORD
      b.num(c, 2);
      b.binary('>', temporary, 1, c);
      b.branch(temporary, `stmt_${String(index)}`, `kw2_${String(index)}`);
      b.label(`stmt_${String(index)}`);
      b.num(tag, 71); // TAG_STMT
      b.num(c, 90 + meta.id); // stmt ids at 90+
      b.binary('<<', packed, tag, eight);
      b.binary('|', packed, packed, c);
      b.ret(packed);
      b.label(`kw2_${String(index)}`);
      b.num(tag, 72);
      b.num(c, 90 + meta.id);
      b.binary('<<', packed, tag, eight);
      b.binary('|', packed, packed, c);
      b.ret(packed);
    } else {
      b.num(tag, 72);
      b.num(c, 2); // id 0
      b.binary('<<', packed, tag, eight);
      b.binary('|', packed, packed, c);
      b.ret(packed);
    }
  }

  b.label('ident');
  b.num(tag, 73); // TAG_IDENT
  b.num(c, 2);
  b.binary('<<', packed, tag, eight);
  b.binary('|', packed, packed, c);
  b.ret(packed);

  return {
    name: 'classify_ident',
    parameters: ['i32', 'i32'],
    result: 'i32',
    registers: b.registers,
    code: b.finish(),
    debugSpans: [],
  };
}

/**
 * buildParseStage implementation.
 * @param blockCommentStarConstant - The blockCommentStarConstant parameter.
 * @returns The FlintSelfHostedVmFunction result.
 */
function buildParseStage(blockCommentStarConstant: number): FlintSelfHostedVmFunction {
  // parse_stage(source) -> i32
  const b = createBuilder(1);
  const hash = b.alloc();
  const length = b.alloc();
  const offset = b.alloc();
  const depth = b.alloc();
  const byte = b.alloc();
  const nextByte = b.alloc();
  const temporary = b.alloc();
  const temporary2 = b.alloc();
  const start = b.alloc();
  const identHash = b.alloc();
  const one = b.alloc();
  const zero = b.alloc();
  const mask = b.alloc();
  const cond = b.alloc();
  const tag = b.alloc();
  const packed = b.alloc();
  const eight = b.alloc();

  // hash = FNV_OFFSET ^ PARSE_SALT  (const 0 is already XORed salt basis)
  b.num(hash, 0);
  b.len(length, 0);
  b.num(offset, 2);
  b.num(depth, 2);
  b.num(one, 3);
  b.num(zero, 2);
  b.num(mask, 8);
  b.num(eight, 5);

  b.label('loop');
  b.binary('<', cond, offset, length);
  b.branch(cond, 'body', 'done');

  b.label('body');
  b.byteAt(byte, 0, offset);

  // whitespace
  b.call(cond, 'is_ws', [byte]);
  b.branch(cond, 'ws', 'line_comment');

  b.label('ws');
  b.binary('+', offset, offset, one);
  b.jump('loop');

  // line comment //
  b.label('line_comment');
  b.num(temporary, 14); // '/'
  b.binary('==', cond, byte, temporary);
  b.branch(cond, 'maybe_line', 'string');

  b.label('maybe_line');
  b.binary('+', temporary2, offset, one);
  b.binary('<', cond, temporary2, length);
  b.branch(cond, 'check_second_slash', 'string');

  b.label('check_second_slash');
  b.byteAt(nextByte, 0, temporary2);
  b.num(temporary, 14); // '/'
  b.binary('==', cond, nextByte, temporary);
  b.branch(cond, 'skip_line', 'maybe_block');

  b.label('skip_line');
  b.binary('+', offset, offset, one);
  b.binary('+', offset, offset, one);
  b.label('line_loop');
  b.binary('<', cond, offset, length);
  b.branch(cond, 'line_check', 'loop');
  b.label('line_check');
  b.byteAt(byte, 0, offset);
  b.num(temporary, 10); // lf
  b.binary('==', cond, byte, temporary);
  b.branch(cond, 'loop', 'line_adv');
  b.label('line_adv');
  b.binary('+', offset, offset, one);
  b.jump('line_loop');

  // block comment /*
  b.label('maybe_block');
  b.num(temporary, blockCommentStarConstant);
  b.binary('==', cond, nextByte, temporary);
  b.branch(cond, 'skip_block', 'string');

  b.label('skip_block');
  b.binary('+', offset, offset, one);
  b.binary('+', offset, offset, one);
  b.label('block_loop');
  b.binary('<', cond, offset, length);
  b.branch(cond, 'block_body', 'loop');
  b.label('block_body');
  b.byteAt(byte, 0, offset);
  b.num(temporary, blockCommentStarConstant);
  b.binary('==', cond, byte, temporary);
  b.branch(cond, 'block_star', 'block_adv');
  b.label('block_star');
  b.binary('+', temporary2, offset, one);
  b.binary('<', cond, temporary2, length);
  b.branch(cond, 'block_slash', 'block_adv');
  b.label('block_slash');
  b.byteAt(nextByte, 0, temporary2);
  b.num(temporary, 14);
  b.binary('==', cond, nextByte, temporary);
  b.branch(cond, 'block_end', 'block_adv');
  b.label('block_end');
  b.binary('+', offset, offset, one);
  b.binary('+', offset, offset, one);
  b.jump('loop');
  b.label('block_adv');
  b.binary('+', offset, offset, one);
  b.jump('block_loop');

  // string
  b.label('string');
  b.num(temporary, 13); // quote
  b.binary('==', cond, byte, temporary);
  b.branch(cond, 'do_string', 'number');

  b.label('do_string');
  b.move(start, offset);
  b.binary('+', offset, offset, one);
  b.label('str_loop');
  b.binary('<', cond, offset, length);
  b.branch(cond, 'str_body', 'str_done');
  b.label('str_body');
  b.byteAt(byte, 0, offset);
  b.num(temporary, 22); // backslash
  b.binary('==', cond, byte, temporary);
  b.branch(cond, 'str_esc', 'str_quote');
  b.label('str_esc');
  b.binary('+', offset, offset, one);
  b.binary('+', offset, offset, one);
  b.jump('str_loop');
  b.label('str_quote');
  b.num(temporary, 13);
  b.binary('==', cond, byte, temporary);
  b.branch(cond, 'str_end', 'str_adv');
  b.label('str_end');
  b.binary('+', offset, offset, one);
  b.jump('str_done');
  b.label('str_adv');
  b.binary('+', offset, offset, one);
  b.jump('str_loop');
  b.label('str_done');
  b.num(tag, 70); // reuse - wait TAG_STRING is const index 65? see constants
  // Actually TAG constants start at index defined below - use dedicated indexes
  b.num(tag, 65); // TAG_STRING
  b.call(hash, 'fnv_mix', [hash, tag]);
  b.move(temporary, start);
  b.label('str_mix');
  b.binary('<', cond, temporary, offset);
  b.branch(cond, 'str_mix_body', 'loop');
  b.label('str_mix_body');
  b.byteAt(byte, 0, temporary);
  b.call(hash, 'fnv_mix', [hash, byte]);
  b.binary('+', temporary, temporary, one);
  b.jump('str_mix');

  // number
  b.label('number');
  b.call(cond, 'is_digit', [byte]);
  b.branch(cond, 'do_number', 'ident');

  b.label('do_number');
  b.move(start, offset);
  b.binary('+', offset, offset, one);
  b.label('num_loop');
  b.binary('<', cond, offset, length);
  b.branch(cond, 'num_check', 'num_done');
  b.label('num_check');
  b.byteAt(byte, 0, offset);
  b.call(cond, 'is_digit', [byte]);
  b.branch(cond, 'num_adv', 'num_done');
  b.label('num_adv');
  b.binary('+', offset, offset, one);
  b.jump('num_loop');
  b.label('num_done');
  b.num(tag, 66); // TAG_NUMBER
  b.call(hash, 'fnv_mix', [hash, tag]);
  b.move(temporary, start);
  b.label('num_mix');
  b.binary('<', cond, temporary, offset);
  b.branch(cond, 'num_mix_body', 'loop');
  b.label('num_mix_body');
  b.byteAt(byte, 0, temporary);
  b.call(hash, 'fnv_mix', [hash, byte]);
  b.binary('+', temporary, temporary, one);
  b.jump('num_mix');

  // identifier / keyword
  b.label('ident');
  b.call(cond, 'is_alpha', [byte]);
  b.branch(cond, 'do_ident', 'lbrace');

  b.label('do_ident');
  b.move(start, offset);
  b.binary('+', offset, offset, one);
  b.label('id_loop');
  b.binary('<', cond, offset, length);
  b.branch(cond, 'id_check', 'id_done');
  b.label('id_check');
  b.byteAt(byte, 0, offset);
  b.call(cond, 'is_alnum', [byte]);
  b.branch(cond, 'id_adv', 'id_done');
  b.label('id_adv');
  b.binary('+', offset, offset, one);
  b.jump('id_loop');
  b.label('id_done');
  b.num(identHash, 74); // FNV_OFFSET raw (const index for plain FNV offset)
  b.move(temporary, start);
  b.label('id_hash');
  b.binary('<', cond, temporary, offset);
  b.branch(cond, 'id_hash_body', 'id_classify');
  b.label('id_hash_body');
  b.byteAt(byte, 0, temporary);
  b.call(identHash, 'fnv_mix', [identHash, byte]);
  b.binary('+', temporary, temporary, one);
  b.jump('id_hash');
  b.label('id_classify');
  b.call(packed, 'classify_ident', [identHash, depth]);
  // tag = packed >> 8; id = packed & 0xff
  b.binary('>>', tag, packed, eight);
  b.binary('&', temporary, packed, mask);
  b.call(hash, 'fnv_mix', [hash, tag]);
  b.call(hash, 'fnv_mix', [hash, temporary]);
  b.call(hash, 'mix_u32', [hash, identHash]);
  b.jump('loop');

  // {
  b.label('lbrace');
  b.num(temporary, 57); // '{'
  b.binary('==', cond, byte, temporary);
  b.branch(cond, 'do_lbrace', 'rbrace');
  b.label('do_lbrace');
  b.binary('+', depth, depth, one);
  b.num(tag, 67); // TAG_LBRACE
  b.call(hash, 'fnv_mix', [hash, tag]);
  b.binary('&', temporary, depth, mask);
  b.call(hash, 'fnv_mix', [hash, temporary]);
  b.binary('+', offset, offset, one);
  b.jump('loop');

  // }
  b.label('rbrace');
  b.num(temporary, 58); // '}'
  b.binary('==', cond, byte, temporary);
  b.branch(cond, 'do_rbrace', 'lparen');
  b.label('do_rbrace');
  b.num(tag, 68); // TAG_RBRACE
  b.call(hash, 'fnv_mix', [hash, tag]);
  b.binary('&', temporary, depth, mask);
  b.call(hash, 'fnv_mix', [hash, temporary]);
  b.binary('>', cond, depth, zero);
  b.branch(cond, 'dec_depth', 'rbrace_adv');
  b.label('dec_depth');
  b.binary('-', depth, depth, one);
  b.label('rbrace_adv');
  b.binary('+', offset, offset, one);
  b.jump('loop');

  // (
  b.label('lparen');
  b.num(temporary, 59);
  b.binary('==', cond, byte, temporary);
  b.branch(cond, 'do_lparen', 'rparen');
  b.label('do_lparen');
  b.num(tag, 69); // TAG_LPAREN
  b.call(hash, 'fnv_mix', [hash, tag]);
  b.binary('+', offset, offset, one);
  b.jump('loop');

  // )
  b.label('rparen');
  b.num(temporary, 60);
  b.binary('==', cond, byte, temporary);
  b.branch(cond, 'do_rparen', 'colon');
  b.label('do_rparen');
  b.num(tag, 75); // TAG_RPAREN
  b.call(hash, 'fnv_mix', [hash, tag]);
  b.binary('+', offset, offset, one);
  b.jump('loop');

  // :
  b.label('colon');
  b.num(temporary, 61);
  b.binary('==', cond, byte, temporary);
  b.branch(cond, 'do_colon', 'semi');
  b.label('do_colon');
  b.num(tag, 76); // TAG_COLON
  b.call(hash, 'fnv_mix', [hash, tag]);
  b.binary('+', offset, offset, one);
  b.jump('loop');

  // ;
  b.label('semi');
  b.num(temporary, 62);
  b.binary('==', cond, byte, temporary);
  b.branch(cond, 'do_semi', 'comma');
  b.label('do_semi');
  b.num(tag, 77); // TAG_SEMI
  b.call(hash, 'fnv_mix', [hash, tag]);
  b.binary('+', offset, offset, one);
  b.jump('loop');

  // ,
  b.label('comma');
  b.num(temporary, 63);
  b.binary('==', cond, byte, temporary);
  b.branch(cond, 'do_comma', 'two_char');
  b.label('do_comma');
  b.num(tag, 78); // TAG_COMMA
  b.call(hash, 'fnv_mix', [hash, tag]);
  b.binary('+', offset, offset, one);
  b.jump('loop');

  // two-char ops
  b.label('two_char');
  b.binary('+', temporary2, offset, one);
  b.binary('<', cond, temporary2, length);
  b.branch(cond, 'two_check', 'one_char');
  b.label('two_check');
  b.byteAt(nextByte, 0, temporary2);
  b.call(cond, 'is_two_char_op', [byte, nextByte]);
  b.branch(cond, 'do_two', 'one_char');
  b.label('do_two');
  // arrow -> ?
  b.num(temporary, 52); // '-'
  b.binary('==', cond, byte, temporary);
  b.branch(cond, 'maybe_arrow', 'two_op');
  b.label('maybe_arrow');
  b.num(temporary, 43); // '>' const index for second of -> which is const 45 = '>'
  // second byte of -> is at constants 45 = 62 '>'
  b.num(temporary, 45); // wait - constant index 45 is second byte of -> which value is 62
  // Actually we compare nextByte value to 62
  b.num(temporary, 99); // will set constant 99 = 62 for '>'
  b.binary('==', cond, nextByte, temporary);
  b.branch(cond, 'do_arrow', 'two_op');
  b.label('do_arrow');
  b.num(tag, 79); // TAG_ARROW
  b.call(hash, 'fnv_mix', [hash, tag]);
  b.binary('+', offset, offset, one);
  b.binary('+', offset, offset, one);
  b.jump('loop');
  b.label('two_op');
  b.num(tag, 100); // TAG_OP
  b.call(hash, 'fnv_mix', [hash, tag]);
  b.call(hash, 'fnv_mix', [hash, byte]);
  b.call(hash, 'fnv_mix', [hash, nextByte]);
  b.binary('+', offset, offset, one);
  b.binary('+', offset, offset, one);
  b.jump('loop');

  // one-char ops
  b.label('one_char');
  b.call(cond, 'is_one_char_op', [byte]);
  b.branch(cond, 'do_one_op', 'punct');
  b.label('do_one_op');
  b.num(tag, 100); // TAG_OP
  b.call(hash, 'fnv_mix', [hash, tag]);
  b.call(hash, 'fnv_mix', [hash, byte]);
  b.binary('+', offset, offset, one);
  b.jump('loop');

  // remaining punct
  b.label('punct');
  b.call(cond, 'is_punct', [byte]);
  b.branch(cond, 'do_punct', 'error');
  b.label('do_punct');
  b.num(tag, 101); // TAG_PUNCT
  b.call(hash, 'fnv_mix', [hash, tag]);
  b.call(hash, 'fnv_mix', [hash, byte]);
  b.binary('+', offset, offset, one);
  b.jump('loop');

  // recovery
  b.label('error');
  b.num(tag, 102); // TAG_ERROR
  b.call(hash, 'fnv_mix', [hash, tag]);
  b.call(hash, 'fnv_mix', [hash, byte]);
  b.binary('+', offset, offset, one);
  b.jump('loop');

  b.label('done');
  b.num(tag, 103); // TAG_EOF
  b.call(hash, 'fnv_mix', [hash, tag]);
  b.binary('&', temporary, depth, mask);
  b.call(hash, 'fnv_mix', [hash, temporary]);
  b.ret(hash);

  return {
    name: FLINT_PARSER_STAGE_ENTRY,
    parameters: [FLINT_LEX_STAGE_SOURCE_LAYOUT],
    result: 'i32',
    registers: b.registers,
    code: b.finish(),
    debugSpans: [],
  };
}

/**
 * Hand-lowered VM module for the parser fingerprint stage.
 * Entry: parse_stage(source: FlintSourceBytes) -> i32
 */
export function createFlintParserStageVmModule(
  sourceHash: string,
  options: FlintParserStageVmModuleOptions = {},
): FlintSelfHostedVmModule {
  const saltXor = options.saltXor ?? 0;
  const keywordHashes = ALL_KEYWORDS.map((keyword) => fnvText(keyword));

  // Constant table — indexes documented inline for the bytecode builders.
  const constants: FlintSelfHostedVmValue[] = [
    int32Constant(toInt32(FNV_OFFSET ^ PARSE_SALT ^ saltXor)), // 0 hash basis
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
    // padding 23-31 unused by parse helpers but keep layout familiar
    int32Constant(0),
    int32Constant(0),
    int32Constant(0),
    int32Constant(0),
    int32Constant(0),
    int32Constant(0),
    int32Constant(0),
    int32Constant(0),
    int32Constant(0),
    // two-char op pairs at 32..47
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
    // one-char ops at 48..56
    int32Constant(33),
    int32Constant(37),
    int32Constant(42),
    int32Constant(43),
    int32Constant(45),
    int32Constant(47),
    int32Constant(60),
    int32Constant(62),
    int32Constant(61),
    // punct at 57..64
    int32Constant(123), // {
    int32Constant(125), // }
    int32Constant(40), // (
    int32Constant(41), // )
    int32Constant(58), // :
    int32Constant(59), // ;
    int32Constant(44), // ,
    int32Constant(124), // |
    // tags 65+
    int32Constant(TAG_STRING), // 65
    int32Constant(TAG_NUMBER), // 66
    int32Constant(TAG_LBRACE), // 67
    int32Constant(TAG_RBRACE), // 68
    int32Constant(TAG_LPAREN), // 69
    int32Constant(TAG_DECL), // 70
    int32Constant(TAG_STMT), // 71
    int32Constant(TAG_KEYWORD), // 72
    int32Constant(TAG_IDENT), // 73
    int32Constant(FNV_OFFSET), // 74 plain FNV offset for ident hashing
    int32Constant(TAG_RPAREN), // 75
    int32Constant(TAG_COLON), // 76
    int32Constant(TAG_SEMI), // 77
    int32Constant(TAG_COMMA), // 78
    int32Constant(TAG_ARROW), // 79
    // decl ids 80..89
    int32Constant(0), // 80 unused id0
    int32Constant(1), // 81 export
    int32Constant(2), // 82 fn
    int32Constant(3), // 83 import
    int32Constant(4), // 84 capability
    int32Constant(5), // 85 struct
    int32Constant(6), // 86 enum
    int32Constant(7), // 87 interface
    int32Constant(8), // 88 class
    int32Constant(9), // 89 module
    // stmt ids 90..98
    int32Constant(0), // 90
    int32Constant(1), // 91 let
    int32Constant(2), // 92 return
    int32Constant(3), // 93 if
    int32Constant(4), // 94 else
    int32Constant(5), // 95 while
    int32Constant(6), // 96 for
    int32Constant(7), // 97 match
    int32Constant(8), // 98 do
    int32Constant(62), // 99 '>' value for arrow check
    int32Constant(TAG_OP), // 100
    int32Constant(TAG_PUNCT), // 101
    int32Constant(TAG_ERROR), // 102
    int32Constant(TAG_EOF), // 103
    // keyword hashes at 104..
    ...keywordHashes.map((value) => int32Constant(value)),
    int32Constant(42), // block-comment '*'
  ];

  const keywordHashBase = 104;
  const blockCommentStarConstant = keywordHashBase + keywordHashes.length;

  // Fix classify_ident constant indexes for decl/stmt ids:
  // decl id constants are at 80 + id, stmt at 90 + id — matches builder.

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
      buildFnvMix(),
      buildIsWs(),
      buildIsAlpha(),
      buildIsDigit(),
      buildIsAlnum(),
      buildIsTwoCharOp(),
      buildIsOneCharOp(),
      buildIsPunct(),
      buildMixU32(),
      buildClassifyIdent(keywordHashBase, keywordHashes.length),
      buildParseStage(blockCommentStarConstant),
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
