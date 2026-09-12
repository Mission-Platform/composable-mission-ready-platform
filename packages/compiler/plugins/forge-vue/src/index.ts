import {
  assertTargetIntentionsLowered,
  defineForgeOutputPlugin,
} from "@mission-platform/forge-plugin-api";
import vueJsx from "@vitejs/plugin-vue-jsx";
import Vue from "unplugin-vue/rolldown";

import { emitVueHookModule, emitVueModule } from "./emitters";
import { lowerVueModule } from "./lower.js";
import { optimizeVueModule } from "./optimize.js";

import type { VueLoweredModule } from "./lower.js";
import type {
  FrameworkBuildAdapters,
  FrameworkOutputPlugin,
  GeneratorContext,
  TargetContext,
  TargetIntentions,
  TargetOptimizeOptions,
} from "@mission-platform/forge-plugin-api";
import type { TsdownPlugin } from "tsdown";
import type { Plugin } from "vite";

const BUILD: FrameworkBuildAdapters = {
  vite: () => [vueJsx() as Plugin],
  tsdown: () => [
    Vue({ isProduction: true }) as TsdownPlugin,
    vueJsx() as TsdownPlugin,
  ],
};

/** Create the Vue output plugin and its Vite/Rolldown compiler adapters. */
export function forgeVueFramework(): FrameworkOutputPlugin {
  return defineForgeOutputPlugin({
    id: "vue",
    outputLanguage: "vue",
    hookOutputLanguage: "ts",
    source: {
      componentExtension: ".vue",
      componentImportExtension: ".vue",
      composableExtension: ".ts",
      entryExtension: ".ts",
      componentExport: "default",
    },
    runtimeExternals: ["vue"],
    displayNameSuffix: "Vue",
    lower(ir, context: TargetContext): TargetIntentions {
      return lowerVueModule(ir, context);
    },
    optimize(
      intentions: TargetIntentions,
      options: TargetOptimizeOptions,
    ): TargetIntentions {
      return optimizeVueModule(intentions, options);
    },
    generate(intentions: TargetIntentions, context: GeneratorContext) {
      assertTargetIntentionsLowered<VueLoweredModule>(intentions, "vue");
      if (context.moduleKind === "composable") {
        return {
          code: emitVueHookModule(intentions.module),
          lang: "ts" as const,
        };
      }
      const generated = emitVueModule(
        intentions.module,
        context.componentName ?? "Component",
        context.componentFolders,
        intentions.lowered,
      );
      return {
        code: generated.code,
        lang: "vue" as const,
        extraModules: generated.extraModules,
      };
    },
    build: BUILD,
  });
}

export {
  emitVueHookModule,
  emitVueModule,
  type EmittedExtraModule,
  type EmittedVueModule,
} from "./emitters";
export { isVueLowered, lowerVueModule } from "./lower.js";
export type {
  VueComputedPlan,
  VueDynamicNodePlan,
  VueEventPlan,
  VueListKeyPlan,
  VueLoweredModule,
  VuePropPlan,
  VuePropsContract,
  VueRefPlan,
  VueRuntimeImports,
  VueSlotPlan,
  VueStaticSubtreePlan,
  VueTemplateRefPlan,
  VueWatcherPlan,
} from "./lower.js";
export {
  DEDUPE_COMPUTED,
  DROP_UNUSED_IMPORTS,
  HOIST_STATIC_SUBTREES,
  INLINE_SINGLE_USE_REFS,
  optimizeVueModule,
  STABLE_LIST_KEYS,
  VUE_OPTIMIZATIONS,
} from "./optimize.js";
