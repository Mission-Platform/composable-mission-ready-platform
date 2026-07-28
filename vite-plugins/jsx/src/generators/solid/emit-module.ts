/**
 * SolidJS module emitter for the Stage-1 compiler.
 *
 * A neutral component is a pure function of its props returning JSX in the
 * classic-`h` dialect; SolidJS also compiles JSX (through `vite-plugin-solid`),
 * so the Solid target — like React — is an AST rewrite of the original module
 * rather than a template transpile. It differs from React in three ways:
 *
 * - **Reactivity**: the neutral React-style hooks are rewritten to Solid
 *   primitives (`createSignal`/`createMemo`/`createEffect`/`onMount`/
 *   `createUniqueId`), and — because a Solid component runs once — every read of
 *   a `useState`/`useMemo` binding is rewritten to a getter call (see
 *   `./signals`).
 * - **DOM vocabulary**: the neutral React camelCase names are aliased back to
 *   Solid's DOM names (`className` → `class`, `htmlFor` → `for`).
 * - **Types**: `MpChild`/`MpElement` resolve to Solid's `JSX.Element`.
 *
 * Slot / dynamic / `hasSlot` semantics are identical to React (props-object
 * access), so the shared React slot/dynamic builders are reused directly.
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
  frameworkSplitModule,
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

import { SOLID_ALIASES } from './aliases.js';
import { buildSolidImports, SOLID_ELEMENT_TYPE_NAMES } from './imports.js';
import { collectSolidGetters, rewriteGetterReads, rewriteHookCalls, type SolidPrimitiveUsage } from './signals.js';

/** Rewrite a relative sibling-component import to the flat generated layout (`./<base>`). */
function flattenComponentSpecifier(specifier: string): string {
  const segments = specifier.split('/').filter((segment) => segment !== '.' && segment !== '..' && segment.length > 0);
  return `./${segments.at(-1) ?? specifier}`;
}

/** Transform the whole module into the SolidJS target source. */
export function emitSolidModule(
  rawSourceFile: ts.SourceFile,
  componentName?: string,
  _componentFolders?: ReadonlySet<string>,
): { code: string; extraModules?: { name: string; code: string; lang: 'tsx' | 'ts' | 'svelte' | 'vue' }[] } {
  const sourceFile = ensureI18nHookInComponent(ts.factory, rawSourceFile);
  const neutral = readNeutralImports(sourceFile);

  if (usesClassNamesArrayAttribute(sourceFile) && !neutral.values.includes('classNames')) {
    neutral.values.push('classNames');
  }

  const component = componentName === undefined ? undefined : findComponentFunction(sourceFile, componentName);
  const parameter = component?.parameters[0];
  const propertiesParameterName =
    parameter !== undefined && ts.isIdentifier(parameter.name) ? parameter.name.text : 'properties';

  let usesDynamic = false;

  const bodyTransformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
    const { factory } = context;

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

      // A neutral empty `<Fragment />` renders nothing → `null`; a fragment with
      // children uses the `<>…</>` shorthand Solid compiles natively.
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

      // Named-slot passing: `<X><b slot="t"/>panel</X>` → `<X t={<b/>}>panel</X>`.
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

      // `<Slot name="x" />` → `{ properties.x }` (props-object access, as React).
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

      if (isSlotHCall(node)) {
        const name = readSlotHCallName(node);
        const slotScope = readSlotHCallScope(factory, node, visit);
        const fallback = slotHCallFallback(node).map((argument) => ts.visitNode(argument, visit) as ts.Expression);
        return createReactSlotCallExpression(factory, propertiesParameterName, name, fallback, slotScope);
      }

      // `<Dynamic is={X} …>` → `h(X, { … }, …children)` via Solid's hyperscript.
      if (isDynamicElement(node)) {
        usesDynamic = true;
        const call = dynamicToHCall(
          factory,
          node,
          (expression) => ts.visitNode(expression, visit) as ts.Expression,
          (name) => SOLID_ALIASES[name] ?? name,
          true,
        );
        const parent = node.parent;
        if (parent !== undefined && (ts.isJsxElement(parent) || ts.isJsxFragment(parent))) {
          return factory.createJsxExpression(undefined, call);
        }
        return call;
      }

      if (isHasSlotCall(node)) {
        return createReactHasSlotExpression(factory, propertiesParameterName, readHasSlotName(node));
      }

      // `MpChild`/`MpElement` type references → Solid's `JSX.Element`.
      if (
        ts.isTypeReferenceNode(node) &&
        ts.isIdentifier(node.typeName) &&
        SOLID_ELEMENT_TYPE_NAMES.has(node.typeName.text)
      ) {
        return factory.createTypeReferenceNode(
          factory.createQualifiedName(factory.createIdentifier('JSX'), factory.createIdentifier('Element')),
          undefined,
        );
      }

      // Remap write-once, framework-split workspace packages to their `./solid` build.
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        if (node.moduleSpecifier.text === 'i18next') {
          const i18nImport = factory.createImportDeclaration(
            undefined,
            factory.createImportClause(
              false,
              undefined,
              factory.createNamedImports([
                factory.createImportSpecifier(false, undefined, factory.createIdentifier('useI18n')),
              ]),
            ),
            factory.createStringLiteral('@mission-platform/i18n/solid'),
          );
          return [i18nImport, node];
        }
        const frameworkModule = frameworkSplitModule(node.moduleSpecifier.text, 'solid');
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

      if (
        ts.isExportDeclaration(node) &&
        node.moduleSpecifier !== undefined &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        const frameworkModule = frameworkSplitModule(node.moduleSpecifier.text, 'solid');
        if (frameworkModule !== undefined) {
          return factory.updateExportDeclaration(
            node,
            node.modifiers,
            node.isTypeOnly,
            node.exportClause,
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

      // `className={[…]}` → `class={classNames(…)}` (name aliased, value collapsed).
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
          factory.createIdentifier('class'),
          factory.updateJsxExpression(node.initializer, value),
        );
      }

      // `className`/`htmlFor` → Solid DOM aliases in JSX attributes.
      if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name)) {
        const alias = SOLID_ALIASES[node.name.text];
        const visitedInitializer = ts.visitNode(node.initializer, visit) as
          | ts.JsxExpression
          | ts.StringLiteral
          | undefined;
        if (alias !== undefined) {
          return factory.updateJsxAttribute(node, factory.createIdentifier(alias), visitedInitializer);
        }
        if (visitedInitializer !== node.initializer) {
          return factory.updateJsxAttribute(node, node.name, visitedInitializer);
        }
      }

      // `className`/`htmlFor` → Solid DOM aliases in object-literal props passed to `h(…)`.
      if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name)) {
        const alias = SOLID_ALIASES[node.name.text];
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

  // Stage A — rewrite the component body (slots, dynamic, aliases, types).
  const bodyResult = ts.transform(sourceFile, [bodyTransformer]);
  const rewrittenBody = bodyResult.transformed[0];

  // Stage B — reactive-primitive rewrites (collect getter names first, then map
  // the hook calls, then rewrite every getter read to a call).
  const usage: SolidPrimitiveUsage = {
    createSignal: false,
    createMemo: false,
    createEffect: false,
    onMount: false,
    createUniqueId: false,
    mergeProps: false,
  };
  const signalsResult = ts.transform(rewrittenBody, [
    (context) => (file) => {
      const getters = collectSolidGetters(file);
      const hooksRewritten = rewriteHookCalls(context, file, usage);
      return rewriteGetterReads(context, hooksRewritten, getters);
    },
  ]);
  const rewritten = signalsResult.transformed[0];

  // A `<Dynamic>` compiled to a hyperscript `h(…)` call means `h` must be
  // imported from `solid-js/h` even when the author never imported it.
  if (usesDynamic && !neutral.values.includes('h')) {
    neutral.values.push('h');
  }

  // Stage C — swap the neutral import for the `solid-js` value + type imports.
  const importTransformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
    const { factory } = context;
    const visit = (node: ts.Node): ts.Node | ts.Node[] => {
      if (
        ts.isImportDeclaration(node) &&
        ts.isStringLiteral(node.moduleSpecifier) &&
        node.moduleSpecifier.text === NEUTRAL_MODULE
      ) {
        return buildSolidImports(factory, neutral, usage);
      }
      return ts.visitEachChild(node, visit, context);
    };
    return (file) => ts.visitNode(file, visit) as ts.SourceFile;
  };

  const importResult = ts.transform(rewritten, [importTransformer]);
  const output = printSourceFile(importResult.transformed[0]);
  importResult.dispose();
  signalsResult.dispose();
  bodyResult.dispose();
  return { code: output };
}
