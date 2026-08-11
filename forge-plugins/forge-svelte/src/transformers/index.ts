export { componentImports, hookImports } from "./imports.js";
export {
  EMPTY_SCOPE,
  readsChildren,
  scopeExpression,
  svelteClassValue,
} from "./expression.js";
export type { SvelteScope } from "./expression.js";
export {
  arrayBindingNames,
  branchStatements,
  isChildrenListNormalization,
  isSelfShadowingWrapper,
  objectBindingEntries,
  readIfStatement,
  readPropNames,
  readPushStatement,
  readReturnExpression,
  readSameNamePropDefault,
  readVariableStatement,
} from "./statements.js";
export type {
  DestructuredProperty,
  IfStatement,
  PushStatement,
  VariableStatement,
} from "./statements.js";
export { nodesWithin, renderExpression, renderNode } from "./template.js";
export type { JsxConstant, SvelteTemplateContext } from "./template.js";
