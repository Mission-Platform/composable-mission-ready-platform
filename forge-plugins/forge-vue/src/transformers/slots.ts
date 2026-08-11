/**
 * Slot lowering for the **render-closure** path.
 *
 * The native `<template>` path renders a neutral `<Slot>` marker as Vue's
 * `<slot>` element (see `./template.ts`). A component that falls back to a
 * `const render = () => …` closure keeps its JSX, so the same marker has to be
 * expressed as the runtime equivalent instead: `slots.<name>?.(scope)`, resolved
 * against the `const slots = useSlots();` binding the SFC assembler adds
 * whenever the body references it.
 *
 * Both the JSX form (`<Slot name="footer" />`) and the hyperscript call form
 * (`h(Slot, { name: 'footer' })`) are recognised, working purely on the recorded
 * source text.
 */
import { matchBracket, splitTopLevel } from "./text.js";

/** The neutral slot marker's opening-tag prefix. */
const SLOT_OPEN = "<Slot";

/** The neutral slot marker's closing tag. */
const SLOT_CLOSE = "</Slot>";

/** Read a `name="x"` / `name={expr}` attribute out of a `<Slot …>` attribute list. */
function readSlotName(attributes: string): string {
  const literal = /\bname\s*=\s*(['"])([^'"]*)\1/.exec(attributes);
  if (literal?.[2] !== undefined) {
    return literal[2];
  }
  const expression = /\bname\s*=\s*\{\s*(['"])([^'"]*)\1\s*\}/.exec(attributes);
  return expression?.[2] ?? "default";
}

/**
 * The scope object a scoped slot is invoked with: every attribute except `name`,
 * re-assembled as an object literal (a lone spread is passed through as is).
 */
function readSlotScope(attributes: string): string {
  const spread = /^\s*\{\s*\.\.\.([^}]+)\}\s*$/.exec(attributes);
  if (spread?.[1] !== undefined) {
    return spread[1].trim();
  }
  const entries: string[] = [];
  const pattern = /([A-Za-z_$][\w$-]*)\s*=\s*(\{[^}]*\}|(['"])[^'"]*\3)/g;
  for (;;) {
    const match = pattern.exec(attributes);
    if (match === null) {
      break;
    }
    const name = match[1];
    const raw = match[2];
    if (name === undefined || raw === undefined || name === "name") {
      continue;
    }
    entries.push(
      `${name}: ${raw.startsWith("{") ? raw.slice(1, -1).trim() : raw}`,
    );
  }
  return entries.length === 0 ? "" : `{ ${entries.join(", ")} }`;
}

/** `slots.<name>?.(<scope>)` for one recognised slot marker. */
function slotCall(name: string, scope: string): string {
  const accessor = /^[A-Za-z_$][\w$]*$/.test(name)
    ? `slots.${name}`
    : `slots[${JSON.stringify(name)}]`;
  return `${accessor}?.(${scope})`;
}

/** Whether the replacement at `[start, end)` needs JSX `{ … }` braces around it. */
function needsBraces(text: string, start: number, end: number): boolean {
  const before = text.slice(0, start).trimEnd();
  const after = text.slice(end).trimStart();
  if (before.length === 0 && after.length === 0) {
    return false;
  }
  // Already inside an interpolation, or an argument/operand position.
  return before.endsWith(">") || after.startsWith("<");
}

/** The index of the next `<Slot` marker at or after `from`, or `-1`. */
function findSlotMarker(text: string, from: number): number {
  for (
    let index = text.indexOf(SLOT_OPEN, from);
    index !== -1;
    index = text.indexOf(SLOT_OPEN, index + 1)
  ) {
    const next = text[index + SLOT_OPEN.length];
    if (next === undefined || next === ">" || next === "/" || /\s/.test(next)) {
      return index;
    }
  }
  return -1;
}

/**
 * The fallback expression for a `<Slot …>children</Slot>` marker, or `''` when
 * the marker has no children. A lone interpolation contributes its inner
 * expression; anything else is kept as JSX (several nodes become a fragment).
 */
function slotFallback(children: string): string {
  const nodes = splitChildren(children);
  if (nodes.length === 0) {
    return "";
  }
  if (nodes.length > 1) {
    return `(<>${children}</>)`;
  }
  const only = nodes[0] ?? "";
  return only.startsWith("{") && only.endsWith("}")
    ? `(${only.slice(1, -1).trim()})`
    : `(${only})`;
}

/**
 * Rewrite every `<Slot …/>` and `<Slot …>fallback</Slot>` marker into its
 * `slots.<name>?.(…)` call.
 *
 * The marker's extent is resolved structurally rather than by a lazy `/>`
 * search: a `<Slot name="x">` with children would otherwise swallow everything
 * up to the next self-closing tag anywhere in the render.
 */
function rewriteJsxSlots(source: string): string {
  let text = source;
  let cursor = 0;
  for (;;) {
    const start = findSlotMarker(text, cursor);
    if (start === -1) {
      return text;
    }
    const open = openingTagEnd(text, start);
    const end = elementEnd(text, start, "Slot");
    if (open === -1 || end === -1) {
      cursor = start + 1;
      continue;
    }
    const selfClosing = text[open - 1] === "/";
    const attributes = text.slice(
      start + SLOT_OPEN.length,
      selfClosing ? open - 1 : open,
    );
    const call = slotCall(readSlotName(attributes), readSlotScope(attributes));
    const fallback = selfClosing
      ? ""
      : slotFallback(text.slice(open + 1, end - SLOT_CLOSE.length));
    const expression = fallback.length === 0 ? call : `${call} ?? ${fallback}`;
    const replacement = needsBraces(text, start, end)
      ? `{${expression}}`
      : expression;
    text = text.slice(0, start) + replacement + text.slice(end);
    cursor = start + replacement.length;
  }
}

/** Rewrite every `h(Slot, { … })` call into its `slots.<name>?.(…)` call. */
function rewriteHyperscriptSlots(source: string): string {
  let text = source;
  for (;;) {
    const match = /\bh\(\s*Slot\b/.exec(text);
    if (match === null) {
      return text;
    }
    const open = text.indexOf("(", match.index);
    const close = matchBracket(text, open);
    if (close === -1) {
      return text;
    }
    const [, properties = ""] = splitTopLevel(
      text.slice(open + 1, close),
      ",",
    ).map((part) => part.trim());
    const literal =
      /['"]name['"]?\s*:\s*(['"])([^'"]*)\1/.exec(properties) ??
      /\bname\s*:\s*(['"])([^'"]*)\1/.exec(properties);
    const name = literal?.[2] ?? "default";
    const scope = properties
      .replace(/^\{|\}$/g, "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(
        (entry) => entry.length > 0 && !/^['"]?name['"]?\s*:/.test(entry),
      );
    const call = slotCall(
      name,
      scope.length === 0 ? "" : `{ ${scope.join(", ")} }`,
    );
    text = text.slice(0, match.index) + call + text.slice(close + 1);
  }
}

/** The end of the JSX opening tag that starts at `start`, or `-1`. */
function openingTagEnd(text: string, start: number): number {
  let index = start + 1;
  let braces = 0;
  while (index < text.length) {
    const character = text[index];
    switch (character) {
      case "'":
      case '"':
      case "`": {
        const quote = character;
        index += 1;
        while (index < text.length && text[index] !== quote) {
          index += text[index] === "\\" ? 2 : 1;
        }

        break;
      }
      case "{": {
        braces += 1;

        break;
      }
      case "}": {
        braces -= 1;

        break;
      }
      default: {
        if (character === ">" && braces === 0) {
          return index;
        }
      }
    }
    index += 1;
  }
  return -1;
}

/** The exclusive end of the JSX element that starts at `start`, or `-1`. */
function elementEnd(text: string, start: number, tag: string): number {
  const open = openingTagEnd(text, start);
  if (open === -1) {
    return -1;
  }
  if (text[open - 1] === "/") {
    return open + 1;
  }
  let depth = 1;
  let index = open + 1;
  const openPattern = new RegExp(String.raw`<${tag}[\s/>]`);
  const closeTag = `</${tag}>`;
  while (index < text.length) {
    if (text.startsWith(closeTag, index)) {
      depth -= 1;
      if (depth === 0) {
        return index + closeTag.length;
      }
      index += closeTag.length;
      continue;
    }
    if (
      text[index] === "<" &&
      openPattern.test(text.slice(index, index + tag.length + 2))
    ) {
      depth += 1;
      const nested = openingTagEnd(text, index);
      index = nested === -1 ? index + 1 : nested + 1;
      continue;
    }
    index += 1;
  }
  return -1;
}

/** Split a JSX children region into its top-level nodes (elements, `{…}`, text). */
function splitChildren(text: string): string[] {
  const nodes: string[] = [];
  let index = 0;
  while (index < text.length) {
    const character = text[index];
    if (character === undefined || /\s/.test(character)) {
      index += 1;
      continue;
    }
    if (character === "{") {
      const close = matchBracket(text, index);
      if (close === -1) {
        return [];
      }
      nodes.push(text.slice(index, close + 1));
      index = close + 1;
      continue;
    }
    if (character === "<") {
      const name = /^<([A-Za-z_$][\w$.-]*)/.exec(text.slice(index))?.[1];
      if (name === undefined) {
        return [];
      }
      const end = elementEnd(text, index, name);
      if (end === -1) {
        return [];
      }
      nodes.push(text.slice(index, end));
      index = end;
      continue;
    }
    const next = text.slice(index).search(/[<{]/);
    const literal = (
      next === -1 ? text.slice(index) : text.slice(index, index + next)
    ).trim();
    if (literal.length > 0) {
      nodes.push(literal);
    }
    index = next === -1 ? text.length : index + next;
  }
  return nodes;
}

/**
 * Route a component's `slot="…"`-marked children into the object form
 * `@vitejs/plugin-vue-jsx` compiles as named slots:
 * `<Child>{{ trigger: () => <button/>, default: () => <ul/> }}</Child>`.
 */
function rewriteSlotChildren(source: string): string {
  let text = source;
  let cursor = 0;
  for (;;) {
    const match = /<([A-Z][\w$.]*)(?=[\s/>])/.exec(text.slice(cursor));
    if (match === null) {
      return text;
    }
    const start = cursor + match.index;
    const tag = match[1] ?? "";
    const open = openingTagEnd(text, start);
    const end = elementEnd(text, start, tag);
    if (open === -1 || end === -1 || text[open - 1] === "/") {
      cursor = start + 1;
      continue;
    }
    const childrenText = text.slice(open + 1, end - `</${tag}>`.length);
    const children = splitChildren(childrenText);
    const buckets = new Map<string, string[]>();
    let routed = false;
    for (const child of children) {
      const slot =
        /^<[A-Za-z_$][\w$.-]*[^>]*?\sslot\s*=\s*(['"])([^'"]*)\1/.exec(child);
      const name = slot?.[2];
      if (name === undefined) {
        const bucket = buckets.get("default") ?? [];
        bucket.push(child);
        buckets.set("default", bucket);
        continue;
      }
      routed = true;
      const stripped = child.replace(/\sslot\s*=\s*(['"])[^'"]*\1/, "");
      const bucket = buckets.get(name) ?? [];
      bucket.push(stripped);
      buckets.set(name, bucket);
    }
    if (!routed) {
      cursor = start + 1;
      continue;
    }
    const entries = [...buckets]
      .map(
        ([name, nodes]) =>
          `${name}: () => ${nodes.length === 1 ? nodes[0] : `[${nodes.join(", ")}]`}`,
      )
      .join(", ");
    const replacement = `${text.slice(start, open + 1)}{{ ${entries} }}</${tag}>`;
    text = text.slice(0, start) + replacement + text.slice(end);
    cursor = start + replacement.length;
  }
}

/**
 * Lower every neutral slot marker in a render-closure fragment to its runtime
 * `slots.<name>?.(…)` form, and route `slot="…"` children into the JSX slots
 * object.
 */
export function rewriteClosureSlots(source: string): string {
  return rewriteSlotChildren(rewriteHyperscriptSlots(rewriteJsxSlots(source)));
}
