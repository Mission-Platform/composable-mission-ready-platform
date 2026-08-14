/**
 * Render-node lowering for the SolidJS target.
 *
 * The generic AST models JSX structurally (`GenericRenderNode`), so the Solid
 * markup is *printed* from that tree rather than transformed as a TypeScript
 * node graph. Every neutral JSX construct is lowered here:
 *
 * - `<Fragment />` (empty) → `null`, `<Fragment>…</Fragment>` → `<>…</>`;
 * - `<Slot name="x" />` → `properties.x` (render-prop call form when scoped);
 * - `<Dynamic is={X} …>` → `h(X, { … }, …children)` via `solid-js/h`;
 * - named-slot passing (`slot="x"` children of a component → `x={…}` props);
 * - `className` → `class`, `htmlFor` → `for` and the rest of `SOLID_ALIASES`;
 * - `className={[…]}` → `class={classNames(…)}`;
 * - `ref={container}` → `ref={(el) => (container.current = el)}`;
 * - `__mpStatic` subtrees hoisted to module-level constants;
 * - every remaining attribute value and interpolation lowered as an expression,
 *   so signal reads inside markup become getter calls.
 *
 * A lowered node is either JSX (usable directly in child position) or a bare
 * expression — the caller wraps the latter in `{ … }` when it lands inside a
 * JSX element, and leaves it bare in `return` / argument position.
 */
import {
  attributeStringValue,
  isRenderNode,
  isTextNode,
} from "@mission-platform/forge-plugin-api";

import { aliasAttributeName } from "../runtime/aliases.js";
import {
  CLASS_NAME_ATTRIBUTE,
  CLASS_NAMES_HELPER,
  DEFAULT_SLOT_NAME,
  DYNAMIC_IS_ATTRIBUTE,
  DYNAMIC_TAG,
  MP_HOIST_PREFIX,
  MP_STATIC_ATTRIBUTE,
  REF_ATTRIBUTE,
  SLOT_ATTRIBUTE,
  SLOT_NAME_ATTRIBUTE,
  SLOT_TAG,
} from "../runtime/markers.js";

import {
  FACTORY_NAME,
  lowerExpressionText,
  lowerStatementText,
  quoteAttributeValue,
  quoteExpressionString,
  refCallback,
  scopedSlotRead,
  slotAccess,
  withSlotFallback,
} from "./expressions.js";
import {
  columnAt,
  printObjectLiteral,
  printObjectMember,
  replaceFirst,
} from "./text.js";

import type { SolidLoweringContext } from "./context.js";
import type {
  GenericAttribute,
  GenericRenderChild,
  GenericRenderNode,
  SourceBackedExpression,
} from "@mission-platform/forge-plugin-api";

/** A lowered render node: Solid source plus how it may be spliced back in. */
export interface LoweredRenderNode {
  /** The printed SolidJS source. */
  readonly text: string;
  /** Whether {@link text} is a bare expression (needs `{ … }` in JSX child position). */
  readonly expression: boolean;
}

/** The plain tag text of a render node (a computed tag prints its source expression). */
function tagText(node: GenericRenderNode): string {
  return typeof node.tag === "string" ? node.tag : node.tag.text;
}

/** Whether the node is the named neutral compile-time marker. */
function isMarker(node: GenericRenderNode, tag: string): boolean {
  return typeof node.tag === "string" && node.tag === tag;
}

/**
 * Whether the node's tag names a **component** rather than an intrinsic
 * element. Named-slot passing is only meaningful onto a component.
 */
function isComponentNode(node: GenericRenderNode): boolean {
  return node.tagKind === "component" || node.tagKind === "dynamic";
}

/** Whether Stage-1 marked this subtree as static (hoistable). */
function hasStaticMarker(node: GenericRenderNode): boolean {
  return node.attributes.some(
    (attribute) =>
      attribute.kind === "jsx-attribute" &&
      attribute.name === MP_STATIC_ATTRIBUTE,
  );
}

/** Children that survive to the target (whitespace-only text carries nothing). */
function meaningfulChildren(
  node: GenericRenderNode,
): readonly GenericRenderChild[] {
  return node.children.filter(
    (child) => !isTextNode(child) || child.text.trim().length > 0,
  );
}

/** The `slot="…"` name a child is routed into, or `undefined` for default-slot content. */
function childSlotName(child: GenericRenderChild): string | undefined {
  if (!isRenderNode(child)) {
    return undefined;
  }
  const name = attributeStringValue(child, SLOT_ATTRIBUTE);
  return name === undefined || name === "" || name === DEFAULT_SLOT_NAME
    ? undefined
    : name;
}

/** A copy of the node without its `slot="…"` routing marker. */
function withoutSlotAttribute(node: GenericRenderNode): GenericRenderNode {
  return {
    ...node,
    attributes: node.attributes.filter(
      (attribute) =>
        !(
          attribute.kind === "jsx-attribute" &&
          attribute.name === SLOT_ATTRIBUTE
        ),
    ),
  };
}

/** The absolute column a substring occupies, given the base indentation of `text`. */
function absoluteColumn(
  text: string,
  index: number,
  baseIndent: number,
): number {
  return text.slice(0, index).includes("\n")
    ? columnAt(text, index)
    : baseIndent + columnAt(text, index);
}

/**
 * Lower a fragment of source text that contains nested JSX roots.
 *
 * `GenericStatement.text` / `SourceBackedExpression.text` are exact source
 * substrings and each nested render node's `expression.text` is the exact
 * substring of the JSX inside it, so each subtree is re-printed to Solid and
 * substituted back by plain string replacement (spans are unreliable for
 * splicing — a synthesised node reports a zero-width span).
 */
export function spliceRenderNodes(
  text: string,
  nested: readonly GenericRenderNode[],
  context: SolidLoweringContext,
  baseIndent: number,
): string {
  let result = text;
  for (const node of nested) {
    const original = node.expression?.text;
    if (original === undefined) {
      continue;
    }
    const index = result.indexOf(original);
    if (index === -1) {
      continue;
    }
    const lowered = lowerRenderNode(
      node,
      context,
      absoluteColumn(result, index, baseIndent),
    );
    result = replaceFirst(result, original, lowered.text);
  }
  return result;
}

/** Splice the nested JSX of an **expression** fragment, then lower the expression. */
export function lowerTextWithRenderNodes(
  text: string,
  nested: readonly GenericRenderNode[],
  context: SolidLoweringContext,
  baseIndent: number,
): string {
  return lowerExpressionText(
    spliceRenderNodes(text, nested, context, baseIndent),
    context,
  );
}

/** Splice the nested JSX of a whole **statement**, then lower the statement. */
export function lowerStatementWithRenderNodes(
  text: string,
  nested: readonly GenericRenderNode[],
  context: SolidLoweringContext,
  baseIndent: number,
): string {
  return lowerStatementText(
    spliceRenderNodes(text, nested, context, baseIndent),
    context,
  );
}

/** Lower a source-backed expression that may contain nested JSX. */
function lowerExpression(
  expression: SourceBackedExpression | undefined,
  nested: readonly GenericRenderNode[],
  context: SolidLoweringContext,
  baseIndent: number,
): string {
  return expression === undefined
    ? ""
    : lowerTextWithRenderNodes(expression.text, nested, context, baseIndent);
}

/** Print the `ref={…}` attribute: a known `useRef` container becomes the callback form. */
function printRefAttribute(
  lowered: string,
  context: SolidLoweringContext,
): string {
  return context.refs.has(lowered.trim())
    ? `${REF_ATTRIBUTE}={${refCallback(lowered.trim())}}`
    : `${REF_ATTRIBUTE}={${lowered}}`;
}

/** Print one JSX attribute (or spread), or `undefined` when it is dropped. */
function printAttribute(
  attribute: GenericAttribute,
  context: SolidLoweringContext,
  baseIndent: number,
): string | undefined {
  if (attribute.kind === "jsx-spread-attribute") {
    return `{...${lowerTextWithRenderNodes(attribute.expression.text, [], context, baseIndent)}}`;
  }
  // The Stage-1 static marker never reaches framework output.
  if (attribute.name === MP_STATIC_ATTRIBUTE) {
    return undefined;
  }
  const name = aliasAttributeName(attribute.name);
  const value = attribute.value;
  if (value === undefined) {
    return name;
  }
  if (value.kind === "string") {
    return `${name}=${quoteAttributeValue(value.value)}`;
  }
  if (value.expression === undefined) {
    return name;
  }
  const lowered = lowerExpression(
    value.expression,
    value.nested,
    context,
    baseIndent,
  );
  if (attribute.name === REF_ATTRIBUTE) {
    return printRefAttribute(lowered, context);
  }
  // Solid accepts a string `class`, so the canonical neutral array form is
  // spread into the framework-agnostic `classNames(…)` runtime helper.
  if (
    attribute.name === CLASS_NAME_ATTRIBUTE &&
    lowered.startsWith("[") &&
    lowered.endsWith("]")
  ) {
    context.runtime.classNames = true;
    return `${name}={${CLASS_NAMES_HELPER}(${lowered.slice(1, -1).trim()})}`;
  }
  return `${name}={${lowered}}`;
}

/** Print the attribute list of an element, including any synthesised slot props. */
function printAttributes(
  node: GenericRenderNode,
  context: SolidLoweringContext,
  baseIndent: number,
  extra: readonly string[],
): string {
  const printed = node.attributes
    .map((attribute) => printAttribute(attribute, context, baseIndent))
    .filter((attribute): attribute is string => attribute !== undefined);
  const all = [...printed, ...extra];
  return all.length === 0 ? "" : ` ${all.join(" ")}`;
}

/**
 * The memo binding a repeated dynamic child expression is read through, when
 * `solid:memoize-dynamic-expressions` promoted it.
 */
function memoRead(
  text: string | undefined,
  context: SolidLoweringContext,
): string | undefined {
  const name =
    text === undefined ? undefined : context.memoized.get(text.trim());
  if (name === undefined) {
    return undefined;
  }
  context.usedMemos.add(name);
  context.usage.createMemo = true;
  return `${name}()`;
}

/** Print a single JSX child, wrapping bare expressions in `{ … }`. */
function printChild(
  child: GenericRenderChild,
  context: SolidLoweringContext,
  baseIndent: number,
): string {
  if (isTextNode(child)) {
    return child.text;
  }
  if (isRenderNode(child)) {
    const lowered = lowerRenderNode(child, context, baseIndent);
    return lowered.expression ? `{${lowered.text}}` : lowered.text;
  }
  const memo = memoRead(child.expression?.text, context);
  if (memo !== undefined) {
    return `{${memo}}`;
  }
  const lowered = lowerExpression(
    child.expression,
    child.nested,
    context,
    baseIndent,
  );
  return lowered === "" ? "" : `{${lowered}}`;
}

/**
 * Print `<open>children</close>`. Children go on their own lines unless the
 * element mixes in literal text, where JSX whitespace is significant and the
 * children must stay exactly as authored.
 */
function printChildren(
  open: string,
  close: string,
  children: readonly GenericRenderChild[],
  context: SolidLoweringContext,
  baseIndent: number,
): string {
  if (children.some((child) => isTextNode(child))) {
    return `${open}${children.map((child) => printChild(child, context, baseIndent)).join("")}${close}`;
  }
  const padding = " ".repeat(baseIndent + 2);
  const inner = children
    .map((child) => `${padding}${printChild(child, context, baseIndent + 2)}`)
    .filter((line) => line.trim().length > 0)
    .join("\n");
  return `${open}\n${inner}\n${" ".repeat(baseIndent)}${close}`;
}

/** The scope object a `<Slot>` passes to a render-prop slot, or `undefined`. */
function slotScope(
  node: GenericRenderNode,
  context: SolidLoweringContext,
  baseIndent: number,
): string | undefined {
  const entries: string[] = [];
  for (const attribute of node.attributes) {
    if (attribute.kind === "jsx-spread-attribute") {
      entries.push(
        `...${lowerTextWithRenderNodes(attribute.expression.text, [], context, baseIndent)}`,
      );
      continue;
    }
    if (
      attribute.name === SLOT_NAME_ATTRIBUTE ||
      attribute.name === MP_STATIC_ATTRIBUTE
    ) {
      continue;
    }
    const value = attribute.value;
    if (value === undefined) {
      entries.push(printObjectMember(attribute.name, "true"));
      continue;
    }
    if (value.kind === "string") {
      entries.push(
        printObjectMember(attribute.name, quoteExpressionString(value.value)),
      );
      continue;
    }
    if (value.expression === undefined) {
      continue;
    }
    entries.push(
      printObjectMember(
        attribute.name,
        lowerExpression(value.expression, value.nested, context, baseIndent),
      ),
    );
  }
  return printObjectLiteral(entries);
}

/**
 * `<Slot name="x" />` → `properties.x` (default slot → `properties.children`);
 * extra attributes make it a render-prop call, and child content becomes the
 * `?? <>…</>` fallback.
 */
function lowerSlotElement(
  node: GenericRenderNode,
  context: SolidLoweringContext,
  baseIndent: number,
): LoweredRenderNode {
  const name = attributeStringValue(node, SLOT_NAME_ATTRIBUTE);
  const scope = slotScope(node, context, baseIndent);
  const read = scopedSlotRead(slotAccess(context, name), scope);
  const fallbackChildren = meaningfulChildren(node);
  if (fallbackChildren.length === 0) {
    return { text: read, expression: true };
  }
  const fallback = printChildren(
    "<>",
    "</>",
    fallbackChildren,
    context,
    baseIndent,
  );
  return {
    text: withSlotFallback(read, scope !== undefined, fallback),
    expression: true,
  };
}

/** Convert one `<Dynamic>` child into an `h(…)` call argument (whitespace-only text dropped). */
function dynamicChildArgument(
  child: GenericRenderChild,
  context: SolidLoweringContext,
  baseIndent: number,
): string | undefined {
  if (isTextNode(child)) {
    const text = child.text.replaceAll(/\s+/g, " ").trim();
    return text === "" ? undefined : quoteExpressionString(text);
  }
  if (isRenderNode(child)) {
    return lowerRenderNode(child, context, baseIndent).text;
  }
  const lowered = lowerExpression(
    child.expression,
    child.nested,
    context,
    baseIndent,
  );
  return lowered === "" ? undefined : lowered;
}

/**
 * `<Dynamic is={X} a={…}>children</Dynamic>` → `h(X, { a: … }, …children)` —
 * Solid's hyperscript runtime resolves the tag at run time, which its compiled
 * JSX cannot. `h` is imported from `solid-js/h` (a **default** export).
 */
function lowerDynamicElement(
  node: GenericRenderNode,
  context: SolidLoweringContext,
  baseIndent: number,
): LoweredRenderNode {
  context.runtime.dynamic = true;
  let tag: string | undefined;
  const entries: string[] = [];
  for (const attribute of node.attributes) {
    if (attribute.kind === "jsx-spread-attribute") {
      entries.push(
        `...${lowerTextWithRenderNodes(attribute.expression.text, [], context, baseIndent)}`,
      );
      continue;
    }
    if (attribute.name === MP_STATIC_ATTRIBUTE) {
      continue;
    }
    const value = attribute.value;
    let text: string;
    if (value === undefined) {
      text = "true";
    } else if (value.kind === "string") {
      text = quoteExpressionString(value.value);
    } else if (value.expression === undefined) {
      continue;
    } else {
      text = lowerExpression(
        value.expression,
        value.nested,
        context,
        baseIndent,
      );
    }
    if (attribute.name === DYNAMIC_IS_ATTRIBUTE) {
      tag = text;
      continue;
    }
    // Solid's hyperscript `ref` must be a callback (or signal setter). A
    // known `useRef` container becomes `ref: (el) => (container.current = el)`
    // — the same rewrite JSX attributes apply via `printRefAttribute`.
    if (attribute.name === REF_ATTRIBUTE) {
      const refName = text.trim();
      entries.push(
        printObjectMember(
          REF_ATTRIBUTE,
          context.refs.has(refName) ? refCallback(refName) : text,
        ),
      );
      continue;
    }
    entries.push(printObjectMember(aliasAttributeName(attribute.name), text));
  }
  const children = meaningfulChildren(node)
    .map((child) => dynamicChildArgument(child, context, baseIndent))
    .filter((argument): argument is string => argument !== undefined);
  const argumentList = [
    tag ?? "undefined",
    printObjectLiteral(entries) ?? "undefined",
    ...children,
  ];
  return {
    text: `${FACTORY_NAME}(${argumentList.join(", ")})`,
    expression: true,
  };
}

/**
 * Named-slot **passing**: a component element whose children carry `slot="x"`
 * markers — `<ForgeDropdown><button slot="trigger"/>panel</ForgeDropdown>` —
 * becomes `<ForgeDropdown trigger={<button/>}>panel</ForgeDropdown>`, so the
 * child's own `<Slot name="trigger" />` read resolves.
 */
function printSlotProperty(
  children: readonly GenericRenderChild[],
  context: SolidLoweringContext,
  baseIndent: number,
): string {
  const stripped = children.map((child) =>
    isRenderNode(child) ? withoutSlotAttribute(child) : child,
  );
  const only = stripped.length === 1 ? stripped[0] : undefined;
  if (only !== undefined && !isTextNode(only)) {
    return isRenderNode(only)
      ? lowerRenderNode(only, context, baseIndent).text
      : lowerExpression(only.expression, only.nested, context, baseIndent);
  }
  return printChildren("<>", "</>", stripped, context, baseIndent);
}

/** Print a plain element / component node, routing any named-slot children into props. */
function printElement(
  node: GenericRenderNode,
  context: SolidLoweringContext,
  baseIndent: number,
): LoweredRenderNode {
  const tag = tagText(node);
  const children = meaningfulChildren(node);
  const defaultChildren: GenericRenderChild[] = [];
  const namedSlots = new Map<string, GenericRenderChild[]>();
  for (const child of children) {
    const name = isComponentNode(node) ? childSlotName(child) : undefined;
    if (name === undefined) {
      defaultChildren.push(child);
      continue;
    }
    const group = namedSlots.get(name) ?? [];
    group.push(child);
    namedSlots.set(name, group);
  }
  const slotAttributes = [...namedSlots].map(
    ([name, group]) =>
      `${name}={${printSlotProperty(group, context, baseIndent)}}`,
  );
  const attributes = printAttributes(node, context, baseIndent, slotAttributes);
  if (defaultChildren.length === 0) {
    return { text: `<${tag}${attributes} />`, expression: false };
  }
  return {
    text: printChildren(
      `<${tag}${attributes}>`,
      `</${tag}>`,
      defaultChildren,
      context,
      baseIndent,
    ),
    expression: false,
  };
}

/** Lower a render node to SolidJS source. */
export function lowerRenderNode(
  node: GenericRenderNode,
  context: SolidLoweringContext,
  baseIndent: number,
): LoweredRenderNode {
  // Stage-1 static subtrees are created **once**, outside every reactive
  // tracking scope, and referenced by name at each use site. Descendants of a
  // hoisted tree are already captured by the parent constant, so they are not
  // hoisted again.
  if (
    context.hoistStatic &&
    hasStaticMarker(node) &&
    node.tagKind !== "fragment" &&
    !context.hoisting
  ) {
    context.hoisting = true;
    const printed = printElement(node, context, 0);
    context.hoisting = false;
    const name = `${MP_HOIST_PREFIX}${context.hoisted.length}`;
    context.hoisted.push(`const ${name} = ${printed.text};`);
    return { text: name, expression: true };
  }

  // A neutral `<Fragment>` maps to Solid's idiomatic forms: an **empty**
  // `<Fragment />` renders nothing, so it collapses to `null`; a fragment with
  // children uses the `<>…</>` shorthand Solid compiles natively.
  if (node.tagKind === "fragment") {
    const children = meaningfulChildren(node);
    if (children.length === 0) {
      return { text: "null", expression: true };
    }
    // `<><Card /></>` wraps nothing — the fragment only exists to group, so a
    // single element child renders identically without it.
    const only = children[0];
    if (
      context.collapseFragments &&
      children.length === 1 &&
      only !== undefined &&
      isRenderNode(only)
    ) {
      return lowerRenderNode(only, context, baseIndent);
    }
    return {
      text: printChildren("<>", "</>", children, context, baseIndent),
      expression: false,
    };
  }

  if (isMarker(node, SLOT_TAG)) {
    return lowerSlotElement(node, context, baseIndent);
  }

  if (isMarker(node, DYNAMIC_TAG)) {
    return lowerDynamicElement(node, context, baseIndent);
  }

  return printElement(node, context, baseIndent);
}
