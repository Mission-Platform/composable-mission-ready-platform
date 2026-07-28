/**
 * Reactive-primitive rewriting for the SolidJS target.
 *
 * A SolidJS component runs its function body exactly once; reactivity is carried
 * by signals rather than by re-invoking the component. This module performs the
 * AST rewrites that turn the neutral React-style hook usage into SolidJS
 * primitives, all on the parsed source tree (never on source text):
 *
 * - `useState(init)` → `createSignal(init)`. The first tuple element becomes a
 *   getter **function**, so every read of it is rewritten to a call (`open` →
 *   `open()`); the setter is left as a call.
 * - `useMemo(fn, deps)` → `createMemo(fn)`; its binding is likewise a getter and
 *   its reads are rewritten to calls.
 * - `useEffect(fn, [])` → `onMount(fn)`; `useEffect(fn, deps)` → `createEffect(fn)`.
 * - `useRef(init)` → a `{ current: init }` container; element refs passed as
 *   `ref={r}` become the callback form `ref={(el) => (r.current = el)}`.
 * - `useId()` → `createUniqueId()`.
 * - `useCallback(fn, deps)` → `fn` (Solid needs no memoised callbacks).
 * - Props are never destructured (that would break reactivity): an object
 *   binding parameter is collapsed to a single `props` parameter and every
 *   reference to a bound name is rewritten to `props.<name>` (defaults folded in
 *   through `mergeProps`).
 */
import ts from 'typescript';

/** The SolidJS primitives referenced by the rewrites, so the import builder can include them. */
export interface SolidPrimitiveUsage {
  createSignal: boolean;
  createMemo: boolean;
  createEffect: boolean;
  onMount: boolean;
  createUniqueId: boolean;
  mergeProps: boolean;
}

/** Collect the identifier names bound to a signal/memo getter across the module. */
function collectGetterNames(sourceFile: ts.SourceFile): Set<string> {
  const getters = new Set<string>();
  const walk = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && node.initializer && ts.isCallExpression(node.initializer)) {
      const callee = node.initializer.expression;
      if (ts.isIdentifier(callee)) {
        if (callee.text === 'useState' && ts.isArrayBindingPattern(node.name)) {
          const first = node.name.elements[0];
          if (first && ts.isBindingElement(first) && ts.isIdentifier(first.name)) {
            getters.add(first.name.text);
          }
        }
        if (callee.text === 'useMemo' && ts.isIdentifier(node.name)) {
          getters.add(node.name.text);
        }
      }
    }
    ts.forEachChild(node, walk);
  };
  walk(sourceFile);
  return getters;
}

/** Whether an identifier reference should be left alone rather than turned into a getter call. */
function isNonReadOccurrence(node: ts.Identifier): boolean {
  const parent = node.parent;
  if (parent === undefined) {
    return true;
  }
  // Property access member (`x.current`, `obj.open`) — only the object side is a read.
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) {
    return true;
  }
  // Declaration name / binding element name.
  if (ts.isBindingElement(parent) && parent.name === node) {
    return true;
  }
  if ((ts.isVariableDeclaration(parent) || ts.isParameter(parent)) && parent.name === node) {
    return true;
  }
  // Property assignment key, JSX attribute name, etc.
  if (ts.isPropertyAssignment(parent) && parent.name === node) {
    return true;
  }
  if (ts.isJsxAttribute(parent) && parent.name === node) {
    return true;
  }
  // Import/export specifier.
  if (ts.isImportSpecifier(parent) || ts.isExportSpecifier(parent)) {
    return true;
  }
  // Already the callee of a call (`open(...)`): leaving it avoids `open()()`.
  if (ts.isCallExpression(parent) && parent.expression === node) {
    return true;
  }
  // TYPE positions: an interface/type-literal member name, a method signature
  // name, or a class property declaration name is never a value read, even
  // when it happens to share a getter's name (e.g. `title?: string` inside
  // `FormBuilderProperties` must stay `title`, never become `title()`).
  if (ts.isPropertySignature(parent) && parent.name === node) {
    return true;
  }
  if (ts.isMethodSignature(parent) && parent.name === node) {
    return true;
  }
  if (ts.isPropertyDeclaration(parent) && parent.name === node) {
    return true;
  }
  return false;
}

/**
 * Rewrite reads of the collected getter names to calls (`open` → `open()`),
 * expanding object shorthand (`{ open }` → `{ open: open() }`) so the value is
 * carried, not the getter.
 */
export function rewriteGetterReads(
  context: ts.TransformationContext,
  root: ts.SourceFile,
  getters: ReadonlySet<string>,
): ts.SourceFile {
  const { factory } = context;
  if (getters.size === 0) {
    return root;
  }
  const visit = (node: ts.Node): ts.Node => {
    // Never rewrite inside type-only subtrees: interfaces, type aliases, and
    // any `TypeNode` (which covers type-literal members, type references,
    // etc.) hold no runtime reads, so an identifier there — e.g. the `title`
    // in `interface FormBuilderProperties { title?: string }` — must stay a
    // plain name, never become a getter call (`title()`), even though the
    // same name is a signal getter elsewhere in the module. Returning the
    // node unchanged also skips recursion, so nested type positions are safe
    // by construction rather than by enumerating every TS type-node kind.
    if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isTypeNode(node)) {
      return node;
    }
    // Object shorthand referencing a getter: `{ open }` → `{ open: open() }`.
    if (ts.isShorthandPropertyAssignment(node) && getters.has(node.name.text)) {
      return factory.createPropertyAssignment(
        factory.createIdentifier(node.name.text),
        factory.createCallExpression(factory.createIdentifier(node.name.text), undefined, []),
      );
    }
    if (ts.isIdentifier(node) && getters.has(node.text) && !isNonReadOccurrence(node)) {
      return factory.createCallExpression(factory.createIdentifier(node.text), undefined, []);
    }
    return ts.visitEachChild(node, visit, context);
  };
  return ts.visitNode(root, visit) as ts.SourceFile;
}

/** Rewrite the neutral hook calls to Solid primitives; records which primitives were used. */
export function rewriteHookCalls(
  context: ts.TransformationContext,
  root: ts.SourceFile,
  usage: SolidPrimitiveUsage,
): ts.SourceFile {
  const { factory } = context;
  const visit = (node: ts.Node): ts.Node => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const name = node.expression.text;
      if (name === 'useState') {
        usage.createSignal = true;
        return factory.updateCallExpression(
          node,
          factory.createIdentifier('createSignal'),
          node.typeArguments,
          node.arguments.map((argument) => ts.visitNode(argument, visit) as ts.Expression),
        );
      }
      if (name === 'useMemo') {
        usage.createMemo = true;
        const fn = ts.visitNode(node.arguments[0], visit) as ts.Expression;
        return factory.updateCallExpression(node, factory.createIdentifier('createMemo'), node.typeArguments, [fn]);
      }
      if (name === 'useEffect') {
        const fn = ts.visitNode(node.arguments[0], visit) as ts.Expression;
        const deps = node.arguments[1];
        const isMount = deps !== undefined && ts.isArrayLiteralExpression(deps) && deps.elements.length === 0;
        if (isMount) {
          usage.onMount = true;
          return factory.updateCallExpression(node, factory.createIdentifier('onMount'), node.typeArguments, [fn]);
        }
        usage.createEffect = true;
        return factory.updateCallExpression(node, factory.createIdentifier('createEffect'), node.typeArguments, [fn]);
      }
      if (name === 'useId') {
        usage.createUniqueId = true;
        return factory.createCallExpression(factory.createIdentifier('createUniqueId'), undefined, []);
      }
      if (name === 'useCallback') {
        // `useCallback(fn, deps)` → `fn`.
        return ts.visitNode(node.arguments[0], visit) as ts.Expression;
      }
      if (name === 'useRef') {
        // `useRef(init)` → `{ current: init }`.
        const init = node.arguments[0] ?? factory.createIdentifier('undefined');
        return factory.createObjectLiteralExpression(
          [factory.createPropertyAssignment('current', ts.visitNode(init, visit) as ts.Expression)],
          false,
        );
      }
    }

    // Element ref: `ref={r}` → `ref={(el) => (r.current = el)}` so Solid assigns
    // the element to the mutable container rather than reassigning a binding.
    if (
      ts.isJsxAttribute(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'ref' &&
      node.initializer !== undefined &&
      ts.isJsxExpression(node.initializer) &&
      node.initializer.expression !== undefined &&
      ts.isIdentifier(node.initializer.expression)
    ) {
      const target = node.initializer.expression;
      const assignment = factory.createArrowFunction(
        undefined,
        undefined,
        [factory.createParameterDeclaration(undefined, undefined, factory.createIdentifier('el'))],
        undefined,
        factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
        factory.createParenthesizedExpression(
          factory.createBinaryExpression(
            factory.createPropertyAccessExpression(factory.createIdentifier(target.text), 'current'),
            factory.createToken(ts.SyntaxKind.EqualsToken),
            factory.createIdentifier('el'),
          ),
        ),
      );
      return factory.updateJsxAttribute(node, node.name, factory.updateJsxExpression(node.initializer, assignment));
    }

    return ts.visitEachChild(node, visit, context);
  };
  return ts.visitNode(root, visit) as ts.SourceFile;
}

/** Whether the module still references `useRef`'s `.current` container form (no import needed either way). */
export function collectSolidGetters(sourceFile: ts.SourceFile): Set<string> {
  return collectGetterNames(sourceFile);
}
