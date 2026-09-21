/**
 * Generic render node → tagged-template lowering for the native Web-Components
 * target.
 *
 * Walks the neutral component's `GenericRenderNode` tree (never a TypeScript
 * AST, and never the raw module text) and produces a `html\`…\`` tagged-template
 * expression in the lit-html template dialect interpreted at runtime by
 * `@mission-platform/forge-adapters/web-components`:
 * - text and `{expr}` children become template text / `${expr}` holes,
 * - `class`/`className` → `class=${…}`, `htmlFor` → `for=${…}`,
 * - `onX` handlers → `@x=${…}` event bindings,
 * - `value`/`checked`/… → `.value=${…}` property bindings,
 * - `cond ? a : b` / `cond && a` children → `${cond ? html`…` : nothing}`,
 * - `list.map(item => <li/>)` children → `${list.map(item => html`…`)}`,
 * - child neutral components (`<ForgeThing/>`) → their custom-element tag
 *   (`<forge-thing></forge-thing>`).
 *
 * Every expression embedded in the template is a `SourceBackedExpression`, so it
 * is scoped to the element instance by the source-text rewrite in
 * `./expression` rather than by a TypeScript transform.
 */
import { MP_STATIC_ATTR } from "@mission-platform/forge-plugin-api/compiler/optimize.js";

import {
  type ElementScope,
  rewriteExpressionText,
  splitConditional,
  splitLogicalAnd,
  stripOuterParentheses,
} from "./expression.js";

import type {
  GenericAttribute,
  GenericRenderChild,
  GenericRenderNode,
  GenericTagKind,
  SourceBackedExpression,
  TargetComponentHost,
} from "@mission-platform/forge-plugin-api";

/** A direct-DOM source unit consumed by the Web-Components element emitter. */
export interface DomTemplateSource {
  /** Factory body returning detached nodes and indexed runtime parts. */
  readonly create: string;
  /** Values evaluated by render and applied to indexed slots. */
  readonly values: readonly string[];
  /** Stable paths used when an optional lazy template is cloned. */
  readonly partDefinitions: readonly string[];
  /** Whether the skeleton has no render-time values and is safe to hot-clone. */
  readonly hot: boolean;
}

/** Neutral (React-style) attribute names mapped to their DOM name for lit-html. */
const ATTRIBUTE_ALIASES: Readonly<Record<string, string>> = {
  className: "class",
  htmlFor: "for",
};

/** DOM attributes bound as element **properties** (`.prop=`) rather than attributes. */
const PROPERTY_BOUND = new Set(["value", "checked", "selected", "disabled"]);

/** The neutral marker component whose content is injected as raw HTML. */
const HTML_CONTENT_TAG = "HtmlContent";

/** Neutral portal marker: Web Components keep the overlay in their shadow root. */
const TELEPORT_TAG = "Teleport";

/** Neutral async boundary lowered to the Web Components runtime. */
const SUSPENSE_TAG = "Suspense";

/** Context threaded through the recursive template build. */
export interface TemplateContext {
  /** The element-instance scope embedded expressions are rewritten against. */
  readonly scope: ElementScope;
  /** Sibling component folder bases, so `<ForgeThing/>` maps to a custom-element tag. */
  readonly componentFolders: ReadonlySet<string>;
  /** Host metadata for sibling components, keyed by their generated tag. */
  readonly componentHosts?: ReadonlyMap<string, TargetComponentHost>;
  /** Locals proven to be direct aliases of the component's default slot. */
  readonly slotAliases?: ReadonlyMap<string, string>;
  /** Number of custom-element boundaries between this node and its slot owner. */
  readonly slotOwnerDepth?: number;
}

/** kebab-case a neutral component tag (`ForgeIconButton` → `forge-icon-button`). */
export function kebabCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

/** Resolve the emitted tag name (intrinsic element, or a component's custom-element tag). */
function tagNameOf(node: GenericRenderNode): string {
  if (typeof node.tag !== "string") {
    return node.tag.text;
  }
  return node.tagKind === "component" ? kebabCase(node.tag) : node.tag;
}

/** Return the custom-element host metadata for a component reference, if known. */
function componentHostOf(
  node: GenericRenderNode,
  context: TemplateContext,
):
  | Readonly<{
      readonly baseTag?: string;
      readonly invocation: "is-attribute" | "custom-tag";
      readonly tagName: string;
    }>
  | undefined {
  if (node.tagKind !== "component" || typeof node.tag !== "string") {
    return undefined;
  }
  const host = context.componentHosts?.get(kebabCase(node.tag));
  return host === undefined
    ? undefined
    : { ...host, tagName: kebabCase(node.tag) };
}

/** The nested render roots a source-backed expression carries, if any. */
function nestedOf(
  value: { readonly nested?: readonly GenericRenderNode[] } | undefined,
): readonly GenericRenderNode[] {
  return value?.nested ?? [];
}

/** The internal marker used until the runtime can resolve an ambiguous slot expression. */
const RUNTIME_SLOT_TAG = "forge-slot";

/** Escape a static slot name for the native outlet attribute. */
function escapeAttribute(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

/** Escape a source identifier before embedding it in a regular expression. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Read a Slot node's static name, or `undefined` when its name is dynamic. */
function staticSlotName(node: GenericRenderNode): string | undefined {
  let name: string | undefined;
  for (const attribute of node.attributes) {
    if (attribute.kind === "jsx-spread-attribute") {
      return undefined;
    }
    if (attribute.name !== "name") {
      return undefined;
    }
    if (attribute.value?.kind !== "string") {
      return undefined;
    }
    name = attribute.value.value;
  }
  return name ?? "default";
}

/** Whether an expression is an exact, compile-time-proven default-slot passthrough. */
function isDefaultSlotExpression(
  text: string,
  context: TemplateContext,
): boolean {
  const trimmed = stripOuterParentheses(text);
  const props = context.scope.propsParameterName;
  if (
    props !== undefined &&
    new RegExp(`^${escapeRegExp(props)}\\s*\\.\\s*children$`, "u").test(trimmed)
  ) {
    return true;
  }
  return context.slotAliases?.has(trimmed) ?? false;
}

/** Whether a larger expression reads the default slot and needs runtime resolution. */
function referencesDefaultSlot(
  text: string,
  context: TemplateContext,
): boolean {
  const props = context.scope.propsParameterName;
  if (
    props !== undefined &&
    new RegExp(
      `(?<![\\w$])${escapeRegExp(props)}\\s*\\.\\s*children(?![\\w$])`,
      "u",
    ).test(text)
  ) {
    return true;
  }
  return [...(context.slotAliases?.keys() ?? [])].some((alias) =>
    new RegExp(`(?<![\\w$])${escapeRegExp(alias)}(?![\\w$])`, "u").test(text),
  );
}

/**
 * Render an embedded expression as the contents of a `${…}` hole: JSX-valued
 * conditionals/short-circuits/maps recurse into nested `html\`…\`` templates,
 * everything else is scoped and preserved verbatim.
 */
function templateHole(
  expression: SourceBackedExpression | undefined,
  nested: readonly GenericRenderNode[],
  context: TemplateContext,
): string {
  if (expression === undefined) {
    return "";
  }
  return lowerExpression(expression.text, nested, context);
}

/** Whether the (trimmed) text is exactly one of the nested render roots. */
function matchingNode(
  text: string,
  nested: readonly GenericRenderNode[],
): GenericRenderNode | undefined {
  return nested.find((node) => node.expression?.text === text);
}

/** An expression's source text with every nested render root replaced by a placeholder. */
interface SplicedExpression {
  readonly text: string;
  readonly templates: ReadonlyMap<string, string>;
}

/**
 * Replace every nested render root in `text` with a placeholder (`__mpLit0$`, …).
 *
 * The placeholders must go in **before** the surrounding code is inspected: JSX
 * source text is not JavaScript, so a `<span>:</span>` child would otherwise be
 * mistaken for the `:` of a conditional and the markup would leak out verbatim.
 * The trailing `$` keeps each placeholder self-terminating, so `__mpLit1$` can
 * never partially match inside `__mpLit10$`.
 */
function spliceRenderNodes(
  text: string,
  nested: readonly GenericRenderNode[],
  context: TemplateContext,
): SplicedExpression {
  const templates = new Map<string, string>();
  let spliced = text;
  let counter = 0;
  for (const node of nested) {
    const source = node.expression?.text;
    if (
      source === undefined ||
      source.length === 0 ||
      !spliced.includes(source)
    ) {
      continue;
    }
    const placeholder = `__mpLit${counter}$`;
    counter += 1;
    templates.set(
      placeholder,
      node.tagKind === "dynamic"
        ? renderNodeToTemplate(node, context)
        : `html\`${renderNodeToTemplate(node, context)}\``,
    );
    spliced = spliced.split(source).join(placeholder);
  }
  return { text: spliced, templates };
}

/** Put the lowered templates back where their placeholders sit. */
function restoreTemplates(
  text: string,
  templates: ReadonlyMap<string, string>,
): string {
  let out = text;
  for (const [placeholder, template] of templates) {
    out = out.split(placeholder).join(template);
  }
  return out;
}

/**
 * Lower placeholder-substituted expression text.
 *
 * A branch that is exactly one render root becomes its template, an absent one
 * (`null` / `undefined`) becomes the `nothing` sentinel, and a conditional or
 * short-circuit recurses so every arm of `a ? <A/> : b ? <B/> : null` is lowered.
 * Anything else is ordinary code: it is scoped to the element instance and its
 * placeholders are put back.
 */
function lowerSplicedBranch(
  text: string,
  templates: ReadonlyMap<string, string>,
  context: TemplateContext,
): string {
  const branch = stripOuterParentheses(text);
  if (branch === "null" || branch === "undefined") {
    return "nothing";
  }
  const template = templates.get(branch);
  if (template !== undefined) {
    return template;
  }

  // `cond ? <A/> : <B/>` → `cond ? html`…` : html`…``.
  const conditional = splitConditional(branch);
  if (conditional !== undefined) {
    return [
      rewriteExpressionText(conditional.condition.trim(), context.scope),
      " ? ",
      lowerSplicedBranch(conditional.whenTrue, templates, context),
      " : ",
      lowerSplicedBranch(conditional.whenFalse, templates, context),
    ].join("");
  }

  // `cond && <A/>` → `cond ? html`…` : nothing`.
  const logicalAnd = splitLogicalAnd(branch);
  if (
    logicalAnd !== undefined &&
    templates.has(stripOuterParentheses(logicalAnd.right))
  ) {
    const condition = rewriteExpressionText(
      logicalAnd.left.trim(),
      context.scope,
    );
    return `${condition} ? ${lowerSplicedBranch(logicalAnd.right, templates, context)} : nothing`;
  }

  return restoreTemplates(
    rewriteExpressionText(branch, context.scope),
    templates,
  );
}

/**
 * Lower an expression's source text, splicing every nested render root it
 * carries into an inline `html\`…\`` template.
 */
function lowerExpressionValue(
  text: string,
  nested: readonly GenericRenderNode[],
  context: TemplateContext,
): string {
  const trimmed = stripOuterParentheses(text);
  if (trimmed.length === 0) {
    return "";
  }
  const whole = matchingNode(trimmed, nested);
  if (whole !== undefined) {
    return `html\`${renderNodeToTemplate(whole, context)}\``;
  }
  if (nested.length === 0) {
    return rewriteExpressionText(trimmed, context.scope);
  }
  const spliced = spliceRenderNodes(trimmed, nested, context);
  return lowerSplicedBranch(spliced.text, spliced.templates, context);
}

/**
 * Lower an expression, keeping ambiguous default-slot reads behind a marker
 * until the runtime can resolve their original light-DOM ownership.
 */
function lowerExpression(
  text: string,
  nested: readonly GenericRenderNode[],
  context: TemplateContext,
): string {
  const trimmed = stripOuterParentheses(text);
  if (
    referencesDefaultSlot(trimmed, context) &&
    (!isDefaultSlotExpression(trimmed, context) ||
      (context.slotOwnerDepth ?? 0) > 0)
  ) {
    const content = lowerExpressionValue(trimmed, nested, context);
    return `html\`<${RUNTIME_SLOT_TAG} data-mp-forge-slot="default" .content=\${${content}}></${RUNTIME_SLOT_TAG}>\``;
  }
  return lowerExpressionValue(trimmed, nested, context);
}

/**
 * Lower a retained statement's source text, converting every render root it
 * carries (an `if`/`switch` guard returning markup, a `const` bound to a `.map`
 * of markup, …) into a `html\`…\`` template, so no residual JSX survives into
 * the emitted plain-TypeScript module.
 */
export function lowerStatementText(
  text: string,
  renderNodes: readonly GenericRenderNode[],
  context: TemplateContext,
): string {
  if (renderNodes.length === 0) {
    return rewriteExpressionText(text, context.scope);
  }
  const spliced = spliceRenderNodes(text, renderNodes, context);
  return restoreTemplates(
    rewriteExpressionText(spliced.text, context.scope),
    spliced.templates,
  );
}

function eventNameOf(attributeName: string): string {
  const eventName = attributeName.slice(2);
  return (
    eventName.charAt(0).toLowerCase() +
    eventName
      .slice(1)
      .replace(/[A-Z]/gu, (character) => `-${character.toLowerCase()}`)
  );
}

function hasSpreadAttribute(attributes: readonly GenericAttribute[]): boolean {
  return attributes.some(
    (attribute) => attribute.kind === "jsx-spread-attribute",
  );
}

function dynamicPropertyEntries(
  attributes: readonly GenericAttribute[],
  context: TemplateContext,
): string[] {
  const properties: string[] = [];
  for (const attribute of attributes) {
    if (attribute.kind === "jsx-spread-attribute") {
      properties.push(`...${templateHole(attribute.expression, [], context)}`);
      continue;
    }
    if (attribute.name === MP_STATIC_ATTR) {
      continue;
    }
    const { value } = attribute;
    const isEvent =
      /^on[A-Z]/.test(attribute.name) &&
      value?.kind === "expression" &&
      value.expression !== undefined;
    const name = isEvent
      ? eventNameOf(attribute.name)
      : (ATTRIBUTE_ALIASES[attribute.name] ?? attribute.name);
    if (isEvent) {
      properties.push(
        `${JSON.stringify(`@${name}`)}: ${templateHole(value.expression, nestedOf(value), context)}`,
      );
    } else if (value === undefined) {
      properties.push(`${JSON.stringify(`?${name}`)}: true`);
    } else if (value.kind === "string") {
      properties.push(
        `${JSON.stringify(`~${name}`)}: ${JSON.stringify(value.value)}`,
      );
    } else if (value.expression !== undefined) {
      properties.push(
        `${JSON.stringify(`~${name}`)}: ${templateHole(value.expression, nestedOf(value), context)}`,
      );
    }
  }
  return properties;
}

function dynamicPropertiesObject(
  attributes: readonly GenericAttribute[],
  context: TemplateContext,
): string {
  const properties = dynamicPropertyEntries(attributes, context);
  return properties.length === 0 ? "{}" : `{ ${properties.join(", ")} }`;
}

function spreadElementToTemplate(
  name: string,
  attributes: readonly GenericAttribute[],
  children: string,
  context: TemplateContext,
  componentHost:
    | Readonly<{
        readonly baseTag?: string;
        readonly invocation: "is-attribute" | "custom-tag";
        readonly tagName: string;
      }>
    | undefined = undefined,
): string {
  const properties = dynamicPropertiesObject(attributes, context);
  const invocation =
    componentHost?.invocation === "is-attribute"
      ? `{ "is": "${componentHost.tagName}"${properties === "{}" ? "" : `, ${properties.slice(1, -1).trim()}`} }`
      : properties;
  return `\${dynamicElement(${JSON.stringify(name)}, ${invocation}, html\`${children}\`)}`;
}

/** Emit an element's opening tag with its lit-html attribute/event/property bindings. */
function openTag(
  name: string,
  tagKind: GenericTagKind,
  attributes: readonly GenericAttribute[],
  context: TemplateContext,
  selfClosing: boolean,
  componentHost:
    | Readonly<{
        readonly baseTag?: string;
        readonly invocation: "is-attribute" | "custom-tag";
        readonly tagName: string;
      }>
    | undefined = undefined,
): string {
  const parts: string[] = [];
  if (componentHost?.invocation === "is-attribute") {
    parts.push(`is="${componentHost.tagName}"`);
  }
  for (const attribute of attributes) {
    if (attribute.kind === "jsx-spread-attribute") {
      continue;
    }
    // Stage-1 static marker — never leak into lit-html output.
    if (attribute.name === MP_STATIC_ATTR) {
      continue;
    }
    const { value } = attribute;
    // Both native listeners and component custom events use event bindings. The
    // child lowers callback-prop calls to typed CustomEvent dispatches.
    if (
      /^on[A-Z]/.test(attribute.name) &&
      value?.kind === "expression" &&
      value.expression !== undefined
    ) {
      const hole = templateHole(value.expression, nestedOf(value), context);
      parts.push(`@${eventNameOf(attribute.name)}=\${${hole}}`);
      continue;
    }
    const attributeName = ATTRIBUTE_ALIASES[attribute.name] ?? attribute.name;
    if (value === undefined) {
      parts.push(attributeName);
      continue;
    }
    if (value.kind === "string") {
      parts.push(`${attributeName}="${value.value}"`);
      continue;
    }
    if (value.expression === undefined) {
      continue;
    }
    const hole = templateHole(value.expression, nestedOf(value), context);
    parts.push(
      tagKind === "component" ||
        (tagKind === "element" && name.includes("-")) ||
        PROPERTY_BOUND.has(attributeName)
        ? `.${attributeName}=\${${hole}}`
        : `${attributeName}=\${${hole}}`,
    );
  }
  const attributeString = parts.length > 0 ? ` ${parts.join(" ")}` : "";
  return selfClosing
    ? `<${name}${attributeString}></${name}>`
    : `<${name}${attributeString}>`;
}

/** Lower a computed JSX tag to a runtime element descriptor. */
function dynamicTagToTemplate(
  node: GenericRenderNode,
  context: TemplateContext,
): string {
  const tag =
    typeof node.tag === "string"
      ? JSON.stringify(node.tag)
      : rewriteExpressionText(node.tag.text, context.scope);
  const propertyObject = dynamicPropertiesObject(node.attributes, context);
  const children = node.children
    .map((child) => childToTemplate(child, context))
    .join("");
  return `dynamicElement(${tag}, ${propertyObject}, html\`${children}\`)`;
}

/** Lower the icon sprite provider through the runtime context-provider path. */
function iconSpriteProviderToTemplate(
  node: GenericRenderNode,
  context: TemplateContext,
): string {
  const properties = dynamicPropertiesObject(node.attributes, context);
  const children = node.children
    .map((child) => childToTemplate(child, context))
    .join("");
  return `dynamicElement(IconSpriteProvider, ${properties}, html\`${children}\`)`;
}

/** Lower a `<HtmlContent html={…} as="section" />` marker to an `unsafeHtml` hole. */
function htmlContentToTemplate(
  node: GenericRenderNode,
  context: TemplateContext,
): string {
  let host = "div";
  let content = '""';
  const hostAttributes: GenericAttribute[] = [];
  let hasSpread = false;
  for (const attribute of node.attributes) {
    if (attribute.kind === "jsx-spread-attribute") {
      hasSpread = true;
      hostAttributes.push(attribute);
      continue;
    }
    if (attribute.name === "html") {
      const { value } = attribute;
      if (value?.kind === "expression" && value.expression !== undefined) {
        content = templateHole(value.expression, nestedOf(value), context);
      } else if (value?.kind === "string") {
        content = JSON.stringify(value.value);
      }
      continue;
    }
    if (attribute.name === "as") {
      if (attribute.value?.kind === "string") {
        host = attribute.value.value;
      }
      continue;
    }
    hostAttributes.push(attribute);
  }
  if (hasSpread) {
    return spreadElementToTemplate(
      host,
      hostAttributes,
      `\${unsafeHtml(${content})}`,
      context,
    );
  }
  return `${openTag(host, "element", hostAttributes, context, false)}\${unsafeHtml(${content})}</${host}>`;
}

function suspenseFallbackToTemplate(
  node: GenericRenderNode,
  context: TemplateContext,
): string {
  const attribute = node.attributes.find(
    (entry): entry is Extract<GenericAttribute, { kind: "jsx-attribute" }> =>
      entry.kind === "jsx-attribute" && entry.name === "fallback",
  );
  if (attribute?.value?.kind === "string") {
    return JSON.stringify(attribute.value.value);
  }
  if (attribute?.value?.kind === "expression") {
    const nested = nestedOf(attribute.value);
    if (nested.length > 0) {
      return `html\`${nested.map((child) => renderNodeToTemplate(child, context)).join("")}\``;
    }
    return attribute.value.expression === undefined
      ? "nothing"
      : templateHole(attribute.value.expression, [], context);
  }
  return "nothing";
}

function suspenseToTemplate(
  node: GenericRenderNode,
  context: TemplateContext,
): string {
  const children = node.children
    .map((child) => childToTemplate(child, context))
    .join("");
  return `suspense(${suspenseFallbackToTemplate(node, context)}, html\`${children}\`)`;
}

/** Lower a Slot marker to a native outlet or a runtime projection marker. */
function slotToTemplate(
  node: GenericRenderNode,
  context: TemplateContext,
): string {
  const staticName = staticSlotName(node);
  if (staticName !== undefined) {
    const nameAttribute =
      staticName === "default" ? "" : ` name="${escapeAttribute(staticName)}"`;
    const children = node.children
      .map((child) => childToTemplate(child, context))
      .join("");
    if ((context.slotOwnerDepth ?? 0) > 0) {
      const props = context.scope.propsParameterName;
      const content =
        props === undefined
          ? "undefined"
          : rewriteExpressionText(`${props}.children`, context.scope);
      return `<${RUNTIME_SLOT_TAG} data-mp-forge-slot="true" data-mp-forge-nested="true"${nameAttribute} .content=\${${content}}>${children}</${RUNTIME_SLOT_TAG}>`;
    }
    return `<slot${nameAttribute}>${children}</slot>`;
  }
  const dynamicName = node.attributes.find(
    (attribute) =>
      attribute.kind === "jsx-attribute" && attribute.name === "name",
  );
  const name =
    dynamicName?.kind === "jsx-attribute" &&
    dynamicName.value?.kind === "expression" &&
    dynamicName.value.expression !== undefined
      ? templateHole(
          dynamicName.value.expression,
          nestedOf(dynamicName.value),
          context,
        )
      : '"default"';
  const fallback = node.children
    .map((child) => childToTemplate(child, context))
    .join("");
  return `<${RUNTIME_SLOT_TAG} data-mp-forge-slot="true" .name=\${${name}}>${fallback}</${RUNTIME_SLOT_TAG}>`;
}

/** Lower a single render child (nested node, literal text, or `{…}` interpolation). */
function childToTemplate(
  child: GenericRenderChild,
  context: TemplateContext,
): string {
  if (child.kind === "render-node") {
    const template = renderNodeToTemplate(child, context);
    return child.tagKind === "dynamic" ? `\${${template}}` : template;
  }
  if (child.kind === "text") {
    const text = child.text.replace(/\s+/g, " ");
    if (text.trim().length > 0) {
      return text;
    }
    return child.text.includes("\n") ? "" : text;
  }
  if (
    child.expression !== undefined &&
    isDefaultSlotExpression(child.expression.text, context)
  ) {
    if ((context.slotOwnerDepth ?? 0) === 0) {
      return "<slot></slot>";
    }
    const content = lowerExpressionValue(
      child.expression.text,
      child.nested,
      context,
    );
    return `<${RUNTIME_SLOT_TAG} data-mp-forge-slot="true" .content=\${${content}}></${RUNTIME_SLOT_TAG}>`;
  }
  const hole = templateHole(child.expression, child.nested, context);
  return hole.length === 0 ? "" : `\${${hole}}`;
}

/** Build the lit-html template string for a generic render node. */
export function renderNodeToTemplate(
  node: GenericRenderNode,
  context: TemplateContext,
): string {
  const childContext =
    node.tagKind === "component" &&
    node.tag !== "Slot" &&
    node.tag !== HTML_CONTENT_TAG &&
    node.tag !== TELEPORT_TAG
      ? {
          ...context,
          slotOwnerDepth: (context.slotOwnerDepth ?? 0) + 1,
        }
      : context;
  const children = node.children
    .map((child) => childToTemplate(child, childContext))
    .join("");
  if (node.tagKind === "fragment") {
    return children;
  }
  if (node.tag === HTML_CONTENT_TAG) {
    return htmlContentToTemplate(node, childContext);
  }
  if (node.tag === TELEPORT_TAG) {
    return children;
  }
  if (node.tag === SUSPENSE_TAG) {
    return suspenseToTemplate(node, childContext);
  }
  if (node.tag === "Slot") {
    return slotToTemplate(node, childContext);
  }
  if (node.tagKind === "dynamic") {
    return dynamicTagToTemplate(node, childContext);
  }
  const tagText = typeof node.tag === "string" ? node.tag : node.tag.text;
  if (tagText === "IconSpriteProvider") {
    return iconSpriteProviderToTemplate(node, childContext);
  }
  const name = tagNameOf(node);
  const host = componentHostOf(node, childContext);
  const emittedName =
    host?.invocation === "is-attribute" ? (host.baseTag ?? name) : name;
  if (hasSpreadAttribute(node.attributes)) {
    return spreadElementToTemplate(
      emittedName,
      node.attributes,
      children,
      childContext,
      host,
    );
  }
  if (node.selfClosing) {
    return openTag(
      emittedName,
      node.tagKind,
      node.attributes,
      childContext,
      true,
      host,
    );
  }
  return `${openTag(
    emittedName,
    node.tagKind,
    node.attributes,
    childContext,
    false,
    host,
  )}${children}</${emittedName}>`;
}

interface DomTemplateBuilder {
  readonly values: string[];
  readonly parts: string[];
  readonly statements: string[];
  nodeId: number;
}

function domValue(
  text: string,
  nested: readonly GenericRenderNode[],
  context: TemplateContext,
): string {
  const branch = stripOuterParentheses(text);
  const whole = matchingNode(branch, nested);
  if (whole !== undefined) {
    return domNodeExpression(whole, context);
  }
  if (nested.length > 0) {
    const templates = new Map<string, string>();
    let spliced = branch;
    nested.forEach((node, index) => {
      const nodeText = node.expression?.text;
      if (nodeText !== undefined && spliced.includes(nodeText)) {
        const placeholder = `__mpDom${index}$`;
        templates.set(placeholder, domNodeExpression(node, context));
        spliced = spliced.split(nodeText).join(placeholder);
      }
    });
    if (templates.size > 0) {
      return lowerSplicedBranch(spliced, templates, context);
    }
  }
  const conditional = splitConditional(branch);
  if (conditional !== undefined) {
    return `${rewriteExpressionText(conditional.condition.trim(), context.scope)} ? ${domValue(conditional.whenTrue, nested, context)} : ${domValue(conditional.whenFalse, nested, context)}`;
  }
  const logicalAnd = splitLogicalAnd(branch);
  if (
    logicalAnd !== undefined &&
    nested.some(
      (node) =>
        node.expression?.text === stripOuterParentheses(logicalAnd.right),
    )
  ) {
    return `${rewriteExpressionText(logicalAnd.left.trim(), context.scope)} ? ${domValue(logicalAnd.right, nested, context)} : nothing`;
  }
  return rewriteExpressionText(branch, context.scope);
}

/**
 * Checks whether an attribute refers to a ref property.
 *
 * @param name - Raw attribute name.
 * @param normalizedName - Normalized attribute name.
 * @returns True if the attribute is ref.
 */
function isRefAttribute(name: string, normalizedName: string): boolean {
  return name === "ref" || normalizedName === "ref";
}

/**
 * Checks whether an attribute binds via dot property access.
 *
 * @param name - Raw attribute name.
 * @param normalizedName - Normalized attribute name.
 * @returns True if property bound.
 */
function isDotPropertyAttribute(name: string, normalizedName: string): boolean {
  return (
    PROPERTY_BOUND.has(normalizedName) ||
    name === "className" ||
    name === "htmlFor"
  );
}

/**
 * Resolves the property binding prefix symbol for an attribute.
 *
 * @param attributeName - Authored attribute name.
 * @param normalizedName - Aliased attribute name.
 * @returns Prefix character (`.`, `~`, or empty).
 */
function resolvePropertyPrefix(
  attributeName: string,
  normalizedName: string,
): string {
  if (isRefAttribute(attributeName, normalizedName)) {
    return "";
  }
  if (isDotPropertyAttribute(attributeName, normalizedName)) {
    return ".";
  }
  return "~";
}

/**
 * Formats a JSX spread attribute into an object spread entry.
 *
 * @param attribute - Spread attribute.
 * @param scope - Template scope for identifier remapping.
 * @returns Formatted spread string or undefined.
 */
function formatSpreadAttributeEntry(
  attribute: Extract<GenericAttribute, { kind: "jsx-spread-attribute" }>,
  scope: unknown,
): string | undefined {
  return attribute.expression !== undefined
    ? `...${rewriteExpressionText(attribute.expression.text, scope)}`
    : undefined;
}

/**
 * Formats an event handler attribute into an event listener property entry.
 *
 * @param name - Attribute name.
 * @param value - Attribute value.
 * @param context - Template context.
 * @returns Formatted event handler entry or undefined.
 */
function formatEventAttributeEntry(
  name: string,
  value: GenericAttribute["value"],
  context: TemplateContext,
): string | undefined {
  if (
    !/^on[A-Z]/u.test(name) ||
    value?.kind !== "expression" ||
    value.expression === undefined
  ) {
    return undefined;
  }
  return `${JSON.stringify(`@${eventNameOf(name)}`)}: ${domValue(value.expression.text, nestedOf(value), context)}`;
}

/**
 * Formats a static or reactive attribute value into a DOM property dictionary entry.
 *
 * @param attributeName - Raw attribute name.
 * @param name - Normalized attribute name.
 * @param value - Attribute value.
 * @param context - Template context.
 * @returns Formatted property entry string or undefined.
 */
function formatValueAttributeEntry(
  attributeName: string,
  name: string,
  value: GenericAttribute["value"],
  context: TemplateContext,
): string | undefined {
  if (value === undefined) {
    return `${JSON.stringify(`?${name}`)}: true`;
  }
  if (value.kind === "string") {
    return `${JSON.stringify(`~${name}`)}: ${JSON.stringify(value.value)}`;
  }
  if (value.kind === "expression" && value.expression !== undefined) {
    const prefix = resolvePropertyPrefix(attributeName, name);
    return `${JSON.stringify(`${prefix}${name}`)}: ${domValue(value.expression.text, nestedOf(value), context)}`;
  }
  return undefined;
}

/**
 * Formats a single JSX attribute into a DOM property dictionary entry.
 *
 * @param attribute - The attribute to process.
 * @param context - Template compilation context.
 * @returns The formatted property entry string, or undefined if skipped.
 */
function formatDomPropertyEntry(
  attribute: GenericAttribute,
  context: TemplateContext,
): string | undefined {
  if (attribute.kind === "jsx-spread-attribute") {
    return formatSpreadAttributeEntry(attribute, context.scope);
  }
  if (attribute.kind !== "jsx-attribute" || attribute.name === MP_STATIC_ATTR) {
    return undefined;
  }
  const name = ATTRIBUTE_ALIASES[attribute.name] ?? attribute.name;
  return (
    formatEventAttributeEntry(attribute.name, attribute.value, context) ??
    formatValueAttributeEntry(attribute.name, name, attribute.value, context)
  );
}

function domProperties(
  attributes: readonly GenericAttribute[],
  context: TemplateContext,
): string {
  const entries: string[] = [];
  for (const attribute of attributes) {
    const entry = formatDomPropertyEntry(attribute, context);
    if (entry !== undefined) {
      entries.push(entry);
    }
  }
  return entries.length === 0 ? "{}" : `{ ${entries.join(", ")} }`;
}

function domAttributes(
  node: GenericRenderNode,
  host:
    | Readonly<{
        readonly baseTag?: string;
        readonly invocation: "is-attribute" | "custom-tag";
        readonly tagName: string;
      }>
    | undefined,
): readonly GenericAttribute[] {
  if (host?.invocation !== "is-attribute") return node.attributes;
  return [
    {
      kind: "jsx-attribute",
      name: "is",
      value: { kind: "string", value: host.tagName },
    } as GenericAttribute,
    ...node.attributes,
  ];
}

function domChildExpression(
  child: GenericRenderChild,
  context: TemplateContext,
): string | undefined {
  if (child.kind === "text") {
    const text = child.text.replace(/\s+/g, " ");
    return text.trim().length > 0 || !child.text.includes("\n")
      ? JSON.stringify(text)
      : undefined;
  }
  if (child.kind === "render-node") {
    return domNodeExpression(child, context);
  }
  if (child.expression === undefined) {
    return undefined;
  }
  if (
    isDefaultSlotExpression(child.expression.text, context) &&
    (context.slotOwnerDepth ?? 0) === 0
  ) {
    return `dynamicElement("slot", {}, nothing)`;
  }
  return domValue(child.expression.text, child.nested, context);
}

/**
 * Renders a suspense element expression.
 *
 * @param node - Suspense render node.
 * @param childContext - Context for children.
 * @returns Suspense JavaScript call expression.
 */
function domSuspenseExpression(
  node: GenericRenderNode,
  childContext: TemplateContext,
): string {
  const fallback = node.attributes.find(
    (entry): entry is Extract<GenericAttribute, { kind: "jsx-attribute" }> =>
      entry.kind === "jsx-attribute" && entry.name === "fallback",
  )?.value;
  const fallbackExpression =
    fallback?.kind === "string"
      ? JSON.stringify(fallback.value)
      : fallback?.kind === "expression" && fallback.expression !== undefined
        ? domValue(fallback.expression.text, nestedOf(fallback), childContext)
        : "nothing";
  const children = node.children
    .map((child) => domChildExpression(child, childContext))
    .filter((value): value is string => value !== undefined)
    .join(", ");
  return `suspense(${fallbackExpression}, [${children}])`;
}

/**
 * Extracts host element tag name from the "as" attribute of an HTML content node.
 *
 * @param attribute - Candidate attribute.
 * @returns Host tag name or undefined.
 */
function extractHtmlContentHost(
  attribute: GenericAttribute,
): string | undefined {
  if (
    attribute.kind === "jsx-attribute" &&
    attribute.name === "as" &&
    attribute.value?.kind === "string"
  ) {
    return attribute.value.value;
  }
  return undefined;
}

/**
 * Extracts the unsafe HTML expression from the "html" attribute.
 *
 * @param attribute - Candidate attribute.
 * @param childContext - Template context for remapping.
 * @returns unsafeHtml call expression or undefined.
 */
function extractHtmlContentExpression(
  attribute: GenericAttribute,
  childContext: TemplateContext,
): string | undefined {
  if (
    attribute.kind === "jsx-attribute" &&
    attribute.name === "html" &&
    attribute.value?.kind === "expression" &&
    attribute.value.expression !== undefined
  ) {
    return `unsafeHtml(${domValue(attribute.value.expression.text, nestedOf(attribute.value), childContext)})`;
  }
  return undefined;
}

/**
 * Checks whether an attribute should be passed through on an HTML content node.
 *
 * @param attribute - Candidate attribute.
 * @returns True if the attribute is passed through.
 */
function isHtmlContentPassthrough(attribute: GenericAttribute): boolean {
  return (
    attribute.kind !== "jsx-spread-attribute" &&
    attribute.name !== "html" &&
    attribute.name !== "as"
  );
}

/**
 * Renders an HTML content container expression.
 *
 * @param node - HTML content render node.
 * @param childContext - Context for children.
 * @returns dynamicElement call expression for raw HTML container.
 */
function domHtmlContentExpression(
  node: GenericRenderNode,
  childContext: TemplateContext,
): string {
  let host = "div";
  let content = '""';
  const attributes: GenericAttribute[] = [];
  for (const attribute of node.attributes) {
    const asHost = extractHtmlContentHost(attribute);
    if (asHost !== undefined) {
      host = asHost;
      continue;
    }
    const htmlExpr = extractHtmlContentExpression(attribute, childContext);
    if (htmlExpr !== undefined) {
      content = htmlExpr;
      continue;
    }
    if (isHtmlContentPassthrough(attribute)) {
      attributes.push(attribute);
    }
  }
  return `dynamicElement(${JSON.stringify(host)}, ${domProperties(attributes, childContext)}, ${content})`;
}

/**
 * Prepares attributes for a slot element, filtering authored name and adding normalized name.
 *
 * @param node - Slot render node.
 * @param name - Slot name if known.
 * @returns Filtered attribute list.
 */
function prepareSlotAttributes(
  node: GenericRenderNode,
  name: string | undefined,
): GenericAttribute[] {
  if (name === undefined) {
    return [...node.attributes];
  }
  const attributes = node.attributes.filter(
    (attribute) =>
      attribute.kind !== "jsx-spread-attribute" && attribute.name !== "name",
  );
  if (name !== "default") {
    attributes.push({
      kind: "jsx-attribute",
      name: "name",
      value: { kind: "string", value: name },
    } as GenericAttribute);
  }
  return attributes;
}

/**
 * Builds dynamicElement call for a custom forge-slot element.
 *
 * @param properties - Serialized properties dictionary.
 * @param children - Serialized child elements.
 * @param context - Template compilation context.
 * @returns dynamicElement call expression.
 */
function buildForgeSlotExpression(
  properties: string,
  children: string,
  context: TemplateContext,
): string {
  const props = context.scope.propsParameterName;
  const content =
    props === undefined
      ? "undefined"
      : rewriteExpressionText(`${props}.children`, context.scope);
  const markerProperties =
    properties === "{}"
      ? `{ "?data-mp-forge-slot": true, "?data-mp-forge-nested": true, ".content": ${content} }`
      : `{ "?data-mp-forge-slot": true, "?data-mp-forge-nested": true, ${properties.slice(1, -1)}, ".content": ${content} }`;
  return `dynamicElement("forge-slot", ${markerProperties}, ${children})`;
}

/**
 * Formats rendered child nodes into a comma-separated argument string.
 *
 * @param children - Array of render children.
 * @param childContext - Context for child emission.
 * @returns Comma-separated serialized child expressions.
 */
function renderChildrenExpressionList(
  children: readonly GenericRenderChild[],
  childContext: TemplateContext,
): string {
  return children
    .map((child) => domChildExpression(child, childContext))
    .filter((value): value is string => value !== undefined)
    .join(", ");
}

/**
 * Renders a slot element expression.
 *
 * @param node - Slot render node.
 * @param context - Parent context.
 * @param childContext - Child context.
 * @returns dynamicElement call expression for slot or forge-slot.
 */
function domSlotExpression(
  node: GenericRenderNode,
  context: TemplateContext,
  childContext: TemplateContext,
): string {
  const name = staticSlotName(node);
  const attributes = prepareSlotAttributes(node, name);
  const properties = domProperties(attributes, childContext);
  const children = renderChildrenExpressionList(node.children, childContext);

  if ((context.slotOwnerDepth ?? 0) > 0) {
    return buildForgeSlotExpression(properties, children, context);
  }
  return `dynamicElement("slot", ${properties}, ${children})`;
}

/**
 * Resolves the tag name expression for a dynamic tag node.
 *
 * @param tag - Tag specification from node.
 * @param scope - Scope for expression remapping.
 * @returns Serialized tag expression.
 */
function resolveDynamicTagExpression(
  tag: GenericRenderNode["tag"],
  scope: unknown,
): string {
  return typeof tag === "string"
    ? JSON.stringify(tag)
    : rewriteExpressionText(tag.text, scope);
}

/**
 * Resolves the element tag name for a standard element or custom element host.
 *
 * @param node - Render node.
 * @param host - Component host descriptor.
 * @returns Resolved tag name string.
 */
function resolveElementHostTag(
  node: GenericRenderNode,
  host: ReturnType<typeof componentHostOf>,
): string {
  return host?.invocation === "is-attribute"
    ? (host.baseTag ?? tagNameOf(node))
    : tagNameOf(node);
}

/**
 * Renders a standard DOM element or custom web component expression.
 *
 * @param node - Render node.
 * @param childContext - Child context.
 * @returns dynamicElement call expression.
 */
function domStandardElementExpression(
  node: GenericRenderNode,
  childContext: TemplateContext,
): string {
  const children = renderChildrenExpressionList(node.children, childContext);

  if (node.tagKind === "dynamic") {
    const tag = resolveDynamicTagExpression(node.tag, childContext.scope);
    return `dynamicElement(${tag}, ${domProperties(node.attributes, childContext)}, ${children})`;
  }
  const tagText = typeof node.tag === "string" ? node.tag : node.tag.text;
  if (tagText === "IconSpriteProvider") {
    return `dynamicElement(IconSpriteProvider, ${domProperties(node.attributes, childContext)}, ${children})`;
  }
  const host = componentHostOf(node, childContext);
  const name = resolveElementHostTag(node, host);
  return `dynamicElement(${JSON.stringify(name)}, ${domProperties(domAttributes(node, host), childContext)}, ${children})`;
}

/**
 * Checks whether a render node owns child slots.
 *
 * @param node - Render node to inspect.
 * @returns True if node increments slot depth.
 */
function isSlotOwnerNode(node: GenericRenderNode): boolean {
  return (
    node.tagKind === "component" &&
    node.tag !== "Slot" &&
    node.tag !== HTML_CONTENT_TAG &&
    node.tag !== TELEPORT_TAG
  );
}

/**
 * Resolves the child context with updated slotOwnerDepth if applicable.
 *
 * @param node - Render node.
 * @param context - Parent template context.
 * @returns Child template context.
 */
function resolveNodeChildContext(
  node: GenericRenderNode,
  context: TemplateContext,
): TemplateContext {
  return isSlotOwnerNode(node)
    ? { ...context, slotOwnerDepth: (context.slotOwnerDepth ?? 0) + 1 }
    : context;
}

/**
 * Renders special control and container nodes (fragment, suspense, slot, html).
 *
 * @param node - Render node.
 * @param context - Parent context.
 * @param childContext - Child context.
 * @returns Serialized expression if handled, or undefined.
 */
function domSpecialNodeExpression(
  node: GenericRenderNode,
  context: TemplateContext,
  childContext: TemplateContext,
): string | undefined {
  if (node.tagKind === "fragment" || node.tag === TELEPORT_TAG) {
    return `[${renderChildrenExpressionList(node.children, childContext)}]`;
  }
  if (node.tag === SUSPENSE_TAG) {
    return domSuspenseExpression(node, childContext);
  }
  if (node.tag === HTML_CONTENT_TAG) {
    return domHtmlContentExpression(node, childContext);
  }
  if (node.tag === "Slot") {
    return domSlotExpression(node, context, childContext);
  }
  return undefined;
}

/**
 * Renders a generic render node to a DOM JavaScript expression.
 *
 * @param node - Render node.
 * @param context - Template context.
 * @returns DOM dynamic element expression string.
 */
function domNodeExpression(
  node: GenericRenderNode,
  context: TemplateContext,
): string {
  const childContext = resolveNodeChildContext(node, context);
  return (
    domSpecialNodeExpression(node, context, childContext) ??
    domStandardElementExpression(node, childContext)
  );
}

/**
 * Emits an anchor comment and part registration for dynamic content nodes within a static template.
 *
 * @param node - Dynamic render node.
 * @param context - Template context.
 * @param builder - Static DOM builder.
 * @param parent - Parent element variable name if nested.
 * @returns Array of anchor identifiers for root elements.
 */
function domStaticDynamicAnchor(
  node: GenericRenderNode,
  context: TemplateContext,
  builder: DomTemplateBuilder,
  parent: string | undefined,
): string[] {
  const value = builder.values.push(domNodeExpression(node, context)) - 1;
  const id = builder.nodeId++;
  const anchor = `__mpAnchor${id}`;
  builder.statements.push(
    `const ${anchor} = document.createComment("mp:${id}");`,
  );
  if (parent !== undefined) {
    builder.statements.push(`${parent}.append(${anchor});`);
  }
  builder.parts.push(`{ kind: "node", id: ${value}, start: ${anchor} }`);
  return parent === undefined ? [anchor] : [];
}

/**
 * Checks whether a node is a custom element or has a property-bound attribute.
 *
 * @param node - Render node.
 * @param tag - Tag name.
 * @param normalizedName - Aliased attribute name.
 * @returns True if attribute binds as property.
 */
function isCustomElementOrPropertyBound(
  node: GenericRenderNode,
  tag: string,
  normalizedName: string,
): boolean {
  if (node.tagKind === "component") {
    return true;
  }
  if (node.tagKind !== "element") {
    return false;
  }
  return tag.includes("-") || PROPERTY_BOUND.has(normalizedName);
}

/**
 * Resolves static attribute prefix for dynamic property/event/attribute parts.
 *
 * @param node - Render node.
 * @param tag - Tag name.
 * @param attributeName - Raw attribute name.
 * @param normalizedName - Normalized attribute name.
 * @returns Prefix string.
 */
function resolveStaticAttrPrefix(
  node: GenericRenderNode,
  tag: string,
  attributeName: string,
  normalizedName: string,
): string {
  if (/^on[A-Z]/u.test(attributeName)) {
    return "@";
  }
  if (attributeName === "ref") {
    return "";
  }
  if (isCustomElementOrPropertyBound(node, tag, normalizedName)) {
    return ".";
  }
  return "";
}

/**
 * Applies a static spread attribute to the template builder.
 *
 * @param attribute - Spread attribute.
 * @param variable - Element variable identifier.
 * @param scope - Template scope.
 * @param builder - Template builder.
 */
function applyStaticSpreadAttribute(
  attribute: Extract<GenericAttribute, { kind: "jsx-spread-attribute" }>,
  variable: string,
  scope: unknown,
  builder: DomTemplateBuilder,
): void {
  if (attribute.expression !== undefined) {
    const valueId =
      builder.values.push(
        rewriteExpressionText(attribute.expression.text, scope),
      ) - 1;
    builder.parts.push(
      `{ kind: "spread", id: ${valueId}, element: ${variable} }`,
    );
  }
}

/**
 * Applies a static JSX attribute to the template builder.
 *
 * @param attribute - JSX attribute.
 * @param node - Render node.
 * @param tag - Tag name.
 * @param variable - Element variable.
 * @param context - Template context.
 * @param builder - Template builder.
 */
function applyStaticSingleAttribute(
  attribute: Extract<GenericAttribute, { kind: "jsx-attribute" }>,
  node: GenericRenderNode,
  tag: string,
  variable: string,
  context: TemplateContext,
  builder: DomTemplateBuilder,
): void {
  if (attribute.name === MP_STATIC_ATTR) {
    return;
  }
  const name = ATTRIBUTE_ALIASES[attribute.name] ?? attribute.name;
  const value = attribute.value;
  if (value?.kind === "string") {
    builder.statements.push(
      `${variable}.setAttribute(${JSON.stringify(name)}, ${JSON.stringify(value.value)});`,
    );
    return;
  }
  if (value === undefined) {
    builder.statements.push(
      `${variable}.setAttribute(${JSON.stringify(name)}, "");`,
    );
    return;
  }
  if (value.expression !== undefined) {
    const valueId =
      builder.values.push(
        domValue(value.expression.text, nestedOf(value), context),
      ) - 1;
    const prefix = resolveStaticAttrPrefix(node, tag, attribute.name, name);
    const eventOrAttributeName = /^on[A-Z]/u.test(attribute.name)
      ? eventNameOf(attribute.name)
      : name;
    builder.parts.push(
      `{ kind: "attr", id: ${valueId}, element: ${variable}, prefix: ${JSON.stringify(prefix)}, name: ${JSON.stringify(eventOrAttributeName)} }`,
    );
  }
}

/**
 * Applies attributes to a static element during template building.
 *
 * @param node - Render node.
 * @param host - Component host descriptor.
 * @param tag - Tag name.
 * @param variable - Element variable identifier.
 * @param context - Template context.
 * @param builder - Template builder.
 */
function applyStaticNodeAttributes(
  node: GenericRenderNode,
  host:
    | Readonly<{
        readonly baseTag?: string;
        readonly invocation: "is-attribute" | "custom-tag";
        readonly tagName: string;
      }>
    | undefined,
  tag: string,
  variable: string,
  context: TemplateContext,
  builder: DomTemplateBuilder,
): void {
  for (const attribute of domAttributes(node, host)) {
    if (attribute.kind === "jsx-spread-attribute") {
      applyStaticSpreadAttribute(attribute, variable, context.scope, builder);
    } else {
      applyStaticSingleAttribute(
        attribute,
        node,
        tag,
        variable,
        context,
        builder,
      );
    }
  }
}

/**
 * Checks whether a render node is a static fragment or teleport.
 *
 * @param node - Candidate render node.
 * @returns True if fragment or teleport.
 */
function isStaticFragmentOrTeleport(node: GenericRenderNode): boolean {
  return node.tagKind === "fragment" || node.tag === TELEPORT_TAG;
}

/**
 * Checks whether a render node requires a dynamic anchor slot.
 *
 * @param node - Candidate render node.
 * @returns True if dynamic anchor tag.
 */
function isStaticDynamicAnchorTag(node: GenericRenderNode): boolean {
  return (
    node.tag === "Slot" ||
    node.tag === HTML_CONTENT_TAG ||
    node.tag === SUSPENSE_TAG ||
    node.tagKind === "dynamic"
  );
}

/**
 * Appends document.createElement and parent append statements.
 *
 * @param tag - Element tag name.
 * @param host - Component host descriptor.
 * @param variable - Element variable.
 * @param parent - Parent variable if present.
 * @param builder - Template builder.
 */
function appendElementCreationStatements(
  tag: string,
  host: ReturnType<typeof componentHostOf>,
  variable: string,
  parent: string | undefined,
  builder: DomTemplateBuilder,
): void {
  const creationOptions =
    host?.invocation === "is-attribute"
      ? `, { is: ${JSON.stringify(host.tagName)} }`
      : "";
  builder.statements.push(
    `const ${variable} = document.createElement(${JSON.stringify(tag)}${creationOptions});`,
  );
  if (parent !== undefined) {
    builder.statements.push(`${parent}.append(${variable});`);
  }
}

/**
 * Emits direct DOM statements for a static or dynamic render node.
 *
 * @param node - Render node to process.
 * @param context - Template compilation context.
 * @param builder - DOM template builder accumulator.
 * @param parent - Variable name of the parent element, if nested.
 * @returns Array of emitted node variable names or anchor identifiers.
 */
function domStaticNode(
  node: GenericRenderNode,
  context: TemplateContext,
  builder: DomTemplateBuilder,
  parent: string | undefined,
): string[] {
  if (isStaticFragmentOrTeleport(node)) {
    return node.children.flatMap((child) =>
      domStaticChild(child, context, builder, parent),
    );
  }
  if (isStaticDynamicAnchorTag(node)) {
    return domStaticDynamicAnchor(node, context, builder, parent);
  }
  const host = componentHostOf(node, context);
  const tag = resolveElementHostTag(node, host);
  const variable = `__mpNode${builder.nodeId++}`;
  appendElementCreationStatements(tag, host, variable, parent, builder);

  applyStaticNodeAttributes(node, host, tag, variable, context, builder);

  const childContext = resolveNodeChildContext(node, context);
  for (const child of node.children) {
    domStaticChild(child, childContext, builder, variable);
  }
  return [variable];
}

function domStaticChild(
  child: GenericRenderChild,
  context: TemplateContext,
  builder: DomTemplateBuilder,
  parent: string | undefined,
): string[] {
  if (child.kind === "render-node")
    return domStaticNode(child, context, builder, parent);
  if (child.kind === "text") {
    const text = child.text.replace(/\s+/g, " ");
    if (text.trim().length === 0 && child.text.includes("\n")) return [];
    const variable = `__mpText${builder.nodeId++}`;
    builder.statements.push(
      `const ${variable} = document.createTextNode(${JSON.stringify(text)});`,
    );
    if (parent !== undefined)
      builder.statements.push(`${parent}.append(${variable});`);
    return [variable];
  }
  if (child.expression === undefined) return [];
  const valueId =
    builder.values.push(
      domValue(child.expression.text, child.nested, context),
    ) - 1;
  const id = builder.nodeId++;
  const anchor = `__mpAnchor${id}`;
  builder.statements.push(
    `const ${anchor} = document.createComment("mp:${id}");`,
  );
  if (parent !== undefined)
    builder.statements.push(`${parent}.append(${anchor});`);
  builder.parts.push(`{ kind: "node", id: ${valueId}, start: ${anchor} }`);
  // Root-level dynamic child/content must be present in the returned blueprint
  // nodes so the renderer can insert the `end` anchor and mount updates.
  return parent === undefined ? [anchor] : [];
}

/** Lower a render root to a direct-DOM factory and typed runtime slots. */
export function renderNodeToDomTemplate(
  node: GenericRenderNode | undefined,
  context: TemplateContext,
): DomTemplateSource {
  const builder: DomTemplateBuilder = {
    values: [],
    parts: [],
    statements: [],
    nodeId: 0,
  };
  const roots =
    node === undefined
      ? domStaticNode(
          {
            tag: "slot",
            tagKind: "element",
            attributes: [],
            children: [],
            selfClosing: false,
          } as unknown as GenericRenderNode,
          context,
          builder,
          undefined,
        )
      : domStaticNode(node, context, builder, undefined);
  return {
    create: `(document) => { ${builder.statements.join(" ")} return { nodes: [${roots.join(", ")}], parts: [${builder.parts.join(", ")}] }; }`,
    values: builder.values,
    partDefinitions: [],
    hot: builder.values.length === 0 && builder.parts.length === 0,
  };
}
