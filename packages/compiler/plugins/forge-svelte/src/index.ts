import { createRequire } from "node:module";

import {
  assertTargetIntentionsLowered,
  defineForgeOutputPlugin,
} from "@mission-platform/forge-plugin-api";
import { svelte } from "@sveltejs/vite-plugin-svelte";

import { emitSvelteModule } from "./emitters/component.js";
import { emitSvelteHookModule } from "./emitters/hook.js";
import { lowerSvelteModule } from "./lower.js";
import { optimizeSvelteModule } from "./optimize.js";

import type { SvelteLoweredModule } from "./lower.js";
import type {
  FrameworkBuildAdapters,
  FrameworkOutputPlugin,
  TargetContext,
  TargetIntentions,
  TargetOptimizeOptions,
} from "@mission-platform/forge-plugin-api";
import type { TsdownPlugin } from "tsdown";
import type { Plugin } from "vite";

function svelteTsdownPlugin(): Plugin {
  return {
    name: "@mission-platform/forge-plugin-svelte:tsdown",
    enforce: "pre",
    async transform(code, id) {
      const filename = id.split("?")[0] ?? id;
      if (!filename.endsWith(".svelte")) return null;
      const compiler = createRequire(import.meta.url)("svelte/compiler") as {
        compile: (
          source: string,
          options: { filename: string; css?: "injected" | "external" },
        ) => { js: { code: string; map?: object } };
      };
      const result = compiler.compile(code, { filename, css: "injected" });
      return { code: result.js.code, map: result.js.map as never };
    },
  };
}

const BUILD: FrameworkBuildAdapters = {
  vite: () => [svelte() as unknown as Plugin],
  tsdown: () => [svelteTsdownPlugin() as TsdownPlugin],
};

/** Create the Svelte output plugin and its Vite/Rolldown compiler adapters. */
export function forgeSvelteFramework(): FrameworkOutputPlugin {
  return defineForgeOutputPlugin({
    id: "svelte",
    outputLanguage: "svelte",
    hookOutputLanguage: "ts",
    source: {
      componentExtension: ".svelte",
      componentImportExtension: ".svelte",
      composableExtension: ".ts",
      entryExtension: ".tsx",
      componentExport: "default",
    },
    runtimeExternals: ["svelte"],
    displayNameSuffix: "Svelte",
    lower(ir: SemanticModule, context: TargetContext): TargetIntentions {
      return lowerSvelteModule(ir, context);
    },
    optimize(
      intentions: TargetIntentions,
      options: TargetOptimizeOptions,
    ): TargetIntentions {
      return optimizeSvelteModule(intentions, options);
    },
    generate(intentions: TargetIntentions, context: TargetContext) {
      assertTargetIntentionsLowered<SvelteLoweredModule>(intentions, "svelte");
      if (context.moduleKind === "composable") {
        return {
          code: emitSvelteHookModule(intentions.module),
          lang: "ts" as const,
        };
      }
      const generated = emitSvelteModule(
        intentions.module,
        context.componentName,
        context.componentFolders,
        intentions.lowered,
      );
      return {
        code: generated.code,
        lang: "svelte" as const,
        extraModules: generated.extraModules,
      };
    },
    build: BUILD,
  });
}

export { emitSvelteHookModule, emitSvelteModule } from "./emitters";
export type { SvelteModuleOutput } from "./emitters";
export { isSvelteLowered, lowerSvelteModule } from "./lower.js";
export type {
  SvelteBindingPlan,
  SvelteDerivedPlan,
  SvelteDynamicPlan,
  SvelteEffectPlan,
  SvelteEventPlan,
  SvelteImportPlan,
  SvelteInitializationPlan,
  SvelteListKeyPlan,
  SvelteLoweredModule,
  SveltePropPlan,
  SvelteRenderHelperPlan,
  SvelteScriptPlan,
  SvelteSlotPlan,
  SvelteStatePlan,
  SvelteStaticPlan,
  SvelteTargetIntentions,
} from "./lower.js";
export { optimizeSvelteModule, SVELTE_OPTIMIZATIONS } from "./optimize.js";
