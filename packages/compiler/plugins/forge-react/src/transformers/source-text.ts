/**
 * Bracket- and string-aware scanning helpers used to lower the **source text**
 * carried by the generic AST.
 *
 * The enriched IR hands the emitter exact source substrings
 * (`GenericStatement.text`, `SourceBackedExpression.text`) rather than a
 * TypeScript node tree, so the neutral constructs that live *inside* an
 * expression — `h(Slot, …)`, `hasSlot('x')`, `i18next.t(…)`, the `h(…)` props
 * object — are rewritten on that text. These helpers keep the rewrites honest:
 * they never match inside a string, template or comment, and they respect
 * nesting when splitting call arguments.
 */

/** A located call expression: `<callee>(<argumentsText>)`. */
export interface CallSite {
  /** Index of the first character of the callee name. */
  readonly start: number;
  /** Index just past the closing `)`. */
  readonly end: number;
  /** The raw text between the parentheses. */
  readonly argumentsText: string;
}

const IDENTIFIER_PATTERN = /^[A-Za-z_$][\w$]*$/;

/** Whether `name` may be written as a bare identifier (object key, member access). */
export function isIdentifierName(name: string): boolean {
  return IDENTIFIER_PATTERN.test(name);
}

/** `object.name`, or `object["name"]` when the name is not a bare identifier. */
export function memberAccess(object: string, name: string): string {
  return isIdentifierName(name)
    ? `${object}.${name}`
    : `${object}[${quoteString(name)}]`;
}

/**
 * Quote a string as a double-quoted JS literal (escaping as needed).
 *
 * Every literal the React emitter *synthesises* — a slot name, a lowered JSX
 * attribute value, an `h(…)` props key — is double-quoted, matching the rest of
 * the generated block; text sliced verbatim from the neutral source keeps
 * whatever quoting the author wrote.
 */
export function quoteString(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("\n", "\\n")}"`;
}

/** Quote a string as a double-quoted JSX attribute value (falling back to single quotes). */
export function quoteAttributeValue(value: string): string {
  return value.includes('"')
    ? `'${value.replaceAll("'", "&apos;")}'`
    : `"${value}"`;
}

/** Whether the character can appear inside an identifier. */
function isIdentifierChar(character: string | undefined): boolean {
  return character !== undefined && /[\w$]/.test(character);
}

/**
 * Advance past the token starting at `index` when it opens a string, template
 * or comment; returns the index just past it, or `index` when the character
 * starts no such token.
 */
export function skipAtomicToken(text: string, index: number): number {
  const character = text[index];
  if (character === "'" || character === '"') {
    let cursor = index + 1;
    while (cursor < text.length) {
      if (text[cursor] === "\\") {
        cursor += 2;
        continue;
      }
      if (text[cursor] === character) {
        return cursor + 1;
      }
      cursor += 1;
    }
    return text.length;
  }
  if (character === "`") {
    let cursor = index + 1;
    while (cursor < text.length) {
      if (text[cursor] === "\\") {
        cursor += 2;
        continue;
      }
      if (text[cursor] === "`") {
        return cursor + 1;
      }
      // A `${…}` substitution may itself contain strings and braces.
      if (text[cursor] === "$" && text[cursor + 1] === "{") {
        cursor = matchingBracket(text, cursor + 1) + 1;
        continue;
      }
      cursor += 1;
    }
    return text.length;
  }
  if (character === "/" && text[index + 1] === "/") {
    const newline = text.indexOf("\n", index);
    return newline === -1 ? text.length : newline;
  }
  if (character === "/" && text[index + 1] === "*") {
    const close = text.indexOf("*/", index);
    return close === -1 ? text.length : close + 2;
  }
  return index;
}

const CLOSING_BRACKETS: Readonly<Record<string, string>> = {
  "(": ")",
  "[": "]",
  "{": "}",
};

/**
 * Index of the bracket closing the one at `openIndex` (string/template/comment
 * aware). Returns `text.length` when the text is unbalanced.
 */
export function matchingBracket(text: string, openIndex: number): number {
  const open = text[openIndex] ?? "";
  const close = CLOSING_BRACKETS[open];
  if (close === undefined) {
    return openIndex;
  }
  let depth = 0;
  let cursor = openIndex;
  while (cursor < text.length) {
    const skipped = skipAtomicToken(text, cursor);
    if (skipped !== cursor) {
      cursor = skipped;
      continue;
    }
    const character = text[cursor];
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
  return text.length;
}

/**
 * The characters that may follow a top-level `{…}` **type literal** while the
 * return-type annotation continues (`{ a } | { b }`, `{ a } & B`, `{ a }[]`).
 * Anything else means the literal ended the annotation, so the brace after it
 * opens the function body. Continuations that only occur *inside* a bracketed
 * type (`,`, `)`, `>`) are excluded: at depth 0 they cannot belong to the
 * annotation.
 */
const TYPE_CONTINUATION: ReadonlySet<string> = new Set(["|", "&", "["]);

/** Index of the next character that is neither whitespace nor a comment. */
function nextSignificantIndex(text: string, from: number): number {
  let cursor = from;
  while (cursor < text.length) {
    const character = text[cursor] ?? "";
    if (/\s/.test(character)) {
      cursor += 1;
      continue;
    }
    if (
      character === "/" &&
      (text[cursor + 1] === "/" || text[cursor + 1] === "*")
    ) {
      cursor = skipAtomicToken(text, cursor);
      continue;
    }
    return cursor;
  }
  return text.length;
}

/**
 * Index of the `{` opening a function body, scanning from `from`.
 *
 * The scan has to survive the *return-type annotation*, which may itself
 * contain braces (`(): { a: string } {`), angle brackets (`(): Map<K, V> {`),
 * arrows (`(): () => void {`), strings (`(): 'a' | 'b' {`) and comments. A
 * `{` reached at depth 0 is therefore only the body brace when nothing that
 * continues a type follows its matching `}`; otherwise it is a type literal
 * and the scan resumes past it.
 */
function bodyBraceIndex(text: string, from: number): number {
  let depth = 0;
  let cursor = from;
  while (cursor < text.length) {
    const skipped = skipAtomicToken(text, cursor);
    if (skipped !== cursor) {
      cursor = skipped;
      continue;
    }
    const character = text[cursor] ?? "";
    // `=>` in a function type — its `>` closes no bracket.
    if (character === "=" && text[cursor + 1] === ">") {
      cursor += 2;
      continue;
    }
    switch (character) {
      case "(":
      case "[":
      case "<": {
        depth += 1;
        break;
      }
      case ")":
      case "]":
      case ">": {
        depth = Math.max(0, depth - 1);
        break;
      }
      case "{": {
        const close = matchingBracket(text, cursor);
        if (depth > 0) {
          cursor = close + 1;
          continue;
        }
        const next = nextSignificantIndex(text, close + 1);
        const following = text[next] ?? "";
        // A type literal the annotation continues past, or the next literal in
        // a `{ a } {` chain — either way the body brace is still ahead.
        if (
          next < text.length &&
          (TYPE_CONTINUATION.has(following) || following === "{")
        ) {
          cursor = next;
          continue;
        }
        return cursor;
      }
      // No default
    }
    cursor += 1;
  }
  return -1;
}

/**
 * The return-type annotation the function named `name` declares in `text`
 * (`function ForgeBadge(p): MpElement { … }` → `MpElement`), or `undefined`
 * when it declares none.
 *
 * The generic AST models a component's parameter and body but not its return
 * type, so the annotation is recovered from the module source — a neutral
 * `MpElement` there is what makes the emitted React component read as
 * `(): ReactElement`. The declaration is located by name rather than by span:
 * `GenericModuleAst.source` is the *printed* neutral tree, whose offsets no
 * longer line up with the spans taken from the original buffer.
 */
export function readReturnTypeAnnotation(
  text: string,
  name: string,
): string | undefined {
  if (!isIdentifierName(name)) {
    return undefined;
  }
  const declaration = new RegExp(String.raw`\bfunction\s+${name}\s*\(`).exec(
    text,
  );
  if (declaration === null) {
    return undefined;
  }
  const open = declaration.index + declaration[0].length - 1;
  const close = matchingBracket(text, open);
  const body = close >= text.length ? -1 : bodyBraceIndex(text, close + 1);
  if (body === -1) {
    return undefined;
  }
  const between = text.slice(close + 1, body).trim();
  if (!between.startsWith(":")) {
    return undefined;
  }
  const annotation = between.slice(1).trim();
  return annotation.length === 0 ? undefined : annotation;
}

/** Split an argument / element list on its **top-level** commas. */
export function splitTopLevelArguments(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  let cursor = 0;
  while (cursor < text.length) {
    const skipped = skipAtomicToken(text, cursor);
    if (skipped !== cursor) {
      cursor = skipped;
      continue;
    }
    const character = text[cursor] ?? "";
    if (character === "(" || character === "[" || character === "{") {
      depth += 1;
    } else if (character === ")" || character === "]" || character === "}") {
      depth -= 1;
    } else if (character === "," && depth === 0) {
      parts.push(text.slice(start, cursor));
      start = cursor + 1;
    }
    cursor += 1;
  }
  parts.push(text.slice(start));
  return parts.map((part) => part.trim()).filter((part) => part.length > 0);
}

/** Locate the next `<calleeName>(…)` call at or after `from`. */
export function findCall(
  text: string,
  calleeName: string,
  from: number,
): CallSite | undefined {
  let cursor = from;
  while (cursor < text.length) {
    const skipped = skipAtomicToken(text, cursor);
    if (skipped !== cursor) {
      cursor = skipped;
      continue;
    }
    if (!text.startsWith(calleeName, cursor)) {
      cursor += 1;
      continue;
    }
    const before = text[cursor - 1];
    const after = text[cursor + calleeName.length];
    if (isIdentifierChar(before) || before === "." || isIdentifierChar(after)) {
      cursor += 1;
      continue;
    }
    let open = cursor + calleeName.length;
    while (open < text.length && /\s/.test(text[open] ?? "")) {
      open += 1;
    }
    if (text[open] !== "(") {
      cursor += 1;
      continue;
    }
    const close = matchingBracket(text, open);
    return {
      start: cursor,
      end: close + 1,
      argumentsText: text.slice(open + 1, close),
    };
  }
  return undefined;
}

/**
 * Rewrite every `<calleeName>(…)` call in `text`, innermost arguments first.
 * `rewrite` receives the already-rewritten arguments (split on top-level
 * commas, plus their raw joined text) and returns the replacement, or
 * `undefined` to keep the call as-is.
 */
export function rewriteCalls(
  text: string,
  calleeName: string,
  rewrite: (
    argumentList: readonly string[],
    argumentsText: string,
  ) => string | undefined,
): string {
  let result = "";
  let index = 0;
  for (;;) {
    const site = findCall(text, calleeName, index);
    if (site === undefined) {
      return result + text.slice(index);
    }
    const innerText = rewriteCalls(site.argumentsText, calleeName, rewrite);
    const replacement = rewrite(splitTopLevelArguments(innerText), innerText);
    result += text.slice(index, site.start);
    result += replacement ?? `${calleeName}(${innerText})`;
    index = site.end;
  }
}

/** Read the text of a string literal (single, double or plain template), or `undefined`. */
export function readStringLiteral(text: string): string | undefined {
  const trimmed = text.trim();
  if (trimmed.length < 2) {
    return undefined;
  }
  const quote = trimmed[0];
  if (
    (quote !== "'" && quote !== '"' && quote !== "`") ||
    !trimmed.endsWith(quote)
  ) {
    return undefined;
  }
  const inner = trimmed.slice(1, -1);
  return inner.includes(quote) || (quote === "`" && inner.includes("${"))
    ? undefined
    : inner;
}

/** Replace the first occurrence of `search` in `text` (plain text, never a pattern). */
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

/** The indentation (column) of the character at `index` within its line. */
export function columnAt(text: string, index: number): number {
  const lineStart = text.lastIndexOf("\n", index - 1) + 1;
  return index - lineStart;
}

/** Re-indent every line but the first by `indent` spaces. */
export function indentContinuationLines(text: string, indent: number): string {
  if (indent === 0 || !text.includes("\n")) {
    return text;
  }
  const padding = " ".repeat(indent);
  return text
    .split("\n")
    .map((line, position) =>
      position === 0 || line.length === 0 ? line : padding + line,
    )
    .join("\n");
}
