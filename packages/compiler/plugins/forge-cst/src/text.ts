/**
 * Token-aware lexical and text scanning utilities shared across Forge compiler plugins.
 *
 * Provides single-source implementations for string literal masking, bracket matching,
 * top-level splitting, and identifier classification.
 */

/** Characters that can enclose string literals. */
const QUOTES: ReadonlySet<string> = new Set(["'", '"', "`"]);

/** The bracket that closes each opening bracket. */
const CLOSING_BRACKETS: ReadonlyMap<string, string> = new Map([
  ["(", ")"],
  ["[", "]"],
  ["{", "}"],
]);

/** Pattern matching valid ECMAScript plain identifier names. */
const IDENTIFIER_PATTERN = /^[A-Za-z_$][\w$]*$/;

/** Whether the character can start a JavaScript identifier. */
export function isIdentifierStart(character: string | undefined): boolean {
  return character !== undefined && /[A-Za-z_$]/.test(character);
}

/** Whether the character can continue a JavaScript identifier. */
export function isIdentifierPart(character: string | undefined): boolean {
  return character !== undefined && /[\w$]/.test(character);
}

/** Whether a string is a valid plain JavaScript identifier name. */
export function isPlainIdentifier(name: string): boolean {
  return IDENTIFIER_PATTERN.test(name);
}

/** Alias for isPlainIdentifier. */
export function isIdentifierName(name: string): boolean {
  return IDENTIFIER_PATTERN.test(name);
}

/**
 * Returns `<object>.<key>` for plain identifiers, or `<object>["<key>"]` (bracket notation) otherwise.
 */
export function memberAccess(object: string, key: string): string {
  return isPlainIdentifier(key)
    ? `${object}.${key}`
    : `${object}[${JSON.stringify(key)}]`;
}

/**
 * Double-quoted string literal for emitted code (JSON encoded).
 */
export function quoteString(value: string): string {
  return JSON.stringify(value);
}

/** Alias for quoteString. */
export function quote(value: string): string {
  return JSON.stringify(value);
}

/**
 * Unquotes a string literal if wrapped in single, double, or backtick quotes, or undefined if not.
 */
export function unquote(text: string): string | undefined {
  const trimmed = text.trim();
  if (trimmed.length < 2) {
    return undefined;
  }
  const first = trimmed.charAt(0);
  const last = trimmed.charAt(trimmed.length - 1);
  if ((first === '"' || first === "'" || first === "`") && first === last) {
    if (first === "`") {
      return trimmed.slice(1, -1);
    }
    try {
      const normalized =
        first === "'"
          ? `"${trimmed.slice(1, -1).replace(/\\'/g, "'").replace(/"/g, '\\"')}"`
          : trimmed;
      return JSON.parse(normalized) as string;
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  return undefined;
}

/**
 * Quote a string as a JSX attribute value.
 */
export function quoteAttributeValue(value: string): string {
  return value.includes('"')
    ? `'${value.replaceAll("'", "&apos;")}'`
    : `"${value}"`;
}

/**
 * Compute a boolean mask marking every index in `text` that sits inside a string literal,
 * template literal or comment. Positions marked `true` are literal content and must never
 * be rewritten structurally.
 */
export function maskLiterals(text: string): boolean[] {
  const mask = Array.from({ length: text.length }, () => false);
  let index = 0;
  while (index < text.length) {
    const character = text[index];
    const next = text[index + 1];

    // Single-line comment
    if (character === "/" && next === "/") {
      while (index < text.length && text[index] !== "\n") {
        mask[index] = true;
        index += 1;
      }
      continue;
    }

    // Multi-line comment
    if (character === "/" && next === "*") {
      while (
        index < text.length &&
        !(text[index] === "*" && text[index + 1] === "/")
      ) {
        mask[index] = true;
        index += 1;
      }
      if (index < text.length) {
        mask[index] = true;
        mask[index + 1] = true;
        index += 2;
      }
      continue;
    }

    // String / Template literals
    if (QUOTES.has(character)) {
      const quoteChar = character;
      mask[index] = true;
      index += 1;
      while (index < text.length) {
        if (text[index] === "\\") {
          mask[index] = true;
          if (index + 1 < text.length) {
            mask[index + 1] = true;
          }
          index += 2;
          continue;
        }

        // Template interpolation: `${ ... }`
        if (
          quoteChar === "`" &&
          text[index] === "$" &&
          text[index + 1] === "{"
        ) {
          mask[index] = true;
          mask[index + 1] = true;
          const end = matchBracket(text, index + 1);
          index = end === -1 ? text.length : end;
          if (index < text.length) {
            mask[index] = true;
            index += 1;
          }
          continue;
        }

        mask[index] = true;
        if (text[index] === quoteChar) {
          index += 1;
          break;
        }
        index += 1;
      }
      continue;
    }

    index += 1;
  }
  return mask;
}

/**
 * Index of the bracket matching the opening bracket at `start`, or `-1` when the
 * text is unbalanced. Literal and comment regions are skipped.
 */
export function matchBracket(text: string, start: number): number {
  const open = text[start];
  const close = CLOSING_BRACKETS.get(open);
  if (close === undefined) {
    return -1;
  }
  const mask = maskLiterals(text.slice(start));
  let depth = 0;
  for (let index = start; index < text.length; index += 1) {
    if (mask[index - start] === true) {
      continue;
    }
    const character = text[index];
    if (character === open) {
      depth += 1;
    } else if (character === close) {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }
  return -1;
}

/**
 * The index just past the `>` closing the type-argument list opened at `start`,
 * or `-1` when the list never closes.
 */
export function endOfTypeArguments(text: string, start: number): number {
  if (text[start] !== "<") {
    return -1;
  }
  const mask = maskLiterals(text);
  let angles = 0;
  let brackets = 0;
  for (let index = start; index < text.length; index += 1) {
    if (mask[index] === true) {
      continue;
    }
    const character = text[index];
    if (character === "=" && text[index + 1] === ">") {
      index += 1;
      continue;
    }
    if (character === "(" || character === "[" || character === "{") {
      brackets += 1;
      continue;
    }
    if (character === ")" || character === "]" || character === "}") {
      brackets -= 1;
      if (brackets < 0) {
        return -1;
      }
      continue;
    }
    if (character === "<") {
      angles += 1;
      continue;
    }
    if (character === ">") {
      angles -= 1;
      if (angles === 0 && brackets === 0) {
        return index + 1;
      }
    }
  }
  return -1;
}

/**
 * Split `text` on every top-level occurrence of `separator` (a single
 * character), ignoring separators nested in brackets, strings or comments.
 */
export function splitTopLevel(text: string, separator: string): string[] {
  const mask = maskLiterals(text);
  const parts: string[] = [];
  let depth = 0;
  let angle = 0;
  let start = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (mask[index]) {
      continue;
    }
    const character = text[index];
    if (character === "(" || character === "[" || character === "{") {
      depth += 1;
      continue;
    }
    if (character === ")" || character === "]" || character === "}") {
      depth -= 1;
      continue;
    }
    if (character === "<") {
      angle += 1;
      continue;
    }
    if (character === ">" && text[index - 1] !== "=") {
      angle -= 1;
      continue;
    }
    if (character === separator && depth === 0 && angle <= 0) {
      parts.push(text.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(text.slice(start));
  return parts.map((part) => part.trim()).filter((part) => part.length > 0);
}

/**
 * Index of the first top-level occurrence of `token` in `text` (outside
 * brackets, strings and comments), or `-1`.
 */
export function indexOfTopLevel(text: string, token: string, from = 0): number {
  const mask = maskLiterals(text);
  let depth = 0;
  for (let index = from; index <= text.length - token.length; index += 1) {
    if (mask[index]) {
      continue;
    }
    const character = text[index];
    if (character === "(" || character === "[" || character === "{") {
      depth += 1;
      continue;
    }
    if (character === ")" || character === "]" || character === "}") {
      depth -= 1;
      continue;
    }
    if (depth === 0 && text.startsWith(token, index)) {
      return index;
    }
  }
  return -1;
}

/**
 * Strip one layer of redundant wrapping parentheses (`(x)` -> `x`), repeatedly.
 */
export function unwrapParentheses(text: string): string {
  let current = text.trim();
  while (
    current.startsWith("(") &&
    matchBracket(current, 0) === current.length - 1
  ) {
    current = current.slice(1, -1).trim();
  }
  return current;
}

/** Alias for unwrapParentheses. */
export function stripOuterParentheses(text: string): string {
  return unwrapParentheses(text);
}

/**
 * Strip a trailing `as T` / `satisfies T` assertion.
 */
export function stripTypeAssertion(text: string): string {
  const trimmed = unwrapParentheses(text);
  for (const keyword of [" as ", " satisfies "]) {
    const index = indexOfTopLevel(trimmed, keyword);
    if (index > 0) {
      return stripTypeAssertion(trimmed.slice(0, index));
    }
  }
  return trimmed;
}

/**
 * Blank out every occurrence of each region, preserving character indices.
 */
export function blankRegions(text: string, regions: readonly string[]): string {
  let result = text;
  for (const region of regions) {
    if (region.length === 0) {
      continue;
    }
    let from = 0;
    for (;;) {
      const at = result.indexOf(region, from);
      if (at === -1) {
        break;
      }
      result =
        result.slice(0, at) +
        " ".repeat(region.length) +
        result.slice(at + region.length);
      from = at + region.length;
    }
  }
  return result;
}

/**
 * Replace the first occurrence of `search` in `text` with `replacement`.
 */
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

/** Collapse all runs of whitespace to single spaces and trim the result. */
export function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Indentation for a template depth (two spaces per level). */
export function pad(depth: number): string {
  return "  ".repeat(depth);
}

/** Escape a double-quoted HTML attribute value. */
export function escapeAttribute(value: string): string {
  return value.replace(/"/g, "&quot;");
}

/** Escape an expression for use inside a double-quoted Vue binding. */
export function escapeBinding(expression: string): string {
  return escapeAttribute(collapseWhitespace(expression));
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
      cursor = text.indexOf("\n", cursor);
      if (cursor === -1) {
        return text.length;
      }
      cursor += 1;
      continue;
    }
    if (character === "/" && text.charAt(cursor + 1) === "*") {
      cursor = text.indexOf("*/", cursor);
      if (cursor === -1) {
        return text.length;
      }
      cursor += 2;
      continue;
    }
    return cursor;
  }
  return text.length;
}

/**
 * Advance past the token starting at `index` when it opens a string, template or comment.
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
      if (text[cursor] === "$" && text[cursor + 1] === "{") {
        const matching = matchBracket(text, cursor + 1);
        cursor = matching === -1 ? text.length : matching + 1;
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
