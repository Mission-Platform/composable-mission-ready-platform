/**
 * JSX/`h()` → Vue `<template>` conversion for the Vue emitter (the "hybrid"
 * path).
 *
 * A neutral component's `return` expression is a single tree built from JSX
 * elements and/or `h(tag, props, …children)` factory calls. For components
 * whose body is a flat list of derived `const`s plus that single return, this
 * module rewrites the tree into native Vue template markup:
 *
 * - intrinsic / component elements → the same element/component tags,
 * - a dynamic `h(tag, …)` first argument → `<component :is="tag">`,
 * - `class`/`className` → static `class` or `:class`, `style` objects → `:style`,
 *   `on<Event>` → `@<event>`, `ref` → a template `ref`, every other dynamic
 *   attribute → `:name`,
 * - `properties.children`, a spread of the normalised child list, and `<Slot>`
 *   markers (JSX `<Slot/>` or the `h(Slot, …)` call form) → `<slot>` (named/
 *   scoped where declared),
 * - a `cond ? <a/> : <b/>` (or `cond && <a/>`) child → `v-if` / `v-else`,
 * - an `items.map((item, index) => <li/>)` / `.flatMap(…)` child → a `v-for`
 *   element (the returned element's `key={…}` passing through as `:key`),
 * - a derived scalar `const` → a reactive `computed(…)` (the template
 *   auto-unwraps it, so it stays reactive to prop changes),
 * - a **node-valued** derived `const` (`const row = <span/>`, `const list =
 *   xs.map(…)`) → inlined **structurally** into the return tree at its use
 *   sites (a single element becomes that element; a `.map()` becomes a `v-for`).
 *
 * Anything still outside that shape — an imperative `.map()`/`.flatMap()` callback
 * (a body that is not leading `const`s plus a single returned element), a
 * non-`const` derived statement, prop spreads, etc. — throws
 * {@link UnsupportedTemplate}
 * so the caller can fall back to the `<script setup>` render-closure output.
 */
import ts from 'typescript';

import {
  CLASS_NAME_ATTRIBUTE,
  hasSlottedChildren,
  isDynamicElement,
  isHasSlotCall,
  isSlotElement,
  isSlotHCall,
  partitionSlottedChildren,
  printNode,
  readHasSlotName,
  readSlotHCallName,
  readSlotHCallScope,
  readSlotName,
  readSlotScope,
  type RewriteScope,
  slotFallbackChildren,
  slotHCallFallback,
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
 * Make a template expression safe to sit inside a double-quoted attribute
 * (`:bind`/`@event`/`v-if`/`:is`) or a `{{ }}` interpolation.
 *
 * Only the `"` that would close the surrounding attribute is escaped. `<`, `>`
 * and `&` are left **verbatim**: they are valid inside a quoted attribute value
 * / mustache and are exactly how Vue binding expressions are authored by hand
 * (`:disabled="a < b"`, `v-if="a && b"`). Crucially, `vue-tsc`
 * (`@vue/language-tools`) reads the binding's **raw** source text when it builds
 * the virtual TS for type-checking and does **not** decode HTML entities, so
 * escaping operators to `&lt;`/`&gt;`/`&amp;` makes it parse e.g. `index &lt; n`
 * as `index & lt ; n` and fail (TS1005/TS1003/TS1128). The TypeScript printer
 * emits string literals single-quoted, so a literal `"` effectively never
 * appears in the expression; the `&quot;` guard remains only for that edge.
 */
function escapeExpr(text: string): string {
  return text.replaceAll('"', '&quot;');
}

/** Find the body or initializer for a function or variable declared with `name` under `root`. */
function findDeclarationBody(name: string, root: ts.Node): ts.Node | undefined {
  let result: ts.Node | undefined;
  const visit = (current: ts.Node): void => {
    if (result !== undefined) {
      return;
    }
    if (ts.isFunctionDeclaration(current) && current.name?.text === name && current.body !== undefined) {
      result = current.body;
      return;
    }
    if (ts.isVariableDeclaration(current) && ts.isIdentifier(current.name) && current.name.text === name) {
      result = current.initializer;
      return;
    }
    ts.forEachChild(current, visit);
  };
  visit(root);
  return result;
}

/** Whether an expression's subtree builds framework nodes (JSX, `h(…)`, or a `.map`/`.flatMap`). */
function producesNodes(
  node: ts.Node,
  sourceFile?: ts.SourceFile,
  nodeTypedProps?: Set<string>,
  visited = new Set<string>(),
): boolean {
  const sf = sourceFile ?? (typeof node.getSourceFile === 'function' ? node.getSourceFile() : undefined);
  let found = false;

  const visit = (current: ts.Node): void => {
    if (found) {
      return;
    }
    if (nodeTypedProps !== undefined && nodeTypedProps.size > 0) {
      let propName: string | undefined;
      if (ts.isPropertyAccessExpression(current)) {
        propName = current.name.text;
      } else if (ts.isIdentifier(current)) {
        propName = current.text;
      }
      if (propName !== undefined && nodeTypedProps.has(propName)) {
        found = true;
        return;
      }
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
    if (ts.isIdentifier(current) && sf !== undefined) {
      const name = current.text;
      if (!visited.has(name)) {
        visited.add(name);
        const bodyNode = findDeclarationBody(name, sf);
        if (bodyNode !== undefined && producesNodes(bodyNode, sf, nodeTypedProps, visited)) {
          found = true;
          return;
        }
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
 * A transformer rewriting event-prop calls/references inside a **template
 * expression** to the component's declared emit — the template-path counterpart
 * of the render-closure reference rewriter. An inline handler that calls an
 * event prop (`@dblclick="() => properties.onRename?.(id)"`) becomes
 * `emit('rename', id)`, and a bare reference to an event prop becomes a
 * forwarding arrow `(event) => emit('load', event)`. `emit` is a setup binding,
 * so a template expression can reference it directly.
 */
function emitEvents(
  eventProps: Map<string, { eventName: string; paramNames: string[] }>,
  propsParamName: string,
): ts.TransformerFactory<ts.Node> {
  return (context) => {
    const { factory } = context;
    const emitCall = (eventName: string, args: ts.Expression[]): ts.Expression =>
      factory.createCallExpression(factory.createIdentifier('emit'), undefined, [
        factory.createStringLiteral(eventName),
        ...args,
      ]);
    const forwardingArrow = (eventName: string, paramNames: string[]): ts.Expression =>
      factory.createArrowFunction(
        undefined,
        undefined,
        paramNames.map((name) =>
          factory.createParameterDeclaration(undefined, undefined, factory.createIdentifier(name)),
        ),
        undefined,
        factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
        emitCall(
          eventName,
          paramNames.map((name) => factory.createIdentifier(name)),
        ),
      );
    // The event a call/reference targets, if any: `properties.on<Event>` or a
    // bare `on<Event>` (a destructured event prop is a bare identifier here).
    const eventFor = (expression: ts.Expression): { eventName: string; paramNames: string[] } | undefined => {
      if (
        ts.isPropertyAccessExpression(expression) &&
        ts.isIdentifier(expression.expression) &&
        expression.expression.text === propsParamName
      ) {
        return eventProps.get(expression.name.text);
      }
      if (ts.isIdentifier(expression)) {
        return eventProps.get(expression.text);
      }
      return undefined;
    };
    const visit = (node: ts.Node): ts.Node => {
      // A call of an event prop → `emit('<event>', …args)`. Only the arguments
      // recurse (the callee is consumed), so it is never mistaken for a reference.
      if (ts.isCallExpression(node)) {
        const event = eventFor(node.expression);
        if (event !== undefined) {
          return emitCall(
            event.eventName,
            node.arguments.map((argument) => ts.visitNode(argument, visit) as ts.Expression),
          );
        }
      }
      // A `properties.on<Event>` reference (not a call) → forwarding arrow.
      if (
        ts.isPropertyAccessExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === propsParamName &&
        eventProps.has(node.name.text)
      ) {
        const event = eventProps.get(node.name.text) as { eventName: string; paramNames: string[] };
        return forwardingArrow(event.eventName, event.paramNames);
      }
      return ts.visitEachChild(node, visit, context);
    };
    return (node) => ts.visitNode(node, visit) as ts.Node;
  };
}

/**
 * A transformer rewriting `useState` **setter calls** inside a template
 * expression to a direct assignment of the reactive state. An inline handler
 * `@click="() => setOpen(!open)"` becomes `open = !open` (Vue's template
 * compiler assigns through the exposed `ref`), and an updater form
 * `setOpen((previous) => !previous)` becomes `open = ((previous) => !previous)(open)`.
 * This is the template-path counterpart of the render-closure setter rewrite.
 */
function rewriteSetters(setterToState: Map<string, string>): ts.TransformerFactory<ts.Node> {
  return (context) => {
    const { factory } = context;
    const visit = (node: ts.Node): ts.Node => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && setterToState.has(node.expression.text)) {
        const stateName = setterToState.get(node.expression.text) as string;
        const target = factory.createIdentifier(stateName);
        const argument = node.arguments[0];
        let value: ts.Expression;
        if (argument !== undefined && (ts.isArrowFunction(argument) || ts.isFunctionExpression(argument))) {
          // `setState(updater)` → `state = updater(state)` (the previous value is
          // forwarded only when the updater declares a parameter for it).
          const forwardsPrevious = argument.parameters.length > 0;
          value = factory.createCallExpression(
            factory.createParenthesizedExpression(ts.visitNode(argument, visit) as ts.Expression),
            undefined,
            forwardsPrevious ? [factory.createIdentifier(stateName)] : [],
          );
        } else {
          value =
            argument === undefined
              ? factory.createIdentifier('undefined')
              : (ts.visitNode(argument, visit) as ts.Expression);
        }
        return factory.createBinaryExpression(target, factory.createToken(ts.SyntaxKind.EqualsToken), value);
      }
      return ts.visitEachChild(node, visit, context);
    };
    return (node) => ts.visitNode(node, visit) as ts.Node;
  };
}

/**
 * A transformer rewriting a **normalised-children const** read inside a template
 * expression to the default slot's rendered vnodes. A child-normalisation const
 * (`const childList = children === undefined ? [] : …`) is dropped as a
 * default-`<slot>` source, so a residual scalar read of it (`childList.length >
 * 0` deciding whether to render a wrapper) is rewritten to
 * `($slots.default?.() ?? [])`, whose `.length` faithfully counts the default
 * slot content. Child-position spreads/reads are handled earlier by `emitSlot`,
 * so only these expression-position reads reach here.
 */
function rewriteSlotSources(slotSourceNames: Set<string>): ts.TransformerFactory<ts.Node> {
  return (context) => {
    const { factory } = context;
    const slotArray = (): ts.Expression =>
      factory.createParenthesizedExpression(
        factory.createBinaryExpression(
          factory.createCallChain(
            factory.createPropertyAccessExpression(factory.createIdentifier('$slots'), 'default'),
            factory.createToken(ts.SyntaxKind.QuestionDotToken),
            undefined,
            [],
          ),
          factory.createToken(ts.SyntaxKind.QuestionQuestionToken),
          factory.createArrayLiteralExpression([]),
        ),
      );
    const visit = (node: ts.Node): ts.Node => {
      // Never rewrite the member name of `a.b` — only reference-position reads.
      if (ts.isPropertyAccessExpression(node)) {
        return factory.updatePropertyAccessExpression(
          node,
          ts.visitNode(node.expression, visit) as ts.Expression,
          node.name,
        );
      }
      if (ts.isIdentifier(node) && slotSourceNames.has(node.text)) {
        return slotArray();
      }
      return ts.visitEachChild(node, visit, context);
    };
    return (node) => ts.visitNode(node, visit) as ts.Node;
  };
}

/**
 * A transformer replacing a renamed destructuring alias with its **real** prop
 * name inside a template expression (`formatProperty` → `format`). In the
 * `<template>` a prop is referenced by its declared `defineProps` name, so the
 * source alias — which no longer exists as a binding — must be rewritten back.
 */
function rewritePropAliases(propAliases: Map<string, string>): ts.TransformerFactory<ts.Node> {
  return (context) => {
    const { factory } = context;
    const visit = (node: ts.Node): ts.Node => {
      // Never rewrite the member name of `a.b` — only reference-position reads.
      if (ts.isPropertyAccessExpression(node)) {
        return factory.updatePropertyAccessExpression(
          node,
          ts.visitNode(node.expression, visit) as ts.Expression,
          node.name,
        );
      }
      if (ts.isIdentifier(node) && propAliases.has(node.text)) {
        return factory.createIdentifier(propAliases.get(node.text) as string);
      }
      return ts.visitEachChild(node, visit, context);
    };
    return (node) => ts.visitNode(node, visit) as ts.Node;
  };
}

/**
 * A transformer rewriting a `<props>.children` read inside a template expression
 * to Vue's template-global `$slots.default` (children are rendered through the
 * default slot). A `properties.children ? … : …` condition becomes a native
 * `v-if="$slots.default"`.
 */
function rewritePropsChildren(propsParamName: string): ts.TransformerFactory<ts.Node> {
  return (context) => {
    const { factory } = context;
    const visit = (node: ts.Node): ts.Node => {
      if (
        ts.isPropertyAccessExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === propsParamName &&
        node.name.text === 'children'
      ) {
        return factory.createPropertyAccessExpression(factory.createIdentifier('$slots'), 'default');
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
        const slotName = readHasSlotName(node) ?? 'default';
        // A kebab slot name (`start-header`) must use bracket access — dot access
        // would mis-parse as a subtraction (`$slots.start-header`).
        return /^[A-Za-z_$][\w$]*$/.test(slotName)
          ? factory.createPropertyAccessExpression(factory.createIdentifier('$slots'), slotName)
          : factory.createElementAccessExpression(
              factory.createIdentifier('$slots'),
              // Single-quoted so the literal's quotes never collide with the
              // double-quoted `v-if="…"` attribute (no `&quot;` escaping needed).
              factory.createStringLiteral(slotName, true),
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
  /** Event props (`on<Event>`) → their emitted event + params, so inline template handlers can call `emit(...)`. */
  eventProps: Map<string, { eventName: string; paramNames: string[] }>;
  /** Renamed destructuring aliases → their real prop name (`formatProperty` → `format`). */
  propAliases: Map<string, string>;
  /** `useState` setter name → its state name, so inline template handlers assign the reactive state. */
  setterToState: Map<string, string>;
  /**
   * Scalar `const`s declared inside the current `.map(…)` callback (before its
   * returned element), inlined into every template expression printed while
   * walking that element — Vue `<template>` has no per-item statement scope.
   */
  substitutions: Map<string, ts.Expression>;
}

/** Print a template expression, collapsing CSS-Module reads but leaving every identifier bare. */
function templateExpr(expr: ts.Expression, context: Context): string {
  // Inline the map callback's leading scalar consts **first**, so the transforms
  // below (CSS-Module collapse, setter/event/slot rewrites) also see through the
  // substituted bodies — a const such as `const thClass = classNames(styles['x'])`
  // must have its `styles['x']` read collapsed once spliced into the use site.
  const inlined = inlineIdentifiers(expr, context.substitutions);
  const result = ts.transform(inlined, [
    collapseStyles(context.styleModuleNames),
    rewriteSetters(context.setterToState),
    emitEvents(context.eventProps, context.propsParamName),
    rewritePropsChildren(context.propsParamName),
    rewriteSlotSources(context.slotSourceNames),
    rewritePropAliases(context.propAliases),
    rewriteHasSlot(),
  ]);
  const text = printNode(result.transformed[0] as ts.Expression, context.sourceFile);
  result.dispose();
  return text;
}

/** Collapse a single expression, returning a string literal's text when it reduces to one. */
function staticText(expr: ts.Expression, context: Context): string | undefined {
  const inlined = inlineIdentifiers(expr, context.substitutions);
  const result = ts.transform(inlined, [collapseStyles(context.styleModuleNames)]);
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
    // An `h(Slot, …)` call is a slot marker, not an element — it is rendered as a
    // native `<slot>` by `emitSlot` (in child position). Reaching it here (e.g. a
    // slot call in element position) has no element form, so fall back. (Captured
    // as a boolean so the type guard does not narrow `expr` to `never` below.)
    const isSlotCall: boolean = isSlotHCall(expr);
    if (isSlotCall) {
      throw new UnsupportedTemplate('slot call in element position');
    }
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

/**
 * Whether Vue's template compiler treats `expr` as a handler it invokes itself —
 * a bare **method reference** (an identifier or a member-access path, optionally
 * parenthesised or non-null-asserted) or a **function expression** (arrow /
 * `function`). Vue compiles any *other* expression (a conditional, logical, call,
 * …) as an **inline statement**: on the event it merely *evaluates* the
 * expression and discards the result. The neutral `onClick={cond ? a : b}` form
 * — which React invokes directly as the handler — therefore evaluates to a
 * function that is never called, so such expressions must be wrapped so the
 * resolved handler is actually invoked with the event arguments.
 */
function isVueBoundHandler(expr: ts.Expression): boolean {
  if (ts.isParenthesizedExpression(expr) || ts.isNonNullExpression(expr)) {
    return isVueBoundHandler(expr.expression);
  }
  return (
    ts.isIdentifier(expr) ||
    ts.isPropertyAccessExpression(expr) ||
    ts.isElementAccessExpression(expr) ||
    ts.isArrowFunction(expr) ||
    ts.isFunctionExpression(expr)
  );
}

/**
 * Print an `on<Event>` handler expression for a Vue listener. A bare method
 * reference or function expression is emitted verbatim (Vue binds/invokes it);
 * every other expression — which React would use directly as the handler — is
 * wrapped so the value it resolves to is actually **called** with the event
 * arguments. The resolved handler is cast to a nullable rest-accepting function
 * so the forwarding type-checks for handlers of any arity (including the common
 * zero-argument case such as `cond ? stop : start`) and a nullish value (a
 * short-circuited `cond && handler`) is a no-op via the optional call.
 */
function handlerExpr(expr: ts.Expression, context: Context): string {
  const printed = templateExpr(expr, context);
  if (isVueBoundHandler(expr)) {
    return printed;
  }
  return `(...args: unknown[]) => ((${printed}) as ((...a: unknown[]) => unknown) | undefined)?.(...args)`;
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
    // A `@model`-paired `onUpdate<Name>` callback forwarded to a child component
    // binds Vue's `update:<name>` listener (`@update:<name>`), since the child's
    // `defineModel('<name>')` emits `update:<name>` — not the camelCase
    // `@updateOpen`. Native elements never carry `onUpdate<Name>` listeners.
    const modelUpdate = isNativeElement ? null : /^onUpdate([A-Z].*)$/.exec(name);
    if (modelUpdate !== null && modelUpdate[1] !== undefined) {
      const local = modelUpdate[1].charAt(0).toLowerCase() + modelUpdate[1].slice(1);
      return `@update:${local}="${escapeExpr(handlerExpr(value.expr, context))}"`;
    }
    const event = isNativeElement ? name.slice(2).toLowerCase() : name.charAt(2).toLowerCase() + name.slice(3);
    return `@${event}="${escapeExpr(handlerExpr(value.expr, context))}"`;
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
  const outName = name === 'className' || name === 'classNames' || name === CLASS_NAME_ATTRIBUTE ? 'class' : name;
  if (value.kind === 'none') {
    return outName;
  }
  if (value.kind === 'static') {
    return `${outName}="${escapeExpr(value.text)}"`;
  }
  return `:${outName}="${escapeExpr(templateExpr(value.expr, context))}"`;
}

/** The name, scope object, and fallback children of a `<Slot>` element or `h(Slot, …)` call. */
type SlotMarker = ts.JsxSelfClosingElement | ts.JsxElement | ts.CallExpression;

/** Read a slot marker's name / scope / fallback across the JSX and `h(Slot, …)` call forms. */
function readSlotParts(node: SlotMarker): {
  name: string | undefined;
  scope: ts.ObjectLiteralExpression | undefined;
  fallback: ts.Node[];
} {
  if (ts.isCallExpression(node)) {
    return {
      name: readSlotHCallName(node),
      scope: readSlotHCallScope(ts.factory, node, (current) => current),
      fallback: slotHCallFallback(node),
    };
  }
  return {
    name: readSlotName(node),
    scope: readSlotScope(ts.factory, node, (current) => current),
    fallback: slotFallbackChildren(node),
  };
}

/**
 * Render a `<Slot>` marker (JSX or the `h(Slot, …)` call form) / `properties.children`
 * as a Vue `<slot>` (named/scoped/fallback). `undefined` is the implicit default slot.
 */
function emitSlot(node: SlotMarker | undefined, depth: number, context: Context): string {
  const parts =
    node === undefined ? { name: undefined, scope: undefined, fallback: [] as ts.Node[] } : readSlotParts(node);
  const attrs: string[] = [];
  if (parts.name !== undefined) {
    attrs.push(`name="${parts.name}"`);
  }
  if (parts.scope !== undefined) {
    for (const property of parts.scope.properties) {
      if (ts.isPropertyAssignment(property)) {
        attrs.push(
          `:${nameText(property.name, context.sourceFile)}="${escapeExpr(templateExpr(property.initializer, context))}"`,
        );
      }
    }
  }
  const open = `slot${attrs.length > 0 ? ` ${attrs.join(' ')}` : ''}`;
  if (parts.fallback.length === 0) {
    return `${pad(depth)}<${open} />`;
  }
  const inner = emitChildren(parts.fallback, depth + 1, context);
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

/**
 * Whether a statement is a no-op `void <expr>;` unused-parameter suppressor
 * (e.g. `void properties.id;`) whose operand performs no call — so it produces
 * no nodes and no side effects and can be dropped from the template body.
 */
function isNoOpVoidStatement(statement: ts.Statement): boolean {
  if (!ts.isExpressionStatement(statement) || !ts.isVoidExpression(statement.expression)) {
    return false;
  }
  let hasCall = false;
  const visit = (node: ts.Node): void => {
    if (hasCall) {
      return;
    }
    if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
      hasCall = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(statement.expression.expression);
  return !hasCall;
}

/** Unwrap redundant parentheses around an expression. */
function unwrap(expr: ts.Expression): ts.Expression {
  return ts.isParenthesizedExpression(expr) ? unwrap(expr.expression) : expr;
}

/**
 * Read a leading early-return guard `if (cond) return EXPR;` (the `then` may be a
 * bare `return` or a one-statement block, and there must be no `else`). Returns
 * the condition + returned expression, or `undefined` for any other statement.
 */
function readEarlyReturnGuard(
  statement: ts.Statement,
): { condition: ts.Expression; expression: ts.Expression } | undefined {
  if (!ts.isIfStatement(statement) || statement.elseStatement !== undefined) {
    return undefined;
  }
  const then = statement.thenStatement;
  const inner = ts.isBlock(then) ? then.statements.filter((entry) => !ts.isEmptyStatement(entry)) : [then];
  if (inner.length !== 1 || !ts.isReturnStatement(inner[0]) || inner[0].expression === undefined) {
    return undefined;
  }
  return { condition: statement.expression, expression: inner[0].expression };
}

/**
 * Emit one arm of a conditional chain carrying the given leading `directive`
 * (`v-if`/`v-else-if`/`v-else`). A single element or single-element `.map()`
 * carries the directive directly; any other child-producing arm (array literal,
 * default slot, fragment, nested conditional, or text) has no single host for
 * the guard, so it is wrapped in a `<template>` block that carries the directive.
 */
function emitConditionalArm(expr: ts.Expression, depth: number, context: Context, directive: string): string {
  const node = unwrap(expr);
  if (isMapCall(node)) {
    return emitMap(node, depth, context, directive);
  }
  if (isElementLike(node)) {
    return emitElement(node, depth, context, directive);
  }
  if (ts.isArrayLiteralExpression(node)) {
    const body = emitNodeArrayChild(node, depth + 1, context);
    return `${pad(depth)}<template ${directive}>\n${body}\n${pad(depth)}</template>`;
  }
  // Any other child-producing arm — a `properties.children` / slot-source default
  // slot, a fragment, a nested conditional, or a text interpolation — has no
  // single host to carry the guard, so wrap it in a `<template>` block. The body
  // is emitted through {@link emitExpressionChild}, which itself falls back
  // (throws) for a node-producing shape it can't express.
  const body = emitExpressionChild(node, depth + 1, context);
  return `${pad(depth)}<template ${directive}>\n${body}\n${pad(depth)}</template>`;
}

/**
 * Emit a (possibly chained) node-producing conditional as sibling
 * `v-if` / `v-else-if` / `v-else` arms. A ternary whose false branch is itself a
 * conditional (`error ? <p/> : hint ? <p/> : null`) flattens into one chain; the
 * trailing `null`/`undefined` arm renders nothing (no `v-else`). Every arm is
 * emitted through {@link emitConditionalArm}, so element, `.map()`, array, and
 * nested-conditional arms may be mixed freely (each keeps its own `v-for`).
 */
function emitConditionalChain(conditional: ts.ConditionalExpression, depth: number, context: Context): string {
  const arms: { condition: string; expr: ts.Expression }[] = [];
  let elseExpr: ts.Expression | undefined;
  let current: ts.ConditionalExpression | undefined = conditional;
  while (current !== undefined) {
    arms.push({ condition: templateExpr(current.condition, context), expr: unwrap(current.whenTrue) });
    const whenFalse = unwrap(current.whenFalse);
    if (isNothing(whenFalse)) {
      current = undefined;
    } else if (ts.isConditionalExpression(whenFalse)) {
      current = whenFalse;
    } else {
      elseExpr = whenFalse;
      current = undefined;
    }
  }
  const lines = arms.map((arm, index) => {
    const directive =
      index === 0 ? `v-if="${escapeExpr(arm.condition)}"` : `v-else-if="${escapeExpr(arm.condition)}"`;
    return emitConditionalArm(arm.expr, depth, context, directive);
  });
  if (elseExpr !== undefined) {
    lines.push(emitConditionalArm(elseExpr, depth, context, 'v-else'));
  }
  return lines.join('\n');
}

/** Render a `cond ? <a/> : <b/>` expression to `v-if` / `v-else` elements. */
function emitConditional(conditional: ts.ConditionalExpression, depth: number, context: Context): string {
  const condition = templateExpr(conditional.condition, context);
  const whenTrue = unwrap(conditional.whenTrue);
  const whenFalse = unwrap(conditional.whenFalse);

  if (isMapCall(whenTrue) && isNothing(whenFalse)) {
    return emitMap(whenTrue, depth, context, `v-if="${escapeExpr(condition)}"`);
  }
  if (isNothing(whenTrue) && isMapCall(whenFalse)) {
    return emitMap(whenFalse, depth, context, `v-if="!(${escapeExpr(condition)})"`);
  }
  if (isElementLike(whenTrue) && isNothing(whenFalse)) {
    return emitElement(whenTrue, depth, context, `v-if="${escapeExpr(condition)}"`);
  }
  if (isNothing(whenTrue) && isElementLike(whenFalse)) {
    return emitElement(whenFalse, depth, context, `v-if="!(${escapeExpr(condition)})"`);
  }
  if (isElementLike(whenTrue) && isElementLike(whenFalse)) {
    return `${emitElement(whenTrue, depth, context, `v-if="${escapeExpr(condition)}"`)}\n${emitElement(whenFalse, depth, context, 'v-else')}`;
  }
  // A branch that builds nodes but matched none of the two-arm structural forms
  // above — a nested `cond ? … : hint ? … : null` chain, or a `.map()` opposite a
  // non-`nothing` element branch — flattens into a `v-if`/`v-else-if`/`v-else`
  // chain rather than being stringified into an interpolation.
  if (
    producesNodes(whenTrue, context.sourceFile, context.nodeTypedProps) ||
    producesNodes(whenFalse, context.sourceFile, context.nodeTypedProps)
  ) {
    return emitConditionalChain(conditional, depth, context);
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
  const guard = `v-if="${escapeExpr(templateExpr(expression.left, context))}"`;
  if (isMapCall(right)) {
    return emitMap(right, depth, context, guard);
  }
  if (!isElementLike(right)) {
    // A node-producing right side that isn't a handled structural form must not
    // be stringified into an interpolation, so fall back.
    if (producesNodes(right, context.sourceFile, context.nodeTypedProps)) {
      throw new UnsupportedTemplate('node-producing logical-and branch');
    }
    return `${pad(depth)}{{ ${escapeExpr(templateExpr(expression, context))} }}`;
  }
  return emitElement(right, depth, context, guard);
}

/**
 * Whether a call is `Array.from(source, callback)` — the two-argument mapping
 * form, equivalent to `Array.from(source).map(callback)` (commonly
 * `Array.from({ length: n }, (_, index) => <li/>)` to build a fixed-length list).
 */
function isArrayFromCall(node: ts.Node): boolean {
  return (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === 'Array' &&
    node.expression.name.text === 'from' &&
    node.arguments.length === 2 &&
    (ts.isArrowFunction(node.arguments[1]) || ts.isFunctionExpression(node.arguments[1]))
  );
}

/**
 * Whether a call expression is a list projection the `v-for` path handles: an
 * `x.map(…)` / `x.flatMap(…)`, or the equivalent `Array.from(x, callback)` form.
 */
function isMapCall(node: ts.Node): node is ts.CallExpression {
  return (
    (ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      (node.expression.name.text === 'map' || node.expression.name.text === 'flatMap')) ||
    isArrayFromCall(node)
  );
}

/** Whether `expr` reads `<propsParamName>.children`. */
function isPropsChildrenAccess(expr: ts.Expression, propsParamName: string): boolean {
  return (
    ts.isPropertyAccessExpression(expr) &&
    ts.isIdentifier(expr.expression) &&
    expr.expression.text === propsParamName &&
    expr.name.text === 'children'
  );
}

/** Whether `expr` reads a known child source: `<propsParamName>.children` or an identifier in `sources`. */
function isChildSource(expr: ts.Expression, propsParamName: string, sources: ReadonlySet<string>): boolean {
  return (ts.isIdentifier(expr) && sources.has(expr.text)) || isPropsChildrenAccess(expr, propsParamName);
}

/**
 * Whether `expr` is the canonical child-normalisation build
 * `A === undefined ? [] : Array.isArray(A) ? [...A] : [A]` reading a known child
 * source `A` (`properties.children` or a const bound to it). Such a const is a
 * default-`<slot>` source: its `...<name>` spread — at the return root or nested
 * inside any element — becomes the default slot.
 */
function isNormalizedChildrenInit(expr: ts.Expression, propsParamName: string, sources: ReadonlySet<string>): boolean {
  const outer = unwrap(expr);
  if (!ts.isConditionalExpression(outer)) {
    return false;
  }
  // condition: `A === undefined`
  const condition = unwrap(outer.condition);
  if (
    !ts.isBinaryExpression(condition) ||
    condition.operatorToken.kind !== ts.SyntaxKind.EqualsEqualsEqualsToken ||
    !isChildSource(condition.left, propsParamName, sources) ||
    !(ts.isIdentifier(condition.right) && condition.right.text === 'undefined')
  ) {
    return false;
  }
  // whenTrue: `[]`
  const whenTrue = unwrap(outer.whenTrue);
  if (!ts.isArrayLiteralExpression(whenTrue) || whenTrue.elements.length !== 0) {
    return false;
  }
  // whenFalse: `Array.isArray(A) ? [...A] : [A]`
  const whenFalse = unwrap(outer.whenFalse);
  if (!ts.isConditionalExpression(whenFalse)) {
    return false;
  }
  const guard = unwrap(whenFalse.condition);
  if (
    !ts.isCallExpression(guard) ||
    !ts.isPropertyAccessExpression(guard.expression) ||
    !ts.isIdentifier(guard.expression.expression) ||
    guard.expression.expression.text !== 'Array' ||
    guard.expression.name.text !== 'isArray'
  ) {
    return false;
  }
  return true;
}

/**
 * Substitute the identifiers named in `substitutions` with their (parenthesised)
 * initializer expressions, so a `.map(…)` callback's leading scalar `const`s can
 * be inlined into the returned element (Vue `<template>` has no per-item
 * statement scope). Only reference-position identifiers are replaced: the `.name`
 * of a `a.b` property access and an object-literal shorthand key are left intact
 * (a shorthand whose value is substituted is expanded to a full property).
 */
function inlineIdentifiers(expr: ts.Expression, substitutions: Map<string, ts.Expression>): ts.Expression {
  if (substitutions.size === 0) {
    return expr;
  }
  const transformer: ts.TransformerFactory<ts.Node> = (context) => {
    const { factory } = context;
    const visit = (node: ts.Node): ts.Node => {
      // Only the object side of `a.b` may hold a reference — never the `.b` name.
      if (ts.isPropertyAccessExpression(node)) {
        return factory.updatePropertyAccessExpression(
          node,
          ts.visitNode(node.expression, visit) as ts.Expression,
          node.name,
        );
      }
      // A shorthand `{ open }` whose value is inlined becomes `{ open: (…) }`.
      if (ts.isShorthandPropertyAssignment(node) && substitutions.has(node.name.text)) {
        return factory.createPropertyAssignment(
          node.name,
          factory.createParenthesizedExpression(substitutions.get(node.name.text) as ts.Expression),
        );
      }
      if (ts.isIdentifier(node) && substitutions.has(node.text)) {
        return factory.createParenthesizedExpression(substitutions.get(node.text) as ts.Expression);
      }
      return ts.visitEachChild(node, visit, context);
    };
    return (node) => ts.visitNode(node, visit) as ts.Node;
  };
  const result = ts.transform(expr, [transformer]);
  return result.transformed[0] as ts.Expression;
}

/**
 * The element a `.map(…)` callback returns, plus the scalar-`const` substitutions
 * for any leading `const`s it declares before that single `return` — or `undefined`.
 *
 * A block-body callback may compute intermediate `const`s before returning its
 * element (e.g. `items.map((item) => { const open = openIds.includes(item.id);
 * return <details open={open}/>; })`). Vue `<template>` has no per-item statement
 * scope, so each leading `const` is inlined before the projection becomes a
 * native `v-for`:
 *
 * - a **scalar** `const` is recorded as a `substitutions` entry and inlined into
 *   the printed template expressions (attribute binds / interpolations),
 * - a **node-valued** `const` (`const row = <span/>`) is inlined **structurally**
 *   into the returned element's tree (its references become the element subtree).
 *
 * The returned `element` (after node-const inlining) keeps original AST nodes so
 * structural reads (tag / attribute names) stay valid. Anything that is not a run
 * of `const`s followed by a single returned expression — a non-`const` statement,
 * an early return / `if` guard, etc. — yields `undefined`.
 */
function mapCallbackElement(
  callback: ts.ArrowFunction | ts.FunctionExpression,
): { element: ts.Expression; substitutions: Map<string, ts.Expression> } | undefined {
  if (ts.isBlock(callback.body)) {
    const statements = callback.body.statements.filter((statement) => !ts.isEmptyStatement(statement));
    const last = statements.at(-1);
    if (last === undefined || !ts.isReturnStatement(last) || last.expression === undefined) {
      return undefined;
    }
    const substitutions = new Map<string, ts.Expression>();
    // Node-valued intermediate consts (`const row = <span/>`) can't sit in a
    // template expression, but they *can* be inlined **structurally** into the
    // returned element's tree (their references become the element subtree), so
    // the whole projection still becomes a native `v-for`.
    const nodeSubstitutions = new Map<string, ts.Expression>();
    for (const statement of statements.slice(0, -1)) {
      if (
        !ts.isVariableStatement(statement) ||
        (statement.declarationList.flags & ts.NodeFlags.Const) === 0 ||
        statement.declarationList.declarations.length !== 1
      ) {
        return undefined;
      }
      const declaration = statement.declarationList.declarations[0];
      if (!ts.isIdentifier(declaration.name) || declaration.initializer === undefined) {
        return undefined;
      }
      if (producesNodes(declaration.initializer)) {
        // Fold earlier node consts into this one so chained references resolve.
        nodeSubstitutions.set(declaration.name.text, inlineIdentifiers(declaration.initializer, nodeSubstitutions));
        continue;
      }
      // Fold earlier scalar consts into this initializer so chained references resolve.
      substitutions.set(declaration.name.text, inlineIdentifiers(declaration.initializer, substitutions));
    }
    const returned = inlineIdentifiers(unwrap(last.expression), nodeSubstitutions);
    return { element: unwrap(returned), substitutions };
  }
  return { element: unwrap(callback.body), substitutions: new Map() };
}

/**
 * Render an `items.map((item, index) => <li/>)` (or `.flatMap(…)`) child as a
 * native `v-for` element: the array becomes the loop source, the callback's
 * parameter list becomes the `(item, index)` alias, and the returned element's
 * own `key={…}` attribute passes through as Vue's `:key`. Falls back (throws
 * {@link UnsupportedTemplate}) for callbacks whose body is not a single returned
 * element, an unsupported parameter shape, or a non-inline callback.
 */
function emitMap(node: ts.CallExpression, depth: number, context: Context, directive?: string): string {
  // `Array.from(source, cb)` is emitted as `Array.from(source).map(cb)`: the
  // materialised array is the loop source, the callback the per-item projection.
  const isArrayFrom = isArrayFromCall(node);
  const callback = isArrayFrom ? node.arguments[1] : node.arguments[0];
  const iterableExpr = isArrayFrom
    ? ts.factory.createCallExpression(node.expression, undefined, [node.arguments[0]])
    : (node.expression as ts.PropertyAccessExpression).expression;
  if (callback === undefined || (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback))) {
    throw new UnsupportedTemplate('map/flatMap without an inline callback');
  }
  if (callback.parameters.length === 0 || callback.parameters.length > 2) {
    throw new UnsupportedTemplate('unsupported map/flatMap callback arity');
  }
  const aliasParts: string[] = [];
  for (const parameter of callback.parameters) {
    if (parameter.dotDotDotToken !== undefined) {
      throw new UnsupportedTemplate('rest parameter in map/flatMap callback');
    }
    aliasParts.push(printNode(parameter.name, context.sourceFile));
  }
  const callbackResult = mapCallbackElement(callback);
  // A `.flatMap((item) => [<dt/>, <dd/>])` callback returns a **fixed array
  // literal of elements**; every entry must be element-like so the projection
  // has a faithful `<template v-for>` form.
  const returnsElementArray =
    callbackResult !== undefined &&
    ts.isArrayLiteralExpression(callbackResult.element) &&
    callbackResult.element.elements.length > 0 &&
    callbackResult.element.elements.every((element) => isElementLike(unwrap(element)));
  if (callbackResult === undefined || (!isElementLike(callbackResult.element) && !returnsElementArray)) {
    throw new UnsupportedTemplate('map/flatMap callback does not return a single element');
  }
  // The loop source is evaluated in the *outer* scope (before the alias binds),
  // so it uses the current context; the returned element (and its children) is
  // walked with a child context carrying the callback's leading scalar consts so
  // they inline into its template expressions (a nested map keeps the outer set).
  const iterable = escapeExpr(templateExpr(iterableExpr, context));
  const childContext: Context = {
    ...context,
    substitutions: new Map([...context.substitutions, ...callbackResult.substitutions]),
  };
  const alias = aliasParts.length === 1 ? aliasParts[0] : `(${aliasParts.join(', ')})`;
  const vFor = `v-for="${escapeExpr(alias)} in ${iterable}"`;
  // A fixed element array becomes a keyless `<template v-for>` wrapping every
  // element (Vue's block form for looping over multiple siblings). A `v-if`/
  // `v-else` guard can't sit on the same `<template>` as the `v-for`, so it is
  // hoisted onto an outer `<template>` wrapper.
  if (returnsElementArray) {
    const elements = (callbackResult.element as ts.ArrayLiteralExpression).elements;
    const inner = elements.map((element) => emitElement(unwrap(element), depth + 1, childContext)).join('\n');
    const loop = `${pad(depth)}<template ${vFor}>\n${inner}\n${pad(depth)}</template>`;
    if (directive === undefined) {
      return loop;
    }
    const guarded = elements.map((element) => emitElement(unwrap(element), depth + 2, childContext)).join('\n');
    return `${pad(depth)}<template ${directive}>\n${pad(depth + 1)}<template ${vFor}>\n${guarded}\n${pad(depth + 1)}</template>\n${pad(depth)}</template>`;
  }
  // A single-element `.map()` sitting behind a `v-if`/`v-else` guard carries both
  // directives on the same element (Vue evaluates `v-if` before `v-for` per element).
  const directives = directive === undefined ? vFor : `${directive} ${vFor}`;
  return emitElement(callbackResult.element, depth, childContext, directives);
}

/**
 * Render an expression that evaluates to an **array of framework nodes** appearing
 * in child position (typically a `...<name>` spread of a node-valued const):
 *
 * - `xs.map(…)` / `xs.flatMap(…)` → a native `v-for` (via {@link emitMap}),
 * - a fixed array literal of elements → each element emitted in sequence,
 * - a `cond ? <arrayA> : <arrayB>` between two node arrays → each arm wrapped in a
 *   `<template v-if>` / `<template v-else>` block (a guard can't share an element
 *   with the arm's own `v-for`).
 *
 * Falls back (throws {@link UnsupportedTemplate}) for any other shape so a
 * non-templatable node array is never stringified into a `{{ … }}` interpolation.
 */
function emitNodeArrayChild(expr: ts.Expression, depth: number, context: Context): string {
  const node = unwrap(expr);
  if (isMapCall(node)) {
    return emitMap(node, depth, context);
  }
  if (ts.isArrayLiteralExpression(node)) {
    if (node.elements.length === 0) {
      return '';
    }
    return node.elements
      .map((element) => emitChildNode(unwrap(element), depth, context))
      .filter((line) => line !== '')
      .join('\n');
  }
  if (ts.isConditionalExpression(node)) {
    const condition = templateExpr(node.condition, context);
    const whenTrue = unwrap(node.whenTrue);
    const whenFalse = unwrap(node.whenFalse);
    const trueBody = emitNodeArrayChild(whenTrue, depth + 1, context);
    const falseBody = isNothing(whenFalse) ? '' : emitNodeArrayChild(whenFalse, depth + 1, context);
    const truthy = `${pad(depth)}<template v-if="${escapeExpr(condition)}">\n${trueBody}\n${pad(depth)}</template>`;
    if (falseBody === '') {
      return truthy;
    }
    return `${truthy}\n${pad(depth)}<template v-else>\n${falseBody}\n${pad(depth)}</template>`;
  }
  throw new UnsupportedTemplate('unhandled node-array child expression');
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
  // The `h(Slot, …)` call form of the slot marker → a native `<slot>` (the `h()`
  // counterpart of the `<Slot … />` JSX element handled above).
  if (isSlotHCall(node)) {
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
  // `items.map((item, index) => <li/>)` / `.flatMap(…)` → a `v-for` element.
  if (isMapCall(node)) {
    return emitMap(node, depth, context);
  }
  if (
    ts.isSpreadElement(node) &&
    ts.isIdentifier(node.expression) &&
    context.slotSourceNames.has(node.expression.text)
  ) {
    return emitSlot(undefined, depth, context);
  }
  // A spread of a node-valued const / expression (`...itemNodes` — a `.map()`/
  // `.flatMap()` projection, a fixed element array, or a conditional between such
  // arrays) is emitted as real child markup. Anything else (a non-node spread)
  // has no `<template>` form and must not be stringified into an interpolation,
  // so fall back.
  if (ts.isSpreadElement(node)) {
    return emitNodeArrayChild(node.expression, depth, context);
  }
  // A bare slot-source identifier in child position (`{childList}` — the
  // normalised `properties.children` rendered directly, e.g. a second time inside
  // a popup) is the default slot, exactly like its `...childList` spread form.
  if (ts.isIdentifier(node) && context.slotSourceNames.has(node.text)) {
    return emitSlot(undefined, depth, context);
  }
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isNumericLiteral(node)) {
    return `${pad(depth)}${node.text}`;
  }
  // A node-typed prop / property rendered as a child (`{header}`, `{activeStep?.content}`, an `MpChild`)
  // would be stringified by an interpolation; fall back so it renders correctly.
  let nodePropName: string | undefined;
  if (ts.isIdentifier(node)) {
    nodePropName = node.text;
  } else if (ts.isPropertyAccessExpression(node)) {
    nodePropName = node.name.text;
  }
  if (nodePropName !== undefined && context.nodeTypedProps.has(nodePropName)) {
    throw new UnsupportedTemplate('node-typed prop rendered as child');
  }
  // Any expression that builds nodes but isn't a structural form we handle
  // (e.g. a `.map()` whose callback returns something other than a single
  // element) must not become a text interpolation.
  if (producesNodes(node, context.sourceFile, context.nodeTypedProps)) {
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
  /** The initializer, with any inlinable helper calls already spliced in. */
  initializer: ts.Expression;
  /** A function-valued const (an event handler) stays a plain `const`, not a `computed`. */
  isHandler: boolean;
}

/**
 * Read a conditional single-property assignment to `objectName`:
 * `if (cond) <objectName>.<key> = <value>;` (the `then` may be a bare statement or
 * a one-statement block, and there must be no `else`). Returns the guard
 * condition, the assigned property name, and the value — or `undefined`.
 */
function readConditionalStyleAssignment(
  statement: ts.Statement,
  objectName: string,
): { condition: ts.Expression; key: ts.PropertyName; value: ts.Expression } | undefined {
  if (!ts.isIfStatement(statement) || statement.elseStatement !== undefined) {
    return undefined;
  }
  const then = statement.thenStatement;
  const body = ts.isBlock(then) ? then.statements.filter((entry) => !ts.isEmptyStatement(entry)) : [then];
  if (body.length !== 1 || !ts.isExpressionStatement(body[0])) {
    return undefined;
  }
  const expression = body[0].expression;
  if (!ts.isBinaryExpression(expression) || expression.operatorToken.kind !== ts.SyntaxKind.EqualsToken) {
    return undefined;
  }
  const target = expression.left;
  // `objectName.key = value`
  if (
    ts.isPropertyAccessExpression(target) &&
    ts.isIdentifier(target.expression) &&
    target.expression.text === objectName
  ) {
    return { condition: statement.expression, key: target.name, value: expression.right };
  }
  // `objectName['key'] = value`
  if (
    ts.isElementAccessExpression(target) &&
    ts.isIdentifier(target.expression) &&
    target.expression.text === objectName &&
    ts.isStringLiteralLike(target.argumentExpression)
  ) {
    return {
      condition: statement.expression,
      key: ts.factory.createStringLiteral(target.argumentExpression.text),
      value: expression.right,
    };
  }
  return undefined;
}

/** Whether a statement assigns to `objectName` or one of its properties. */
function assignsToObject(statement: ts.Statement, objectName: string): boolean {
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found) {
      return;
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      const left = node.left;
      if (ts.isIdentifier(left) && left.text === objectName) {
        found = true;
        return;
      }
      if (
        (ts.isPropertyAccessExpression(left) || ts.isElementAccessExpression(left)) &&
        ts.isIdentifier(left.expression) &&
        left.expression.text === objectName
      ) {
        found = true;
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(statement);
  return found;
}

/**
 * Fold the imperative style-object build
 * `const style = {}; if (width !== undefined) style.width = width; …` into a
 * single declarative `const style = { ...(width !== undefined ? { width } : {}), … };`
 * so the derived-const path can lift it to a reactive `computed` bound as
 * `:style`. Vue's `<template>` has no statement scope, so this is the faithful
 * declarative form of the mutation sequence.
 *
 * Only applies when an empty-object `const` is followed by a contiguous run of
 * `if (cond) <name>.<key> = <value>;` statements and no other statement in the
 * body mutates that object; otherwise the statements are returned unchanged so
 * the caller falls back.
 */
function liftStyleObjects(statements: readonly ts.Statement[]): ts.Statement[] {
  const result: ts.Statement[] = [];
  for (let index = 0; index < statements.length; index += 1) {
    const statement = statements[index];
    // An empty-object `const <name> = {};` declaration.
    if (
      ts.isVariableStatement(statement) &&
      (statement.declarationList.flags & ts.NodeFlags.Const) !== 0 &&
      statement.declarationList.declarations.length === 1
    ) {
      const declaration = statement.declarationList.declarations[0];
      const initializer = declaration.initializer;
      if (
        ts.isIdentifier(declaration.name) &&
        initializer !== undefined &&
        ts.isObjectLiteralExpression(initializer) &&
        initializer.properties.length === 0
      ) {
        const objectName = declaration.name.text;
        // Consume the contiguous run of conditional property assignments.
        const entries: { condition: ts.Expression; key: ts.PropertyName; value: ts.Expression }[] = [];
        let cursor = index + 1;
        for (; cursor < statements.length; cursor += 1) {
          const entry = readConditionalStyleAssignment(statements[cursor], objectName);
          if (entry === undefined) {
            break;
          }
          entries.push(entry);
        }
        // Only lift a genuine build (≥1 conditional assignment) that no later
        // statement further mutates (so the collapsed object is complete).
        const restMutates = statements.slice(cursor).some((rest) => assignsToObject(rest, objectName));
        if (entries.length > 0 && !restMutates) {
          const spreads = entries.map((entry) =>
            ts.factory.createSpreadAssignment(
              ts.factory.createConditionalExpression(
                entry.condition,
                undefined,
                ts.factory.createObjectLiteralExpression(
                  [ts.factory.createPropertyAssignment(entry.key, entry.value)],
                  false,
                ),
                undefined,
                ts.factory.createObjectLiteralExpression([], false),
              ),
            ),
          );
          const object = ts.factory.createObjectLiteralExpression(spreads, true);
          result.push(
            ts.factory.createVariableStatement(
              statement.modifiers,
              ts.factory.createVariableDeclarationList(
                [ts.factory.createVariableDeclaration(declaration.name, undefined, undefined, object)],
                ts.NodeFlags.Const,
              ),
            ),
          );
          index = cursor - 1;
          continue;
        }
      }
    }
    result.push(statement);
  }
  return result;
}

/** The fresh internal accumulator a lifted `let`+`if` build is folded onto (never a reactive memo, so the rewriter leaves it alone). */
const LIFTED_ACCUMULATOR = '__lifted';

/** Whether a statement contains a bare assignment `<name> = …` anywhere in its subtree. */
function assignsToLocal(statement: ts.Statement, name: string): boolean {
  let found = false;
  const visit = (node: ts.Node): void => {
    if (found) {
      return;
    }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isIdentifier(node.left) &&
      node.left.text === name
    ) {
      found = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(statement);
  return found;
}

/**
 * Whether a statement is a **safe** step of a mechanical `let x = …; if (…) x = …`
 * build: it only ever assigns to `x` (via a bare `x = <value>`), never to another
 * outer binding or to a property of `x`, and contains no loops / early control
 * flow. `if`/`else`(`if`) branches recurse; block-local `const`/`let`
 * declarations (an intermediate like `const geom = …`) are allowed as long as
 * they don't re-declare `x`. Anything else disqualifies the fold so the body
 * stays on the safe render-closure fallback.
 */
function isSafeBuildStatement(statement: ts.Statement, name: string): boolean {
  if (ts.isExpressionStatement(statement)) {
    const expression = statement.expression;
    return (
      ts.isBinaryExpression(expression) &&
      expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isIdentifier(expression.left) &&
      expression.left.text === name
    );
  }
  if (ts.isIfStatement(statement)) {
    const branchSafe = (branch: ts.Statement): boolean =>
      ts.isBlock(branch)
        ? branch.statements.every((inner) => isSafeBlockStatement(inner, name))
        : isSafeBlockStatement(branch, name);
    return (
      branchSafe(statement.thenStatement) &&
      (statement.elseStatement === undefined || branchSafe(statement.elseStatement))
    );
  }
  return false;
}

/** A statement allowed inside a build branch: an intermediate local declaration (not re-declaring `x`) or a safe build step. */
function isSafeBlockStatement(statement: ts.Statement, name: string): boolean {
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations.every(
      (declaration) => ts.isIdentifier(declaration.name) && declaration.name.text !== name,
    );
  }
  return isSafeBuildStatement(statement, name);
}

/** Rename every value-position reference to `from` in a statement to `to` (never a property/member name or object key). */
function renameLocal(statement: ts.Statement, from: string, to: string): ts.Statement {
  const result = ts.transform<ts.Node>(statement, [
    (context) => {
      const { factory } = context;
      const visit = (node: ts.Node): ts.Node => {
        if (ts.isPropertyAccessExpression(node)) {
          return factory.updatePropertyAccessExpression(
            node,
            ts.visitNode(node.expression, visit) as ts.Expression,
            node.name,
          );
        }
        if (ts.isPropertyAssignment(node) && !ts.isComputedPropertyName(node.name)) {
          return factory.updatePropertyAssignment(
            node,
            node.name,
            ts.visitNode(node.initializer, visit) as ts.Expression,
          );
        }
        if (ts.isIdentifier(node) && node.text === from) {
          return factory.createIdentifier(to);
        }
        return ts.visitEachChild(node, visit, context);
      };
      return (node) => ts.visitNode(node, visit) as ts.Node;
    },
  ]);
  const transformed = result.transformed[0] as ts.Statement;
  result.dispose();
  return transformed;
}

/**
 * Fold a mechanical imperative derivation
 * `let x = <init>; if (cond) { x = <a>; } [else { x = <b>; }]` (nested `if`/
 * `else if` chains and intermediate block-local consts allowed) into a single
 * `const x = (() => { let __lifted = <init>; …; return __lifted; })();` so the
 * derived-const path lifts it to a reactive `computed` instead of forcing the
 * render-closure fallback (a `let`+reassignment is otherwise a "non-const derived
 * statement"). The IIFE preserves the exact imperative logic and re-reads its
 * reactive sources on every evaluation, so the `computed` stays correct.
 *
 * Deliberately conservative (see {@link isSafeBuildStatement}): it only fires for
 * a `let x` immediately followed by a contiguous run of statements that assign
 * **only** to `x`, that no later statement reassigns, and that produce no
 * framework nodes — anything else is left untouched to fall back safely.
 */
function liftConditionalConsts(statements: readonly ts.Statement[]): ts.Statement[] {
  const result: ts.Statement[] = [];
  for (let index = 0; index < statements.length; index += 1) {
    const statement = statements[index];
    // A `let <name>[: T] = <init>;` declaration (a `const` cannot be reassigned,
    // so only `let` is a build target).
    if (
      ts.isVariableStatement(statement) &&
      (statement.declarationList.flags & ts.NodeFlags.Let) !== 0 &&
      statement.declarationList.declarations.length === 1
    ) {
      const declaration = statement.declarationList.declarations[0];
      if (ts.isIdentifier(declaration.name) && declaration.initializer !== undefined) {
        const name = declaration.name.text;
        // Consume the contiguous run of statements that build `name`.
        let cursor = index + 1;
        while (cursor < statements.length && assignsToLocal(statements[cursor], name)) {
          cursor += 1;
        }
        const consumed = statements.slice(index + 1, cursor);
        const laterReassigns = statements.slice(cursor).some((rest) => assignsToLocal(rest, name));
        if (
          consumed.length > 0 &&
          consumed.every((entry) => isSafeBuildStatement(entry, name)) &&
          !consumed.some((entry) => producesNodes(entry)) &&
          !laterReassigns
        ) {
          const innerLet = ts.factory.createVariableStatement(
            undefined,
            ts.factory.createVariableDeclarationList(
              [
                ts.factory.createVariableDeclaration(
                  ts.factory.createIdentifier(LIFTED_ACCUMULATOR),
                  undefined,
                  declaration.type,
                  declaration.initializer,
                ),
              ],
              ts.NodeFlags.Let,
            ),
          );
          const renamed = consumed.map((entry) => renameLocal(entry, name, LIFTED_ACCUMULATOR));
          const body = ts.factory.createBlock(
            [innerLet, ...renamed, ts.factory.createReturnStatement(ts.factory.createIdentifier(LIFTED_ACCUMULATOR))],
            true,
          );
          const iife = ts.factory.createCallExpression(
            ts.factory.createParenthesizedExpression(
              ts.factory.createArrowFunction(
                undefined,
                undefined,
                [],
                undefined,
                ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
                body,
              ),
            ),
            undefined,
            [],
          );
          result.push(
            ts.factory.createVariableStatement(
              statement.modifiers,
              ts.factory.createVariableDeclarationList(
                [ts.factory.createVariableDeclaration(declaration.name, undefined, undefined, iife)],
                ts.NodeFlags.Const,
              ),
            ),
          );
          index = cursor - 1;
          continue;
        }
      }
    }
    result.push(statement);
  }
  return result;
}

/** A function-valued node helper eligible for call-site inlining. */
interface InlinableHelper {
  /** The helper's (simple-identifier) parameters, bound positionally to call arguments. */
  params: readonly ts.ParameterDeclaration[];
  /** The single expression the helper returns. */
  body: ts.Expression;
}

/**
 * Read a function-valued const's single returned expression — an arrow with an
 * expression body (`(a) => <li/>`), or an arrow/function whose block body is a
 * lone `return <expr>;`. Returns `undefined` for any multi-statement body or a
 * parameter list that isn't all simple identifiers (destructuring / rest can't
 * be bound positionally by the inliner).
 */
function readHelperBody(initializer: ts.Expression): ts.Expression | undefined {
  if (!ts.isArrowFunction(initializer) && !ts.isFunctionExpression(initializer)) {
    return undefined;
  }
  if (initializer.parameters.some((parameter) => !ts.isIdentifier(parameter.name) || parameter.dotDotDotToken !== undefined)) {
    return undefined;
  }
  if (!ts.isBlock(initializer.body)) {
    return initializer.body;
  }
  const statements = initializer.body.statements.filter((statement) => !ts.isEmptyStatement(statement));
  if (statements.length === 1 && ts.isReturnStatement(statements[0]) && statements[0].expression !== undefined) {
    return statements[0].expression;
  }
  return undefined;
}

/** Count references to `name` in a subtree: total identifier occurrences and those in call-callee position. */
function countNameRefs(name: string, node: ts.Node): { total: number; callee: number } {
  let total = 0;
  let callee = 0;
  const visit = (current: ts.Node): void => {
    if (ts.isCallExpression(current) && ts.isIdentifier(current.expression) && current.expression.text === name) {
      callee += 1;
    }
    if (ts.isIdentifier(current) && current.text === name) {
      total += 1;
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  return { total, callee };
}

/**
 * Collect the function-valued node helpers that can be safely inlined at their
 * call sites: a `const fn = (…params) => <jsx>` whose body is a single expression,
 * which is **never recursive** and appears **only as a call callee** (`fn(…)`) —
 * never passed as a value — across the return expression and the other derived
 * statements. Such a helper has no `<template>` binding form, but splicing its
 * (argument-bound) body into each `fn(…)` call site lets the surrounding tree
 * render as native markup (a `.map()` helper becomes a `v-for`, and so on).
 */
function collectInlinableHelpers(
  statements: readonly ts.Statement[],
  returnExpression: ts.Expression,
  sourceFile?: ts.SourceFile,
  nodeTypedProps?: Set<string>,
): Map<string, InlinableHelper> {
  const candidates = new Map<string, { declaration: ts.VariableDeclaration; helper: InlinableHelper }>();
  for (const statement of statements) {
    if (!ts.isVariableStatement(statement) || statement.declarationList.declarations.length !== 1) {
      continue;
    }
    const declaration = statement.declarationList.declarations[0];
    if (!ts.isIdentifier(declaration.name) || declaration.initializer === undefined) {
      continue;
    }
    if (!producesNodes(declaration.initializer, sourceFile, nodeTypedProps)) {
      continue;
    }
    const body = readHelperBody(declaration.initializer);
    if (body === undefined) {
      continue;
    }
    // A body that references its own name is recursive — inlining would not
    // terminate, so leave it to the recursive-helper extraction / fallback.
    if (countNameRefs(declaration.name.text, body).total > 0) {
      continue;
    }
    const parameters = (declaration.initializer as ts.ArrowFunction | ts.FunctionExpression).parameters;
    candidates.set(declaration.name.text, { declaration, helper: { params: parameters, body } });
  }
  const helpers = new Map<string, InlinableHelper>();
  for (const [name, { declaration, helper }] of candidates) {
    let total = 0;
    let callee = 0;
    const tally = (node: ts.Node): void => {
      const refs = countNameRefs(name, node);
      total += refs.total;
      callee += refs.callee;
    };
    tally(returnExpression);
    for (const statement of statements) {
      if (ts.isVariableStatement(statement) && statement.declarationList.declarations[0] === declaration) {
        continue;
      }
      tally(statement);
    }
    // Callee-only (`total === callee`) and used at least once: safe to inline.
    if (callee >= 1 && total === callee) {
      helpers.set(name, helper);
    }
  }
  return helpers;
}

/**
 * Replace every `fn(args)` call of an {@link collectInlinableHelpers inlinable
 * helper} with the helper's body, binding each parameter to its positional
 * argument (falling back to the parameter's own default when the argument is
 * omitted). Nested helper calls — in the arguments or in the substituted body —
 * are resolved recursively, so a chain of single-call helpers collapses in one pass.
 */
function inlineHelperCalls(expr: ts.Expression, helpers: Map<string, InlinableHelper>): ts.Expression {
  if (helpers.size === 0) {
    return expr;
  }
  const transformer: ts.TransformerFactory<ts.Node> = (context) => {
    const visit = (node: ts.Node): ts.Node => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && helpers.has(node.expression.text)) {
        const helper = helpers.get(node.expression.text) as InlinableHelper;
        const bindings = new Map<string, ts.Expression>();
        helper.params.forEach((parameter, index) => {
          if (!ts.isIdentifier(parameter.name)) {
            return;
          }
          const argument = node.arguments[index];
          const value = argument === undefined ? parameter.initializer : (ts.visitNode(argument, visit) as ts.Expression);
          if (value !== undefined) {
            bindings.set(parameter.name.text, value);
          }
        });
        const inlinedBody = ts.visitNode(helper.body, visit) as ts.Expression;
        return inlineIdentifiers(inlinedBody, bindings);
      }
      return ts.visitEachChild(node, visit, context);
    };
    return (node) => ts.visitNode(node, visit) as ts.Node;
  };
  const result = ts.transform(expr, [transformer]);
  const inlined = result.transformed[0] as ts.Expression;
  result.dispose();
  return inlined;
}

/**
 * Whether a subtree declares a **local** binding (a nested `const`/`let`, or a
 * function/arrow parameter) whose name is in `names`. Used to detect a handler
 * that locally shadows a render-scope memo — a collision the (scope-unaware) memo
 * reference rewriter would mis-handle by `.value`-rewriting the local declaration.
 */
function declaresShadowingLocal(node: ts.Node, names: ReadonlySet<string>): boolean {
  let found = false;
  const visit = (current: ts.Node): void => {
    if (found) {
      return;
    }
    if (
      (ts.isVariableDeclaration(current) || ts.isParameter(current)) &&
      ts.isIdentifier(current.name) &&
      names.has(current.name.text)
    ) {
      found = true;
      return;
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  return found;
}

/**
 * Expand a destructuring const — `const [a, b] = expr` or `const { x, y } = expr`
 * — into an ordered list of scalar {@link DerivedConst}s: one synthetic source
 * const holding the whole expression (named via `nextSourceName`), then one const
 * per bound name reading its element/property off the source. Each becomes its own
 * reactive `computed`, so `a`/`b`/`x` stay usable as bindings that `<template>` has
 * no destructuring form for. Returns `undefined` (fall back) for a node-producing
 * initializer, a rest/defaulted/omitted element, or a non-identifier binding.
 */
function destructureToComputeds(
  name: ts.BindingName,
  initializer: ts.Expression,
  nextSourceName: () => string,
  sourceFile?: ts.SourceFile,
  nodeTypedProps?: Set<string>,
): DerivedConst[] | undefined {
  if (ts.isIdentifier(name) || producesNodes(initializer, sourceFile, nodeTypedProps)) {
    return undefined;
  }
  const factory = ts.factory;
  const sourceName = nextSourceName();
  const makeEntry = (entryName: string, entryInit: ts.Expression): DerivedConst => ({
    name: entryName,
    declaration: factory.createVariableDeclaration(factory.createIdentifier(entryName), undefined, undefined, entryInit),
    initializer: entryInit,
    isHandler: false,
  });
  const entries: DerivedConst[] = [makeEntry(sourceName, initializer)];
  const sourceReference = factory.createIdentifier(sourceName);
  if (ts.isArrayBindingPattern(name)) {
    for (const [index, element] of name.elements.entries()) {
      if (ts.isOmittedExpression(element)) {
        continue;
      }
      if (!ts.isIdentifier(element.name) || element.dotDotDotToken !== undefined || element.initializer !== undefined) {
        return undefined;
      }
      const access = factory.createElementAccessExpression(sourceReference, factory.createNumericLiteral(index));
      entries.push(makeEntry(element.name.text, access));
    }
  } else {
    for (const element of name.elements) {
      if (!ts.isIdentifier(element.name) || element.dotDotDotToken !== undefined || element.initializer !== undefined) {
        return undefined;
      }
      const key = element.propertyName ?? element.name;
      if (!ts.isIdentifier(key)) {
        return undefined;
      }
      const access = factory.createPropertyAccessExpression(sourceReference, factory.createIdentifier(key.text));
      entries.push(makeEntry(element.name.text, access));
    }
  }
  // No bound names (an empty pattern) — nothing to lift.
  return entries.length > 1 ? entries : undefined;
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

  // Classify each derived statement; reject anything that is not a simple
  // `const <name> = <init>;`.
  const derived: DerivedConst[] = [];
  // A node-valued derived const (`const row = <span/>`, `const items = xs.map(…)`)
  // has no Vue `<template>` equivalent as a binding, so it is inlined
  // **structurally** into the return tree at its use sites (its references become
  // the element subtree / the projection) rather than lifted to a declaration.
  const nodeSubstitutions = new Map<string, ts.Expression>();
  // Fold any imperative style-object build (`const style = {}; if (…) style.x = …`)
  // into a single declarative object const so it lifts to a reactive `:style`
  // computed instead of forcing the render-closure fallback, then fold any
  // mechanical `let x = <init>; if (…) x = …` derivation into a single
  // `const x = (() => …)()` so it too lifts to a reactive `computed` rather than
  // being rejected as a "non-const derived statement" (widening native coverage).
  const liftedStatements = liftConditionalConsts(liftStyleObjects(renderStatements));
  // Function-valued node helpers used only as call callees (`const renderPanels =
  // () => tabs.map(…)`, invoked once as `{renderPanels()}`) have no `<template>`
  // binding form, but their (argument-bound) bodies can be spliced into each call
  // site so the surrounding tree templates natively.
  const inlinableHelpers = collectInlinableHelpers(liftedStatements, returnExpression, sourceFile, nodeTypedProps);
  // A single leading early-return guard (`if (!truncatePopup) return h(tag, …);`)
  // splits the body into two whole render paths; captured here and emitted as
  // top-level `v-if`/`v-else` roots below. More than one guard has no faithful
  // flat form, so it falls back.
  let earlyBranch: { condition: ts.Expression; expression: ts.Expression } | undefined;
  // The consts bound directly to `<props>.children` (`const message =
  // properties.children;`) — the raw source a normalisation build reads from, or
  // (as in `base-alert-banner`) content rendered directly. Each is folded into
  // `nodeSubstitutions` **as it is declared** so a *later* node const that reads
  // it (`const banner = message === undefined ? … : <BaseTypography>{message}…`)
  // resolves the reference to `<props>.children`, routing its use sites through
  // the default-slot handling (`{message}` → `<slot/>`, `message === undefined`
  // → `$slots.default === undefined`) instead of leaving a dangling identifier.
  const childrenSourceNames = new Set<string>();
  // Supplies unique synthetic source names for expanded destructuring consts.
  let destructureCounter = 0;
  for (const statement of liftedStatements) {
    // A no-op `void <expr>;` statement (an unused-parameter suppressor such as
    // `void properties.id;`) produces no nodes and has no side effects, so drop
    // it rather than fall back — this lets an otherwise render-nothing component
    // (`void properties.id; return null;`) reach the empty-markup guard.
    if (isNoOpVoidStatement(statement)) {
      continue;
    }
    const guard = readEarlyReturnGuard(statement);
    if (guard !== undefined) {
      if (earlyBranch !== undefined) {
        throw new UnsupportedTemplate('multiple early-return branches');
      }
      earlyBranch = guard;
      continue;
    }
    if (!ts.isVariableStatement(statement) || statement.declarationList.declarations.length !== 1) {
      throw new UnsupportedTemplate('non-const derived statement');
    }
    const declaration = statement.declarationList.declarations[0];
    if (declaration.initializer === undefined) {
      throw new UnsupportedTemplate('non-identifier / uninitialised const');
    }
    // A single-call, callee-only node helper (`const renderPanels = () => tabs.map(…)`)
    // is dropped here — its declaration has no `<template>` form — and its body is
    // spliced into every `renderPanels(…)` call site by `inlineHelperCalls` below.
    if (ts.isIdentifier(declaration.name) && inlinableHelpers.has(declaration.name.text)) {
      continue;
    }
    // Splice any inlinable helper calls this initializer makes into their bodies
    // first, so a `const foo = renderPanels()` resolves to the helper's `.map(…)`
    // (a node-producing initializer) before it is classified below.
    const initializer = inlineHelperCalls(declaration.initializer, inlinableHelpers);
    // A destructuring const (`const [a, b] = expr` / `const { x } = expr`) is
    // expanded into a synthetic source computed plus per-name computeds reading
    // off it, since `<template>` has no destructuring-binding form.
    if (!ts.isIdentifier(declaration.name)) {
      const expanded = destructureToComputeds(
        declaration.name,
        initializer,
        () => `mpDestructured${destructureCounter++}`,
        sourceFile,
        nodeTypedProps,
      );
      if (expanded === undefined) {
        throw new UnsupportedTemplate('non-identifier / uninitialised const');
      }
      derived.push(...expanded);
      continue;
    }
    if (producesNodes(initializer, sourceFile, nodeTypedProps)) {
      // A **function-valued** const that builds nodes (`const renderItems = (…) =>
      // …<li/>…`) which is *not* an inlinable helper (used as a value, recursive,
      // or a multi-statement body) has no template form: inlining it would splice
      // its JSX/`h()` body into a `{{ … }}` interpolation (invalid markup), so
      // fall back to the render closure instead.
      if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) {
        throw new UnsupportedTemplate('function-valued node helper');
      }
      // Fold earlier node consts into this one so chained references resolve.
      nodeSubstitutions.set(declaration.name.text, inlineIdentifiers(initializer, nodeSubstitutions));
      continue;
    }
    if (isPropsChildrenAccess(initializer, scope.propsParamName)) {
      childrenSourceNames.add(declaration.name.text);
      nodeSubstitutions.set(declaration.name.text, initializer);
      continue;
    }
    const isHandler = ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer);
    derived.push({ name: declaration.name.text, declaration, initializer, isHandler });
  }

  // Inline the collected node / children consts into the return expression (after
  // splicing any inlinable helper calls into their bodies), then resolve the
  // effective root the markup is built from.
  const effectiveReturn = inlineIdentifiers(inlineHelperCalls(returnExpression, inlinableHelpers), nodeSubstitutions);

  // The names spread into the children as `...<name>` — the dropped
  // child-normalisation consts whose spread becomes the default `<slot>`.
  const slotSourceNames = new Set<string>();
  const returnRoot = unwrap(effectiveReturn);
  if (ts.isCallExpression(returnRoot) && ts.isIdentifier(returnRoot.expression) && returnRoot.expression.text === 'h') {
    for (const argument of returnRoot.arguments.slice(2)) {
      if (ts.isSpreadElement(argument) && ts.isIdentifier(argument.expression)) {
        slotSourceNames.add(argument.expression.text);
      }
    }
  }
  // A child-normalisation const (`const childList = children === undefined ? [] :
  // Array.isArray(children) ? [...children] : [children];`) is a default-`<slot>`
  // source wherever its `...<name>` spread appears — including **nested** inside a
  // node-valued const that has been inlined into the tree (`base-hero`'s
  // `content`), which the return-root scan above cannot see.
  for (const entry of derived) {
    if (isNormalizedChildrenInit(entry.initializer, scope.propsParamName, childrenSourceNames)) {
      slotSourceNames.add(entry.name);
    }
  }

  // Drop the child-normalisation consts (the `...<name>` slot sources and the
  // `const children = properties.children;` they read from); everything else
  // is a kept declaration.
  const dropped = new Set<string>([...slotSourceNames, ...childrenSourceNames]);

  const kept = derived.filter((entry) => !dropped.has(entry.name));
  // Scalar derived consts become reactive `computed`s; references between them
  // must read `.value`, so add their names to the rewrite scope's memos.
  const scalarNames = kept.filter((entry) => !entry.isHandler).map((entry) => entry.name);
  // A kept const (typically an event handler) whose body/params declare a *local*
  // binding sharing a scalar memo's name (`const value = …` inside a handler while
  // a render-scope `value` computed also exists) would have that local declaration
  // wrongly `.value`-rewritten by the (scope-unaware) memo reference rewriter
  // (`const value.value = …`, invalid script), so fall back rather than emit it.
  const memoNames = new Set(scalarNames);
  if (kept.some((entry) => declaresShadowingLocal(entry.initializer, memoNames))) {
    throw new UnsupportedTemplate('memo-shadowing local binding');
  }
  const computedScope: RewriteScope = { ...scope, memoNames: new Set([...scope.memoNames, ...scalarNames]) };

  let usesComputed = false;
  const declarationLines = kept.map((entry) => {
    const body = rewrite(entry.initializer, computedScope, sourceFile);
    if (entry.isHandler) {
      return `const ${entry.name} = ${body};`;
    }
    usesComputed = true;
    // Preserve the source's explicit type annotation as the computed's return
    // type (`computed((): T => …)`). Author-written annotations such as
    // `Record<string, string | undefined>` on an inline-`:style` object keep the
    // value from widening its string-literal enum members (`display: 'flex'` →
    // `string`) — a widening that would otherwise fail `vue-tsc`'s `CSSProperties`
    // check once the const is read in a `:style` binding.
    const typeText = entry.declaration.type !== undefined ? printNode(entry.declaration.type, sourceFile) : undefined;
    const head = typeText === undefined ? '()' : `(): ${typeText}`;
    // Parenthesise the body so an object-literal initializer (`{ … }`) is an
    // expression, not an arrow-function block.
    return `const ${entry.name} = computed(${head} => (${body}));`;
  });

  const context: Context = {
    sourceFile,
    styleModuleNames: scope.styleModuleNames,
    propsParamName: scope.propsParamName,
    slotSourceNames,
    nodeTypedProps,
    eventProps: scope.eventProps,
    propAliases: scope.propAliases,
    setterToState: scope.setterToState,
    substitutions: new Map(),
  };
  // Forward consumer fall-through attributes onto the component's root element.
  // The generated SFCs declare `inheritAttrs: false` (so multi-root / render-
  // closure components don't warn), which also disables Vue's *automatic* root
  // inheritance — so a single root element must opt back in explicitly with
  // `v-bind="$attrs"`, restoring the `class`/`style`/`id`/`data-*`/listener
  // fall-through the hand-authored `.vue` SFCs relied on. A `<Slot>`, fragment,
  // or conditional root has no single host to bind to and is left untouched.
  const isSingleRootElement = (node: ts.Expression): boolean =>
    (ts.isJsxElement(node) ||
      ts.isJsxSelfClosingElement(node) ||
      (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'h')) &&
    !isSlotElement(node);
  const rootIsSingleElement = isSingleRootElement(returnRoot);

  // An early-return guard splits the body into two whole render paths, emitted as
  // sibling roots: the guard's returned element under `v-if`, the final return
  // under `v-else`. Both must be single elements (each opts back into attribute
  // fall-through with `v-bind="$attrs"`; only one renders at a time); anything
  // else has no faithful flat form and falls back.
  if (earlyBranch !== undefined) {
    const branchARoot = unwrap(
      inlineIdentifiers(inlineHelperCalls(earlyBranch.expression, inlinableHelpers), nodeSubstitutions),
    );
    if (!isSingleRootElement(branchARoot) || !rootIsSingleElement) {
      throw new UnsupportedTemplate('early-return branch is not a single element');
    }
    const condition = escapeExpr(templateExpr(earlyBranch.condition, context));
    const markupA = emitElement(branchARoot, 1, context, `v-if="${condition}"`, 'v-bind="$attrs"');
    const markupB = emitElement(returnRoot, 1, context, 'v-else', 'v-bind="$attrs"');
    return { markup: `${markupA}\n${markupB}`, declarationLines, usesComputed };
  }

  // A render-nothing root (`return null;` / `return undefined;`) has no markup:
  // yield empty markup so the assembler omits the `<template>` block entirely
  // rather than emitting a dangling `{{ null }}` interpolation.
  if (isNothing(returnRoot)) {
    return { markup: '', declarationLines, usesComputed };
  }

  const markup = rootIsSingleElement
    ? emitElement(returnRoot, 1, context, undefined, 'v-bind="$attrs"')
    : emitChildNode(returnRoot, 1, context);

  return { markup, declarationLines, usesComputed };
}
