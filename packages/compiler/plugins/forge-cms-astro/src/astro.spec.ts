import {
  analyzeContentComponent,
  type CmsArtifact,
  type CmsTargetContext,
  type ContentComponent,
  type ContentComponentNamesInput,
} from "@mission-platform/forge-cms-plugin-api";
import {
  BADGE,
  COUNTER,
  GRID,
  LAYOUT,
  badgeNames,
  counterNames,
  gridNames,
  layoutNames,
  stubFramework,
} from "@mission-platform/forge-cms-plugin-api/fixtures";
import { analyzeForgeModule } from "@mission-platform/vite-plugin-forge";
import { parseOxcModule } from "@mission-platform/vite-plugin-forge/compiler/oxc.js";
import { describe, expect, it } from "vitest";

import { forgeAstroCms } from "./astro.js";
import { emitContentConfig } from "./collections.js";

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
  ir: SemanticModule,
): ContentComponent {
  return analyzeContentComponent(
    parseOxcModule(`${names.folder}.tsx`, source),
    names,
    ir,
  );
}

function contextFor(
  framework: string,
  islandEntry: string | undefined,
  diagnostics: CompilerDiagnostic[] = [],
): CmsTargetContext {
  return {
    rootDir: "/tmp/pkg",
    outDir: "/tmp/pkg/out",
    componentsImport: "@acme/components",
    framework: stubFramework(framework),
    islandEntry,
    diagnostics,
  };
}

function template(
  source: string,
  names: ContentComponentNamesInput,
  options: {
    framework?: string;
    islandEntry?: string;
    diagnostics?: CompilerDiagnostic[];
  } = {},
): CmsArtifact {
  const framework = options.framework ?? "vue";
  const target = forgeAstroCms({
    packageName: "@acme/components",
    plugin: stubFramework(framework),
  });
  const ir = irFor(source, names);
  return target.emitTemplate(
    contentOf(source, names, ir),
    ir,
    contextFor(framework, options.islandEntry, options.diagnostics),
  );
}

describe("the Astro CMS target", () => {
  it("declares itself an island target bound to the supplied framework plugin", () => {
    const target = forgeAstroCms({
      packageName: "@acme/components",
      plugin: stubFramework("solid"),
    });
    expect(target.id).toBe("astro");
    expect(target.island).toBe("framework");
    expect(target.framework.id).toBe("solid");
  });

  it("rejects a framework plugin that cannot provide an island runtime", () => {
    expect(() =>
      forgeAstroCms({
        packageName: "@acme/components",
        plugin: stubFramework("astro"),
      }),
    ).toThrow(/does not support the "astro" framework plugin/);
  });

  it("keeps `.astro` specifiers external in the tsdown stage", () => {
    const target = forgeAstroCms({
      packageName: "@acme/components",
      plugin: stubFramework("vue"),
    });
    const [plugin] = target.build.tsdown?.({}) ?? [];
    const resolve = plugin as unknown as {
      resolveId: (source: string) => { external: boolean } | null;
    };
    expect(resolve.resolveId("./forge-badge.astro")).toEqual({
      id: "./forge-badge.astro",
      external: true,
    });
    expect(resolve.resolveId("./forge-badge.ts")).toBeNull();
  });
});

describe("the static Astro template", () => {
  const badge = template(BADGE, badgeNames);

  it("writes one `.astro` file per component, mirrored as an asset", () => {
    expect(badge.fileName).toBe("forge-badge.astro");
    expect(badge.artifactKind).toBe("template");
    expect(badge.asset).toBe(true);
  });

  it("emits `---`-delimited frontmatter binding `Astro.props`", () => {
    expect(badge.contents.startsWith("---\n")).toBe(true);
    expect(badge.contents).toContain(
      "const properties = Astro.props as BadgeProperties;",
    );
    expect(badge.contents).toContain("export type BadgeVariant =");
  });

  it("rewrites JSX-only attribute names in the markup", () => {
    const source = [
      "import { h, type MpElement } from '@mission-platform/forge-jsx';",
      "export interface FieldProperties {",
      "  /** Label text. */",
      "  label?: string;",
      "}",
      "export function ForgeField(properties: FieldProperties): MpElement {",
      '  return <label className="field" htmlFor="input">{properties.label}</label>;',
      "}",
    ].join("\n");
    const field = template(source, {
      neutralName: "ForgeField",
      publicName: "Field",
      folder: "forge-field",
      propertiesType: "FieldProperties",
    });
    expect(field.contents).toContain('class="field"');
    expect(field.contents).toContain('for="input"');
    expect(field.contents).not.toContain("className=");
    expect(field.contents).not.toContain("htmlFor=");
  });

  it("does not import an island for a presentational component", () => {
    expect(badge.contents).not.toContain("client:load");
    expect(badge.contents).not.toContain("./island/index.js");
  });

  it("keeps the static path when no island was co-generated", () => {
    const counter = template(COUNTER, counterNames, { islandEntry: undefined });
    expect(counter.contents).not.toContain("client:load");
  });
});

describe("the island-backed Astro template", () => {
  it("imports the co-generated component and hydrates it with client:load", () => {
    const counter = template(COUNTER, counterNames, {
      islandEntry: "./island/index.js",
    });
    expect(counter.contents).toContain(
      "import { Counter } from './island/index.js';",
    );
    expect(counter.contents).toContain("client:load");
    expect(counter.contents).toContain("{...props}");
  });

  it("forwards the default slot when the component renders one", () => {
    const source = COUNTER.replace(
      "{properties.label}",
      "{properties.label}{properties.children}",
    ).replace(
      "export interface CounterProperties {",
      "export interface CounterProperties {\n  children?: unknown;",
    );
    const counter = template(source, counterNames, {
      islandEntry: "./island/index.js",
    });
    expect(counter.contents).toContain("<slot />");
  });

  it("hydrates through whichever framework plugin is bound", () => {
    for (const framework of [
      "vue",
      "react",
      "solid",
      "svelte",
      "web-components",
    ]) {
      const counter = template(COUNTER, counterNames, {
        framework,
        islandEntry: "./island/index.js",
      });
      expect(counter.contents).toContain(
        "import { Counter } from './island/index.js';",
      );
    }
  });
});

describe("Astro diagnostics", () => {
  it("warns when a component's prop default cannot cross the island boundary", () => {
    const source = [
      "import { h, useState, type MpElement } from '@mission-platform/forge-jsx';",
      "export interface TickerProperties {",
      "  /** Formatter for the value. */",
      "  format?: (value: number) => string;",
      "  /** Starting value. */",
      "  start?: number;",
      "}",
      "export function ForgeTicker({ format = (value: number) => String(value), start = 0 }: TickerProperties): MpElement {",
      "  const [count, setCount] = useState(start);",
      "  return <button onClick={() => setCount(count + 1)}>{format(count)}</button>;",
      "}",
    ].join("\n");
    const diagnostics: CompilerDiagnostic[] = [];
    template(
      source,
      {
        neutralName: "ForgeTicker",
        publicName: "Ticker",
        folder: "forge-ticker",
        propertiesType: "TickerProperties",
      },
      { islandEntry: "./island/index.js", diagnostics },
    );
    expect(diagnostics.map((entry) => entry.code)).toContain(
      "FORGE_ASTRO_UNSAFE_SERIALIZATION",
    );
    expect(diagnostics.every((entry) => entry.severity !== "error")).toBe(true);
  });

  it("warns when no render roots were inferred", () => {
    const diagnostics: CompilerDiagnostic[] = [];
    const source = [
      "export interface EmptyProperties {",
      "  /** Nothing. */",
      "  value?: string;",
      "}",
      "export function ForgeNothing(properties: EmptyProperties): unknown {",
      "  return properties.value;",
      "}",
    ].join("\n");
    template(
      source,
      {
        neutralName: "ForgeNothing",
        publicName: "Nothing",
        folder: "forge-nothing",
        propertiesType: "EmptyProperties",
      },
      { diagnostics },
    );
    expect(diagnostics.map((entry) => entry.code)).toContain(
      "FORGE_ASTRO_RENDER_TREE_EMPTY",
    );
  });
});

describe("the Astro content collection config", () => {
  const target = forgeAstroCms({
    packageName: "@acme/components",
    plugin: stubFramework("vue"),
  });
  const components = [
    contentOf(BADGE, badgeNames, irFor(BADGE, badgeNames)),
    contentOf(GRID, gridNames, irFor(GRID, gridNames)),
    contentOf(LAYOUT, layoutNames, irFor(LAYOUT, layoutNames)),
  ];

  it("emits one zod collection per component as a copied asset", () => {
    const [manifest] =
      target.emitManifest?.(components, contextFor("vue")) ?? [];
    expect(manifest.fileName).toBe("content.config.ts");
    expect(manifest.asset).toBe(true);
    expect(manifest.contents).toContain(
      "import { defineCollection, z } from 'astro:content';",
    );
    expect(manifest.contents).toContain("badge: defineCollection({");
    expect(manifest.contents).toContain("grid: defineCollection({");
    expect(manifest.contents).toContain("layout: defineCollection({");
  });

  it("maps neutral field kinds onto zod validators", () => {
    const config = emitContentConfig(components);
    expect(config).toContain(
      "variant: z.enum(['default', 'primary', 'secondary']).default('default')",
    );
    expect(config).toContain("pill: z.boolean().optional()");
    expect(config).toContain("rows: z.number().default(3)");
    expect(config).toContain("sticky: z.boolean().optional()");
  });

  it("omits slot fields from the collection schema", () => {
    const config = emitContentConfig(components);
    expect(config).not.toContain("content:");
    expect(config).not.toContain("header:");
  });
});

describe("the Astro entry barrel", () => {
  it("re-exports every emitted `.astro` file under its public name", () => {
    const target = forgeAstroCms({
      packageName: "@acme/components",
      plugin: stubFramework("vue"),
    });
    const components = [
      contentOf(BADGE, badgeNames, irFor(BADGE, badgeNames)),
      contentOf(GRID, gridNames, irFor(GRID, gridNames)),
    ];
    const [entry] = target.emitEntry?.(components, contextFor("vue")) ?? [];
    expect(entry.fileName).toBe("index.ts");
    expect(entry.contents).toBe(
      [
        "export { default as Badge } from './forge-badge.astro';",
        "export { default as Grid } from './forge-grid.astro';",
        "",
      ].join("\n"),
    );
  });
});
