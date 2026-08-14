/**
 * Source-text scanning primitives for the Svelte target.
 *
 * The enriched generic AST hands every fact to a target as **text**: a
 * `GenericStatement` carries its exact statement source, a
 * `SourceBackedExpression` its exact expression source, and a
 * `GenericRenderNode` the exact substring of the JSX it was built from. The
 * Svelte lowering therefore recognises the shapes it must lower (a ternary, a
 * `&&` guard, a `.map()` iteration, a hyperscript call) by scanning that text
 * instead of by walking a TypeScript tree.
 *
 * Every helper here is pure and builds on a single scan pass ({@link scanSource})
 * that records, per character, the bracket depth and whether the character sits
 * inside a string/template/comment — or inside an *opaque fragment*: the exact
 * source text of a nested JSX root, which must never be read as code (its `<`,
 * `>` and `;` characters are markup, not operators).
 */

/** Per-character bracket depth and literal/JSX masking of a scanned source text. */
export interface SourceScan {
  /** The scanned text, so every consumer slices the same buffer. */
  readonly text: string;
  /** Bracket nesting depth at each character; an opening/closing bracket itself carries the outer depth. */
  readonly depths: readonly number[];
  /** Whether the character belongs to a string/template/comment or an opaque JSX fragment. */
  readonly masked: readonly boolean[];
}

interface MaskedRange {
  readonly start: number;
  readonly end: number;
}

const IDENTIFIER_PATTERN = /^[A-Za-z_$][\w$]*$/;
const TYPE_REFERENCE_PATTERN = /^[A-Za-z_$][\w$.]*(?:\s*<[\s\S]*>)?$/;

/** The index just past a string/template literal opened at `start`. */
export function endOfLiteral(text: string, start: number): number {
  const quote = text[start];
  let index = start + 1;
  while (index < text.length) {
    const char = text[index];
    if (char === "\\") {
      index += 2;
      continue;
    }
    if (char === quote) {
      return index + 1;
    }
    index += 1;
  }
  return text.length;
}

/** The first non-overlapping occurrence of every opaque fragment, in source order. */
function maskedRanges(
  text: string,
  fragments: readonly string[],
): MaskedRange[] {
  const ranges: MaskedRange[] = [];
  for (const fragment of fragments) {
    if (fragment.length === 0) {
      continue;
    }
    let start = text.indexOf(fragment);
    while (
      start !== -1 &&
      ranges.some(
        (range) => start < range.end && start + fragment.length > range.start,
      )
    ) {
      start = text.indexOf(fragment, start + 1);
    }
    if (start !== -1) {
      ranges.push({ start, end: start + fragment.length });
    }
  }
  return ranges.sort((left, right) => left.start - right.start);
}

/** Scan a source text into per-character depth/mask tables. */
export function scanSource(
  text: string,
  opaqueFragments: readonly string[] = [],
): SourceScan {
  const ranges = maskedRanges(text, opaqueFragments);
  const depths: number[] = [];
  const masked: boolean[] = [];
  let depth = 0;
  let index = 0;
  let rangeIndex = 0;
  const fill = (count: number, isMasked: boolean): void => {
    for (let step = 0; step < count; step += 1) {
      depths.push(depth);
      masked.push(isMasked);
    }
  };
  while (index < text.length) {
    while (rangeIndex < ranges.length && ranges[rangeIndex]!.end <= index) {
      rangeIndex += 1;
    }
    const range = ranges[rangeIndex];
    if (range !== undefined && index >= range.start) {
      fill(range.end - index, true);
      index = range.end;
      continue;
    }
    const char = text[index]!;
    if (char === "'" || char === '"' || char === "`") {
      const end = endOfLiteral(text, index);
      fill(end - index, true);
      index = end;
      continue;
    }
    if (char === "/" && text[index + 1] === "/") {
      const newline = text.indexOf("\n", index);
      const end = newline === -1 ? text.length : newline;
      fill(end - index, true);
      index = end;
      continue;
    }
    if (char === "/" && text[index + 1] === "*") {
      const close = text.indexOf("*/", index + 2);
      const end = close === -1 ? text.length : close + 2;
      fill(end - index, true);
      index = end;
      continue;
    }
    if (char === "(" || char === "[" || char === "{") {
      fill(1, false);
      depth += 1;
      index += 1;
      continue;
    }
    if (char === ")" || char === "]" || char === "}") {
      depth = Math.max(0, depth - 1);
      fill(1, false);
      index += 1;
      continue;
    }
    fill(1, false);
    index += 1;
  }
  return { text, depths, masked };
}

/** Whether the character at `index` is unmasked code at the outermost bracket depth. */
export function isTopLevel(scan: SourceScan, index: number): boolean {
  return scan.depths[index] === 0 && scan.masked[index] === false;
}

/** The index of `token` at the outermost depth, or `-1`. */
export function indexOfTopLevel(
  scan: SourceScan,
  token: string,
  from = 0,
): number {
  for (let index = from; index + token.length <= scan.text.length; index += 1) {
    if (!isTopLevel(scan, index) || !scan.text.startsWith(token, index)) {
      continue;
    }
    let masked = false;
    for (let offset = 1; offset < token.length; offset += 1) {
      masked ||= scan.masked[index + offset] === true;
    }
    if (!masked) {
      return index;
    }
  }
  return -1;
}

/** Every index of `token` at the outermost depth, in source order. */
export function indexesOfTopLevel(scan: SourceScan, token: string): number[] {
  const found: number[] = [];
  let index = indexOfTopLevel(scan, token);
  while (index !== -1) {
    found.push(index);
    index = indexOfTopLevel(scan, token, index + 1);
  }
  return found;
}

/** Split a text on a separator character that sits at the outermost depth. */
export function splitTopLevel(
  text: string,
  separator: string,
  opaqueFragments: readonly string[] = [],
): string[] {
  const scan = scanSource(text, opaqueFragments);
  const parts: string[] = [];
  let start = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === separator && isTopLevel(scan, index)) {
      parts.push(text.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(text.slice(start));
  return parts;
}

/** Split an argument/element list on its outermost commas, dropping empty trailing entries. */
export function splitList(
  text: string,
  opaqueFragments: readonly string[] = [],
): string[] {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return [];
  }
  return splitTopLevel(trimmed, ",", opaqueFragments)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/**
 * The index just past the `>` that closes the type-argument list opened at
 * `start`, or `-1` when the list never closes.
 *
 * Angle brackets are invisible to {@link scanSource} — a type argument is not a
 * bracket group in the `()`/`[]`/`{}` sense, and `<`/`>` double as comparison
 * operators — so the balance is walked here. The walk steps over string
 * literals, over the `=>` of a function type (`useRef<(() => void)>(…)`, whose
 * `>` closes nothing) and over nested `()`/`[]`/`{}` groups, so a type argument
 * that itself contains parentheses never ends the list early.
 */
export function endOfTypeArguments(text: string, start: number): number {
  if (text[start] !== "<") {
    return -1;
  }
  let angles = 0;
  let brackets = 0;
  let index = start;
  while (index < text.length) {
    const char = text[index]!;
    if (char === "'" || char === '"' || char === "`") {
      index = endOfLiteral(text, index);
      continue;
    }
    if (char === "=" && text[index + 1] === ">") {
      index += 2;
      continue;
    }
    switch (char) {
      case "(":
      case "[":
      case "{": {
        brackets += 1;
        break;
      }
      case ")":
      case "]":
      case "}": {
        brackets -= 1;
        if (brackets < 0) {
          return -1;
        }
        break;
      }
      case "<": {
        angles += 1;
        break;
      }
      case ">": {
        angles -= 1;
        if (angles === 0 && brackets === 0) {
          return index + 1;
        }
        break;
      }
      default: {
        break;
      }
    }
    index += 1;
  }
  return -1;
}

/**
 * Split a type text on its top-level union bars, respecting `()`/`[]`/`{}`
 * groups and `<…>` type arguments (`Array<A | B> | undefined` has one bar).
 */
export function splitUnionMembers(text: string): string[] {
  const members: string[] = [];
  let brackets = 0;
  let angles = 0;
  let start = 0;
  let index = 0;
  while (index < text.length) {
    const char = text[index]!;
    if (char === "'" || char === '"' || char === "`") {
      index = endOfLiteral(text, index);
      continue;
    }
    if (char === "=" && text[index + 1] === ">") {
      index += 2;
      continue;
    }
    switch (char) {
      case "(":
      case "[":
      case "{": {
        brackets += 1;
        break;
      }
      case ")":
      case "]":
      case "}": {
        brackets = Math.max(0, brackets - 1);
        break;
      }
      case "<": {
        angles += 1;
        break;
      }
      case ">": {
        angles = Math.max(0, angles - 1);
        break;
      }
      case "|": {
        if (brackets === 0 && angles === 0) {
          members.push(text.slice(start, index));
          start = index + 1;
        }
        break;
      }
      default: {
        break;
      }
    }
    index += 1;
  }
  members.push(text.slice(start));
  return members
    .map((member) => member.trim())
    .filter((member) => member.length > 0);
}

/** Whether every bracket in a text is closed in order. */
export function isBalanced(text: string): boolean {
  let depth = 0;
  let index = 0;
  while (index < text.length) {
    const char = text[index]!;
    if (char === "'" || char === '"' || char === "`") {
      index = endOfLiteral(text, index);
      continue;
    }
    if (char === "(" || char === "[" || char === "{") {
      depth += 1;
    } else if (char === ")" || char === "]" || char === "}") {
      depth -= 1;
      if (depth < 0) {
        return false;
      }
    }
    index += 1;
  }
  return depth === 0;
}

/** Remove any parentheses that wrap the whole expression. */
export function stripParentheses(text: string): string {
  let current = text.trim();
  while (
    current.startsWith("(") &&
    current.endsWith(")") &&
    isBalanced(current.slice(1, -1))
  ) {
    current = current.slice(1, -1).trim();
  }
  return current;
}

/**
 * Remove the comment runs that surround an expression.
 *
 * A conditional branch is often authored with an explanatory comment in front
 * of its markup (`cond ? (\n  // why\n  <A />\n) : undefined`). The comment is
 * not part of the expression, but it does stop the text matching a retained
 * render node — which would silently demote the branch to a plain `{expr}`
 * hole and leak raw JSX into the template. The scan supplies the comment
 * extents, so a `//` inside a string is never mistaken for one.
 */
export function stripComments(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return trimmed;
  }
  const { masked } = scanSource(trimmed);
  let start = 0;
  while (start < trimmed.length) {
    if (/\s/.test(trimmed[start]!)) {
      start += 1;
      continue;
    }
    if (trimmed[start] === "/" && masked[start] === true) {
      start += 1;
      while (start < trimmed.length && masked[start] === true) {
        start += 1;
      }
      continue;
    }
    break;
  }
  let end = trimmed.length;
  while (end > start) {
    const last = end - 1;
    if (/\s/.test(trimmed[last]!)) {
      end = last;
      continue;
    }
    if (masked[last] !== true) {
      break;
    }
    let index = last;
    while (index > start && masked[index - 1] === true) {
      index -= 1;
    }
    // A masked run only counts as a comment when it opens with `/`; a trailing
    // string literal is masked too and must be kept.
    if (trimmed[index] !== "/") {
      break;
    }
    end = index;
  }
  return trimmed.slice(start, end).trim();
}

/** Remove a trailing statement semicolon. */
export function stripSemicolon(text: string): string {
  const trimmed = text.trim();
  return trimmed.endsWith(";") ? trimmed.slice(0, -1).trim() : trimmed;
}

/**
 * Strip trailing TypeScript type assertions (`expr as Type`, `expr as const`)
 * so template expressions never carry syntax Svelte markup cannot parse.
 * Nested parentheses around the whole assertion are unwrapped first.
 */
export function stripTypeAssertion(
  text: string,
  opaqueFragments: readonly string[] = [],
): string {
  let current = text.trim();
  for (;;) {
    const unwrapped = stripParentheses(current);
    const scan = scanSource(unwrapped, opaqueFragments);
    let asAt = -1;
    for (let index = 0; index < unwrapped.length; index += 1) {
      if (
        scan.depths[index] !== 0 ||
        scan.masked[index] ||
        !unwrapped.startsWith(" as ", index)
      ) {
        continue;
      }
      // Require a value token before ` as ` so `as Type` alone is not stripped.
      if (index === 0) {
        continue;
      }
      asAt = index;
    }
    if (asAt === -1) {
      return unwrapped;
    }
    const left = unwrapped.slice(0, asAt).trimEnd();
    const right = unwrapped.slice(asAt + 4).trim();
    if (left.length === 0 || right.length === 0) {
      return unwrapped;
    }
    current = left;
  }
}

/** Whether a text is a bare identifier. */
export function isIdentifierText(text: string): boolean {
  return IDENTIFIER_PATTERN.test(text.trim());
}

/** Whether a type annotation is a plain (optionally generic) type reference, safe to re-print verbatim. */
export function isTypeReferenceText(text: string): boolean {
  return TYPE_REFERENCE_PATTERN.test(text.trim());
}

/**
 * The argument texts of `callee(…)` when the whole text *is* that call.
 * Returns `undefined` for anything else, so `h(a)(b)` or `list.map(f).join('')`
 * never masquerade as the call being probed for.
 */
export function callArguments(
  text: string,
  callee: string,
  opaqueFragments: readonly string[] = [],
): string[] | undefined {
  const trimmed = stripParentheses(text);
  if (!trimmed.startsWith(callee) || !trimmed.endsWith(")")) {
    return undefined;
  }
  let index = callee.length;
  while (index < trimmed.length && /\s/.test(trimmed[index]!)) {
    index += 1;
  }
  // A generic call (`useState<string>(…)`) keeps its type arguments out of the
  // way. The list is balanced rather than searched for, so a type argument that
  // contains parentheses — a function type such as `useRef<(() => void) |
  // undefined>(…)` — still resolves to the call's own argument list.
  if (trimmed[index] === "<") {
    const close = endOfTypeArguments(trimmed, index);
    if (close === -1) {
      return undefined;
    }
    index = close;
    while (index < trimmed.length && /\s/.test(trimmed[index]!)) {
      index += 1;
    }
  }
  if (trimmed[index] !== "(") {
    return undefined;
  }
  const inner = trimmed.slice(index + 1, -1);
  if (!isBalanced(inner)) {
    return undefined;
  }
  return splitList(inner, opaqueFragments);
}

/** A `<target>.<method>(…)` call whose closing parenthesis ends the text. */
export interface MemberCall {
  readonly target: string;
  readonly arguments: readonly string[];
  /** Whether the call was reached through optional chaining (`target?.method(…)`). */
  readonly optional: boolean;
}

/** Read `<target>.<method>(…)` when the whole text is that call. */
export function memberCall(
  text: string,
  method: string,
  opaqueFragments: readonly string[] = [],
): MemberCall | undefined {
  const trimmed = stripParentheses(text);
  if (!trimmed.endsWith(")")) {
    return undefined;
  }
  const scan = scanSource(trimmed, opaqueFragments);
  const token = `.${method}`;
  // The rightmost `.method(` whose call closes the whole text is the one being
  // lowered; `items.map(f).join('')` therefore matches nothing.
  for (const position of indexesOfTopLevel(scan, token).toReversed()) {
    if (position === 0) {
      continue;
    }
    let after = position + token.length;
    while (after < trimmed.length && /\s/.test(trimmed[after]!)) {
      after += 1;
    }
    if (trimmed[after] !== "(") {
      continue;
    }
    const inner = trimmed.slice(after + 1, -1);
    if (isBalanced(inner)) {
      // `a?.map(f)` puts the optional-chaining `?` on the target side of the
      // `.map`; it is reported separately so no consumer prints a dangling `?`.
      const head = trimmed.slice(0, position).trim();
      const optional = head.endsWith("?");
      return {
        target: (optional ? head.slice(0, -1) : head).trim(),
        arguments: splitList(inner, opaqueFragments),
        optional,
      };
    }
  }
  return undefined;
}

/** The condition and branches of a top-level ternary (`c ? a : b`). */
export interface TernaryParts {
  readonly condition: string;
  readonly whenTrue: string;
  readonly whenFalse: string;
}

/** Read a top-level ternary, skipping `?.` and `??` operators. */
export function readTernary(
  text: string,
  opaqueFragments: readonly string[] = [],
): TernaryParts | undefined {
  const trimmed = stripParentheses(text);
  const scan = scanSource(trimmed, opaqueFragments);
  let question = -1;
  for (let index = 0; index < trimmed.length; index += 1) {
    if (trimmed[index] !== "?" || !isTopLevel(scan, index)) {
      continue;
    }
    if (trimmed[index + 1] === "." || trimmed[index + 1] === "?") {
      index += 1;
      continue;
    }
    question = index;
    break;
  }
  if (question === -1) {
    return undefined;
  }
  let nesting = 0;
  for (let index = question + 1; index < trimmed.length; index += 1) {
    if (!isTopLevel(scan, index)) {
      continue;
    }
    const char = trimmed[index];
    if (
      char === "?" &&
      trimmed[index + 1] !== "." &&
      trimmed[index + 1] !== "?" &&
      trimmed[index - 1] !== "?"
    ) {
      nesting += 1;
      continue;
    }
    if (char === ":") {
      if (nesting === 0) {
        return {
          condition: trimmed.slice(0, question).trim(),
          whenTrue: trimmed.slice(question + 1, index).trim(),
          whenFalse: trimmed.slice(index + 1).trim(),
        };
      }
      nesting -= 1;
    }
  }
  return undefined;
}

/** The two operands of a top-level binary operator. */
export interface BinaryParts {
  readonly left: string;
  readonly right: string;
}

/** Read the first top-level occurrence of a binary operator. */
export function readBinary(
  text: string,
  operator: string,
  opaqueFragments: readonly string[] = [],
): BinaryParts | undefined {
  const trimmed = stripParentheses(text);
  const scan = scanSource(trimmed, opaqueFragments);
  const index = indexOfTopLevel(scan, operator);
  if (index <= 0) {
    return undefined;
  }
  return {
    left: trimmed.slice(0, index).trim(),
    right: trimmed.slice(index + operator.length).trim(),
  };
}

/** A parsed arrow/function-expression callback. */
export interface CallbackParts {
  readonly parameters: readonly string[];
  readonly body: string;
}

/** Read an arrow function (`(a, b) => body`) or a function expression callback. */
export function readCallback(
  text: string,
  opaqueFragments: readonly string[] = [],
): CallbackParts | undefined {
  const trimmed = stripParentheses(text);
  if (/^function\b/.test(trimmed)) {
    const open = trimmed.indexOf("(");
    const brace = trimmed.indexOf("{", open);
    const close = brace === -1 ? -1 : trimmed.lastIndexOf(")", brace);
    if (open === -1 || brace === -1 || close < open) {
      return undefined;
    }
    return {
      parameters: splitList(trimmed.slice(open + 1, close), opaqueFragments),
      body: trimmed.slice(brace).trim(),
    };
  }
  const scan = scanSource(trimmed, opaqueFragments);
  const arrow = indexOfTopLevel(scan, "=>");
  if (arrow === -1) {
    return undefined;
  }
  const head = trimmed.slice(0, arrow).trim();
  const body = trimmed.slice(arrow + 2).trim();
  const parameterText =
    head.startsWith("(") && head.endsWith(")") ? head.slice(1, -1) : head;
  return { parameters: splitList(parameterText, opaqueFragments), body };
}

/** The declared name of a callback parameter (`item`, `{ id }`, `item: Row`). */
export function parameterName(text: string): string {
  const trimmed = text.trim();
  const scan = scanSource(trimmed);
  const colon = indexOfTopLevel(scan, ":");
  const withoutType = colon === -1 ? trimmed : trimmed.slice(0, colon).trim();
  const equals = indexOfTopLevel(scanSource(withoutType), "=");
  return (equals === -1 ? withoutType : withoutType.slice(0, equals))
    .trim()
    .replace(/\?$/, "");
}

/** Split a block body (`{ … }`) into its top-level statements. */
export function blockStatements(
  text: string,
  opaqueFragments: readonly string[] = [],
): string[] {
  const trimmed = text.trim();
  const inner =
    trimmed.startsWith("{") && trimmed.endsWith("}")
      ? trimmed.slice(1, -1)
      : trimmed;
  return splitTopLevel(inner, ";", opaqueFragments)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

/**
 * Collapse a JSX text node the way JSX itself does — the algorithm React/Babel
 * use for literal children. Each line has its leading/trailing whitespace
 * trimmed (except the very start of the first line and very end of the last
 * line, so meaningful inline spaces between adjacent text/expressions survive),
 * wholly blank lines are dropped, and the surviving lines are re-joined with a
 * single space. A whitespace-only run that spans a newline therefore collapses
 * to the empty string and is emitted as nothing — never as a stray ` ` text
 * node, which Svelte rejects as an invalid child of a structural element
 * (`<table>`/`<thead>`/`<tbody>`/`<tr>`/`<select>`/`<ul>`/…).
 */
export function normalizeJsxText(raw: string): string {
  const lines = raw.split(/\r\n|\n|\r/);
  let lastNonEmpty = -1;
  for (const [index, line] of lines.entries()) {
    if (/[^ \t]/.test(line!)) {
      lastNonEmpty = index;
    }
  }
  let out = "";
  for (let index = 0; index < lines.length; index += 1) {
    const isFirst = index === 0;
    const isLast = index === lines.length - 1;
    let line = lines[index]!.replace(/\t/g, " ");
    if (!isFirst) {
      line = line.replace(/^ +/, "");
    }
    if (!isLast) {
      line = line.replace(/ +$/, "");
    }
    if (line === "") {
      continue;
    }
    out += index === lastNonEmpty ? line : `${line} `;
  }
  return out;
}
