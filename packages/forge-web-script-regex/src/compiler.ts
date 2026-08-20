import { type CompiledRegex, INSTR_WIDTH, Op } from "./bytecode.js";

/** Compiler-owned syntax error with deterministic source-relative messages. */
export class RegexSyntaxError extends Error {
  public readonly code: "FWS-REGEX-001" | "FWS-REGEX-002" | "FWS-REGEX-003";

  public constructor(
    message: string,
    code: "FWS-REGEX-001" | "FWS-REGEX-002" | "FWS-REGEX-003" = "FWS-REGEX-002",
  ) {
    super(message);
    this.name = "RegexSyntaxError";
    this.code = code;
  }
}

type Node =
  | { kind: "empty" }
  | { kind: "char"; code: number }
  | { kind: "any" }
  | { kind: "class"; ranges: number[]; negated: boolean }
  | { kind: "bol" }
  | { kind: "eol" }
  | { kind: "concat"; parts: Node[] }
  | { kind: "alt"; options: Node[] }
  | { kind: "group"; child: Node; capturing: boolean; index: number }
  | { kind: "repeat"; child: Node; min: number; max: number; greedy: boolean };

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

  public constructor(src: string) {
    this.src = src;
  }

  public parse(): { root: Node; groupCount: number } {
    const root = this.parseAlternation();
    if (this.pos < this.src.length)
      throw new RegexSyntaxError(
        `Unexpected '${this.src[this.pos]}' at ${this.pos}`,
      );
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
    while (!this.eof() && this.peek() === "|") {
      this.next();
      options.push(this.parseConcat());
    }
    return options.length === 1 ? options[0] : { kind: "alt", options };
  }

  private parseConcat(): Node {
    const parts: Node[] = [];
    while (!this.eof() && this.peek() !== "|" && this.peek() !== ")")
      parts.push(this.parseQuantified());
    if (parts.length === 0) return { kind: "empty" };
    return parts.length === 1 ? parts[0] : { kind: "concat", parts };
  }

  private parseQuantified(): Node {
    const atom = this.parseAtom();
    if (this.eof()) return atom;
    const c = this.peek();
    let min: number;
    let max: number;
    if (c === "*") {
      this.next();
      min = 0;
      max = Infinity;
    } else if (c === "+") {
      this.next();
      min = 1;
      max = Infinity;
    } else if (c === "?") {
      this.next();
      min = 0;
      max = 1;
    } else if (c === "{") {
      const parsed = this.tryParseBrace();
      if (parsed === null) return atom;
      min = parsed.min;
      max = parsed.max;
    } else return atom;
    let greedy = true;
    if (!this.eof() && this.peek() === "?") {
      this.next();
      greedy = false;
    }
    return { kind: "repeat", child: atom, min, max, greedy };
  }

  private tryParseBrace(): { min: number; max: number } | null {
    const start = this.pos;
    this.next();
    let digits = "";
    while (!this.eof() && /[0-9]/u.test(this.peek())) digits += this.next();
    if (digits === "") {
      this.pos = start;
      return null;
    }
    const min = Number(digits);
    let max = min;
    if (!this.eof() && this.peek() === ",") {
      this.next();
      let upper = "";
      while (!this.eof() && /[0-9]/u.test(this.peek())) upper += this.next();
      max = upper === "" ? Infinity : Number(upper);
    }
    if (this.eof() || this.peek() !== "}") {
      this.pos = start;
      return null;
    }
    this.next();
    return { min, max };
  }

  private parseAtom(): Node {
    const c = this.peek();
    if (c === "(") return this.parseGroup();
    if (c === "[") return this.parseClass();
    if (c === ".") {
      this.next();
      return { kind: "any" };
    }
    if (c === "^") {
      this.next();
      return { kind: "bol" };
    }
    if (c === "$") {
      this.next();
      return { kind: "eol" };
    }
    if (c === "\\") return this.parseEscape();
    if (c === "*" || c === "+" || c === "?")
      throw new RegexSyntaxError(`Nothing to repeat at ${this.pos}`);
    this.next();
    return { kind: "char", code: c.charCodeAt(0) };
  }

  private parseGroup(): Node {
    this.next();
    let capturing = true;
    let index = 0;
    if (!this.eof() && this.peek() === "?") {
      if (this.src[this.pos + 1] === ":") {
        this.pos += 2;
        capturing = false;
      } else
        throw new RegexSyntaxError(
          `Unsupported group extension at ${this.pos}`,
          "FWS-REGEX-001",
        );
    }
    if (capturing) index = ++this.groupCounter;
    const child = this.parseAlternation();
    if (this.eof() || this.peek() !== ")")
      throw new RegexSyntaxError("Unterminated group");
    this.next();
    return { kind: "group", child, capturing, index };
  }

  private parseEscape(): Node {
    this.next();
    if (this.eof()) throw new RegexSyntaxError("Trailing backslash");
    const c = this.next();
    const cls = escapeClass(c);
    return cls ?? { kind: "char", code: literalEscapeCode(c) };
  }

  private parseClass(): Node {
    this.next();
    let negated = false;
    if (!this.eof() && this.peek() === "^") {
      this.next();
      negated = true;
    }
    const ranges: number[] = [];
    while (!this.eof() && this.peek() !== "]") {
      const lo = this.parseClassChar();
      if (lo.ranges) {
        ranges.push(...lo.ranges);
        continue;
      }
      if (
        !this.eof() &&
        this.peek() === "-" &&
        this.src[this.pos + 1] !== "]"
      ) {
        this.next();
        const hi = this.parseClassChar();
        if (hi.ranges) throw new RegexSyntaxError("Invalid range endpoint");
        ranges.push(lo.code, hi.code);
      } else ranges.push(lo.code, lo.code);
    }
    if (this.eof()) throw new RegexSyntaxError("Unterminated character class");
    this.next();
    return { kind: "class", ranges, negated };
  }

  private parseClassChar(): { code: number; ranges?: number[] } {
    const c = this.next();
    if (c === "\\") {
      const escaped = this.next();
      const cls = escapeClass(escaped);
      if (cls?.kind === "class") return { code: 0, ranges: cls.ranges };
      return { code: literalEscapeCode(escaped) };
    }
    return { code: c.charCodeAt(0) };
  }
}

function escapeClass(c: string): Node | null {
  switch (c) {
    case "d":
      return { kind: "class", ranges: [CODE_0, CODE_9], negated: false };
    case "D":
      return { kind: "class", ranges: [CODE_0, CODE_9], negated: true };
    case "w":
      return {
        kind: "class",
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
    case "W":
      return {
        kind: "class",
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
    case "s":
      return {
        kind: "class",
        ranges: [9, 13, 32, 32, 160, 160],
        negated: false,
      };
    case "S":
      return {
        kind: "class",
        ranges: [9, 13, 32, 32, 160, 160],
        negated: true,
      };
    default:
      return null;
  }
}

function literalEscapeCode(c: string): number {
  switch (c) {
    case "n":
      return 10;
    case "t":
      return 9;
    case "r":
      return 13;
    case "f":
      return 12;
    case "v":
      return 11;
    case "0":
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
  public readonly instrs: Instr[] = [];
  public readonly classes: number[] = [];

  public emit(op: number, a = 0, b = 0): number {
    const pc = this.instrs.length;
    this.instrs.push({ op, a, b });
    return pc;
  }

  public addClass(ranges: number[]): number {
    const offset = this.classes.length;
    this.classes.push(ranges.length / 2, ...ranges);
    return offset;
  }
}

function compileNode(node: Node, emitter: Emitter): void {
  switch (node.kind) {
    case "empty":
      return;
    case "char":
      emitter.emit(Op.CHAR, node.code);
      return;
    case "any":
      emitter.emit(Op.ANY);
      return;
    case "bol":
      emitter.emit(Op.BOL);
      return;
    case "eol":
      emitter.emit(Op.EOL);
      return;
    case "class":
      emitter.emit(
        Op.CLASS,
        emitter.addClass(node.ranges),
        node.negated ? 1 : 0,
      );
      return;
    case "concat":
      for (const part of node.parts) compileNode(part, emitter);
      return;
    case "group":
      if (node.capturing) emitter.emit(Op.SAVE, node.index * 2);
      compileNode(node.child, emitter);
      if (node.capturing) emitter.emit(Op.SAVE, node.index * 2 + 1);
      return;
    case "alt": {
      const jumps: number[] = [];
      for (const [index, option] of node.options.entries()) {
        if (index === node.options.length - 1) compileNode(option, emitter);
        else {
          const split = emitter.emit(Op.SPLIT);
          const optionStart = emitter.instrs.length;
          compileNode(option, emitter);
          jumps.push(emitter.emit(Op.JMP));
          emitter.instrs[split].a = optionStart;
          emitter.instrs[split].b = emitter.instrs.length;
        }
      }
      for (const jump of jumps) emitter.instrs[jump].a = emitter.instrs.length;
      return;
    }
    case "repeat":
      compileRepeat(node, emitter);
      return;
  }
}

function compileRepeat(
  node: Extract<Node, { kind: "repeat" }>,
  emitter: Emitter,
): void {
  for (let index = 0; index < node.min; index++)
    compileNode(node.child, emitter);
  if (node.max === Infinity) {
    const split = emitter.emit(Op.SPLIT);
    const bodyStart = emitter.instrs.length;
    compileNode(node.child, emitter);
    emitter.emit(Op.JMP, split);
    patchSplit(emitter, split, bodyStart, emitter.instrs.length, node.greedy);
    return;
  }
  const splits: number[] = [];
  for (let index = node.min; index < node.max; index++) {
    splits.push(emitter.emit(Op.SPLIT));
    compileNode(node.child, emitter);
  }
  const after = emitter.instrs.length;
  for (const split of splits)
    patchSplit(emitter, split, split + 1, after, node.greedy);
}

function patchSplit(
  emitter: Emitter,
  split: number,
  body: number,
  after: number,
  greedy: boolean,
): void {
  emitter.instrs[split].a = greedy ? body : after;
  emitter.instrs[split].b = greedy ? after : body;
}

/** Compile the supported deterministic regex subset into Forge bytecode. */
export function compileRegex(pattern: string): CompiledRegex {
  const { root, groupCount } = new Parser(pattern).parse();
  const emitter = new Emitter();
  emitter.emit(Op.SAVE, 0);
  compileNode(root, emitter);
  emitter.emit(Op.SAVE, 1);
  emitter.emit(Op.MATCH);
  const program = emitter.instrs.flatMap(({ op, a, b }) => [op, a, b]);
  if (program.length !== emitter.instrs.length * INSTR_WIDTH)
    throw new RegexSyntaxError(
      "Internal: instruction width mismatch",
      "FWS-REGEX-003",
    );
  return { program, classes: emitter.classes, groupCount };
}
