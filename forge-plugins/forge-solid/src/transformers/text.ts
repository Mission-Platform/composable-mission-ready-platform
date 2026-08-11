/**
 * Source-text scanning utilities shared by the SolidJS transformers.
 *
 * The enriched generic AST hands the target the **exact source text** of every
 * statement, attribute value and interpolation (`SourceBackedExpression.text`),
 * together with the render nodes nested inside it. Lowering those fragments to
 * Solid therefore needs a tokenizer rather than a parser: the helpers below walk
 * a fragment once — skipping string, template and comment content, and tracking
 * the enclosing bracket — and expose the identifier occurrences and call sites
 * the reactive/slot rewrites act on.
 *
 * They are deliberately lexical: no TypeScript program, no re-parse, no
 * `ts.SourceFile`. Everything the rewrites need (is this identifier a member
 * access? an object-literal key? already a call?) is answered from the
 * neighbouring significant characters.
 */

/** Characters that may start a JavaScript identifier. */
const IDENTIFIER_START = /[A-Za-z_$]/;

/** Characters that may continue a JavaScript identifier. */
const IDENTIFIER_PART = /[\w$]/;

/** Keywords after which an identifier is a **binding**, never a value read. */
const BINDING_KEYWORDS: ReadonlySet<string> = new Set([
  "const",
  "let",
  "var",
  "function",
  "class",
  "import",
  "export",
  "interface",
  "type",
  "enum",
  "as",
  "from",
]);

/**
 * What the innermost enclosing `{` of an identifier opens.
 *
 * Only an **object literal** may carry shorthand (`{ open }`), so the shorthand
 * expansion must never fire inside a template-literal substitution
 * (`` `${open}px` ``), a JSX expression container (`attribute={open}`) or a
 * block. The kind is `'other'` whenever the enclosing bracket is not a brace.
 */
export type BraceKind = "object-literal" | "substitution" | "other";

/**
 * The significant characters a `{` may follow and still open an object literal:
 * an argument, an element, a property value, a ternary branch, a JSX expression
 * container's own brace, or the very start of the fragment (an attribute value
 * or initializer lowered on its own).
 */
const OBJECT_LITERAL_PREDECESSORS: ReadonlySet<string> = new Set([
  "",
  "(",
  "[",
  ",",
  ":",
  "?",
  "{",
]);

/** Keywords after which a `{` opens an object literal rather than a block. */
const OBJECT_LITERAL_KEYWORDS: ReadonlySet<string> = new Set(["return"]);

/** Whether a `{` preceded by these tokens opens an object literal. */
function opensObjectLiteral(before: string, previousWord: string): boolean {
  return previousWord === ""
    ? OBJECT_LITERAL_PREDECESSORS.has(before)
    : OBJECT_LITERAL_KEYWORDS.has(previousWord);
}

/** One identifier found in a source fragment, with the context a rewrite needs. */
export interface IdentifierOccurrence {
  /** The identifier text. */
  readonly name: string;
  /** Offset of the first character. */
  readonly start: number;
  /** Offset just past the last character. */
  readonly end: number;
  /** Nearest significant character before the identifier (`''` at the start). */
  readonly before: string;
  /** Nearest significant character after the identifier (`''` at the end). */
  readonly after: string;
  /** The innermost enclosing bracket (`(`, `[`, `{`) or `''` at top level. */
  readonly bracket: string;
  /** Offset of the innermost enclosing bracket, or `-1` at top level. */
  readonly bracketStart: number;
  /** What the innermost enclosing brace opens (`'other'` when it is not a brace). */
  readonly braceKind: BraceKind;
  /** The identifier token immediately preceding this one (`''` when none). */
  readonly previousWord: string;
}

/** A call expression `name(...)` (optionally `name<...>(...)`) found in a fragment. */
export interface CallSite {
  /** The callee identifier. */
  readonly name: string;
  /** Offset of the callee identifier. */
  readonly start: number;
  /** Offset just past the closing parenthesis. */
  readonly end: number;
  /** The type arguments without their angle brackets, when present. */
  readonly typeArguments?: string;
  /** The raw, trimmed argument texts. */
  readonly args: readonly string[];
}

/** Whether a string is a plain identifier (so it can use dot member access). */
export function isPlainIdentifier(name: string): boolean {
  return /^[A-Za-z_$][\w$]*$/.test(name);
}

/** `<object>.<key>` for plain identifiers, `<object>["kebab-key"]` otherwise. */
export function memberAccess(object: string, key: string): string {
  return isPlainIdentifier(key)
    ? `${object}.${key}`
    : `${object}[${quote(key)}]`;
}

/** A double-quoted string literal for the emitted source. */
export function quote(value: string): string {
  return JSON.stringify(value);
}

/** The text of a quoted literal, or `undefined` when the fragment is not a plain string literal. */
export function unquote(text: string): string | undefined {
  const trimmed = text.trim();
  if (trimmed.length < 2) {
    return undefined;
  }
  const quoteCharacter = trimmed.charAt(0);
  if (
    quoteCharacter !== "'" &&
    quoteCharacter !== '"' &&
    quoteCharacter !== "`"
  ) {
    return undefined;
  }
  if (!trimmed.endsWith(quoteCharacter)) {
    return undefined;
  }
  const inner = trimmed.slice(1, -1);
  if (
    inner.includes(quoteCharacter) ||
    (quoteCharacter === "`" && inner.includes("${"))
  ) {
    return undefined;
  }
  return inner;
}

/** Drop one layer of redundant wrapping parentheses. */
export function stripOuterParentheses(text: string): string {
  let current = text.trim();
  while (
    current.startsWith("(") &&
    current.endsWith(")") &&
    matchBracket(current, 0) === current.length - 1
  ) {
    current = current.slice(1, -1).trim();
  }
  return current;
}

/** Skip past a `'…'` / `"…"` literal starting at `index`, returning the offset after it. */
function skipQuoted(text: string, index: number): number {
  const quoteCharacter = text.charAt(index);
  let cursor = index + 1;
  while (cursor < text.length) {
    const character = text.charAt(cursor);
    if (character === "\\") {
      cursor += 2;
      continue;
    }
    if (character === quoteCharacter) {
      return cursor + 1;
    }
    cursor += 1;
  }
  return text.length;
}

/** Skip whitespace and comments, returning the offset of the next significant character. */
export function skipTrivia(text: string, index: number): number {
  let cursor = index;
  while (cursor < text.length) {
    const character = text.charAt(cursor);
    if (/\s/.test(character)) {
      cursor += 1;
      continue;
    }
    if (character === "/" && text.charAt(cursor + 1) === "/") {
      const lineEnd = text.indexOf("\n", cursor);
      cursor = lineEnd === -1 ? text.length : lineEnd + 1;
      continue;
    }
    if (character === "/" && text.charAt(cursor + 1) === "*") {
      const blockEnd = text.indexOf("*/", cursor);
      cursor = blockEnd === -1 ? text.length : blockEnd + 2;
      continue;
    }
    return cursor;
  }
  return text.length;
}

/** The next significant character after `index` (`''` at the end of the fragment). */
function nextSignificant(text: string, index: number): string {
  const cursor = skipTrivia(text, index);
  return cursor < text.length ? text.charAt(cursor) : "";
}

/** The closing bracket matching the one at `openIndex`, or `-1` when unbalanced. */
export function matchBracket(text: string, openIndex: number): number {
  const open = text.charAt(openIndex);
  const close = open === "(" ? ")" : open === "[" ? "]" : "}";
  let depth = 0;
  let cursor = openIndex;
  while (cursor < text.length) {
    const character = text.charAt(cursor);
    if (character === "'" || character === '"') {
      cursor = skipQuoted(text, cursor);
      continue;
    }
    if (character === "`") {
      cursor = skipTemplate(text, cursor);
      continue;
    }
    if (
      character === "/" &&
      (text.charAt(cursor + 1) === "/" || text.charAt(cursor + 1) === "*")
    ) {
      cursor = skipTrivia(text, cursor);
      continue;
    }
    if (character === open) {
      depth += 1;
    } else if (character === close) {
      depth -= 1;
      if (depth === 0) {
        return cursor;
      }
    }
    cursor += 1;
  }
  return -1;
}

/** Skip a whole template literal (including nested substitutions) starting at a backtick. */
function skipTemplate(text: string, index: number): number {
  let cursor = index + 1;
  while (cursor < text.length) {
    const character = text.charAt(cursor);
    if (character === "\\") {
      cursor += 2;
      continue;
    }
    if (character === "`") {
      return cursor + 1;
    }
    if (character === "$" && text.charAt(cursor + 1) === "{") {
      const close = matchBracket(text, cursor + 1);
      cursor = close === -1 ? text.length : close + 1;
      continue;
    }
    cursor += 1;
  }
  return text.length;
}

/** The closing `>` matching the `<` at `openIndex`, or `-1` when the fragment is not type arguments. */
function matchAngleBracket(text: string, openIndex: number): number {
  let depth = 0;
  let cursor = openIndex;
  while (cursor < text.length) {
    const character = text.charAt(cursor);
    switch (character) {
      case "<": {
        depth += 1;
        break;
      }
      case ">": {
        depth -= 1;
        if (depth === 0) {
          return cursor;
        }
        break;
      }
      case "(":
      case ")":
      case ";":
      case "\n": {
        return -1;
      }
      // No default
    }
    cursor += 1;
  }
  return -1;
}

/** Every identifier in a fragment, in source order, outside strings, templates and comments. */
export function scanIdentifiers(text: string): readonly IdentifierOccurrence[] {
  const occurrences: IdentifierOccurrence[] = [];
  const brackets: string[] = [];
  const bracketStarts: number[] = [];
  const braceKinds: BraceKind[] = [];
  const substitutions: number[] = [];
  const modes: ("code" | "template")[] = ["code"];
  let index = 0;
  let before = "";
  let previousWord = "";

  while (index < text.length) {
    const character = text.charAt(index);

    if (modes.at(-1) === "template") {
      if (character === "\\") {
        index += 2;
        continue;
      }
      if (character === "`") {
        modes.pop();
        before = "`";
        previousWord = "";
        index += 1;
        continue;
      }
      if (character === "$" && text.charAt(index + 1) === "{") {
        modes.push("code");
        brackets.push("{");
        bracketStarts.push(index + 1);
        braceKinds.push("substitution");
        substitutions.push(brackets.length);
        before = "{";
        previousWord = "";
        index += 2;
        continue;
      }
      index += 1;
      continue;
    }

    if (character === "`") {
      modes.push("template");
      index += 1;
      continue;
    }
    if (character === "'" || character === '"') {
      index = skipQuoted(text, index);
      before = character;
      previousWord = "";
      continue;
    }
    if (
      character === "/" &&
      (text.charAt(index + 1) === "/" || text.charAt(index + 1) === "*")
    ) {
      index = skipTrivia(text, index);
      continue;
    }
    if (/\s/.test(character)) {
      index += 1;
      continue;
    }
    if (character === "(" || character === "[" || character === "{") {
      brackets.push(character);
      bracketStarts.push(index);
      braceKinds.push(
        character === "{" && opensObjectLiteral(before, previousWord)
          ? "object-literal"
          : "other",
      );
      before = character;
      previousWord = "";
      index += 1;
      continue;
    }
    if (character === ")" || character === "]" || character === "}") {
      if (character === "}" && substitutions.at(-1) === brackets.length) {
        substitutions.pop();
        brackets.pop();
        bracketStarts.pop();
        braceKinds.pop();
        modes.pop();
        index += 1;
        continue;
      }
      brackets.pop();
      bracketStarts.pop();
      braceKinds.pop();
      before = character;
      previousWord = "";
      index += 1;
      continue;
    }
    if (IDENTIFIER_START.test(character)) {
      const start = index;
      index += 1;
      while (index < text.length && IDENTIFIER_PART.test(text.charAt(index))) {
        index += 1;
      }
      const name = text.slice(start, index);
      occurrences.push({
        name,
        start,
        end: index,
        before,
        after: nextSignificant(text, index),
        bracket: brackets.at(-1) ?? "",
        bracketStart: bracketStarts.at(-1) ?? -1,
        braceKind: braceKinds.at(-1) ?? "other",
        previousWord,
      });
      before = name.at(-1) ?? "";
      previousWord = name;
      continue;
    }

    before = character;
    previousWord = "";
    index += 1;
  }

  return occurrences;
}

/**
 * Rewrite identifier occurrences in place. Replacements are applied back to
 * front so earlier offsets stay valid; returning `undefined` leaves an
 * occurrence untouched.
 */
export function rewriteIdentifiers(
  text: string,
  rewrite: (occurrence: IdentifierOccurrence) => string | undefined,
): string {
  const occurrences = scanIdentifiers(text);
  let result = text;
  for (let index = occurrences.length - 1; index >= 0; index -= 1) {
    const occurrence = occurrences[index];
    if (occurrence === undefined) {
      continue;
    }
    const replacement = rewrite(occurrence);
    if (replacement === undefined) {
      continue;
    }
    result =
      result.slice(0, occurrence.start) +
      replacement +
      result.slice(occurrence.end);
  }
  return result;
}

/** Whether an identifier occurrence is a plain callee (not a member, not a binding). */
function isCalleeCandidate(occurrence: IdentifierOccurrence): boolean {
  return (
    occurrence.before !== "." && !BINDING_KEYWORDS.has(occurrence.previousWord)
  );
}

/** Read the call starting at an identifier occurrence, or `undefined` when it is not a call. */
function readCall(
  text: string,
  occurrence: IdentifierOccurrence,
): CallSite | undefined {
  let cursor = skipTrivia(text, occurrence.end);
  let typeArguments: string | undefined;
  if (text.charAt(cursor) === "<") {
    const close = matchAngleBracket(text, cursor);
    if (close === -1) {
      return undefined;
    }
    typeArguments = text.slice(cursor + 1, close);
    cursor = skipTrivia(text, close + 1);
  }
  if (text.charAt(cursor) !== "(") {
    return undefined;
  }
  const close = matchBracket(text, cursor);
  if (close === -1) {
    return undefined;
  }
  const call: CallSite = {
    name: occurrence.name,
    start: occurrence.start,
    end: close + 1,
    args: splitTopLevel(text.slice(cursor + 1, close), ","),
  };
  return typeArguments === undefined ? call : { ...call, typeArguments };
}

/** The first call of one of `names` at or after `from`, or `undefined` when there is none. */
export function findCall(
  text: string,
  names: ReadonlySet<string>,
  from = 0,
): CallSite | undefined {
  for (const occurrence of scanIdentifiers(text)) {
    if (
      occurrence.start < from ||
      !names.has(occurrence.name) ||
      !isCalleeCandidate(occurrence)
    ) {
      continue;
    }
    const call = readCall(text, occurrence);
    if (call !== undefined) {
      return call;
    }
  }
  return undefined;
}

/**
 * Rewrite every call of `names`, left to right. Scanning restarts just after the
 * rewritten callee so calls nested inside a replacement are lowered too, and
 * returning `undefined` leaves a call untouched.
 */
export function rewriteCalls(
  text: string,
  names: ReadonlySet<string>,
  rewrite: (call: CallSite) => string | undefined,
): string {
  let result = text;
  let from = 0;
  // Bounded to keep a pathological rewrite from looping; real modules use a
  // handful of neutral calls per statement.
  for (let guard = 0; guard < 1000; guard += 1) {
    const call = findCall(result, names, from);
    if (call === undefined) {
      break;
    }
    const replacement = rewrite(call);
    if (replacement === undefined) {
      from = call.start + call.name.length;
      continue;
    }
    result = result.slice(0, call.start) + replacement + result.slice(call.end);
    from = call.start + 1;
  }
  return result;
}

/** Split a fragment on a top-level separator, ignoring brackets, strings and comments. */
export function splitTopLevel(text: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  let cursor = 0;
  while (cursor < text.length) {
    const character = text.charAt(cursor);
    if (character === "'" || character === '"') {
      cursor = skipQuoted(text, cursor);
      continue;
    }
    if (character === "`") {
      cursor = skipTemplate(text, cursor);
      continue;
    }
    if (
      character === "/" &&
      (text.charAt(cursor + 1) === "/" || text.charAt(cursor + 1) === "*")
    ) {
      cursor = skipTrivia(text, cursor);
      continue;
    }
    if (character === "(" || character === "[" || character === "{") {
      depth += 1;
    } else if (character === ")" || character === "]" || character === "}") {
      depth -= 1;
    } else if (depth === 0 && character === separator) {
      parts.push(text.slice(start, cursor).trim());
      start = cursor + 1;
    }
    cursor += 1;
  }
  const last = text.slice(start).trim();
  if (last !== "") {
    parts.push(last);
  }
  return parts;
}

/**
 * The offset of the first top-level `=` that is a real assignment — `=>`, `==`,
 * `<=`, `>=` and `!=` are skipped — or `-1` when the fragment has none.
 */
export function indexOfAssignment(text: string): number {
  let depth = 0;
  let cursor = 0;
  while (cursor < text.length) {
    const character = text.charAt(cursor);
    if (character === "'" || character === '"') {
      cursor = skipQuoted(text, cursor);
      continue;
    }
    if (character === "`") {
      cursor = skipTemplate(text, cursor);
      continue;
    }
    if (
      character === "/" &&
      (text.charAt(cursor + 1) === "/" || text.charAt(cursor + 1) === "*")
    ) {
      cursor = skipTrivia(text, cursor);
      continue;
    }
    if (character === "(" || character === "[" || character === "{") {
      depth += 1;
    } else if (character === ")" || character === "]" || character === "}") {
      depth -= 1;
    } else if (depth === 0 && character === "=") {
      const previous = text.charAt(cursor - 1);
      const next = text.charAt(cursor + 1);
      if (
        next !== "=" &&
        next !== ">" &&
        previous !== "=" &&
        previous !== "<" &&
        previous !== ">" &&
        previous !== "!"
      ) {
        return cursor;
      }
    }
    cursor += 1;
  }
  return -1;
}

/** Whether the parenthesised group opened at `openIndex` is an arrow function's parameter list. */
export function isArrowParameterList(text: string, openIndex: number): boolean {
  if (openIndex < 0 || text.charAt(openIndex) !== "(") {
    return false;
  }
  const close = matchBracket(text, openIndex);
  if (close === -1) {
    return false;
  }
  const after = skipTrivia(text, close + 1);
  return text.startsWith("=>", after);
}

/** Keywords whose parenthesised group binds names instead of reading them. */
const PARAMETER_LIST_KEYWORDS: ReadonlySet<string> = new Set([
  "function",
  "catch",
]);

/**
 * The identifier ending just before `index`, with its start offset. Whitespace
 * and a generator star are skipped, so `function* build(` reports `build`.
 */
function precedingWord(
  text: string,
  index: number,
): { readonly word: string; readonly start: number } {
  let cursor = index - 1;
  while (
    cursor >= 0 &&
    (/\s/.test(text.charAt(cursor)) || text.charAt(cursor) === "*")
  ) {
    cursor -= 1;
  }
  const end = cursor + 1;
  while (cursor >= 0 && IDENTIFIER_PART.test(text.charAt(cursor))) {
    cursor -= 1;
  }
  return { word: text.slice(cursor + 1, end), start: cursor + 1 };
}

/**
 * Whether the parenthesised group opened at `openIndex` is a **parameter list** —
 * an arrow's, or the one of `function name(…)` / `function (…)` / `catch (…)`.
 * The names it holds are bound, never read.
 */
export function isParameterList(text: string, openIndex: number): boolean {
  if (openIndex < 0 || text.charAt(openIndex) !== "(") {
    return false;
  }
  if (isArrowParameterList(text, openIndex)) {
    return true;
  }
  const callee = precedingWord(text, openIndex);
  if (PARAMETER_LIST_KEYWORDS.has(callee.word)) {
    return true;
  }
  return (
    callee.word !== "" &&
    PARAMETER_LIST_KEYWORDS.has(precedingWord(text, callee.start).word)
  );
}

/**
 * Whether the identifier ending at `end` is **bound** by a following `=` rather
 * than read through it: an assignment target (`open = 1`), a JSX attribute name
 * (`open={…}`) or a single-parameter arrow (`open => …`). A comparison
 * (`open === other`) is a genuine read.
 */
export function isEqualsBinding(text: string, end: number): boolean {
  const cursor = skipTrivia(text, end);
  return text.charAt(cursor) === "=" && text.charAt(cursor + 1) !== "=";
}

/** The offset of the first top-level occurrence of `character`, or `-1`. */
export function indexOfTopLevel(text: string, character: string): number {
  let depth = 0;
  let cursor = 0;
  while (cursor < text.length) {
    const current = text.charAt(cursor);
    if (current === "'" || current === '"') {
      cursor = skipQuoted(text, cursor);
      continue;
    }
    if (current === "`") {
      cursor = skipTemplate(text, cursor);
      continue;
    }
    if (current === "(" || current === "[" || current === "{") {
      depth += 1;
    } else if (current === ")" || current === "]" || current === "}") {
      depth -= 1;
    } else if (depth === 0 && current === character) {
      return cursor;
    }
    cursor += 1;
  }
  return -1;
}

/** One member of an object literal fragment. */
export interface ObjectEntry {
  /** The property key, absent for a spread. */
  readonly key?: string;
  /** The property value text, absent for a spread. */
  readonly value?: string;
  /** The spread expression text, when the member is `...expression`. */
  readonly spread?: string;
}

/** Parse `{ a: 1, b, ...rest }` into its members, or `undefined` when it is not an object literal. */
export function parseObjectEntries(text: string): ObjectEntry[] | undefined {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    return undefined;
  }
  const entries: ObjectEntry[] = [];
  for (const member of splitTopLevel(trimmed.slice(1, -1), ",")) {
    if (member.startsWith("...")) {
      entries.push({ spread: member.slice(3).trim() });
      continue;
    }
    const colon = indexOfTopLevel(member, ":");
    if (colon === -1) {
      entries.push({ key: member, value: member });
      continue;
    }
    const rawKey = member.slice(0, colon).trim();
    entries.push({
      key: unquote(rawKey) ?? rawKey,
      value: member.slice(colon + 1).trim(),
    });
  }
  return entries;
}

/** Print object-literal members back to source (`undefined` when there are none). */
export function printObjectLiteral(
  members: readonly string[],
): string | undefined {
  return members.length === 0 ? undefined : `{ ${members.join(", ")} }`;
}

/** Print one object-literal member, quoting keys that are not plain identifiers. */
export function printObjectMember(key: string, value: string): string {
  return `${isPlainIdentifier(key) ? key : quote(key)}: ${value}`;
}

/** Replace the first occurrence of `search` (plain text, never a pattern). */
export function replaceFirst(
  text: string,
  search: string,
  replacement: string,
): string {
  const index = text.indexOf(search);
  return index === -1
    ? text
    : text.slice(0, index) + replacement + text.slice(index + search.length);
}

/** The column the character at `index` occupies within its line. */
export function columnAt(text: string, index: number): number {
  return index - (text.lastIndexOf("\n", index - 1) + 1);
}

/** Indent every line of a fragment by `depth` levels of two spaces. */
export function indent(text: string, depth = 1): string {
  const padding = "  ".repeat(depth);
  return text
    .split("\n")
    .map((line) => (line.trim() === "" ? line : `${padding}${line}`))
    .join("\n");
}
