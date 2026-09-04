import { analyzeContentComponent } from "@mission-platform/forge-cms-plugin-api";
import {
  BADGE,
  BUTTON,
  EMPTY,
  GRID,
  LAYOUT,
  SITE_HEADER,
  badgeNames,
  buttonNames,
  emptyNames,
  gridNames,
  layoutNames,
  siteHeaderNames,
  stubFramework,
} from "@mission-platform/forge-cms-plugin-api/fixtures";
import { analyzeForgeModule } from "@mission-platform/vite-plugin-forge";
import { parseOxcModule } from "@mission-platform/vite-plugin-forge/compiler/oxc.js";
import { describe, expect, it } from "vitest";

import { forgeGhostCms } from "./ghost.js";

import type {
  GhostComponentEntry,
  GhostComponentsManifest,
  GhostThemeConfig,
} from "./manifest.js";
import type {
  CmsArtifact,
  CmsTargetContext,
  ContentComponent,
  ContentComponentNamesInput,
} from "@mission-platform/forge-cms-plugin-api";
import type {
  CompilerDiagnostic,
  SemanticModule,
} from "@mission-platform/forge-plugin-api";

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

function contextFor(diagnostics: CompilerDiagnostic[] = []): CmsTargetContext {
  return {
    rootDir: "/tmp/pkg",
    outDir: "/tmp/pkg/out",
    componentsImport: "@acme/components",
    framework: stubFramework("vue"),
    diagnostics,
  };
}

function ghostTarget(themeName?: string): ReturnType<typeof forgeGhostCms> {
  return forgeGhostCms({
    packageName: "@acme/components",
    plugin: stubFramework("vue"),
    themeName,
  });
}

function partial(
  source: string,
  names: ContentComponentNamesInput,
  diagnostics: CompilerDiagnostic[] = [],
): CmsArtifact {
  return ghostTarget().emitTemplate(
    contentOf(source, names),
    irFor(source, names),
    contextFor(diagnostics),
  );
}

function manifests(
  components: readonly ContentComponent[],
  diagnostics: CompilerDiagnostic[] = [],
  themeName?: string,
): readonly CmsArtifact[] {
  return (
    ghostTarget(themeName).emitManifest?.(
      components,
      contextFor(diagnostics),
    ) ?? []
  );
}

function componentsManifest(
  components: readonly ContentComponent[],
): GhostComponentsManifest {
  const [artifact] = manifests(components);
  expect(artifact.fileName).toBe("forge-components.json");
  expect(artifact.artifactKind).toBe("manifest");
  expect(artifact.asset).toBe(true);
  expect(artifact.contents.endsWith("\n")).toBe(true);
  return JSON.parse(artifact.contents) as GhostComponentsManifest;
}

function entryFor(
  manifest: GhostComponentsManifest,
  name: string,
): GhostComponentEntry {
  const entry = manifest.components.find((item) => item.name === name);
  expect(entry).toBeDefined();
  return entry as GhostComponentEntry;
}

function themeConfigOf(
  components: readonly ContentComponent[],
  diagnostics: CompilerDiagnostic[] = [],
  themeName?: string,
): GhostThemeConfig {
  const artifact = manifests(components, diagnostics, themeName)[1];
  expect(artifact.fileName).toBe("ghost-theme-config.json");
  expect(artifact.artifactKind).toBe("manifest");
  expect(artifact.asset).toBe(true);
  expect(artifact.contents.endsWith("\n")).toBe(true);
  return JSON.parse(artifact.contents) as GhostThemeConfig;
}

/** A component whose props exceed Ghost's twenty-setting ceiling. */
function settingsSource(count: number): string {
  const members: string[] = [];
  for (let index = 1; index <= count; index += 1) {
    const name = `setting${String(index).padStart(2, "0")}`;
    members.push(
      `  /**`,
      `   * Setting ${index}.`,
      `   * @cmsSetting`,
      `   */`,
      `  ${name}?: string;`,
    );
  }
  return [
    "import { h, type MpElement } from '@mission-platform/forge-jsx';",
    "",
    "export interface SettingsProperties {",
    ...members,
    "}",
    "",
    "export function ForgeSettings(properties: SettingsProperties): MpElement {",
    '  return <div class="settings">{properties.setting01}</div>;',
    "}",
  ].join("\n");
}

const settingsNames: ContentComponentNamesInput = {
  neutralName: "ForgeSettings",
  publicName: "Settings",
  folder: "forge-settings",
  propertiesType: "SettingsProperties",
};

describe("the Ghost CMS target", () => {
  it("declares itself a framework-agnostic, island-free target", () => {
    const target = ghostTarget();
    expect(target.id).toBe("ghost");
    expect(target.island).toBe("none");
    expect(target.supportedFrameworks).toBeUndefined();
    expect(target.build).toEqual({});
  });

  it("accepts any bound framework plugin, since Handlebars needs none", () => {
    for (const framework of ["react", "vue", "solid", "svelte"]) {
      expect(
        forgeGhostCms({
          packageName: "@acme/components",
          plugin: stubFramework(framework),
        }).framework.id,
      ).toBe(framework);
    }
  });

  it("emits neither a schema nor a module entry", () => {
    const target = ghostTarget();
    expect(target.emitSchema).toBeUndefined();
    expect(target.emitEntry).toBeUndefined();
  });
});

describe("the Ghost Handlebars partial", () => {
  const badge = partial(BADGE, badgeNames);

  it("writes one partial per component under `partials/forge/`", () => {
    expect(badge.fileName).toBe("partials/forge/badge.hbs");
    expect(badge.artifactKind).toBe("template");
    expect(badge.asset).toBe(true);
    expect(
      badge.contents.startsWith("{{!-- partials/forge/badge.hbs --}}"),
    ).toBe(true);
  });

  it("guards every field and re-expresses its neutral default as a fallback", () => {
    expect(badge.contents).toContain("{{#if variant}}");
    expect(badge.contents).toContain(
      "{{#if variant}}{{variant}}{{else}}default{{/if}}",
    );
    expect(badge.contents).toContain("{{#if size}}{{size}}{{else}}md{{/if}}");
  });

  it("guards a field without a default without inventing one", () => {
    expect(badge.contents).toContain("{{#if pill}}{{pill}}{{/if}}");
    expect(badge.contents).not.toContain("{{#if pill}}{{pill}}{{else}}");
  });

  it("renders the default slot as the partial block", () => {
    expect(badge.contents).toContain(
      "{{#if @partial-block}}{{> @partial-block}}{{/if}}",
    );
  });

  it("exposes every non-slot field as a `data-*` attribute of the root", () => {
    expect(badge.contents).toContain('<div class="forge-badge"');
    expect(badge.contents).toContain('data-variant="{{variant}}"');
    expect(badge.contents).toContain('data-size="{{size}}"');
    expect(badge.contents).toContain('data-pill="{{pill}}"');
  });

  it("renders a named slot as unescaped, pre-rendered markup", () => {
    const layout = partial(LAYOUT, layoutNames);
    expect(layout.fileName).toBe("partials/forge/layout.hbs");
    expect(layout.contents).toContain("{{#if header}}{{{header}}}{{/if}}");
    expect(layout.contents).toContain(
      "{{#if @partial-block}}{{> @partial-block}}{{/if}}",
    );
  });

  it("emits a parameterless partial for a component with no authorable props", () => {
    const empty = partial(EMPTY, emptyNames);
    expect(empty.fileName).toBe("partials/forge/empty.hbs");
    expect(empty.contents).toBe(
      [
        "{{!-- partials/forge/empty.hbs --}}",
        '<div class="forge-empty">',
        "</div>",
        "",
      ].join("\n"),
    );
  });

  it("is deterministic across regenerations", () => {
    expect(partial(BADGE, badgeNames).contents).toBe(badge.contents);
  });
});

describe("the Ghost component manifest", () => {
  const manifest = componentsManifest([
    contentOf(BADGE, badgeNames),
    contentOf(BUTTON, buttonNames),
    contentOf(LAYOUT, layoutNames),
  ]);

  it("names the partial each component is invoked as", () => {
    const badge = entryFor(manifest, "badge");
    expect(badge.displayName).toBe("Badge");
    expect(badge.partial).toBe("forge/badge");
  });

  it("documents every parameter's type, default and description", () => {
    const badge = entryFor(manifest, "badge");
    expect(badge.parameters).toContainEqual({
      name: "variant",
      type: "select",
      required: false,
      default: "default",
      description: "Visual tone of the badge.",
      options: ["default", "primary", "secondary"],
    });
    expect(badge.parameters).toContainEqual({
      name: "pill",
      type: "boolean",
      required: false,
      description: 'Use a fully rounded ("pill") shape.',
    });
  });

  it("omits callback props, which no Handlebars partial can accept", () => {
    const button = entryFor(manifest, "button");
    const names = button.parameters.map((parameter) => parameter.name);
    expect(names).toContain("variant");
    expect(names).toContain("disabled");
    expect(names).not.toContain("onClick");
  });

  it("lists slots separately from parameters", () => {
    const layout = entryFor(manifest, "layout");
    expect(layout.parameters.map((parameter) => parameter.name)).toEqual([
      "sticky",
    ]);
    expect(layout.slots).toEqual([
      { name: "header", prop: "header", block: false },
      { name: "default", prop: "content", block: true },
    ]);
  });
});

describe("the Ghost theme config fragment", () => {
  it("exposes only `@cmsSetting` fields, keyed in snake_case", () => {
    const config = themeConfigOf([
      contentOf(SITE_HEADER, siteHeaderNames),
      contentOf(BADGE, badgeNames),
    ]);
    expect(Object.keys(config.config.custom)).toEqual(["brand_name"]);
    expect(config.config.custom.brand_name).toEqual({
      type: "text",
      default: "Mission",
    });
  });

  it("defaults the theme name to `forge` and honours an override", () => {
    const components = [contentOf(SITE_HEADER, siteHeaderNames)];
    expect(themeConfigOf(components).name).toBe("forge");
    expect(themeConfigOf(components, [], "casper").name).toBe("casper");
  });

  it("maps every neutral kind onto one of Ghost's five setting types", () => {
    const source = [
      "import { h, type MpElement } from '@mission-platform/forge-jsx';",
      "",
      "export type Tone = 'light' | 'dark';",
      "",
      "export interface KindsProperties {",
      "  /**",
      "   * Tone.",
      "   * @cmsSetting",
      "   */",
      "  tone?: Tone;",
      "  /**",
      "   * Compact.",
      "   * @cmsSetting",
      "   */",
      "  compact?: boolean;",
      "  /**",
      "   * Logo.",
      "   * @cmsSetting",
      "   */",
      "  logo?: MpAsset;",
      "  /**",
      "   * Target.",
      "   * @cmsSetting",
      "   */",
      "  target?: MpLink;",
      "  /**",
      "   * Body.",
      "   * @cmsSetting",
      "   */",
      "  body?: MpRichText;",
      "  /**",
      "   * Title.",
      "   * @cmsSetting",
      "   */",
      "  title?: string;",
      "  /**",
      "   * Columns.",
      "   * @cmsSetting",
      "   */",
      "  columns?: number;",
      "}",
      "",
      "export function ForgeKinds(properties: KindsProperties): MpElement {",
      '  return <div class="kinds">{properties.title}</div>;',
      "}",
    ].join("\n");
    const config = themeConfigOf([
      contentOf(source, {
        neutralName: "ForgeKinds",
        publicName: "Kinds",
        folder: "forge-kinds",
        propertiesType: "KindsProperties",
      }),
    ]);
    const types = Object.fromEntries(
      Object.entries(config.config.custom).map(([key, setting]) => [
        key,
        setting.type,
      ]),
    );
    expect(types).toEqual({
      tone: "select",
      compact: "boolean",
      logo: "image",
      target: "text",
      body: "text",
      title: "text",
      columns: "text",
    });
    expect(config.config.custom.tone).toEqual({
      type: "select",
      options: ["light", "dark"],
    });
  });
});

describe("Ghost diagnostics", () => {
  it("warns that a numeric field degrades to text, and still emits the partial", () => {
    const diagnostics: CompilerDiagnostic[] = [];
    const grid = partial(GRID, gridNames, diagnostics);
    expect(diagnostics.map((entry) => entry.code)).toContain(
      "FORGE_GHOST_FIELD_UNSUPPORTED",
    );
    expect(diagnostics.every((entry) => entry.severity === "warning")).toBe(
      true,
    );
    expect(diagnostics.every((entry) => entry.phase === "generation")).toBe(
      true,
    );
    expect(grid.contents).toContain("{{#if rows}}{{rows}}{{else}}3{{/if}}");
  });

  it("warns when a numeric `@cmsSetting` field is exposed as a text setting", () => {
    const source = [
      "import { h, type MpElement } from '@mission-platform/forge-jsx';",
      "",
      "export interface TickerProperties {",
      "  /**",
      "   * Rotation interval.",
      "   * @cmsSetting",
      "   */",
      "  interval?: number;",
      "}",
      "",
      "export function ForgeTicker(properties: TickerProperties): MpElement {",
      "  const interval = properties.interval ?? 5;",
      '  return <div class="ticker">{interval}</div>;',
      "}",
    ].join("\n");
    const diagnostics: CompilerDiagnostic[] = [];
    const [, themeConfig] = manifests(
      [
        contentOf(source, {
          neutralName: "ForgeTicker",
          publicName: "Ticker",
          folder: "forge-ticker",
          propertiesType: "TickerProperties",
        }),
      ],
      diagnostics,
    );
    const parsed = JSON.parse(themeConfig.contents) as GhostThemeConfig;
    expect(parsed.config.custom.interval).toEqual({
      type: "text",
      default: 5,
    });
    expect(diagnostics.map((entry) => entry.code)).toEqual([
      "FORGE_GHOST_FIELD_UNSUPPORTED",
    ]);
  });

  it("truncates at twenty settings and reports how many were dropped", () => {
    const diagnostics: CompilerDiagnostic[] = [];
    const source = settingsSource(23);
    const [, themeConfig] = manifests(
      [contentOf(source, settingsNames)],
      diagnostics,
    );
    const parsed = JSON.parse(themeConfig.contents) as GhostThemeConfig;
    expect(Object.keys(parsed.config.custom)).toHaveLength(20);
    expect(Object.keys(parsed.config.custom).at(-1)).toBe("setting20");

    const limit = diagnostics.find(
      (entry) => entry.code === "FORGE_GHOST_SETTING_LIMIT",
    );
    expect(limit).toBeDefined();
    expect(limit?.severity).toBe("warning");
    expect(limit?.message).toContain("3 @cmsSetting fields were dropped");
  });

  it("does not report the limit when the theme stays within it", () => {
    const diagnostics: CompilerDiagnostic[] = [];
    manifests([contentOf(settingsSource(20), settingsNames)], diagnostics);
    expect(diagnostics).toEqual([]);
  });

  it("never raises an error, so Ghost's limits degrade instead of failing", () => {
    const diagnostics: CompilerDiagnostic[] = [];
    partial(GRID, gridNames, diagnostics);
    manifests([contentOf(settingsSource(23), settingsNames)], diagnostics);
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics.some((entry) => entry.severity === "error")).toBe(false);
  });
});
