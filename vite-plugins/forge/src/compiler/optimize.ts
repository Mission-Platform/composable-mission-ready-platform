/**
 * Stage-1 (framework-neutral) optimisation passes for the forge compiler.
 *
 * Runs on the parsed TypeScript AST **before** any per-framework emitter, and
 * performs only SAFE, semantics-preserving rewrites:
 *
 * 1. **Dead-branch pruning** — fold constant conditionals (`true ? a : b`,
 *    `false && x`, `true || x`, and boolean `!` of literals) so emitters never
 *    see unreachable JSX/expressions.
 * 2. **Static-node marking** — tag intrinsic JSX subtrees with no dynamic
 *    bindings using {@link MP_STATIC_ATTR}, so generators can hoist them out of
 *    the render path (and must strip the marker from final emit).
 * 3. **Stable-key inference** — when a `.map(...)` over a statically-analysable
 *    stable source returns JSX without a `key`, annotate a key from the item or
 *    index parameter.
 *
 * Every pass is a no-op for constructs it does not understand. Transforms are
 * pure (no I/O, no shared mutable state beyond the returned tree).
 */
import ts from 'typescript';

/** JSX attribute name used to mark a hoistable static subtree (stripped by emitters). */
export const MP_STATIC_ATTR = '__mpStatic';

/** Options controlling which Stage-1 optimisation passes run. */
export interface OptimizeOptions {
  /** Fold constant conditionals / short-circuits. Defaults to `true`. */
  deadBranchPruning?: boolean;
  /** Mark static intrinsic JSX subtrees with {@link MP_STATIC_ATTR}. Defaults to `true`. */
  staticMarking?: boolean;
  /** Infer `key` on stable `.map(...)` projections missing one. Defaults to `true`. */
  stableKeyInference?: boolean;
}

/**
 * Whether an expression is a compile-time constant (literal, or a pure
 * combination of constants). Used by Stage-1 folding and Stage-2 emitters that
 * skip reactive wrappers around values that can never change.
 */
export function isCompileTimeConstant(expression: ts.Expression): boolean {
  const node = unwrapExpression(expression);
  switch (node.kind) {
    case ts.SyntaxKind.StringLiteral:
    case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
    case ts.SyntaxKind.NumericLiteral:
    case ts.SyntaxKind.TrueKeyword:
    case ts.SyntaxKind.FalseKeyword:
    case ts.SyntaxKind.NullKeyword:
    case ts.SyntaxKind.UndefinedKeyword: {
      return true;
    }
    default: {
      break;
    }
  }
  if (ts.isIdentifier(node) && node.text === 'undefined') {
    return true;
  }
  if (ts.isPrefixUnaryExpression(node)) {
    return (
      (node.operator === ts.SyntaxKind.ExclamationToken ||
        node.operator === ts.SyntaxKind.PlusToken ||
        node.operator === ts.SyntaxKind.MinusToken) &&
      isCompileTimeConstant(node.operand)
    );
  }
  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.every((element) => !ts.isSpreadElement(element) && isCompileTimeConstant(element));
  }
  if (ts.isObjectLiteralExpression(node)) {
    return node.properties.every((property) =>
      ts.isPropertyAssignment(property) &&
      !ts.isComputedPropertyName(property.name) &&
      isCompileTimeConstant(property.initializer),
    );
  }
  if (ts.isParenthesizedExpression(node)) {
    return isCompileTimeConstant(node.expression);
  }
  if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isSatisfiesExpression(node)) {
    return isCompileTimeConstant(node.expression);
  }
  return false;
}

/** Resolve a constant boolean expression to `true`/`false`, or `undefined` if not constant. */
export function constantBoolean(expression: ts.Expression): boolean | undefined {
  const node = unwrapExpression(expression);
  if (node.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }
  if (node.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.ExclamationToken) {
    const inner = constantBoolean(node.operand);
    return inner === undefined ? undefined : !inner;
  }
  return undefined;
}

/** Whether a JSX attribute list already carries a `key` binding. */
export function hasJsxKey(attributes: ts.JsxAttributes): boolean {
  return attributes.properties.some(
    (property) => ts.isJsxAttribute(property) && ts.isIdentifier(property.name) && property.name.text === 'key',
  );
}

/** Whether a JSX element/self-closing element carries the Stage-1 static marker. */
export function hasMpStaticMarker(node: ts.JsxElement | ts.JsxSelfClosingElement): boolean {
  const attributes = ts.isJsxElement(node) ? node.openingElement.attributes : node.attributes;
  return attributes.properties.some(
    (property) =>
      ts.isJsxAttribute(property) && ts.isIdentifier(property.name) && property.name.text === MP_STATIC_ATTR,
  );
}

/**
 * Strip {@link MP_STATIC_ATTR} from a JSX attribute list. Emitters call this so
 * the private marker never leaks into framework output.
 */
export function stripMpStaticAttributes(factory: ts.NodeFactory, attributes: ts.JsxAttributes): ts.JsxAttributes {
  const filtered = attributes.properties.filter(
    (property) =>
      !(ts.isJsxAttribute(property) && ts.isIdentifier(property.name) && property.name.text === MP_STATIC_ATTR),
  );
  if (filtered.length === attributes.properties.length) {
    return attributes;
  }
  return factory.updateJsxAttributes(attributes, filtered);
}

/**
 * Return a copy of a JSX element/self-closing element with {@link MP_STATIC_ATTR}
 * removed (children/attributes otherwise preserved).
 */
export function stripMpStaticMarker(
  factory: ts.NodeFactory,
  node: ts.JsxElement | ts.JsxSelfClosingElement,
): ts.JsxElement | ts.JsxSelfClosingElement {
  if (ts.isJsxSelfClosingElement(node)) {
    return factory.updateJsxSelfClosingElement(
      node,
      node.tagName,
      node.typeArguments,
      stripMpStaticAttributes(factory, node.attributes),
    );
  }
  return factory.updateJsxElement(
    node,
    factory.updateJsxOpeningElement(
      node.openingElement,
      node.openingElement.tagName,
      node.openingElement.typeArguments,
      stripMpStaticAttributes(factory, node.openingElement.attributes),
    ),
    node.children,
    node.closingElement,
  );
}

/**
 * Run all enabled Stage-1 optimisation passes over a neutral source file.
 * Defaults every pass ON; pass `{ deadBranchPruning: false, … }` to disable.
 */
export function optimizeSourceFile(sourceFile: ts.SourceFile, options: OptimizeOptions = {}): ts.SourceFile {
  const deadBranchPruning = options.deadBranchPruning !== false;
  const staticMarking = options.staticMarking !== false;
  const stableKeyInference = options.stableKeyInference !== false;

  if (!deadBranchPruning && !staticMarking && !stableKeyInference) {
    return sourceFile;
  }

  let current = sourceFile;

  if (deadBranchPruning) {
    current = applyTransform(current, createDeadBranchTransformer);
  }
  if (stableKeyInference) {
    current = applyTransform(current, (context) => createStableKeyTransformer(context, current));
  }
  if (staticMarking) {
    current = applyTransform(current, createStaticMarkTransformer);
  }

  return current;
}

// ─── internals ──────────────────────────────────────────────────────────────

function applyTransform(
  sourceFile: ts.SourceFile,
  factory: (context: ts.TransformationContext) => ts.Transformer<ts.SourceFile>,
): ts.SourceFile {
  const result = ts.transform(sourceFile, [factory]);
  const next = result.transformed[0];
  result.dispose();
  return next;
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (ts.isParenthesizedExpression(current)) {
    current = current.expression;
  }
  return current;
}

/** Dead-branch pruning: fold constant ternaries and boolean short-circuits. */
function createDeadBranchTransformer(context: ts.TransformationContext): ts.Transformer<ts.SourceFile> {
  const { factory } = context;
  const visit = (node: ts.Node): ts.Node => {
    const visited = ts.visitEachChild(node, visit, context);

    if (ts.isConditionalExpression(visited)) {
      const flag = constantBoolean(visited.condition);
      if (flag === true) {
        return visited.whenTrue;
      }
      if (flag === false) {
        return visited.whenFalse;
      }
      return visited;
    }

    if (ts.isBinaryExpression(visited)) {
      const operator = visited.operatorToken.kind;
      if (operator === ts.SyntaxKind.AmpersandAmpersandToken) {
        const left = constantBoolean(visited.left);
        if (left === true) {
          return visited.right;
        }
        if (left === false) {
          return factory.createFalse();
        }
      }
      if (operator === ts.SyntaxKind.BarBarToken) {
        const left = constantBoolean(visited.left);
        if (left === true) {
          return factory.createTrue();
        }
        if (left === false) {
          return visited.right;
        }
      }
    }

    if (ts.isPrefixUnaryExpression(visited) && visited.operator === ts.SyntaxKind.ExclamationToken) {
      const flag = constantBoolean(visited.operand);
      if (flag === true) {
        return factory.createFalse();
      }
      if (flag === false) {
        return factory.createTrue();
      }
    }

    return visited;
  };
  return (file) => ts.visitNode(file, visit) as ts.SourceFile;
}

/**
 * Stable-key inference: for `stableSource.map((item[, index]) => <el/>)` without
 * a `key`, add `key={item}` (primitive array sources) or `key={index}` when an
 * index parameter is present.
 */
function createStableKeyTransformer(
  context: ts.TransformationContext,
  sourceFile: ts.SourceFile,
): ts.Transformer<ts.SourceFile> {
  const { factory } = context;
  const moduleConstArrays = collectModuleConstArrays(sourceFile);

  const visit = (node: ts.Node): ts.Node => {
    const visited = ts.visitEachChild(node, visit, context);

    if (!ts.isCallExpression(visited)) {
      return visited;
    }
    if (!ts.isPropertyAccessExpression(visited.expression) || visited.expression.name.text !== 'map') {
      return visited;
    }
    if (!isStableMapSource(visited.expression.expression, moduleConstArrays)) {
      return visited;
    }
    const callback = visited.arguments[0];
    if (callback === undefined || !(ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))) {
      return visited;
    }

    const keyExpression = inferMapKeyExpression(factory, callback);
    if (keyExpression === undefined) {
      return visited;
    }

    const newCallback = injectKeyIntoMapCallback(factory, callback, keyExpression);
    if (newCallback === callback) {
      return visited;
    }
    return factory.updateCallExpression(visited, visited.expression, visited.typeArguments, [
      newCallback,
      ...visited.arguments.slice(1),
    ]);
  };

  return (file) => ts.visitNode(file, visit) as ts.SourceFile;
}

/** Module-level `const name = […literal…]` bindings — stable map sources. */
function collectModuleConstArrays(sourceFile: ts.SourceFile): ReadonlySet<string> {
  const names = new Set<string>();
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }
    if ((statement.declarationList.flags & ts.NodeFlags.Const) === 0) {
      continue;
    }
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.initializer !== undefined) {
        const init = unwrapExpression(declaration.initializer);
        // Accept `as const` / type assertions wrapping a literal array.
        const arrayInit = ts.isArrayLiteralExpression(init)
          ? init
          : ts.isAsExpression(init) || ts.isTypeAssertionExpression(init) || ts.isSatisfiesExpression(init)
            ? unwrapExpression(init.expression)
            : undefined;
        if (arrayInit !== undefined && ts.isArrayLiteralExpression(arrayInit)) {
          names.add(declaration.name.text);
        } else if (ts.isArrayLiteralExpression(init)) {
          names.add(declaration.name.text);
        }
      }
    }
  }
  return names;
}

function isStableMapSource(expression: ts.Expression, moduleConstArrays: ReadonlySet<string>): boolean {
  const node = unwrapExpression(expression);
  if (ts.isArrayLiteralExpression(node)) {
    return true;
  }
  return ts.isIdentifier(node) && moduleConstArrays.has(node.text);
}

/**
 * Choose a key expression for a map callback: prefer the index parameter when
 * present, otherwise the item parameter (safe for primitive array sources).
 */
function inferMapKeyExpression(
  factory: ts.NodeFactory,
  callback: ts.ArrowFunction | ts.FunctionExpression,
): ts.Expression | undefined {
  const itemParam = callback.parameters[0];
  const indexParam = callback.parameters[1];
  if (indexParam !== undefined && ts.isIdentifier(indexParam.name)) {
    return factory.createIdentifier(indexParam.name.text);
  }
  if (itemParam !== undefined && ts.isIdentifier(itemParam.name)) {
    return factory.createIdentifier(itemParam.name.text);
  }
  return undefined;
}

/** Inject `key={…}` onto the JSX element returned by a map callback, if missing. */
function injectKeyIntoMapCallback(
  factory: ts.NodeFactory,
  callback: ts.ArrowFunction | ts.FunctionExpression,
  keyExpression: ts.Expression,
): ts.ArrowFunction | ts.FunctionExpression {
  const body = callback.body;

  if (ts.isBlock(body)) {
    const statements = [...body.statements];
    const last = statements.at(-1);
    if (last === undefined || !ts.isReturnStatement(last) || last.expression === undefined) {
      return callback;
    }
    const withKey = addKeyToJsx(factory, last.expression, keyExpression);
    if (withKey === last.expression) {
      return callback;
    }
    statements[statements.length - 1] = factory.updateReturnStatement(last, withKey);
    const newBody = factory.updateBlock(body, statements);
    return updateCallbackBody(factory, callback, newBody);
  }

  const withKey = addKeyToJsx(factory, body, keyExpression);
  if (withKey === body) {
    return callback;
  }
  return updateCallbackBody(factory, callback, withKey);
}

function updateCallbackBody(
  factory: ts.NodeFactory,
  callback: ts.ArrowFunction | ts.FunctionExpression,
  body: ts.ConciseBody,
): ts.ArrowFunction | ts.FunctionExpression {
  if (ts.isArrowFunction(callback)) {
    return factory.updateArrowFunction(
      callback,
      callback.modifiers,
      callback.typeParameters,
      callback.parameters,
      callback.type,
      callback.equalsGreaterThanToken,
      body,
    );
  }
  if (!ts.isBlock(body)) {
    return callback;
  }
  return factory.updateFunctionExpression(
    callback,
    callback.modifiers,
    callback.asteriskToken,
    callback.name,
    callback.typeParameters,
    callback.parameters,
    callback.type,
    body,
  );
}

function addKeyToJsx(factory: ts.NodeFactory, expression: ts.Expression, keyExpression: ts.Expression): ts.Expression {
  const node = unwrapExpression(expression);
  if (ts.isJsxElement(node)) {
    if (hasJsxKey(node.openingElement.attributes)) {
      return expression;
    }
    return factory.updateJsxElement(
      node,
      factory.updateJsxOpeningElement(
        node.openingElement,
        node.openingElement.tagName,
        node.openingElement.typeArguments,
        withKeyAttribute(factory, node.openingElement.attributes, keyExpression),
      ),
      node.children,
      node.closingElement,
    );
  }
  if (ts.isJsxSelfClosingElement(node)) {
    if (hasJsxKey(node.attributes)) {
      return expression;
    }
    return factory.updateJsxSelfClosingElement(
      node,
      node.tagName,
      node.typeArguments,
      withKeyAttribute(factory, node.attributes, keyExpression),
    );
  }
  // Parenthesized return: re-wrap if we rewrote the inner expression.
  if (ts.isParenthesizedExpression(expression)) {
    const inner = addKeyToJsx(factory, expression.expression, keyExpression);
    if (inner === expression.expression) {
      return expression;
    }
    return factory.updateParenthesizedExpression(expression, inner);
  }
  return expression;
}

function withKeyAttribute(
  factory: ts.NodeFactory,
  attributes: ts.JsxAttributes,
  keyExpression: ts.Expression,
): ts.JsxAttributes {
  const keyAttr = factory.createJsxAttribute(
    factory.createIdentifier('key'),
    factory.createJsxExpression(undefined, keyExpression),
  );
  return factory.updateJsxAttributes(attributes, [keyAttr, ...attributes.properties]);
}

/**
 * Static-node marking: bottom-up, tag intrinsic JSX elements whose attributes
 * and children are fully static (no expressions, spreads, events, refs, or
 * component tags). Fragments are never marked (no attribute slot); their static
 * children still are.
 */
function createStaticMarkTransformer(context: ts.TransformationContext): ts.Transformer<ts.SourceFile> {
  const { factory } = context;
  const visit = (node: ts.Node): ts.Node => {
    const visited = ts.visitEachChild(node, visit, context);

    if (ts.isJsxSelfClosingElement(visited) && isStaticJsxElement(visited)) {
      return markStatic(factory, visited);
    }
    if (ts.isJsxElement(visited) && isStaticJsxElement(visited)) {
      return markStatic(factory, visited);
    }
    return visited;
  };
  return (file) => ts.visitNode(file, visit) as ts.SourceFile;
}

function isIntrinsicTag(tag: ts.JsxTagNameExpression): boolean {
  return ts.isIdentifier(tag) && /^[a-z]/.test(tag.text);
}

function isStaticJsxElement(node: ts.JsxElement | ts.JsxSelfClosingElement): boolean {
  if (hasMpStaticMarker(node)) {
    return true;
  }
  const tag = ts.isJsxElement(node) ? node.openingElement.tagName : node.tagName;
  if (!isIntrinsicTag(tag)) {
    return false;
  }
  const attributes = ts.isJsxElement(node) ? node.openingElement.attributes : node.attributes;
  if (!attributesAreStatic(attributes)) {
    return false;
  }
  if (ts.isJsxElement(node)) {
    return node.children.every((child) => isStaticJsxChild(child));
  }
  return true;
}

function isStaticJsxChild(child: ts.JsxChild): boolean {
  if (ts.isJsxText(child)) {
    return true;
  }
  if (ts.isJsxExpression(child)) {
    // Empty `{}` is static; a constant expression hole is also static.
    return child.expression === undefined || isCompileTimeConstant(child.expression);
  }
  if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
    return isStaticJsxElement(child);
  }
  if (ts.isJsxFragment(child)) {
    return child.children.every((nested) => isStaticJsxChild(nested));
  }
  return false;
}

function attributesAreStatic(attributes: ts.JsxAttributes): boolean {
  for (const property of attributes.properties) {
    if (ts.isJsxSpreadAttribute(property)) {
      return false;
    }
    if (!ts.isJsxAttribute(property) || !ts.isIdentifier(property.name)) {
      return false;
    }
    const name = property.name.text;
    if (name === MP_STATIC_ATTR) {
      continue;
    }
    // Events / refs / keys always count as dynamic (keys are list-local).
    if (name === 'ref' || name === 'key' || /^on[A-Z]/.test(name)) {
      return false;
    }
    const initializer = property.initializer;
    if (initializer === undefined) {
      // Boolean attribute: static.
      continue;
    }
    if (ts.isStringLiteral(initializer)) {
      continue;
    }
    if (ts.isJsxExpression(initializer)) {
      if (initializer.expression === undefined) {
        continue;
      }
      if (!isCompileTimeConstant(initializer.expression)) {
        return false;
      }
      continue;
    }
    return false;
  }
  return true;
}

function markStatic(
  factory: ts.NodeFactory,
  node: ts.JsxElement | ts.JsxSelfClosingElement,
): ts.JsxElement | ts.JsxSelfClosingElement {
  if (hasMpStaticMarker(node)) {
    return node;
  }
  const marker = factory.createJsxAttribute(factory.createIdentifier(MP_STATIC_ATTR), undefined);
  if (ts.isJsxSelfClosingElement(node)) {
    return factory.updateJsxSelfClosingElement(
      node,
      node.tagName,
      node.typeArguments,
      factory.updateJsxAttributes(node.attributes, [marker, ...node.attributes.properties]),
    );
  }
  return factory.updateJsxElement(
    node,
    factory.updateJsxOpeningElement(
      node.openingElement,
      node.openingElement.tagName,
      node.openingElement.typeArguments,
      factory.updateJsxAttributes(node.openingElement.attributes, [
        marker,
        ...node.openingElement.attributes.properties,
      ]),
    ),
    node.children,
    node.closingElement,
  );
}
