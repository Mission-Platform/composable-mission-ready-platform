/**
 * JSX → lit-html template conversion for the Web-Components (Lit) target.
 *
 * Walks the neutral component's returned JSX **AST** (never source text) and
 * produces a lit-html `html\`…\`` tagged-template expression:
 * - text and `{expr}` children become template text / `${expr}` holes,
 * - `class`/`className` → `class=${…}`, `htmlFor` → `for=${…}`,
 * - `onX` handlers → `@x=${…}` event bindings,
 * - boolean attributes → `?attr=${…}`, `value` → `.value=${…}`,
 * - `cond ? a : b` / `cond && a` children → `${cond ? html`…` : nothing}`,
 * - `list.map(item => <li/>)` children → `${list.map(item => html`…`)}`,
 * - child neutral components (`<BaseThing/>`) → their custom-element tag
 *   (`<base-thing></base-thing>`).
 *
 * Expressions embedded in the template are scoped to the element instance:
 * every bare reference to a prop / state field is prefixed with `this.` by
 * {@link scopeExpression}.
 */
import ts from 'typescript';

/** Neutral (React-style) attribute names mapped to their DOM name for Lit. */
const ATTRIBUTE_ALIASES: Readonly<Record<string, string>> = {
  className: 'class',
  htmlFor: 'for',
};

/** DOM attributes bound as element **properties** (`.prop=`) rather than attributes. */
const PROPERTY_BOUND = new Set(['value', 'checked', 'selected', 'disabled']);

/** kebab-case a neutral component tag (`BaseIconButton` → `base-icon-button`). */
export function kebabCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

/**
 * Whether an identifier sits in a **name** position — a property/method key
 * (`{ id: … }`), a member access name (`x.id`), or a destructuring binding
 * name/source (`{ id } = …`) — rather than being read as a value, so scoping
 * it to `this.` would either be meaningless or produce invalid syntax (e.g.
 * `{ this.id: 'date' }`).
 */
export function isNameNotRead(node: ts.Identifier): boolean {
  const parent = node.parent;
  if (parent === undefined) {
    return false;
  }
  return (
    (ts.isPropertyAccessExpression(parent) && parent.name === node) ||
    (ts.isPropertyAssignment(parent) && parent.name === node) ||
    ((ts.isMethodDeclaration(parent) || ts.isGetAccessorDeclaration(parent) || ts.isSetAccessorDeclaration(parent)) &&
      parent.name === node) ||
    (ts.isPropertySignature(parent) && parent.name === node) ||
    (ts.isBindingElement(parent) && (parent.name === node || parent.propertyName === node)) ||
    (ts.isJsxAttribute(parent) && parent.name === node)
  );
}

/**
 * Build the `ts.TransformerFactory` that prefixes bare identifier reads of
 * `scoped` names with `this.` — the shared rewrite behind {@link scopeExpression}
 * and {@link printWithJsxConverted}, so both can compose it with other passes
 * (e.g. the JSX-splice transform) inside a single `ts.transform` call.
 */
export function createScopeTransformer(
  factory: ts.NodeFactory,
  scoped: ReadonlySet<string>,
): ts.TransformerFactory<ts.Node> {
  return (context: ts.TransformationContext): ts.Transformer<ts.Node> => {
    const visit = (node: ts.Node): ts.Node => {
      // `{ id }` shorthand → `{ id: this.id }`: the bare identifier is both the
      // key *and* the value read, so it can't simply be swapped for `this.id`
      // (that would print the invalid `{ this.id }`) — it must expand into a
      // regular (non-shorthand) property assignment.
      if (ts.isShorthandPropertyAssignment(node) && scoped.has(node.name.text)) {
        return factory.createPropertyAssignment(
          node.name,
          factory.createPropertyAccessExpression(factory.createThis(), factory.createIdentifier(node.name.text)),
        );
      }
      if (ts.isIdentifier(node) && scoped.has(node.text) && !isNameNotRead(node)) {
        return factory.createPropertyAccessExpression(factory.createThis(), factory.createIdentifier(node.text));
      }
      return ts.visitEachChild(node, visit, context);
    };
    return (node) => ts.visitNode(node, visit) as ts.Node;
  };
}

/** Print an expression, prefixing bare identifier reads of scoped names with `this.`. */
export function scopeExpression(
  factory: ts.NodeFactory,
  expression: ts.Expression,
  scoped: ReadonlySet<string>,
): string {
  const result = ts.transform(expression, [createScopeTransformer(factory, scoped)]);
  const printer = ts.createPrinter();
  const scopedExpression = result.transformed[0] as ts.Expression;
  const out = printer.printNode(ts.EmitHint.Expression, scopedExpression, expression.getSourceFile());
  result.dispose();
  return out;
}

/**
 * Convert **every** JSX node reachable from `node` (at any depth — nested
 * `if`/`switch`/block bodies, `.map` callbacks, ternaries, …) into a lit-html
 * `html\`…\`` template, then print the whole node back to source.
 *
 * JSX only ever appears in expression position, so each JSX node found is
 * first swapped for a synthesised placeholder identifier (`__mpLit0$`, `__mpLit1$`,
 * …) — keeping the surrounding tree syntactically valid TypeScript — and the
 * transformed node is printed normally. The placeholders are then string-spliced
 * back to their `html\`…\`` text (built from the *original* JSX node via
 * {@link jsxToLitTemplate}, so nested `{}` expressions/maps/conditionals are
 * still fully resolved). This is the one shared mechanism the Web-Components
 * emitter uses everywhere JSX can appear outside the component's direct
 * `return` — kept module statements, `render()` head statements, and `.map`
 * callback block bodies — so no residual JSX can ever survive into the emitted
 * plain-TypeScript module.
 *
 * `extraTransforms` run **before** the JSX-splice pass (e.g. a scope transform
 * that rewrites bare prop/state identifiers to `this.x`), so JSX embedded
 * inside already-scoped code is picked up correctly.
 */
export function printWithJsxConverted(
  node: ts.Node,
  context: TemplateContext,
  extraTransforms: ts.TransformerFactory<ts.Node>[] = [],
): string {
  const placeholders = new Map<string, string>();
  let counter = 0;
  const jsxSpliceTransformer = (transformContext: ts.TransformationContext): ts.Transformer<ts.Node> => {
    const visit = (current: ts.Node): ts.Node => {
      if (ts.isJsxElement(current) || ts.isJsxSelfClosingElement(current) || ts.isJsxFragment(current)) {
        // The trailing `$` (a valid identifier character that is never a
        // digit) makes every placeholder self-terminating, so a shorter one
        // (`__mpLit1$`) can never be a prefix match inside a longer one
        // (`__mpLit10$`) once the count reaches double digits — a bare
        // `__mpLit${counter}` would let `.split('__mpLit1')` partially
        // consume `__mpLit10`, splicing in the wrong template and leaking
        // the leftover `0` as stray text into the printed output.
        const placeholder = `__mpLit${counter++}$`;
        placeholders.set(placeholder, `html\`${jsxToLitTemplate(current, context)}\``);
        // Do not descend further — `jsxToLitTemplate` already fully resolved this subtree.
        return context.factory.createIdentifier(placeholder);
      }
      return ts.visitEachChild(current, visit, transformContext);
    };
    return (current) => ts.visitNode(current, visit) as ts.Node;
  };
  const result = ts.transform(node, [...extraTransforms, jsxSpliceTransformer]);
  const printer = ts.createPrinter();
  const printed = printer.printNode(ts.EmitHint.Unspecified, result.transformed[0], node.getSourceFile());
  result.dispose();
  let out = printed;
  for (const [placeholder, template] of placeholders) {
    out = out.split(placeholder).join(template);
  }
  return out;
}

/** Context threaded through the recursive template build. */
export interface TemplateContext {
  factory: ts.NodeFactory;
  /** Names (props + reactive state) that must be `this.`-scoped inside embedded expressions. */
  scoped: ReadonlySet<string>;
  /** Sibling component folder bases, so `<BaseThing/>` maps to a custom-element tag. */
  componentFolders: ReadonlySet<string>;
}

/** Build a lit-html template string for a JSX element/fragment node. */
export function jsxToLitTemplate(node: ts.JsxChild | ts.JsxElement | ts.JsxFragment, context: TemplateContext): string {
  if (ts.isJsxText(node)) {
    const text = node.text.replace(/\s+/g, ' ');
    return text.trim().length === 0 ? (text.includes('\n') ? '' : text) : text;
  }
  if (ts.isJsxExpression(node)) {
    return node.expression === undefined ? '' : `\${${expressionToTemplateHole(node.expression, context)}}`;
  }
  if (ts.isJsxFragment(node)) {
    return node.children.map((child) => jsxToLitTemplate(child, context)).join('');
  }
  if (ts.isJsxSelfClosingElement(node)) {
    return openTag(node.tagName, node.attributes, context, true);
  }
  if (ts.isJsxElement(node)) {
    const open = openTag(node.openingElement.tagName, node.openingElement.attributes, context, false);
    const children = node.children.map((child) => jsxToLitTemplate(child, context)).join('');
    const tag = tagName(node.openingElement.tagName);
    return `${open}${children}</${tag}>`;
  }
  return '';
}

/** Resolve the emitted tag name (intrinsic element, or a sibling component's custom-element tag). */
function tagName(tag: ts.JsxTagNameExpression): string {
  if (ts.isIdentifier(tag)) {
    const name = tag.text;
    if (/^[A-Z]/.test(name)) {
      // A component reference — map `BaseThing` to `base-thing` when it is a sibling component.
      return kebabCase(name);
    }
    return name;
  }
  return tag.getText();
}

/** Emit an element's opening tag with its lit-html attribute/event/property bindings. */
function openTag(
  tag: ts.JsxTagNameExpression,
  attributes: ts.JsxAttributes,
  context: TemplateContext,
  selfClosing: boolean,
): string {
  const name = tagName(tag);
  const parts: string[] = [];
  for (const attribute of attributes.properties) {
    if (ts.isJsxSpreadAttribute(attribute)) {
      // Spread props are not expressible as a single lit binding; skip (best effort).
      continue;
    }
    if (!ts.isJsxAttribute(attribute) || !ts.isIdentifier(attribute.name)) {
      continue;
    }
    const rawName = attribute.name.text;
    const initializer = attribute.initializer;
    // Event handler: `onClick` → `@click`.
    if (/^on[A-Z]/.test(rawName) && initializer && ts.isJsxExpression(initializer) && initializer.expression) {
      const eventName = rawName.slice(2).toLowerCase();
      parts.push(`@${eventName}=\${${expressionToTemplateHole(initializer.expression, context)}}`);
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
      const hole = expressionToTemplateHole(initializer.expression, context);
      if (PROPERTY_BOUND.has(attrName)) {
        parts.push(`.${attrName}=\${${hole}}`);
      } else {
        parts.push(`${attrName}=\${${hole}}`);
      }
    }
  }
  const attrString = parts.length > 0 ? ` ${parts.join(' ')}` : '';
  return selfClosing ? `<${name}${attrString}></${name}>` : `<${name}${attrString}>`;
}

/**
 * Render an embedded expression as the contents of a `${…}` hole: JSX-valued
 * conditionals/maps recurse into nested `html\`…\`` templates, everything else
 * is scoped and printed verbatim.
 */
function expressionToTemplateHole(expression: ts.Expression, context: TemplateContext): string {
  const { factory } = context;
  // `cond ? <A/> : <B/>` → `cond ? html`…` : html`…``.
  if (ts.isConditionalExpression(expression)) {
    const condition = scopeExpression(factory, expression.condition, context.scoped);
    const whenTrue = branchToTemplate(expression.whenTrue, context);
    const whenFalse = branchToTemplate(expression.whenFalse, context);
    return `${condition} ? ${whenTrue} : ${whenFalse}`;
  }
  // `cond && <A/>` → `cond ? html`…` : nothing`.
  if (
    ts.isBinaryExpression(expression) &&
    expression.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken &&
    isJsxValued(expression.right)
  ) {
    const condition = scopeExpression(factory, expression.left, context.scoped);
    return `${condition} ? ${branchToTemplate(expression.right, context)} : nothing`;
  }
  // Any call whose arguments carry JSX (`list.map(item => <li/>)`,
  // `Array.from({length}, (_, i) => <span/>)`, `.forEach(...)`, chained
  // `.filter(...).map(...)`, …) → scope its identifiers and convert every
  // JSX node it contains (however deeply nested — block bodies, early
  // returns, …) to `html\`…\`` templates in place.
  if (ts.isCallExpression(expression) && containsJsx(expression)) {
    return printWithJsxConverted(expression, context, [createScopeTransformer(factory, context.scoped)]);
  }
  if (isJsxValued(expression)) {
    return branchToTemplate(expression, context);
  }
  return scopeExpression(factory, expression, context.scoped);
}

/** Whether an expression is (or yields) JSX. */
function isJsxValued(expression: ts.Expression): boolean {
  const inner = ts.isParenthesizedExpression(expression) ? expression.expression : expression;
  return ts.isJsxElement(inner) || ts.isJsxSelfClosingElement(inner) || ts.isJsxFragment(inner);
}

/**
 * Convert a JSX-valued branch to a nested `html\`…\`` template (or `nothing`
 * for a bare `null`). Anything else — including a **nested** `cond ? a : b` /
 * `cond && a` / JSX-carrying call (`a ? <X/> : b ? <Y/> : <Z/>`) — recurses
 * through {@link expressionToTemplateHole} rather than falling straight to
 * {@link scopeExpression}, so a branch that is itself conditional never
 * re-prints its own embedded JSX raw.
 */
function branchToTemplate(expression: ts.Expression, context: TemplateContext): string {
  const inner = ts.isParenthesizedExpression(expression) ? expression.expression : expression;
  if (ts.isJsxElement(inner) || ts.isJsxSelfClosingElement(inner) || ts.isJsxFragment(inner)) {
    return `html\`${jsxToLitTemplate(inner, context)}\``;
  }
  if (inner.kind === ts.SyntaxKind.NullKeyword) {
    return 'nothing';
  }
  return expressionToTemplateHole(inner, context);
}

/** Whether a node contains a JSX element/self-closing element/fragment anywhere in its subtree. */
export function containsJsx(node: ts.Node): boolean {
  if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) {
    return true;
  }
  let found = false;
  ts.forEachChild(node, (child) => {
    if (!found && containsJsx(child)) {
      found = true;
    }
  });
  return found;
}
