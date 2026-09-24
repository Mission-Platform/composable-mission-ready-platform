import path from "node:path";

import { defineTsdownLibrary } from "@mission-platform/tsdown-config";
import { describe, expect, it, vi } from "vitest";

import { stubFramework } from "./__fixtures__/framework.js";
import { cmsCacheDirectory } from "./tsdown.js";

import { defineTsdownForgeCmsTargetConfigs, tsdownForgeCmsPlugins } from ".";

import type { CmsOutputPlugin } from "./cms.js";
import type { ForgeCmsTsdownPlugin } from "./tsdown.js";
import type { TsdownPlugin, UserConfig } from "tsdown";

function fixtureTarget(
  outputDirectories: string[] = [],
  targetId = "storyblok",
  frameworkId = "react",
): CmsOutputPlugin {
  return {
    id: targetId,
    framework: stubFramework(frameworkId),
    packageName: "@mission-platform/components",
    emitTemplate: () => ({
      fileName: "component.txt",
      contents: "",
      artifactKind: "template",
    }),
    build: {
      tsdown: ({ outputDirectory }) => {
        if (outputDirectory !== undefined) {
          outputDirectories.push(outputDirectory);
        }
        return [];
      },
    },
  };
}

describe("Forge CMS tsdown helper", () => {
  it("exposes the CMS tsdown helpers", async () => {
    const publicApi = await import(".");

    expect(publicApi.defineTsdownForgeCmsTargetConfigs).toBeTypeOf("function");
    expect(publicApi.tsdownForgeCmsPlugins).toBeTypeOf("function");
    expect(publicApi).not.toHaveProperty("defineTsdownForgeCms");
    expect(publicApi).not.toHaveProperty("defineTsdownForgeCmsAll");
  });

  it("materializes aggregate, framework, and shared output below the build root", async () => {
    const rootDirectory = path.resolve(
      import.meta.dirname,
      "../../../../ui/components",
    );
    const outputRoot = path.resolve(
      rootDirectory,
      "node_modules/.cache/forge-build/test",
    );
    const outputDirectories: string[] = [];
    const target = fixtureTarget(outputDirectories);
    vi.stubEnv("FORGE_BUILD_STAGE_ROOT", outputRoot);

    try {
      const frameworkConfig = await materializeConfig({
        rootDir: rootDirectory,
        outputRoot,
        targets: [target],
        artifactMode: "framework",
      });
      const aggregateConfig = await materializeConfig({
        rootDir: rootDirectory,
        outputRoot,
        targets: [target],
        artifactMode: "all",
      });
      const sharedConfig = await materializeConfig({
        rootDir: rootDirectory,
        outputRoot,
        targets: [target],
        artifactMode: "shared",
      });

      expect(frameworkConfig.outDir).toMatch(
        new RegExp(
          String.raw`^${path.join(outputRoot, "dist/cms/storyblok")}/\.forge-attempt-react-storyblok-react-`,
        ),
      );
      expect(aggregateConfig.outDir).toMatch(
        new RegExp(
          String.raw`^${path.join(outputRoot, "dist/cms/storyblok")}/\.forge-attempt-react-storyblok-react-`,
        ),
      );
      expect(sharedConfig.outDir).toMatch(
        new RegExp(
          String.raw`^${path.join(outputRoot, "dist/cms")}/\.forge-attempt-storyblok-storyblok-react-`,
        ),
      );
      expect(frameworkConfig.clean).toBe(true);
      expect(aggregateConfig.clean).toBe(true);
      expect(sharedConfig.clean).toBe(true);
      expect(outputDirectories).toEqual([
        frameworkConfig.outDir,
        aggregateConfig.outDir,
        sharedConfig.outDir,
      ]);
      expect(frameworkConfig.entry).toContain(
        "@mission-platform/forge/entry:storyblok-react",
      );
      expect(pluginNames(frameworkConfig)).toEqual([
        "@mission-platform/tsdown-config:tsconfig-paths",
        "@mission-platform/tsdown-config:css-relink",
        "@mission-platform/vite-plugin-forge:build-tsdown-storyblok-react",
        "mission-platform:cms-entry-dts",
        "mission-platform:cms-assets",
        "mission-platform:cms-cache-cleanup",
        "@mission-platform/vite-plugin-forge:publish-storyblok-react",
      ]);
      expect(cmsCacheDirectory(rootDirectory, target)).toBe(
        path.join(
          rootDirectory,
          "node_modules/.cache/components-cms-storyblok-react",
        ),
      );
    } finally {
      vi.unstubAllEnvs();
    }
  }, 30_000);

  it("materializes native separate target configs for every selected framework via defineTsdownForgeCmsTargetConfigs", () => {
    const rootDirectory = path.resolve(
      "/tmp/mission-platform-cms-multi-framework",
    );
    const outputRoot = path.join(rootDirectory, "stage");
    const outputDirectories: string[] = [];
    const configs = defineTsdownForgeCmsTargetConfigs({
      rootDir: rootDirectory,
      outputRoot,
      targets: [
        fixtureTarget(outputDirectories, "storyblok", "react"),
        fixtureTarget(outputDirectories, "storyblok", "vue"),
      ],
    });

    expect(configs).toHaveLength(2);
    expect(configs.map((config) => config.entry)).toEqual([
      expect.stringContaining("@mission-platform/forge/entry:storyblok-react"),
      expect.stringContaining("@mission-platform/forge/entry:storyblok-vue"),
    ]);
    expect(configs.map((config) => config.outDir)).toEqual([
      expect.stringMatching(
        new RegExp(
          String.raw`^${path.join(outputRoot, "dist/cms/storyblok")}/\.forge-attempt-react-storyblok-react-`,
        ),
      ),
      expect.stringMatching(
        new RegExp(
          String.raw`^${path.join(outputRoot, "dist/cms/storyblok")}/\.forge-attempt-vue-storyblok-vue-`,
        ),
      ),
    ]);
    expect(outputDirectories).toEqual([configs[0]?.outDir, configs[1]?.outDir]);
  });

  it("skips CMS plugins for an explicit neutral-only build", () => {
    vi.stubEnv("FORGE_FRAMEWORK_TARGET", "none");

    try {
      expect(
        tsdownForgeCmsPlugins({
          rootDir: path.resolve("/tmp/mission-platform-cms-neutral"),
          targets: [fixtureTarget()],
        }),
      ).toEqual([]);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("preserves caller plugins while applying CMS target selection", async () => {
    const callerPlugin = { name: "caller-plugin" } as TsdownPlugin;
    const targets = [
      fixtureTarget(),
      { ...fixtureTarget(), framework: stubFramework("vue") },
      fixtureTarget([], "contentful", "react"),
    ];

    try {
      vi.stubEnv("FORGE_CMS_STORYBLOK_TARGET", "storyblok");
      const plugins = tsdownForgeCmsPlugins({
        rootDir: path.resolve("/tmp/mission-platform-cms-selection"),
        targets,
      });
      expect(plugins).toHaveLength(1);
      expect(
        (plugins[0] as ForgeCmsTsdownPlugin).cmsTargetConfigs,
      ).toHaveLength(2);

      vi.stubEnv("FORGE_FRAMEWORK_TARGET", "vue");
      const frameworkPlugins = tsdownForgeCmsPlugins({
        rootDir: path.resolve("/tmp/mission-platform-cms-selection"),
        targets,
      });
      expect(frameworkPlugins).toHaveLength(1);
      const config = { plugins: [callerPlugin] } as UserConfig;
      await (frameworkPlugins[0] as ForgeCmsTsdownPlugin).tsdownConfig?.(
        config,
      );
      expect(config.plugins).toContain(callerPlugin);
      expect(config.entry).toContain(
        "@mission-platform/forge/entry:storyblok-vue",
      );
      expect(pluginNames(config)).toEqual(
        expect.arrayContaining([
          "@mission-platform/vite-plugin-forge:build-tsdown-storyblok-vue",
          "caller-plugin",
        ]),
      );
      expect(pluginNames(config).at(-1)).toBe("caller-plugin");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("keeps the CMS output directory when composed with defineTsdownLibrary", async () => {
    const rootDirectory = path.resolve("/tmp/mission-platform-cms-composition");
    const cmsPlugins = tsdownForgeCmsPlugins({
      rootDir: rootDirectory,
      targets: [fixtureTarget()],
      artifactMode: "framework",
    });
    const config = defineTsdownLibrary({
      rootDir: rootDirectory,
      plugins: cmsPlugins,
    });
    const plugin = cmsPlugins[0] as ForgeCmsTsdownPlugin;

    await plugin.tsdownConfig?.(config);

    expect(config.outDir).toEqual(
      expect.stringMatching(
        `${path.join(rootDirectory, "dist/cms/storyblok")}/.forge-attempt-react-storyblok-react-`,
      ),
    );
  });
});

function pluginNames(config: UserConfig): string[] {
  return (Array.isArray(config.plugins) ? config.plugins : [config.plugins])
    .filter((plugin): plugin is TsdownPlugin =>
      Boolean(plugin && typeof plugin === "object" && "name" in plugin),
    )
    .map((plugin) => plugin.name)
    .filter((name): name is string => typeof name === "string");
}

async function materializeConfig(options: {
  rootDir: string;
  outputRoot: string;
  targets: readonly CmsOutputPlugin[];
  artifactMode: "all" | "shared" | "framework";
}): Promise<UserConfig> {
  const plugins = tsdownForgeCmsPlugins(options);
  expect(plugins).toHaveLength(1);
  const config = {} as UserConfig;
  await (plugins[0] as ForgeCmsTsdownPlugin).tsdownConfig?.(config);
  return config;
}
