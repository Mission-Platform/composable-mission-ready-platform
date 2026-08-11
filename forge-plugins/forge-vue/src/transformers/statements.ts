/**
 * Statement-level source splitting for the Vue emitters.
 *
 * A component's statements arrive on the IR pre-split (`GenericComponent.body`),
 * but a **composable** module does not: the IR records each `function` as a
 * single retained declaration whose `text` is the whole function. The hook
 * emitter therefore has to walk a function body itself — without re-parsing —
 * so this module provides the two small scanners it needs: one that splits a
 * block body into its top-level statements, and one that splits a function
 * declaration into its header and its body.
 *
 * Both scanners reuse {@link maskLiterals}, so separators inside strings,
 * template literals and comments are never mistaken for structure.
 */
import { indexOfTopLevel, maskLiterals, matchBracket } from "./text.js";

/** Keywords that continue the statement a closing brace would otherwise end. */
const CONTINUATIONS = /^(?:else|catch|finally|while)\b/;

/** Index of the next non-whitespace character at or after `from`. */
function skipWhitespace(text: string, from: number): number {
  let index = from;
  while (index < text.length && /\s/.test(text[index] ?? "")) {
    index += 1;
  }
  return index;
}

/**
 * Split a block body's source into its top-level statements, preserving each
 * statement's own text verbatim (trailing `;` included). A brace that closes at
 * top level ends the statement unless it is followed by `;` (a declaration whose
 * initializer is an object/function) or by a continuation keyword (`else`,
 * `catch`, `finally`, `while`).
 */
export function splitStatements(text: string): string[] {
  const mask = maskLiterals(text);
  const statements: string[] = [];
  /** Whether each open `{` on the bracket stack opened a *block*. */
  const blocks: boolean[] = [];
  let depth = 0;
  let start = 0;
  let index = 0;
  const push = (end: number): void => {
    const statement = text.slice(start, end).trim();
    if (statement.length > 0) {
      statements.push(statement);
    }
    start = end;
  };
  while (index < text.length) {
    if (mask[index] === true) {
      index += 1;
      continue;
    }
    const character = text[index];
    if (character === "(" || character === "[") {
      depth += 1;
      index += 1;
      continue;
    }
    if (character === "{") {
      // Only a brace that opens a *block* can end the statement. An object
      // literal, an arrow body and a JSX `{ … }` interpolation are all values,
      // so their closing brace must not be mistaken for a statement boundary.
      blocks.push(depth === 0 && opensBlock(text.slice(start, index)));
      depth += 1;
      index += 1;
      continue;
    }
    if (character === ")" || character === "]" || character === "}") {
      const isBlock = character === "}" ? blocks.pop() === true : false;
      depth -= 1;
      index += 1;
      if (isBlock && depth === 0) {
        const next = skipWhitespace(text, index);
        if (CONTINUATIONS.test(text.slice(next))) {
          index = next;
          continue;
        }
        push(text[next] === ";" ? next + 1 : index);
        index = start;
      }
      continue;
    }
    if (character === ";" && depth === 0) {
      index += 1;
      push(index);
      continue;
    }
    index += 1;
  }
  push(text.length);
  return statements;
}

/**
 * Whether a `{` following `prefix` opens a statement block. A block brace either
 * starts the statement outright, follows a control header's `)` , or follows one
 * of the bodyless keywords (`else`, `do`, `try`, `finally`).
 */
function opensBlock(prefix: string): boolean {
  const before = prefix.trimEnd();
  if (before.length === 0) {
    return true;
  }
  // A declaration that owns a body (`function f(): R {`, `class X {`).
  if (
    /^(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function\b|class\b)/.test(
      before,
    )
  ) {
    return true;
  }
  // A control header (`if (…) {`, `for (…) {`) — but not a value whose `)`
  // belongs to a parameter list (`const handler = () => {`).
  if (before.endsWith(")")) {
    return (
      !/(?:=>|=)$/.test(before.replace(/\)$/, "").trimEnd()) &&
      !/=>\s*$/.test(before)
    );
  }
  return /\b(?:else|do|try|catch|finally)$/.test(before);
}

/** A function declaration split into its header and its body. */
export interface FunctionParts {
  /** Everything before the body's `{` (`export function useThing(a: A): R`). */
  readonly header: string;
  /** The body's source, without the enclosing braces. */
  readonly body: string;
}

/**
 * Split a function declaration's recorded text into its header and body, or
 * `undefined` when the text declares no body (an overload signature).
 */
export function readFunctionParts(text: string): FunctionParts | undefined {
  const mask = maskLiterals(text);
  let index = 0;
  let depth = 0;
  while (index < text.length) {
    if (mask[index] !== true) {
      const character = text[index];
      if (character === "(" || character === "[" || character === "<") {
        depth += 1;
      } else if (character === ")" || character === "]" || character === ">") {
        depth -= 1;
      } else if (character === "{" && depth <= 0) {
        const close = matchBracket(text, index);
        if (close === -1) {
          return undefined;
        }
        // A `{` at depth zero is only the body when nothing but a terminator
        // follows its match: an inline object **return type** (`function
        // useLabel(): { label: string } { … }`) also opens at depth zero, so it
        // has to be skipped rather than mistaken for the body.
        if (/^;?$/.test(text.slice(close + 1).trim())) {
          return {
            header: text.slice(0, index).trim(),
            body: text.slice(index + 1, close),
          };
        }
        index = close;
      }
    }
    index += 1;
  }
  return undefined;
}

/** A `const <binding>[: T] = <initializer>;` statement split into its parts. */
export interface VariableParts {
  readonly binding: string;
  readonly typeText?: string;
  readonly initializer: string;
}

/** Split a variable statement's recorded text into binding, type and initializer. */
export function readVariableStatement(text: string): VariableParts | undefined {
  const trimmed = withoutLeadingComments(text);
  const match = /^(?:export\s+)?(?:const|let|var)\s/.exec(trimmed);
  if (match === null) {
    return undefined;
  }
  const rest = trimmed.slice(match[0].length);
  const equals = findAssignment(rest);
  if (equals === -1) {
    return undefined;
  }
  const head = rest.slice(0, equals).trim();
  const initializer = rest
    .slice(equals + 1)
    .trim()
    .replace(/;$/, "")
    .trim();
  // A type annotation only follows a plain identifier binding; a destructuring
  // pattern's `:` characters are member renames, not annotations.
  if (head.startsWith("{") || head.startsWith("[")) {
    return { binding: head, initializer };
  }
  const colon = indexOfTopLevel(head, ":");
  return colon === -1
    ? { binding: head, initializer }
    : {
        binding: head.slice(0, colon).trim(),
        typeText: head.slice(colon + 1).trim(),
        initializer,
      };
}

/**
 * `text` with its leading comment runs removed.
 *
 * A statement's recorded text can start with the declaration's own documentation
 * (a split callback body keeps its comments), and a reader that anchors on
 * `const` would then fail to recognise the declaration at all — silently
 * dropping it from the emitted component.
 */
function withoutLeadingComments(text: string): string {
  let rest = text.trim();
  for (;;) {
    if (rest.startsWith("//")) {
      const newline = rest.indexOf("\n");
      rest = newline === -1 ? "" : rest.slice(newline + 1).trim();
      continue;
    }
    if (rest.startsWith("/*")) {
      const close = rest.indexOf("*/");
      rest = close === -1 ? "" : rest.slice(close + 2).trim();
      continue;
    }
    return rest;
  }
}

/** Index of the declaration's `=`, skipping `==`, `=>` and `<=`/`>=`/`!=`. */
function findAssignment(text: string): number {
  let index = 0;
  for (;;) {
    const found = indexOfTopLevel(text, "=", index);
    if (found === -1) {
      return -1;
    }
    const next = text[found + 1];
    const previous = text[found - 1];
    if (
      next !== "=" &&
      next !== ">" &&
      previous !== "=" &&
      previous !== "<" &&
      previous !== ">" &&
      previous !== "!"
    ) {
      return found;
    }
    index = found + 1;
  }
}
