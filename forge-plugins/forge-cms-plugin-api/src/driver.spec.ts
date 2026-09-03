import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { BADGE, COUNTER, GRID } from "./__fixtures__/components.js";
import { stubFramework } from "./__fixtures__/framework.js";
import { defineForgeCmsPlugin } from "./cms.js";
import { generateCmsArtifacts } from "./driver.js";

import type { CmsArtifact, CmsOutputPlugin } from "./cms.js";
import type { ContentComponent } from "./content-model.js";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

/** Materialise a neutral component barrel on disk and return its paths. */
function createWorkspace(
  components: readonly {
    folder: string;
    neutralName: string;
    publicName: string;
    sourceDir?: string;
    propertiesType?: string;
    source: string;
  }[],
): { componentsModule: string; outDir: string } {
  const root = mkdtempSync(path.join(os.tmpdir(), "forge-cms-driver-"));
  temporaryDirectories.push(root);
  const componentsDirectory = path.join(root, "src/components");
  mkdirSync(componentsDirectory, { recursive: true });

  const barrel: string[] = [];
  for (const component of components) {
    const sourceDirectory = component.sourceDir ?? component.folder;
    const folder = path.join(componentsDirectory, sourceDirectory);
    mkdirSync(folder, { recursive: true });
    writeFileSync(
      path.join(folder, `${component.folder}.tsx`),
      component.source,
      "utf8",
    );
    const types =
      component.propertiesType === undefined
        ? ""
        : `, type ${component.propertiesType}`;
    writeFileSync(
      path.join(folder, "index.ts"),
      `export { ${component.neutralName}${types} } from './${component.folder}';\n`,
      "utf8",
    );
    barrel.push(
      `export { ${component.neutralName}${types} } from './${sourceDirectory}';`,
    );
  }
  const componentsModule = path.join(componentsDirectory, "index.ts");
  writeFileSync(componentsModule, `${barrel.join("\n")}\n`, "utf8");

  return { componentsModule, outDir: path.join(root, "out") };
}

const BADGE_COMPONENT = {
  folder: "forge-badge",
  neutralName: "ForgeBadge",
  publicName: "Badge",
  propertiesType: "BadgeProperties",
  source: BADGE,
};

const GRID_COMPONENT = {
  folder: "forge-grid",
  neutralName: "ForgeGrid",
  publicName: "Grid",
  propertiesType: "GridProperties",
  source: GRID,
};

const COUNTER_COMPONENT = {
  folder: "forge-counter",
  neutralName: "ForgeCounter",
  publicName: "Counter",
  propertiesType: "CounterProperties",
  source: COUNTER,
};

const NESTED_BADGE_COMPONENT = {
  ...BADGE_COMPONENT,
  sourceDir: "atoms/forge-badge",
};

/** A target that emits one schema, one template, a manifest, and an entry. */
function recordingTarget(
  overrides: Partial<CmsOutputPlugin> = {},
): CmsOutputPlugin {
  return defineForgeCmsPlugin({
    id: "recorder",
    framework: stubFramework("react"),
    packageName: "@acme/components",
    emitSchema(component: ContentComponent): CmsArtifact {
      return {
        fileName: `${component.names.folder}.json`,
        contents: `${JSON.stringify({ name: component.names.technicalName }, undefined, 2)}\n`,
        artifactKind: "schema",
      };
    },
    emitTemplate(component: ContentComponent): CmsArtifact {
      return {
        fileName: `templates/${component.names.technicalName}.html`,
        contents: `<!-- ${component.names.displayName} -->\n`,
        artifactKind: "template",
      };
    },
    emitManifest(
      components: readonly ContentComponent[],
    ): readonly CmsArtifact[] {
      return [
        {
          fileName: "components.json",
          contents: `${JSON.stringify(components.map((entry) => entry.names.technicalName))}\n`,
          artifactKind: "manifest",
          asset: true,
        },
      ];
    },
    emitEntry(components: readonly ContentComponent[]): readonly CmsArtifact[] {
      return [
        {
          fileName: "index.ts",
          contents:
            components
              .map((entry) => `export * from './${entry.names.folder}.js';`)
              .join("\n") + "\n",
          artifactKind: "entry",
        },
      ];
    },
    build: {},
    ...overrides,
  } as CmsOutputPlugin);
}

function run(
  target: CmsOutputPlugin,
  workspace: { componentsModule: string; outDir: string },
) {
  return generateCmsArtifacts({
    plugin: target,
    componentsModule: workspace.componentsModule,
    outDir: workspace.outDir,
    componentsImport: "@acme/components",
  });
}

describe("generateCmsArtifacts", () => {
  it("writes every artifact a target returned at the file name it declared", () => {
    const workspace = createWorkspace([BADGE_COMPONENT, GRID_COMPONENT]);
    const tree = run(recordingTarget(), workspace);

    expect(tree.artifacts.map((artifact) => artifact.fileName)).toEqual([
      "forge-badge.json",
      "templates/badge.html",
      "forge-grid.json",
      "templates/grid.html",
      "components.json",
      "index.ts",
    ]);
    for (const artifact of tree.artifacts) {
      expect(existsSync(path.join(workspace.outDir, artifact.fileName))).toBe(
        true,
      );
    }
    expect(
      readFileSync(path.join(workspace.outDir, "components.json"), "utf8"),
    ).toBe('["badge","grid"]\n');
  });

  it("returns the entry artifact path", () => {
    const workspace = createWorkspace([BADGE_COMPONENT]);
    const tree = run(recordingTarget(), workspace);
    expect(tree.entry).toBe(path.join(workspace.outDir, "index.ts"));
  });

  it("reads flat-file component exports", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "forge-cms-flat-driver-"));
    temporaryDirectories.push(root);
    const componentsDirectory = path.join(root, "src/components");
    mkdirSync(componentsDirectory, { recursive: true });
    writeFileSync(
      path.join(componentsDirectory, "forge-flat.tsx"),
      BADGE,
      "utf8",
    );
    writeFileSync(
      path.join(componentsDirectory, "calendar-dates.ts"),
      "export const WEEKDAY_LUXON = ['monday'];\n",
      "utf8",
    );
    const componentsModule = path.join(componentsDirectory, "index.ts");
    writeFileSync(
      componentsModule,
      "export { ForgeBadge, type BadgeProperties } from './forge-flat';\n" +
        "export { WEEKDAY_LUXON } from './calendar-dates';\n",
      "utf8",
    );

    const tree = run(recordingTarget(), {
      componentsModule,
      outDir: path.join(root, "out"),
    });

    expect(
      tree.components.map((component) => component.names.publicName),
    ).toEqual(["Badge"]);
  });

  it("propagates nested source directories without changing target artifact names", () => {
    const workspace = createWorkspace([NESTED_BADGE_COMPONENT]);
    const tree = run(recordingTarget(), workspace);

    expect(tree.components[0]?.names.sourceDir).toBe("atoms/forge-badge");
    expect(tree.artifacts.map((artifact) => artifact.fileName)).toContain(
      "forge-badge.json",
    );
  });

  it("projects each discovered component onto the content model", () => {
    const workspace = createWorkspace([BADGE_COMPONENT, GRID_COMPONENT]);
    const tree = run(recordingTarget(), workspace);
    expect(
      tree.components.map((component) => component.names.publicName),
    ).toEqual(["Badge", "Grid"]);
    expect(tree.components[0].fields.map((entry) => entry.prop)).toEqual([
      "variant",
      "size",
      "pill",
      "content",
    ]);
  });

  it("writes no schema files for a target without emitSchema", () => {
    const workspace = createWorkspace([BADGE_COMPONENT]);
    const tree = run(recordingTarget({ emitSchema: undefined }), workspace);
    expect(
      tree.artifacts.some((artifact) => artifact.artifactKind === "schema"),
    ).toBe(false);
    expect(existsSync(path.join(workspace.outDir, "forge-badge.json"))).toBe(
      false,
    );
  });

  it("emits an empty manifest and a placeholder entry for an empty barrel", () => {
    const workspace = createWorkspace([]);
    const tree = run(recordingTarget({ emitEntry: undefined }), workspace);
    expect(tree.components).toEqual([]);
    expect(
      readFileSync(path.join(workspace.outDir, "components.json"), "utf8"),
    ).toBe("[]\n");
    expect(tree.entry).toBe(path.join(workspace.outDir, "index.ts"));
    expect(readFileSync(tree.entry, "utf8")).toBe("export {};\n");
  });

  it("propagates graph diagnostics to the CMS build report", () => {
    const workspace = createWorkspace([BADGE_COMPONENT]);
    writeFileSync(
      workspace.componentsModule,
      "export { ForgeBadge, type BadgeProperties } from './forge-badge';\n" +
        "export { MissingComponent } from './missing-component';\n",
      "utf8",
    );

    expect(() => run(recordingTarget(), workspace)).toThrow(
      /FORGE_GRAPH_MISSING_FILE/,
    );
  });

  it("reports interactivity from the neutral IR", () => {
    const workspace = createWorkspace([BADGE_COMPONENT, COUNTER_COMPONENT]);
    const tree = run(recordingTarget(), workspace);
    expect(tree.components.map((component) => component.interactive)).toEqual([
      false,
      true,
    ]);
  });

  it("aborts the build when a target reports an error diagnostic", () => {
    const workspace = createWorkspace([BADGE_COMPONENT]);
    const failing = recordingTarget({
      id: "failing",
      emitTemplate(component, _ir, context) {
        context.diagnostics.push({
          phase: "generation",
          severity: "error",
          code: "FORGE_TEST_UNSUPPORTED",
          message: `Cannot project ${component.names.publicName}.`,
          fileName: `${component.names.folder}.tsx`,
        });
        return {
          fileName: `${component.names.folder}.html`,
          contents: "",
          artifactKind: "template",
        };
      },
    });
    expect(() => run(failing, workspace)).toThrow(/FORGE_TEST_UNSUPPORTED/);
  });

  it.each([
    "../outside.txt",
    "/tmp/outside.txt",
    String.raw`nested\outside.txt`,
    "nested//outside.txt",
    "nested/../outside.txt",
  ])("rejects an unsafe emitted artifact name %s", (fileName) => {
    const workspace = createWorkspace([BADGE_COMPONENT]);
    const unsafe = recordingTarget({
      emitTemplate: () => ({
        fileName,
        contents: "",
        artifactKind: "template",
      }),
    });

    expect(() => run(unsafe, workspace)).toThrow(/strict relative path/);
    expect(
      existsSync(path.join(path.dirname(workspace.outDir), "outside.txt")),
    ).toBe(false);
  });

  it("rejects an emitted artifact beneath a symlink", () => {
    const workspace = createWorkspace([BADGE_COMPONENT]);
    const outside = path.join(path.dirname(workspace.outDir), "outside");
    mkdirSync(outside, { recursive: true });
    const unsafe = recordingTarget({
      emitTemplate: (_component, _ir, context) => {
        symlinkSync(outside, path.join(context.outDir, "linked"), "dir");
        return {
          fileName: "linked/outside.txt",
          contents: "",
          artifactKind: "template",
        };
      },
    });

    expect(() => run(unsafe, workspace)).toThrow(/symlink/);
    expect(existsSync(path.join(outside, "outside.txt"))).toBe(false);
  });

  it("rejects an output root that is a symlink", () => {
    const workspace = createWorkspace([BADGE_COMPONENT]);
    const outside = path.join(path.dirname(workspace.outDir), "outside-root");
    mkdirSync(outside, { recursive: true });
    rmSync(workspace.outDir, { recursive: true, force: true });
    symlinkSync(outside, workspace.outDir, "dir");

    expect(() => run(recordingTarget(), workspace)).toThrow(
      /root contains a symlink/,
    );
    expect(existsSync(path.join(outside, "index.ts"))).toBe(false);
  });

  it("co-generates a framework island and exposes its specifier to the emitters", () => {
    const workspace = createWorkspace([BADGE_COMPONENT]);
    let seen: string | undefined;
    const target = recordingTarget({
      id: "islander",
      island: "framework",
      emitTemplate(component, _ir, context): CmsArtifact {
        seen = context.islandEntry;
        return {
          fileName: `${component.names.folder}.txt`,
          contents: `${context.islandEntry ?? ""}\n`,
          artifactKind: "template",
        };
      },
    });
    run(target, workspace);

    expect(seen).toBe("./island/index.js");
    expect(existsSync(path.join(workspace.outDir, "island"))).toBe(true);
  });

  it("does not generate an island for a target that opts out", () => {
    const workspace = createWorkspace([BADGE_COMPONENT]);
    const tree = run(recordingTarget(), workspace);
    expect(existsSync(path.join(workspace.outDir, "island"))).toBe(false);
    expect(
      tree.diagnostics.every((diagnostic) => diagnostic.severity !== "error"),
    ).toBe(true);
  });
});
