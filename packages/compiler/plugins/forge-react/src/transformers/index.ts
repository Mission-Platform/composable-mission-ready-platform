/** JSX / attribute / slot / dynamic lowering for the React target. */
export { aliasAttributeName, CLIENT_HOOKS, REACT_ALIASES } from "./aliases.js";
export {
  createLoweringContext,
  type ReactLoweringContext,
  type ReactLoweringOptions,
} from "./context.js";
export {
  aliasObjectLiteralKeys,
  DYNAMIC_TAG,
  lowerExpressionText,
  objectLiteral,
  propertyEntry,
  scopedSlotRead,
  SLOT_TAG,
  slotAccess,
  withSlotFallback,
} from "./expressions.js";
export {
  lowerRenderNode,
  lowerTextWithRenderNodes,
  MP_HOIST_PREFIX,
  type LoweredRenderNode,
} from "./jsx.js";
export {
  callsUseI18n,
  I18N_HOOK_STATEMENT,
  lowerStatement,
  usesTranslation,
} from "./statements.js";
export {
  columnAt,
  findCall,
  indentContinuationLines,
  isIdentifierName,
  matchingBracket,
  memberAccess,
  quoteAttributeValue,
  quoteString,
  readStringLiteral,
  replaceFirst,
  rewriteCalls,
  splitTopLevelArguments,
  type CallSite,
} from "./source-text.js";
