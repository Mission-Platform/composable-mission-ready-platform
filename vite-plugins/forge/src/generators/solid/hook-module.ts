/**
 * SolidJS hook-module emitter for the Stage-1 compiler.
 *
 * A neutral hook library (a composable, not a component — including a plain
 * context module such as a `createContext`/`useContext` pair) carries no JSX,
 * so the emit is just the reactive-primitive rewrite (`useState` →
 * `createSignal` with getter call-site rewriting, `useEffect` →
 * `createEffect`/`onMount`, `useMemo` → `createMemo`, `useId` →
 * `createUniqueId`) plus the neutral → `solid-js` import swap (see
 * `buildSolidImports`, which now also remaps the context primitives). All
 * rewrites operate on the parsed AST.
 *
 * A hook module may additionally import a **sibling** composable/context
 * module (e.g. `import { MapContext } from '../components/map-context'`) or a
 * write-once, framework-split workspace package (`@mission-platform/icons`,
 * `@mission-platform/components`, …); both are rewritten exactly like the
 * component emitter (`./emit-module.ts`) does — the relative specifier
 * flattened to the generated tree's flat layout, the workspace package
 * remapped to its `./solid` build — so a composable's imports resolve the
 * same way a component's do.
 */
import ts from 'typescript';

import { frameworkSplitModule, NEUTRAL_MODULE, printSourceFile, readNeutralImports } from '../../compiler/ast.js';

import { buildSolidImports } from './imports.js';
import { collectSolidGetters, rewriteGetterReads, rewriteHookCalls, type SolidPrimitiveUsage } from './signals.js';

/** Rewrite a relative sibling import to the flat generated layout (`./<base>`), mirroring the component emitter. */
function flattenSiblingSpecifier(specifier: string): string {
  const segments = specifier.split('/').filter((segment) => segment !== '.' && segment !== '..' && segment.length > 0);
  return `./${segments.at(-1) ?? specifier}`;
}

/** Transform a neutral hook module into its SolidJS source. */
export function emitSolidHookModule(rawSourceFile: ts.SourceFile): string {
  const neutral = readNeutralImports(rawSourceFile);

  const usage: SolidPrimitiveUsage = {
    createSignal: false,
    createMemo: false,
    createEffect: false,
    onMount: false,
    createUniqueId: false,
    mergeProps: false,
  };

  const signalsResult = ts.transform(rawSourceFile, [
    (context) => (file) => {
      const getters = collectSolidGetters(file);
      const hooksRewritten = rewriteHookCalls(context, file, usage);
      return rewriteGetterReads(context, hooksRewritten, getters);
    },
  ]);
  const rewritten = signalsResult.transformed[0];

  const importResult = ts.transform(rewritten, [
    (context) => {
      const { factory } = context;
      const visit = (node: ts.Node): ts.Node | ts.Node[] => {
        if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
          if (node.moduleSpecifier.text === NEUTRAL_MODULE) {
            return buildSolidImports(factory, neutral, usage);
          }
          // Remap a write-once, framework-split workspace import to its `./solid` build.
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
          // Flatten a relative sibling import (a fellow composable/context module).
          if (node.moduleSpecifier.text.startsWith('.')) {
            return factory.updateImportDeclaration(
              node,
              node.modifiers,
              node.importClause,
              factory.createStringLiteral(flattenSiblingSpecifier(node.moduleSpecifier.text)),
              node.attributes,
            );
          }
        }
        return ts.visitEachChild(node, visit, context);
      };
      return (file) => ts.visitNode(file, visit) as ts.SourceFile;
    },
  ]);

  const output = printSourceFile(importResult.transformed[0]);
  importResult.dispose();
  signalsResult.dispose();
  return output;
}
