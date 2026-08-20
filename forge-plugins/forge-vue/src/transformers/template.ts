/**
 * JSX → Vue `<template>` conversion, driven entirely by the generic render tree.
 *
 * The compiler frontend records every JSX root as a {@link GenericRenderNode}:
 * its tag (a name or a source-backed expression), its attributes (static,
 * expression or spread) and its children (nested nodes, literal text and
 * `{ … }` interpolations). This module lowers that tree to native Vue markup:
 *
 * - intrinsic elements and components keep their tag; `<Dynamic is={x}>` and a
 *   computed tag become `<component :is="x">`,
 * - `className` → `class` / `:class`, `on<Event>` → `@event`, `ref={x}` →
 *   `ref="x"`, spreads → `v-bind`, every other dynamic attribute → `:name`,
 * - `<Slot name="x">` → `<slot name="x">`, `properties.children` → the default
 *   `<slot>`, and a child carrying `slot="x"` becomes a `<template #x>` block,
 * - `<HtmlContent html={x}>` → a `v-html` host,
 * - a `{cond && <a/>}` / `{cond ? <a/> : <b/>}` interpolation becomes
 *   `v-if`/`v-else`, and `{items.map((item) => <li/>)}` becomes `v-for` with the
 *   returned element's own `key` as `:key`.
 *
 * Conditional and list shapes are recognised from the **expression text** of a
 * `GenericExpressionNode` combined with its `nested` render nodes: the frontend
 * already isolated each JSX branch, so the text analysis only has to locate the
 * operator, never to parse the markup.
 */
import {
  isExpressionNode,
  isRenderNode,
  isTextNode,
} from "@mission-platform/forge-plugin-api";
import {
  CLASS_NAME_ATTRIBUTE,
  JSX_ATTRIBUTE_RENAMES,
} from "@mission-platform/forge-plugin-api/compiler/ast.js";
import { MP_STATIC_ATTR } from "@mission-platform/forge-plugin-api/compiler/optimize.js";

import {
  inlineIdentifiers,
  rewriteTemplateExpression,
  type VueScope,
} from "./expressions.js";
import { readHelperCall, type InlinableHelper } from "./helpers.js";
import { containsHyperscript, hyperscriptRenderNode } from "./hyperscript.js";
import { splitStatements } from "./statements.js";
import {
  blankRegions,
  collapseWhitespace,
  escapeAttribute,
  escapeBinding,
  indexOfTopLevel,
  matchBracket,
  maskLiterals,
  pad,
  splitTopLevel,
  stripTypeAssertion,
  unwrapParentheses,
} from "./text.js";

import type { RecursiveHelper } from "./recursive.js";
import type {
  GenericAttribute,
  GenericExpressionNode,
  GenericRenderChild,
  GenericRenderNode,
} from "@mission-platform/forge-plugin-api";

/** Raised when a render shape has no faithful `<template>` form. */
export class UnsupportedTemplate extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "UnsupportedTemplate";
  }
}

/** Everything the template conversion needs beyond the render tree itself. */
export interface TemplateContext {
  /** Reference rewriting scope (state, refs, props, events, models). */
  readonly scope: VueScope;
  /** Props whose declared type is a render/node type — rendered as slots, not bound. */
  readonly nodeTypedProps: ReadonlySet<string>;
  /**
   * Node-typed props that name a slot and are therefore **absent** from
   * `defineProps`. Their content is reached through `<slot>`; reading one as a
   * value in markup would bind an identifier the script never declares, so it
   * has no `<template>` form at all.
   */
  readonly slotOnlyProps: ReadonlySet<string>;
  /**
   * Node-valued derived consts (`const row = <tr/>`). A `<template>` has no
   * binding form for a VNode, so each reference is substituted structurally by
   * the subtree it names.
   */
  readonly nodeSubstitutions: ReadonlyMap<string, GenericRenderNode>;
  /**
   * Scalar consts declared inside the current `.map(…)` callback (or an inlined
   * helper), spliced into every expression printed while walking its markup —
   * Vue's `<template>` has no per-item statement scope.
   */
  readonly substitutions: ReadonlyMap<string, string>;
  /**
   * Locally declared handler consts (`const onPick = () => …`). A listener that
   * names one binds it directly; an *absent* callback prop read is wrapped in an
   * optional call so a missing handler stays a no-op.
   */
  readonly handlerNames: ReadonlySet<string>;
  /**
   * Consts that normalise the component's children into an array
   * (`const childList = Array.isArray(children) ? […children] : [children]`).
   * They all resolve to the same thing in Vue: the default `<slot />`.
   */
  readonly slotSources: ReadonlySet<string>;
  /**
   * Derived consts whose initializer *produces* markup (`const items =
   * list.map((x) => <li/>)`). A `<template>` cannot interpolate a VNode array,
   * so each reference is inlined as the projection it names — or, when the shape
   * is not expressible, it forces the render-closure fallback.
   */
  readonly nodeArraySources: ReadonlyMap<string, NodeArraySource>;
  /**
   * Function-valued node helpers safe to splice into their call sites. A
   * `<template>` has no binding form for a VNode factory, so each `fn(…)` call
   * renders the helper's body with its arguments bound to the parameters.
   */
  readonly helpers: ReadonlyMap<string, InlinableHelper>;
  /**
   * Names bound by a rest element of the props destructuring. Spreading one is
   * Vue's `$attrs`; spreading anything else has no `<template>` form at all.
   */
  readonly restPropNames: ReadonlySet<string>;
  /**
   * Whether the lowered plan accepted static-subtree hoisting
   * (`vue:hoist-static-subtrees`). Each subtree the neutral optimizer marked
   * static is then rendered once with `v-once`; without the optimization the
   * marker is simply dropped.
   */
  readonly staticHoisting: boolean;
  /**
   * The self-recursive render helper extracted into an auxiliary component, if
   * any. Every call of it renders a `v-for` of that component instead.
   */
  readonly recursiveHelper?: RecursiveHelper;
  /**
   * The loop alias the recursive `v-for` binds. The parent reuses the helper's
   * own item parameter; the auxiliary component loops its children as `child`.
   */
  readonly recursiveAlias?: string;
  /**
   * A `typeName → node-typed field names` index over the module's interfaces.
   * Together with {@link TemplateContext.aliasTypes} it classifies a member read
   * on a loop alias receiver-type-aware.
   */
  readonly nodeTypedFieldsByType: ReadonlyMap<string, ReadonlySet<string>>;
  /**
   * Top-level functions declared to return node content (`function
   * variantIcon(v: Variant): MpElement`). A call of one yields a VNode, which
   * only a `<component :is>` host can render.
   */
  readonly nodeReturningFunctions: ReadonlySet<string>;
  /** Declared types of the in-scope consts and props (`items` → `ToolbarItem[]`). */
  readonly declaredTypes: ReadonlyMap<string, string>;
  /** Declared element types of the enclosing `.map()` aliases (`item` → `ToolbarItem`). */
  readonly aliasTypes: ReadonlyMap<string, string>;
}

/** A derived const whose initializer builds markup rather than a value. */
export interface NodeArraySource {
  /** The initializer's recorded source text. */
  readonly initializer: string;
  /** The JSX roots recorded inside that initializer. */
  readonly renderNodes: readonly GenericRenderNode[];
}

/** The neutral markers that are consumed by the emitter rather than rendered. */
const SLOT_TAG = "Slot";
const DYNAMIC_TAG = "Dynamic";
const HTML_CONTENT_TAG = "HtmlContent";

/**
 * Rewrite an expression for a binding and escape it for a double-quoted value.
 *
 * A binding is a *value* position, so anything that only exists as markup — a
 * node const, a markup-producing helper, a slot-only prop — has no spelling
 * here. Emitting it anyway would reference a binding the script never declares,
 * so the whole component takes the render-closure fallback instead.
 */
function binding(text: string, context: TemplateContext): string {
  const expression = lowerSlotPresence(
    templateExpression(text, context),
    context,
  );
  if (callsMarkupSource(expression, context)) {
    throw new UnsupportedTemplate(
      `markup-producing helper called in a value position :: ${expression}`,
    );
  }
  if (mentionsName(expression, context.slotOnlyProps)) {
    throw new UnsupportedTemplate(
      `slot-only prop read as a value :: ${expression} :: ${[...context.slotOnlyProps].join(",")}`,
    );
  }
  // A children-derived const is consumed structurally as `<slot />` and is
  // therefore never declared in the script. Any read {@link lowerSlotPresence}
  // could not translate would compile to a `_ctx.<name>` lookup — `undefined` at
  // render time, which throws out of the render function and renders nothing —
  // so the component takes the render closure (where the const survives as a
  // local) instead.
  if (mentionsName(expression, context.slotSources)) {
    throw new UnsupportedTemplate(
      `children-derived const read as a value :: ${expression}`,
    );
  }
  return escapeBinding(expression);
}

/**
 * Whether `text` mentions any of `names` as a whole, non-member identifier
 * outside string literals, template literals and comments — a class-name string
 * that merely *contains* a binding's name is not a reference to it.
 */
function mentionsName(text: string, names: Iterable<string>): boolean {
  return matchesOutsideLiterals(
    text,
    names,
    String.raw`(?<![\w$.])NAME(?![\w$])`,
  );
}

/**
 * Whether `text` *calls* a markup-producing binding (`datePane()`). Its result
 * is a VNode tree, which a binding cannot carry: the call has to stay in a
 * render closure. A mere mention is not enough — a marker const may legitimately
 * be read for its length or compared against `undefined`.
 */
function callsMarkupSource(text: string, context: TemplateContext): boolean {
  return matchesOutsideLiterals(
    text,
    [...context.helpers.keys(), ...context.nodeArraySources.keys()],
    String.raw`(?<![\w$.])NAME\s*(?:\?\.)?\(`,
  );
}

/** Whether any `names` matches `pattern` (with `NAME` substituted) outside literals. */
function matchesOutsideLiterals(
  text: string,
  names: Iterable<string>,
  pattern: string,
): boolean {
  const mask = maskLiterals(text);
  for (const name of names) {
    for (const match of text.matchAll(
      new RegExp(pattern.replace("NAME", name), "g"),
    )) {
      if (mask[match.index] !== true) {
        return true;
      }
    }
  }
  return false;
}

/** How many times identifier inlining is re-applied before giving up. */
const INLINE_PASSES = 4;

/**
 * Resolve the substitutions against each other, so a value that itself names
 * another in-scope const (a helper parameter inside a loop-local const, say) is
 * already fully expanded before it is spliced into an expression.
 */
function resolveSubstitutions(
  substitutions: ReadonlyMap<string, string>,
): Map<string, string> {
  const resolved = new Map(substitutions);
  for (let pass = 0; pass < INLINE_PASSES; pass += 1) {
    let changed = false;
    for (const [name, value] of resolved) {
      const others = new Map([...resolved].filter(([key]) => key !== name));
      const next = inlineIdentifiers(value, others);
      if (next !== value) {
        resolved.set(name, next);
        changed = true;
      }
    }
    if (!changed) {
      break;
    }
  }
  return resolved;
}

/** Rewrite an expression for template use, with the in-scope consts inlined. */
function templateExpression(text: string, context: TemplateContext): string {
  // The substitutions are spliced **first** so the rewrites below (CSS-Module
  // collapse, setter/event rewrites) also see through the inlined bodies.
  const inlined = inlineIdentifiers(
    stripTypeAssertion(text),
    resolveSubstitutions(context.substitutions),
  );
  return rewriteTemplateExpression(inlined, context.scope);
}

/**
 * Whether a handler expression can be bound directly. An arrow/function
 * expression, an `emit(…)` call and a plain assignment are all valid Vue
 * listener bodies; anything else (an optional callback prop read) is wrapped in
 * an optional call so an absent handler is a no-op.
 */
function isDirectHandler(text: string, context: TemplateContext): boolean {
  const trimmed = unwrapParentheses(text);
  return (
    trimmed.startsWith("function") ||
    trimmed.startsWith("emit(") ||
    context.handlerNames.has(trimmed) ||
    indexOfTopLevel(trimmed, "=>") !== -1 ||
    indexOfTopLevel(trimmed, " = ") !== -1
  );
}

/** Render a listener value, wrapping a bare (possibly absent) callback read. */
function handlerBinding(text: string, context: TemplateContext): string {
  const rewritten = templateExpression(text, context);
  if (isDirectHandler(rewritten, context)) {
    return escapeBinding(rewritten);
  }
  return escapeBinding(
    `(...args: unknown[]) => ((${rewritten}) as ((...a: unknown[]) => unknown) | undefined)?.(...args)`,
  );
}

/** Whether a node carries the neutral optimizer's static-subtree marker. */
function hasStaticMarker(node: GenericRenderNode): boolean {
  return node.attributes.some(
    (attribute) =>
      attribute.kind === "jsx-attribute" && attribute.name === MP_STATIC_ATTR,
  );
}

/** The static string value of an attribute, when it has one. */
function staticValue(attribute: GenericAttribute): string | undefined {
  return attribute.kind === "jsx-attribute" &&
    attribute.value?.kind === "string"
    ? attribute.value.value
    : undefined;
}

/** The expression text of an attribute, when it carries one. */
function expressionValue(attribute: GenericAttribute): string | undefined {
  if (attribute.kind === "jsx-spread-attribute") {
    return attribute.expression.text;
  }
  return attribute.value?.kind === "expression"
    ? attribute.value.expression?.text
    : undefined;
}

/** The `slot="name"` routing marker of a child element, when present. */
function slotTarget(node: GenericRenderNode): string | undefined {
  for (const attribute of node.attributes) {
    if (attribute.kind === "jsx-attribute" && attribute.name === "slot") {
      return staticValue(attribute);
    }
  }
  return undefined;
}

/** Render one attribute as Vue markup, or `undefined` when it is consumed here. */
function emitAttribute(
  attribute: GenericAttribute,
  context: TemplateContext,
  isNativeElement: boolean,
): string | undefined {
  if (attribute.kind === "jsx-spread-attribute") {
    // `const { tone, ...rest } = properties` then `<p {...rest}>` is precisely
    // what Vue's fall-through attributes already are.
    if (context.restPropNames.has(attribute.expression.text.trim())) {
      return 'v-bind="$attrs"';
    }
    // An arbitrary spread cannot be reproduced faithfully: the order in which it
    // overrides the authored attributes is not expressible.
    throw new UnsupportedTemplate("JSX spread attribute");
  }
  const { name } = attribute;
  // The `slot="…"` marker becomes a `<template #name>` block, and the Stage-1
  // static marker never leaves the compiler.
  if (name === "slot" || name === MP_STATIC_ATTR) {
    return undefined;
  }

  // `on<Event>` → `@<event>`. Native DOM event names are all-lowercase
  // (`@dragover`), while a component listener keeps the child's camelCase emit
  // name; an `onUpdate<Name>` forwarded to a component binds `@update:<name>`.
  if (/^on[A-Z]/.test(name)) {
    const handler = expressionValue(attribute);
    if (handler === undefined) {
      return undefined;
    }
    const modelUpdate = isNativeElement
      ? null
      : /^onUpdate([A-Z].*)$/.exec(name);
    if (modelUpdate?.[1] !== undefined) {
      const local =
        modelUpdate[1].charAt(0).toLowerCase() + modelUpdate[1].slice(1);
      return `@update:${local}="${handlerBinding(handler, context)}"`;
    }
    const event = isNativeElement
      ? name.slice(2).toLowerCase()
      : name.charAt(2).toLowerCase() + name.slice(3);
    return `@${event}="${handlerBinding(handler, context)}"`;
  }

  // `ref={identifier}` → a string template ref.
  if (name === "ref") {
    const target = expressionValue(attribute);
    if (target === undefined || !/^[A-Za-z_$][\w$]*$/.test(target.trim())) {
      throw new UnsupportedTemplate("non-identifier ref");
    }
    return `ref="${target.trim()}"`;
  }

  const outName =
    name === CLASS_NAME_ATTRIBUTE
      ? "class"
      : (JSX_ATTRIBUTE_RENAMES.get(name) ?? name);
  if (attribute.value === undefined) {
    return outName;
  }
  if (attribute.value.kind === "string") {
    return `${outName}="${escapeAttribute(attribute.value.value)}"`;
  }
  const expression = attribute.value.expression?.text;
  if (expression === undefined) {
    return outName;
  }
  return `:${outName}="${binding(expression, context)}"`;
}

/**
 * A component attribute that forwards one of this component's own render props
 * down as a **scoped slot** (`label={properties.label}`) rather than a data
 * prop. Returns the child-side slot name and this component's own slot name.
 */
function forwardedRenderSlot(
  attribute: GenericAttribute,
  context: TemplateContext,
): { child: string; own: string } | undefined {
  if (attribute.kind !== "jsx-attribute") {
    return undefined;
  }
  const expression = expressionValue(attribute);
  if (expression === undefined) {
    return undefined;
  }
  const match = /^([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)$/.exec(
    stripTypeAssertion(expression),
  );
  if (match === null || match[1] !== context.scope.propsParameterName) {
    return undefined;
  }
  return context.nodeTypedProps.has(match[2])
    ? { child: attribute.name, own: match[2] }
    : undefined;
}

/** Render the `<slot>` a neutral `<Slot name="x" …>` marker stands for. */
function emitSlotMarker(
  node: GenericRenderNode,
  depth: number,
  context: TemplateContext,
): string {
  const attributes: string[] = [];
  for (const attribute of node.attributes) {
    if (attribute.kind !== "jsx-attribute") {
      continue;
    }
    if (attribute.name === "name") {
      const name = staticValue(attribute);
      if (name !== undefined) {
        attributes.push(`name="${escapeAttribute(name)}"`);
      }
      continue;
    }
    // Every other attribute is scope data handed to the slot's consumer.
    const expression = expressionValue(attribute);
    attributes.push(
      expression === undefined
        ? `${attribute.name}="${escapeAttribute(staticValue(attribute) ?? "")}"`
        : `:${attribute.name}="${binding(expression, context)}"`,
    );
  }
  const open = `slot${attributes.length > 0 ? ` ${attributes.join(" ")}` : ""}`;
  if (node.children.length === 0) {
    return `${pad(depth)}<${open} />`;
  }
  return `${pad(depth)}<${open}>\n${emitChildren(node.children, depth + 1, context)}\n${pad(depth)}</slot>`;
}

/** Split a component's children into default content and named `<template>` blocks. */
function partitionSlots(children: readonly GenericRenderChild[]): {
  defaultChildren: GenericRenderChild[];
  named: Map<string, GenericRenderChild[]>;
} {
  const defaultChildren: GenericRenderChild[] = [];
  const named = new Map<string, GenericRenderChild[]>();
  for (const child of children) {
    const target = isRenderNode(child) ? slotTarget(child) : undefined;
    if (target === undefined) {
      defaultChildren.push(child);
      continue;
    }
    const bucket = named.get(target) ?? [];
    bucket.push(child);
    named.set(target, bucket);
  }
  return { defaultChildren, named };
}

/** Render a `<component :is="…">` host for a dynamic tag. */
function emitDynamic(
  node: GenericRenderNode,
  depth: number,
  context: TemplateContext,
  directives: readonly string[],
  trailing: readonly string[] = [],
): string {
  const isAttribute = node.attributes.find(
    (attribute) =>
      attribute.kind === "jsx-attribute" && attribute.name === "is",
  );
  const rest = node.attributes.filter((attribute) => attribute !== isAttribute);
  // A *literal* `is` names a fixed tag; there is nothing dynamic about it, so it
  // renders as that element rather than through a `<component :is>` host.
  const literalTag =
    isAttribute === undefined ? undefined : staticValue(isAttribute);
  if (literalTag !== undefined) {
    return emitTag(
      literalTag,
      directives,
      rest,
      node.children,
      node.selfClosing,
      depth,
      context,
      /^[a-z]/.test(literalTag),
      trailing,
    );
  }
  const tagExpression =
    typeof node.tag === "string"
      ? isAttribute === undefined
        ? undefined
        : expressionValue(isAttribute)
      : node.tag.text;
  if (tagExpression === undefined) {
    throw new UnsupportedTemplate("dynamic element without an `is` expression");
  }
  return emitTag(
    "component",
    [...directives, `:is="${binding(tagExpression, context)}"`],
    rest,
    node.children,
    node.selfClosing,
    depth,
    context,
    false,
    trailing,
  );
}

/** Render an `<HtmlContent html={…}>` marker as a `v-html` host element. */
function emitHtmlContent(
  node: GenericRenderNode,
  depth: number,
  context: TemplateContext,
  directives: readonly string[],
  trailing: readonly string[] = [],
): string {
  const htmlAttribute = node.attributes.find(
    (attribute) =>
      attribute.kind === "jsx-attribute" && attribute.name === "html",
  );
  const html =
    htmlAttribute === undefined ? undefined : expressionValue(htmlAttribute);
  if (html === undefined) {
    throw new UnsupportedTemplate("HtmlContent without an html expression");
  }
  const tagAttribute = node.attributes.find(
    (attribute) =>
      attribute.kind === "jsx-attribute" && attribute.name === "as",
  );
  const tag =
    tagAttribute === undefined ? "div" : (staticValue(tagAttribute) ?? "div");
  const rest = node.attributes.filter(
    (attribute) => attribute !== htmlAttribute && attribute !== tagAttribute,
  );
  return emitTag(
    tag,
    [`v-html="${binding(html, context)}"`, ...directives],
    rest,
    [],
    true,
    depth,
    context,
    true,
    trailing,
  );
}

/** Assemble an open/close tag pair (or a self-closing tag) with its children. */
function emitTag(
  tag: string,
  leading: readonly string[],
  attributes: readonly GenericAttribute[],
  children: readonly GenericRenderChild[],
  selfClosing: boolean,
  depth: number,
  context: TemplateContext,
  isNativeElement: boolean,
  trailing: readonly string[] = [],
): string {
  const parts = [...leading];
  const slotBlocks: string[] = [];
  for (const attribute of attributes) {
    if (!isNativeElement) {
      const forwarded = forwardedRenderSlot(attribute, context);
      if (forwarded !== undefined) {
        slotBlocks.push(
          `${pad(depth + 1)}<template #${forwarded.child}="scope">\n${pad(depth + 2)}<slot name="${forwarded.own}" v-bind="scope" />\n${pad(depth + 1)}</template>`,
        );
        continue;
      }
    }
    const rendered = emitAttribute(attribute, context, isNativeElement);
    if (rendered !== undefined) {
      parts.push(rendered);
    }
  }
  parts.push(...trailing);
  // A rest spread lowered to `v-bind="$attrs"` may coincide with the root's own
  // fall-through binding; the same directive twice is a Vue compile error.
  const rendered = [...new Set(parts)];
  const open = `${tag}${rendered.length > 0 ? ` ${rendered.join(" ")}` : ""}`;
  const { defaultChildren, named } = partitionSlots(children);
  for (const [name, slotChildren] of named) {
    slotBlocks.push(
      `${pad(depth + 1)}<template #${name}>\n${emitChildren(slotChildren, depth + 2, context)}\n${pad(depth + 1)}</template>`,
    );
  }
  const body: string[] = [];
  if (defaultChildren.length > 0) {
    // Once any named slot is present the remaining children are no longer
    // implicitly the default slot: Vue requires them in their own `#default`
    // block, or it drops them.
    body.push(
      slotBlocks.length === 0
        ? emitChildren(defaultChildren, depth + 1, context)
        : `${pad(depth + 1)}<template #default>\n${emitChildren(defaultChildren, depth + 2, context)}\n${pad(depth + 1)}</template>`,
    );
  }
  body.push(...slotBlocks);
  if (body.length === 0) {
    return selfClosing || children.length === 0
      ? `${pad(depth)}<${open} />`
      : `${pad(depth)}<${open}></${tag}>`;
  }
  return `${pad(depth)}<${open}>\n${body.join("\n")}\n${pad(depth)}</${tag}>`;
}

/**
 * Render one node of the generic render tree, optionally carrying leading
 * `directives` (`v-if`, `v-for`, `v-bind="$attrs"`).
 */
export function emitRenderNode(
  node: GenericRenderNode,
  depth: number,
  context: TemplateContext,
  directives: readonly string[] = [],
  trailing: readonly string[] = [],
): string {
  // A hoisted static subtree renders once; its descendants inherit that, so the
  // marker is not re-applied inside it.
  if (context.staticHoisting && hasStaticMarker(node)) {
    return emitRenderNode(
      node,
      depth,
      { ...context, staticHoisting: false },
      [...directives, "v-once"],
      trailing,
    );
  }
  if (node.tagKind === "dynamic") {
    return emitDynamic(node, depth, context, directives, trailing);
  }
  const tag = typeof node.tag === "string" ? node.tag : undefined;
  if (tag === undefined) {
    throw new UnsupportedTemplate("unnamed render node");
  }
  if (node.tagKind === "fragment") {
    if (directives.length === 0) {
      return emitChildren(node.children, depth, context);
    }
    return `${pad(depth)}<template ${directives.join(" ")}>\n${emitChildren(node.children, depth + 1, context)}\n${pad(depth)}</template>`;
  }
  if (tag === SLOT_TAG) {
    const markup = emitSlotMarker(node, depth, context);
    return directives.length === 0
      ? markup
      : `${pad(depth)}<template ${directives.join(" ")}>\n${emitSlotMarker(node, depth + 1, context)}\n${pad(depth)}</template>`;
  }
  if (tag === DYNAMIC_TAG) {
    return emitDynamic(node, depth, context, directives, trailing);
  }
  if (tag === HTML_CONTENT_TAG) {
    return emitHtmlContent(node, depth, context, directives, trailing);
  }
  return emitTag(
    tag,
    directives,
    node.attributes,
    node.children,
    node.selfClosing,
    depth,
    context,
    node.tagKind === "element",
    trailing,
  );
}

/** Render every child of a node, one per line. */
export function emitChildren(
  children: readonly GenericRenderChild[],
  depth: number,
  context: TemplateContext,
): string {
  const lines: string[] = [];
  for (const child of children) {
    const rendered = emitChild(child, depth, context);
    if (rendered.length > 0) {
      lines.push(rendered);
    }
  }
  return lines.join("\n");
}

/** Render a single child (nested node, literal text or `{ … }` interpolation). */
function emitChild(
  child: GenericRenderChild,
  depth: number,
  context: TemplateContext,
): string {
  if (isRenderNode(child)) {
    return emitRenderNode(child, depth, context);
  }
  if (isTextNode(child)) {
    const text = collapseWhitespace(child.text);
    return text.length === 0 ? "" : `${pad(depth)}${text}`;
  }
  return emitExpressionChild(child, depth, context);
}

/** A conditional arm: the branch that renders under a directive. */
interface ConditionalArm {
  readonly node?: GenericRenderNode;
  readonly text?: string;
}

/**
 * Locate the top-level ternary `?` of an expression (skipping `?.` and `??`),
 * or `-1`.
 */
function ternaryIndex(
  text: string,
  nested: readonly GenericRenderNode[] = [],
): number {
  const scan = blankRegions(text, recordedTexts(nested));
  const mask = maskLiterals(scan);
  let depth = 0;
  for (let index = 0; index < scan.length; index += 1) {
    if (mask[index]) {
      continue;
    }
    const character = scan[index];
    if (character === "(" || character === "[" || character === "{") {
      depth += 1;
    } else if (character === ")" || character === "]" || character === "}") {
      depth -= 1;
    } else if (character === "?" && depth === 0) {
      if (
        scan[index + 1] === "." ||
        scan[index + 1] === "?" ||
        scan[index - 1] === "?"
      ) {
        index += 1;
        continue;
      }
      return index;
    }
  }
  return -1;
}

/** Locate the `:` matching the ternary `?` at `question`, or `-1`. */
function ternaryColonIndex(
  text: string,
  question: number,
  nested: readonly GenericRenderNode[] = [],
): number {
  const scan = blankRegions(text, recordedTexts(nested));
  const mask = maskLiterals(scan);
  let depth = 0;
  let pending = 0;
  for (let index = question + 1; index < scan.length; index += 1) {
    if (mask[index]) {
      continue;
    }
    const character = scan[index];
    if (character === "(" || character === "[" || character === "{") {
      depth += 1;
    } else if (character === ")" || character === "]" || character === "}") {
      depth -= 1;
    } else if (
      character === "?" &&
      depth === 0 &&
      scan[index + 1] !== "." &&
      scan[index + 1] !== "?"
    ) {
      pending += 1;
    } else if (character === ":" && depth === 0) {
      if (pending === 0) {
        return index;
      }
      pending -= 1;
    }
  }
  return -1;
}

/** The exact recorded source text of each render node, for masking. */
function recordedTexts(
  nested: readonly GenericRenderNode[],
): readonly string[] {
  return nested
    .map((node) => node.expression?.text ?? "")
    .filter((text) => text.length > 0)
    .sort((left, right) => right.length - left.length);
}

/** Whether an expression renders nothing (`null` / `undefined`). */
function isNothing(text: string): boolean {
  const trimmed = unwrapParentheses(text);
  return trimmed === "null" || trimmed === "undefined" || trimmed.length === 0;
}

/** The render node whose recorded source text matches `text`, if any. */
function nestedFor(
  nested: readonly GenericRenderNode[],
  text: string,
): GenericRenderNode | undefined {
  const target = unwrapParentheses(text);
  return nested.find(
    (node) => unwrapParentheses(node.expression?.text ?? "") === target,
  );
}

/** A `.map()` / `.flatMap()` list projection recognised from expression text. */
interface ListProjection {
  /** The loop source, evaluated in the enclosing scope. */
  readonly source: string;
  /** The `(item, index)` alias list. */
  readonly alias: string;
  /** The callback's parameter names, in order. */
  readonly names: readonly string[];
  /** The projected elements — one for a single return, several for an array. */
  readonly elements: readonly GenericRenderNode[];
  /** Whether the callback returned a fixed array (a keyless `<template v-for>`). */
  readonly returnsArray: boolean;
  /** The callback's leading scalar consts, inlined into the loop's expressions. */
  readonly substitutions: ReadonlyMap<string, string>;
  /** The callback's leading node-valued consts, spliced in structurally. */
  readonly nodeSubstitutions: ReadonlyMap<string, GenericRenderNode>;
  /** The callback's leading markup-*producing* consts, lowered at each reference. */
  readonly markupSubstitutions: ReadonlyMap<string, NodeArraySource>;
}

/** A callback split into its parameter names and its body source. */
interface CallbackParts {
  readonly names: readonly string[];
  readonly body: string;
}

/** Split an inline `(a, b) => body` / `function (a, b) { … }` callback. */
function readCallbackParts(text: string): CallbackParts | undefined {
  const callback = text.trim();
  const arrow = indexOfTopLevel(callback, "=>");
  if (arrow === -1) {
    return undefined;
  }
  const names = splitTopLevel(
    unwrapParentheses(callback.slice(0, arrow)),
    ",",
  ).map((parameter) => parameter.split(":")[0].trim());
  if (
    names.length === 0 ||
    names.length > 2 ||
    names.some((name) => name.startsWith("..."))
  ) {
    return undefined;
  }
  return { names, body: callback.slice(arrow + 2).trim() };
}

/** A callback body split into its leading declarations and its returned text. */
interface CallbackBody {
  readonly returned: string;
  readonly substitutions: Map<string, string>;
  readonly nodeSubstitutions: Map<string, GenericRenderNode>;
  readonly markupSubstitutions: Map<string, NodeArraySource>;
}

/**
 * The `const` declarations that precede a callback's `return`, split into scalar
 * substitutions (inlined into template expressions), node-valued ones (spliced
 * into the returned markup) and markup-*producing* ones (lowered wherever they
 * are referenced), plus the returned expression's text.
 *
 * Anything that is not a run of single-declaration `const`s followed by a single
 * `return` yields `undefined`, so the projection falls back.
 */
function readCallbackBody(
  body: string,
  nested: readonly GenericRenderNode[],
): CallbackBody | undefined {
  const substitutions = new Map<string, string>();
  const nodeSubstitutions = new Map<string, GenericRenderNode>();
  const markupSubstitutions = new Map<string, NodeArraySource>();
  if (!body.startsWith("{")) {
    return {
      returned: unwrapParentheses(body),
      substitutions,
      nodeSubstitutions,
      markupSubstitutions,
    };
  }
  const close = matchBracket(body, 0);
  if (close !== body.length - 1) {
    return undefined;
  }
  const statements = splitStatements(body.slice(1, close));
  const last = statements.at(-1);
  if (last === undefined || !/^return\b/.test(last)) {
    return undefined;
  }
  for (const statement of statements.slice(0, -1)) {
    const declaration =
      /^const\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*([\s\S]*?);?$/.exec(
        statement,
      );
    if (declaration === null) {
      return undefined;
    }
    const [, name, initializer] = declaration;
    const node = nestedFor(nested, initializer);
    if (node !== undefined) {
      nodeSubstitutions.set(name, node);
      continue;
    }
    // An initializer that *builds* markup without being one recorded node — a
    // conditional over JSX, a projection, a hyperscript call — is lowered at each
    // reference instead of being inlined as a value, which would stringify it.
    if (
      containsHyperscript(initializer) ||
      nested.some((candidate) =>
        initializer.includes(candidate.expression?.text ?? "\u0000"),
      )
    ) {
      markupSubstitutions.set(name, { initializer, renderNodes: nested });
      continue;
    }
    substitutions.set(name, inlineIdentifiers(initializer, substitutions));
  }
  const returned = last
    .replace(/^return\s*/, "")
    .replace(/;$/, "")
    .trim();
  return {
    returned: unwrapParentheses(returned),
    substitutions,
    nodeSubstitutions,
    markupSubstitutions,
  };
}

/** The elements a callback's returned expression stands for, if it is markup. */
function returnedElements(
  returned: string,
  nested: readonly GenericRenderNode[],
):
  | { elements: readonly GenericRenderNode[]; returnsArray: boolean }
  | undefined {
  const single = nestedFor(nested, returned);
  if (single !== undefined) {
    return { elements: [single], returnsArray: false };
  }
  // `.flatMap((item) => [<dt/>, <dd/>])` — every entry must be recorded markup.
  if (
    returned.startsWith("[") &&
    matchBracket(returned, 0) === returned.length - 1
  ) {
    const entries = splitTopLevel(returned.slice(1, -1), ",");
    const elements = entries.map((entry) => nestedFor(nested, entry));
    if (
      entries.length > 0 &&
      elements.every((element) => element !== undefined)
    ) {
      return { elements: elements as GenericRenderNode[], returnsArray: true };
    }
  }
  return undefined;
}

/**
 * Recognise `items.map((item, index) => <li/>)` — including the block-body form
 * with leading consts, `.flatMap(…)` returning an element array, and
 * `Array.from(source, mapper)` — from the expression text plus the nested render
 * nodes the frontend isolated for it.
 */
function readListProjection(
  text: string,
  nested: readonly GenericRenderNode[],
): ListProjection | undefined {
  const call = readListCall(text);
  if (call === undefined) {
    return undefined;
  }
  const parts = readCallbackParts(call.callback);
  if (parts === undefined) {
    return undefined;
  }
  const body = readCallbackBody(parts.body, nested);
  if (body === undefined) {
    return undefined;
  }
  const projected = returnedElements(body.returned, nested);
  if (projected === undefined) {
    return undefined;
  }
  return {
    source: call.source,
    alias:
      parts.names.length === 1 ? parts.names[0] : `(${parts.names.join(", ")})`,
    names: parts.names,
    elements: projected.elements,
    returnsArray: projected.returnsArray,
    substitutions: body.substitutions,
    nodeSubstitutions: body.nodeSubstitutions,
    markupSubstitutions: body.markupSubstitutions,
  };
}

/** Whether a derived expression projects actual render nodes into a list. */
export function isTemplateListProjection(
  text: string,
  nested: readonly GenericRenderNode[],
): boolean {
  return readListProjection(text, nested) !== undefined;
}

/** The loop source and callback source of a list-producing call. */
function readListCall(
  text: string,
): { source: string; callback: string } | undefined {
  // `Array.from(source, mapper)` materialises the array, then projects it.
  if (/^Array\s*\.\s*from\s*\(/.test(text)) {
    const open = text.indexOf("(");
    const close = matchBracket(text, open);
    if (close === text.length - 1) {
      const args = splitTopLevel(text.slice(open + 1, close), ",");
      if (args.length === 2) {
        return { source: `Array.from(${args[0]})`, callback: args[1] };
      }
    }
  }
  for (const method of [".map(", ".flatMap("]) {
    const index = indexOfTopLevel(text, method);
    if (index === -1) {
      continue;
    }
    const open = index + method.length - 1;
    const close = matchBracket(text, open);
    if (close !== text.length - 1) {
      continue;
    }
    // `items?.map(…)` keeps the optional-chaining `?` in the sliced receiver;
    // `v-for` renders nothing for a nullish source, so the marker is dropped.
    const source = text.slice(0, index).trim().replace(/\?$/, "");
    return { source, callback: text.slice(open + 1, close) };
  }
  return undefined;
}

/** Render a list projection as a keyed `v-for`. */
function emitListProjection(
  projection: ListProjection,
  depth: number,
  context: TemplateContext,
  directives: readonly string[],
): string {
  const loop = `v-for="${escapeAttribute(projection.alias)} in ${binding(projection.source, context)}"`;
  // The projected markup is walked with the callback's consts in scope.
  // The item alias's element type is recorded so a node-valued member read on it
  // (`{item.icon}`) is classified receiver type-aware inside the loop.
  const elementType = elementTypeOf(projection.source, context);
  const itemName = projection.names[0];
  const inner: TemplateContext = {
    ...context,
    substitutions: new Map([
      ...context.substitutions,
      ...projection.substitutions,
    ]),
    nodeSubstitutions: new Map([
      ...context.nodeSubstitutions,
      ...projection.nodeSubstitutions,
    ]),
    nodeArraySources: new Map([
      ...context.nodeArraySources,
      ...projection.markupSubstitutions,
    ]),
    aliasTypes:
      elementType === undefined || itemName === undefined
        ? context.aliasTypes
        : new Map([...context.aliasTypes, [itemName, elementType]]),
  };
  // A fixed element array loops as a keyless `<template v-for>` block wrapping
  // every projected sibling; a guard sits on an outer `<template>`.
  if (projection.returnsArray) {
    const inside = directives.length === 0 ? depth : depth + 1;
    // Vue rejects a `:key` on a child of a `<template v-for>`, so the key sits on
    // the `<template>` itself; a single-parameter callback gets a synthesised
    // index alias to key by.
    const indexName = projection.names[1] ?? "__index";
    const alias =
      projection.names.length === 1
        ? `(${projection.names[0]}, ${indexName})`
        : projection.alias;
    const keyedLoop = `v-for="${escapeAttribute(alias)} in ${binding(projection.source, context)}" :key="${escapeAttribute(indexName)}"`;
    const block = `${pad(inside)}<template ${keyedLoop}>\n${projection.elements
      // Each authored sibling key is dropped: the projected siblings share one
      // iteration, so the key belongs to the `<template>` that owns the loop.
      .map((element) => emitRenderNode(withoutKey(element), inside + 1, inner))
      .join("\n")}\n${pad(inside)}</template>`;
    return directives.length === 0
      ? block
      : `${pad(depth)}<template ${directives.join(" ")}>\n${block}\n${pad(depth)}</template>`;
  }
  const [element] = projection.elements;
  const keyAttribute = element.attributes.find(
    (attribute) =>
      attribute.kind === "jsx-attribute" && attribute.name === "key",
  );
  const keyExpression =
    keyAttribute === undefined ? undefined : expressionValue(keyAttribute);
  const keyStatic =
    keyAttribute === undefined ? undefined : staticValue(keyAttribute);
  const key =
    keyExpression === undefined
      ? keyStatic === undefined
        ? []
        : [`key="${escapeAttribute(keyStatic)}"`]
      : [`:key="${binding(keyExpression, inner)}"`];
  // The key is re-emitted as the loop's `:key`, so it must not also remain an
  // ordinary attribute on the element.
  return emitRenderNode(withoutKey(element), depth, inner, [
    ...directives,
    loop,
    ...key,
  ]);
}

/** The render node with its authored `key` attribute removed. */
function withoutKey(node: GenericRenderNode): GenericRenderNode {
  return {
    ...node,
    attributes: node.attributes.filter(
      (attribute) =>
        !(attribute.kind === "jsx-attribute" && attribute.name === "key"),
    ),
  };
}

/**
 * Lower a (possibly chained) ternary to a run of guarded siblings.
 *
 * `cond ? <a/> : <b/>` becomes `v-if` / `v-else`; a nested false arm continues
 * the chain as `v-else-if`, which is how a neutral `a ? <x/> : b ? <y/> : null`
 * reaches its faithful native form. Returns `undefined` when the text is not a
 * ternary the arms of which are recorded markup.
 */
function emitTernaryChain(
  text: string,
  nested: readonly GenericRenderNode[],
  depth: number,
  context: TemplateContext,
  leading: "v-if" | "v-else-if",
): string | undefined {
  const question = ternaryIndex(text, nested);
  if (question <= 0) {
    return undefined;
  }
  const colon = ternaryColonIndex(text, question, nested);
  if (colon === -1) {
    return undefined;
  }
  const condition = text.slice(0, question).trim();
  const whenTrue = unwrapParentheses(text.slice(question + 1, colon).trim());
  const whenFalse = unwrapParentheses(text.slice(colon + 1).trim());
  const lines: string[] = [];
  if (!isNothing(whenTrue)) {
    lines.push(
      emitConditionalArm(
        { node: nestedFor(nested, whenTrue), text: whenTrue },
        `${leading}="${binding(condition, context)}"`,
        depth,
        context,
        nested,
      ),
    );
  }
  if (!isNothing(whenFalse)) {
    // With no rendered true arm the guard is negated so the chain still starts
    // with a `v-if`; otherwise the false arm continues it.
    const continues = lines.length > 0;
    const rest = continues
      ? emitTernaryChain(whenFalse, nested, depth, context, "v-else-if")
      : undefined;
    if (rest !== undefined) {
      lines.push(rest);
    } else {
      const directive = continues
        ? "v-else"
        : `${leading}="!(${binding(condition, context)})"`;
      lines.push(
        emitConditionalArm(
          { node: nestedFor(nested, whenFalse), text: whenFalse },
          directive,
          depth,
          context,
          nested,
        ),
      );
    }
  }
  return lines.length > 0 ? lines.join("\n") : undefined;
}

/** Whether an expression still contains one of the recorded markup roots. */
function containsMarkup(
  text: string,
  nested: readonly GenericRenderNode[],
): boolean {
  return nested.some((node) => {
    const recorded = node.expression?.text;
    return (
      recorded !== undefined && recorded.length > 0 && text.includes(recorded)
    );
  });
}

/** Render one arm of a conditional chain, wrapping non-element arms in `<template>`. */
function emitConditionalArm(
  arm: ConditionalArm,
  directive: string,
  depth: number,
  context: TemplateContext,
  nested: readonly GenericRenderNode[],
): string {
  if (arm.node !== undefined) {
    return emitRenderNode(arm.node, depth, context, [directive]);
  }
  const text = arm.text ?? "";
  // A guard never joins a `v-for` on the same element (Vue evaluates `v-if`
  // first, so the loop alias would not be in scope): the loop is wrapped.
  const projection = readListProjection(text, nested);
  if (projection !== undefined) {
    const block = emitListProjection(projection, depth + 1, context, []);
    return `${pad(depth)}<template ${directive}>\n${block}\n${pad(depth)}</template>`;
  }
  // A named node const, the default slot or a nested conditional has nowhere to
  // carry the guard itself, so it is wrapped in a guarded `<template>`.
  const inner = emitMarkupExpression(text, nested, depth + 1, context);
  if (inner !== undefined) {
    return `${pad(depth)}<template ${directive}>\n${inner}\n${pad(depth)}</template>`;
  }
  // An arm that still holds markup has no interpolation form: stringifying a
  // VNode into `{{ … }}` would silently render `[object Object]`, so the whole
  // template falls back instead.
  if (containsMarkup(text, nested) || mentionsMarkupSource(text, context)) {
    throw new UnsupportedTemplate(
      "conditional arm is neither an element nor a list",
    );
  }
  return `${pad(depth)}<template ${directive}>\n${pad(depth + 1)}{{ ${binding(text, context)} }}\n${pad(depth)}</template>`;
}

/**
 * Whether an expression mentions a binding that *produces* markup — a node
 * const, a markup-producing const, a slot source or an inlinable helper.
 *
 * A conditional over such bindings carries no recorded JSX of its own (the
 * markup lives in the declaration), so this is what tells the reader to treat
 * `cond ? renderItems(items) : undefined` as markup rather than a value.
 */
function mentionsMarkupSource(text: string, context: TemplateContext): boolean {
  return mentionsName(text, [
    ...context.helpers.keys(),
    ...context.nodeArraySources.keys(),
    ...context.nodeSubstitutions.keys(),
    ...context.slotSources,
  ]);
}

/**
 * The element type a loop over `source` binds its alias to, resolved from the
 * declared type of the iterated binding (`groups: ToolbarItem[][]` loops
 * `ToolbarItem[]`, which in turn loops `ToolbarItem`). Only a bare identifier —
 * a const, a prop or an enclosing loop alias — carries a declared type.
 */
function elementTypeOf(
  source: string,
  context: TemplateContext,
): string | undefined {
  const trimmed = stripTypeAssertion(source);
  const name = /^(?:[A-Za-z_$][\w$]*\s*\.\s*)?([A-Za-z_$][\w$]*)$/.exec(
    trimmed,
  )?.[1];
  if (name === undefined) {
    return undefined;
  }
  const declared =
    context.aliasTypes.get(name) ?? context.declaredTypes.get(name);
  return declared !== undefined && declared.trim().endsWith("[]")
    ? declared.trim().slice(0, -2).trim()
    : undefined;
}

/**
 * Whether `text` reads a node-valued member off a loop alias (`item.icon` where
 * `item: ToolbarItem` and `ToolbarItem.icon: MpElement`). Such a read resolves to
 * an already-created VNode: `{{ … }}` would hand it to `toDisplayString`, which
 * JSON-serialises the circular structure and throws.
 */
function isNodeTypedMemberRead(
  text: string,
  context: TemplateContext,
): boolean {
  const match = /^([A-Za-z_$][\w$]*)\s*(?:\?\s*)?\.\s*([A-Za-z_$][\w$]*)$/.exec(
    stripTypeAssertion(text),
  );
  if (match === null) {
    return false;
  }
  return isNodeTypedField(match[1] ?? "", match[2] ?? "", context);
}

/** Whether `receiver.field` resolves to a field declared as node content. */
function isNodeTypedField(
  receiver: string,
  field: string,
  context: TemplateContext,
): boolean {
  const typeText =
    context.aliasTypes.get(receiver) ?? context.declaredTypes.get(receiver);
  if (typeText === undefined) {
    return false;
  }
  for (const [typeName, fields] of context.nodeTypedFieldsByType) {
    if (
      fields.has(field) &&
      new RegExp(String.raw`\b${typeName}\b`).test(typeText)
    ) {
      return true;
    }
  }
  return false;
}

/** Vue's "is the default slot filled" test. */
const DEFAULT_SLOT_PRESENCE = "$slots.default";

/**
 * The presence tests a children-derived const supports, as the trailing pattern
 * that follows the name and the Vue test it lowers to. The bare read comes last
 * and refuses a member/call continuation, so an untranslated shape
 * (`childList.length` on its own) is left for the caller to reject rather than
 * silently becoming `$slots.default.length`.
 */
const SLOT_PRESENCE_FORMS: readonly (readonly [
  continuation: string,
  test: string,
])[] = [
  [String.raw`\s*\.\s*length\s*(?:>\s*0|!==?\s*0)`, DEFAULT_SLOT_PRESENCE],
  [String.raw`\s*\.\s*length\s*===?\s*0`, `!${DEFAULT_SLOT_PRESENCE}`],
  [String.raw`\s*!==?\s*(?:undefined|null)`, DEFAULT_SLOT_PRESENCE],
  [String.raw`\s*===?\s*(?:undefined|null)`, `!${DEFAULT_SLOT_PRESENCE}`],
  [String.raw`(?!\s*[.(])`, DEFAULT_SLOT_PRESENCE],
];

/** Replace every unmasked match of `pattern`, leaving matches inside literals alone. */
function replaceOutsideLiterals(
  text: string,
  pattern: RegExp,
  replacement: string,
): string {
  const mask = maskLiterals(text);
  let output = "";
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (mask[match.index] === true) {
      continue;
    }
    output += text.slice(last, match.index) + replacement;
    last = match.index + match[0].length;
  }
  return output + text.slice(last);
}

/**
 * Lower a presence test on a children-derived const to Vue's default-slot test.
 *
 * `const message = properties.children` and `const childList = […children]` are
 * consumed structurally as `<slot />`, so they leave the script entirely. The
 * neutral source still guards on them — `message === undefined`,
 * `childList.length > 0` — and in a template that guard has exactly one
 * meaning: is the default slot filled.
 */
function lowerSlotPresence(text: string, context: TemplateContext): string {
  let output = text;
  for (const name of context.slotSources) {
    for (const [continuation, test] of SLOT_PRESENCE_FORMS) {
      output = replaceOutsideLiterals(
        output,
        new RegExp(String.raw`(?<![\w$.])${name}(?![\w$])${continuation}`, "g"),
        test,
      );
    }
  }
  return output;
}

/** Whether an expression names the component's children — i.e. the default slot. */
function isSlotSource(text: string, context: TemplateContext): boolean {
  return (
    text === `${context.scope.propsParameterName}.children` ||
    text === "children" ||
    context.slotSources.has(text)
  );
}

/** The fallback of `children ?? value` / `children || value`, when present. */
function slotFallback(
  text: string,
  context: TemplateContext,
): string | undefined {
  for (const operator of ["??", "||"] as const) {
    const index = indexOfTopLevel(text, operator);
    if (index === -1) {
      continue;
    }
    const source = text.slice(0, index).trim();
    if (isSlotSource(source, context)) {
      return text.slice(index + operator.length).trim();
    }
  }
  return undefined;
}

/**
 * Whether an expression *calls* a top-level function declared to return node
 * content (`variantIcon(variant)`). Like a render prop, it yields a VNode: an
 * interpolation would stringify it (and throw on the circular structure), so it
 * is hosted by a `<component :is>`.
 */
function isNodeReturningCall(
  expression: string,
  context: TemplateContext,
): boolean {
  const open = expression.indexOf("(");
  if (open === -1 || matchBracket(expression, open) !== expression.length - 1) {
    return false;
  }
  const name = /^([A-Za-z_$][\w$]*)\s*$/.exec(expression.slice(0, open))?.[1];
  return name !== undefined && context.nodeReturningFunctions.has(name);
}

/**
 * Whether an expression *calls* a render prop (`properties.panel?.({ tab })`, or
 * the same prop destructured). Its result is a VNode tree, so it is hosted by a
 * `<component :is>` rather than interpolated.
 */
function isRenderPropCall(
  expression: string,
  context: TemplateContext,
): boolean {
  const callIndex = expression.indexOf("(");
  if (
    callIndex < 1 ||
    matchBracket(expression, callIndex) !== expression.length - 1
  ) {
    return false;
  }
  const target = expression
    .slice(0, callIndex)
    .replaceAll(/\s/g, "")
    .replace(/\?\.$/, "")
    .replaceAll("?.", ".");
  const parts = target.split(".");
  if (
    parts.length < 1 ||
    parts.length > 2 ||
    parts.some((part) => !/^[A-Za-z_$][\w$]*$/.test(part))
  ) {
    return false;
  }
  const [head, member] = parts;
  const name = member ?? head;
  if (member !== undefined) {
    return head === context.scope.propsParameterName
      ? context.nodeTypedProps.has(name)
      : isNodeTypedField(head ?? "", name ?? "", context);
  }
  return context.nodeTypedProps.has(name);
}

/**
 * Render a call of the extracted recursive helper as a `v-for` of the auxiliary
 * component, binding the per-entry data, the helper's remaining arguments and
 * every captured handler as props.
 */
function emitRecursiveCall(
  text: string,
  depth: number,
  context: TemplateContext,
): string | undefined {
  const helper = context.recursiveHelper;
  if (helper === undefined) {
    return undefined;
  }
  const head = `${helper.helperName}(`;
  const trimmed = text.trim();
  if (
    !trimmed.startsWith(head) ||
    matchBracket(trimmed, head.length - 1) !== trimmed.length - 1
  ) {
    return undefined;
  }
  const args = splitTopLevel(trimmed.slice(head.length, -1), ",").map(
    (argument) => argument.trim(),
  );
  const [entries, ...rest] = args;
  if (entries === undefined) {
    return undefined;
  }
  const alias = context.recursiveAlias ?? helper.itemParam;
  const indexName = helper.indexParam ?? "__index";
  // The loop source keeps its type assertion: `item.children as MenusNode[]` is
  // the authored narrowing, and Vue's expression compiler accepts it.
  const source = rewriteTemplateExpression(
    inlineIdentifiers(entries, resolveSubstitutions(context.substitutions)),
    context.scope,
  );
  const attributes = [
    `v-for="(${escapeAttribute(alias)}, ${escapeAttribute(indexName)}) in (${escapeBinding(source)})"`,
    `:key="${escapeAttribute(indexName)}"`,
    `:item="${escapeAttribute(alias)}"`,
    ...(helper.indexParam === undefined
      ? []
      : [`:${helper.indexParam}="${escapeAttribute(indexName)}"`]),
    ...helper.restParams.map(
      (parameter, index) =>
        `:${parameter.name}="${escapeBinding(binding(rest[index] ?? "undefined", context))}"`,
    ),
    ...helper.capturedHandlers.map(
      (handler) => `:${handler.name}="${handler.name}"`,
    ),
  ];
  return `${pad(depth)}<${helper.componentName} ${attributes.join(" ")} />`;
}

/**
 * Lower an expression that *produces* markup into `<template>` syntax.
 *
 * This is the single reader every markup-valued position goes through: an
 * interpolated child, a conditional arm, a markup-producing const and a
 * component whose `return` is a conditional rather than one element. It returns
 * `undefined` when the text is not a recognised markup shape, leaving the caller
 * to decide between an interpolation and the render-closure fallback.
 */
function emitMarkupExpression(
  text: string,
  nested: readonly GenericRenderNode[],
  depth: number,
  context: TemplateContext,
): string | undefined {
  const expression = unwrapParentheses(stripTypeAssertion(text));

  // `{properties.children}` — and every const that merely normalises it — is the
  // component's default slot.
  if (isSlotSource(expression, context)) {
    return `${pad(depth)}<slot />`;
  }

  // A slot call returns VNodes, not a displayable value. Split a children
  // fallback structurally so Vue never sends the slot result to `toDisplayString`.
  const fallback = slotFallback(expression, context);
  if (fallback !== undefined) {
    return `${pad(depth)}<slot v-if="$slots.default" />\n${pad(depth)}<template v-else>{{ ${binding(fallback, context)} }}</template>`;
  }

  // `renderItems(items, '', false)` — a call of the extracted recursive helper
  // renders the auxiliary component once per entry.
  const recursion = emitRecursiveCall(unwrapParentheses(text), depth, context);
  if (recursion !== undefined) {
    return recursion;
  }

  // A node-valued const is spliced back in as the subtree it names.
  const substituted = context.nodeSubstitutions.get(expression);
  if (substituted !== undefined) {
    return emitRenderNode(substituted, depth, context);
  }

  // A markup-producing const is inlined as whatever its initializer builds.
  const nodeArray = context.nodeArraySources.get(expression);
  if (nodeArray !== undefined) {
    const inlined = emitMarkupExpression(
      nodeArray.initializer,
      nodeArray.renderNodes,
      depth,
      context,
    );
    if (inlined === undefined) {
      throw new UnsupportedTemplate(
        `markup-producing const \`${expression}\` is not a list projection`,
      );
    }
    return inlined;
  }

  // `renderItems(items, '', false)` — a helper call renders its body with the
  // arguments bound to the parameters.
  const helperCall = readHelperCall(expression, context.helpers);
  if (helperCall !== undefined) {
    const inner: TemplateContext = {
      ...context,
      substitutions: new Map([
        ...context.substitutions,
        ...helperCall.bindings,
      ]),
    };
    return emitMarkupExpression(
      helperCall.helper.body,
      helperCall.helper.renderNodes,
      depth,
      inner,
    );
  }

  // A lone JSX node recorded for this expression (`{<span/>}`).
  const direct = nestedFor(nested, expression);
  if (direct !== undefined) {
    return emitRenderNode(direct, depth, context);
  }

  // `[<tr/>, …rows]` — a fixed array of markup renders as plain siblings, and a
  // spread entry as whatever the spread source stands for.
  if (
    expression.startsWith("[") &&
    matchBracket(expression, 0) === expression.length - 1
  ) {
    const entries = splitTopLevel(expression.slice(1, -1), ",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    const parts = entries.map((entry) =>
      emitMarkupExpression(
        entry.startsWith("...") ? entry.slice(3) : entry,
        nested,
        depth,
        context,
      ),
    );
    if (entries.length > 0 && parts.every((part) => part !== undefined)) {
      return parts.join("\n");
    }
  }

  // `properties.panel?.({ tab })` — a render prop returns VNodes, which only a
  // dynamic component can host; interpolating them would stringify them.
  // `item.icon` on a loop alias whose element type declares the field as node
  // content is the same situation, resolved receiver type-aware, and so is
  // `variantIcon(variant)` — a call of a function declared to return a node.
  if (
    isRenderPropCall(expression, context) ||
    isNodeTypedMemberRead(expression, context) ||
    isNodeReturningCall(expression, context)
  ) {
    return `${pad(depth)}<component :is="${escapeBinding(binding(expression, context))}" />`;
  }

  // `h('div', props, …children)` — a hyperscript call describes a subtree just
  // as JSX does, so it is re-materialised and rendered structurally.
  const hyperscript = hyperscriptRenderNode(expression, nested);
  if (hyperscript !== undefined) {
    return emitRenderNode(hyperscript, depth, context);
  }

  const conditional =
    nested.length > 0 ||
    mentionsMarkupSource(expression, context) ||
    containsHyperscript(expression);

  // `cond ? <a/> : <b/>` → `v-if` / `v-else`, and a chained
  // `a ? <x/> : b ? <y/> : null` → `v-if` / `v-else-if` (a `null` arm renders
  // nothing). A conditional over plain values stays an interpolation.
  //
  // The conditional operator binds looser than `&&`, so the chain is split
  // first: an `&&` inside one of its arms (`a ? <x/> : b && c ? <y/> : <z/>`)
  // must never be mistaken for the top-level operator.
  if (conditional) {
    const chain = emitTernaryChain(expression, nested, depth, context, "v-if");
    if (chain !== undefined) {
      return chain;
    }
  }

  // `cond && <a/>` → `v-if`.
  const andIndex = indexOfTopLevel(expression, "&&");
  if (andIndex > 0 && conditional) {
    const condition = expression.slice(0, andIndex).trim();
    const right = expression.slice(andIndex + 2).trim();
    const directive = `v-if="${binding(condition, context)}"`;
    const node = nestedFor(nested, right);
    return emitConditionalArm(
      { node, text: right },
      directive,
      depth,
      context,
      nested,
    );
  }

  // `items.map((item) => <li/>)` → `v-for`.
  const projection = readListProjection(expression, nested);
  if (projection !== undefined) {
    return emitListProjection(projection, depth, context, []);
  }
  return undefined;
}

/**
 * Lower a `{ … }` interpolation: conditional markup becomes `v-if`/`v-else`,
 * a `.map()` becomes `v-for`, a children read becomes the default `<slot>`, and
 * anything else becomes a `{{ … }}` interpolation.
 */
function emitExpressionChild(
  child: GenericExpressionNode,
  depth: number,
  context: TemplateContext,
): string {
  const raw = child.expression?.text;
  if (raw === undefined) {
    return "";
  }
  const text = stripTypeAssertion(raw);
  const markup = emitMarkupExpression(text, child.nested, depth, context);
  if (markup !== undefined) {
    return markup;
  }
  // An expression that names something markup-producing has no interpolation
  // form: stringifying a VNode would render `[object Object]`.
  if (child.nested.length > 0 || mentionsMarkupSource(text, context)) {
    throw new UnsupportedTemplate("unsupported markup-producing expression");
  }
  return `${pad(depth)}{{ ${binding(text, context)} }}`;
}

/** Whether a render node is a single host that can carry `v-bind="$attrs"`. */
export function isSingleRootElement(node: GenericRenderNode): boolean {
  return (
    node.tagKind !== "fragment" &&
    !(typeof node.tag === "string" && node.tag === SLOT_TAG)
  );
}

/** Convert a component's returned render node into `<template>` markup. */
export function buildTemplateMarkup(
  node: GenericRenderNode | undefined,
  context: TemplateContext,
): string {
  if (node === undefined) {
    throw new UnsupportedTemplate("no returned render node");
  }
  return isSingleRootElement(node)
    ? emitRenderNode(node, 1, context, [], ['v-bind="$attrs"'])
    : emitRenderNode(node, 1, context);
}

/**
 * Convert a returned *expression* that is a conditional over markup into sibling
 * `<template>` roots (`v-if` / `v-else-if` / `v-else`).
 *
 * A component may `return cond ? <a/> : <b/>` instead of one element, in which
 * case the IR records no single `returnNode`. Vue supports multiple roots, so
 * the guarded branches are emitted side by side. Returns `undefined` when the
 * expression is not a recognised markup shape.
 */
export function buildConditionalTemplateMarkup(
  text: string,
  nested: readonly GenericRenderNode[],
  context: TemplateContext,
): string | undefined {
  return emitMarkupExpression(text, nested, 1, context);
}

/** One guarded top-level render path of a component with several returns. */
export interface RootBranch {
  /** The guard, or `undefined` for the unconditional final branch. */
  readonly condition?: string;
  /** The returned expression's recorded text. */
  readonly text: string;
  /** The JSX roots recorded for that expression. */
  readonly nested: readonly GenericRenderNode[];
  /** The recorded render node, when the return is plain JSX. */
  readonly node?: GenericRenderNode;
}

/**
 * Convert several guarded returns into sibling roots.
 *
 * A component with an early-return guard (`if (!popup) return h(tag, …)`) has
 * two complete render paths. Vue's `<template>` may hold several roots, so each
 * one is emitted with the directive that reproduces the guard's control flow.
 */
export function buildGuardedRootsMarkup(
  branches: readonly RootBranch[],
  context: TemplateContext,
): string {
  return branches
    .map((branch, index) => {
      const directive =
        branch.condition === undefined
          ? "v-else"
          : `${index === 0 ? "v-if" : "v-else-if"}="${binding(branch.condition, context)}"`;
      const node =
        branch.node ??
        nestedFor(branch.nested, unwrapParentheses(branch.text)) ??
        hyperscriptRenderNode(branch.text, branch.nested);
      return emitConditionalArm(
        { node, text: branch.text },
        directive,
        1,
        context,
        branch.nested,
      );
    })
    .join("\n");
}

/** Re-print a nested render node as inline markup (used for statement lowering). */
export function inlineRenderNode(
  node: GenericRenderNode,
  context: TemplateContext,
): string {
  return emitRenderNode(node, 0, context).trim();
}

/** Whether a child list contains any expression node at all. */
export function hasExpressionChild(
  children: readonly GenericRenderChild[],
): boolean {
  return children.some((child) => isExpressionNode(child));
}
