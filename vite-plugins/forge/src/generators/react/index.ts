/**
 * React emitter for the Stage-1 compiler.
 *
 * A neutral component authored against `@mission-platform/forge` is rewritten into
 * a fully native React `.tsx` module. The work is split across:
 *
 * - `aliases.ts` — the DOM attribute aliases (`class` → `className`, …),
 * - `imports.ts` — the neutral → `react` import rewrite, and
 * - `emit-module.ts` — the module transform tying them together.
 */
export { emitReactModule } from './emit-module.js';
