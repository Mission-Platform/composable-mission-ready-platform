/**
 * Generic render node → tagged-template lowering for the native Web-Components
 * target.
 *
 * Walks the neutral component's `GenericRenderNode` tree (never a TypeScript
 * AST, and never the raw module text) and produces a `html\`…\`` tagged-template
 * expression in the lit-html template dialect interpreted at runtime by
 * `@mission-platform/forge/web-components`:
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
  SourceBackedExpression,
} from "@mission-platform/forge-plugin-api";

/** Neutral (React-style) attribute names mapped to their DOM name for lit-html. */
const ATTRIBUTE_ALIASES: Readonly<Record<string, string>> = {
  className: "class",
  htmlFor: "for",
};

/** DOM attributes bound as element **properties** (`.prop=`) rather than attributes. */
const PROPERTY_BOUND = new Set(["value", "checked", "selected", "disabled"]);

/** The neutral marker component whose content is injected as raw HTML. */
const HTML_CONTENT_TAG = "HtmlContent";

/** Context threaded through the recursive template build. */
export interface TemplateContext {
  /** The element-instance scope embedded expressions are rewritten against. */
  readonly scope: ElementScope;
  /** Sibling component folder bases, so `<ForgeThing/>` maps to a custom-element tag. */
  readonly componentFolders: ReadonlySet<string>;
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

/** The nested render roots a source-backed expression carries, if any. */
function nestedOf(
  value: { readonly nested?: readonly GenericRenderNode[] } | undefined,
): readonly GenericRenderNode[] {
  return value?.nested ?? [];
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
      `html\`${renderNodeToTemplate(node, context)}\``,
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
function lowerExpression(
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

/** Emit an element's opening tag with its lit-html attribute/event/property bindings. */
function openTag(
  name: string,
  attributes: readonly GenericAttribute[],
  context: TemplateContext,
  selfClosing: boolean,
): string {
  const parts: string[] = [];
  for (const attribute of attributes) {
    // Spread props are not expressible as a single lit binding; skip (best effort).
    if (attribute.kind === "jsx-spread-attribute") {
      continue;
    }
    // Stage-1 static marker — never leak into lit-html output.
    if (attribute.name === MP_STATIC_ATTR) {
      continue;
    }
    const { value } = attribute;
    // Event handler: `onClick` → `@click`.
    if (
      /^on[A-Z]/.test(attribute.name) &&
      value?.kind === "expression" &&
      value.expression !== undefined
    ) {
      const hole = templateHole(value.expression, nestedOf(value), context);
      parts.push(`@${attribute.name.slice(2).toLowerCase()}=\${${hole}}`);
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

/** Lower a `<HtmlContent html={…} as="section" />` marker to an `unsafeHtml` hole. */
function htmlContentToTemplate(
  node: GenericRenderNode,
  context: TemplateContext,
): string {
  let host = "div";
  let content = '""';
  const hostAttributes: GenericAttribute[] = [];
  for (const attribute of node.attributes) {
    if (attribute.kind === "jsx-spread-attribute") {
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
  return `${openTag(host, hostAttributes, context, false)}\${unsafeHtml(${content})}</${host}>`;
}

/** Lower a single render child (nested node, literal text, or `{…}` interpolation). */
function childToTemplate(
  child: GenericRenderChild,
  context: TemplateContext,
): string {
  if (child.kind === "render-node") {
    return renderNodeToTemplate(child, context);
  }
  if (child.kind === "text") {
    const text = child.text.replace(/\s+/g, " ");
    if (text.trim().length > 0) {
      return text;
    }
    return child.text.includes("\n") ? "" : text;
  }
  const hole = templateHole(child.expression, child.nested, context);
  return hole.length === 0 ? "" : `\${${hole}}`;
}

/** Build the lit-html template string for a generic render node. */
export function renderNodeToTemplate(
  node: GenericRenderNode,
  context: TemplateContext,
): string {
  const children = node.children
    .map((child) => childToTemplate(child, context))
    .join("");
  if (node.tagKind === "fragment") {
    return children;
  }
  if (node.tag === HTML_CONTENT_TAG) {
    return htmlContentToTemplate(node, context);
  }
  const name = tagNameOf(node);
  if (node.selfClosing) {
    return openTag(name, node.attributes, context, true);
  }
  return `${openTag(name, node.attributes, context, false)}${children}</${name}>`;
}
