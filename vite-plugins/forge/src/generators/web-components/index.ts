/**
 * Web-Components (Lit) emitter subsystem barrel.
 *
 * Re-exports the module and hook-module emitters the Stage-1 dispatcher
 * (`compiler/compile.ts`) routes the `'web-components'` target to. The subsystem
 * is split into focused files:
 * - `emit-module.ts` — module assembly (imports + registrations + class),
 * - `element.ts` — the component-function → `LitElement` class synthesis,
 * - `template.ts` — the JSX → lit-html `html\`…\`` template conversion,
 * - `hook-module.ts` — the hook-library passthrough.
 */
export { emitWebComponentModule } from './emit-module.js';
export { emitWebComponentHookModule } from './hook-module.js';
