/**
 * `useEffect` → Vue effect-helper translation for the Vue emitter.
 *
 * React's `useEffect(callback, deps?)` is routed through the generated Vue-only
 * `mpEffect` helper (see `localEffectModuleSource` in `../../compiler/ast.ts`),
 * which is built on Vue's native `watch`/`onMounted`/`onUpdated`/`onUnmounted`
 * and preserves the run-once / run-on-dependency-change / run-on-every-update
 * semantics and the returned cleanup function. Each effect therefore collapses
 * to a single `mpEffect(callback, () => [deps])` call instead of the inlined
 * per-effect lifecycle block, shrinking each component's `setup` and centralising
 * the wiring in one place.
 */
import ts from 'typescript';

import { type RewriteScope } from '../../compiler/ast.js';

import { rewrite } from './shared.js';

/** Translate a `useEffect(callback, deps?)` call into a single `mpEffect(...)` call. */
export function emitEffect(call: ts.CallExpression, scope: RewriteScope, sourceFile: ts.SourceFile): string[] {
  const callback = call.arguments[0];
  const deps = call.arguments[1];
  const callbackText = rewrite(callback, scope, sourceFile);

  // A dependency array → a `watch` source factory the helper subscribes to (Vue
  // re-runs the effect when any listed value changes). No dependency array → the
  // helper falls back to `onUpdated`, running the effect after every update.
  if (deps !== undefined && ts.isArrayLiteralExpression(deps)) {
    return [`mpEffect(${callbackText}, () => ${rewrite(deps, scope, sourceFile)});`];
  }
  return [`mpEffect(${callbackText});`];
}
