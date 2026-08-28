import { analyzeContentComponent } from "@mission-platform/forge-cms-plugin-api";
import {
  BADGE,
  EMPTY,
  GRID,
  LAYOUT,
  badgeNames,
  emptyNames,
  gridNames,
  layoutNames,
  stubFramework,
} from "@mission-platform/forge-cms-plugin-api/fixtures";
import { analyzeForgeModule } from "@mission-platform/vite-plugin-forge";
import { parseOxcModule } from "@mission-platform/vite-plugin-forge/compiler/oxc.js";
import { describe, expect, it } from "vitest";

import { emitWebflowEntry } from "./entry.js";
import { forgeWebflowCms } from "./webflow.js";

import type { WebflowManifest } from "./manifest.js";
import type {
  CmsArtifact,
  CmsOutputPlugin,
  CmsTargetContext,
  ContentComponent,
  ContentComponentNamesInput,
} from "@mission-platform/forge-cms-plugin-api";
import type {
  CompilerDiagnostic,
  SemanticModule,
} from "@mission-platform/forge-plugin-api";

/** Every neutral kind in one component, including the three marker types. */
const KINDS = [
  "import { h, type MpChild, type MpElement } from '@mission-platform/forge';",
  "",
  "export type KindsTone = 'light' | 'dark';",
  "",
  "export interface KindsProperties {",
  "  children?: MpChild | readonly MpChild[];",
  "  /** Plain heading. */",
  "  heading?: string;",
  "  /** Formatted body copy. */",
  "  body?: MpRichText;",
  "  /** Number of columns. */",
  "  columns?: number;",
  "  /** Compact spacing. */",
  "  compact?: boolean;",
  "  /** Colour tone. */",
  "  tone?: KindsTone;",
  "  /** Hero image. */",
  "  image?: MpAsset;",
  "  /** Where the card links to. */",
  "  href?: MpLink;",
  "}",
  "",
  "export function ForgeKinds(properties: KindsProperties): MpElement {",
  '  return <div class="kinds">{properties.children}</div>;',
  "}",
].join("\n");

const kindsNames: ContentComponentNamesInput = {
  neutralName: "ForgeKinds",
  publicName: "Kinds",
  folder: "forge-kinds",
  propertiesType: "KindsProperties",
};

function irFor(
  source: string,
  names: ContentComponentNamesInput,
): SemanticModule {
  return analyzeForgeModule({
    source,
    fileName: `${names.folder}.tsx`,
    moduleKind: "component",
    componentName: names.neutralName,
  });
}

function contentOf(
  source: string,
  names: ContentComponentNamesInput,
): ContentComponent {
  return analyzeContentComponent(
    parseOxcModule(`${names.folder}.tsx`, source),
    names,
  );
}

function contextFor(
  islandEntry: string | undefined = "./island/index.js",
  diagnostics: CompilerDiagnostic[] = [],
): CmsTargetContext {
  return {
    rootDir: "/tmp/pkg",
    outDir: "/tmp/pkg/out",
    componentsImport: "@acme/components",
    framework: stubFramework("react"),
    islandEntry,
    diagnostics,
  };
}

function webflowTarget(
  options: { libraryName?: string; group?: string } = {},
): CmsOutputPlugin {
  return forgeWebflowCms({
    packageName: "@acme/components",
    plugin: stubFramework("react"),
    ...options,
  });
}

function declarationOf(
  source: string,
  names: ContentComponentNamesInput,
  options: {
    islandEntry?: string;
    diagnostics?: CompilerDiagnostic[];
    group?: string;
  } = {},
): CmsArtifact {
  return webflowTarget({ group: options.group }).emitTemplate(
    contentOf(source, names),
    irFor(source, names),
    contextFor(options.islandEntry, options.diagnostics),
  );
}

/** The `<key>: props.X({ … })` line a declaration authored one prop under. */
function propertyLine(contents: string, key: string): string {
  const line = contents
    .split("\n")
    .find((candidate) => candidate.trimStart().startsWith(`${key}: props.`));
  expect(line, `no declaration line for "${key}"`).toBeDefined();
  return (line as string).trim();
}

function manifestOf(libraryName?: string): CmsArtifact {
  const [artifact] =
    webflowTarget({ libraryName }).emitManifest?.([], contextFor()) ?? [];
  return artifact;
}

/** Whether a Webflow `library.components` glob matches a built file path. */
function globMatches(pattern: string, filePath: string): boolean {
  const source = pattern
    .split("*")
    .map((part) => part.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`))
    .join("[^/]*");
  return new RegExp(`^${source}$`).test(filePath);
}

describe("the Webflow CMS target", () => {
  it("declares itself a React-only island target with the Webflow runtime external", () => {
    const target = webflowTarget();
    expect(target.id).toBe("webflow");
    expect(target.island).toBe("framework");
    expect(target.supportedFrameworks).toEqual(["react"]);
    expect(target.runtimeExternals).toEqual([
      "@webflow/react",
      "@webflow/data-types",
    ]);
    expect(target.build).toEqual({});
  });

  it("rejects a framework plugin Webflow cannot render", () => {
    expect(() =>
      forgeWebflowCms({
        packageName: "@acme/components",
        plugin: stubFramework("vue"),
      }),
    ).toThrow(TypeError);
    expect(() =>
      forgeWebflowCms({
        packageName: "@acme/components",
        plugin: stubFramework("vue"),
      }),
    ).toThrow(/does not support the "vue" framework plugin/);
  });

  it("emits no schema, because the declaration is the schema", () => {
    expect(webflowTarget().emitSchema).toBeUndefined();
  });
});

describe("the Webflow code component declaration", () => {
  const badge = declarationOf(BADGE, badgeNames);

  it("writes one `.webflow.tsx` declaration per component, never as an asset", () => {
    expect(badge.fileName).toBe("Badge.webflow.tsx");
    expect(badge.artifactKind).toBe("declaration");
    expect(badge.asset).toBeUndefined();
  });

  it("wraps the co-generated island in `declareComponent`", () => {
    expect(badge.contents).toContain(
      "import { declareComponent } from '@webflow/react';",
    );
    expect(badge.contents).toContain(
      "import { props } from '@webflow/data-types';",
    );
    expect(badge.contents).toContain(
      "import { Badge } from './island/index.js';",
    );
    expect(badge.contents).toContain(
      "export default declareComponent(Badge, {",
    );
    expect(badge.contents).toContain("  name: 'Badge',");
    expect(badge.contents).toContain("  group: 'Mission Platform',");
    expect(badge.contents.endsWith("});\n")).toBe(true);
  });

  it("imports the island from `context.islandEntry` when the driver supplied one", () => {
    const counter = declarationOf(BADGE, badgeNames, {
      islandEntry: "../island/entry.js",
    });
    expect(counter.contents).toContain(
      "import { Badge } from '../island/entry.js';",
    );
    expect(counter.contents).not.toContain("./island/index.js");
  });

  it("falls back to the sibling island barrel when no entry was co-generated", () => {
    const badgeWithoutIsland = declarationOf(BADGE, badgeNames, {
      islandEntry: undefined,
    });
    expect(badgeWithoutIsland.contents).toContain(
      "import { Badge } from './island/index.js';",
    );
  });

  it("describes the component with its first documented prop", () => {
    expect(badge.contents).toContain(
      "  description: 'Visual tone of the badge.',",
    );
  });

  it("authors a literal union as a variant carrying its options and default", () => {
    expect(propertyLine(badge.contents, "variant")).toBe(
      "variant: props.Variant({ name: 'Variant', options: ['default', 'primary', 'secondary'], defaultValue: 'default' }),",
    );
  });

  it("authors a boolean as a visibility toggle", () => {
    expect(propertyLine(badge.contents, "pill")).toBe(
      "pill: props.Visibility({ name: 'Pill' }),",
    );
  });

  it("authors the default slot as React `children` labelled `Content`", () => {
    expect(propertyLine(badge.contents, "children")).toBe(
      "children: props.Slot({ name: 'Content' }),",
    );
  });

  it("authors a named slot under its own prop name", () => {
    const layout = declarationOf(LAYOUT, layoutNames);
    expect(propertyLine(layout.contents, "header")).toBe(
      "header: props.Slot({ name: 'Header' }),",
    );
  });

  it("honours a caller-supplied Designer group", () => {
    const grouped = declarationOf(BADGE, badgeNames, { group: "Acme" });
    expect(grouped.contents).toContain("  group: 'Acme',");
  });

  it("emits an empty prop record for a component with no authorable fields", () => {
    const empty = declarationOf(EMPTY, emptyNames);
    expect(empty.contents).toBe(
      [
        "import { declareComponent } from '@webflow/react';",
        "",
        "import { Empty } from './island/index.js';",
        "",
        "export default declareComponent(Empty, {",
        "  name: 'Empty',",
        "  group: 'Mission Platform',",
        "  props: {},",
        "});",
        "",
      ].join("\n"),
    );
  });

  it("is deterministic across regenerations", () => {
    expect(declarationOf(BADGE, badgeNames).contents).toBe(badge.contents);
  });
});

describe("the neutral kind to `@webflow/data-types` mapping", () => {
  const kinds = declarationOf(KINDS, kindsNames).contents;

  it("maps `text` onto `props.Text`", () => {
    expect(propertyLine(kinds, "heading")).toBe(
      "heading: props.Text({ name: 'Heading' }),",
    );
  });

  it("maps `richtext` onto `props.RichText`", () => {
    expect(propertyLine(kinds, "body")).toBe(
      "body: props.RichText({ name: 'Body' }),",
    );
  });

  it("maps `number` onto `props.Text`, the only text-shaped prop Webflow has", () => {
    expect(propertyLine(kinds, "columns")).toBe(
      "columns: props.Text({ name: 'Columns' }),",
    );
  });

  it("maps `boolean` onto `props.Visibility`", () => {
    expect(propertyLine(kinds, "compact")).toBe(
      "compact: props.Visibility({ name: 'Compact' }),",
    );
  });

  it("maps `option` onto `props.Variant` with its options", () => {
    expect(propertyLine(kinds, "tone")).toBe(
      "tone: props.Variant({ name: 'Tone', options: ['light', 'dark'] }),",
    );
  });

  it("maps `asset` onto `props.Image`", () => {
    expect(propertyLine(kinds, "image")).toBe(
      "image: props.Image({ name: 'Image' }),",
    );
  });

  it("maps `link` onto `props.Link`", () => {
    expect(propertyLine(kinds, "href")).toBe(
      "href: props.Link({ name: 'Href' }),",
    );
  });

  it("maps `children` onto `props.Slot`", () => {
    expect(propertyLine(kinds, "children")).toBe(
      "children: props.Slot({ name: 'Content' }),",
    );
  });
});

describe("Webflow diagnostics", () => {
  it("warns that a numeric prop is authored as text, and still emits it", () => {
    const diagnostics: CompilerDiagnostic[] = [];
    const grid = declarationOf(GRID, gridNames, { diagnostics });
    expect(propertyLine(grid.contents, "rows")).toBe(
      "rows: props.Text({ name: 'Rows', defaultValue: '3' }),",
    );
    expect(diagnostics.map((entry) => entry.code)).toEqual([
      "FORGE_WEBFLOW_NUMBER_AS_TEXT",
    ]);
    expect(diagnostics[0].phase).toBe("generation");
    expect(diagnostics[0].severity).toBe("warning");
    expect(diagnostics[0].fileName).toBe("forge-grid.tsx");
  });

  it("never raises an error, so a degraded prop cannot fail a build", () => {
    const diagnostics: CompilerDiagnostic[] = [];
    declarationOf(GRID, gridNames, { diagnostics });
    declarationOf(KINDS, kindsNames, { diagnostics });
    declarationOf(BADGE, badgeNames, { diagnostics });
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics.some((entry) => entry.severity === "error")).toBe(false);
  });

  it("reports nothing for a component Webflow can express losslessly", () => {
    const diagnostics: CompilerDiagnostic[] = [];
    declarationOf(BADGE, badgeNames, { diagnostics });
    expect(diagnostics).toEqual([]);
  });
});

describe("the Webflow library manifest", () => {
  it("emits `webflow.json` as a copied asset", () => {
    const manifest = manifestOf();
    expect(manifest.fileName).toBe("webflow.json");
    expect(manifest.artifactKind).toBe("manifest");
    expect(manifest.asset).toBe(true);
    expect(manifest.contents.endsWith("\n")).toBe(true);
  });

  it("parses as JSON and names the library", () => {
    const parsed = JSON.parse(manifestOf().contents) as WebflowManifest;
    expect(parsed).toEqual({
      library: {
        name: "Forge",
        components: ["./cms/webflow/react/*.webflow.js"],
      },
    });
    expect(JSON.parse(manifestOf("Acme UI").contents)).toEqual({
      library: {
        name: "Acme UI",
        components: ["./cms/webflow/react/*.webflow.js"],
      },
    });
  });

  it("globs the built form of every emitted declaration", () => {
    const parsed = JSON.parse(manifestOf().contents) as WebflowManifest;
    const [pattern] = parsed.library.components;
    for (const [source, names] of [
      [BADGE, badgeNames],
      [GRID, gridNames],
      [LAYOUT, layoutNames],
    ] as const) {
      const built = declarationOf(source, names).fileName.replace(
        /\.tsx$/,
        ".js",
      );
      expect(globMatches(pattern, `./cms/webflow/react/${built}`)).toBe(true);
    }
    expect(globMatches(pattern, "./cms/webflow/react/island/index.js")).toBe(
      false,
    );
  });
});

describe("the Webflow entry barrel", () => {
  it("re-exports every declaration under a name the island cannot shadow", () => {
    const components = [
      contentOf(BADGE, badgeNames),
      contentOf(GRID, gridNames),
      contentOf(LAYOUT, layoutNames),
    ];
    const [entry] = webflowTarget().emitEntry?.(components, contextFor()) ?? [];
    expect(entry.fileName).toBe("index.ts");
    expect(entry.artifactKind).toBe("entry");
    expect(entry.contents).toBe(
      [
        "export { default as BadgeComponent } from './Badge.webflow.js';",
        "export { default as GridComponent } from './Grid.webflow.js';",
        "export { default as LayoutComponent } from './Layout.webflow.js';",
        "",
      ].join("\n"),
    );
    expect(emitWebflowEntry(components)).toBe(entry.contents);
  });
});
