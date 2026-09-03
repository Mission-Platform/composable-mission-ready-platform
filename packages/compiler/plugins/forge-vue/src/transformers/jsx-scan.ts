/**
 * A minimal JSX region scanner for the **render-closure** path.
 *
 * A component that cannot be expressed as a native `<template>` keeps its JSX
 * verbatim inside `const render = () => …`, so the expression rewriter has to
 * run over a fragment that mixes JavaScript with markup. Without knowing which
 * regions are markup it corrupts the output in two ways:
 *
 * - a JSX **attribute name** looks like an identifier read, so `max={…}` is
 *   rewritten to the un-parseable `properties.max={…}`;
 * - a JSX **expression container** looks like an object literal, so the child
 *   `{label}` is "expanded" to the un-parseable `{label: properties.label}`.
 *
 * This scanner walks the fragment once and reports those facts — plus the span
 * of every attribute **name**, which the neutral → Vue attribute translation
 * ({@link ./closure-attributes.js}) rewrites. It is a recogniser, not a parser:
 * it produces no tree and never re-prints anything.
 */

/** A JSX attribute **name** occurrence, located by its span in the fragment. */
export interface JsxAttributeName {
  /** Index of the first character of the name. */
  readonly start: number;
  /** Index just past the last character of the name. */
  readonly end: number;
  /** The name as written (`className`, `aria-label`, …). */
  readonly name: string;
}

/** The regions of a fragment that belong to JSX rather than to JavaScript. */
export interface JsxRegions {
  /**
   * Per-character flags for the text that is JSX syntax — tag names, attribute
   * names, punctuation and element text. An identifier starting inside one of
   * these must survive verbatim.
   */
  readonly verbatim: readonly boolean[];
  /**
   * The indices of every `{` that opens a JSX expression container (an
   * attribute value or a child). Such a brace is not an object literal, so an
   * identifier directly inside it is never a shorthand property.
   */
  readonly containers: ReadonlySet<number>;
  /**
   * Every attribute **name** the scan passed, in source order. The neutral
   * dialect is authored in React's vocabulary, so a rewriter needs to find the
   * names (and only the names) to translate them to Vue's.
   */
  readonly attributes: readonly JsxAttributeName[];
}

/** Mutable accumulator threaded through the scan. */
interface ScanState {
  readonly verbatim: boolean[];
  readonly containers: Set<number>;
  readonly attributes: JsxAttributeName[];
}

/** Keywords a JSX expression may directly follow. */
const JSX_PRECEDING_KEYWORDS = new Set([
  "await",
  "case",
  "default",
  "delete",
  "do",
  "else",
  "in",
  "of",
  "return",
  "typeof",
  "void",
  "yield",
]);

/** Punctuation a JSX expression may directly follow. */
const JSX_PRECEDING_PUNCTUATION = new Set([
  "!",
  "&",
  "(",
  "*",
  "+",
  ",",
  ":",
  ";",
  "=",
  ">",
  "?",
  "[",
  "{",
  "|",
]);

/** Whether the character can start or continue an identifier. */
function isWordCharacter(character: string | undefined): boolean {
  return character !== undefined && /[\w$]/.test(character);
}

/**
 * Whether a `<` at `index` opens JSX rather than being a comparison or the
 * start of a type-argument list. JSX only ever appears in expression position,
 * so the preceding significant token decides.
 */
function opensJsx(text: string, index: number): boolean {
  if (!/[A-Za-z_$>]/.test(text[index + 1] ?? "")) {
    return false;
  }
  let before = index - 1;
  while (before >= 0 && /\s/.test(text[before] ?? "")) {
    before -= 1;
  }
  if (before < 0) {
    return true;
  }
  const character = text[before] ?? "";
  if (isWordCharacter(character)) {
    let start = before;
    while (start >= 0 && isWordCharacter(text[start])) {
      start -= 1;
    }
    return JSX_PRECEDING_KEYWORDS.has(text.slice(start + 1, before + 1));
  }
  return JSX_PRECEDING_PUNCTUATION.has(character);
}

/** Mark `[from, to)` as JSX syntax. */
function mark(state: ScanState, from: number, to: number): void {
  for (let index = from; index < to; index += 1) {
    state.verbatim[index] = true;
  }
}

/** The index just past the quoted literal starting at `index`. */
function skipQuoted(text: string, index: number): number {
  const quote = text[index];
  let cursor = index + 1;
  while (cursor < text.length && text[cursor] !== quote) {
    cursor += text[cursor] === "\\" ? 2 : 1;
  }
  return Math.min(cursor + 1, text.length);
}

/** The index just past the template literal starting at `index`. */
function skipTemplate(text: string, index: number, state: ScanState): number {
  let cursor = index + 1;
  while (cursor < text.length) {
    const character = text[cursor];
    if (character === "\\") {
      cursor += 2;
      continue;
    }
    if (character === "`") {
      return cursor + 1;
    }
    if (character === "$" && text[cursor + 1] === "{") {
      cursor = scanJavaScript(text, cursor + 2, state);
      continue;
    }
    cursor += 1;
  }
  return cursor;
}

/**
 * Scan JavaScript from `from` until the `}` that closes the enclosing brace, and
 * return the index just past it (or the end of the text).
 */
function scanJavaScript(text: string, from: number, state: ScanState): number {
  let index = from;
  while (index < text.length) {
    const character = text[index];
    if (character === "/" && text[index + 1] === "/") {
      while (index < text.length && text[index] !== "\n") {
        index += 1;
      }
      continue;
    }
    if (character === "/" && text[index + 1] === "*") {
      const close = text.indexOf("*/", index + 2);
      index = close === -1 ? text.length : close + 2;
      continue;
    }
    if (character === "'" || character === '"') {
      index = skipQuoted(text, index);
      continue;
    }
    if (character === "`") {
      index = skipTemplate(text, index, state);
      continue;
    }
    if (character === "{") {
      index = scanJavaScript(text, index + 1, state);
      continue;
    }
    if (character === "}") {
      return index + 1;
    }
    if (character === "<" && opensJsx(text, index)) {
      index = scanElement(text, index, state);
      continue;
    }
    index += 1;
  }
  return index;
}

/** Scan the JSX element starting at `start`; returns the index just past it. */
function scanElement(text: string, start: number, state: ScanState): number {
  let index = start + 1;
  if (text[index] === ">") {
    mark(state, start, index + 1);
    return scanChildren(text, index + 1, state);
  }
  const name = /^[A-Za-z_$][\w$.:-]*/.exec(text.slice(index))?.[0] ?? "";
  index += name.length;
  mark(state, start, index);
  while (index < text.length) {
    if (/\s/.test(text[index] ?? "")) {
      mark(state, index, index + 1);
      index += 1;
      continue;
    }
    if (text[index] === "/" && text[index + 1] === ">") {
      mark(state, index, index + 2);
      return index + 2;
    }
    if (text[index] === ">") {
      mark(state, index, index + 1);
      return scanChildren(text, index + 1, state);
    }
    if (text[index] === "{") {
      // A spread attribute (`{...rest}`) is plain JavaScript, not a container:
      // its contents are an expression the rewriter must still visit.
      index = scanJavaScript(text, index + 1, state);
      continue;
    }
    const attribute = /^[A-Za-z_$][\w$.:-]*/.exec(text.slice(index))?.[0];
    if (attribute === undefined) {
      index += 1;
      continue;
    }
    mark(state, index, index + attribute.length);
    state.attributes.push({
      start: index,
      end: index + attribute.length,
      name: attribute,
    });
    index += attribute.length;
    while (index < text.length && /\s/.test(text[index] ?? "")) {
      index += 1;
    }
    if (text[index] !== "=") {
      continue;
    }
    mark(state, index, index + 1);
    index += 1;
    while (index < text.length && /\s/.test(text[index] ?? "")) {
      index += 1;
    }
    if (text[index] === '"' || text[index] === "'") {
      const close = skipQuoted(text, index);
      mark(state, index, close);
      index = close;
      continue;
    }
    if (text[index] === "{") {
      state.containers.add(index);
      index = scanJavaScript(text, index + 1, state);
    }
  }
  return index;
}

/** Scan JSX children from `from`; returns the index just past the closing tag. */
function scanChildren(text: string, from: number, state: ScanState): number {
  let index = from;
  while (index < text.length) {
    if (text[index] === "<" && text[index + 1] === "/") {
      const close = text.indexOf(">", index);
      const end = close === -1 ? text.length : close + 1;
      mark(state, index, end);
      return end;
    }
    if (text[index] === "<" && /[A-Za-z_$>]/.test(text[index + 1] ?? "")) {
      index = scanElement(text, index, state);
      continue;
    }
    if (text[index] === "{") {
      state.containers.add(index);
      index = scanJavaScript(text, index + 1, state);
      continue;
    }
    mark(state, index, index + 1);
    index += 1;
  }
  return index;
}

/** Locate every JSX region in a source-backed fragment. */
export function scanJsx(source: string): JsxRegions {
  const state: ScanState = {
    verbatim: Array.from({ length: source.length }, () => false),
    containers: new Set<number>(),
    attributes: [],
  };
  scanJavaScript(source, 0, state);
  return {
    verbatim: state.verbatim,
    containers: state.containers,
    attributes: state.attributes,
  };
}
