/**
 * Native Web-Components emitter subsystem barrel.
 *
 * Re-exports the module and hook-module emitters the Stage-1 dispatcher
 * (`compiler/compile.ts`) routes the `'web-components'` target to. The subsystem
 * is split into focused files:
 * - `emit-module.ts` — module assembly (imports + registrations + class),
 * - `element.ts` — the component-function → native `HTMLElement`
 *   (`ForgeElement`) class synthesis,
 * - `template.ts` — the JSX → tagged `html\`…\`` template conversion (the
 *   lit-html template dialect, interpreted by `@mission-platform/forge/web-components`),
 * - `hook-module.ts` — the hook-library passthrough.
 */
export { emitWebComponentModule } from './emit-module.js';
export { emitWebComponentHookModule } from './hook-module.js';
