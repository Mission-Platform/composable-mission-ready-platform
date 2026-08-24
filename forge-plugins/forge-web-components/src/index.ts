import {
  defineForgeOutputPlugin,
  frameworkAdapterModule,
} from "@mission-platform/forge-plugin-api";

import { emitWebComponentModule } from "./emitters/module.js";
import {
  inferWebComponentsHost,
  isWebComponentsLowered,
  lowerWebComponentsModule,
  lowerWebComponentsPlan,
} from "./lower.js";
import { optimizeWebComponentsModule } from "./optimize.js";
import { emitWebComponentHookModule } from "./runtime/hook-module.js";

import type {
  FrameworkBuildAdapters,
  FrameworkOutputPlugin,
  SemanticModule,
  TargetComponentHost,
  TargetContext,
  TargetIntentions,
  TargetOptimizeOptions,
} from "@mission-platform/forge-plugin-api";

const BUILD: FrameworkBuildAdapters = { vite: () => [], tsdown: () => [] };

/** Host metadata for components shared across independently built packages. */
const SHARED_COMPONENT_HOSTS = {
  "forge-dropdown": { baseTag: "div", invocation: "is-attribute" },
  "forge-typography": { invocation: "custom-tag" },
} as const satisfies Readonly<Record<string, TargetComponentHost>>;

function componentTagName(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

/** Create the TypeScript-only Web Components output plugin. */
export function forgeWebComponentsFramework(): FrameworkOutputPlugin {
  return defineForgeOutputPlugin({
    id: "web-components",
    outputLanguage: "ts",
    hookOutputLanguage: "ts",
    source: {
      componentExtension: ".ts",
      componentImportExtension: "",
      composableExtension: ".ts",
      entryExtension: ".ts",
      componentExport: "element",
    },
    runtimeExternals: [
      "@mission-platform/forge",
      frameworkAdapterModule("web-components"),
    ],
    displayNameSuffix: "WebComponents",
    prepareComponentHosts(
      modules: readonly { componentName: string; module: SemanticModule }[],
    ): ReadonlyMap<string, TargetComponentHost> {
      return new Map([
        ...Object.entries(SHARED_COMPONENT_HOSTS),
        ...modules.map(({ componentName, module }) => {
          const host = inferWebComponentsHost(
            module.ast.component?.returnNode,
            module.ast.component,
          );
          return [
            componentTagName(componentName),
            {
              baseTag: host.baseTag,
              invocation: host.invocation,
            },
          ] as const;
        }),
      ]);
    },
    lower: lowerWebComponentsModule,
    optimize(
      intentions: TargetIntentions,
      options: TargetOptimizeOptions,
    ): TargetIntentions {
      return optimizeWebComponentsModule(intentions, options);
    },
    generate(intentions: TargetIntentions, context: TargetContext) {
      if (context.moduleKind === "composable") {
        return {
          code: emitWebComponentHookModule(intentions.module),
          lang: "ts" as const,
        };
      }
      const componentName = context.componentName ?? "CustomElement";
      // A caller that skipped the lowering phase still gets a plan, so the
      // emitter is never handed a half-built module.
      const plan = isWebComponentsLowered(intentions.lowered)
        ? intentions.lowered
        : lowerWebComponentsPlan(intentions.module, context);
      const generated = emitWebComponentModule(
        intentions.module,
        componentName,
        context.componentFolders,
        plan,
      );
      return {
        code: generated.code,
        lang: "ts" as const,
        extraModules: generated.extraModules,
      };
    },
    build: BUILD,
  });
}

export {
  isWebComponentsLowered,
  lowerWebComponentsModule,
  lowerWebComponentsPlan,
  DEFAULT_WEBCOMPONENTS_INTERNALS_POLICY,
  DEFAULT_WEBCOMPONENTS_SHADOW_POLICY,
  inferWebComponentsHost,
  UNKNOWN_TYPE,
  WEBCOMPONENTS_NATIVE_HOSTS,
  WEB_COMPONENTS_FRAMEWORK,
  type WebComponentsCleanupField,
  type WebComponentsDerivedBody,
  type WebComponentsDerivedValue,
  type WebComponentsElementRef,
  type WebComponentsGeneratedId,
  type WebComponentsHostFallbackReason,
  type WebComponentsHostKind,
  type WebComponentsHostPlan,
  type WebComponentsInternalsPolicy,
  type WebComponentsLifecycleCallback,
  type WebComponentsLifecycleHook,
  type WebComponentsListKey,
  type WebComponentsLoweredModule,
  type WebComponentsPromotedLocal,
  type WebComponentsPropertyDeclaration,
  type WebComponentsReactiveProperty,
  type WebComponentsRuntimeImports,
  type WebComponentsRegistrationOptions,
  type WebComponentsShadowPolicy,
  type WebComponentsSetupPhase,
  type WebComponentsStateField,
  type WebComponentsStaticTemplatePart,
  type WebComponentsTemplatePlan,
} from "./lower.js";
export {
  optimizeWebComponentsModule,
  optimizeWebComponentsPlan,
  WEB_COMPONENTS_OPTIMIZATIONS,
  type WebComponentsOptimization,
} from "./optimize.js";
export { emitWebComponentModule, synthesiseElementClass } from "./emitters";
export {
  HAS_SLOT_RUNTIME,
  indexedAccessType,
  isFunctionExpressionText,
  isPureExpressionText,
  leadingObjectPattern,
  parsePropsBinding,
  type PropsBinding,
  type PropsBindingEntry,
  propsBindingStatement,
  type PropsTypeReference,
  resolvePropsTypeReference,
  typeMembers,
  unwrapPropsTypeName,
} from "./transformers";
export { emitWebComponentHookModule } from "./runtime";
