/** Reactive, expression, JSX, import and statement lowering for the SolidJS target. */
export { constantMemoValue, isConstantExpression } from "./constants.js";
export {
  collectSolidGetters,
  createSolidLoweringContext,
  type SolidLoweringContext,
  type SolidLoweringOptions,
  type SolidPrimitiveUsage,
  type SolidRuntimeUsage,
} from "./context.js";
export {
  aliasObjectLiteralKeys,
  FACTORY_NAME,
  lowerExpressionText,
  lowerStatementText,
  quoteAttributeValue,
  quoteExpressionString,
  refCallback,
  renameNeutralElementTypes,
  scopedSlotRead,
  slotAccess,
  withSlotFallback,
} from "./expressions.js";
export {
  buildSolidImports,
  flattenSiblingSpecifier,
  printSolidImports,
  readNeutralImportNames,
  type NeutralImportNames,
} from "./imports.js";
export {
  lowerRenderNode,
  lowerStatementWithRenderNodes,
  lowerTextWithRenderNodes,
  spliceRenderNodes,
  type LoweredRenderNode,
} from "./jsx.js";
export {
  isTypeOnlyStatement,
  lowerReactiveCalls,
  rewriteGetterReads,
  rewriteStatementGetterReads,
} from "./signals.js";
export {
  callsUseI18n,
  I18N_HOOK_STATEMENT,
  lowerStatement,
} from "./statements.js";
export {
  columnAt,
  findCall,
  indent,
  indexOfAssignment,
  indexOfTopLevel,
  isArrowParameterList,
  isPlainIdentifier,
  matchBracket,
  memberAccess,
  parseObjectEntries,
  printObjectLiteral,
  printObjectMember,
  quote,
  replaceFirst,
  rewriteCalls,
  rewriteIdentifiers,
  scanIdentifiers,
  skipTrivia,
  splitTopLevel,
  stripOuterParentheses,
  unquote,
  type CallSite,
  type IdentifierOccurrence,
  type ObjectEntry,
} from "./text.js";
