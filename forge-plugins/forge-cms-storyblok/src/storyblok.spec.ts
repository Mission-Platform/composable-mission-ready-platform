import {
  analyzeContentComponent,
  toDisplayName,
  toTechnicalName,
} from "@mission-platform/forge-cms-plugin-api";
import {
  BADGE,
  BUTTON,
  EMPTY,
  GRID,
  LAYOUT,
  badgeNames,
  buttonNames,
  emptyNames,
  gridNames,
  layoutNames,
  requiredNames,
  REQUIRED,
  stubFramework,
} from "@mission-platform/forge-cms-plugin-api/fixtures";
import { parseOxcModule } from "@mission-platform/vite-plugin-forge/compiler/oxc.js";
import { describe, expect, it } from "vitest";

import { analyzeStoryblokComponent, emitStoryblokComponent } from "./fields.js";
import { forgeStoryblokCms } from "./storyblok.js";
import { emitBlokDataType, emitStoryblokBlokWrapper } from "./wrappers.js";

import type {
  ContentComponent,
  ContentComponentNamesInput,
} from "@mission-platform/forge-cms-plugin-api";

function analyze(source: string, names: ContentComponentNamesInput) {
  return analyzeStoryblokComponent(
    parseOxcModule(`${names.folder}.tsx`, source),
    names,
  );
}

/** The neutral content model of a fixture, as the driver would supply it. */
function contentOf(
  source: string,
  names: ContentComponentNamesInput,
): ContentComponent {
  return analyzeContentComponent(
    parseOxcModule(`${names.folder}.tsx`, source),
    names,
  );
}

const ANNOTATED_SETTING = [
  "import { h, type MpElement } from '@mission-platform/forge';",
  "",
  "export interface AnnotatedSettingProperties {",
  "  /**",
  "   * Editor label.",
  "   * @cmsSetting",
  "   */",
  "  label?: string;",
  "  /** Whether the component is enabled. */",
  "  enabled?: boolean;",
  "}",
  "",
  "/**",
  " * A component with explicit Storyblok editor metadata.",
  " * @cmsIcon   editorial-star",
  " * @cmsColour: #123abc",
  " */",
  "export function ForgeAnnotatedSetting(properties: AnnotatedSettingProperties): MpElement {",
  "  const label = properties.label ?? 'Default label';",
  "  return <div data-enabled={properties.enabled}>{label}</div>;",
  "}",
].join("\n");

const annotatedSettingNames: ContentComponentNamesInput = {
  neutralName: "ForgeAnnotatedSetting",
  publicName: "AnnotatedSetting",
  folder: "forge-annotated-setting",
  propertiesType: "AnnotatedSettingProperties",
};

const TABBED = [
  "import { h, type MpElement } from '@mission-platform/forge';",
  "",
  "export interface TabbedProperties {",
  "  /** @cmsTab Content */",
  "  title?: string;",
  "  /** Root-level state. */",
  "  enabled?: boolean;",
  "  /** @cmsTab: Content */",
  "  description?: string;",
  "  /** @cmsTab Content! */",
  "  action?: string;",
  "  /** Collides with a generated tab key. */",
  "  tab_content?: string;",
  "}",
  "",
  "export function ForgeTabbed(properties: TabbedProperties): MpElement {",
  "  return <div>{properties.title}{properties.enabled}{properties.description}{properties.action}{properties.tab_content}</div>;",
  "}",
].join("\n");

const tabbedNames: ContentComponentNamesInput = {
  neutralName: "ForgeTabbed",
  publicName: "Tabbed",
  folder: "forge-tabbed",
  propertiesType: "TabbedProperties",
};

describe("the Storyblok name helpers", () => {
  it("derives technical (snake_case) names", () => {
    expect(toTechnicalName("Badge")).toBe("badge");
    expect(toTechnicalName("InView")).toBe("in_view");
  });

  it("derives display (spaced) names", () => {
    expect(toDisplayName("Badge")).toBe("Badge");
    expect(toDisplayName("InView")).toBe("In View");
  });
});

describe("emitStoryblokComponent maps the props interface to a blok schema", () => {
  const badge = emitStoryblokComponent(
    parseOxcModule("forge-badge.tsx", BADGE),
    badgeNames,
  );

  it("emits a nestable, non-root component object with technical + display names", () => {
    expect(badge.name).toBe("badge");
    expect(badge.display_name).toBe("Badge");
    expect(badge.is_nestable).toBe(true);
    expect(badge.is_root).toBe(false);
    expect(badge.real_name).toBe("badge");
  });

  it("turns string-literal union (type alias) props into option fields with self options", () => {
    expect(badge.schema.variant.type).toBe("option");
    expect(badge.schema.variant.options).toEqual([
      { name: "default", value: "default" },
      { name: "primary", value: "primary" },
      { name: "secondary", value: "secondary" },
    ]);
  });

  it("captures JSDoc as the field description and `?? default` as the default value", () => {
    expect(badge.schema.variant.description).toBe("Visual tone of the badge.");
    expect(badge.schema.variant.default_value).toBe("default");
    expect(badge.schema.size.default_value).toBe("md");
  });

  it("maps boolean props to boolean fields", () => {
    expect(badge.schema.pill.type).toBe("boolean");
  });

  it("exposes the default slot (`children`) as a trailing nestable `bloks` field", () => {
    expect(badge.schema.content.type).toBe("bloks");
    expect(badge.schema.content.pos).toBe(3);
  });
});

describe("Storyblok component editor metadata", () => {
  it("prefers component annotations for icon and colour", () => {
    const component = emitStoryblokComponent(
      parseOxcModule("forge-annotated-setting.tsx", ANNOTATED_SETTING),
      annotatedSettingNames,
    );

    expect(component.icon).toBe("editorial-star");
    expect(component.color).toBe("#123abc");
  });

  it("uses deterministic name-derived metadata when annotations are absent", () => {
    const component = emitStoryblokComponent(
      parseOxcModule("forge-badge.tsx", BADGE),
      badgeNames,
    );

    expect(component.icon).toBe("block-icon-badge");
    expect(component.color).toBe("#648278");
    expect(component).toEqual(
      emitStoryblokComponent(
        parseOxcModule("forge-badge.tsx", BADGE),
        badgeNames,
      ),
    );
  });
});

describe("emitStoryblokComponent handles primitives and drops callbacks", () => {
  const button = emitStoryblokComponent(
    parseOxcModule("forge-button.tsx", BUTTON),
    buttonNames,
  );
  const grid = emitStoryblokComponent(
    parseOxcModule("forge-grid.tsx", GRID),
    gridNames,
  );

  it("drops function (callback) props such as `onClick`", () => {
    expect(button.schema.onClick).toBeUndefined();
  });

  it("degrades a `string | number` union to a free-text field", () => {
    expect(button.schema.badge.type).toBe("text");
    expect(button.schema.badge.translatable).toBe(true);
  });

  it("maps number props to number fields and records numeric defaults", () => {
    expect(grid.schema.rows.type).toBe("number");
    expect(grid.schema.rows.default_value).toBe(3);
  });
});

describe("emitStoryblokComponent maps `MpChild` props to named-slot `bloks` fields", () => {
  const layout = emitStoryblokComponent(
    parseOxcModule("forge-layout.tsx", LAYOUT),
    layoutNames,
  );

  it("keeps the boolean prop and exposes the `MpChild` prop as `bloks`", () => {
    expect(layout.schema.sticky.type).toBe("boolean");
    expect(layout.schema.header.type).toBe("bloks");
  });

  it("still appends the default-slot `content` bloks field", () => {
    expect(layout.schema.content.type).toBe("bloks");
  });
});

describe("the Vue blok wrapper emitter", () => {
  const analyzed = analyze(BADGE, badgeNames);
  const vue = emitStoryblokBlokWrapper(analyzed, "Badge", {
    framework: "vue",
    componentsImport: "@mission-platform/components",
  });

  it("emits a `<script setup>` SFC importing the built component", () => {
    expect(vue).toContain('<script setup lang="ts">');
    expect(vue).toContain(
      "import { Badge } from '@mission-platform/components';",
    );
  });

  it("types the `blok` prop with the precise per-field interface", () => {
    expect(vue).toContain(
      "defineProps<{ blok: SbBlokData & { variant?: 'default' | 'primary' | 'secondary'; size?: 'sm' | 'md' | 'lg'; pill?: boolean; content?: SbBlokData[] } }>();",
    );
    expect(vue).not.toContain("Record<string, unknown>");
  });

  it("tags the component editable and binds each non-slot field", () => {
    expect(vue).toContain('v-editable="blok"');
    expect(vue).toContain(':variant="blok.variant"');
    expect(vue).toContain(':size="blok.size"');
    expect(vue).toContain(':pill="blok.pill"');
  });

  it("renders the default slot bloks via StoryblokComponent", () => {
    expect(vue).toContain("<StoryblokComponent");
    expect(vue).toContain(
      'v-for="nested in (blok.content as SbBlokData[] | undefined) ?? []"',
    );
    expect(vue).toContain(':blok="nested"');
  });
});

describe("the Vue blok wrapper emitter handles named slots", () => {
  const vue = emitStoryblokBlokWrapper(analyze(LAYOUT, layoutNames), "Layout", {
    framework: "vue",
    componentsImport: "@mission-platform/components",
  });

  it("routes a named-slot bloks field into the matching `<template #name>`", () => {
    expect(vue).toContain("<template #header>");
    expect(vue).toContain(
      'v-for="nested in (blok.header as SbBlokData[] | undefined) ?? []"',
    );
  });
});

describe("the React blok wrapper emitter", () => {
  const react = emitStoryblokBlokWrapper(analyze(BADGE, badgeNames), "Badge", {
    framework: "react",
    componentsImport: "@mission-platform/components",
  });

  it("emits a function component importing the built component and Storyblok helpers", () => {
    expect(react).toContain(
      "import { Badge } from '@mission-platform/components';",
    );
    expect(react).toContain(
      "import { StoryblokComponent, storyblokEditable, type SbBlokData } from '@storyblok/react';",
    );
    expect(react).toContain(
      "export function BadgeBlok({ blok }: BadgeBlokProperties) {",
    );
  });

  it("types the `blok` prop with the precise per-field interface", () => {
    expect(react).toContain(
      "  blok: SbBlokData & { variant?: 'default' | 'primary' | 'secondary'; size?: 'sm' | 'md' | 'lg'; pill?: boolean; content?: SbBlokData[] };",
    );
    expect(react).not.toContain("Record<string, unknown>");
  });

  it("spreads `storyblokEditable(blok)` and binds each non-slot field", () => {
    expect(react).toContain("{...storyblokEditable(blok)}");
    expect(react).toContain("variant={blok.variant}");
    expect(react).toContain("pill={blok.pill}");
  });

  it("renders the default slot bloks through the renderBloks helper", () => {
    expect(react).toContain("const renderBloks");
    expect(react).toContain("{renderBloks(blok.content)}");
  });
});

describe("the React blok wrapper emitter handles named slots", () => {
  const react = emitStoryblokBlokWrapper(
    analyze(LAYOUT, layoutNames),
    "Layout",
    {
      framework: "react",
      componentsImport: "@mission-platform/components",
    },
  );

  it("passes a named-slot bloks field as a prop of the built component", () => {
    expect(react).toContain("header={renderBloks(blok.header)}");
  });
});

describe("the Solid blok wrapper emitter", () => {
  const solid = emitStoryblokBlokWrapper(analyze(BADGE, badgeNames), "Badge", {
    framework: "solid",
    componentsImport: "@mission-platform/components",
  });

  it("emits a Solid function component importing the built component and Storyblok helpers", () => {
    expect(solid).toContain(
      "import { Badge } from '@mission-platform/components';",
    );
    expect(solid).toContain(
      "import { StoryblokComponent } from '@mission-platform/forge-cms-storyblok/solid';",
    );
    expect(solid).toContain(
      "import { storyblokEditable, type SbBlokData } from '@storyblok/js';",
    );
    expect(solid).toContain(
      "export function BadgeBlok(properties: BadgeBlokProperties) {",
    );
  });

  it("spreads editable attributes and reads reactive fields off `properties.blok`", () => {
    expect(solid).toContain("{...storyblokEditable(properties.blok)}");
    expect(solid).toContain("variant={properties.blok.variant}");
    expect(solid).toContain("pill={properties.blok.pill}");
  });

  it("renders the default slot bloks through a `<For>` control-flow loop", () => {
    expect(solid).toContain("import { For } from 'solid-js';");
    expect(solid).toContain(
      "<For each={items as SbBlokData[]}>{(nested) => <StoryblokComponent blok={nested} />}</For>",
    );
    expect(solid).toContain("{renderBloks(properties.blok.content)}");
  });
});

describe("the Svelte blok wrapper emitter", () => {
  const svelte = emitStoryblokBlokWrapper(analyze(BADGE, badgeNames), "Badge", {
    framework: "svelte",
    componentsImport: "@mission-platform/components",
  });

  it("emits a Svelte 5 SFC importing the built component and Storyblok helpers", () => {
    expect(svelte).toContain('<script lang="ts">');
    expect(svelte).toContain(
      "import { StoryblokComponent, storyblokEditable, type SbBlokData } from '@storyblok/svelte';",
    );
    expect(svelte).toContain(
      "import { Badge } from '@mission-platform/components';",
    );
    expect(svelte).toContain("const { blok }");
    expect(svelte).toContain("= $props();");
  });

  it("applies the editable action on a `display: contents` host and binds each field", () => {
    expect(svelte).toContain(
      '<div use:storyblokEditable={blok} style="display: contents;">',
    );
    expect(svelte).toContain("variant={blok.variant}");
    expect(svelte).toContain("pill={blok.pill}");
  });

  it("renders the default slot bloks via an `{#each}` block of `<StoryblokComponent>`", () => {
    expect(svelte).toContain(
      "{#each (blok.content ?? []) as nested (nested._uid)}",
    );
    expect(svelte).toContain("<StoryblokComponent blok={nested} />");
  });
});

describe("the Svelte blok wrapper emitter handles named slots", () => {
  const svelte = emitStoryblokBlokWrapper(
    analyze(LAYOUT, layoutNames),
    "Layout",
    {
      framework: "svelte",
      componentsImport: "@mission-platform/components",
    },
  );

  it("routes a named-slot bloks field into a matching Svelte 5 `{#snippet}`", () => {
    expect(svelte).toContain("{#snippet header()}");
    expect(svelte).toContain(
      "{#each (blok.header ?? []) as nested (nested._uid)}",
    );
  });
});

describe("the Web-Component blok wrapper emitter", () => {
  const wc = emitStoryblokBlokWrapper(analyze(BADGE, badgeNames), "Badge", {
    framework: "web-components",
    componentsImport: "@mission-platform/components",
  });

  it("emits a native custom element registering the built element + Storyblok helper", () => {
    expect(wc).toContain("import '@mission-platform/components';");
    expect(wc).toContain(
      "import { storyblokEditable, type SbBlokData } from '@storyblok/js';",
    );
    expect(wc).toContain(
      "import { Badge } from '@mission-platform/components';",
    );
    expect(wc).toContain("export class BadgeBlok extends HTMLElement {");
    expect(wc).toContain("customElements.define('badge-blok', BadgeBlok);");
  });

  it("constructs the built element and assigns each field as a property", () => {
    expect(wc).toContain("const element = new Badge();");
    expect(wc).toContain(
      "(element as Record<string, unknown>).variant = blok.variant;",
    );
    expect(wc).toContain(
      "(element as Record<string, unknown>).pill = blok.pill;",
    );
    expect(wc).toContain("storyblokEditable(blok)");
  });

  it("appends the default slot bloks through nested `<component>-blok` elements", () => {
    expect(wc).toContain("appendBloks(element, blok.content);");
    expect(wc).toContain("document.createElement(`${nested.component}-blok`)");
  });
});

describe("emitBlokDataType derives a precise `blok` interface", () => {
  it("maps each field kind to its TypeScript type", () => {
    expect(emitBlokDataType(analyze(BADGE, badgeNames))).toBe(
      "SbBlokData & { variant?: 'default' | 'primary' | 'secondary'; size?: 'sm' | 'md' | 'lg'; pill?: boolean; content?: SbBlokData[] }",
    );
  });

  it("maps number props and degrades a `string | number` union to `string`", () => {
    expect(emitBlokDataType(analyze(BUTTON, buttonNames))).toBe(
      "SbBlokData & { variant?: 'primary' | 'secondary' | 'ghost'; disabled?: boolean; badge?: string; content?: SbBlokData[] }",
    );
    expect(emitBlokDataType(analyze(GRID, gridNames))).toBe(
      "SbBlokData & { rows?: number; content?: SbBlokData[] }",
    );
  });

  it("renders nestable (`bloks`) fields as `SbBlokData[]`", () => {
    expect(emitBlokDataType(analyze(LAYOUT, layoutNames))).toBe(
      "SbBlokData & { sticky?: boolean; header?: SbBlokData[]; content?: SbBlokData[] }",
    );
  });

  it("keeps non-optional props required (no `?`)", () => {
    expect(emitBlokDataType(analyze(REQUIRED, requiredNames))).toBe(
      "SbBlokData & { heading: string; subheading?: string }",
    );
  });

  it("degrades a field-less component to the bare `SbBlokData`", () => {
    expect(emitBlokDataType(analyze(EMPTY, emptyNames))).toBe("SbBlokData");
  });
});

describe("Storyblok editor tabs", () => {
  it("emits grouped tabs while leaving unannotated fields at the schema root", () => {
    const analyzed = analyzeStoryblokComponent(
      parseOxcModule("forge-tabbed.tsx", TABBED),
      tabbedNames,
    );

    expect(analyzed.fields.map((entry) => entry.prop)).toEqual([
      "title",
      "enabled",
      "description",
      "action",
      "tab_content",
    ]);
    expect(
      analyzed.fields.every((entry) => !entry.field.type.includes("tab")),
    ).toBe(true);
    expect(analyzed.component.schema).toEqual({
      tab_content_2: {
        type: "tab",
        display_name: "Content",
        keys: ["title", "description"],
        pos: 0,
      },
      title: { type: "text", pos: 1, translatable: true },
      enabled: { type: "boolean", pos: 2, description: "Root-level state." },
      description: { type: "text", pos: 3, translatable: true },
      tab_content_3: {
        type: "tab",
        display_name: "Content!",
        keys: ["action"],
        pos: 4,
      },
      action: { type: "text", pos: 5, translatable: true },
      tab_content: {
        type: "text",
        pos: 6,
        description: "Collides with a generated tab key.",
        translatable: true,
      },
    });
  });

  it("keeps tab keys and positions stable when an unrelated root field is added", () => {
    const withoutRootField = TABBED.replace(
      "  /** Root-level state. */\n  enabled?: boolean;\n",
      "",
    );
    const withRoot = analyzeStoryblokComponent(
      parseOxcModule("forge-tabbed.tsx", TABBED),
      tabbedNames,
    ).component.schema;
    const withoutRoot = analyzeStoryblokComponent(
      parseOxcModule("forge-tabbed.tsx", withoutRootField),
      tabbedNames,
    ).component.schema;

    expect(withRoot.tab_content_2).toMatchObject({
      type: "tab",
      display_name: "Content",
    });
    expect(withoutRoot.tab_content_2).toMatchObject({
      type: "tab",
      display_name: "Content",
    });
    expect(withRoot.tab_content_3).toMatchObject({
      type: "tab",
      display_name: "Content!",
    });
    expect(withoutRoot.tab_content_3).toMatchObject({
      type: "tab",
      display_name: "Content!",
    });
  });
});

describe("the Storyblok CMS target", () => {
  const target = forgeStoryblokCms({
    packageName: "@mission-platform/components",
    plugin: stubFramework("react"),
    storyblokRuntime: "@storyblok/react",
  });
  const context = {
    rootDir: "/tmp/pkg",
    outDir: "/tmp/pkg/out",
    componentsImport: "@mission-platform/components",
    framework: target.framework,
    diagnostics: [],
  };
  const badge = analyzeStoryblokComponent(
    parseOxcModule("forge-badge.tsx", BADGE),
    badgeNames,
  );

  it("rejects a framework plugin outside the supported wrapper set", () => {
    expect(() =>
      forgeStoryblokCms({
        packageName: "@mission-platform/components",
        plugin: stubFramework("astro"),
        storyblokRuntime: "@storyblok/js",
      }),
    ).toThrow(/does not support the "astro" framework plugin/);
  });

  it("rejects an empty Storyblok plugin field identifier at target construction", () => {
    expect(() =>
      forgeStoryblokCms({
        packageName: "@mission-platform/components",
        plugin: stubFramework("react"),
        pluginField: { fieldType: "   " },
      }),
    ).toThrow(/pluginField\.fieldType.*non-empty string/);
  });

  it("rejects invalid required plugin fields at target construction", () => {
    expect(() =>
      forgeStoryblokCms({
        packageName: "@mission-platform/components",
        plugin: stubFramework("react"),
        pluginField: {
          fieldType: "my-plugin",
          requiredFields: ["title", ""],
        },
      }),
    ).toThrow(/pluginField\.requiredFields.*non-empty strings/);
  });

  it("maps @cmsSetting fields to the configured plugin contract", () => {
    const configuredTarget = forgeStoryblokCms({
      packageName: "@mission-platform/components",
      plugin: stubFramework("react"),
      pluginField: {
        fieldType: "storyblok-button",
        requiredFields: ["label", "variant"],
      },
      metadata: { icon: "target-icon", color: "#abcdef" },
    });
    const analyzed = contentOf(ANNOTATED_SETTING, annotatedSettingNames);
    const schema = configuredTarget.emitSchema?.(
      analyzed,
      undefined as never,
      context,
    );
    const component = JSON.parse(schema?.contents ?? "{}").component;

    expect(component.icon).toBe("editorial-star");
    expect(component.color).toBe("#123abc");
    expect(component.schema.label).toEqual({
      type: "plugin",
      pos: 0,
      description: "Editor label.",
      translatable: true,
      field_type: "storyblok-button",
      required_fields: "label,variant",
      default_value: "Default label",
    });
    expect(component.schema.enabled).toEqual({
      type: "boolean",
      pos: 1,
      description: "Whether the component is enabled.",
    });
  });

  it("keeps per-component and aggregate component objects byte-equivalent", () => {
    const configuredTarget = forgeStoryblokCms({
      packageName: "@mission-platform/components",
      plugin: stubFramework("react"),
      pluginField: { fieldType: "storyblok-button", requiredFields: ["label"] },
    });
    const analyzed = contentOf(ANNOTATED_SETTING, annotatedSettingNames);
    const schema = configuredTarget.emitSchema?.(
      analyzed,
      undefined as never,
      context,
    );
    const [manifest] = configuredTarget.emitManifest?.([analyzed]) ?? [];
    const perComponent = JSON.parse(schema?.contents ?? "{}").component;
    const aggregateComponent = JSON.parse(manifest?.contents ?? "{}")
      .components[0];

    expect(JSON.stringify(perComponent)).toBe(
      JSON.stringify(aggregateComponent),
    );
  });

  it("keeps tabbed component JSON identical in the root manifest", () => {
    const analyzed = contentOf(TABBED, tabbedNames);
    const schema = target.emitSchema?.(analyzed, undefined as never, context);
    const [manifest] = target.emitManifest?.([analyzed], context) ?? [];
    const component = JSON.parse(schema?.contents ?? "{}").component;
    const aggregateComponent = JSON.parse(manifest?.contents ?? "{}")
      .components[0];

    expect(component.schema.tab_content_2.type).toBe("tab");
    expect(JSON.stringify(component)).toBe(JSON.stringify(aggregateComponent));
    expect(manifest?.fileName).toBe("components.json");
  });

  it("externalises the caller-supplied Storyblok runtime", () => {
    expect(target.runtimeExternals).toEqual(["@storyblok/react"]);
  });

  it("emits the component object as `<folder>.json`, copied alongside the bundle", () => {
    const schema = target.emitSchema?.(
      contentOf(BADGE, badgeNames),
      undefined as never,
      context,
    );
    expect(schema?.fileName).toBe("forge-badge.json");
    expect(schema?.asset).toBe(true);
    expect(JSON.parse(schema?.contents ?? "{}")).toEqual({
      component: badge.component,
    });
  });

  it("emits the framework wrapper with the framework's own extension", () => {
    const template = target.emitTemplate(
      contentOf(BADGE, badgeNames),
      undefined as never,
      context,
    );
    expect(template.fileName).toBe("forge-badge.tsx");
    expect(template.contents).toContain("export function BadgeBlok");
  });

  it("emits `components.json` as an aggregate asset manifest", () => {
    const [manifest] =
      target.emitManifest?.([contentOf(BADGE, badgeNames)], context) ?? [];
    expect(manifest.fileName).toBe("components.json");
    expect(manifest.asset).toBe(true);
    expect(JSON.parse(manifest.contents)).toEqual({
      components: [badge.component],
    });
  });

  it("emits a React entry barrel plus its typed declarations", () => {
    const artifacts =
      target.emitEntry?.([contentOf(BADGE, badgeNames)], context) ?? [];
    expect(artifacts.map((artifact) => artifact.fileName)).toEqual([
      "index.tsx",
      "index.d.ts",
    ]);
    expect(artifacts[0].contents).toBe(
      "export { BadgeBlok } from './forge-badge';\n",
    );
    expect(artifacts[1].contents).toContain(
      "import type { FunctionComponent } from 'react';",
    );
    expect(artifacts[1].contents).toContain(
      "export declare const BadgeBlok: FunctionComponent<{ blok: SbBlokData & { variant?: 'default' | 'primary' | 'secondary'; size?: 'sm' | 'md' | 'lg'; pill?: boolean; content?: SbBlokData[] } }>;",
    );
  });

  it("mirrors nested atomic source paths for schema, wrappers, and entry imports", () => {
    const nestedNames = { ...badgeNames, sourceDir: "atoms/forge-badge" };
    const nested = contentOf(BADGE, nestedNames);
    const schema = target.emitSchema?.(nested, undefined as never, context);
    const template = target.emitTemplate(nested, undefined as never, context);
    const artifacts = target.emitEntry?.([nested], context) ?? [];

    expect(schema?.fileName).toBe("atoms/forge-badge/forge-badge.json");
    expect(template.fileName).toBe("atoms/forge-badge/forge-badge.tsx");
    expect(artifacts[0]?.contents).toBe(
      "export { BadgeBlok } from './atoms/forge-badge/forge-badge';\n",
    );
    expect(artifacts.map((artifact) => artifact.fileName)).toEqual([
      "index.tsx",
      "index.d.ts",
    ]);
    const [manifest] = target.emitManifest?.([nested], context) ?? [];
    expect(manifest?.fileName).toBe("components.json");
  });

  it("emits a Vue entry barrel with default re-exports", () => {
    const vueTarget = forgeStoryblokCms({
      packageName: "@mission-platform/components",
      plugin: stubFramework("vue"),
      storyblokRuntime: "@storyblok/vue",
    });
    const artifacts =
      vueTarget.emitEntry?.([contentOf(BADGE, badgeNames)], {
        ...context,
        framework: vueTarget.framework,
      }) ?? [];
    expect(artifacts[0].fileName).toBe("index.ts");
    expect(artifacts[0].contents).toBe(
      "export { default as BadgeBlok } from './forge-badge.vue';\n",
    );
  });
});
