/**
 * JSX → Svelte markup conversion for the Svelte target.
 *
 * Walks the neutral component's returned JSX **AST** and produces Svelte 5
 * template markup:
 * - text and `{expr}` children become template text / `{expr}` holes,
 * - `class`/`className`/`classNames` → `class`, `htmlFor` → `for`,
 * - `onX` handlers → the Svelte 5 lowercase `onx={…}` attribute form,
 * - `ref={x}` (an element ref) → `bind:this={x}`,
 * - `cond ? a : b` / `cond && a` children → `{#if cond}…{:else}…{/if}`
 *   (a chained `cond1 ? a : cond2 ? b : c` becomes `{#if}…{:else if}…{:else}…{/if}`),
 * - `list.map(item => <li/>)` children → `{#each list as item}…{/each}` — a
 *   block-bodied callback (`(item) => { const x = …; return <li/>; }`) lifts
 *   its leading `const`s to Svelte `{@const}` inside the block,
 * - `<Slot/>` / `properties.children` → `{@render children?.()}` (named slots →
 *   `{@render name?.()}`),
 * - child neutral components (`<BaseThing/>`) stay capitalised (imported from
 *   `./base-thing.svelte`).
 *
 * Embedded expressions are scoped (see {@link scopeExpression} /
 * {@link rewriteScopedNode}): `properties.x` reads become bare `x`,
 * `<ref>.current` becomes bare `<ref>`, and `hasSlot('x')` becomes `x != null`.
 * A local `const` computed **from** JSX (directly, through a ternary/`&&`, or a
 * `.map()`) has no script-side form — Svelte markup only exists in the
 * template — so the emitter (`../emit-module.js`) never prints such a
 * declaration; instead it registers the local's name against its original
 * initializer in {@link SvelteTemplateContext.jsxConstants}, and every bare
 * read of that name here substitutes (and converts) the initializer in place.
 */
import ts from 'typescript';

import { isHasSlotCall, isSlotElement, readHasSlotName, readSlotName } from '../../compiler/ast.js';

/** Attribute-name aliases (neutral React vocabulary → Svelte/DOM). */
const ATTRIBUTE_ALIASES: Readonly<Record<string, string>> = {
  className: 'class',
  classNames: 'class',
  htmlFor: 'for',
};

/** Context threaded through the recursive markup build. */
export interface SvelteTemplateContext {
  factory: ts.NodeFactory;
  /** The neutral props parameter name (`properties`) whose member reads collapse to bare names. */
  propsParam: string;
  /** Component folder bases, so `<BaseThing/>` is recognised as a child component. */
  componentFolders: ReadonlySet<string>;
  /**
   * `useRef` names declared in the component. Svelte's `$state` ref holds the
   * element directly (there is no `.current` indirection), so a read of
   * `<name>.current` for a name in this set collapses to bare `<name>`.
   */
  refNames: Set<string>;
  /**
   * JSX-yielding local `const` declarations lifted out of the script (see the
   * module doc comment) — keyed by the declared name, valued by its original
   * (neutral) initializer expression.
   */
  jsxConstants: ReadonlyMap<string, ts.Expression>;
  /**
   * Per-prop rename applied to `<propsParam>.<name>` reads — identity for
   * every prop except one whose name collides with a **separately** declared
   * local (e.g. a same-named wrapper `const onLocaleChange = (v) => {
   * properties.onLocaleChange?.(v); };`, which would otherwise redeclare
   * `onLocaleChange` once the read collapses to the bare prop name). The
   * `$props()` destructure binds the aliased name instead (`onLocaleChange:
   * onLocaleChangeProp`), so the read and the wrapper no longer collide.
   */
  propAliasMap: ReadonlyMap<string, string>;
  /**
   * Local names that alias the component's `children` (e.g. `const childList =
   * children === undefined ? [] : Array.isArray(children) ? [...children] :
   * [children];`, the variadic normalisation a `h(tag, props, ...childList)`
   * render performs). Svelte has no such array — `children` is a snippet prop —
   * so a read of one of these names (bare `{childList}` child, or `...childList`
   * spread into an `h(...)` call) renders as `{@render children?.()}`.
   */
  childrenAliases: Set<string>;
}

/** Strip any wrapping `(...)` parentheses. */
function unwrap(expression: ts.Expression): ts.Expression {
  return ts.isParenthesizedExpression(expression) ? unwrap(expression.expression) : expression;
}

/**
 * Collapse a JSX text node the way JSX itself does — the algorithm React/Babel
 * use for literal children. Each line has its leading/trailing whitespace
 * trimmed (except the very start of the first line and very end of the last
 * line, so meaningful inline spaces between adjacent text/expressions survive),
 * wholly blank lines are dropped, and the surviving lines are re-joined with a
 * single space. A whitespace-only run that spans a newline therefore collapses
 * to the empty string and is emitted as nothing — never as a stray ` ` text
 * node, which Svelte rejects as an invalid child of a structural element
 * (`<table>`/`<thead>`/`<tbody>`/`<tr>`/`<select>`/`<ul>`/…).
 */
function normalizeJsxText(raw: string): string {
  const lines = raw.split(/\r\n|\n|\r/);
  let lastNonEmpty = -1;
  for (let index = 0; index < lines.length; index += 1) {
    if (/[^ \t]/.test(lines[index]!)) {
      lastNonEmpty = index;
    }
  }
  let out = '';
  for (let index = 0; index < lines.length; index += 1) {
    const isFirst = index === 0;
    const isLast = index === lines.length - 1;
    let line = lines[index]!.replace(/\t/g, ' ');
    if (!isFirst) {
      line = line.replace(/^ +/, '');
    }
    if (!isLast) {
      line = line.replace(/ +$/, '');
    }
    if (line === '') {
      continue;
    }
    out += index === lastNonEmpty ? line : `${line} `;
  }
  return out;
}

/** Whether a node is a JSX element/self-closing element/fragment. */
function isJsxElementLike(node: ts.Node): node is ts.JsxElement | ts.JsxSelfClosingElement | ts.JsxFragment {
  return ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node);
}

/**
 * Whether evaluating an expression can ever yield JSX — recursing through a
 * ternary chain's branches (`a ? <X/> : b ? <Y/> : <Z/>`), an array literal's
 * elements (`[<a/>, <b/>]`), and a `.map()`/`Array.from()` call whose callback
 * itself yields JSX — so a deeply nested conditional/array/iteration whose
 * *any* part is JSX-valued still converts to Svelte `{#if}`/`{:else if}`/
 * `{#each}` markup instead of leaking JSX into a printed `{expr}`.
 */
function isJsxYielding(expression: ts.Expression): boolean {
  const inner = unwrap(expression);
  if (isJsxElementLike(inner)) {
    return true;
  }
  if (isHyperscriptCall(inner)) {
    return true;
  }
  if (ts.isSpreadElement(inner)) {
    return isJsxYielding(inner.expression);
  }
  if (ts.isConditionalExpression(inner)) {
    return isJsxYielding(inner.whenTrue) || isJsxYielding(inner.whenFalse);
  }
  if (ts.isArrayLiteralExpression(inner)) {
    return inner.elements.some((element) => isJsxYielding(element));
  }
  if (ts.isCallExpression(inner) && callbackYieldsJsx(inner)) {
    return true;
  }
  return false;
}

/** Whether a `.map()`/`Array.from()` call's callback itself yields JSX. */
function callbackYieldsJsx(call: ts.CallExpression): boolean {
  const isMap = ts.isPropertyAccessExpression(call.expression) && call.expression.name.text === 'map';
  const isFrom = isArrayFromCall(call);
  if (!isMap && !isFrom) {
    return false;
  }
  const callback = isFrom ? call.arguments[1] : call.arguments[0];
  if (callback === undefined || !(ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))) {
    return false;
  }
  const body = callback.body;
  if (ts.isBlock(body)) {
    const last = body.statements.at(-1);
    return last !== undefined && ts.isReturnStatement(last) && last.expression !== undefined && isJsxYielding(last.expression);
  }
  return isJsxYielding(body as ts.Expression);
}

/**
 * Node-level rewrites shared by every expression/statement scoping pass:
 * `hasSlot('name')` → `name != null` (the named-slot snippet-prop presence
 * check; the default slot's marker becomes `children != null`), `<ref>.current`
 * → bare `<ref>` (a `useRef` name collapses to its `$state` declaration, which
 * holds the element directly), and `<propsParam>.x` → bare `x` (destructured
 * from `$props()`). Returns the rewritten node, or `undefined` when `node`
 * matches none of these forms (the caller keeps walking/printing it as-is).
 */
export function rewriteScopedNode(node: ts.Node, context: SvelteTemplateContext): ts.Node | undefined {
  const { factory, propsParam, refNames, propAliasMap } = context;
  if (isHasSlotCall(node)) {
    const slotName = readHasSlotName(node) ?? 'children';
    return factory.createBinaryExpression(
      factory.createIdentifier(slotName),
      factory.createToken(ts.SyntaxKind.ExclamationEqualsToken),
      factory.createNull(),
    );
  }
  if (
    ts.isPropertyAccessExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.name.text === 'current' &&
    refNames.has(node.expression.text)
  ) {
    return factory.createIdentifier(node.expression.text);
  }
  if (
    ts.isPropertyAccessExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === propsParam
  ) {
    return factory.createIdentifier(propAliasMap.get(node.name.text) ?? node.name.text);
  }
  return undefined;
}

/** Print an expression, applying every {@link rewriteScopedNode} rewrite throughout its tree. */
export function scopeExpression(expression: ts.Expression, context: SvelteTemplateContext): string {
  const transform = (transformContext: ts.TransformationContext): ts.Transformer<ts.Node> => {
    const visit = (node: ts.Node): ts.Node => {
      const rewritten = rewriteScopedNode(node, context);
      if (rewritten !== undefined) {
        return rewritten;
      }
      return ts.visitEachChild(node, visit, transformContext);
    };
    return (node) => ts.visitNode(node, visit) as ts.Node;
  };
  const result = ts.transform(expression, [transform]);
  const printer = ts.createPrinter();
  const out = printer.printNode(ts.EmitHint.Expression, result.transformed[0] as ts.Expression, expression.getSourceFile());
  result.dispose();
  return out;
}

/** Build Svelte markup for a JSX node. */
export function jsxToSvelte(node: ts.JsxChild | ts.JsxElement | ts.JsxFragment, context: SvelteTemplateContext): string {
  if (ts.isJsxText(node)) {
    return normalizeJsxText(node.text);
  }
  if (ts.isJsxExpression(node)) {
    return node.expression === undefined ? '' : childExpression(node.expression, context);
  }
  if (ts.isJsxFragment(node)) {
    return node.children.map((child) => jsxToSvelte(child, context)).join('');
  }
  // `isSlotElement` is a broad type guard; used directly it would narrow the
  // element branch to `never`, so it is called through a plain boolean alias.
  const isSlot = isSlotElement as (candidate: ts.Node) => boolean;
  if (ts.isJsxSelfClosingElement(node)) {
    if (isSlot(node)) {
      return renderSlot(readSlotName(node));
    }
    return openTag(node.tagName, node.attributes, context, true, '');
  }
  if (ts.isJsxElement(node)) {
    if (isSlot(node)) {
      return renderSlot(readSlotName(node));
    }
    const children = node.children.map((child) => jsxToSvelte(child, context)).join('');
    return openTag(node.openingElement.tagName, node.openingElement.attributes, context, false, children);
  }
  return '';
}

/** `{@render <slot>?.()}` for the default (`children`) or a named slot. */
function renderSlot(name: string | undefined): string {
  const snippet = name === undefined || name === 'default' ? 'children' : name;
  return `{@render ${snippet}?.()}`;
}

/** The emitted tag name (intrinsic elements verbatim; component identifiers capitalised). */
function tagName(tag: ts.JsxTagNameExpression): string {
  return ts.isIdentifier(tag) ? tag.text : tag.getText();
}

/** Emit an element/component opening tag with its Svelte attribute/event bindings + children. */
function openTag(
  tag: ts.JsxTagNameExpression,
  attributes: ts.JsxAttributes,
  context: SvelteTemplateContext,
  selfClosing: boolean,
  children: string,
): string {
  const name = tagName(tag);
  const parts: string[] = [];
  for (const attribute of attributes.properties) {
    if (ts.isJsxSpreadAttribute(attribute)) {
      parts.push(`{...${scopeExpression(attribute.expression, context)}}`);
      continue;
    }
    if (!ts.isJsxAttribute(attribute) || !ts.isIdentifier(attribute.name)) {
      continue;
    }
    const rawName = attribute.name.text;
    const initializer = attribute.initializer;
    // An element ref (`useRef` bound via `ref={x}`) has no Svelte attribute
    // form — it becomes the `bind:this` directive over the same `$state` name.
    if (rawName === 'ref' && initializer && ts.isJsxExpression(initializer) && initializer.expression) {
      parts.push(`bind:this={${scopeExpression(initializer.expression, context)}}`);
      continue;
    }
    if (/^on[A-Z]/.test(rawName) && initializer && ts.isJsxExpression(initializer) && initializer.expression) {
      parts.push(`on${rawName.slice(2).toLowerCase()}={${scopeExpression(initializer.expression, context)}}`);
      continue;
    }
    const attrName = ATTRIBUTE_ALIASES[rawName] ?? rawName;
    if (initializer === undefined) {
      parts.push(attrName);
      continue;
    }
    if (ts.isStringLiteral(initializer)) {
      parts.push(`${attrName}="${initializer.text}"`);
      continue;
    }
    if (ts.isJsxExpression(initializer) && initializer.expression) {
      parts.push(`${attrName}={${scopeExpression(initializer.expression, context)}}`);
    }
  }
  const attrString = parts.length > 0 ? ` ${parts.join(' ')}` : '';
  if (selfClosing) {
    return `<${name}${attrString} />`;
  }
  return `<${name}${attrString}>${children}</${name}>`;
}

/**
 * Render a component's returned value (a JSX element/fragment, a hyperscript
 * `h(...)` call, a lifted JSX-yielding local, or a `children` read) as Svelte
 * markup — the same conversion a `{expr}` JSX child undergoes, exposed for the
 * module emitter's return/early-return handling.
 */
export function renderReturnValue(expression: ts.Expression, context: SvelteTemplateContext): string {
  return childExpression(unwrap(expression), context);
}

/** Render a `{expr}` child hole, mapping JSX-valued conditionals/maps to Svelte blocks. */
function childExpression(expression: ts.Expression, context: SvelteTemplateContext): string {
  // A bare read of a lifted JSX-yielding local — substitute (and convert) its
  // original initializer in place (see the module doc comment).
  if (ts.isIdentifier(expression) && context.jsxConstants.has(expression.text)) {
    return childExpression(context.jsxConstants.get(expression.text)!, context);
  }
  // A bare read of a `children` alias (`{childList}`) → the children snippet.
  if (ts.isIdentifier(expression) && context.childrenAliases.has(expression.text)) {
    return renderSlot('children');
  }
  // `properties.children` / `children` → `{@render children?.()}`.
  if (ts.isPropertyAccessExpression(expression) && expression.name.text === 'children') {
    return renderSlot('children');
  }
  return branchMarkup(expression, context);
}

/** Whether a node is a hyperscript `h(tag, props?, ...children)` call. */
export function isHyperscriptCall(node: ts.Node): node is ts.CallExpression {
  return ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'h';
}

/**
 * Convert a hyperscript `h(tag, props, ...children)` render call to Svelte
 * markup. A string-literal `tag` emits that element directly; a dynamic `tag`
 * (a variable/expression) emits `<svelte:element this={tag} …>`. The `props`
 * object literal maps to attributes exactly like JSX attributes (`class`,
 * `ref` → `bind:this`, `onX` events, `{...spread}`), and the rest arguments
 * become children (recursively converting nested `h(...)`/JSX/expressions;
 * a `...childrenAlias` spread renders the children snippet).
 */
function hyperscriptToSvelte(call: ts.CallExpression, context: SvelteTemplateContext): string {
  const [tagArgument, propsArgument, ...childArguments] = call.arguments;
  if (tagArgument === undefined) {
    return '';
  }
  const attributes =
    propsArgument !== undefined && ts.isObjectLiteralExpression(propsArgument)
      ? hyperscriptAttributes(propsArgument, context)
      : '';
  const children = childArguments.map((argument) => hyperscriptChild(argument, context)).join('');
  if (ts.isStringLiteral(tagArgument)) {
    return `<${tagArgument.text}${attributes}>${children}</${tagArgument.text}>`;
  }
  const tag = scopeExpression(tagArgument, context);
  return `<svelte:element this={${tag}}${attributes}>${children}</svelte:element>`;
}

/** Map an `h(...)` props object literal to a Svelte attribute string (leading-space prefixed). */
function hyperscriptAttributes(props: ts.ObjectLiteralExpression, context: SvelteTemplateContext): string {
  const parts: string[] = [];
  for (const property of props.properties) {
    if (ts.isSpreadAssignment(property)) {
      parts.push(`{...${scopeExpression(property.expression, context)}}`);
      continue;
    }
    if (!ts.isPropertyAssignment(property)) {
      continue;
    }
    const key = ts.isIdentifier(property.name)
      ? property.name.text
      : ts.isStringLiteral(property.name)
        ? property.name.text
        : undefined;
    if (key === undefined) {
      continue;
    }
    const value = property.initializer;
    if (key === 'ref') {
      parts.push(`bind:this={${scopeExpression(value, context)}}`);
      continue;
    }
    if (/^on[A-Z]/.test(key)) {
      parts.push(`on${key.slice(2).toLowerCase()}={${scopeExpression(value, context)}}`);
      continue;
    }
    const name = ATTRIBUTE_ALIASES[key] ?? key;
    if (ts.isStringLiteral(value)) {
      parts.push(`${name}="${value.text}"`);
      continue;
    }
    parts.push(`${name}={${scopeExpression(value, context)}}`);
  }
  return parts.length > 0 ? ` ${parts.join(' ')}` : '';
}

/** Markup for one `h(...)` rest-argument child (`...childrenAlias` → the children snippet). */
function hyperscriptChild(argument: ts.Expression, context: SvelteTemplateContext): string {
  if (
    ts.isSpreadElement(argument) &&
    ts.isIdentifier(argument.expression) &&
    context.childrenAliases.has(argument.expression.text)
  ) {
    return renderSlot('children');
  }
  if (ts.isSpreadElement(argument)) {
    return branchMarkup(argument.expression, context);
  }
  return childExpression(argument, context);
}

/** Whether a call is `Array.from(...)`. */
function isArrayFromCall(call: ts.CallExpression): boolean {
  return (
    ts.isPropertyAccessExpression(call.expression) &&
    ts.isIdentifier(call.expression.expression) &&
    call.expression.expression.text === 'Array' &&
    call.expression.name.text === 'from'
  );
}

/** Convert a ternary chain (`c1 ? a : c2 ? b : c`) to a Svelte `{#if}/{:else if}/{:else}` block. */
function conditionalChainMarkup(expression: ts.ConditionalExpression, context: SvelteTemplateContext): string {
  const branches: { condition: string; markup: string }[] = [];
  let current: ts.Expression = expression;
  let currentUnwrapped = unwrap(current);
  while (ts.isConditionalExpression(currentUnwrapped)) {
    branches.push({
      condition: scopeExpression(currentUnwrapped.condition, context),
      markup: branchMarkup(currentUnwrapped.whenTrue, context),
    });
    current = currentUnwrapped.whenFalse;
    currentUnwrapped = unwrap(current);
  }
  const elseMarkup = branchMarkup(current, context);
  const [first, ...rest] = branches as [{ condition: string; markup: string }, ...{ condition: string; markup: string }[]];
  const restMarkup = rest.map((branch) => `{:else if ${branch.condition}}${branch.markup}`).join('');
  // Omit an empty `{:else}` entirely — an `undefined`/`null` (or otherwise
  // empty) else branch would otherwise emit a stray text node, which Svelte
  // rejects as an invalid child of a structural element (`<table>` etc.).
  const elsePart = elseMarkup === '' ? '' : `{:else}${elseMarkup}`;
  return `{#if ${first.condition}}${first.markup}${restMarkup}${elsePart}{/if}`;
}

/**
 * Convert a JSX-valued (sub-)expression to markup: a JSX element/fragment
 * directly, an empty string for a `null` branch, a chained ternary or `cond &&
 * <A/>` to `{#if}` markup, each element of an array literal (`[<a/>, <b/>]`)
 * concatenated, a `.map()`/`Array.from()` call to `{#each}` markup, and
 * anything else printed as a plain `{expr}` hole.
 */
function branchMarkup(expression: ts.Expression, context: SvelteTemplateContext): string {
  const inner = unwrap(expression);
  if (isJsxElementLike(inner)) {
    return jsxToSvelte(inner, context);
  }
  // A hyperscript `h(tag, props, ...children)` render → the matching element
  // (or `<svelte:element>` for a dynamic tag).
  if (isHyperscriptCall(inner)) {
    return hyperscriptToSvelte(inner, context);
  }
  // A spread element (`...options.map(...)` inside an array literal, or a JSX
  // spread child `{...expr}`) has no Svelte spread form for children — unwrap
  // it and convert the spread expression itself (typically a `.map()` → an
  // `{#each}` block, or another JSX-yielding array).
  if (ts.isSpreadElement(inner)) {
    return branchMarkup(inner.expression, context);
  }
  // A `null`/`undefined` (sub-)expression renders nothing — never a `{undefined}`
  // text node, which Svelte rejects directly inside `<table>`/`<tbody>`/etc.
  if (inner.kind === ts.SyntaxKind.NullKeyword || (ts.isIdentifier(inner) && inner.text === 'undefined')) {
    return '';
  }
  // A ternary (`cond ? a : b`, optionally chained) → `{#if}/{:else if}/{:else}`.
  if (ts.isConditionalExpression(inner) && isJsxYielding(inner)) {
    return conditionalChainMarkup(inner, context);
  }
  // `cond && <A/>` → `{#if cond}…{/if}`.
  if (
    ts.isBinaryExpression(inner) &&
    inner.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken &&
    isJsxYielding(inner.right)
  ) {
    const condition = scopeExpression(inner.left, context);
    return `{#if ${condition}}${branchMarkup(inner.right, context)}{/if}`;
  }
  // `[<a/>, <b/>]` (e.g. an empty-state single-item array branch) → its
  // elements' markup, concatenated (an implicit fragment).
  if (ts.isArrayLiteralExpression(inner) && inner.elements.some((element) => isJsxYielding(element))) {
    return inner.elements.map((element) => branchMarkup(element, context)).join('');
  }
  // `list.map(item => <li/>)` / `Array.from({ length }, (_, i) => <span/>)` → `{#each}…{/each}`.
  if (ts.isCallExpression(inner)) {
    if (ts.isPropertyAccessExpression(inner.expression) && inner.expression.name.text === 'map') {
      const eachBlock = mapToEach(inner, context);
      if (eachBlock !== undefined) {
        return eachBlock;
      }
    } else if (isArrayFromCall(inner)) {
      const eachBlock = arrayFromToEach(inner, context);
      if (eachBlock !== undefined) {
        return eachBlock;
      }
    }
  }
  return `{${scopeExpression(inner, context)}}`;
}

/** Build a `{#each <list> as <item>[, <index>]}…{/each}` block from an iteration callback (undefined if not JSX-yielding). */
function callbackToEachBlock(
  list: string,
  callback: ts.ArrowFunction | ts.FunctionExpression,
  context: SvelteTemplateContext,
): string | undefined {
  const itemParam = callback.parameters[0];
  const indexParam = callback.parameters[1];
  const itemName = itemParam && ts.isIdentifier(itemParam.name) ? itemParam.name.text : 'item';
  const indexName = indexParam && ts.isIdentifier(indexParam.name) ? indexParam.name.text : undefined;
  const each = indexName === undefined ? `${list} as ${itemName}` : `${list} as ${itemName}, ${indexName}`;
  const body = callback.body;
  if (ts.isBlock(body)) {
    const blockMarkup = blockBodyMarkup(body, context);
    return blockMarkup === undefined ? undefined : `{#each ${each}}${blockMarkup}{/each}`;
  }
  const expressionBody = body as ts.Expression;
  if (!isJsxYielding(expressionBody)) {
    return undefined;
  }
  return `{#each ${each}}${branchMarkup(expressionBody, context)}{/each}`;
}

/** Convert `list.map((item) => <li/>)` to a Svelte `{#each}` block (undefined if not JSX-valued). */
function mapToEach(call: ts.CallExpression, context: SvelteTemplateContext): string | undefined {
  const callee = call.expression as ts.PropertyAccessExpression;
  const list = scopeExpression(callee.expression, context);
  const callback = call.arguments[0];
  if (callback === undefined || !(ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))) {
    return undefined;
  }
  return callbackToEachBlock(list, callback, context);
}

/** Convert `Array.from({ length }, (_, index) => <span/>)` to a Svelte `{#each}` block. */
function arrayFromToEach(call: ts.CallExpression, context: SvelteTemplateContext): string | undefined {
  const callback = call.arguments[1];
  if (callback === undefined || !(ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))) {
    return undefined;
  }
  const source = call.arguments[0];
  const list = `Array.from(${source === undefined ? '' : scopeExpression(source, context)})`;
  return callbackToEachBlock(list, callback, context);
}

/**
 * Markup for a `.map()` callback's **block body** — zero or more leading
 * `const` statements (each lifted to a Svelte `{@const}`) followed by a single
 * `return <jsx>;` — the shape a per-item render with a derived local takes
 * (`const open = …; return (<details>…);`). Returns `undefined` for any other
 * block shape, so the caller falls back to the plain-expression printer.
 */
function blockBodyMarkup(body: ts.Block, context: SvelteTemplateContext): string | undefined {
  const statements = body.statements;
  const last = statements.at(-1);
  if (last === undefined || !ts.isReturnStatement(last) || last.expression === undefined) {
    return undefined;
  }
  const returnExpression = unwrap(last.expression);
  if (!isJsxYielding(returnExpression) && returnExpression.kind !== ts.SyntaxKind.NullKeyword) {
    return undefined;
  }
  const constLines: string[] = [];
  for (const statement of statements.slice(0, -1)) {
    if (!ts.isVariableStatement(statement)) {
      return undefined;
    }
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.initializer === undefined) {
        return undefined;
      }
      constLines.push(`{@const ${declaration.name.text} = ${scopeExpression(declaration.initializer, context)}}`);
    }
  }
  return `${constLines.join('')}${branchMarkup(returnExpression, context)}`;
}
