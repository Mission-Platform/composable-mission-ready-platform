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

function domProperties(
  attributes: readonly GenericAttribute[],
  context: TemplateContext,
): string {
  const entries: string[] = [];
  for (const attribute of attributes) {
    if (attribute.kind === "jsx-spread-attribute") {
      if (attribute.expression !== undefined) {
        entries.push(
          `...${rewriteExpressionText(attribute.expression.text, context.scope)}`,
        );
      }
      continue;
    }
    if (attribute.name === MP_STATIC_ATTR) {
      continue;
    }
    const name = ATTRIBUTE_ALIASES[attribute.name] ?? attribute.name;
    const value = attribute.value;
    if (/^on[A-Z]/u.test(attribute.name) && value?.expression !== undefined) {
      entries.push(
        `${JSON.stringify(`@${eventNameOf(attribute.name)}`)}: ${domValue(value.expression.text, nestedOf(value), context)}`,
      );
    } else if (value === undefined) {
      entries.push(`${JSON.stringify(`?${name}`)}: true`);
    } else if (value.kind === "string") {
      entries.push(
        `${JSON.stringify(`~${name}`)}: ${JSON.stringify(value.value)}`,
      );
    } else if (value.expression !== undefined) {
      const prefix =
        attribute.name === "ref" || name === "ref"
          ? ""
          : PROPERTY_BOUND.has(name) ||
              attribute.name === "className" ||
              attribute.name === "htmlFor"
            ? "."
            : "~";
      entries.push(
        `${JSON.stringify(`${prefix}${name}`)}: ${domValue(value.expression.text, nestedOf(value), context)}`,
      );
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

function domNodeExpression(
  node: GenericRenderNode,
  context: TemplateContext,
): string {
  const childContext =
    node.tagKind === "component" &&
    node.tag !== "Slot" &&
    node.tag !== HTML_CONTENT_TAG &&
    node.tag !== TELEPORT_TAG
      ? { ...context, slotOwnerDepth: (context.slotOwnerDepth ?? 0) + 1 }
      : context;
  if (node.tagKind === "fragment" || node.tag === TELEPORT_TAG) {
    return `[${node.children
      .map((child) => domChildExpression(child, childContext))
      .filter((value): value is string => value !== undefined)
      .join(", ")}]`;
  }
  if (node.tag === SUSPENSE_TAG) {
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
  if (node.tag === HTML_CONTENT_TAG) {
    let host = "div";
    let content = '""';
    const attrs: GenericAttribute[] = [];
    for (const attribute of node.attributes) {
      if (attribute.name === "as" && attribute.value?.kind === "string") {
        host = attribute.value.value;
      } else if (
        attribute.name === "html" &&
        attribute.value?.expression !== undefined
      ) {
        content = `unsafeHtml(${domValue(attribute.value.expression.text, nestedOf(attribute.value), childContext)})`;
      } else if (attribute.name !== "html" && attribute.name !== "as") {
        attrs.push(attribute);
      }
    }
    return `dynamicElement(${JSON.stringify(host)}, ${domProperties(attrs, childContext)}, ${content})`;
  }
  if (node.tag === "Slot") {
    const name = staticSlotName(node);
    const attrs: GenericAttribute[] =
      name === undefined
        ? [...node.attributes]
        : node.attributes.filter((attribute) => attribute.name !== "name");
    if (name !== undefined && name !== "default") {
      attrs.push({
        kind: "jsx-attribute",
        name: "name",
        value: { kind: "string", value: name },
      } as GenericAttribute);
    }
    const properties = domProperties(attrs, childContext);
    if ((context.slotOwnerDepth ?? 0) > 0) {
      const props = context.scope.propsParameterName;
      const content =
        props === undefined
          ? "undefined"
          : rewriteExpressionText(`${props}.children`, context.scope);
      const markerProperties =
        properties === "{}"
          ? `{ "?data-mp-forge-slot": true, "?data-mp-forge-nested": true, ".content": ${content} }`
          : `{ "?data-mp-forge-slot": true, "?data-mp-forge-nested": true, ${properties.slice(1, -1)}, ".content": ${content} }`;
      return `dynamicElement("forge-slot", ${markerProperties}, ${node.children
        .map((child) => domChildExpression(child, childContext))
        .filter((value): value is string => value !== undefined)
        .join(", ")})`;
    }
    return `dynamicElement("slot", ${properties}, ${node.children
      .map((child) => domChildExpression(child, childContext))
      .filter((value): value is string => value !== undefined)
      .join(", ")})`;
  }
  if (node.tagKind === "dynamic") {
    const tag =
      typeof node.tag === "string"
        ? JSON.stringify(node.tag)
        : rewriteExpressionText(node.tag.text, childContext.scope);
    return `dynamicElement(${tag}, ${domProperties(node.attributes, childContext)}, ${node.children
      .map((child) => domChildExpression(child, childContext))
      .filter((value): value is string => value !== undefined)
      .join(", ")})`;
  }
  const tagText = typeof node.tag === "string" ? node.tag : node.tag.text;
  if (tagText === "IconSpriteProvider") {
    return `dynamicElement(IconSpriteProvider, ${domProperties(node.attributes, childContext)}, ${node.children
      .map((child) => domChildExpression(child, childContext))
      .filter((value): value is string => value !== undefined)
      .join(", ")})`;
  }
  const host = componentHostOf(node, childContext);
  const name =
    host?.invocation === "is-attribute"
      ? (host.baseTag ?? tagNameOf(node))
      : tagNameOf(node);
  return `dynamicElement(${JSON.stringify(name)}, ${domProperties(domAttributes(node, host), childContext)}, ${node.children
    .map((child) => domChildExpression(child, childContext))
    .filter((value): value is string => value !== undefined)
    .join(", ")})`;
}

function domStaticNode(
  node: GenericRenderNode,
  context: TemplateContext,
  builder: DomTemplateBuilder,
  parent: string | undefined,
): string[] {
  if (node.tagKind === "fragment" || node.tag === TELEPORT_TAG) {
    return node.children.flatMap((child) =>
      domStaticChild(child, context, builder, parent),
    );
  }
  if (
    node.tag === "Slot" ||
    node.tag === HTML_CONTENT_TAG ||
    node.tag === SUSPENSE_TAG ||
    node.tagKind === "dynamic"
  ) {
    const value = builder.values.push(domNodeExpression(node, context)) - 1;
    const id = builder.nodeId++;
    const anchor = `__mpAnchor${id}`;
    builder.statements.push(
      `const ${anchor} = document.createComment("mp:${id}");`,
    );
    if (parent !== undefined)
      builder.statements.push(`${parent}.append(${anchor});`);
    builder.parts.push(`{ kind: "node", id: ${value}, start: ${anchor} }`);
    // Root-level dynamic child/content must be present in the returned blueprint
    // nodes so the renderer can insert the `end` anchor and mount updates.
    return parent === undefined ? [anchor] : [];
  }
  const host = componentHostOf(node, context);
  const tag =
    host?.invocation === "is-attribute"
      ? (host.baseTag ?? tagNameOf(node))
      : tagNameOf(node);
  const id = builder.nodeId++;
  const variable = `__mpNode${id}`;
  const creationOptions =
    host?.invocation === "is-attribute"
      ? `, { is: ${JSON.stringify(host.tagName)} }`
      : "";
  builder.statements.push(
    `const ${variable} = document.createElement(${JSON.stringify(tag)}${creationOptions});`,
  );
  if (parent !== undefined)
    builder.statements.push(`${parent}.append(${variable});`);
  for (const attribute of domAttributes(node, host)) {
    if (attribute.kind === "jsx-spread-attribute") {
      if (attribute.expression !== undefined) {
        const valueId =
          builder.values.push(
            rewriteExpressionText(attribute.expression.text, context.scope),
          ) - 1;
        builder.parts.push(
          `{ kind: "spread", id: ${valueId}, element: ${variable} }`,
        );
      }
      continue;
    }
    if (attribute.name === MP_STATIC_ATTR) continue;
    const name = ATTRIBUTE_ALIASES[attribute.name] ?? attribute.name;
    const value = attribute.value;
    if (value?.kind === "string") {
      builder.statements.push(
        `${variable}.setAttribute(${JSON.stringify(name)}, ${JSON.stringify(value.value)});`,
      );
      continue;
    }
    if (value === undefined) {
      builder.statements.push(
        `${variable}.setAttribute(${JSON.stringify(name)}, "");`,
      );
      continue;
    }
    if (value.expression !== undefined) {
      const valueId =
        builder.values.push(
          domValue(value.expression.text, nestedOf(value), context),
        ) - 1;
      const prefix = /^on[A-Z]/u.test(attribute.name)
        ? "@"
        : attribute.name === "ref"
          ? ""
          : node.tagKind === "component" ||
              (node.tagKind === "element" &&
                (tag.includes("-") || PROPERTY_BOUND.has(name)))
            ? "."
            : "";
      builder.parts.push(
        `{ kind: "attr", id: ${valueId}, element: ${variable}, prefix: ${JSON.stringify(prefix)}, name: ${JSON.stringify(/^on[A-Z]/u.test(attribute.name) ? eventNameOf(attribute.name) : name)} }`,
      );
    }
  }
  const childContext =
    node.tagKind === "component" && node.tag !== "Slot"
      ? { ...context, slotOwnerDepth: (context.slotOwnerDepth ?? 0) + 1 }
      : context;
  for (const child of node.children)
    domStaticChild(child, childContext, builder, variable);
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
          } as GenericRenderNode,
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
