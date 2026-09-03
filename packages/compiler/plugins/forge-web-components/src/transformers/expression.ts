/**
 * Identifier-aware rewriting of neutral expression/statement **source text**.
 *
 * The Web-Components emitter is driven entirely by the generic AST, whose
 * expressions are `SourceBackedExpression` records — plain source text plus a
 * span — so the neutral → element-instance rewrites the target needs
 * (`properties.x` → `this.x`, `setX(v)` → `this.x = v`, a bare state read `x` →
 * `this.x`) are performed on that text rather than on a TypeScript tree.
 *
 * A naive `String#replace` would corrupt string literals, member names and
 * object keys, so the rewrite runs a small scanner that tracks the constructs
 * where an identifier must be left alone:
 * - string/template literals and comments are copied verbatim (a template
 *   literal's `${…}` holes are still rewritten, since they are real code),
 * - an identifier immediately preceded by `.` (or `?.`) is a **member name**,
 *   never a scope read — `foo.x` stays `foo.x` unless `foo` is the props
 *   parameter, and a `...spread` is *not* treated as a member access,
 * - an identifier in **object-literal key position** (`{ x: … }`) is left as the
 *   key, while the **shorthand** form (`{ x }`) expands to `{ x: this.x }`
 *   because `{ this.x }` is not valid syntax — shorthand is decided from the
 *   *enclosing bracket*, so `call(a, b)` and `[a, b]` keep positional arguments
 *   and elements rather than growing a bogus `b:` prefix,
 * - the **binding** side of a `const`/`let`/`var` declaration names what is
 *   written, not what is read: `const { tag = 'div' } = properties;` declares a
 *   local `tag` even when `tag` is also a reactive property, so only the
 *   declaration's initializer (and any pattern default) is rewritten.
 *
 * A bare read of the props parameter is the element itself (`properties` →
 * `this`), since the synthesised class holds every prop as a field and no
 * `properties` binding survives into `render()`.
 *
 * The neutral slot-presence marker `hasSlot('x')` is lowered here too, to the
 * native runtime's {@link HAS_SLOT_RUNTIME} call against the host element —
 * every target has to translate the marker itself, since it is compile-time
 * vocabulary rather than something a runtime can export unchanged.
 */

/** The element-instance scope a neutral expression is rewritten against. */
export interface ElementScope {
  /** Neutral props parameter name; each of its member reads becomes `this.<member>`. */
  readonly propsParameterName?: string;
  /** Reactive names (properties + state) that resolve to `this.<name>`. */
  readonly scoped: ReadonlySet<string>;
  /** `setX` → `x`, so a state setter call becomes a field assignment. */
  readonly setters: ReadonlyMap<string, string>;
  /**
   * Bare names that lower to a given **expression** rather than to
   * `this.<name>`.
   *
   * Used where a props destructuring cannot be replayed — a class field
   * initializer has no statement slot before it — so a local the pattern bound
   * has to become its member read with the pattern's default folded in
   * (`modelValue` → `(this.modelValue ?? 0)`).
   */
  readonly aliases?: ReadonlyMap<string, string>;
}

/** The scope of module-level code, which owns no element instance and rewrites nothing. */
export const MODULE_SCOPE: ElementScope = {
  scoped: new Set<string>(),
  setters: new Map<string, string>(),
};

/** Declaration keywords whose binding side names writes rather than reads. */
const DECLARATION_KEYWORDS: ReadonlySet<string> = new Set([
  "const",
  "let",
  "var",
]);

/** The neutral slot-presence marker (`hasSlot('footer')`). */
const HAS_SLOT_MARKER = "hasSlot";

/** The native runtime helper the marker lowers to, called with the host element. */
export const HAS_SLOT_RUNTIME = "hasSlotContent";

/** Convert a neutral callback prop name into the DOM custom-event spelling. */
function customEventNameOf(callbackName: string): string {
  const eventName = callbackName.slice(2);
  return (
    eventName.charAt(0).toLowerCase() +
    eventName
      .slice(1)
      .replace(/[A-Z]/gu, (character) => `-${character.toLowerCase()}`)
  );
}

/** Rewrite a React-style functional state update into a field assignment. */
function functionalSetterValue(
  argument: string,
  target: string,
  scope: ElementScope,
): string {
  const arrow =
    /^(?:\(\s*([A-Za-z_$][\w$]*)\s*\)|([A-Za-z_$][\w$]*))\s*=>\s*([\s\S]*)$/.exec(
      argument,
    );
  if (arrow === null) {
    return rewriteExpressionText(argument, scope);
  }
  const parameter = arrow[1] ?? arrow[2]!;
  const body = rewriteExpressionText(arrow[3]!.trim(), scope);
  return body.replace(new RegExp(`\\b${parameter}\\b`, "g"), `this.${target}`);
}

/** Replace callback-prop calls with typed, bubbling custom-event dispatches. */
function rewriteCustomEventCalls(text: string): string {
  const calls = /\bthis\.(on[A-Z][A-Za-z0-9_]*)\?\.\(/gu;
  let output = "";
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = calls.exec(text)) !== null) {
    const callbackName = match[1];
    if (callbackName === undefined) {
      continue;
    }
    const open = calls.lastIndex - 1;
    const close = matchingBracket(text, open);
    if (close < open) {
      break;
    }
    const argument = text.slice(open + 1, close).trim() || "undefined";
    const detailExpression =
      splitTopLevel(argument, ",")[0]?.trim() || "undefined";
    output += text.slice(cursor, match.index);
    if (argument === "eventDetail") {
      output += text.slice(match.index, close + 1);
      cursor = close + 1;
      calls.lastIndex = cursor;
      continue;
    }
    const detailType = `Parameters<NonNullable<typeof this.${callbackName}>>[0]`;
    output += `(() => { const callback = this.${callbackName}; const eventDetail = (${detailExpression}); this.dispatchEvent(new CustomEvent<${detailType}>(${JSON.stringify(customEventNameOf(callbackName))}, { detail: eventDetail, bubbles: true, composed: true })); return callback?.(${argument}); })()`;
    cursor = close + 1;
    calls.lastIndex = cursor;
  }
  return output.length === 0 ? text : output + text.slice(cursor);
}

/** Keywords whose presence means an expression may have an effect. */
const IMPURE_KEYWORDS: ReadonlySet<string> = new Set([
  "await",
  "class",
  "delete",
  "function",
  "new",
  "yield",
]);

/**
 * What an open bracket encloses, which decides whether a `,`-separated
 * identifier is an object-literal shorthand property or just a positional
 * argument/element.
 */
type BracketKind = "call" | "array" | "object" | "block";

/** The bracket an identifier sits in when the scanner holds no open bracket. */
const TOP_LEVEL_BRACKET: BracketKind = "call";

/** Punctuation after which a `{` opens an object literal rather than a block. */
const OBJECT_LITERAL_PUNCTUATION = "(,=:[?&|!+-*%^~";

/** Keywords after which a `{` opens an object literal rather than a block. */
const OBJECT_LITERAL_KEYWORDS: ReadonlySet<string> = new Set([
  "await",
  "case",
  "delete",
  "in",
  "instanceof",
  "new",
  "of",
  "return",
  "throw",
  "typeof",
  "void",
  "yield",
]);

/** Characters that may open an identifier (ASCII is enough for generated neutral sources). */
function isIdentifierStart(char: string | undefined): boolean {
  return char !== undefined && /[A-Za-z_$]/.test(char);
}

/** Characters that may continue an identifier. */
function isIdentifierPart(char: string | undefined): boolean {
  return char !== undefined && /[\w$]/.test(char);
}

/**
 * The start of the `//` comment covering `index` on its own line, or `-1`.
 *
 * The line is scanned forward with quote awareness, so the `//` of a URL inside
 * a string literal is not mistaken for the start of a comment.
 */
function lineCommentStart(text: string, index: number): number {
  let cursor = text.lastIndexOf("\n", index) + 1;
  while (cursor < index) {
    const char = text[cursor] ?? "";
    if (char === "'" || char === '"' || char === "`") {
      cursor = skipLiteral(text, cursor);
      continue;
    }
    if (char === "/" && text[cursor + 1] === "/") {
      return cursor;
    }
    cursor += 1;
  }
  return -1;
}

/**
 * Index of the closest **code** character before `index`, or `-1`.
 *
 * Comments are skipped, not just whitespace: the character before an identifier
 * decides whether it is a member name (`a.b`), an object key, or a scope read,
 * and a comment's own text must never cast that vote — a line ending in prose
 * such as `// … at its level.` would otherwise make the identifier below it look
 * like the `b` of `a.b` and leave it un-rewritten.
 */
function previousSignificant(text: string, index: number): number {
  let cursor = index - 1;
  while (cursor >= 0) {
    const char = text[cursor] ?? "";
    if (/\s/.test(char)) {
      cursor -= 1;
      continue;
    }
    if (char === "/" && text[cursor - 1] === "*") {
      const open = text.lastIndexOf("/*", cursor - 2);
      cursor = open - 1;
      continue;
    }
    const comment = lineCommentStart(text, cursor);
    if (comment >= 0) {
      // Inside a line comment: resume before the line it sits on.
      cursor = text.lastIndexOf("\n", comment) - 1;
      continue;
    }
    return cursor;
  }
  return -1;
}

/** Index of the closest non-whitespace character at or after `index`, or `-1`. */
function nextSignificant(text: string, index: number): number {
  let cursor = index;
  while (cursor < text.length && /\s/.test(text[cursor] ?? "")) {
    cursor += 1;
  }
  return cursor < text.length ? cursor : -1;
}

/** The end (exclusive) of the quoted literal that starts at `start`. */
function skipLiteral(text: string, start: number): number {
  const quote = text[start];
  let cursor = start + 1;
  while (cursor < text.length) {
    const char = text[cursor];
    if (char === "\\") {
      cursor += 2;
      continue;
    }
    if (quote === "`" && char === "$" && text[cursor + 1] === "{") {
      cursor = matchingBracket(text, cursor + 1) + 1;
      continue;
    }
    if (char === quote) {
      return cursor + 1;
    }
    cursor += 1;
  }
  return text.length;
}

/** The index of the bracket that closes the one opened at `openIndex`. */
export function matchingBracket(text: string, openIndex: number): number {
  const open = text[openIndex];
  const close = open === "(" ? ")" : open === "[" ? "]" : "}";
  let depth = 0;
  let cursor = openIndex;
  while (cursor < text.length) {
    const char = text[cursor] ?? "";
    if (char === "'" || char === '"' || char === "`") {
      cursor = skipLiteral(text, cursor);
      continue;
    }
    if (char === open) {
      depth += 1;
      cursor += 1;
      continue;
    }
    if (char === close) {
      depth -= 1;
      cursor += 1;
      if (depth === 0) {
        return cursor - 1;
      }
      continue;
    }
    cursor += 1;
  }
  return text.length - 1;
}

/** Whether a `/` at `index` opens a regular-expression literal rather than a division. */
function opensRegularExpression(text: string, index: number): boolean {
  const previousIndex = previousSignificant(text, index);
  if (previousIndex < 0) {
    return true;
  }
  const previous = text[previousIndex] ?? "";
  if ("(,=:[!&|?{};+-*%~^<>".includes(previous)) {
    return true;
  }
  let wordEnd = previousIndex + 1;
  let wordStart = wordEnd;
  while (wordStart > 0 && isIdentifierPart(text[wordStart - 1])) {
    wordStart -= 1;
  }
  return [
    "return",
    "typeof",
    "case",
    "in",
    "of",
    "new",
    "delete",
    "void",
  ].includes(text.slice(wordStart, wordEnd));
}

/**
 * Whether the `{` at `index` opens an **object literal** rather than a block.
 *
 * Only the token before the brace can tell the two apart: a brace in expression
 * position (after `(`, `,`, `=`, `:`, `return`, …) builds a value, while one
 * after `)`, `;`, `}` or an identifier opens a statement block. A brace at the
 * very start of the scanned text belongs to an expression fragment — a
 * declaration initializer, a call argument, a template hole — so it is a
 * literal.
 */
function opensObjectLiteral(text: string, index: number): boolean {
  const previousIndex = previousSignificant(text, index);
  if (previousIndex < 0) {
    return true;
  }
  const previous = text[previousIndex] ?? "";
  if (previous === ">") {
    // `=>` opens an arrow body, which is a block; a bare `>` is a comparison.
    return text[previousIndex - 1] !== "=";
  }
  if (OBJECT_LITERAL_PUNCTUATION.includes(previous)) {
    return true;
  }
  if (!isIdentifierPart(previous)) {
    return false;
  }
  let wordStart = previousIndex + 1;
  while (wordStart > 0 && isIdentifierPart(text[wordStart - 1])) {
    wordStart -= 1;
  }
  return OBJECT_LITERAL_KEYWORDS.has(text.slice(wordStart, previousIndex + 1));
}

/** The end (exclusive) of the regular-expression literal (with flags) starting at `start`. */
function skipRegularExpression(text: string, start: number): number {
  let cursor = start + 1;
  let inClass = false;
  while (cursor < text.length) {
    const char = text[cursor];
    if (char === "\\") {
      cursor += 2;
      continue;
    }
    if (char === "[") {
      inClass = true;
    } else if (char === "]") {
      inClass = false;
    } else if (char === "/" && !inClass) {
      cursor += 1;
      while (cursor < text.length && isIdentifierPart(text[cursor])) {
        cursor += 1;
      }
      return cursor;
    } else if (char === "\n") {
      return start + 1;
    }
    cursor += 1;
  }
  return text.length;
}

/** The end (exclusive) of the numeric literal starting at `start`. */
function skipNumber(text: string, start: number): number {
  let cursor = start + 1;
  while (cursor < text.length) {
    const char = text[cursor] ?? "";
    if (/[\dA-Za-z_]/.test(char)) {
      cursor += 1;
      continue;
    }
    if (char === "." && /\d/.test(text[cursor + 1] ?? "")) {
      cursor += 1;
      continue;
    }
    break;
  }
  return cursor;
}

/** The rewritten form of a single identifier occurrence, plus the cursor to resume from. */
interface IdentifierRewrite {
  text: string;
  end: number;
}

/** Split text on a top-level separator, skipping quoted and bracketed regions. */
export function splitTopLevel(text: string, separator: string): string[] {
  const parts: string[] = [];
  let last = 0;
  let cursor = 0;
  while (cursor < text.length) {
    const char = text[cursor] ?? "";
    if (char === "'" || char === '"' || char === "`") {
      cursor = skipLiteral(text, cursor);
      continue;
    }
    if (char === "(" || char === "[" || char === "{") {
      cursor = matchingBracket(text, cursor) + 1;
      continue;
    }
    if (char === separator) {
      parts.push(text.slice(last, cursor));
      last = cursor + 1;
    }
    cursor += 1;
  }
  parts.push(text.slice(last));
  return parts;
}

/** The index of the top-level `=` that separates a binding from its initializer, or `-1`. */
export function topLevelAssignmentIndex(text: string): number {
  let cursor = 0;
  while (cursor < text.length) {
    const char = text[cursor] ?? "";
    if (char === "'" || char === '"' || char === "`") {
      cursor = skipLiteral(text, cursor);
      continue;
    }
    if (char === "(" || char === "[" || char === "{") {
      cursor = matchingBracket(text, cursor) + 1;
      continue;
    }
    // A single `=`, never a comparison (`==`, `!=`, `<=`, `>=`) or an arrow.
    if (
      char === "=" &&
      text[cursor + 1] !== "=" &&
      text[cursor + 1] !== ">" &&
      !"=!<>".includes(text[cursor - 1] ?? "")
    ) {
      return cursor;
    }
    cursor += 1;
  }
  return -1;
}

/** The end (exclusive) of the declarator list a `const`/`let`/`var` keyword opens. */
function declarationEnd(text: string, start: number): number {
  let cursor = start;
  while (cursor < text.length) {
    const char = text[cursor] ?? "";
    if (char === "'" || char === '"' || char === "`") {
      cursor = skipLiteral(text, cursor);
      continue;
    }
    if (char === "(" || char === "[" || char === "{") {
      cursor = matchingBracket(text, cursor) + 1;
      continue;
    }
    // `;` ends a statement; `)` ends a `for (const … of …)` head.
    if (char === ";" || char === ")") {
      return cursor;
    }
    cursor += 1;
  }
  return text.length;
}

/**
 * Copy a binding form (an identifier, a destructuring pattern, or either with a
 * type annotation) verbatim, rewriting only the **defaults** nested inside a
 * pattern — a bound name is a write, so it never resolves to `this.`.
 */
function rewriteBinding(text: string, scope: ElementScope): string {
  let out = "";
  let cursor = 0;
  while (cursor < text.length) {
    const char = text[cursor] ?? "";
    if (char === "'" || char === '"' || char === "`") {
      const end = skipLiteral(text, cursor);
      out += text.slice(cursor, end);
      cursor = end;
      continue;
    }
    if (char === "{" || char === "[") {
      const close = matchingBracket(text, cursor);
      out += rewriteBindingPattern(text.slice(cursor, close + 1), scope);
      cursor = close + 1;
      continue;
    }
    out += char;
    cursor += 1;
  }
  return out;
}

/** Rewrite a destructuring pattern: its names stay, its element defaults are reads. */
function rewriteBindingPattern(pattern: string, scope: ElementScope): string {
  const elements = splitTopLevel(pattern.slice(1, -1), ",").map((element) => {
    const assignment = topLevelAssignmentIndex(element);
    return assignment < 0
      ? rewriteBinding(element, scope)
      : `${rewriteBinding(element.slice(0, assignment), scope)}=${rewriteExpressionText(element.slice(assignment + 1), scope)}`;
  });
  return `${pattern.slice(0, 1)}${elements.join(",")}${pattern.slice(-1)}`;
}

/**
 * Rewrite the declarator list that follows a `const`/`let`/`var` keyword: every
 * bound name (and its type annotation) is copied verbatim, while the
 * initializer — and the iterated expression of a `for (const x of xs)` head — is
 * rewritten into element-instance scope.
 */
function rewriteDeclaration(
  text: string,
  start: number,
  scope: ElementScope,
): IdentifierRewrite {
  const end = declarationEnd(text, start);
  const declarators = splitTopLevel(text.slice(start, end), ",").map(
    (declarator) => {
      const assignment = topLevelAssignmentIndex(declarator);
      if (assignment >= 0) {
        const binding = rewriteBinding(declarator.slice(0, assignment), scope);
        return `${binding}=${rewriteExpressionText(declarator.slice(assignment + 1), scope)}`;
      }
      const iterated = /^([\S\s]*?)\b(of|in)\b([\S\s]*)$/.exec(declarator);
      if (iterated !== null) {
        const [, binding = "", keyword = "", source = ""] = iterated;
        return `${rewriteBinding(binding, scope)}${keyword}${rewriteExpressionText(source, scope)}`;
      }
      return rewriteBinding(declarator, scope);
    },
  );
  return { text: declarators.join(","), end };
}

/** Rewrite the identifier spanning `[start, end)` according to the element scope. */
function rewriteIdentifier(
  text: string,
  start: number,
  end: number,
  name: string,
  scope: ElementScope,
  enclosing: BracketKind,
): IdentifierRewrite {
  const previousIndex = previousSignificant(text, start);
  const previous = previousIndex >= 0 ? (text[previousIndex] ?? "") : "";
  // `a.b` / `a?.b` — a member name is never a scope read, but the `.` of a
  // `...spread` must not be mistaken for one.
  if (previous === "." && text[previousIndex - 1] !== ".") {
    return { text: name, end };
  }

  const nextIndex = nextSignificant(text, end);
  const next = nextIndex >= 0 ? (text[nextIndex] ?? "") : "";

  // `hasSlot('x')` → `hasSlotContent(this, 'x')`; the marker never survives.
  if (name === HAS_SLOT_MARKER && next === "(" && !scope.scoped.has(name)) {
    const close = matchingBracket(text, nextIndex);
    const argument = text.slice(nextIndex + 1, close).trim();
    // An omitted (or `'default'`) name targets the default slot, which the
    // runtime helper resolves from its single-argument form.
    const slot =
      argument.length === 0
        ? ""
        : `, ${rewriteExpressionText(argument, scope)}`;
    return { text: `${HAS_SLOT_RUNTIME}(this${slot})`, end: close + 1 };
  }
  // Key or shorthand position, but only inside an object literal: the very same
  // `, name,` shape is a positional argument in `call(a, b)` and an element in
  // `[a, b]`, neither of which may grow a `name:` prefix.
  const inObjectPosition =
    enclosing === "object" && (previous === "{" || previous === ",");

  // `properties.x` / `properties?.x` → `this.x`; a bare `properties` read is the
  // element itself, since every prop lives on the instance.
  if (name === scope.propsParameterName) {
    const dotIndex =
      next === "."
        ? nextIndex
        : next === "?" && text[nextIndex + 1] === "."
          ? nextIndex + 1
          : -1;
    if (dotIndex >= 0) {
      const memberStart = nextSignificant(text, dotIndex + 1);
      if (memberStart >= 0 && isIdentifierStart(text[memberStart])) {
        let memberEnd = memberStart + 1;
        while (memberEnd < text.length && isIdentifierPart(text[memberEnd])) {
          memberEnd += 1;
        }
        return {
          text: `this.${text.slice(memberStart, memberEnd)}`,
          end: memberEnd,
        };
      }
    }
    if (inObjectPosition && next === ":") {
      return { text: name, end };
    }
    return {
      text:
        inObjectPosition && (next === "}" || next === ",")
          ? `${name}: this`
          : "this",
      end,
    };
  }

  // `setX(value)` → `this.x = value`.
  const getter = scope.setters.get(name);
  if (getter !== undefined && next === "(") {
    const close = matchingBracket(text, nextIndex);
    const argument = text
      .slice(nextIndex + 1, close)
      .trim()
      .replace(/,\s*$/, "");
    const value =
      argument.length === 0
        ? "undefined"
        : functionalSetterValue(argument, getter, scope);
    return { text: `this.${getter} = ${value}`, end: close + 1 };
  }

  // A name a props pattern bound, read from a scope the pattern cannot be
  // replayed into: lower it to its member, with the pattern's default folded in.
  const alias = scope.aliases?.get(name);
  if (alias !== undefined) {
    if (inObjectPosition && next === ":") {
      return { text: name, end };
    }
    return {
      text:
        inObjectPosition && (next === "}" || next === ",")
          ? `${name}: ${alias}`
          : alias,
      end,
    };
  }

  if (!scope.scoped.has(name)) {
    return { text: name, end };
  }

  // `{ x: … }` — the key is not a read.
  if (inObjectPosition && next === ":") {
    return { text: name, end };
  }
  // `{ x }` shorthand — the identifier is both key and read, so it must expand.
  if (inObjectPosition && (next === "}" || next === ",")) {
    return { text: `${name}: this.${name}`, end };
  }
  return { text: `this.${name}`, end };
}

/**
 * Rewrite neutral expression or statement text into its element-instance form.
 *
 * Returns the text unchanged when the scope has nothing to rewrite (module-level
 * code), so retained declarations stay byte-identical to their neutral source.
 */
export function rewriteExpressionText(
  text: string,
  scope: ElementScope,
): string {
  if (
    text.length === 0 ||
    (scope.propsParameterName === undefined &&
      scope.scoped.size === 0 &&
      scope.setters.size === 0 &&
      (scope.aliases?.size ?? 0) === 0)
  ) {
    return text;
  }
  let out = "";
  let cursor = 0;
  const brackets: BracketKind[] = [];
  while (cursor < text.length) {
    const char = text[cursor] ?? "";
    if (char === "'" || char === '"') {
      const end = skipLiteral(text, cursor);
      out += text.slice(cursor, end);
      cursor = end;
      continue;
    }
    if (char === "`") {
      const literal = rewriteTemplateLiteral(text, cursor, scope);
      out += literal.text;
      cursor = literal.end;
      continue;
    }
    if (char === "/" && text[cursor + 1] === "/") {
      const newline = text.indexOf("\n", cursor);
      const end = newline === -1 ? text.length : newline;
      out += text.slice(cursor, end);
      cursor = end;
      continue;
    }
    if (char === "/" && text[cursor + 1] === "*") {
      const close = text.indexOf("*/", cursor + 2);
      const end = close === -1 ? text.length : close + 2;
      out += text.slice(cursor, end);
      cursor = end;
      continue;
    }
    if (char === "/" && opensRegularExpression(text, cursor)) {
      const end = skipRegularExpression(text, cursor);
      out += text.slice(cursor, end);
      cursor = end;
      continue;
    }
    if (/\d/.test(char)) {
      const end = skipNumber(text, cursor);
      out += text.slice(cursor, end);
      cursor = end;
      continue;
    }
    if (char === "(" || char === "[" || char === "{") {
      brackets.push(
        char === "("
          ? "call"
          : char === "["
            ? "array"
            : opensObjectLiteral(text, cursor)
              ? "object"
              : "block",
      );
      out += char;
      cursor += 1;
      continue;
    }
    if (char === ")" || char === "]" || char === "}") {
      brackets.pop();
      out += char;
      cursor += 1;
      continue;
    }
    if (isIdentifierStart(char)) {
      let end = cursor + 1;
      while (end < text.length && isIdentifierPart(text[end])) {
        end += 1;
      }
      const name = text.slice(cursor, end);
      // A declaration binds names; only its initializer reads the element scope.
      if (
        DECLARATION_KEYWORDS.has(name) &&
        text[previousSignificant(text, cursor)] !== "."
      ) {
        const declaration = rewriteDeclaration(text, end, scope);
        out += name + declaration.text;
        cursor = declaration.end;
        continue;
      }
      const rewritten = rewriteIdentifier(
        text,
        cursor,
        end,
        name,
        scope,
        brackets.at(-1) ?? TOP_LEVEL_BRACKET,
      );
      out += rewritten.text;
      cursor = rewritten.end;
      continue;
    }
    out += char;
    cursor += 1;
  }
  return rewriteCustomEventCalls(out);
}

/** Copy a template literal verbatim while rewriting the code inside its `${…}` holes. */
function rewriteTemplateLiteral(
  text: string,
  start: number,
  scope: ElementScope,
): IdentifierRewrite {
  let out = "`";
  let cursor = start + 1;
  while (cursor < text.length) {
    const char = text[cursor] ?? "";
    if (char === "\\") {
      out += text.slice(cursor, cursor + 2);
      cursor += 2;
      continue;
    }
    if (char === "`") {
      return { text: `${out}\``, end: cursor + 1 };
    }
    if (char === "$" && text[cursor + 1] === "{") {
      const close = matchingBracket(text, cursor + 1);
      out += `\${${rewriteExpressionText(text.slice(cursor + 2, close), scope)}}`;
      cursor = close + 1;
      continue;
    }
    out += char;
    cursor += 1;
  }
  return { text: out, end: cursor };
}

/**
 * The body of a zero-argument arrow function: either the single expression a
 * concise arrow returns, or the statements of a block-bodied one.
 */
export type ArrowFactoryBody =
  | { readonly kind: "expression"; readonly text: string }
  | { readonly kind: "block"; readonly text: string };

/**
 * Split a zero-argument arrow function's source text into its body.
 *
 * A `useMemo` factory is written either concisely (`() => items.length`) or with
 * a block (`() => { const … ; return … ; }`), and the two lower to different
 * getter shapes — returning a block's text as if it were an expression makes its
 * `{` parse as an object literal. Returns `undefined` when the text is not a
 * zero-argument arrow, so the caller can fall back to invoking it.
 */
export function splitArrowFactoryBody(
  text: string,
): ArrowFactoryBody | undefined {
  const trimmed = text.trim();
  // An optional return-type annotation may sit between the parameters and `=>`.
  const header = /^\(\s*\)\s*(?::[^;=>]*)?=>/.exec(trimmed);
  if (header === null) {
    return undefined;
  }
  const body = trimmed.slice(header[0].length).trim();
  if (body.length === 0) {
    return undefined;
  }
  if (!body.startsWith("{")) {
    return { kind: "expression", text: body };
  }
  // `() => { … }` is a block; an object literal has to be parenthesised.
  return matchingBracket(body, 0) === body.length - 1
    ? { kind: "block", text: body.slice(1, -1) }
    : undefined;
}

/**
 * Whether the text is a **function-valued** expression — an arrow or a
 * `function` expression.
 *
 * Creating a closure has no effect of its own, so such a render-head constant
 * can be promoted to an element member (see `../lower`) however impure its body
 * is: the body still runs exactly when it is called.
 */
export function isFunctionExpressionText(text: string): boolean {
  const trimmed = stripOuterParentheses(text);
  const body = /^async\s/.test(trimmed) ? trimmed.slice(5).trim() : trimmed;
  if (/^function\b/.test(body) || /^[A-Za-z_$][\w$]*\s*=>/.test(body)) {
    return true;
  }
  if (!body.startsWith("(")) {
    return false;
  }
  // `(…)` may be a parameter list or just a parenthesised value; only an arrow
  // follows it with `=>` (possibly past a return-type annotation).
  const rest = body.slice(matchingBracket(body, 0) + 1).trim();
  const arrow = rest.startsWith(":") ? rest.slice(rest.indexOf("=>")) : rest;
  return arrow.startsWith("=>");
}

/**
 * Whether an expression is **provably** free of effects: no call, no `new`, no
 * `await`, no assignment and no increment, at any depth.
 *
 * Used to decide whether a render-head constant may be promoted to a getter.
 * The test is deliberately syntactic and pessimistic — a call to a pure helper
 * is indistinguishable from a call to a mutator, so any call disqualifies the
 * statement and it stays in `render()`.
 */
export function isPureExpressionText(text: string): boolean {
  let cursor = 0;
  // Whether the previous token produces a value, which makes a following `(` a
  // call and a following backtick a tagged template rather than grouping.
  let afterValue = false;
  while (cursor < text.length) {
    const char = text[cursor] ?? "";
    if (char === "'" || char === '"') {
      cursor = skipLiteral(text, cursor);
      afterValue = true;
      continue;
    }
    if (char === "`") {
      // A tagged template is a call, and a hole may contain one.
      if (
        afterValue ||
        text.slice(cursor, skipLiteral(text, cursor)).includes("${")
      ) {
        return false;
      }
      cursor = skipLiteral(text, cursor);
      afterValue = true;
      continue;
    }
    if (char === "(") {
      if (afterValue) {
        return false;
      }
      cursor += 1;
      continue;
    }
    // An assignment, but not a comparison (`==`, `!=`, `<=`, `>=`) or an arrow.
    // A compound assignment (`+=`) keeps its `=`, so it is caught here too.
    if (
      char === "=" &&
      text[cursor + 1] !== "=" &&
      text[cursor + 1] !== ">" &&
      !"=!<>".includes(text[cursor - 1] ?? "")
    ) {
      return false;
    }
    if ((char === "+" || char === "-") && text[cursor + 1] === char) {
      return false;
    }
    if (isIdentifierStart(char)) {
      let end = cursor + 1;
      while (end < text.length && isIdentifierPart(text[end])) {
        end += 1;
      }
      if (IMPURE_KEYWORDS.has(text.slice(cursor, end))) {
        return false;
      }
      cursor = end;
      afterValue = true;
      continue;
    }
    if (/\d/.test(char)) {
      cursor = skipNumber(text, cursor);
      afterValue = true;
      continue;
    }
    afterValue = char === ")" || char === "]" || char === "}";
    cursor += 1;
  }
  return true;
}

/** Strip a single redundant pair of wrapping parentheses from an expression's text. */
export function stripOuterParentheses(text: string): string {
  let current = text.trim();
  while (
    current.startsWith("(") &&
    matchingBracket(current, 0) === current.length - 1
  ) {
    current = current.slice(1, -1).trim();
  }
  return current;
}

/**
 * Split a conditional expression's text into its three parts, or `undefined`
 * when the text is not a top-level `cond ? a : b`. Nullish/optional-chaining
 * `?` tokens and every bracketed or quoted region are skipped, so only the real
 * conditional operator is matched.
 */
export function splitConditional(
  text: string,
): { condition: string; whenTrue: string; whenFalse: string } | undefined {
  let cursor = 0;
  let questionIndex = -1;
  while (cursor < text.length) {
    const char = text[cursor] ?? "";
    if (char === "'" || char === '"' || char === "`") {
      cursor = skipLiteral(text, cursor);
      continue;
    }
    if (char === "(" || char === "[" || char === "{") {
      cursor = matchingBracket(text, cursor) + 1;
      continue;
    }
    if (char === "?") {
      if (text[cursor + 1] === "?" || text[cursor + 1] === ".") {
        cursor += 2;
        continue;
      }
      questionIndex = cursor;
      break;
    }
    cursor += 1;
  }
  if (questionIndex === -1) {
    return undefined;
  }
  let depth = 0;
  cursor = questionIndex + 1;
  while (cursor < text.length) {
    const char = text[cursor] ?? "";
    if (char === "'" || char === '"' || char === "`") {
      cursor = skipLiteral(text, cursor);
      continue;
    }
    if (char === "(" || char === "[" || char === "{") {
      cursor = matchingBracket(text, cursor) + 1;
      continue;
    }
    if (char === "?" && text[cursor + 1] !== "?" && text[cursor + 1] !== ".") {
      depth += 1;
    } else if (char === ":") {
      if (depth === 0) {
        return {
          condition: text.slice(0, questionIndex),
          whenTrue: text.slice(questionIndex + 1, cursor),
          whenFalse: text.slice(cursor + 1),
        };
      }
      depth -= 1;
    }
    cursor += 1;
  }
  return undefined;
}

/** Split a top-level `left && right` expression, or `undefined` when there is none. */
export function splitLogicalAnd(
  text: string,
): { left: string; right: string } | undefined {
  let cursor = 0;
  while (cursor < text.length) {
    const char = text[cursor] ?? "";
    if (char === "'" || char === '"' || char === "`") {
      cursor = skipLiteral(text, cursor);
      continue;
    }
    if (char === "(" || char === "[" || char === "{") {
      cursor = matchingBracket(text, cursor) + 1;
      continue;
    }
    if (char === "&" && text[cursor + 1] === "&") {
      return { left: text.slice(0, cursor), right: text.slice(cursor + 2) };
    }
    cursor += 1;
  }
  return undefined;
}
