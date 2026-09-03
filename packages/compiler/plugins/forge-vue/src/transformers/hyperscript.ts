/**
 * Hyperscript (`h(tag, props, …children)`) → generic render node.
 *
 * The neutral frontend records JSX as {@link GenericRenderNode}s, but a
 * component may also build its tree with the runtime's `h()` helper — the escape
 * hatch authors reach for when the tag itself is dynamic (`h(tag, …)`) or the
 * children are variadic (`h(tag, props, ...childList)`). Those calls stay plain
 * call expressions in the IR, so the Vue emitter would otherwise have no markup
 * to lower and would fall back to a render closure.
 *
 * This module re-materialises such a call as a render node, working purely on
 * the recorded source text with the literal/comment-aware scanners from
 * `./text.js` — no parsing, no TypeScript nodes. The synthesized nodes carry
 * {@link EMPTY_SPAN}, which is exactly what the shared IR prescribes for records
 * that were printed rather than sliced out of a buffer.
 */
import { EMPTY_SPAN, sourceBacked } from "@mission-platform/forge-plugin-api";

import { maskLiterals, matchBracket, splitTopLevel } from "./text.js";

import type {
  GenericAttribute,
  GenericRenderChild,
  GenericRenderNode,
  GenericTagKind,
} from "@mission-platform/forge-plugin-api";

/** Whether `text` is a quoted string literal with no interpolation. */
function stringLiteral(text: string): string | undefined {
  const trimmed = text.trim();
  if (trimmed.length < 2) {
    return undefined;
  }
  const quote = trimmed[0];
  if ((quote !== "'" && quote !== '"') || trimmed.at(-1) !== quote) {
    return undefined;
  }
  const inner = trimmed.slice(1, -1);
  return inner.includes(quote) ? undefined : inner;
}

/** The argument list of a call whose callee ends at `open`, or `undefined`. */
function callArgumentsOf(text: string, open: number): string[] | undefined {
  const close = matchBracket(text, open);
  if (close === -1) {
    return undefined;
  }
  const inner = text.slice(open + 1, close).trim();
  return inner.length === 0
    ? []
    : splitTopLevel(inner, ",").map((argument) => argument.trim());
}

/** Whether `text` is exactly an `h(…)` call (and where its arguments start). */
function hyperscriptCall(text: string): { args: string[] } | undefined {
  const trimmed = text.trim();
  if (!trimmed.startsWith("h(")) {
    return undefined;
  }
  // The call has to span the whole fragment — `h(a) + h(b)` is not a node.
  if (matchBracket(trimmed, 1) !== trimmed.length - 1) {
    return undefined;
  }
  const args = callArgumentsOf(trimmed, 1);
  return args === undefined ? undefined : { args };
}

/** Split an object-literal fragment into its top-level entries. */
function objectEntries(text: string): string[] | undefined {
  const trimmed = text.trim();
  if (
    !trimmed.startsWith("{") ||
    matchBracket(trimmed, 0) !== trimmed.length - 1
  ) {
    return undefined;
  }
  const inner = trimmed.slice(1, -1).trim();
  return inner.length === 0
    ? []
    : splitTopLevel(inner, ",").map((entry) => entry.trim());
}

/** Turn one object-literal entry into a JSX-shaped attribute record. */
function attributeOf(entry: string): GenericAttribute | undefined {
  if (entry.startsWith("...")) {
    return {
      kind: "jsx-spread-attribute",
      expression: sourceBacked(entry.slice(3).trim()),
      span: EMPTY_SPAN,
    };
  }
  const colon = splitTopLevel(entry, ":");
  if (colon.length < 2) {
    // A shorthand property (`{ ref }`) names both the attribute and its value.
    return /^[A-Za-z_$][\w$]*$/.test(entry)
      ? {
          kind: "jsx-attribute",
          name: entry,
          value: {
            kind: "expression",
            expression: sourceBacked(entry),
            nested: [],
            span: EMPTY_SPAN,
          },
          span: EMPTY_SPAN,
        }
      : undefined;
  }
  const rawKey = colon[0]?.trim() ?? "";
  const value = colon.slice(1).join(":").trim();
  const name = stringLiteral(rawKey) ?? rawKey;
  if (!/^[A-Za-z_$][\w$:.-]*$/.test(name)) {
    return undefined;
  }
  const literal = stringLiteral(value);
  return {
    kind: "jsx-attribute",
    name,
    value:
      literal === undefined
        ? {
            kind: "expression",
            expression: sourceBacked(value),
            nested: [],
            span: EMPTY_SPAN,
          }
        : { kind: "string", value: literal, span: EMPTY_SPAN },
    span: EMPTY_SPAN,
  };
}

/** Turn one `h()` child argument into a render child. */
function childOf(
  argument: string,
  nested: readonly GenericRenderNode[],
): GenericRenderChild | undefined {
  const call = hyperscriptRenderNode(argument, nested);
  if (call !== undefined) {
    return call;
  }
  const literal = stringLiteral(argument);
  if (literal !== undefined) {
    return { kind: "text", text: literal, span: EMPTY_SPAN };
  }
  // A spread (`...childList`) keeps the spread source as its expression: the
  // template lowering resolves a normalised-children source to `<slot />`.
  const text = argument.startsWith("...") ? argument.slice(3).trim() : argument;
  if (text.length === 0) {
    return undefined;
  }
  // The recorded JSX roots travel with every child so a literal `<h1/>` argument
  // — or a node-valued const referenced by name — still resolves to markup.
  return {
    kind: "expression-node",
    expression: sourceBacked(text),
    nested,
    span: EMPTY_SPAN,
  };
}

/**
 * Re-materialise `h(tag, props, …children)` as a render node, or `undefined`
 * when the fragment is not a hyperscript call the emitter can express as markup.
 */
export function hyperscriptRenderNode(
  text: string,
  nested: readonly GenericRenderNode[] = [],
): GenericRenderNode | undefined {
  const call = hyperscriptCall(text);
  if (call === undefined) {
    return undefined;
  }
  const [tagArgument, propsArgument, ...childArguments] = call.args;
  if (tagArgument === undefined) {
    return undefined;
  }
  const literalTag = stringLiteral(tagArgument);
  const identifierTag = /^[A-Za-z_$][\w$.]*$/.test(tagArgument)
    ? tagArgument
    : undefined;
  let tag: GenericRenderNode["tag"];
  let tagKind: GenericTagKind;
  if (literalTag !== undefined) {
    tag = literalTag;
    tagKind = /^[a-z]/.test(literalTag) ? "element" : "component";
  } else if (identifierTag !== undefined && /^[A-Z]/.test(identifierTag)) {
    tag = identifierTag;
    tagKind = "component";
  } else {
    tag = sourceBacked(tagArgument);
    tagKind = "dynamic";
  }

  const attributes: GenericAttribute[] = [];
  if (
    propsArgument !== undefined &&
    propsArgument !== "null" &&
    propsArgument !== "undefined"
  ) {
    const entries = objectEntries(propsArgument);
    if (entries === undefined) {
      return undefined;
    }
    for (const entry of entries) {
      const attribute = attributeOf(entry);
      if (attribute === undefined) {
        return undefined;
      }
      attributes.push(attribute);
    }
  }

  const children: GenericRenderChild[] = [];
  for (const argument of childArguments) {
    const child = childOf(argument, nested);
    if (child !== undefined) {
      children.push(child);
    }
  }

  return {
    kind: "render-node",
    tag,
    tagKind,
    selfClosing: children.length === 0,
    attributes,
    children,
    expression: sourceBacked(text.trim()),
    span: EMPTY_SPAN,
  };
}

/**
 * Whether an expression *builds* markup with the neutral hyperscript helper.
 *
 * A `h(…)`-built value carries no recorded JSX, so this is what tells the reader
 * that a const, or a conditional arm, holds a subtree rather than a plain value.
 */
export function containsHyperscript(text: string): boolean {
  const mask = maskLiterals(text);
  for (const match of text.matchAll(/\bh\s*\(/g)) {
    if (mask[match.index] !== true) {
      return true;
    }
  }
  return false;
}
