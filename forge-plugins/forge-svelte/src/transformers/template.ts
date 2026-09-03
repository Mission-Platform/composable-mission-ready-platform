/**
 * Generic render tree → Svelte markup.
 *
 * The transformer walks the enriched generic AST's `GenericRenderNode`s — never
 * a TypeScript tree and never a re-parse — and prints Svelte 5 template markup:
 * - text children collapse the way JSX collapses them, `{expr}` children become
 *   `{expr}` holes or structural blocks,
 * - `className`/`classNames` → `class` (resolved by Svelte's built-in `clsx`),
 *   `htmlFor` → `for`, `onX` → the Svelte 5 lowercase `onx={…}` attribute,
 *   `{...spread}` stays a spread, `ref={x}` becomes `bind:this={x}`, and the
 *   Stage-1 static marker never leaks,
 * - `<Slot/>` / a `children` read → a normalized snippet render (named slots
 *   likewise) that invokes a snippet, renders an escaped primitive `MpChild`
 *   value, or falls back — see {@link renderSnippet};
 *   `<HtmlContent html={…}/>` → `{@html …}`,
 *   `<Dynamic is={…}/>` → `<svelte:component>` / `<svelte:element>`,
 *   `<Transition/>` / `<TransitionGroup/>` / `<Teleport/>` → their children
 *   rendered in place (no Svelte-native wrapper component exists for any of
 *   the three; see {@link TRANSITION_TAG}),
 * - `cond && <A/>` → `{#if cond}…{/if}`, `a ? <X/> : <Y/>` →
 *   `{#if a}…{:else}…{/if}` (chained ternaries add `{:else if}`),
 *   `items.map((item) => <li/>)` → `{#each items as item}…{/each}` with the
 *   inferred list key, and `Array.from({ length }, (_, i) => …)` likewise.
 *
 * Structural expressions are recognised from the **text** of a
 * `GenericExpressionNode` plus its `nested` render nodes: each nested node's
 * `expression.text` is the exact source substring of that JSX, so a branch is
 * "markup-valued" exactly when it contains one, and re-printing a branch is a
 * matter of rendering the nested node it contains.
 */

import {
  attributeStringValue,
  isRenderNode,
  isTextNode,
  renderNodeTagName,
} from "@mission-platform/forge-plugin-api";
import { MP_STATIC_ATTR } from "@mission-platform/forge-plugin-api/compiler/optimize.js";

import {
  CHILDREN_SNIPPET,
  CLASS_NAMES_HELPER,
  DYNAMIC_TAG,
  HTML_CONTENT_TAG,
  HYPERSCRIPT_CALL,
  isComponentTagExpression,
  isEventAttribute,
  renderSnippet,
  SLOT_TAG,
  svelteAttributeName,
  svelteEventName,
  SUSPENSE_TAG,
  TELEPORT_TAG,
  TRANSITION_GROUP_TAG,
  TRANSITION_TAG,
} from "../runtime/names.js";
import {
  callArguments,
  indexOfTopLevel,
  isIdentifierText,
  memberCall,
  normalizeJsxText,
  parameterName,
  readBinary,
  readCallback,
  readTernary,
  scanSource,
  splitList,
  stripComments,
  stripParentheses,
  stripSemicolon,
  stripTypeAssertion,
} from "../runtime/source-text.js";

import {
  readsChildren,
  scopeExpression,
  svelteClassValue,
  type SvelteScope,
} from "./expression.js";
import { readSafeBlockBody } from "./statements.js";

import type {
  GenericAttribute,
  GenericRenderChild,
  GenericRenderNode,
  SourceSpan,
} from "@mission-platform/forge-plugin-api";

/** A list source and the key expression the plan inferred for it. */
export interface TemplateListKey {
  /** The iterated expression's source text, matched against the lowered list. */
  readonly source: string;
  readonly key?: string;
}

/** A computed tag expression and the marker node it was inferred from. */
export interface TemplateDynamicNode {
  readonly expression: string;
  /** The Svelte host selected during lowering. */
  readonly host: "svelte:component" | "svelte:element";
  readonly span?: SourceSpan;
}

/**
 * A local `const` computed **from** JSX. Svelte markup only exists in the
 * template, so such a local has no script-side form: the emitter registers its
 * original initializer here and every read of the name substitutes (and
 * converts) that initializer in place.
 */
export interface JsxConstant {
  /** The initializer's source text, as recorded by the frontend. */
  readonly text: string;
  /** The JSX roots nested inside that initializer. */
  readonly nodes: readonly GenericRenderNode[];
}

/** Context threaded through the recursive markup build. */
export interface SvelteTemplateContext {
  /** Bindings every embedded expression is rewritten against. */
  readonly scope: SvelteScope;
  /** JSX-yielding locals lifted out of the script, keyed by declared name. */
  readonly jsxConstants: ReadonlyMap<string, JsxConstant>;
  /**
   * Local names that alias the component's `children` (the variadic
   * normalisation an `h(tag, props, ...childList)` render performs). Svelte has
   * no such array, so a read of one renders the children snippet.
   */
  readonly childrenAliases: ReadonlySet<string>;
  /**
   * Names of JSX-returning local helpers lowered to `{#snippet}` declarations.
   * A call to one (`renderRow(item)`) renders as `{@render renderRow(item)}`
   * rather than leaking an undeclared identifier into an expression hole.
   */
  readonly renderHelpers: ReadonlySet<string>;
  /** Scoped render props that lower to Svelte snippet props. */
  readonly renderProps?: ReadonlySet<string>;
  /** Stable list keys kept by the plan, matched by list source text. */
  readonly listKeys: readonly TemplateListKey[];
  /** Dynamic tag expressions inferred by the neutral compiler, matched by span. */
  readonly dynamicNodes: readonly TemplateDynamicNode[];
  /**
   * Resolves a render node to the template-level snippet the optimizer hoisted
   * it into, or `undefined` when the node is printed inline. See
   * {@link hoistedStaticLookup} for why this is a resolver and not a map.
   */
  readonly hoistedStatic: HoistedStaticLookup;
}

function escapedRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Scope an expression after converting the array-style children presence check
 * used by neutral components to the Svelte snippet presence check. The
 * children normalisation local is deliberately omitted from the script, so a
 * member read such as `childList.length > 0` must not survive into markup.
 */
function templateExpression(
  text: string,
  context: SvelteTemplateContext,
): string {
  let normalized = text;
  for (const alias of context.childrenAliases) {
    const pattern = new RegExp(
      `\\b${escapedRegExp(alias)}\\s*\\.\\s*length\\s*(===|==|!==|!=|>=|>)\\s*(0|1)\\b`,
      "g",
    );
    normalized = normalized.replace(
      pattern,
      (_match, operator: string, value: string) => {
        const present =
          (value === "0" && ["!==", "!=", ">=", ">"].includes(operator)) ||
          (value === "1" && operator === ">=");
        return present
          ? `${CHILDREN_SNIPPET} != null`
          : `${CHILDREN_SNIPPET} == null`;
      },
    );
  }
  return scopeExpression(normalized, context.scope);
}

/** One static subtree the optimizer lifted into a template-level snippet. */
export interface HoistedStaticEntry {
  /** The snippet the subtree is declared and rendered as. */
  readonly name: string;
  /** The subtree itself, as recorded when the plan was built. */
  readonly node: GenericRenderNode;
}

/** Resolves a render node to the snippet it was hoisted into. */
export type HoistedStaticLookup = (
  node: GenericRenderNode,
) => string | undefined;

/** A render node's source position, when the frontend recorded a real one. */
function spanKey(node: GenericRenderNode): string | undefined {
  return node.span.end > node.span.start
    ? `${node.span.start}:${node.span.end}`
    : undefined;
}

/**
 * Build the resolver a template context uses to recognise hoisted subtrees.
 *
 * The plan records the copy of a subtree it found while walking the module's
 * render roots, but the markup is printed from the component's own returned
 * tree — the frontend builds those as **separate records** for the same source
 * range, so object identity alone misses every hoist. The resolver therefore
 * matches on identity first (fixtures and synthesized nodes carry no position)
 * and falls back to the source span shared by both copies.
 */
export function hoistedStaticLookup(
  entries: readonly HoistedStaticEntry[],
): HoistedStaticLookup {
  const byNode = new Map<GenericRenderNode, string>();
  const bySpan = new Map<string, string>();
  for (const entry of entries) {
    byNode.set(entry.node, entry.name);
    const key = spanKey(entry.node);
    if (key !== undefined) {
      bySpan.set(key, entry.name);
    }
  }
  return (node) => {
    const direct = byNode.get(node);
    if (direct !== undefined) {
      return direct;
    }
    const key = spanKey(node);
    return key === undefined ? undefined : bySpan.get(key);
  };
}

/** The resolver used while printing a snippet's own body, so it never renders itself. */
export const NO_HOISTED_STATIC: HoistedStaticLookup = () => undefined;

/** The exact source texts of a set of render roots, used to mask markup inside expression text. */
function nodeTexts(nodes: readonly GenericRenderNode[]): string[] {
  return nodes.flatMap((node) =>
    node.expression === undefined ? [] : [node.expression.text],
  );
}

/** The render roots whose source text appears inside a sub-expression. */
export function nodesWithin(
  text: string,
  nodes: readonly GenericRenderNode[],
): GenericRenderNode[] {
  return nodes.filter(
    (node) =>
      node.expression !== undefined && text.includes(node.expression.text),
  );
}

/** Whether a sub-expression can ever evaluate to markup. */
function yieldsMarkup(
  text: string,
  nodes: readonly GenericRenderNode[],
): boolean {
  return (
    nodesWithin(text, nodes).length > 0 ||
    new RegExp(`\\b${HYPERSCRIPT_CALL}\\s*\\(`).test(text)
  );
}

/**
 * Whether a sub-expression lowers to template markup, including spreads and
 * bare reads of JSX-yielding locals / children aliases that were deliberately
 * omitted from the script. Array holes such as `{[...itemNodes, ...childList]}`
 * carry no nested render nodes of their own, so the plain {@link yieldsMarkup}
 * check would miss them and leak undeclared identifiers into a value-position
 * expression hole.
 */
function templateYieldsMarkup(
  text: string,
  nodes: readonly GenericRenderNode[],
  context: SvelteTemplateContext,
  visited: ReadonlySet<string> = new Set(),
): boolean {
  let expression = stripComments(stripParentheses(stripSemicolon(text)));
  let previous = "";
  while (previous !== expression) {
    previous = expression;
    expression = stripComments(stripParentheses(expression));
  }
  if (expression.startsWith("...")) {
    return templateYieldsMarkup(
      expression.slice(3).trim(),
      nodes,
      context,
      visited,
    );
  }
  if (isIdentifierText(expression)) {
    if (context.childrenAliases.has(expression) || readsChildren(expression)) {
      return true;
    }
    const constant = context.jsxConstants.get(expression);
    if (constant !== undefined && !visited.has(expression)) {
      return templateYieldsMarkup(
        constant.text,
        constant.nodes,
        context,
        new Set([...visited, expression]),
      );
    }
  }
  const helperCall = /^([A-Za-z_$][\w$]*)\s*\(/.exec(expression);
  if (helperCall !== null && context.renderHelpers.has(helperCall[1]!)) {
    return true;
  }
  return yieldsMarkup(expression, nodes);
}

/** The slot a `<Slot/>` marker renders. */
function slotName(node: GenericRenderNode): string | undefined {
  return attributeStringValue(node, "name");
}

/** Print one attribute as its Svelte equivalent, or `undefined` when it has no markup form. */
function attributePart(
  attribute: GenericAttribute,
  context: SvelteTemplateContext,
  consumed: ReadonlySet<string>,
): string | undefined {
  const { scope } = context;
  if (attribute.kind === "jsx-spread-attribute") {
    return `{...${scopeExpression(attribute.expression.text, scope)}}`;
  }
  const name = attribute.name;
  // The Stage-1 static marker never leaks into Svelte markup, and `key` is
  // consumed by `{#each}` key expressions rather than emitted as an attribute.
  if (name === MP_STATIC_ATTR || name === "key" || consumed.has(name)) {
    return undefined;
  }
  const value = attribute.value;
  if (value === undefined) {
    return svelteAttributeName(name);
  }
  if (value.kind === "string") {
    return `${svelteAttributeName(name)}="${value.value}"`;
  }
  const expression = value.expression?.text;
  if (expression === undefined) {
    return undefined;
  }
  // An element ref (`useRef` bound via `ref={x}`) has no Svelte attribute form —
  // it becomes the `bind:this` directive over the same `$state` name.
  if (name === "ref") {
    return `bind:this={${scopeExpression(expression, scope)}}`;
  }
  if (isEventAttribute(name)) {
    return `${svelteEventName(name)}={${scopeExpression(expression, scope)}}`;
  }
  const attributeName = svelteAttributeName(name);
  const inner =
    attributeName === "class"
      ? svelteClassValue(
          expression,
          scope,
          callArguments(expression, CLASS_NAMES_HELPER),
        )
      : scopeExpression(expression, scope);
  return `${attributeName}={${inner}}`;
}

/**
 * The attribute string of an opening tag, leading-space prefixed. `leading`
 * holds the directives the host itself contributes (`this={…}` on a
 * `<svelte:component>` / `<svelte:element>`), which Svelte conventionally
 * prints ahead of the attributes carried over from the source element.
 */
function attributeString(
  attributes: readonly GenericAttribute[],
  context: SvelteTemplateContext,
  consumed: ReadonlySet<string> = new Set(),
  leading: readonly string[] = [],
): string {
  const parts = [
    ...leading,
    ...attributes.flatMap((attribute) => {
      const part = attributePart(attribute, context, consumed);
      return part === undefined ? [] : [part];
    }),
  ];
  return parts.length > 0 ? ` ${parts.join(" ")}` : "";
}

/** A callback prop whose body renders a known helper, expressed as an implicit snippet prop. */
function renderPropSnippet(
  attribute: GenericAttribute,
  context: SvelteTemplateContext,
): string | undefined {
  if (
    attribute.kind !== "jsx-attribute" ||
    attribute.value?.kind !== "expression" ||
    isEventAttribute(attribute.name)
  ) {
    return undefined;
  }
  const expression = attribute.value.expression?.text;
  if (expression === undefined) return undefined;
  const callback = readCallback(expression);
  if (callback === undefined || callback.body.trimStart().startsWith("{")) {
    return undefined;
  }
  const body = stripParentheses(callback.body);
  if (!templateYieldsMarkup(body, [], context)) return undefined;
  const parameters = callback.parameters
    .map((parameter) => parameterName(parameter))
    .join(", ");
  return `{#snippet ${attribute.name}(${parameters})}${branchMarkup(body, [], context, new Set())}{/snippet}`;
}

/** Markup for a tag with its attributes and already-rendered children. */
function tagMarkup(
  name: string,
  attributes: string,
  selfClosing: boolean,
  children: string,
): string {
  return selfClosing
    ? `<${name}${attributes} />`
    : `<${name}${attributes}>${children}</${name}>`;
}

/** Markup for a `<HtmlContent html={…} as={…}/>` element — a Svelte `{@html}` inside its host. */
function htmlContentMarkup(
  node: GenericRenderNode,
  context: SvelteTemplateContext,
): string {
  let host = "div";
  let content = '""';
  const leading: string[] = [];
  for (const attribute of node.attributes) {
    if (attribute.kind !== "jsx-attribute") {
      continue;
    }
    if (attribute.name === "html") {
      if (attribute.value?.kind === "string") {
        content = JSON.stringify(attribute.value.value);
      } else if (attribute.value?.expression !== undefined) {
        content = scopeExpression(
          attribute.value.expression.text,
          context.scope,
        );
      }
      continue;
    }
    if (attribute.name === "as") {
      if (attribute.value?.kind === "string") {
        host = attribute.value.value;
      } else if (attribute.value?.expression !== undefined) {
        host = "svelte:element";
        leading.push(
          `this={${scopeExpression(attribute.value.expression.text, context.scope)}}`,
        );
      }
    }
  }
  const attributes = attributeString(
    node.attributes,
    context,
    new Set(["html", "as"]),
    leading,
  );
  return tagMarkup(host, attributes, false, `{@html ${content}}`);
}

/**
 * Markup for a neutral `<Dynamic is={…}>…</Dynamic>` marker. A string tag emits
 * that element directly; a component-valued expression emits
 * `<svelte:component this={…}>`, and any other expression (a tag-name variable)
 * emits `<svelte:element this={…}>`.
 */
function dynamicMarkup(
  node: GenericRenderNode,
  context: SvelteTemplateContext,
): string {
  const staticTag = attributeStringValue(node, "is");
  const consumed = new Set(["is"]);
  const children = renderChildren(node.children, context);
  if (staticTag !== undefined) {
    return tagMarkup(
      staticTag,
      attributeString(node.attributes, context, consumed),
      node.selfClosing,
      children,
    );
  }
  const declared = node.attributes.find(
    (attribute) =>
      attribute.kind === "jsx-attribute" && attribute.name === "is",
  );
  const inferred = context.dynamicNodes.find(
    (intention) =>
      intention.span?.start === node.span.start &&
      intention.span.end === node.span.end,
  );
  const source =
    declared?.kind === "jsx-attribute" && declared.value?.kind === "expression"
      ? declared.value.expression?.text
      : undefined;
  const expression = source ?? inferred?.expression;
  if (expression === undefined) {
    return tagMarkup(
      "svelte:element",
      attributeString(node.attributes, context, consumed),
      node.selfClosing,
      children,
    );
  }
  const scoped = scopeExpression(expression, context.scope);
  const host =
    inferred?.host ??
    (isComponentTagExpression(scoped) ? "svelte:component" : "svelte:element");
  const attributes = attributeString(node.attributes, context, consumed, [
    `this={${scoped}}`,
  ]);
  return tagMarkup(host, attributes, node.selfClosing, children);
}

/** Markup for every child of a render node. */
function renderChildren(
  children: readonly GenericRenderChild[],
  context: SvelteTemplateContext,
): string {
  return children
    .map((child) => {
      if (isRenderNode(child)) {
        return renderNode(child, context);
      }
      if (isTextNode(child)) {
        return normalizeJsxText(child.text);
      }
      return child.expression === undefined
        ? ""
        : renderExpression(child.expression.text, child.nested, context);
    })
    .join("");
}

/** Build Svelte markup for one generic render node. */
export function renderNode(
  node: GenericRenderNode,
  context: SvelteTemplateContext,
): string {
  const hoisted = context.hoistedStatic(node);
  if (hoisted !== undefined) {
    return `{@render ${hoisted}()}`;
  }
  const tag = renderNodeTagName(node);
  if (tag === SLOT_TAG) {
    return renderSnippet(
      slotName(node),
      renderChildren(node.children, context),
    );
  }
  if (tag === DYNAMIC_TAG) {
    return dynamicMarkup(node, context);
  }
  if (tag === HTML_CONTENT_TAG) {
    return htmlContentMarkup(node, context);
  }
  if (tag === SUSPENSE_TAG) {
    const fallback = node.attributes.find(
      (attribute) => attribute.name === "fallback",
    )?.value;
    const fallbackMarkup =
      fallback?.kind === "expression"
        ? fallback.nested.length > 0
          ? fallback.nested
              .map((child) => renderNode(child, context))
              .join("\n")
          : fallback.expression === undefined
            ? ""
            : `{${scopeExpression(fallback.expression.text, context.scope)}}`
        : fallback?.kind === "string"
          ? fallback.value
          : "";
    return `<svelte:boundary>\n{#snippet pending()}\n${fallbackMarkup}\n{/snippet}\n${renderChildren(node.children, context)}\n</svelte:boundary>`;
  }
  if (
    tag === TRANSITION_TAG ||
    tag === TRANSITION_GROUP_TAG ||
    tag === TELEPORT_TAG
  ) {
    return renderChildren(node.children, context);
  }
  if (node.tagKind === "fragment") {
    return renderChildren(node.children, context);
  }
  const name = tag ?? (typeof node.tag === "string" ? node.tag : node.tag.text);
  const renderPropSnippets = node.attributes.flatMap((attribute) => {
    if (attribute.kind !== "jsx-attribute") return [];
    const snippet = renderPropSnippet(attribute, context);
    return snippet === undefined ? [] : [{ name: attribute.name, snippet }];
  });
  const consumed = new Set(renderPropSnippets.map((entry) => entry.name));
  const children = `${renderChildren(node.children, context)}${renderPropSnippets
    .map((entry) => entry.snippet)
    .join("")}`;
  return tagMarkup(
    name,
    attributeString(node.attributes, context, consumed),
    node.selfClosing && renderPropSnippets.length === 0,
    children,
  );
}

/**
 * Markup for a `{expr}` child hole, a component's returned value, or any
 * markup-valued sub-expression. `nodes` are the JSX roots the frontend recorded
 * inside `text`; `visited` guards a JSX-yielding local that reads itself.
 */
export function renderExpression(
  text: string,
  nodes: readonly GenericRenderNode[],
  context: SvelteTemplateContext,
  visited: ReadonlySet<string> = new Set(),
): string {
  // A branch is often authored as `(\n  // why\n  <A />\n)`, so parentheses and
  // comment runs are peeled alternately until only the expression is left —
  // otherwise the text never matches its retained node and the markup would
  // be demoted to a plain `{expr}` hole.
  let expression = stripComments(stripParentheses(stripSemicolon(text)));
  let previous = "";
  while (previous !== expression) {
    previous = expression;
    expression = stripComments(stripParentheses(expression));
  }
  const renderProp = renderPropCallMarkup(
    expression,
    nodeTexts(nodes),
    context,
  );
  if (renderProp !== undefined) return renderProp;
  if (isIdentifierText(expression)) {
    const constant = context.jsxConstants.get(expression);
    if (constant !== undefined && !visited.has(expression)) {
      return renderExpression(
        constant.text,
        constant.nodes,
        context,
        new Set([...visited, expression]),
      );
    }
    if (context.childrenAliases.has(expression)) {
      return renderSnippet(CHILDREN_SNIPPET);
    }
  }
  if (readsChildren(expression)) {
    return renderSnippet(CHILDREN_SNIPPET);
  }
  return branchMarkup(expression, nodes, context, visited);
}

/**
 * Render an optional call to a declared `MpRenderProperty` as a snippet
 * invocation. A render prop is read in three shapes:
 *
 * - a bare destructured name — `panel?.(…)`;
 * - a member of the props parameter — `properties.panel?.(…)`, which collapses
 *   to the destructured (aliased) name `$props()` binds; and
 * - a member carried on a value — `activeStep?.content?.(…)`, where the field
 *   (`content`) is a declared render prop (e.g. `WizardStep.content`) reached
 *   through an object; the full accessor is preserved as the snippet target.
 *
 * The first two forms lower to `{@render panel?.(…)}`; the third keeps its
 * accessor: `{@render activeStep?.content?.(…)}`.
 */
function renderPropCallMarkup(
  expression: string,
  fragments: readonly string[],
  context: SvelteTemplateContext,
): string | undefined {
  // `<accessor>?.(<args>)` where `<accessor>` is an identifier optionally
  // followed by a `.`/`?.` member chain and `<args>` is balanced to the end.
  const match =
    /^([A-Za-z_$][\w$]*(?:\s*\??\.\s*[A-Za-z_$][\w$]*)*)\s*\?\.\s*\(([\s\S]*)\)$/.exec(
      expression,
    );
  if (match === null) return undefined;
  const callee = match[1]!.trim();
  const argumentText = match[2]!;
  // Split the accessor into its object prefix and final member identifier.
  const tail = /(\??\.)\s*([A-Za-z_$][\w$]*)$/.exec(callee);
  const objectPrefix =
    tail === null ? undefined : callee.slice(0, tail.index).trim();
  const finalName = tail === null ? callee : tail[2]!;
  // The `{@render …}` target: a bare prop name (also for `properties.<name>`,
  // which binds the aliased local) or the full accessor for a value member.
  const target =
    objectPrefix === undefined
      ? context.renderProps?.has(finalName) === true
        ? finalName
        : undefined
      : objectPrefix === context.scope.propsParameter
        ? (() => {
            const aliased =
              context.scope.propAliases.get(finalName) ?? finalName;
            return context.renderProps?.has(aliased) === true
              ? aliased
              : undefined;
          })()
        : context.renderProps?.has(finalName) === true
          ? scopeExpression(callee, context.scope)
          : undefined;
  if (target === undefined) return undefined;
  const arguments_ = splitList(argumentText, fragments);
  return `{@render ${target}?.(${arguments_
    .map((argument) => scopeExpression(argument, context.scope))
    .join(", ")})}`;
}

/** Markup for a branch of a structural expression, keeping the nested roots it contains. */
function branch(
  text: string,
  nodes: readonly GenericRenderNode[],
  context: SvelteTemplateContext,
  visited: ReadonlySet<string>,
): string {
  return renderExpression(text, nodesWithin(text, nodes), context, visited);
}

/** The `{:else if …}` / `{:else}` tail of a ternary chain. */
function elseChain(
  text: string,
  nodes: readonly GenericRenderNode[],
  context: SvelteTemplateContext,
  visited: ReadonlySet<string>,
): string {
  const nested = readTernary(text, nodeTexts(nodes));
  if (
    nested !== undefined &&
    (templateYieldsMarkup(nested.whenTrue, nodes, context, visited) ||
      templateYieldsMarkup(nested.whenFalse, nodes, context, visited))
  ) {
    return `{:else if ${templateExpression(nested.condition, context)}}${branch(nested.whenTrue, nodes, context, visited)}${elseChain(nested.whenFalse, nodes, context, visited)}`;
  }
  const markup = branch(text, nodes, context, visited);
  // Omit an empty `{:else}` entirely — an `undefined`/`null` (or otherwise
  // empty) else branch would emit a stray text node, which Svelte rejects as an
  // invalid child of a structural element (`<table>` etc.).
  return markup === "" ? "" : `{:else}${markup}`;
}

/** The `{#each … }` block an iteration callback lowers to, or `undefined` for an unsupported shape. */
function eachBlock(
  list: string,
  callbackText: string,
  nodes: readonly GenericRenderNode[],
  context: SvelteTemplateContext,
  visited: ReadonlySet<string>,
  optional = false,
): string | undefined {
  const fragments = nodeTexts(nodes);
  const callback = readCallback(callbackText, fragments);
  if (callback === undefined) {
    return undefined;
  }
  const itemName =
    callback.parameters[0] === undefined
      ? "item"
      : parameterName(callback.parameters[0]);
  const indexName =
    callback.parameters[1] === undefined
      ? undefined
      : parameterName(callback.parameters[1]);
  const constants: string[] = [];
  let blockConstants: readonly { name: string; value: string }[] = [];
  let returned = callback.body;
  let templateContext = context;
  if (callback.body.startsWith("{")) {
    // A block-bodied callback lifts its leading `const`s to Svelte `{@const}`s
    // inside the block; any other statement shape falls back to a plain hole.
    const statements = blockBody(callback.body, fragments);
    if (statements === undefined) {
      return undefined;
    }
    blockConstants = statements.constants;
    returned = statements.returned;
    const markupConstants = new Map(context.jsxConstants);
    for (const constant of statements.constants) {
      const containsMarkup =
        nodesWithin(constant.value, nodes).length > 0 ||
        /<\s*[A-Za-z][\w.-]*(?:\s|\/?>)/.test(constant.value);
      if (containsMarkup) {
        markupConstants.set(constant.name, {
          text: constant.value,
          nodes: nodesWithin(constant.value, nodes),
        });
      } else {
        constants.push(
          `{@const ${constant.name} = ${scopeExpression(constant.value, context.scope)}}`,
        );
      }
    }
    templateContext = { ...context, jsxConstants: markupConstants };
  }
  if (
    !templateYieldsMarkup(returned, nodes, templateContext, visited) &&
    stripParentheses(returned) !== "null"
  ) {
    return undefined;
  }
  const key = listKey(list, returned, nodes, templateContext, blockConstants);
  const binding =
    indexName === undefined ? itemName : `${itemName}, ${indexName}`;
  const suffix = key === undefined ? "" : ` (${key})`;
  const markup = branch(returned, nodes, templateContext, visited);
  // An optional-chained iteration (`tokens?.map(…)`) renders nothing when the
  // list is absent; `{#each}` needs an array either way, so the nullish source
  // falls back to an empty one.
  const scoped = scopeExpression(list, context.scope);
  const iterated = optional ? `${scoped} ?? []` : scoped;
  return `{#each ${iterated} as ${binding}${suffix}}${constants.join("")}${markup}{/each}`;
}

/** The leading `const`s and returned expression of a callback block body. */
function blockBody(
  text: string,
  fragments: readonly string[],
):
  | { constants: { name: string; value: string }[]; returned: string }
  | undefined {
  // Shared with render-helper acceptance: typed consts, leading comments, and a
  // terminal return are all expressible as `{@const}` + markup inside `{#each}`.
  return readSafeBlockBody(text, fragments);
}

/** The `{#each … (key)}` expression for a list, from the projected element or the inferred fact. */
function listKey(
  list: string,
  returned: string,
  nodes: readonly GenericRenderNode[],
  context: SvelteTemplateContext,
  blockConstants: readonly { name: string; value: string }[] = [],
): string | undefined {
  const projected = nodesWithin(returned, nodes).find(
    (node) => node.expression?.text === stripParentheses(returned),
  );
  const attribute = projected?.attributes.find(
    (entry) => entry.kind === "jsx-attribute" && entry.name === "key",
  );
  const declared =
    attribute?.kind === "jsx-attribute" &&
    attribute.value?.kind === "expression"
      ? attribute.value.expression?.text
      : undefined;
  const inferred = context.listKeys.find((entry) => entry.source === list)?.key;
  let key = declared ?? inferred;
  if (key === undefined) {
    return undefined;
  }
  // The each-header key expression cannot see `{@const}` bindings that live in
  // the body. Expand a bare block-local key (ForgeMenu's `key={path}`) to its
  // initializer so the header stays self-contained.
  const local = blockConstants.find((entry) => entry.name === key);
  if (local !== undefined) {
    key = local.value;
  }
  return scopeExpression(key, context.scope);
}

/** The static slot name declared by an `h(Slot, { name: "…" })` props object. */
function hyperscriptSlotName(
  propsArgument: string | undefined,
): string | undefined {
  const trimmed = propsArgument?.trim();
  if (
    trimmed === undefined ||
    !trimmed.startsWith("{") ||
    !trimmed.endsWith("}")
  ) {
    return undefined;
  }
  for (const member of splitList(trimmed.slice(1, -1))) {
    const colon = indexOfTopLevel(scanSource(member), ":");
    if (colon === -1) {
      continue;
    }
    const rawKey = member.slice(0, colon).trim();
    const key = /^(['"])(.*)\1$/.exec(rawKey)?.[2] ?? rawKey;
    if (key !== "name") {
      continue;
    }
    return /^(['"])(.*)\1$/.exec(member.slice(colon + 1).trim())?.[2];
  }
  return undefined;
}

/** Markup for a hyperscript `h(tag, props, ...children)` render call. */
function hyperscriptMarkup(
  callArgumentTexts: readonly string[],
  nodes: readonly GenericRenderNode[],
  context: SvelteTemplateContext,
  visited: ReadonlySet<string>,
): string {
  const [tagArgument, propsArgument, ...childArguments] = callArgumentTexts;
  if (tagArgument === undefined) {
    return "";
  }
  const children = childArguments
    .map((argument) => {
      const spread = argument.startsWith("...")
        ? argument.slice(3).trim()
        : undefined;
      if (spread !== undefined && context.childrenAliases.has(spread)) {
        return renderSnippet(CHILDREN_SNIPPET);
      }
      return branch(spread ?? argument, nodes, context, visited);
    })
    .join("");
  if (tagArgument.trim() === SLOT_TAG) {
    return renderSnippet(hyperscriptSlotName(propsArgument), children);
  }
  if (
    tagArgument.trim() === TRANSITION_TAG ||
    tagArgument.trim() === TRANSITION_GROUP_TAG ||
    tagArgument.trim() === TELEPORT_TAG
  ) {
    return children;
  }
  const attributes =
    propsArgument === undefined
      ? ""
      : hyperscriptAttributes(propsArgument, context);
  const literal = /^(['"])(.*)\1$/.exec(tagArgument.trim());
  if (literal !== null) {
    return tagMarkup(literal[2]!, attributes, false, children);
  }
  const scoped = scopeExpression(tagArgument, context.scope);
  const host = isComponentTagExpression(scoped)
    ? "svelte:component"
    : "svelte:element";
  return tagMarkup(host, ` this={${scoped}}${attributes}`, false, children);
}

/** Map an `h(...)` props object literal to a Svelte attribute string. */
function hyperscriptAttributes(
  text: string,
  context: SvelteTemplateContext,
): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    return "";
  }
  const parts: string[] = [];
  for (const member of splitList(trimmed.slice(1, -1))) {
    if (member.startsWith("...")) {
      parts.push(
        `{...${scopeExpression(member.slice(3).trim(), context.scope)}}`,
      );
      continue;
    }
    const colon = indexOfTopLevel(scanSource(member), ":");
    const rawKey = (colon === -1 ? member : member.slice(0, colon)).trim();
    const key = /^(['"])(.*)\1$/.exec(rawKey)?.[2] ?? rawKey;
    const value = colon === -1 ? rawKey : member.slice(colon + 1).trim();
    if (!isIdentifierText(key) && colon === -1) {
      continue;
    }
    if (key === "ref") {
      parts.push(`bind:this={${scopeExpression(value, context.scope)}}`);
      continue;
    }
    if (isEventAttribute(key)) {
      parts.push(
        `${svelteEventName(key)}={${scopeExpression(value, context.scope)}}`,
      );
      continue;
    }
    const name = svelteAttributeName(key);
    const literal = /^(['"])(.*)\1$/.exec(value);
    if (literal !== null) {
      parts.push(`${name}="${literal[2]}"`);
      continue;
    }
    const inner =
      name === "class"
        ? svelteClassValue(
            value,
            context.scope,
            callArguments(value, CLASS_NAMES_HELPER),
          )
        : scopeExpression(value, context.scope);
    parts.push(`${name}={${inner}}`);
  }
  return parts.length > 0 ? ` ${parts.join(" ")}` : "";
}

/**
 * Convert a markup-valued (sub-)expression: a nested JSX root directly, nothing
 * for a `null`/`undefined` branch, `{#if}` markup for a ternary or `cond && …`,
 * the concatenated elements of an array literal, `{#each}` markup for a
 * `.map()`/`Array.from()` iteration, a hyperscript render call — and a plain
 * `{expr}` hole for anything else.
 */
function branchMarkup(
  expression: string,
  nodes: readonly GenericRenderNode[],
  context: SvelteTemplateContext,
  visited: ReadonlySet<string>,
): string {
  if (
    expression === "" ||
    expression === "null" ||
    expression === "undefined"
  ) {
    return "";
  }
  const direct = nodes.find((node) => node.expression?.text === expression);
  if (direct !== undefined) {
    return renderNode(direct, context);
  }
  const fragments = nodeTexts(nodes);
  if (expression.startsWith("...")) {
    return branch(expression.slice(3).trim(), nodes, context, visited);
  }
  const ternary = readTernary(expression, fragments);
  if (
    ternary !== undefined &&
    (templateYieldsMarkup(ternary.whenTrue, nodes, context, visited) ||
      templateYieldsMarkup(ternary.whenFalse, nodes, context, visited))
  ) {
    return `{#if ${templateExpression(ternary.condition, context)}}${branch(ternary.whenTrue, nodes, context, visited)}${elseChain(ternary.whenFalse, nodes, context, visited)}{/if}`;
  }
  const guard = readBinary(expression, "&&", fragments);
  if (
    guard !== undefined &&
    templateYieldsMarkup(guard.right, nodes, context, visited)
  ) {
    return `{#if ${templateExpression(guard.left, context)}}${branch(guard.right, nodes, context, visited)}{/if}`;
  }
  if (expression.startsWith("[") && expression.endsWith("]")) {
    const elements = splitList(expression.slice(1, -1), fragments);
    if (
      elements.some((element) =>
        templateYieldsMarkup(element, nodes, context, visited),
      )
    ) {
      return elements
        .map((element) => branch(element, nodes, context, visited))
        .join("");
    }
  }
  // `.map` and `.flatMap` both project markup rows; flatMap is common when a
  // single item expands to multiple sibling elements (e.g. description lists).
  const iteration =
    memberCall(expression, "map", fragments) ??
    memberCall(expression, "flatMap", fragments);
  if (iteration?.arguments[0] !== undefined) {
    const each = eachBlock(
      iteration.target,
      iteration.arguments[0],
      nodes,
      context,
      visited,
      iteration.optional,
    );
    if (each !== undefined) {
      return each;
    }
  }
  const arrayFrom = callArguments(expression, "Array.from", fragments);
  if (arrayFrom?.[1] !== undefined) {
    const each = eachBlock(
      `Array.from(${arrayFrom[0] ?? ""})`,
      arrayFrom[1],
      nodes,
      context,
      visited,
    );
    if (each !== undefined) {
      return each;
    }
  }
  const hyperscript = callArguments(expression, HYPERSCRIPT_CALL, fragments);
  if (hyperscript !== undefined) {
    return hyperscriptMarkup(hyperscript, nodes, context, visited);
  }
  // A call to a JSX-returning local helper renders its snippet by name; the
  // arguments are scoped like any other expression so prop/ref/state reads inside
  // them resolve the same way they would in the surrounding markup. Type
  // assertions (`item.children as MenuNode[]`) are stripped — Svelte markup is
  // not a TypeScript expression context.
  const helperCall = /^([A-Za-z_$][\w$]*)\s*\(/.exec(expression);
  if (helperCall !== null && context.renderHelpers.has(helperCall[1]!)) {
    const helperArguments = callArguments(
      expression,
      helperCall[1]!,
      fragments,
    );
    if (helperArguments !== undefined) {
      const scoped = helperArguments
        .map((argument) =>
          scopeExpression(
            stripTypeAssertion(argument, fragments),
            context.scope,
          ),
        )
        .join(", ");
      return `{@render ${helperCall[1]!}(${scoped})}`;
    }
  }
  const renderProp = renderPropCallMarkup(expression, fragments, context);
  if (renderProp !== undefined) return renderProp;
  return `{${scopeExpression(expression, context.scope)}}`;
}
