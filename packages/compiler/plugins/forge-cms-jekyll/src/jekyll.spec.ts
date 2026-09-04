import {
  analyzeContentComponent,
  type CmsArtifact,
  type CmsOutputPlugin,
  type CmsTargetContext,
  type ContentComponent,
  type ContentComponentNamesInput,
} from "@mission-platform/forge-cms-plugin-api";
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
import { load } from "js-yaml";
import { describe, expect, it } from "vitest";

import { forgeJekyllCms } from "./jekyll.js";

import type {
  CompilerDiagnostic,
  SemanticModule,
} from "@mission-platform/forge-plugin-api";

/** The YAML shape `_data/forge-components.yml` is asserted against. */
interface ManifestField {
  name: string;
  type: string;
  required: boolean;
  default?: string | number | boolean;
  description?: string;
  values?: string[];
}

interface ManifestComponent {
  name: string;
  display_name: string;
  include: string;
  fields: ManifestField[];
}

/** The YAML shape the emitted `_config.yml` fragment is asserted against. */
interface JekyllConfig {
  forge: {
    include_namespace: string;
    defaults: Record<string, Record<string, string | number | boolean>>;
  };
}

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

function target(includeNamespace?: string): CmsOutputPlugin {
  return forgeJekyllCms({
    packageName: "@acme/components",
    plugin: stubFramework("vue"),
    includeNamespace,
  });
}

function include(
  source: string,
  names: ContentComponentNamesInput,
  options: {
    includeNamespace?: string;
    diagnostics?: CompilerDiagnostic[];
  } = {},
): CmsArtifact {
  return target(options.includeNamespace).emitTemplate(
    contentOf(source, names),
    irFor(source, names),
    contextFor(options.diagnostics),
  );
}

const ALL_COMPONENTS: readonly ContentComponent[] = [
  contentOf(BADGE, badgeNames),
  contentOf(BUTTON, buttonNames),
  contentOf(GRID, gridNames),
  contentOf(LAYOUT, layoutNames),
  contentOf(SITE_HEADER, siteHeaderNames),
  contentOf(EMPTY, emptyNames),
];

function manifests(includeNamespace?: string): readonly CmsArtifact[] {
  return (
    target(includeNamespace).emitManifest?.(ALL_COMPONENTS, contextFor()) ?? []
  );
}

function manifestFor(fileName: string, includeNamespace?: string): CmsArtifact {
  const artifact = manifests(includeNamespace).find(
    (entry) => entry.fileName === fileName,
  );
  if (artifact === undefined) {
    throw new Error(`No ${fileName} artifact was emitted.`);
  }
  return artifact;
}

describe("the Jekyll CMS target", () => {
  it("declares itself a runtime-less target bound to the supplied framework plugin", () => {
    const plugin = target();
    expect(plugin.id).toBe("jekyll");
    expect(plugin.island).toBe("none");
    expect(plugin.framework.id).toBe("vue");
  });

  it("accepts any framework plugin, because Liquid is framework-agnostic", () => {
    expect(target().supportedFrameworks).toBeUndefined();
    for (const framework of ["react", "solid", "svelte", "web-components"]) {
      expect(
        forgeJekyllCms({
          packageName: "@acme/components",
          plugin: stubFramework(framework),
        }).framework.id,
      ).toBe(framework);
    }
  });

  it("contributes no build adapters and no module entry", () => {
    const plugin = target();
    expect(plugin.build).toEqual({});
    expect(plugin.emitEntry).toBeUndefined();
    expect(plugin.emitSchema).toBeUndefined();
  });
});

describe("the Liquid include", () => {
  const badge = include(BADGE, badgeNames);

  it("writes one `_includes/<namespace>/<name>.html` partial per component", () => {
    expect(badge.fileName).toBe("_includes/forge/badge.html");
    expect(badge.artifactKind).toBe("template");
    expect(badge.asset).toBe(true);
    expect(
      badge.contents.startsWith(
        "{%- comment -%} _includes/forge/badge.html {%- endcomment -%}\n",
      ),
    ).toBe(true);
  });

  it("binds string defaults through Liquid's `default:` filter", () => {
    expect(badge.contents).toContain(
      "{%- assign variant = include.variant | default: 'default' -%}",
    );
    expect(badge.contents).toContain(
      "{%- assign size = include.size | default: 'md' -%}",
    );
  });

  it("binds a prop with no default straight from `include`", () => {
    expect(badge.contents).toContain("{%- assign pill = include.pill -%}");
    expect(badge.contents).not.toContain("include.pill | default:");
  });

  it("keeps a numeric default bare so Liquid preserves its type", () => {
    const grid = include(GRID, gridNames);
    expect(grid.fileName).toBe("_includes/forge/grid.html");
    expect(grid.contents).toContain(
      "{%- assign rows = include.rows | default: 3 -%}",
    );
  });

  it("renders every non-slot field as a kebab-cased data attribute", () => {
    expect(badge.contents).toContain('<div\n  class="forge-badge"');
    expect(badge.contents).toContain('data-variant="{{ variant }}"');
    expect(badge.contents).toContain('data-pill="{{ pill }}"');

    const siteHeader = include(SITE_HEADER, siteHeaderNames);
    expect(siteHeader.contents).toContain('data-brand-name="{{ brandName }}"');
  });

  it("echoes named and default slots straight from `include`", () => {
    const layout = include(LAYOUT, layoutNames);
    expect(layout.contents).toContain("{{ include.header }}");
    expect(layout.contents).toContain("{{ include.content }}");
    expect(layout.contents).not.toContain("assign header =");
    expect(layout.contents).not.toContain("assign content =");
  });

  it("emits a bare root element for a component with no fields at all", () => {
    const empty = include(EMPTY, emptyNames);
    expect(empty.contents).toBe(
      [
        "{%- comment -%} _includes/forge/empty.html {%- endcomment -%}",
        '<div class="forge-empty">',
        "</div>",
        "",
      ].join("\n"),
    );
  });

  it("is deterministic", () => {
    expect(include(BADGE, badgeNames).contents).toBe(badge.contents);
  });
});

describe("`_data/forge-components.yml`", () => {
  const artifact = manifestFor("_data/forge-components.yml");
  const parsed = load(artifact.contents) as ManifestComponent[];

  function component(name: string): ManifestComponent {
    const found = parsed.find((entry) => entry.name === name);
    if (found === undefined) {
      throw new Error(`No "${name}" entry in the emitted schema.`);
    }
    return found;
  }

  function field(componentName: string, name: string): ManifestField {
    const found = component(componentName).fields.find(
      (entry) => entry.name === name,
    );
    if (found === undefined) {
      throw new Error(`No "${name}" field on "${componentName}".`);
    }
    return found;
  }

  it("is an aggregate manifest copied as a site asset", () => {
    expect(artifact.artifactKind).toBe("manifest");
    expect(artifact.asset).toBe(true);
  });

  it("round-trips through a YAML parser", () => {
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.map((entry) => entry.name)).toEqual([
      "badge",
      "button",
      "grid",
      "layout",
      "site_header",
      "empty",
    ]);
  });

  it("records the display name and the include path of each component", () => {
    expect(component("site_header").display_name).toBe("Site Header");
    expect(component("site_header").include).toBe("forge/site_header.html");
  });

  it("maps every neutral field kind onto the Jekyll vocabulary", () => {
    expect(field("badge", "variant").type).toBe("enum");
    expect(field("badge", "pill").type).toBe("boolean");
    expect(field("grid", "rows").type).toBe("number");
    expect(field("site_header", "brandName").type).toBe("string");
    expect(field("layout", "header").type).toBe("slot");
    expect(field("layout", "content").type).toBe("slot");
  });

  it("lists the options of an `option` field and nothing else's", () => {
    expect(field("badge", "variant").values).toEqual([
      "default",
      "primary",
      "secondary",
    ]);
    expect(field("badge", "pill").values).toBeUndefined();
  });

  it("carries the analysed default and description, omitting both when absent", () => {
    expect(field("badge", "variant").default).toBe("default");
    expect(field("badge", "variant").description).toBe(
      "Visual tone of the badge.",
    );
    expect(field("badge", "pill").default).toBeUndefined();
    expect(field("layout", "content").description).toBeUndefined();
    expect(field("grid", "rows").default).toBe(3);
  });

  it("records whether a field is required", () => {
    expect(field("badge", "variant").required).toBe(false);
  });

  it("drops props that carry no content, such as callbacks", () => {
    expect(component("button").fields.map((entry) => entry.name)).not.toContain(
      "onClick",
    );
    expect(component("button").fields.map((entry) => entry.name)).toEqual([
      "variant",
      "disabled",
      "badge",
      "content",
    ]);
  });

  it("emits an explicit empty sequence for a component with no fields", () => {
    expect(component("empty").fields).toEqual([]);
  });
});

describe("the emitted `_config.yml` fragment", () => {
  const artifact = manifestFor("_config.yml");
  const parsed = load(artifact.contents) as JekyllConfig;

  it("is an aggregate manifest copied as a site asset", () => {
    expect(artifact.fileName).toBe("_config.yml");
    expect(artifact.artifactKind).toBe("manifest");
    expect(artifact.asset).toBe(true);
  });

  it("registers the include namespace", () => {
    expect(parsed.forge.include_namespace).toBe("forge");
  });

  it("mirrors the per-component defaults for data-driven rendering", () => {
    expect(parsed.forge.defaults).toEqual({
      badge: { variant: "default", size: "md" },
      button: { variant: "primary" },
      grid: { rows: 3 },
      site_header: { brandName: "Mission" },
    });
  });
});

describe("a custom include namespace", () => {
  it("is honoured in the include path, the class name, and both manifests", () => {
    const badge = include(BADGE, badgeNames, { includeNamespace: "acme" });
    expect(badge.fileName).toBe("_includes/acme/badge.html");
    expect(badge.contents).toContain(
      "{%- comment -%} _includes/acme/badge.html {%- endcomment -%}",
    );
    expect(badge.contents).toContain('class="acme-badge"');
    expect(badge.contents).not.toContain("forge-badge");

    const schema = load(
      manifestFor("_data/forge-components.yml", "acme").contents,
    ) as ManifestComponent[];
    expect(schema[0].include).toBe("acme/badge.html");

    const config = load(
      manifestFor("_config.yml", "acme").contents,
    ) as JekyllConfig;
    expect(config.forge.include_namespace).toBe("acme");
  });
});

describe("Jekyll diagnostics", () => {
  const COLLIDING = [
    "import { h, Slot, type MpElement } from '@mission-platform/forge-jsx';",
    "",
    "export interface PanelProperties {",
    "  /** Stick the panel to the top. */",
    "  sticky?: boolean;",
    "}",
    "",
    "export function ForgePanel(properties: PanelProperties): MpElement {",
    "  return (",
    '    <div class="panel">',
    '      <Slot name="sticky" />',
    "    </div>",
    "  );",
    "}",
  ].join("\n");

  const panelNames: ContentComponentNamesInput = {
    neutralName: "ForgePanel",
    publicName: "Panel",
    folder: "forge-panel",
    propertiesType: "PanelProperties",
  };

  it("warns when a named slot collides with a non-slot prop", () => {
    const diagnostics: CompilerDiagnostic[] = [];
    include(COLLIDING, panelNames, { diagnostics });
    expect(diagnostics.map((entry) => entry.code)).toEqual([
      "FORGE_JEKYLL_SLOT_UNSUPPORTED",
    ]);
    expect(diagnostics[0].phase).toBe("generation");
    expect(diagnostics[0].fileName).toBe("forge-panel.tsx");
    expect(diagnostics.every((entry) => entry.severity === "warning")).toBe(
      true,
    );
  });

  it("reports nothing for components Liquid can represent in full", () => {
    for (const [source, names] of [
      [BADGE, badgeNames],
      [BUTTON, buttonNames],
      [GRID, gridNames],
      [LAYOUT, layoutNames],
      [SITE_HEADER, siteHeaderNames],
      [EMPTY, emptyNames],
    ] as const) {
      const diagnostics: CompilerDiagnostic[] = [];
      include(source, names, { diagnostics });
      expect(diagnostics).toEqual([]);
    }
  });
});
