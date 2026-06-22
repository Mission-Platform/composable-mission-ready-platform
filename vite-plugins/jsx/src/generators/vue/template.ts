/**
 * JSX/`h()` → Vue `<template>` conversion for the Vue emitter (the "hybrid"
 * path).
 *
 * A neutral component's `return` expression is a single tree built from JSX
 * elements and/or `h(tag, props, …children)` factory calls. For components
 * whose body is a flat list of **scalar** derived `const`s plus that single
 * return, this module rewrites the tree into native Vue template markup:
 *
 * - intrinsic / component elements → the same element/component tags,
 * - a dynamic `h(tag, …)` first argument → `<component :is="tag">`,
 * - `class`/`className` → static `class` or `:class`, `style` objects → `:style`,
 *   `on<Event>` → `@<event>`, `ref` → a template `ref`, every other dynamic
 *   attribute → `:name`,
 * - `properties.children`, a spread of the normalised child list, and `<Slot>`
 *   markers → `<slot>` (named/scoped where declared),
 * - a `cond ? <a/> : <b/>` (or `cond && <a/>`) child → `v-if` / `v-else`,
 * - a derived scalar `const` → a reactive `computed(…)` (the template
 *   auto-unwraps it, so it stays reactive to prop changes).
 *
 * Anything outside that shape — node-valued local consts, `.map()`/`.flatMap()`
 * with statement bodies, prop spreads, etc. — throws {@link UnsupportedTemplate}
 * so the caller can fall back to the `<script setup>` render-closure output. The
 * complex layout components (`BaseTable`, `BaseDrawer`, `BaseList`, …) take that
 * fallback; the single-tree primitives get real template markup.
 */
import ts from 'typescript';

import {
  CLASS_NAMES_ATTRIBUTE,
  hasSlottedChildren,
  isDynamicElement,
  isHasSlotCall,
  isSlotElement,
  partitionSlottedChildren,
  printNode,
  readHasSlotName,
  readSlotName,
  readSlotScope,
  type RewriteScope,
  slotFallbackChildren,
} from '../../compiler/ast.js';

import { rewrite } from './shared.js';

/** Thrown when a component's body cannot be expressed as native Vue template markup. */
export class UnsupportedTemplate extends Error {}

/** The result of a successful {@link buildVueTemplate} conversion. */
export interface VueTemplate {
  /** The inner markup of the generated `<template>` block. */
  markup: string;
  /** `const … = computed(() => …);` / `const … = …;` lines for the derived consts. */
  declarationLines: string[];
  /** Whether the declarations need `computed` imported from `vue`. */
  usesComputed: boolean;
}

const pad = (depth: number): string => '  '.repeat(depth);

/**
 * HTML-entity-escape a template expression so it can sit inside a double-quoted
 * attribute (`:bind`/`@event`/`v-if`/`:is`) or a `{{ }}` interpolation. The
 * TypeScript printer preserves the source's (single-quoted) string literals, and
 * an expression can contain `<`, `>` or `&`; Vue decodes the entities back when
 * it parses the binding, so the JS expression is recovered intact.
 */
function escapeExpr(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

/** Whether an expression's subtree builds framework nodes (JSX, `h(…)`, or a `.map`/`.flatMap`). */
function producesNodes(node: ts.Node): boolean {
  let found = false;
  const visit = (current: ts.Node): void => {
    if (found) {
      return;
    }
    if (ts.isJsxElement(current) || ts.isJsxSelfClosingElement(current) || ts.isJsxFragment(current)) {
      found = true;
      return;
    }
    if (ts.isCallExpression(current)) {
      if (ts.isIdentifier(current.expression) && current.expression.text === 'h') {
        found = true;
        return;
      }
      if (
        ts.isPropertyAccessExpression(current.expression) &&
        (current.expression.name.text === 'map' || current.expression.name.text === 'flatMap')
      ) {
        found = true;
        return;
      }
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  return found;
}

/** A transformer collapsing `styles['x']` / `styles[`x`]` reads to the bare key expression. */
function collapseStyles(styleModuleNames: Set<string>): ts.TransformerFactory<ts.Node> {
  return (context) => {
    const visit = (node: ts.Node): ts.Node => {
      if (
        ts.isElementAccessExpression(node) &&
        ts.isIdentifier(node.expression) &&
        styleModuleNames.has(node.expression.text)
      ) {
        return ts.visitNode(node.argumentExpression, visit) as ts.Expression;
      }
      return ts.visitEachChild(node, visit, context);
    };
    return (node) => ts.visitNode(node, visit) as ts.Node;
  };
}

/**
 * A transformer rewriting the neutral `hasSlot('x')` presence marker to Vue's
 * template-global `$slots.x` read (`$slots.default` for the default slot), so a
 * `hasSlot(…)` condition becomes a native `v-if="$slots.x"`.
 */
function rewriteHasSlot(): ts.TransformerFactory<ts.Node> {
  return (context) => {
    const { factory } = context;
    const visit = (node: ts.Node): ts.Node => {
      if (isHasSlotCall(node)) {
        return factory.createPropertyAccessExpression(
          factory.createIdentifier('$slots'),
          readHasSlotName(node) ?? 'default',
        );
      }
      return ts.visitEachChild(node, visit, context);
    };
    return (node) => ts.visitNode(node, visit) as ts.Node;
  };
}

/**
 * The state shared across the recursive markup walk: how to print template
 * expressions (with CSS-Module reads collapsed), the props parameter name, and
 * the names of the dropped child-normalisation consts whose spread becomes the
 * default `<slot>`.
 */
interface Context {
  sourceFile: ts.SourceFile;
  styleModuleNames: Set<string>;
  propsParamName: string;
  slotSourceNames: Set<string>;
  /** Prop names whose declared type holds framework nodes (`MpChild`, `MpElement`, …). */
  nodeTypedProps: Set<string>;
}

/** Print a template expression, collapsing CSS-Module reads but leaving every identifier bare. */
function templateExpr(expr: ts.Expression, context: Context): string {
  const result = ts.transform(expr, [collapseStyles(context.styleModuleNames), rewriteHasSlot()]);
  const text = printNode(result.transformed[0] as ts.Expression, context.sourceFile);
  result.dispose();
  return text;
}

/** Collapse a single expression, returning a string literal's text when it reduces to one. */
function staticText(expr: ts.Expression, context: Context): string | undefined {
  const result = ts.transform(expr, [collapseStyles(context.styleModuleNames)]);
  const collapsed = result.transformed[0] as ts.Expression;
  const text =
    ts.isStringLiteral(collapsed) || ts.isNoSubstitutionTemplateLiteral(collapsed) ? collapsed.text : undefined;
  result.dispose();
  return text;
}

/** The normalised value of an attribute. */
type AttrValue = { kind: 'none' } | { kind: 'static'; text: string } | { kind: 'expr'; expr: ts.Expression };

interface Attr {
  name: string;
  value: AttrValue;
}

/** Read a JSX attribute's value (string literal → static, `{expr}` → expression, bare → none). */
function jsxAttrValue(attribute: ts.JsxAttribute, context: Context): AttrValue {
  const initializer = attribute.initializer;
  if (initializer === undefined) {
    return { kind: 'none' };
  }
  if (ts.isStringLiteral(initializer)) {
    return { kind: 'static', text: initializer.text };
  }
  if (ts.isJsxExpression(initializer) && initializer.expression !== undefined) {
    const text = staticText(initializer.expression, context);
    return text === undefined ? { kind: 'expr', expr: initializer.expression } : { kind: 'static', text };
  }
  throw new UnsupportedTemplate('unsupported JSX attribute initializer');
}

/** Read an `h(…)` props-object value (string literal → static, otherwise an expression). */
function objectAttrValue(expr: ts.Expression, context: Context): AttrValue {
  const text = staticText(expr, context);
  return text === undefined ? { kind: 'expr', expr } : { kind: 'static', text };
}

/** The attribute name carried by a JSX attribute or an `h(…)` object key. */
function nameText(node: ts.Identifier | ts.JsxNamespacedName | ts.PropertyName, sourceFile: ts.SourceFile): string {
  if (ts.isIdentifier(node) || ts.isPrivateIdentifier(node)) {
    return node.text;
  }
  if (ts.isStringLiteral(node) || ts.isNumericLiteral(node)) {
    return node.text;
  }
  return node.getText(sourceFile);
}

/** Collect the attributes of a JSX opening/self-closing element. */
function jsxAttributes(attributes: ts.JsxAttributes, context: Context): Attr[] {
  const result: Attr[] = [];
  for (const property of attributes.properties) {
    if (ts.isJsxSpreadAttribute(property)) {
      throw new UnsupportedTemplate('JSX spread attribute');
    }
    result.push({ name: nameText(property.name, context.sourceFile), value: jsxAttrValue(property, context) });
  }
  return result;
}

/** Collect the attributes from an `h(…)` props object literal. */
function objectAttributes(object: ts.ObjectLiteralExpression, context: Context): Attr[] {
  const result: Attr[] = [];
  for (const property of object.properties) {
    if (ts.isPropertyAssignment(property)) {
      if (ts.isComputedPropertyName(property.name)) {
        throw new UnsupportedTemplate('computed prop key');
      }
      result.push({
        name: nameText(property.name, context.sourceFile),
        value: objectAttrValue(property.initializer, context),
      });
      continue;
    }
    if (ts.isShorthandPropertyAssignment(property)) {
      result.push({ name: property.name.text, value: { kind: 'expr', expr: property.name } });
      continue;
    }
    throw new UnsupportedTemplate('prop spread / accessor');
  }
  return result;
}

/** An element's parsed shape, normalised across JSX elements and `h(…)` calls. */
interface ElementIR {
  tag: string;
  /** The `:is` expression text when the element renders a dynamic component. */
  dynamicIs?: string;
  attrs: Attr[];
  children: ts.Node[];
}

/** Parse a `<Dynamic is={…} …>` element into the common {@link ElementIR} (`<component :is>`). */
function parseDynamicElement(node: ts.JsxSelfClosingElement | ts.JsxElement, context: Context): ElementIR {
  const opening = ts.isJsxSelfClosingElement(node) ? node : node.openingElement;
  let dynamicIs = 'undefined';
  const attrs: Attr[] = [];
  for (const property of opening.attributes.properties) {
    if (ts.isJsxSpreadAttribute(property)) {
      throw new UnsupportedTemplate('JSX spread attribute');
    }
    const name = nameText(property.name, context.sourceFile);
    const value = jsxAttrValue(property, context);
    if (name === 'is') {
      if (value.kind === 'expr') {
        dynamicIs = templateExpr(value.expr, context);
      } else if (value.kind === 'static') {
        dynamicIs = `'${value.text}'`;
      }
      continue;
    }
    attrs.push({ name, value });
  }
  return { tag: 'component', dynamicIs, attrs, children: ts.isJsxElement(node) ? [...node.children] : [] };
}

/** Parse a JSX element / `h(…)` call into the common {@link ElementIR}. */
function parseElement(expr: ts.Expression, context: Context): ElementIR {
  if (isDynamicElement(expr)) {
    return parseDynamicElement(expr, context);
  }
  if (ts.isJsxSelfClosingElement(expr)) {
    return {
      tag: expr.tagName.getText(context.sourceFile),
      attrs: jsxAttributes(expr.attributes, context),
      children: [],
    };
  }
  if (ts.isJsxElement(expr)) {
    return {
      tag: expr.openingElement.tagName.getText(context.sourceFile),
      attrs: jsxAttributes(expr.openingElement.attributes, context),
      children: [...expr.children],
    };
  }
  if (ts.isCallExpression(expr) && ts.isIdentifier(expr.expression) && expr.expression.text === 'h') {
    const [tagArgument, propsArgument, ...childArguments] = expr.arguments;
    if (tagArgument === undefined) {
      throw new UnsupportedTemplate('h() without a tag');
    }
    let tag: string;
    let dynamicIs: string | undefined;
    if (ts.isStringLiteral(tagArgument)) {
      tag = tagArgument.text;
    } else {
      tag = 'component';
      dynamicIs = templateExpr(tagArgument, context);
    }
    let attrs: Attr[] = [];
    if (
      propsArgument !== undefined &&
      !(propsArgument.kind === ts.SyntaxKind.NullKeyword) &&
      !(ts.isIdentifier(propsArgument) && propsArgument.text === 'undefined')
    ) {
      if (!ts.isObjectLiteralExpression(propsArgument)) {
        throw new UnsupportedTemplate('non-literal h() props');
      }
      attrs = objectAttributes(propsArgument, context);
    }
    return { tag, dynamicIs, attrs, children: childArguments };
  }
  throw new UnsupportedTemplate('not an element expression');
}

/** Render one attribute as Vue template text (`class`, `@event`, `ref`, `:bind`, or static). */
function emitAttr(attr: Attr, context: Context, isNativeElement: boolean): string | undefined {
  const { name, value } = attr;

  // The `slot="…"` marker is consumed by named-slot routing (it becomes a
  // `<template #name>` block), never emitted as a real attribute.
  if (name === 'slot') {
    return undefined;
  }

  // `on<Event>` → `@<event>` listener. Vue hyphenates a DOM listener's event
  // name (`@dragOver` → the dead `drag-over`), and native DOM event names are
  // all-lowercase (`dragover`), so a native element's multi-word event is fully
  // lowercased; a component's listener keeps its camelCase form to match the
  // child's emit names.
  if (/^on[A-Z]/.test(name)) {
    if (value.kind !== 'expr') {
      return undefined;
    }
    const event = isNativeElement ? name.slice(2).toLowerCase() : name.charAt(2).toLowerCase() + name.slice(3);
    return `@${event}="${escapeExpr(templateExpr(value.expr, context))}"`;
  }

  // `ref={identifier}` → a template ref binding.
  if (name === 'ref') {
    if (value.kind === 'expr' && ts.isIdentifier(value.expr)) {
      return `ref="${value.expr.text}"`;
    }
    throw new UnsupportedTemplate('non-identifier ref');
  }

  // `className` (a stray React-style alias) and the neutral `classNames={…}`
  // attribute both map onto Vue's native `class` binding — Vue understands the
  // array/object forms directly, so the (CSS-Module-collapsed) value passes
  // straight through as `:class="…"` (or a static `class="…"` when it reduces
  // to a literal).
  const outName = name === 'className' || name === CLASS_NAMES_ATTRIBUTE ? 'class' : name;
  if (value.kind === 'none') {
    return outName;
  }
  if (value.kind === 'static') {
    return `${outName}="${escapeExpr(value.text)}"`;
  }
  return `:${outName}="${escapeExpr(templateExpr(value.expr, context))}"`;
}

/** Render a `<Slot>` marker / `properties.children` as a Vue `<slot>` (named/scoped/fallback). */
function emitSlot(node: ts.JsxSelfClosingElement | ts.JsxElement | undefined, depth: number, context: Context): string {
  const name = node === undefined ? undefined : readSlotName(node);
  const attrs: string[] = [];
  if (name !== undefined) {
    attrs.push(`name="${name}"`);
  }
  if (node !== undefined) {
    const scope = readSlotScope(ts.factory, node, (current) => current);
    if (scope !== undefined) {
      for (const property of scope.properties) {
        if (ts.isPropertyAssignment(property)) {
          attrs.push(
            `:${nameText(property.name, context.sourceFile)}="${escapeExpr(templateExpr(property.initializer, context))}"`,
          );
        }
      }
    }
  }
  const open = `slot${attrs.length > 0 ? ` ${attrs.join(' ')}` : ''}`;
  const fallback = node === undefined ? [] : slotFallbackChildren(node);
  if (fallback.length === 0) {
    return `${pad(depth)}<${open} />`;
  }
  const inner = emitChildren(fallback, depth + 1, context);
  return `${pad(depth)}<${open}>\n${inner}\n${pad(depth)}</slot>`;
}

/** Whether an expression renders as an element (JSX element or `h(…)` call). */
function isElementLike(expr: ts.Expression): boolean {
  return (
    ts.isJsxElement(expr) ||
    ts.isJsxSelfClosingElement(expr) ||
    isSlotElement(expr) ||
    (ts.isParenthesizedExpression(expr) && isElementLike(expr.expression)) ||
    (ts.isCallExpression(expr) && ts.isIdentifier(expr.expression) && expr.expression.text === 'h')
  );
}

/** Whether an expression is the `undefined` / `null` "render nothing" branch of a conditional. */
function isNothing(expr: ts.Expression): boolean {
  return (
    (ts.isIdentifier(expr) && expr.text === 'undefined') ||
    expr.kind === ts.SyntaxKind.NullKeyword ||
    (ts.isParenthesizedExpression(expr) && isNothing(expr.expression))
  );
}

/** Unwrap redundant parentheses around an expression. */
function unwrap(expr: ts.Expression): ts.Expression {
  return ts.isParenthesizedExpression(expr) ? unwrap(expr.expression) : expr;
}

/** Render a `cond ? <a/> : <b/>` expression to `v-if` / `v-else` elements. */
function emitConditional(conditional: ts.ConditionalExpression, depth: number, context: Context): string {
  const condition = templateExpr(conditional.condition, context);
  const whenTrue = unwrap(conditional.whenTrue);
  const whenFalse = unwrap(conditional.whenFalse);

  if (isElementLike(whenTrue) && isNothing(whenFalse)) {
    return emitElement(whenTrue, depth, context, `v-if="${escapeExpr(condition)}"`);
  }
  if (isNothing(whenTrue) && isElementLike(whenFalse)) {
    return emitElement(whenFalse, depth, context, `v-if="!(${escapeExpr(condition)})"`);
  }
  if (isElementLike(whenTrue) && isElementLike(whenFalse)) {
    return `${emitElement(whenTrue, depth, context, `v-if="${escapeExpr(condition)}"`)}\n${emitElement(whenFalse, depth, context, 'v-else')}`;
  }
  // Neither branch is an element → a plain text interpolation.
  if (!isElementLike(whenTrue) && !isElementLike(whenFalse)) {
    return `${pad(depth)}{{ ${escapeExpr(templateExpr(conditional, context))} }}`;
  }
  throw new UnsupportedTemplate('mixed conditional branches');
}

/** Render a `cond && <a/>` expression to an element guarded by `v-if`. */
function emitLogicalAnd(expression: ts.BinaryExpression, depth: number, context: Context): string {
  const right = unwrap(expression.right);
  if (!isElementLike(right)) {
    return `${pad(depth)}{{ ${escapeExpr(templateExpr(expression, context))} }}`;
  }
  return emitElement(right, depth, context, `v-if="${escapeExpr(templateExpr(expression.left, context))}"`);
}

/**
 * Render a single element / `h(…)` call, with an optional leading `directive`
 * (e.g. `v-if`/`v-else`) and an optional `trailingAttr` appended after every
 * explicit attribute (used to forward `v-bind="$attrs"` onto the component's
 * root element so consumer-supplied fall-through attributes — `class`/`style`/
 * `id`/`data-*`/listeners — still reach the host, mirroring Vue's default
 * attribute inheritance which the generated `inheritAttrs: false` SFCs opt out
 * of). Placing it last matches the precedence of default inheritance.
 */
function emitElement(
  expr: ts.Expression,
  depth: number,
  context: Context,
  directive?: string,
  trailingAttr?: string,
): string {
  const ir = parseElement(unwrap(expr), context);
  const attrParts: string[] = [];
  if (directive !== undefined) {
    attrParts.push(directive);
  }
  if (ir.dynamicIs !== undefined) {
    attrParts.push(`:is="${escapeExpr(ir.dynamicIs)}"`);
  }
  // A native (intrinsic) element has a lowercase tag and is not a dynamic
  // `<component :is>`; its DOM event listeners need the lowercased event name.
  const isNativeElement = ir.dynamicIs === undefined && /^[a-z]/.test(ir.tag);
  for (const attr of ir.attrs) {
    const rendered = emitAttr(attr, context, isNativeElement);
    if (rendered !== undefined) {
      attrParts.push(rendered);
    }
  }
  if (trailingAttr !== undefined) {
    attrParts.push(trailingAttr);
  }
  const open = `${ir.tag}${attrParts.length > 0 ? ` ${attrParts.join(' ')}` : ''}`;

  // Named-slot **passing**: a component element whose children carry `slot="x"`
  // markers emits a `<template #x>` block per group (the default-slot children
  // go into `<template #default>`), so each routes to the child's matching slot.
  const jsxChildren = ir.children as ts.JsxChild[];
  if (/^[A-Z]/.test(ir.tag) && hasSlottedChildren(jsxChildren)) {
    const { defaultChildren, namedSlots } = partitionSlottedChildren(jsxChildren);
    const blocks: string[] = [];
    for (const [name, group] of namedSlots) {
      const body = emitChildren(group, depth + 2, context);
      blocks.push(`${pad(depth + 1)}<template #${name}>\n${body}\n${pad(depth + 1)}</template>`);
    }
    const defaultBody = emitChildren(defaultChildren, depth + 2, context);
    if (defaultBody !== '') {
      blocks.push(`${pad(depth + 1)}<template #default>\n${defaultBody}\n${pad(depth + 1)}</template>`);
    }
    return `${pad(depth)}<${open}>\n${blocks.join('\n')}\n${pad(depth)}</${ir.tag}>`;
  }

  const inner = emitChildren(ir.children, depth + 1, context);
  if (inner === '') {
    return `${pad(depth)}<${open} />`;
  }
  return `${pad(depth)}<${open}>\n${inner}\n${pad(depth)}</${ir.tag}>`;
}

/** Render an expression appearing in child position. */
function emitExpressionChild(expr: ts.Expression, depth: number, context: Context): string {
  const node = unwrap(expr);

  // `properties.children` → the default slot.
  if (
    ts.isPropertyAccessExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === context.propsParamName &&
    node.name.text === 'children'
  ) {
    return emitSlot(undefined, depth, context);
  }
  if (isSlotElement(node)) {
    return emitSlot(node, depth, context);
  }
  if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
    return emitElement(node, depth, context);
  }
  if (ts.isJsxFragment(node)) {
    return emitChildren([...node.children], depth, context);
  }
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'h') {
    return emitElement(node, depth, context);
  }
  if (ts.isConditionalExpression(node)) {
    return emitConditional(node, depth, context);
  }
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
    return emitLogicalAnd(node, depth, context);
  }
  if (
    ts.isSpreadElement(node) &&
    ts.isIdentifier(node.expression) &&
    context.slotSourceNames.has(node.expression.text)
  ) {
    return emitSlot(undefined, depth, context);
  }
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isNumericLiteral(node)) {
    return `${pad(depth)}${node.text}`;
  }
  // A node-typed prop rendered as a child (`{header}`, an `MpChild`) would be
  // stringified by an interpolation; fall back so it renders correctly.
  if (ts.isIdentifier(node) && context.nodeTypedProps.has(node.text)) {
    throw new UnsupportedTemplate('node-typed prop rendered as child');
  }
  if (
    ts.isPropertyAccessExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === context.propsParamName &&
    context.nodeTypedProps.has(node.name.text)
  ) {
    throw new UnsupportedTemplate('node-typed prop rendered as child');
  }
  // Any expression that builds nodes but isn't a structural form we handle
  // (e.g. `items.map(item => <li/>)`) must not become a text interpolation.
  if (producesNodes(node)) {
    throw new UnsupportedTemplate('unhandled node-producing child expression');
  }
  // Any other expression renders as a text interpolation.
  return `${pad(depth)}{{ ${escapeExpr(templateExpr(node, context))} }}`;
}

/** Render one child node (JSX child or `h(…)` argument). */
function emitChildNode(node: ts.Node, depth: number, context: Context): string {
  if (ts.isJsxText(node)) {
    const text = node.text.replaceAll(/\s+/g, ' ').trim();
    return text === '' ? '' : `${pad(depth)}${text}`;
  }
  if (ts.isJsxExpression(node)) {
    return node.expression === undefined ? '' : emitExpressionChild(node.expression, depth, context);
  }
  if (isSlotElement(node)) {
    return emitSlot(node, depth, context);
  }
  if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
    return emitElement(node as ts.Expression, depth, context);
  }
  if (ts.isJsxFragment(node)) {
    return emitChildren([...node.children], depth, context);
  }
  return emitExpressionChild(node as ts.Expression, depth, context);
}

/** Render a list of children, dropping empties. */
function emitChildren(children: readonly ts.Node[], depth: number, context: Context): string {
  return children
    .map((child) => emitChildNode(child, depth, context))
    .filter((line) => line !== '')
    .join('\n');
}

/** A single `const <name> = <init>;` derived statement, pre-classified. */
interface DerivedConst {
  name: string;
  declaration: ts.VariableDeclaration;
  /** A function-valued const (an event handler) stays a plain `const`, not a `computed`. */
  isHandler: boolean;
}

/**
 * Convert a component's derived statements + return expression into Vue template
 * markup plus the reactive `<script setup>` declarations, or throw
 * {@link UnsupportedTemplate} when the body falls outside the template-able shape.
 */
export function buildVueTemplate(
  renderStatements: readonly ts.Statement[],
  returnExpression: ts.Expression | undefined,
  scope: RewriteScope,
  sourceFile: ts.SourceFile,
  nodeTypedProps: Set<string>,
): VueTemplate {
  if (returnExpression === undefined) {
    throw new UnsupportedTemplate('no return expression');
  }

  // The names spread into the return's children as `...<name>` — the dropped
  // child-normalisation consts whose spread becomes the default `<slot>`.
  const slotSourceNames = new Set<string>();
  const returnRoot = unwrap(returnExpression);
  if (ts.isCallExpression(returnRoot) && ts.isIdentifier(returnRoot.expression) && returnRoot.expression.text === 'h') {
    for (const argument of returnRoot.arguments.slice(2)) {
      if (ts.isSpreadElement(argument) && ts.isIdentifier(argument.expression)) {
        slotSourceNames.add(argument.expression.text);
      }
    }
  }

  // Classify each derived statement; reject anything that is not a simple
  // `const <name> = <init>;` or that builds framework nodes.
  const derived: DerivedConst[] = [];
  for (const statement of renderStatements) {
    if (!ts.isVariableStatement(statement) || statement.declarationList.declarations.length !== 1) {
      throw new UnsupportedTemplate('non-const derived statement');
    }
    const declaration = statement.declarationList.declarations[0];
    if (!ts.isIdentifier(declaration.name) || declaration.initializer === undefined) {
      throw new UnsupportedTemplate('non-identifier / uninitialised const');
    }
    if (producesNodes(declaration.initializer)) {
      throw new UnsupportedTemplate('node-valued derived const');
    }
    const isHandler = ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer);
    derived.push({ name: declaration.name.text, declaration, isHandler });
  }

  // Drop the child-normalisation consts (the `...<name>` slot sources and the
  // `const children = properties.children;` they read from); everything else
  // is a kept declaration.
  const dropped = new Set<string>(slotSourceNames);
  for (const entry of derived) {
    const initializer = entry.declaration.initializer;
    if (
      initializer !== undefined &&
      ts.isPropertyAccessExpression(initializer) &&
      ts.isIdentifier(initializer.expression) &&
      initializer.expression.text === scope.propsParamName &&
      initializer.name.text === 'children'
    ) {
      dropped.add(entry.name);
    }
  }

  const kept = derived.filter((entry) => !dropped.has(entry.name));
  // Scalar derived consts become reactive `computed`s; references between them
  // must read `.value`, so add their names to the rewrite scope's memos.
  const scalarNames = kept.filter((entry) => !entry.isHandler).map((entry) => entry.name);
  const computedScope: RewriteScope = { ...scope, memoNames: new Set([...scope.memoNames, ...scalarNames]) };

  let usesComputed = false;
  const declarationLines = kept.map((entry) => {
    const body = rewrite(entry.declaration.initializer as ts.Expression, computedScope, sourceFile);
    if (entry.isHandler) {
      return `const ${entry.name} = ${body};`;
    }
    usesComputed = true;
    // Parenthesise the body so an object-literal initializer (`{ … }`) is an
    // expression, not an arrow-function block.
    return `const ${entry.name} = computed(() => (${body}));`;
  });

  const context: Context = {
    sourceFile,
    styleModuleNames: scope.styleModuleNames,
    propsParamName: scope.propsParamName,
    slotSourceNames,
    nodeTypedProps,
  };
  // Forward consumer fall-through attributes onto the component's root element.
  // The generated SFCs declare `inheritAttrs: false` (so multi-root / render-
  // closure components don't warn), which also disables Vue's *automatic* root
  // inheritance — so a single root element must opt back in explicitly with
  // `v-bind="$attrs"`, restoring the `class`/`style`/`id`/`data-*`/listener
  // fall-through the hand-authored `.vue` SFCs relied on. A `<Slot>`, fragment,
  // or conditional root has no single host to bind to and is left untouched.
  const rootIsSingleElement =
    (ts.isJsxElement(returnRoot) ||
      ts.isJsxSelfClosingElement(returnRoot) ||
      (ts.isCallExpression(returnRoot) &&
        ts.isIdentifier(returnRoot.expression) &&
        returnRoot.expression.text === 'h')) &&
    !isSlotElement(returnRoot);
  const markup = rootIsSingleElement
    ? emitElement(returnRoot, 1, context, undefined, 'v-bind="$attrs"')
    : emitChildNode(returnRoot, 1, context);

  return { markup, declarationLines, usesComputed };
}
