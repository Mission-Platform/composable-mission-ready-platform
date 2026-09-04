/**
 * Transformation role: lowering neutral generic records into the target dialect.
 *
 * - `expression.ts` — the identifier-aware rewrite of source-backed expression
 *   text (`properties.x` → `this.x`, `setX(v)` → `this.x = v`, bare state reads,
 *   `hasSlot('x')` → the runtime's slot check),
 * - `props-binding.ts` — the analysis of a props object pattern into the members
 *   it reads and the locals it binds,
 * - `props-type.ts` — the component's own props type, for indexed-access field
 *   annotations,
 * - `template.ts` — the render node → tagged `html\`…\`` template conversion (the
 *   lit-html template dialect interpreted by `@mission-platform/forge-adapters/web-components`).
 */
export {
  type ElementScope,
  HAS_SLOT_RUNTIME,
  isFunctionExpressionText,
  isPureExpressionText,
  MODULE_SCOPE,
  rewriteExpressionText,
  splitConditional,
  splitLogicalAnd,
  stripOuterParentheses,
} from "./expression.js";
export {
  leadingObjectPattern,
  parsePropsBinding,
  type PropsBinding,
  type PropsBindingEntry,
  propsBindingStatement,
} from "./props-binding.js";
export {
  indexedAccessType,
  type PropsTypeReference,
  resolvePropsTypeReference,
  typeMembers,
  unwrapPropsTypeName,
} from "./props-type.js";
export {
  kebabCase,
  lowerStatementText,
  renderNodeToTemplate,
  type TemplateContext,
} from "./template.js";
