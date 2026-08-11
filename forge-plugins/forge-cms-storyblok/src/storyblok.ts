/**
 * The Storyblok CMS target.
 *
 * For each neutral component the target emits a Storyblok *component object*
 * (`<folder>.json`), a framework blok wrapper that binds Storyblok's `blok`
 * prop onto the built component, an aggregate `components.json` manifest, and a
 * typed entry barrel. The wrapper framework is whichever `FrameworkOutputPlugin`
 * the caller bound, so `storyblok × vue` and `storyblok × react` are two
 * configurations of one target rather than two code paths.
 */
import { defineForgeCmsPlugin } from "@mission-platform/forge-cms-plugin-api";

import { toStoryblokComponent } from "./fields.js";
import { emitBlokDataType, emitStoryblokBlokWrapper } from "./wrappers.js";

import type {
  AnalyzedStoryblokComponent,
  StoryblokComponent,
} from "./types.js";
import type {
  CmsArtifact,
  CmsOutputPlugin,
  CmsTargetContext,
  ContentComponent,
} from "@mission-platform/forge-cms-plugin-api";
import type {
  FrameworkOutputPlugin,
  JsxFramework,
} from "@mission-platform/forge-plugin-api";

/** The file extension each framework's blok wrapper is written with. */
const BLOK_WRAPPER_LANG: Readonly<Record<JsxFramework, string>> = {
  react: "tsx",
  vue: "vue",
  solid: "tsx",
  svelte: "svelte",
  "web-components": "ts",
};

/** The declaration shape each framework's typed entry barrel uses. */
const BLOK_DECLARATION: Readonly<
  Record<
    JsxFramework,
    { componentType: string; frameworkImport: string; storyblokImport: string }
  >
> = {
  react: {
    componentType: "FunctionComponent",
    frameworkImport: "react",
    storyblokImport: "@storyblok/react",
  },
  vue: {
    componentType: "DefineComponent",
    frameworkImport: "vue",
    storyblokImport: "@storyblok/vue",
  },
  svelte: {
    componentType: "any",
    frameworkImport: "svelte",
    storyblokImport: "@storyblok/svelte",
  },
  solid: {
    componentType: "Component",
    frameworkImport: "solid-js",
    storyblokImport: "@storyblok/solid",
  },
  "web-components": {
    componentType: "any",
    frameworkImport: "ts",
    storyblokImport: "@storyblok/js",
  },
};

/** The framework id, narrowed to the set the Storyblok wrappers cover. */
function wrapperFramework(framework: FrameworkOutputPlugin): JsxFramework {
  return framework.id as JsxFramework;
}

/** The `export …` line one component contributes to the entry barrel. */
function blokEntryLine(
  framework: JsxFramework,
  component: ContentComponent,
): string {
  const { folder } = component.names;
  const name = `${component.names.publicName}Blok`;
  switch (framework) {
    case "vue": {
      return `export { default as ${name} } from './${folder}.vue';`;
    }
    case "svelte": {
      return `export { default as ${name} } from './${folder}.svelte';`;
    }
    default: {
      return `export { ${name} } from './${folder}';`;
    }
  }
}

/** The typed `index.d.ts` declaring every emitted blok wrapper. */
function blokEntryDeclarations(
  framework: JsxFramework,
  bloks: readonly {
    publicName: string;
    analyzed: AnalyzedStoryblokComponent;
  }[],
): string {
  const { componentType, frameworkImport, storyblokImport } =
    BLOK_DECLARATION[framework];
  return [
    `import type { ${componentType} } from '${frameworkImport}';`,
    `import type { SbBlokData } from '${storyblokImport}';`,
    "",
    ...bloks.map(
      ({ publicName, analyzed }) =>
        `export declare const ${publicName}Blok: ${componentType}<{ blok: ${emitBlokDataType(analyzed)} }>;`,
    ),
    "",
  ].join("\n");
}

/** Options for {@link forgeStoryblokCms}. */
export interface ForgeStoryblokCmsOptions {
  /** The package the generated wrappers import the built components from. */
  packageName: string;
  /** The framework output plugin the blok wrappers target. */
  plugin: FrameworkOutputPlugin;
  /** The Storyblok runtime the wrappers import (`@storyblok/react`, `@storyblok/vue`, …). */
  storyblokRuntime: string;
}

/** Bind Storyblok projection to a caller-owned framework output plugin. */
export function forgeStoryblokCms(
  options: ForgeStoryblokCmsOptions,
): CmsOutputPlugin {
  const { packageName, plugin, storyblokRuntime } = options;

  return defineForgeCmsPlugin({
    id: "storyblok",
    framework: plugin,
    packageName,
    runtimeExternals: [storyblokRuntime],
    island: "none",
    supportedFrameworks: ["react", "vue", "solid", "svelte", "web-components"],

    emitSchema(component: ContentComponent): CmsArtifact {
      const { component: componentObject } = toStoryblokComponent(component);
      return {
        fileName: `${component.names.folder}.json`,
        contents: `${JSON.stringify({ component: componentObject }, undefined, 2)}\n`,
        artifactKind: "schema",
        asset: true,
      };
    },

    emitTemplate(
      component: ContentComponent,
      _ir,
      context: CmsTargetContext,
    ): CmsArtifact {
      const framework = wrapperFramework(context.framework);
      const analyzed = toStoryblokComponent(component);
      return {
        fileName: `${component.names.folder}.${BLOK_WRAPPER_LANG[framework]}`,
        contents: emitStoryblokBlokWrapper(
          analyzed,
          component.names.publicName,
          {
            framework,
            componentsImport: context.componentsImport,
          },
        ),
        artifactKind: "template",
      };
    },

    emitManifest(
      components: readonly ContentComponent[],
    ): readonly CmsArtifact[] {
      const bloks: StoryblokComponent[] = components.map(
        (component) => toStoryblokComponent(component).component,
      );
      return [
        {
          fileName: "components.json",
          contents: `${JSON.stringify({ components: bloks }, undefined, 2)}\n`,
          artifactKind: "manifest",
          asset: true,
        },
      ];
    },

    emitEntry(
      components: readonly ContentComponent[],
      context: CmsTargetContext,
    ): readonly CmsArtifact[] {
      const framework = wrapperFramework(context.framework);
      const bloks = components.map((component) => ({
        publicName: component.names.publicName,
        analyzed: toStoryblokComponent(component),
      }));
      return [
        {
          fileName: framework === "react" ? "index.tsx" : "index.ts",
          contents: `${components.map((component) => blokEntryLine(framework, component)).join("\n")}\n`,
          artifactKind: "entry",
        },
        {
          fileName: "index.d.ts",
          contents: blokEntryDeclarations(framework, bloks),
          artifactKind: "declaration",
        },
      ];
    },

    // The bound framework plugin's own stage plugins are applied by the shared
    // build helpers; Storyblok needs no target-specific bundler wiring on top.
    build: {},
  });
}
