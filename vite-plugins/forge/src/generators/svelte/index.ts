/**
 * Svelte emitter subsystem barrel.
 *
 * Re-exports the module and hook-module emitters the Stage-1 dispatcher
 * (`compiler/compile.ts`) routes the `'svelte'` target to. The subsystem is
 * split into focused files:
 * - `emit-module.ts` — the SFC assembly (runes `<script>` + markup),
 * - `template.ts` — the JSX → Svelte-markup conversion,
 * - `hook-module.ts` — the hook-library passthrough.
 */
export { emitSvelteModule } from './emit-module.js';
export { emitSvelteHookModule } from './hook-module.js';
