/**
 * Stage-2 helper shared by the React and Solid emitters: lift JSX subtrees
 * marked {@link MP_STATIC_ATTR} by Stage-1 to **module-level** constants so they
 * are created once (outside any component render / reactive tracking scope)
 * and referenced by name at each use site.
 *
 * The marker attribute is stripped from the hoisted tree so it never appears in
 * framework output. Nested static children of an already-hoisted parent are not
 * hoisted separately (the parent constant captures them).
 */
import ts from "typescript";

import { hasMpStaticMarker, stripMpStaticMarker } from "./optimize.js";

/** Prefix for synthesised hoist binding names (`__mpHoist_0`, …). */
export const MP_HOIST_PREFIX = "__mpHoist_";

/**
 * Hoist every top-level static-marked JSX element in `sourceFile` to a module
 * `const`, replacing each use with a reference to that constant. Returns the
 * rewritten source file (unchanged when nothing was hoistable).
 */
export function hoistStaticJsx(sourceFile: ts.SourceFile): ts.SourceFile {
  const factory = ts.factory;
  const hoisted: ts.VariableStatement[] = [];
  let counter = 0;

  const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
    const visit = (node: ts.Node): ts.Node => {
      // Only hoist outermost static-marked elements — descendants of a hoisted
      // tree are already captured by the parent constant.
      if (
        (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) &&
        hasMpStaticMarker(node)
      ) {
        const cleaned = stripMpStaticMarker(factory, node);
        // Still visit the cleaned tree so nested non-static rewrites (if any)
        // run, but do not hoist nested static markers independently.
        const visitedCleaned = ts.visitEachChild(
          cleaned,
          (child) => ts.visitEachChild(child, visitNested, context),
          context,
        );
        const name = `${MP_HOIST_PREFIX}${counter}`;
        counter += 1;
        hoisted.push(
          factory.createVariableStatement(
            undefined,
            factory.createVariableDeclarationList(
              [
                factory.createVariableDeclaration(
                  factory.createIdentifier(name),
                  undefined,
                  undefined,
                  visitedCleaned as ts.Expression,
                ),
              ],
              ts.NodeFlags.Const,
            ),
          ),
        );
        const reference = factory.createIdentifier(name);
        const parent = node.parent;
        if (
          parent !== undefined &&
          (ts.isJsxElement(parent) || ts.isJsxFragment(parent))
        ) {
          return factory.createJsxExpression(undefined, reference);
        }
        return reference;
      }
      return ts.visitEachChild(node, visit, context);
    };

    // Nested walk: strip any residual static markers without hoisting again
    // (defensive — parents already absorb static children).
    const visitNested = (node: ts.Node): ts.Node => {
      if (
        (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) &&
        hasMpStaticMarker(node)
      ) {
        const cleaned = stripMpStaticMarker(factory, node);
        return ts.visitEachChild(cleaned, visitNested, context);
      }
      return ts.visitEachChild(node, visitNested, context);
    };

    return (file) => ts.visitNode(file, visit) as ts.SourceFile;
  };

  const result = ts.transform(sourceFile, [transformer]);
  const rewritten = result.transformed[0];
  result.dispose();

  if (hoisted.length === 0) {
    return sourceFile;
  }

  // Insert hoist consts after the leading import block so they sit at module
  // scope before any component / helper declaration that references them.
  let insertAt = 0;
  for (let index = 0; index < rewritten.statements.length; index += 1) {
    const statement = rewritten.statements[index];
    if (
      ts.isImportDeclaration(statement) ||
      ts.isImportEqualsDeclaration(statement)
    ) {
      insertAt = index + 1;
      continue;
    }
    // Keep a leading `"use client"` / directive string ahead of hoists.
    if (
      ts.isExpressionStatement(statement) &&
      ts.isStringLiteralLike(statement.expression) &&
      index === 0
    ) {
      insertAt = index + 1;
      continue;
    }
    break;
  }

  const statements = [
    ...rewritten.statements.slice(0, insertAt),
    ...hoisted,
    ...rewritten.statements.slice(insertAt),
  ];
  return factory.updateSourceFile(rewritten, statements);
}
