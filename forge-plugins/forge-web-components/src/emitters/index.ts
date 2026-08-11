/**
 * Emission role: turning the neutral generic AST into Web-Components source.
 *
 * - `module.ts` — module assembly (imports + retained declarations + class),
 * - `element.ts` — printing the lowered plan as a native `HTMLElement`
 *   (`ForgeElement`) subclass, including its typed property and state fields.
 *
 * Both are printers: every decision is taken by `../lower` and `../optimize`.
 */
export {
  emitWebComponentModule,
  type EmittedWebComponentModule,
} from "./module.js";
export { synthesiseElementClass } from "./element.js";
