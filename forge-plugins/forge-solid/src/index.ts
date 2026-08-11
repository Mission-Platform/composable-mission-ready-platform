import { defineForgeOutputPlugin } from "@mission-platform/forge-plugin-api";
import solidPlugin from "vite-plugin-solid";

import { emitSolidHookModule, emitSolidModule } from "./emitters";
import { isSolidLowered, lowerSolidModule } from "./lower.js";
import { optimizeSolidModule } from "./optimize.js";

import type { SolidLoweringPlan } from "./lower.js";
import type {
  FrameworkBuildAdapters,
  FrameworkOutputPlugin,
  TargetContext,
  TargetIntentions,
  TargetOptimizeOptions,
} from "@mission-platform/forge-plugin-api";
import type { TsdownPlugin } from "tsdown";
import type { Plugin } from "vite";

/** The subset of Rolldown's input options the JSX override touches. */
interface RolldownInputOptions {
  transform?: Record<string, unknown>;
}

/**
 * Reuse `vite-plugin-solid`'s transform under Rolldown, where JSX must reach the
 * plugin unlowered — hence the `jsx: 'preserve'` override. The hook shapes are
 * Rolldown's rather than Vite's, so the finished object is adapted once here.
 */
function solidJsxTsdownPlugin(): Plugin {
  const solid = solidPlugin() as unknown as {
    transform?:
      | ((
          this: unknown,
          code: string,
          id: string,
          options?: unknown,
        ) => unknown)
      | { handler?: Function };
  };
  const transformHook =
    typeof solid.transform === "function"
      ? solid.transform
      : solid.transform && typeof solid.transform.handler === "function"
        ? solid.transform.handler
        : undefined;
  return {
    name: "@mission-platform/forge-plugin-solid:tsdown",
    enforce: "pre",
    options(inputOptions: RolldownInputOptions): RolldownInputOptions {
      const current =
        typeof inputOptions.transform === "object"
          ? inputOptions.transform
          : {};
      inputOptions.transform = { ...current, jsx: "preserve" };
      return inputOptions;
    },
    async transform(this: unknown, code: string, id: string): Promise<unknown> {
      return transformHook === undefined
        ? null
        : transformHook.call(this, code, id);
    },
  } as unknown as Plugin;
}

const BUILD: FrameworkBuildAdapters = {
  vite: () => [solidPlugin() as unknown as Plugin],
  tsdown: () => [solidJsxTsdownPlugin() as TsdownPlugin],
};

/**
 * The plan the generator prints from. A pipeline run carries it on
 * `intentions.lowered`; a direct `generate` call lowers on the fly, so the
 * emitter keeps working standalone.
 */
function solidPlan(
  intentions: TargetIntentions,
  context: TargetContext,
): SolidLoweringPlan | undefined {
  if (isSolidLowered(intentions.lowered)) {
    return intentions.lowered.plan;
  }
  const fallback = lowerSolidModule(intentions.module, context).lowered;
  return isSolidLowered(fallback) ? fallback.plan : undefined;
}

/** Create the Solid output plugin and its Vite/Rolldown JSX adapters. */
export function forgeSolidFramework(): FrameworkOutputPlugin {
  return defineForgeOutputPlugin({
    id: "solid",
    outputLanguage: "tsx",
    hookOutputLanguage: "ts",
    source: {
      componentExtension: ".tsx",
      componentImportExtension: "",
      composableExtension: ".ts",
      entryExtension: ".tsx",
      componentExport: "named",
    },
    runtimeExternals: ["solid-js"],
    displayNameSuffix: "Solid",
    lower(ir, context: TargetContext): TargetIntentions {
      return lowerSolidModule(ir, context);
    },
    optimize(
      intentions: TargetIntentions,
      options: TargetOptimizeOptions,
    ): TargetIntentions {
      return optimizeSolidModule(intentions, options);
    },
    generate(intentions: TargetIntentions, context: TargetContext) {
      if (context.moduleKind === "composable") {
        return {
          code: emitSolidHookModule(intentions.module),
          lang: "ts" as const,
        };
      }
      const generated = emitSolidModule(intentions.module, {
        componentName: context.componentName,
        componentFolders: context.componentFolders,
        plan: solidPlan(intentions, context),
      });
      return { code: generated.code, lang: "tsx" as const };
    },
    build: BUILD,
  });
}

export { emitSolidHookModule, emitSolidModule } from "./emitters";
export type { GeneratedSolidModule, SolidEmitOptions } from "./emitters";
export {
  isSolidLowered,
  lowerSolidModule,
  planSolidImports,
  planSolidModule,
  SOLID_FRAMEWORK,
} from "./lower.js";
export type {
  SolidDynamicPlan,
  SolidEffectPlan,
  SolidListKeyPlan,
  SolidLoweredModule,
  SolidLoweringPlan,
  SolidMemoizedExpression,
  SolidMemoPlan,
  SolidPropPlan,
  SolidRefPlan,
  SolidSignalPlan,
  SolidSlotPlan,
} from "./lower.js";
export {
  COLLAPSE_SINGLE_CHILD_FRAGMENTS,
  DROP_UNUSED_IMPORTS,
  HOIST_STATIC_SUBTREES,
  MEMOIZE_DYNAMIC_EXPRESSIONS,
  MP_MEMO_PREFIX,
  optimizeSolidModule,
  STABLE_LIST_KEYS,
} from "./optimize.js";
