/**
 * React module emitter for the Stage-1 compiler.
 *
 * A neutral component is already, structurally, a React function component: it
 * is a pure function of its props returning JSX in the classic-`h` dialect. So
 * the React target is a light source rewrite of the original module:
 *
 * - the `@mission-platform/forge` import is split into a value import from `react`
 *   (`h` → `createElement`, `Fragment`, and the hooks, which *are* React's own)
 *   and a type-only import kept against the neutral package — except neutral
 *   types with a first-class React equivalent (`MpChild` → `ReactNode`), which
 *   are imported from `react` and renamed at every reference, and
 * - DOM attribute names that differ in React's vocabulary are aliased
 *   (`class` → `className`, `for` → `htmlFor`) both in JSX attributes and in the
 *   object literals passed to explicit `h(…)` calls.
 *
 * Stage 2 then compiles the emitted `.tsx` with the standard React JSX transform
 * (the classic `h`/`Fragment` factory), so the output is an ordinary, fully
 * native React component.
 */
import ts from 'typescript';

import {
  CLASS_NAME_ATTRIBUTE,
  createReactHasSlotExpression,
  createReactSlotCallExpression,
  createReactSlotExpression,
  dynamicToHCall,
  ensureI18nHookInComponent,
  findComponentFunction,
  hasSlottedChildren,
  isComponentTagName,
  isDynamicElement,
  isFragmentElement,
  isHasSlotCall,
  isSlotElement,
  isSlotHCall,
  NEUTRAL_MODULE,
  partitionSlottedChildren,
  printSourceFile,
  REACT_TYPE_ALIASES,
  reactClassNameValue,
  readHasSlotName,
  readNeutralImports,
  readSlotHCallName,
  readSlotHCallScope,
  readSlotName,
  readSlotScope,
  slotFallbackChildren,
  slotHCallFallback,
  stripSlotAttribute,
  transformI18nextCalls,
  usesClassNamesArrayAttribute,
} from '../../compiler/ast.js';
import { hoistStaticJsx } from '../../compiler/hoist-static.js';
import { MP_STATIC_ATTR, stripMpStaticAttributes } from '../../compiler/optimize.js';

import { REACT_ALIASES } from './aliases.js';
import { buildReactImports } from './imports.js';

/** Rewrite a relative sibling-component import to the flat generated layout (`./<base>`). */
function flattenComponentSpecifier(specifier: string): string {
  const segments = specifier.split('/').filter((segment) => segment !== '.' && segment !== '..' && segment.length > 0);
  return `./${segments.at(-1) ?? specifier}`;
}

/** Transform the whole module into the React target source. */
export function emitReactModule(rawSourceFile: ts.SourceFile, componentName?: string): string {
  const sourceFile = ensureI18nHookInComponent(ts.factory, rawSourceFile);
  const neutral = readNeutralImports(sourceFile);

  // The `className={[…]}` array form collapses to a `classNames(…)` runtime
  // call (see `reactClassNameValue`), so the neutral helper must be imported —
  // the author drives the attribute without ever importing `classNames`.
  if (usesClassNamesArrayAttribute(sourceFile) && !neutral.values.includes('classNames')) {
    neutral.values.push('classNames');
  }

  // The props parameter name (e.g. `properties`) a `<Slot name="x" />` reads from.
  const component = componentName === undefined ? undefined : findComponentFunction(sourceFile, componentName);
  const parameter = component?.parameters[0];
  const propertiesParameterName =
    parameter !== undefined && ts.isIdentifier(parameter.name) ? parameter.name.text : 'properties';

  const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
    const { factory } = context;

    // Wrap a named-slot group's content as the expression value of a React prop:
    // a lone element stays itself, several children become a `<>…</>` fragment.
    const slotPropValue = (children: ts.JsxChild[]): ts.Expression => {
      const stripped = children
        .filter((child) => !(ts.isJsxText(child) && child.text.trim() === ''))
        .map((child) =>
          ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child) ? stripSlotAttribute(factory, child) : child,
        );
      if (stripped.length === 1) {
        const only = stripped[0];
        if (ts.isJsxExpression(only) && only.expression !== undefined) {
          return only.expression;
        }
        if (ts.isJsxElement(only) || ts.isJsxSelfClosingElement(only) || ts.isJsxFragment(only)) {
          return only;
        }
      }
      return factory.createJsxFragment(
        factory.createJsxOpeningFragment(),
        stripped,
        factory.createJsxJsxClosingFragment(),
      );
    };

    const visit = (node: ts.Node): ts.Node | ts.Node[] => {
      const transformedI18n = transformI18nextCalls(factory, node);
      if (transformedI18n !== node) {
        return transformedI18n;
      }

      // A neutral `<Fragment>` maps to React's idiomatic forms: an **empty**
      // `<Fragment />` renders nothing, so it collapses to `null` (the value
      // React expects for "render nothing", cleaner than an empty `<></>`); a
      // fragment **with** children uses the `<>…</>` shorthand rather than the
      // named `<Fragment>` element. In JSX child position the `null` is wrapped
      // as `{null}` so it stays a valid child.
      if (isFragmentElement(node)) {
        const children = ts.isJsxElement(node) ? node.children : [];
        const meaningful = children.filter((child) => !(ts.isJsxText(child) && child.text.trim() === ''));
        if (meaningful.length === 0) {
          const nullLiteral = factory.createNull();
          const parent = node.parent;
          return parent !== undefined && (ts.isJsxElement(parent) || ts.isJsxFragment(parent))
            ? factory.createJsxExpression(undefined, nullLiteral)
            : nullLiteral;
        }
        const visitedChildren = children.map((child) => ts.visitNode(child, visit) as ts.JsxChild);
        return factory.createJsxFragment(
          factory.createJsxOpeningFragment(),
          visitedChildren,
          factory.createJsxJsxClosingFragment(),
        );
      }

      // Named-slot **passing**: a component element whose children carry
      // `slot="x"` markers — `<ForgeDropdown><button slot="trigger"/>panel</ForgeDropdown>`
      // — becomes `<ForgeDropdown trigger={<button/>}>panel</ForgeDropdown>`, so the
      // child's `<Slot name="trigger" />` (compiled to `{ properties.trigger }`)
      // resolves. The default-slot children stay as the element's children.
      if (
        ts.isJsxElement(node) &&
        isComponentTagName(node.openingElement.tagName) &&
        hasSlottedChildren(node.children)
      ) {
        const { defaultChildren, namedSlots } = partitionSlottedChildren(node.children);
        const slotAttributes = [...namedSlots].map(([name, group]) =>
          factory.createJsxAttribute(
            factory.createIdentifier(name),
            factory.createJsxExpression(undefined, slotPropValue(group)),
          ),
        );
        const opening = factory.updateJsxOpeningElement(
          node.openingElement,
          node.openingElement.tagName,
          node.openingElement.typeArguments,
          factory.updateJsxAttributes(node.openingElement.attributes, [
            ...node.openingElement.attributes.properties,
            ...slotAttributes,
          ]),
        );
        const replaced = factory.updateJsxElement(node, opening, defaultChildren, node.closingElement);
        return ts.visitEachChild(replaced, visit, context);
      }

      // `<Slot name="x" />` → `{ properties.x }` (default slot → `{ properties.children }`);
      // extra attributes make it a render-prop call `{ properties.x?.(scope) }`. The
      // `{ … }` JSX wrapper is only valid in JSX child position: when the `<Slot>`
      // is the whole returned/expression node (e.g. `return <Slot />`), the bare
      // expression is emitted instead (mirroring the `<Dynamic>` branch), so the
      // output is a valid `return properties.children` rather than `return {…}`.
      if (isSlotElement(node)) {
        const name = readSlotName(node);
        const fallback = slotFallbackChildren(node).map((child) => ts.visitNode(child, visit) as ts.JsxChild);
        const slotScope = readSlotScope(factory, node, visit);
        const expression = createReactSlotExpression(factory, propertiesParameterName, name, fallback, slotScope);
        const parent = node.parent;
        return parent !== undefined && (ts.isJsxElement(parent) || ts.isJsxFragment(parent))
          ? factory.createJsxExpression(undefined, expression)
          : expression;
      }

      // `h(Slot, { name: 'x' }, …fallback)` — the call form of the marker — →
      // `properties.x ?? …`, equivalently to the `<Slot name="x" />` JSX form
      // above. It appears in `h()` argument / arrow-body position, so the
      // replacement is the bare expression (no `{ … }` JSX wrapper).
      if (isSlotHCall(node)) {
        const name = readSlotHCallName(node);
        const slotScope = readSlotHCallScope(factory, node, visit);
        const fallback = slotHCallFallback(node).map((argument) => ts.visitNode(argument, visit) as ts.Expression);
        return createReactSlotCallExpression(factory, propertiesParameterName, name, fallback, slotScope);
      }

      // `<Dynamic is={X} …>` → `h(X, { … }, …children)` (with `class`→`className`
      // aliasing on the prop keys). React's classic-`h` JSX transform compiles
      // the `h(X, …)` call to a native `createElement(X, …)`. The call is wrapped
      // in `{ … }` in JSX child position and left bare elsewhere.
      if (isDynamicElement(node)) {
        const call = dynamicToHCall(
          factory,
          node,
          (expression) => ts.visitNode(expression, visit) as ts.Expression,
          (name) => REACT_ALIASES[name] ?? name,
          true,
        );
        const parent = node.parent;
        if (parent !== undefined && (ts.isJsxElement(parent) || ts.isJsxFragment(parent))) {
          return factory.createJsxExpression(undefined, call);
        }
        return call;
      }

      // `hasSlot('x')` → `properties.x != null` (default slot → `properties.children != null`),
      // React's native slot-presence check.
      if (isHasSlotCall(node)) {
        return createReactHasSlotExpression(factory, propertiesParameterName, readHasSlotName(node));
      }

      // Rename a neutral type that has a first-class React equivalent
      // (`MpChild` → `ReactNode`) at every reference, so the emitted annotations
      // read idiomatically for React (`buildReactImports` imports the React name
      // from `react`). Type arguments are visited so nested references still map.
      if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName) && REACT_TYPE_ALIASES[node.typeName.text]) {
        return factory.updateTypeReferenceNode(
          node,
          factory.createIdentifier(REACT_TYPE_ALIASES[node.typeName.text]),
          ts.visitNodes(node.typeArguments, visit, ts.isTypeNode),
        );
      }

      // Write-once, framework-split workspace packages (the icon library
      // `@mission-platform/icons`, or `@mission-platform/components` imported via
      // a neutral subpath) are carried through verbatim: each declares an
      // `mp:<framework>` export condition on its bare entry, so the consumer's
      // `resolve.conditions` selects the native build.
      if (
        ts.isImportDeclaration(node) &&
        ts.isStringLiteral(node.moduleSpecifier) &&
        node.moduleSpecifier.text === 'i18next'
      ) {
        const i18nImport = factory.createImportDeclaration(
          undefined,
          factory.createImportClause(
            false,
            undefined,
            factory.createNamedImports([
              factory.createImportSpecifier(false, undefined, factory.createIdentifier('useI18n')),
            ]),
          ),
          factory.createStringLiteral('@mission-platform/i18n'),
        );
        return [i18nImport, node];
      }

      // Flatten relative sibling-component imports.
      if (
        ts.isImportDeclaration(node) &&
        ts.isStringLiteral(node.moduleSpecifier) &&
        node.moduleSpecifier.text.startsWith('.')
      ) {
        return factory.updateImportDeclaration(
          node,
          node.modifiers,
          node.importClause,
          factory.createStringLiteral(flattenComponentSpecifier(node.moduleSpecifier.text)),
          node.attributes,
        );
      }

      // Drop the Stage-1 static marker here only when it appears on a tree the
      // hoist pass will not see (defensive); the dedicated hoist pass strips it
      // from hoisted constants. Skip aliasing so `__mpStatic` is never renamed.
      if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name) && node.name.text === MP_STATIC_ATTR) {
        return node;
      }

      // The neutral `className={…}` attribute already matches React's own
      // spelling, so only its *value* needs collapsing: the array form is
      // reduced to a `classNames(…)` string call (`reactClassNameValue`); any
      // other value is already a single class string and is passed straight
      // through. The value expression is visited first so nested rewrites
      // (e.g. a `<Slot>` read) still apply.
      if (
        ts.isJsxAttribute(node) &&
        ts.isIdentifier(node.name) &&
        node.name.text === CLASS_NAME_ATTRIBUTE &&
        node.initializer !== undefined &&
        ts.isJsxExpression(node.initializer) &&
        node.initializer.expression !== undefined
      ) {
        const value = reactClassNameValue(factory, ts.visitNode(node.initializer.expression, visit) as ts.Expression);
        return factory.updateJsxAttribute(
          node,
          factory.createIdentifier(CLASS_NAME_ATTRIBUTE),
          factory.updateJsxExpression(node.initializer, value),
        );
      }

      // `class`/`for`/`tabindex`/SVG attributes → React aliases in JSX attributes.
      if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name)) {
        const alias = REACT_ALIASES[node.name.text];
        const visitedInitializer = ts.visitNode(node.initializer, visit) as
          ts.JsxExpression | ts.StringLiteral | undefined;
        if (alias !== undefined) {
          return factory.updateJsxAttribute(node, factory.createIdentifier(alias), visitedInitializer);
        }
        if (visitedInitializer !== node.initializer) {
          return factory.updateJsxAttribute(node, node.name, visitedInitializer);
        }
      }

      // `class`/`for`/`tabindex`/SVG attributes → React aliases in object-literal props passed to `h(…)`.
      if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name)) {
        const alias = REACT_ALIASES[node.name.text];
        const visitedInitializer = ts.visitNode(node.initializer, visit) as ts.Expression;
        if (alias !== undefined) {
          return factory.updatePropertyAssignment(node, factory.createIdentifier(alias), visitedInitializer);
        }
        if (visitedInitializer !== node.initializer) {
          return factory.updatePropertyAssignment(node, node.name, visitedInitializer);
        }
      }

      return ts.visitEachChild(node, visit, context);
    };

    return (file) => ts.visitNode(file, visit) as ts.SourceFile;
  };

  // Stage A — rewrite the component body (slots, dynamic elements, aliases, …).
  // The neutral import is deliberately left in place here so a second pass can
  // build the `react` value import *after* the body is known: a `<Slot>` with
  // fallback content compiles to a `<>…</>` fragment (`createElement(Fragment,…)`),
  // which is discovered only once the body has been rewritten.
  const bodyResult = ts.transform(sourceFile, [transformer]);
  const rewritten = bodyResult.transformed[0];

  // A `<>…</>` fragment anywhere in the rewritten module means the classic-`h`
  // JSX transform will reference `Fragment`, so it must be imported from `react`.
  // Conversely, when the neutral source imported `Fragment` only to author empty
  // `<Fragment />` elements (now collapsed to `null`), the now-unused import is
  // dropped — no `<>` survives to reference it.
  const fragmentIndex = neutral.values.indexOf('Fragment');
  if (containsJsxFragment(rewritten)) {
    if (fragmentIndex === -1) {
      neutral.values.push('Fragment');
    }
  } else if (fragmentIndex !== -1) {
    neutral.values.splice(fragmentIndex, 1);
  }

  // Stage B — swap the neutral value/type import for the `react` value import
  // (+ the neutral/local type imports), now that `neutral.values` reflects any
  // emitted `Fragment` usage.
  const importTransformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
    const { factory } = context;
    const visit = (node: ts.Node): ts.Node | ts.Node[] => {
      if (
        ts.isImportDeclaration(node) &&
        ts.isStringLiteral(node.moduleSpecifier) &&
        node.moduleSpecifier.text === NEUTRAL_MODULE
      ) {
        return buildReactImports(factory, neutral);
      }
      return ts.visitEachChild(node, visit, context);
    };
    return (file) => ts.visitNode(file, visit) as ts.SourceFile;
  };

  const importResult = ts.transform(rewritten, [importTransformer]);
  const imported = importResult.transformed[0];
  // Stage C — hoist Stage-1 static-marked subtrees to module-level constants
  // (created once, outside every render), then strip any residual markers.
  const hoisted = stripResidualStaticMarkers(hoistStaticJsx(imported));
  const outputFile =
    isInteractiveReactModule(hoisted) && !hasUseClientDirective(hoisted) && !hasUseServerDirective(hoisted)
      ? ts.factory.updateSourceFile(hoisted, [
          ts.factory.createExpressionStatement(ts.factory.createStringLiteral('use client')),
          ...hoisted.statements,
        ])
      : hoisted;
  const output = printSourceFile(outputFile);
  importResult.dispose();
  bodyResult.dispose();
  return output;
}

/** Strip any `__mpStatic` markers that the hoist pass did not consume. */
function stripResidualStaticMarkers(sourceFile: ts.SourceFile): ts.SourceFile {
  const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
    const { factory } = context;
    const visit = (node: ts.Node): ts.Node => {
      if (ts.isJsxSelfClosingElement(node)) {
        const attributes = stripMpStaticAttributes(factory, node.attributes);
        const visited = ts.visitEachChild(
          factory.updateJsxSelfClosingElement(node, node.tagName, node.typeArguments, attributes),
          visit,
          context,
        );
        return visited;
      }
      if (ts.isJsxElement(node)) {
        const attributes = stripMpStaticAttributes(factory, node.openingElement.attributes);
        const opening = factory.updateJsxOpeningElement(
          node.openingElement,
          node.openingElement.tagName,
          node.openingElement.typeArguments,
          attributes,
        );
        const replaced = factory.updateJsxElement(node, opening, node.children, node.closingElement);
        return ts.visitEachChild(replaced, visit, context);
      }
      return ts.visitEachChild(node, visit, context);
    };
    return (file) => ts.visitNode(file, visit) as ts.SourceFile;
  };
  const result = ts.transform(sourceFile, [transformer]);
  const next = result.transformed[0];
  result.dispose();
  return next;
}

const CLIENT_HOOKS = new Set([
  'useEffect',
  'useLayoutEffect',
  'useInsertionEffect',
  'useReducer',
  'useRef',
  'useState',
  'useImperativeHandle',
  'useContext',
  'createContext',
  'useSyncExternalStore',
  'useTransition',
  'useDeferredValue',
  'useActionState',
  'useOptimistic',
  'useFormStatus',
]);

function hasUseClientDirective(sourceFile: ts.SourceFile): boolean {
  for (const statement of sourceFile.statements) {
    if (!ts.isExpressionStatement(statement) || !ts.isStringLiteralLike(statement.expression)) {
      break;
    }
    if (statement.expression.text === 'use client') {
      return true;
    }
  }
  return false;
}

function hasUseServerDirective(sourceFile: ts.SourceFile): boolean {
  for (const statement of sourceFile.statements) {
    if (!ts.isExpressionStatement(statement) || !ts.isStringLiteralLike(statement.expression)) {
      break;
    }
    if (statement.expression.text === 'use server') {
      return true;
    }
  }
  return false;
}

function isInteractiveReactModule(sourceFile: ts.SourceFile): boolean {
  let interactive = false;
  const walk = (node: ts.Node): void => {
    if (interactive) return;
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && CLIENT_HOOKS.has(node.expression.text)) {
      interactive = true;
      return;
    }
    if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name) && /^on[A-Z]/.test(node.name.text)) {
      interactive = true;
      return;
    }
    if (
      (ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node)) &&
      ts.isIdentifier(node.name) &&
      /^on[A-Z]/.test(node.name.text)
    ) {
      interactive = true;
      return;
    }
    ts.forEachChild(node, walk);
  };
  walk(sourceFile);
  return interactive;
}

/** Whether any `<>…</>` fragment is present in (or below) `root`. */
function containsJsxFragment(root: ts.Node): boolean {
  let found = false;
  const walk = (node: ts.Node): void => {
    if (found) {
      return;
    }
    if (ts.isJsxFragment(node)) {
      found = true;
      return;
    }
    ts.forEachChild(node, walk);
  };
  walk(root);
  return found;
}
