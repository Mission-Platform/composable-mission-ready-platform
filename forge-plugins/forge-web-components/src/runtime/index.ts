/**
 * Runtime role: the pieces that face the native `@mission-platform/forge/web-components`
 * runtime rather than the render tree.
 *
 * - `hook-module.ts` — the hook/composable library passthrough, emitted as a
 *   plain `.ts` module against the neutral runtime primitives.
 */
export { emitWebComponentHookModule } from "./hook-module.js";
