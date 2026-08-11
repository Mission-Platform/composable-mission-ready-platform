/** Vue source emitters: the SFC assembler, the component and the composable. */
export {
  emitVueModule,
  type EmittedExtraModule,
  type EmittedVueModule,
} from "./component.js";
export { emitVueHookModule } from "./hook-module.js";
export { assembleSfc, type SfcParts } from "./sfc.js";
