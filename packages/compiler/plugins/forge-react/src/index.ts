import { defineForgeOutputPlugin } from "@mission-platform/forge-plugin-api";

import { emitReactModule } from "./emitters/module.js";
import { isReactLowered, lowerReactModule, planReactModule } from "./lower.js";
import { optimizeReactModule } from "./optimize.js";

import type {
  FrameworkBuildAdapters,
  FrameworkOutputPlugin,
  GeneratedModule,
  TargetContext,
  TargetIntentions,
  TargetOptimizeOptions,
} from "@mission-platform/forge-plugin-api";
import type { TsdownPlugin } from "tsdown";
import type { Plugin } from "vite";

function reactJsxPlugin(): Plugin {
  return {
    name: "@mission-platform/forge-plugin-react:jsx",
    enforce: "pre",
    config() {
      return { oxc: { jsx: { runtime: "automatic", importSource: "react" } } };
    },
    options(inputOptions) {
      const current =
        inputOptions.transform && typeof inputOptions.transform === "object"
          ? inputOptions.transform
          : {};
      inputOptions.transform = {
        ...current,
        jsx: { runtime: "automatic", importSource: "react" },
      };
      return inputOptions;
    },
  };
}

const BUILD: FrameworkBuildAdapters = {
  vite: () => [reactJsxPlugin()],
  tsdown: () => [reactJsxPlugin() as TsdownPlugin],
};

/** Create the React output plugin and its native JSX build adapters. */
export function forgeReactFramework(): FrameworkOutputPlugin {
  const build = BUILD;
  return defineForgeOutputPlugin({
    id: "react",
    outputLanguage: "tsx",
    hookOutputLanguage: "tsx",
    source: {
      componentExtension: ".tsx",
      componentImportExtension: "",
      composableExtension: ".tsx",
      entryExtension: ".tsx",
      componentExport: "named",
    },
    runtimeExternals: ["react", "react-dom"],
    displayNameSuffix: "React",
    lower: lowerReactModule,
    optimize(
      intentions: TargetIntentions,
      options: TargetOptimizeOptions,
    ): TargetIntentions {
      return optimizeReactModule(intentions, options);
    },
    generate(
      intentions: TargetIntentions,
      context: TargetContext,
    ): GeneratedModule {
      // A direct generator call may skip the lowering phase, so the plan is
      // rebuilt on the fly when the intentions do not carry one.
      const lowered = intentions.lowered;
      const plan = isReactLowered(lowered)
        ? lowered.plan
        : planReactModule(intentions.module, context.componentName);
      const code = emitReactModule(
        intentions.module,
        context.componentName,
        plan,
      );
      return { code, lang: "tsx" as const };
    },
    build,
  });
}

export { emitReactModule } from "./emitters/module.js";
export {
  isReactLowered,
  lowerReactModule,
  planReactModule,
  type ReactClientDirectivePlan,
  type ReactHookPlan,
  type ReactI18nPlan,
  type ReactImportPlan,
  type ReactLoweredModule,
  type ReactModulePlan,
  type ReactPropPlan,
  type ReactPropsParameter,
} from "./lower.js";
export { optimizeReactModule, REACT_OPTIMIZATIONS } from "./optimize.js";
