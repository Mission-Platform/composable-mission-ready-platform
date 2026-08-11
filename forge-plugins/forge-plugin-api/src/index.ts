import type { FrameworkOutputPlugin } from "./framework.js";

export type {
  FrameworkBuildAdapters,
  FrameworkOutputPlugin,
  FrameworkSourceMetadata,
  GeneratedExtraModule,
  GeneratedModule,
  GeneratorContext,
  NeutralOptimizeOptions,
  OutputLanguage,
  TargetContext,
  TargetIntentions,
  TargetLoweredModule,
  TargetOptimizeOptions,
  TsdownBuildContext,
  ViteBuildContext,
} from "./framework.js";
export { createCompilerDiagnostic } from "./diagnostics.js";
export type {
  CompilerDiagnostic,
  CompilerDiagnosticSeverity,
  CompilerPhase,
} from "./diagnostics.js";
export type {
  DynamicNodeIntention,
  EffectIntention,
  EventIntention,
  GenericAstNode,
  GenericAttribute,
  GenericAttributeValue,
  GenericBindingKind,
  GenericComponent,
  GenericExpressionNode,
  GenericImport,
  GenericJsxAttribute,
  GenericJsxSpreadAttribute,
  GenericModuleAst,
  GenericParameter,
  GenericRenderChild,
  GenericRenderNode,
  GenericStatement,
  GenericStatementKind,
  GenericTagKind,
  GenericTextNode,
  ListKeyIntention,
  MemoIntention,
  PropIntention,
  RefIntention,
  SemanticIntentions,
  SemanticModule,
  SourceBackedExpression,
  SourceSpan,
  StateIntention,
  SlotIntention,
} from "./ir.js";
export {
  attributeExpressionText,
  attributeStringValue,
  EMPTY_SEMANTIC_INTENTIONS,
  EMPTY_SPAN,
  findAttribute,
  isExpressionNode,
  isRenderNode,
  isTextNode,
  renderNodeTagName,
  sourceBacked,
  walkRenderNodes,
} from "./ir.js";

export type ForgePluginId = FrameworkOutputPlugin["id"];

/** Validate and return a framework output plugin for registration by consumers. */
export function defineForgeOutputPlugin<T extends FrameworkOutputPlugin>(
  plugin: T,
): T {
  if (typeof plugin !== "object" || plugin === null) {
    throw new TypeError("A Forge output plugin must be an object.");
  }
  if (typeof plugin.id !== "string" || plugin.id.length === 0) {
    throw new TypeError("A Forge output plugin must define a non-empty id.");
  }
  if (
    typeof plugin.outputLanguage !== "string" ||
    plugin.outputLanguage.length === 0
  ) {
    throw new TypeError(
      `Forge output plugin "${plugin.id}" must define outputLanguage.`,
    );
  }
  for (const method of ["lower", "optimize", "generate"] as const) {
    if (typeof plugin[method] !== "function") {
      throw new TypeError(
        `Forge output plugin "${plugin.id}" must define ${method}().`,
      );
    }
  }
  if (typeof plugin.build !== "object" || plugin.build === null) {
    throw new TypeError(
      `Forge output plugin "${plugin.id}" must define build adapters.`,
    );
  }
  return plugin;
}

/** Alias emphasizing that framework packages register target implementations. */
export const defineForgeFramework = defineForgeOutputPlugin;
