/**
 * Shared types and helpers for the Vue emitter.
 *
 * The Vue target splits a neutral component's body into `setup`-once work and a
 * per-render closure (see `index.ts`). The pieces of that analysis are spread
 * across `scope.ts`, `effects.ts` and `body.ts`; this module holds the small
 * building blocks they all depend on.
 */
import ts from 'typescript';

import {
  createReferenceRewriter,
  createStateSnapshotHoister,
  printNode,
  transformI18nextCalls,
  vueComponentModelListenerTransformer,
  vueJsxSlotTransformer,
  vueNativeEventTransformer,
  type RewriteScope,
} from '../../compiler/ast.js';

/** Mutable accumulator describing the analysed component body. */
export interface VueAnalysis {
  setupLines: string[];
  renderLines: string[];
  /**
   * Every emitted body line in **source order** (setup and render statements
   * interleaved as authored), excluding the final `return`. The component path
   * uses the {@link VueAnalysis.setupLines}/{@link VueAnalysis.renderLines} split
   * (setup runs once, render re-runs); a **composable** runs once top-to-bottom,
   * so its emitter uses this list instead — preserving the authored order avoids
   * a temporal-dead-zone crash when a hook/effect references a local (e.g. a
   * destructured option) that the split would otherwise move below it.
   */
  orderedLines: string[];
  returnText: string;
  propDefaults: Map<string, string>;
  vueImports: Set<string>;
  /**
   * The raw (pre-rewrite) derived statements that, on the render-closure path,
   * become {@link VueAnalysis.renderLines}. The `<template>` path
   * ({@link buildVueTemplate}) consumes these AST nodes directly instead of the
   * printed text, so it can turn each derived `const` into a reactive `computed`.
   */
  renderStatements: ts.Statement[];
  /** The raw (pre-rewrite) returned expression, consumed by the `<template>` path. */
  returnExpression?: ts.Expression;
  /**
   * Every `useRef` local (name → its element type, i.e. the `useRef<T>` type
   * argument with any `| null` / `| undefined` stripped, or `undefined` when the
   * ref is untyped). A ref bound to an element via a `ref="name"` string binding
   * on the `<template>` path is a **template ref** and is re-declared with
   * `useTemplateRef<Element>('name')` (see `emit-module.ts`); anything else keeps
   * its plain `ref(…)` declaration.
   */
  refElementTypes: Map<string, string | undefined>;
}

/**
 * Print a node, then rewrite it for the Vue target and print the rewritten form.
 *
 * The {@link vueJsxSlotTransformer} runs first so a component element with
 * `slot="…"`-tagged children (named-slot **passing**) is rewritten into the
 * `@vitejs/plugin-vue-jsx` object-children syntax before the reference rewriter
 * resolves the identifiers inside the generated slot functions. It is a no-op
 * for every node that does not pass slots, so it is safe to apply universally.
 */
export function rewrite(node: ts.Node, scope: RewriteScope, sourceFile: ts.SourceFile): string {
  const result = ts.transform(node, [
    (context) => (nodeToVisit) => {
      const visit = (child: ts.Node): ts.Node => {
        const transformed = transformI18nextCalls(context.factory, child);
        return ts.visitEachChild(transformed, visit, context);
      };
      return ts.visitNode(nodeToVisit, visit) as ts.Node;
    },
    vueNativeEventTransformer(),
    // A `@model`-paired `onUpdate<Name>` callback forwarded to a child component
    // must bind Vue's `update:<name>` listener (`onUpdate:<name>`), not the
    // camelCase `onUpdate<Name>`, or the two-way update is never wired.
    vueComponentModelListenerTransformer(),
    vueJsxSlotTransformer(),
    createReferenceRewriter(scope),
    // Runs after the reference rewriter so it can see the `<name>.value` reads it
    // produced and restore their control-flow narrowing inside nested closures.
    createStateSnapshotHoister(scope),
  ]);
  const text = printNode(result.transformed[0], sourceFile);
  result.dispose();
  return text;
}

/** The single variable declaration of a `const … = …;` statement, if it is one. */
export function singleDeclaration(statement: ts.Statement): ts.VariableDeclaration | undefined {
  if (!ts.isVariableStatement(statement) || statement.declarationList.declarations.length !== 1) {
    return undefined;
  }
  return statement.declarationList.declarations[0];
}
