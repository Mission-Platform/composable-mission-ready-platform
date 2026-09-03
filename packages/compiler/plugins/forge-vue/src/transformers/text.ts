/**
 * Token-aware text utilities shared by the Vue transformers.
 *
 * The emitter never re-parses a module: every fragment it lowers is
 * source-backed text the compiler frontend already recorded on the generic AST
 * (`SourceBackedExpression.text`). Rewriting that text safely still requires
 * knowing where strings, template literals and comments start and end — a naive
 * `String.replace` would happily edit the inside of a string literal — so this
 * module provides a tiny scanner that classifies each character position, plus
 * the bracket-matching and splitting helpers the transformers build on.
 */

/** A character classification used to skip literal/comment regions while scanning. */
const QUOTES = new Set(["'", '"', "`"]);

/** Whether the character can start a JavaScript identifier. */
export function isIdentifierStart(character: string | undefined): boolean {
  return character !== undefined && /[A-Za-z_$]/.test(character);
}

/** Whether the character can continue a JavaScript identifier. */
export function isIdentifierPart(character: string | undefined): boolean {
  return character !== undefined && /[\w$]/.test(character);
}

/**
 * Compute a mask marking every index of `text` that sits inside a string
 * literal, template literal or comment. Positions marked `true` are literal
 * content and must never be rewritten structurally.
 */
export function maskLiterals(text: string): boolean[] {
  const mask = Array.from({ length: text.length }, () => false);
  let index = 0;
  while (index < text.length) {
    const character = text[index];
    const next = text[index + 1];
    if (character === "/" && next === "/") {
      while (index < text.length && text[index] !== "\n") {
        mask[index] = true;
        index += 1;
      }
      continue;
    }
    if (character === "/" && next === "*") {
      while (
        index < text.length &&
        !(text[index] === "*" && text[index + 1] === "/")
      ) {
        mask[index] = true;
        index += 1;
      }
      mask[index] = true;
      mask[index + 1] = true;
      index += 2;
      continue;
    }
    if (QUOTES.has(character)) {
      const quote = character;
      mask[index] = true;
      index += 1;
      while (index < text.length) {
        if (text[index] === "\\") {
          mask[index] = true;
          mask[index + 1] = true;
          index += 2;
          continue;
        }
        // A `${ … }` interpolation is real code, so it is left unmasked and the
        // scanner resumes literal mode after the matching brace.
        if (quote === "`" && text[index] === "$" && text[index + 1] === "{") {
          mask[index] = true;
          mask[index + 1] = true;
          const end = matchBracket(text, index + 1);
          index = end === -1 ? text.length : end;
          mask[index] = true;
          index += 1;
          continue;
        }
        mask[index] = true;
        if (text[index] === quote) {
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

/** The bracket that closes each opening bracket the scanner tracks. */
const CLOSING: ReadonlyMap<string, string> = new Map([
  ["(", ")"],
  ["[", "]"],
  ["{", "}"],
]);

/**
 * Index of the bracket matching the opening bracket at `start`, or `-1` when the
 * text is unbalanced. Literal and comment regions are skipped.
 */
export function matchBracket(text: string, start: number): number {
  const open = text[start];
  const close = CLOSING.get(open);
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
 *
 * Angle brackets are not brackets to {@link matchBracket} — they double as
 * comparison operators — so the balance is walked here. The walk steps over the
 * `=>` of a function type (`useRef<(() => void) | undefined>(…)`, whose `>`
 * closes nothing) and over nested `()`/`[]`/`{}` groups, so a type argument
 * containing parentheses never ends the list early.
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
    // Generic argument lists (`Map<string, number>`) must not split on their
    // comma; `=>` is not an angle bracket, so it is explicitly excluded.
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
 * Strip one layer of redundant wrapping parentheses (`(x)` → `x`), repeatedly.
 * Only a parenthesis that closes at the very end of the text is removed, so
 * `(a) + (b)` is left untouched.
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

/**
 * Strip a trailing `as T` / `satisfies T` assertion, which carries no runtime
 * meaning and must not leak into `<template>` markup.
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
 * Blank out every occurrence of each region, preserving the text length so
 * indices computed against the result still address the original.
 *
 * Recorded JSX is opaque to a JavaScript scanner: a `:` or `?` written as
 * element text (`<span>:</span>`) is not an operator, and its braces are not
 * expression brackets. Blanking the recorded markup substrings before scanning
 * keeps the operator search on real code.
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
 * Replace the **first** occurrence of `search` in `text` with `replacement`,
 * treating `search` as a literal (never a pattern). This is how a statement that
 * contains nested JSX is lowered: each nested render node's exact source
 * substring is swapped for its re-printed target form.
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

/**
 * Escape an expression for use inside a double-quoted Vue binding: newlines are
 * collapsed (a directive value must stay on one line) and quotes are entity
 * encoded.
 */
export function escapeBinding(expression: string): string {
  return escapeAttribute(collapseWhitespace(expression));
}
