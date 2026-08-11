/**
 * SolidJS emitter subsystem barrel.
 *
 * Re-exports the module and hook-module emitters the Forge compiler routes the
 * `'solid'` target to:
 * - `module.ts` — the component emitter (imports, declarations, JSX, reactivity),
 * - `hook-module.ts` — the composable/hook-library emitter.
 */
export { emitSolidHookModule } from "./hook-module.js";
export {
  emitSolidModule,
  type GeneratedSolidModule,
  type SolidEmitOptions,
} from "./module.js";
