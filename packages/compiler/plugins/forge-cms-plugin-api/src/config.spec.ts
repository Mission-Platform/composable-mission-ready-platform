import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { stubFramework } from "./__fixtures__/framework.js";
import { cmsAssetsPlugin } from "./config.js";

import type { CmsArtifact, CmsOutputPlugin } from "./cms.js";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function createTestEnvironment(targetId = "storyblok"): {
  rootDirectory: string;
  cacheDirectory: string;
  destinationRoot: string;
} {
  const rootDirectory = mkdtempSync(
    path.join(os.tmpdir(), "forge-cms-assets-"),
  );
  temporaryDirectories.push(rootDirectory);
  const cacheDirectory = path.join(
    rootDirectory,
    "node_modules/.cache/cms-cache",
  );
  const destinationRoot = path.join(rootDirectory, `dist/cms/${targetId}`);
  mkdirSync(cacheDirectory, { recursive: true });
  mkdirSync(destinationRoot, { recursive: true });
  return { rootDirectory, cacheDirectory, destinationRoot };
}

describe("cmsAssetsPlugin", () => {
  it("copies active assets from cacheDirectory to destinationRoot", () => {
    const { rootDirectory, cacheDirectory, destinationRoot } =
      createTestEnvironment("storyblok");

    writeFileSync(
      path.join(cacheDirectory, "components.json"),
      '["button"]\n',
      "utf8",
    );

    const assets: CmsArtifact[] = [
      {
        fileName: "components.json",
        contents: '["button"]\n',
        artifactKind: "manifest",
        asset: true,
      },
    ];

    const plugin = cmsAssetsPlugin(
      rootDirectory,
      cacheDirectory,
      "storyblok",
      () => assets,
    );
    (plugin.closeBundle as () => void)();

    const destinationFile = path.join(destinationRoot, "components.json");
    expect(existsSync(destinationFile)).toBe(true);
    expect(readFileSync(destinationFile, "utf8")).toBe('["button"]\n');
  });

  it("prunes stale asset files from previous builds", () => {
    const { rootDirectory, cacheDirectory, destinationRoot } =
      createTestEnvironment("storyblok");

    // Simulate build N left behind components.json and stale.json
    writeFileSync(
      path.join(destinationRoot, "stale.json"),
      '{"old": true}\n',
      "utf8",
    );
    writeFileSync(
      path.join(destinationRoot, "components.json"),
      '["old"]\n',
      "utf8",
    );

    // Build N+1 has updated components.json in cache, but no stale.json
    writeFileSync(
      path.join(cacheDirectory, "components.json"),
      '["button","card"]\n',
      "utf8",
    );

    const activeAssets: CmsArtifact[] = [
      {
        fileName: "components.json",
        contents: '["button","card"]\n',
        artifactKind: "manifest",
        asset: true,
      },
    ];

    const plugin = cmsAssetsPlugin(
      rootDirectory,
      cacheDirectory,
      "storyblok",
      () => activeAssets,
    );
    (plugin.closeBundle as () => void)();

    // stale.json must be purged
    expect(existsSync(path.join(destinationRoot, "stale.json"))).toBe(false);

    // components.json must be updated
    expect(
      readFileSync(path.join(destinationRoot, "components.json"), "utf8"),
    ).toBe('["button","card"]\n');
  });

  it("prunes nested stale assets and deletes empty subdirectories", () => {
    const { rootDirectory, cacheDirectory, destinationRoot } =
      createTestEnvironment("storyblok");

    const nestedStaleDirectory = path.join(destinationRoot, "schemas/legacy");
    mkdirSync(nestedStaleDirectory, { recursive: true });
    writeFileSync(path.join(nestedStaleDirectory, "legacy.json"), "{}", "utf8");

    // Active asset in a different folder
    mkdirSync(path.join(cacheDirectory, "templates"), { recursive: true });
    writeFileSync(
      path.join(cacheDirectory, "templates/card.html"),
      "<div>card</div>\n",
      "utf8",
    );

    const activeAssets: CmsArtifact[] = [
      {
        fileName: "templates/card.html",
        contents: "<div>card</div>\n",
        artifactKind: "template",
        asset: true,
      },
    ];

    const plugin = cmsAssetsPlugin(
      rootDirectory,
      cacheDirectory,
      "storyblok",
      () => activeAssets,
    );
    (plugin.closeBundle as () => void)();

    // legacy nested directory and file should be purged
    expect(existsSync(path.join(destinationRoot, "schemas"))).toBe(false);

    // active template must be copied
    expect(existsSync(path.join(destinationRoot, "templates/card.html"))).toBe(
      true,
    );
  });

  it("preserves framework output directories in destinationRoot", () => {
    const { rootDirectory, cacheDirectory, destinationRoot } =
      createTestEnvironment("storyblok");

    // Framework directory containing framework-compiled bundle
    const reactDirectory = path.join(destinationRoot, "react");
    mkdirSync(reactDirectory, { recursive: true });
    writeFileSync(
      path.join(reactDirectory, "index.js"),
      "export const Button = () => null;\n",
      "utf8",
    );

    // Also a custom framework directory passed in plugin
    const customFrameworkDirectory = path.join(
      destinationRoot,
      "custom-framework",
    );
    mkdirSync(customFrameworkDirectory, { recursive: true });
    writeFileSync(
      path.join(customFrameworkDirectory, "main.js"),
      "console.log(1);\n",
      "utf8",
    );

    // Active asset
    writeFileSync(path.join(cacheDirectory, "components.json"), "[]\n", "utf8");

    // Stale asset file at root
    writeFileSync(path.join(destinationRoot, "obsolete.json"), "{}", "utf8");

    const targetPlugin: CmsOutputPlugin = {
      id: "storyblok",
      framework: stubFramework("react"),
      packageName: "@mission-platform/components",
      supportedFrameworks: ["react", "custom-framework"],
      emitTemplate: () => ({
        fileName: "template.html",
        contents: "",
        artifactKind: "template",
      }),
      build: {},
    };

    const plugin = cmsAssetsPlugin(
      rootDirectory,
      cacheDirectory,
      targetPlugin,
      () => [
        {
          fileName: "components.json",
          contents: "[]\n",
          artifactKind: "manifest",
          asset: true,
        },
      ],
    );
    (plugin.closeBundle as () => void)();

    // Stale asset is pruned
    expect(existsSync(path.join(destinationRoot, "obsolete.json"))).toBe(false);

    // Framework directories and files are strictly preserved
    expect(existsSync(path.join(reactDirectory, "index.js"))).toBe(true);
    expect(readFileSync(path.join(reactDirectory, "index.js"), "utf8")).toBe(
      "export const Button = () => null;\n",
    );
    expect(existsSync(path.join(customFrameworkDirectory, "main.js"))).toBe(
      true,
    );

    // Active asset is present
    expect(existsSync(path.join(destinationRoot, "components.json"))).toBe(
      true,
    );
  });

  it("handles destinationRoot not existing yet on first build", () => {
    const rootDirectory = mkdtempSync(
      path.join(os.tmpdir(), "forge-cms-first-build-"),
    );
    temporaryDirectories.push(rootDirectory);
    const cacheDirectory = path.join(rootDirectory, "cache");
    const destinationRoot = path.join(rootDirectory, "dist/cms/storyblok");
    mkdirSync(cacheDirectory, { recursive: true });

    writeFileSync(
      path.join(cacheDirectory, "manifest.json"),
      '{"version": 1}\n',
      "utf8",
    );

    const plugin = cmsAssetsPlugin(
      rootDirectory,
      cacheDirectory,
      "storyblok",
      () => [
        {
          fileName: "manifest.json",
          contents: '{"version": 1}\n',
          artifactKind: "manifest",
          asset: true,
        },
      ],
    );
    (plugin.closeBundle as () => void)();

    expect(existsSync(path.join(destinationRoot, "manifest.json"))).toBe(true);
  });

  it("preserves dotfiles such as .gitkeep and does not prune directories containing them", () => {
    const { rootDirectory, cacheDirectory, destinationRoot } =
      createTestEnvironment("storyblok");

    const nestedDirectory = path.join(destinationRoot, "templates/nested");
    mkdirSync(nestedDirectory, { recursive: true });
    writeFileSync(path.join(nestedDirectory, ".gitkeep"), "", "utf8");
    writeFileSync(
      path.join(nestedDirectory, "stale.html"),
      "<div>old</div>\n",
      "utf8",
    );

    // Active asset in a different folder
    mkdirSync(path.join(cacheDirectory, "templates"), { recursive: true });
    writeFileSync(
      path.join(cacheDirectory, "templates/new.html"),
      "<div>new</div>\n",
      "utf8",
    );

    const activeAssets: CmsArtifact[] = [
      {
        fileName: "templates/new.html",
        contents: "<div>new</div>\n",
        artifactKind: "template",
        asset: true,
      },
    ];

    const plugin = cmsAssetsPlugin(
      rootDirectory,
      cacheDirectory,
      "storyblok",
      () => activeAssets,
    );
    (plugin.closeBundle as () => void)();

    // stale.html should be purged
    expect(existsSync(path.join(nestedDirectory, "stale.html"))).toBe(false);

    // .gitkeep and its containing directory must remain intact
    expect(existsSync(nestedDirectory)).toBe(true);
    expect(existsSync(path.join(nestedDirectory, ".gitkeep"))).toBe(true);

    // Active template must be copied
    expect(existsSync(path.join(destinationRoot, "templates/new.html"))).toBe(
      true,
    );
  });
});
