/**
 * SolidJS emitter subsystem barrel.
 *
 * Re-exports the module and hook-module emitters the Stage-1 dispatcher
 * (`compiler/compile.ts`) routes the `'solid'` target to. The subsystem is split
 * into focused files mirroring the React/Vue emitters:
 * - `emit-module.ts` — the component transformer (JSX + reactive rewrites),
 * - `hook-module.ts` — the composable/hook-library transformer,
 * - `signals.ts` — the reactive-primitive (signal/memo/effect/ref/id) rewrites,
 * - `imports.ts` — the neutral → `solid-js` import rewriting,
 * - `aliases.ts` — the DOM attribute aliases (`className` → `class`, …).
 */
export { emitSolidModule } from './emit-module.js';
export { emitSolidHookModule } from './hook-module.js';
