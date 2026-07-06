/**
 * React module emitter for the Stage-1 compiler.
 *
 * A neutral component is already, structurally, a React function component: it
 * is a pure function of its props returning JSX in the classic-`h` dialect. So
 * the React target is a light source rewrite of the original module:
 *
 * - the `@mission-platform/jsx` import is split into a value import from `react`
 *   (`h` → `createElement`, `Fragment`, and the hooks, which *are* React's own)
 *   and a type-only import kept against the neutral package, and
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
  CLASS_NAMES_ATTRIBUTE,
  createReactHasSlotExpression,
  createReactSlotCallExpression,
  createReactSlotExpression,
  dynamicToHCall,
  findComponentFunction,
  frameworkSplitModule,
  hasSlottedChildren,
  isComponentTagName,
  isDynamicElement,
  isHasSlotCall,
  isSlotElement,
  isSlotHCall,
  NEUTRAL_MODULE,
  partitionSlottedChildren,
  printSourceFile,
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
  usesClassNamesArrayAttribute,
} from '../../compiler/ast.js';

import { REACT_ALIASES } from './aliases.js';
import { buildReactImports } from './imports.js';

/** Rewrite a relative sibling-component import to the flat generated layout (`./<base>`). */
function flattenComponentSpecifier(specifier: string): string {
  const segments = specifier.split('/').filter((segment) => segment !== '.' && segment !== '..' && segment.length > 0);
  return `./${segments.at(-1) ?? specifier}`;
}

/** Transform the whole module into the React target source. */
export function emitReactModule(sourceFile: ts.SourceFile, componentName?: string): string {
  const neutral = readNeutralImports(sourceFile);

  // The `classNames={[…]}` array form collapses to a `classNames(…)` runtime
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
      // Named-slot **passing**: a component element whose children carry
      // `slot="x"` markers — `<BaseDropdown><button slot="trigger"/>panel</BaseDropdown>`
      // — becomes `<BaseDropdown trigger={<button/>}>panel</BaseDropdown>`, so the
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
      // extra attributes make it a render-prop call `{ properties.x?.(scope) }`.
      if (isSlotElement(node)) {
        const name = readSlotName(node);
        const fallback = slotFallbackChildren(node).map((child) => ts.visitNode(child, visit) as ts.JsxChild);
        const slotScope = readSlotScope(factory, node, visit);
        return factory.createJsxExpression(
          undefined,
          createReactSlotExpression(factory, propertiesParameterName, name, fallback, slotScope),
        );
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

      // Replace the neutral import with React value + neutral type imports.
      if (
        ts.isImportDeclaration(node) &&
        ts.isStringLiteral(node.moduleSpecifier) &&
        node.moduleSpecifier.text === NEUTRAL_MODULE
      ) {
        return buildReactImports(factory, neutral);
      }

      // Remap a write-once, framework-split workspace package (the icon library
      // `@mission-platform/icons`, or `@mission-platform/components` imported via
      // a neutral subpath) to its `./react` build. Those packages ship only the
      // per-framework builds, so the neutral imports (e.g. `<IconX />` tags or a
      // reused `BaseDrawer`) resolve to the native React components.
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const frameworkModule = frameworkSplitModule(node.moduleSpecifier.text, 'react');
        if (frameworkModule !== undefined) {
          return factory.updateImportDeclaration(
            node,
            node.modifiers,
            node.importClause,
            factory.createStringLiteral(frameworkModule),
            node.attributes,
          );
        }
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

      // `classNames={…}` → `className={…}`. The array form is collapsed to a
      // `classNames(…)` string call (`reactClassNameValue`); any other value is
      // already a single class string and is passed straight through. The value
      // expression is visited first so nested rewrites (e.g. a `<Slot>` read)
      // still apply.
      if (
        ts.isJsxAttribute(node) &&
        ts.isIdentifier(node.name) &&
        node.name.text === CLASS_NAMES_ATTRIBUTE &&
        node.initializer !== undefined &&
        ts.isJsxExpression(node.initializer) &&
        node.initializer.expression !== undefined
      ) {
        const value = reactClassNameValue(factory, ts.visitNode(node.initializer.expression, visit) as ts.Expression);
        return factory.updateJsxAttribute(
          node,
          factory.createIdentifier('className'),
          factory.updateJsxExpression(node.initializer, value),
        );
      }

      // `class`/`for` → React aliases in JSX attributes.
      if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name)) {
        const alias = REACT_ALIASES[node.name.text];
        if (alias !== undefined) {
          return factory.updateJsxAttribute(node, factory.createIdentifier(alias), node.initializer);
        }
      }

      // `class`/`for` → React aliases in object-literal props passed to `h(…)`.
      if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name)) {
        const alias = REACT_ALIASES[node.name.text];
        if (alias !== undefined) {
          return factory.updatePropertyAssignment(
            node,
            factory.createIdentifier(alias),
            ts.visitNode(node.initializer, visit) as ts.Expression,
          );
        }
      }

      return ts.visitEachChild(node, visit, context);
    };

    return (file) => ts.visitNode(file, visit) as ts.SourceFile;
  };

  const result = ts.transform(sourceFile, [transformer]);
  const output = printSourceFile(result.transformed[0]);
  result.dispose();
  return output;
}
