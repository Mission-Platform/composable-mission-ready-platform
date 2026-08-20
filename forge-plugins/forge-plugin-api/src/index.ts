import type { FrameworkOutputPlugin } from "./framework.js";

export type {
  FrameworkBuildAdapters,
  FrameworkOutputPlugin,
  FrameworkSourceMetadata,
  GeneratedExtraModule,
  GeneratedModule,
  GeneratorContext,
  JsxFramework,
  NeutralOptimizeOptions,
  OutputLanguage,
  TargetContext,
  TargetComponentHost,
  TargetIntentions,
  TargetLoweredModule,
  TargetOptimizeOptions,
  TsdownBuildContext,
  ViteBuildContext,
} from "./framework.js";
export type { FrameworkOutputPluginSelection } from "./framework.js";
export {
  CompilerDiagnosticError,
  createCompilerDiagnostic,
  formatCompilerDiagnostic,
  throwOnCompilerErrors,
} from "./diagnostics.js";
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Validate target metadata independently of any framework registry. */
export function validateForgeOutputPlugin(
  plugin: unknown,
): asserts plugin is FrameworkOutputPlugin {
  if (!isRecord(plugin)) {
    throw new TypeError("A Forge output plugin must be an object.");
  }
  if (typeof plugin.id !== "string" || plugin.id.length === 0) {
    throw new TypeError("A Forge output plugin must define a non-empty id.");
  }
  if (
    plugin.version !== undefined &&
    (typeof plugin.version !== "string" || plugin.version.length === 0)
  ) {
    throw new TypeError(
      `Forge output plugin "${plugin.id}" version must be a non-empty string.`,
    );
  }
  if (
    typeof plugin.outputLanguage !== "string" ||
    plugin.outputLanguage.length === 0
  ) {
    throw new TypeError(
      `Forge output plugin "${plugin.id}" must define outputLanguage.`,
    );
  }
  if (!isRecord(plugin.source)) {
    throw new TypeError(
      `Forge output plugin "${plugin.id}" must define source metadata.`,
    );
  }
  for (const field of [
    "componentExtension",
    "composableExtension",
    "entryExtension",
  ]) {
    if (
      typeof plugin.source[field] !== "string" ||
      plugin.source[field].length === 0
    ) {
      throw new TypeError(
        `Forge output plugin "${plugin.id}" source.${field} must be a non-empty string.`,
      );
    }
  }
  if (
    typeof plugin.source.componentImportExtension !== "string" ||
    !["default", "named", "element"].includes(
      plugin.source.componentExport as string,
    )
  ) {
    throw new TypeError(
      `Forge output plugin "${plugin.id}" must define valid source export metadata.`,
    );
  }
  for (const method of ["lower", "optimize", "generate"] as const) {
    if (typeof plugin[method] !== "function") {
      throw new TypeError(
        `Forge output plugin "${plugin.id}" must define ${method}().`,
      );
    }
  }
  if (!isRecord(plugin.build)) {
    throw new TypeError(
      `Forge output plugin "${plugin.id}" must define a build adapter configuration.`,
    );
  }
  const adapters = [plugin.build.vite, plugin.build.tsdown];
  if (
    adapters.some(
      (adapter) => adapter !== undefined && typeof adapter !== "function",
    )
  ) {
    throw new TypeError(
      `Forge output plugin "${plugin.id}" must define valid Vite or tsdown adapters.`,
    );
  }
}

/** Validate a caller-owned target selection, including empty and duplicate IDs. */
export function validateForgeOutputPluginSelection<
  T extends FrameworkOutputPlugin,
>(plugins: readonly T[]): readonly T[] {
  if (plugins.length === 0) {
    throw new TypeError("Forge output plugin selection must not be empty.");
  }
  const seen = new Set<string>();
  for (const plugin of plugins) {
    validateForgeOutputPlugin(plugin);
    if (seen.has(plugin.id)) {
      throw new TypeError(
        `Forge output plugin selection contains duplicate target id "${plugin.id}".`,
      );
    }
    seen.add(plugin.id);
  }
  return plugins;
}

/** Validate and return a framework output plugin for registration by consumers. */
export function defineForgeOutputPlugin<T extends FrameworkOutputPlugin>(
  plugin: T,
): T {
  validateForgeOutputPlugin(plugin);
  return plugin;
}

/** Alias emphasizing that framework packages register target implementations. */
export const defineForgeFramework = defineForgeOutputPlugin;
