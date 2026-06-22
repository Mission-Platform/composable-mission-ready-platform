/**
 * `useEffect` → Vue lifecycle translation for the Vue emitter.
 *
 * React's `useEffect(callback, deps?)` is mirrored with Vue lifecycle hooks
 * (`onMounted`/`watch`/`onUpdated`/`onUnmounted`), preserving the
 * run-once / run-on-dependency-change / run-on-every-commit semantics and the
 * returned cleanup function.
 */
import ts from 'typescript';

import { type RewriteScope } from '../../compiler/ast.js';

import { rewrite } from './shared.js';

/** Translate a `useEffect(callback, deps?)` call into Vue lifecycle statements. */
export function emitEffect(
  call: ts.CallExpression,
  index: number,
  scope: RewriteScope,
  sourceFile: ts.SourceFile,
  vueImports: Set<string>,
): string[] {
  const callback = call.arguments[0];
  const deps = call.arguments[1];
  const callbackText = rewrite(callback, scope, sourceFile);
  const cleanup = `__cleanup${index}`;
  const runner = `__effect${index}`;

  vueImports.add('onMounted');
  vueImports.add('onUnmounted');

  const lines = [
    `let ${cleanup}: (() => void) | undefined;`,
    `const ${runner} = () => {`,
    `  ${cleanup}?.();`,
    `  const __result${index} = (${callbackText})();`,
    `  ${cleanup} = typeof __result${index} === 'function' ? __result${index} : undefined;`,
    `};`,
    `onMounted(${runner});`,
  ];

  if (deps !== undefined && ts.isArrayLiteralExpression(deps)) {
    // React re-runs the effect when a dependency changes; mirror with `watch`
    // (after mount, so template refs are populated by the initial `onMounted`).
    vueImports.add('watch');
    lines.push(`watch(() => ${rewrite(deps, scope, sourceFile)}, ${runner});`);
  } else {
    // No dependency array → run after every commit.
    vueImports.add('onUpdated');
    lines.push(`onUpdated(${runner});`);
  }

  lines.push(`onUnmounted(() => { ${cleanup}?.(); });`);
  return lines;
}
