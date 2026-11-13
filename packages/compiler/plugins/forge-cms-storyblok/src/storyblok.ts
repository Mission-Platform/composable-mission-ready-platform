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
import fs from "node:fs";
import path from "node:path";

import {
  defineForgeCmsPlugin,
  defineTsdownForgeCmsTargetConfigs,
} from "@mission-platform/forge-cms-plugin-api";
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
import { forgeReactFramework } from "@mission-platform/forge-plugin-react";
import { forgeSolidFramework } from "@mission-platform/forge-plugin-solid";
import { forgeSvelteFramework } from "@mission-platform/forge-plugin-svelte";
import { forgeVueFramework } from "@mission-platform/forge-plugin-vue";
import { forgeWebComponentsFramework } from "@mission-platform/forge-plugin-web-components";

import { toStoryblokComponent } from "./fields.js";
import { emitBlokDataType, emitStoryblokBlokWrapper } from "./wrappers.js";

import type {
  AnalyzedStoryblokComponent,
  StoryblokComponent,
  StoryblokMetadataOptions,
  StoryblokPluginFieldOptions,
  StoryblokProjectionOptions,
} from "./types.js";
import type { UserConfig } from "tsdown";

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
    { componentType: string; frameworkImport?: string; storyblokImport: string }
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
    componentType: "Component",
    frameworkImport: "svelte",
    storyblokImport: "@storyblok/svelte",
  },
  solid: {
    componentType: "Component",
    frameworkImport: "solid-js",
    storyblokImport: "@storyblok/js",
  },
  "web-components": {
    componentType: "StoryblokWebComponent",
    storyblokImport: "@storyblok/js",
  },
};

const DEFAULT_STORYBLOK_RUNTIMES: Readonly<Record<JsxFramework, string>> = {
  react: "@storyblok/react",
  vue: "@storyblok/vue",
  svelte: "@storyblok/svelte",
  solid: "@storyblok/js",
  "web-components": "@storyblok/js",
};

/** The framework id, narrowed to the set the Storyblok wrappers cover. */
function wrapperFramework(framework: FrameworkOutputPlugin): JsxFramework {
  return framework.id as JsxFramework;
}

/** Return the generated artifact stem, mirroring nested source components. */
function artifactStem(component: ContentComponent): string {
  const folder = component.names.folder;
  const sourceDirectory = component.names.sourceDir
    ?.replaceAll("\\", "/")
    .replaceAll(/^\.\//g, "")
    .replaceAll(/\/+$/g, "");
  if (
    sourceDirectory === undefined ||
    sourceDirectory.length === 0 ||
    sourceDirectory === folder
  ) {
    return folder;
  }
  return `${sourceDirectory}/${folder}`;
}

/** The `export …` line one component contributes to the entry barrel. */
function blokEntryLine(
  framework: JsxFramework,
  component: ContentComponent,
): string {
  const stem = artifactStem(component);
  const name = `${component.names.publicName}Blok`;
  switch (framework) {
    case "vue": {
      return `export { default as ${name} } from './${stem}.vue';`;
    }
    case "svelte": {
      return `export { default as ${name} } from './${stem}.svelte';`;
    }
    default: {
      return `export { ${name} } from './${stem}';`;
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
    ...(frameworkImport === undefined
      ? [
          "type StoryblokWebComponent<T> = {",
          "  new (): HTMLElement & { blok: T };",
          "};",
        ]
      : [`import type { ${componentType} } from '${frameworkImport}';`]),
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
  storyblokRuntime?: string;
  external?: readonly string[];
  /** The plugin field contract used for props tagged `@cmsSetting`. */
  pluginField?: StoryblokPluginFieldOptions;
  /** Optional Storyblok editor metadata defaults. */
  metadata?: StoryblokMetadataOptions;
}

export interface ForgeStoryblokCmsTargetsOptions {
  packageName: string;
  frameworks: readonly FrameworkOutputPlugin[];
  storyblokRuntimes?: Partial<Record<JsxFramework, string>>;
  external?: readonly string[];
  pluginField?: StoryblokPluginFieldOptions;
  metadata?: StoryblokMetadataOptions;
}

/** Validate and normalize the optional plugin field contract at target creation. */
function validatePluginFieldOptions(
  options: StoryblokPluginFieldOptions,
): StoryblokPluginFieldOptions {
  if (
    options === null ||
    typeof options !== "object" ||
    typeof options.fieldType !== "string" ||
    options.fieldType.trim().length === 0
  ) {
    throw new Error(
      "Storyblok `pluginField.fieldType` must be a non-empty string.",
    );
  }
  if (
    options.requiredFields !== undefined &&
    (!Array.isArray(options.requiredFields) ||
      options.requiredFields.some(
        (field) => typeof field !== "string" || field.trim().length === 0,
      ))
  ) {
    throw new Error(
      "Storyblok `pluginField.requiredFields` must contain only non-empty strings.",
    );
  }
  return {
    fieldType: options.fieldType.trim(),
    ...(options.requiredFields === undefined
      ? {}
      : {
          requiredFields: options.requiredFields.map((field) => field.trim()),
        }),
  };
}

function storyblokRuntimeFor(
  plugin: FrameworkOutputPlugin,
  override?: string,
): string {
  return override ?? DEFAULT_STORYBLOK_RUNTIMES[plugin.id as JsxFramework];
}

/** Bind Storyblok projection to a caller-owned framework output plugin. */
export function forgeStoryblokCms(
  options: ForgeStoryblokCmsOptions,
): CmsOutputPlugin {
  const { packageName, plugin } = options;
  const storyblokRuntime = storyblokRuntimeFor(
    plugin,
    options.storyblokRuntime,
  );
  const projection: StoryblokProjectionOptions = {
    pluginField:
      options.pluginField === undefined
        ? undefined
        : validatePluginFieldOptions(options.pluginField),
    metadata: options.metadata,
  };

  return defineForgeCmsPlugin({
    id: "storyblok",
    framework: plugin,
    packageName,
    runtimeExternals: [storyblokRuntime, ...(options.external ?? [])].filter(
      (runtime, index, runtimes) => runtimes.indexOf(runtime) === index,
    ),
    island: "none",
    supportedFrameworks: ["react", "vue", "solid", "svelte", "web-components"],

    emitSchema(component: ContentComponent): CmsArtifact {
      const { component: componentObject } = toStoryblokComponent(
        component,
        projection,
      );
      return {
        fileName: `${artifactStem(component)}.json`,
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
      const analyzed = toStoryblokComponent(component, projection);
      return {
        fileName: `${artifactStem(component)}.${BLOK_WRAPPER_LANG[framework]}`,
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
        (component) => toStoryblokComponent(component, projection).component,
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
        analyzed: toStoryblokComponent(component, projection),
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

export function forgeStoryblokCmsTargets(
  options: ForgeStoryblokCmsTargetsOptions,
): CmsOutputPlugin[] {
  const requestedFramework = process.env.FORGE_CMS_STORYBLOK_TARGET;
  if (
    requestedFramework === undefined &&
    process.env.FORGE_FRAMEWORK_TARGET !== undefined &&
    process.env.FORGE_CMS_ARTIFACT_MODE === undefined
  ) {
    return [];
  }
  const frameworks =
    requestedFramework === undefined
      ? options.frameworks
      : options.frameworks.filter((plugin) => plugin.id === requestedFramework);
  return frameworks.map((plugin) =>
    forgeStoryblokCms({
      packageName: options.packageName,
      plugin,
      storyblokRuntime: options.storyblokRuntimes?.[plugin.id as JsxFramework],
      external: options.external,
      pluginField: options.pluginField,
      metadata: options.metadata,
    }),
  );
}

/** Default 5 Forge framework plugins targeting React, Vue, Svelte, Solid, and Web Components. */
export function defaultStoryblokFrameworks(): FrameworkOutputPlugin[] {
  return [
    forgeReactFramework(),
    forgeVueFramework(),
    forgeSvelteFramework(),
    forgeSolidFramework(),
    forgeWebComponentsFramework(),
  ];
}

export interface StoryblokCmsConfigOptions {
  rootDir: string;
  packageName?: string;
  componentsModule?: string;
  frameworks?: FrameworkOutputPlugin[];
  external?: string[];
  outputRoot?: string;
  metadata?: StoryblokMetadataOptions;
  pluginField?: StoryblokPluginFieldOptions;
  storyblokRuntimes?: Partial<Record<JsxFramework, string>>;
}

/**
 * Return native tsdown `UserConfig[]` configurations for Storyblok CMS targets.
 * Automatically resolves `packageName` from package.json if omitted and defaults
 * `componentsModule` and the 5 standard framework output plugins.
 */
export function defineStoryblokCmsConfig(
  options: StoryblokCmsConfigOptions,
): UserConfig[] {
  const rootDir = options.rootDir;
  let packageName = options.packageName;
  if (!packageName) {
    try {
      const manifestPath = path.resolve(rootDir, "package.json");
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
        name?: string;
      };
      packageName = manifest.name;
    } catch {
      // ignore
    }
  }
  if (!packageName) {
    throw new Error(
      `Could not determine packageName for Storyblok CMS config in ${rootDir}. Please provide packageName explicitly.`,
    );
  }

  const componentsModule =
    options.componentsModule ??
    path.resolve(rootDir, "src/components/index.ts");
  const frameworks = options.frameworks ?? defaultStoryblokFrameworks();

  return defineTsdownForgeCmsTargetConfigs({
    rootDir,
    componentsModule,
    targets: forgeStoryblokCmsTargets({
      packageName,
      frameworks,
      external: options.external,
      metadata: options.metadata,
      pluginField: options.pluginField,
      storyblokRuntimes: options.storyblokRuntimes,
    }),
    external: options.external,
    outputRoot: options.outputRoot,
  });
}
