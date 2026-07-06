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
  printNode,
  vueJsxSlotTransformer,
  vueNativeEventTransformer,
  type RewriteScope,
} from '../../compiler/ast.js';

/** Mutable accumulator describing the analysed component body. */
export interface VueAnalysis {
  setupLines: string[];
  renderLines: string[];
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
    vueNativeEventTransformer(),
    vueJsxSlotTransformer(),
    createReferenceRewriter(scope),
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
