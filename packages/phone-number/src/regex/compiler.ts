// Build-time regex → bytecode compiler.
//
// Parses the subset of regular-expression syntax used by libphonenumber's
// metadata (literals, `.`, character classes with ranges/negation, the common
// escape classes `\d \D \w \W \s \S`, capturing `( )` and non-capturing
// `(?: )` groups, alternation `|`, the quantifiers `* + ?` and `{n} {n,} {n,m}`
// with optional lazy `?`, and the `^`/`$` anchors) and emits a flat
// {@link CompiledRegex} program for the VM.
//
// No backreferences, lookaround or named groups are needed by the metadata, so
// they are intentionally unsupported.

import { type CompiledRegex, INSTR_WIDTH, Op } from './bytecode.js';

type Node =
  | { kind: 'empty' }
  | { kind: 'char'; code: number }
  | { kind: 'any' }
  | { kind: 'class'; ranges: number[]; negated: boolean }
  | { kind: 'bol' }
  | { kind: 'eol' }
  | { kind: 'concat'; parts: Node[] }
  | { kind: 'alt'; options: Node[] }
  | { kind: 'group'; child: Node; capturing: boolean; index: number }
  | { kind: 'repeat'; child: Node; min: number; max: number; greedy: boolean };

/** Thrown when a pattern uses syntax outside the supported subset. */
export class RegexSyntaxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RegexSyntaxError';
  }
}

const CODE_0 = 48;
const CODE_9 = 57;
const CODE_A_UPPER = 65;
const CODE_Z_UPPER = 90;
const CODE_A_LOWER = 97;
const CODE_Z_LOWER = 122;
const CODE_UNDERSCORE = 95;

class Parser {
  private pos = 0;
  private groupCounter = 0;
  private readonly src: string;

  constructor(src: string) {
    this.src = src;
  }

  parse(): { root: Node; groupCount: number } {
    const root = this.parseAlternation();
    if (this.pos < this.src.length) {
      throw new RegexSyntaxError(`Unexpected '${this.src[this.pos]}' at ${this.pos}`);
    }
    return { root, groupCount: this.groupCounter };
  }

  private peek(): string {
    return this.src[this.pos];
  }

  private next(): string {
    return this.src[this.pos++];
  }

  private eof(): boolean {
    return this.pos >= this.src.length;
  }

  private parseAlternation(): Node {
    const options: Node[] = [this.parseConcat()];
    while (!this.eof() && this.peek() === '|') {
      this.next();
      options.push(this.parseConcat());
    }
    return options.length === 1 ? options[0] : { kind: 'alt', options };
  }

  private parseConcat(): Node {
    const parts: Node[] = [];
    while (!this.eof() && this.peek() !== '|' && this.peek() !== ')') {
      parts.push(this.parseQuantified());
    }
    if (parts.length === 0) return { kind: 'empty' };
    return parts.length === 1 ? parts[0] : { kind: 'concat', parts };
  }

  private parseQuantified(): Node {
    const atom = this.parseAtom();
    if (this.eof()) return atom;
    const c = this.peek();
    let min: number;
    let max: number;
    if (c === '*') {
      this.next();
      min = 0;
      max = Infinity;
    } else if (c === '+') {
      this.next();
      min = 1;
      max = Infinity;
    } else if (c === '?') {
      this.next();
      min = 0;
      max = 1;
    } else if (c === '{') {
      const parsed = this.tryParseBrace();
      if (parsed === null) return atom;
      min = parsed.min;
      max = parsed.max;
    } else {
      return atom;
    }
    let greedy = true;
    if (!this.eof() && this.peek() === '?') {
      this.next();
      greedy = false;
    }
    return { kind: 'repeat', child: atom, min, max, greedy };
  }

  private tryParseBrace(): { min: number; max: number } | null {
    const start = this.pos;
    this.next(); // consume '{'
    let digits = '';
    while (!this.eof() && /[0-9]/u.test(this.peek())) digits += this.next();
    if (digits === '') {
      this.pos = start;
      return null;
    }
    const min = Number(digits);
    let max = min;
    if (!this.eof() && this.peek() === ',') {
      this.next();
      let upper = '';
      while (!this.eof() && /[0-9]/u.test(this.peek())) upper += this.next();
      max = upper === '' ? Infinity : Number(upper);
    }
    if (this.eof() || this.peek() !== '}') {
      this.pos = start;
      return null;
    }
    this.next(); // consume '}'
    return { min, max };
  }

  private parseAtom(): Node {
    const c = this.peek();
    if (c === '(') return this.parseGroup();
    if (c === '[') return this.parseClass();
    if (c === '.') {
      this.next();
      return { kind: 'any' };
    }
    if (c === '^') {
      this.next();
      return { kind: 'bol' };
    }
    if (c === '$') {
      this.next();
      return { kind: 'eol' };
    }
    if (c === '\\') return this.parseEscape();
    if (c === '*' || c === '+' || c === '?') {
      throw new RegexSyntaxError(`Nothing to repeat at ${this.pos}`);
    }
    this.next();
    return { kind: 'char', code: c.charCodeAt(0) };
  }

  private parseGroup(): Node {
    this.next(); // consume '('
    let capturing = true;
    let index = 0;
    if (!this.eof() && this.peek() === '?') {
      // Only the non-capturing form `(?:` is supported.
      if (this.src[this.pos + 1] === ':') {
        this.pos += 2;
        capturing = false;
      } else {
        throw new RegexSyntaxError(`Unsupported group extension at ${this.pos}`);
      }
    }
    if (capturing) index = ++this.groupCounter;
    const child = this.parseAlternation();
    if (this.eof() || this.peek() !== ')') {
      throw new RegexSyntaxError('Unterminated group');
    }
    this.next(); // consume ')'
    return { kind: 'group', child, capturing, index };
  }

  private parseEscape(): Node {
    this.next(); // consume '\\'
    if (this.eof()) throw new RegexSyntaxError('Trailing backslash');
    const c = this.next();
    const cls = escapeClass(c);
    if (cls !== null) return cls;
    return { kind: 'char', code: literalEscapeCode(c) };
  }

  private parseClass(): Node {
    this.next(); // consume '['
    let negated = false;
    if (!this.eof() && this.peek() === '^') {
      this.next();
      negated = true;
    }
    const ranges: number[] = [];
    // Note: unlike POSIX, JavaScript treats an immediate `]` as an empty class,
    // so we do not special-case a leading `]` as a literal.
    while (!this.eof() && this.peek() !== ']') {
      const lo = this.parseClassChar();
      if (lo.ranges) {
        // An escape class (e.g. `\d`) inside `[...]`: splice its ranges in.
        for (let i = 0; i < lo.ranges.length; i++) ranges.push(lo.ranges[i]);
        continue;
      }
      if (!this.eof() && this.peek() === '-' && this.src[this.pos + 1] !== ']') {
        this.next(); // consume '-'
        const hi = this.parseClassChar();
        if (hi.ranges) throw new RegexSyntaxError('Invalid range endpoint');
        ranges.push(lo.code, hi.code);
      } else {
        ranges.push(lo.code, lo.code);
      }
    }
    if (this.eof()) throw new RegexSyntaxError('Unterminated character class');
    this.next(); // consume ']'
    return { kind: 'class', ranges, negated };
  }

  private parseClassChar(): { code: number; ranges?: number[] } {
    const c = this.next();
    if (c === '\\') {
      const e = this.next();
      const cls = escapeClass(e);
      if (cls !== null) {
        if (cls.kind === 'class') return { code: 0, ranges: cls.ranges };
      }
      return { code: literalEscapeCode(e) };
    }
    return { code: c.charCodeAt(0) };
  }
}

/** Expand an escape letter into its character-class node, or `null` if literal. */
function escapeClass(c: string): Node | null {
  switch (c) {
    case 'd':
      return { kind: 'class', ranges: [CODE_0, CODE_9], negated: false };
    case 'D':
      return { kind: 'class', ranges: [CODE_0, CODE_9], negated: true };
    case 'w':
      return {
        kind: 'class',
        ranges: [
          CODE_0,
          CODE_9,
          CODE_A_UPPER,
          CODE_Z_UPPER,
          CODE_A_LOWER,
          CODE_Z_LOWER,
          CODE_UNDERSCORE,
          CODE_UNDERSCORE,
        ],
        negated: false,
      };
    case 'W':
      return {
        kind: 'class',
        ranges: [
          CODE_0,
          CODE_9,
          CODE_A_UPPER,
          CODE_Z_UPPER,
          CODE_A_LOWER,
          CODE_Z_LOWER,
          CODE_UNDERSCORE,
          CODE_UNDERSCORE,
        ],
        negated: true,
      };
    case 's':
      return { kind: 'class', ranges: whitespaceRanges(), negated: false };
    case 'S':
      return { kind: 'class', ranges: whitespaceRanges(), negated: true };
    default:
      return null;
  }
}

function whitespaceRanges(): number[] {
  // \t \n \v \f \r, space, NBSP.
  return [9, 13, 32, 32, 160, 160];
}

function literalEscapeCode(c: string): number {
  switch (c) {
    case 'n':
      return 10;
    case 't':
      return 9;
    case 'r':
      return 13;
    case 'f':
      return 12;
    case 'v':
      return 11;
    case '0':
      return 0;
    default:
      return c.charCodeAt(0);
  }
}

interface Instr {
  op: number;
  a: number;
  b: number;
}

class Emitter {
  readonly instrs: Instr[] = [];
  readonly classes: number[] = [];

  emit(op: number, a = 0, b = 0): number {
    const pc = this.instrs.length;
    this.instrs.push({ op, a, b });
    return pc;
  }

  addClass(ranges: number[]): number {
    const offset = this.classes.length;
    this.classes.push(ranges.length / 2);
    for (let i = 0; i < ranges.length; i++) this.classes.push(ranges[i]);
    return offset;
  }
}

function compileNode(node: Node, e: Emitter): void {
  switch (node.kind) {
    case 'empty':
      return;
    case 'char':
      e.emit(Op.CHAR, node.code);
      return;
    case 'any':
      e.emit(Op.ANY);
      return;
    case 'bol':
      e.emit(Op.BOL);
      return;
    case 'eol':
      e.emit(Op.EOL);
      return;
    case 'class': {
      const offset = e.addClass(node.ranges);
      e.emit(Op.CLASS, offset, node.negated ? 1 : 0);
      return;
    }
    case 'concat':
      for (const part of node.parts) compileNode(part, e);
      return;
    case 'group':
      if (node.capturing) e.emit(Op.SAVE, node.index * 2);
      compileNode(node.child, e);
      if (node.capturing) e.emit(Op.SAVE, node.index * 2 + 1);
      return;
    case 'alt': {
      const jumps: number[] = [];
      for (let i = 0; i < node.options.length; i++) {
        const last = i === node.options.length - 1;
        if (!last) {
          const split = e.emit(Op.SPLIT);
          const optStart = e.instrs.length;
          compileNode(node.options[i], e);
          jumps.push(e.emit(Op.JMP));
          e.instrs[split].a = optStart;
          e.instrs[split].b = e.instrs.length;
        } else {
          compileNode(node.options[i], e);
        }
      }
      for (const j of jumps) e.instrs[j].a = e.instrs.length;
      return;
    }
    case 'repeat':
      compileRepeat(node, e);
      return;
  }
}

function compileRepeat(node: Extract<Node, { kind: 'repeat' }>, e: Emitter): void {
  const { child, min, max, greedy } = node;
  // Mandatory copies.
  for (let i = 0; i < min; i++) compileNode(child, e);

  if (max === Infinity) {
    if (min === 0) {
      // Kleene star.
      const split = e.emit(Op.SPLIT);
      const bodyStart = e.instrs.length;
      compileNode(child, e);
      e.emit(Op.JMP, split);
      const after = e.instrs.length;
      patchSplit(e, split, bodyStart, after, greedy);
    } else {
      // `x{min,}` == min copies already emitted, then a star on a fresh copy.
      const split = e.emit(Op.SPLIT);
      const bodyStart = e.instrs.length;
      compileNode(child, e);
      e.emit(Op.JMP, split);
      const after = e.instrs.length;
      patchSplit(e, split, bodyStart, after, greedy);
    }
    return;
  }

  // Bounded: emit (max - min) optional copies.
  const splits: number[] = [];
  for (let i = min; i < max; i++) {
    const split = e.emit(Op.SPLIT);
    splits.push(split);
    compileNode(child, e);
  }
  const after = e.instrs.length;
  for (const split of splits) patchSplit(e, split, split + 1, after, greedy);
}

function patchSplit(e: Emitter, split: number, body: number, after: number, greedy: boolean): void {
  if (greedy) {
    e.instrs[split].a = body;
    e.instrs[split].b = after;
  } else {
    e.instrs[split].a = after;
    e.instrs[split].b = body;
  }
}

/** Compile `pattern` into VM {@link CompiledRegex} bytecode. */
export function compileRegex(pattern: string): CompiledRegex {
  const { root, groupCount } = new Parser(pattern).parse();
  const e = new Emitter();
  e.emit(Op.SAVE, 0);
  compileNode(root, e);
  e.emit(Op.SAVE, 1);
  e.emit(Op.MATCH);

  const program: number[] = [];
  for (const instr of e.instrs) {
    program.push(instr.op, instr.a, instr.b);
  }
  // Sanity: fixed-width invariant.
  if (program.length !== e.instrs.length * INSTR_WIDTH) {
    throw new RegexSyntaxError('Internal: instruction width mismatch');
  }
  return { program, classes: e.classes, groupCount };
}
