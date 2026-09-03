import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { stubFramework } from "./__fixtures__/framework.js";
import { cmsCacheDirectory, defineTsdownForgeCms } from "./tsdown.js";

import type { CmsOutputPlugin } from "./cms.js";

function fixtureTarget(outputDirectories: string[] = []): CmsOutputPlugin {
  return {
    id: "storyblok",
    framework: stubFramework("react"),
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
  it("stages framework output and shared assets below the build root", () => {
    const rootDirectory = path.resolve(
      import.meta.dirname,
      "../../../packages/components",
    );
    const outputRoot = path.resolve(
      rootDirectory,
      "node_modules/.cache/forge-build/test",
    );
    const outputDirectories: string[] = [];
    const target = fixtureTarget(outputDirectories);
    vi.stubEnv("FORGE_BUILD_STAGE_ROOT", outputRoot);

    try {
      const frameworkConfig = defineTsdownForgeCms({
        rootDir: rootDirectory,
        outputRoot,
        target,
        artifactMode: "framework",
      });
      const sharedConfig = defineTsdownForgeCms({
        rootDir: rootDirectory,
        outputRoot,
        target,
        artifactMode: "shared",
      });

      expect(frameworkConfig.outDir).toBe(
        path.join(outputRoot, "dist/cms/storyblok/react"),
      );
      expect(sharedConfig.outDir).toBe(
        path.join(outputRoot, "dist/cms/storyblok"),
      );
      expect(frameworkConfig.clean).toBe(true);
      expect(sharedConfig.clean).toBe(true);
      expect(outputDirectories).toEqual([
        path.join(outputRoot, "dist/cms/storyblok/react"),
        path.join(outputRoot, "dist/cms/storyblok"),
      ]);
      expect(frameworkConfig.entry).toBe(
        path.join(outputRoot, "components-cms-storyblok-react", "index.ts"),
      );
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
});
