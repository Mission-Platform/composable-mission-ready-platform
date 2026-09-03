/**
 * The Webflow CMS target.
 *
 * Webflow is the only target in the family that consumes a *running framework
 * component* rather than a template language, which decides almost everything
 * about this plugin:
 *
 * - `island: 'framework'` — each emitted declaration wraps the component the
 *   bound plugin co-generated into the sibling `island/` tree, so the Designer
 *   hydrates a real runtime instead of a re-implementation.
 * - `supportedFrameworks: ['react']` — `@webflow/react` is the only renderer
 *   Webflow ships, so binding anything else is a configuration mistake rather
 *   than a degraded build; `defineForgeCmsPlugin` throws a `TypeError` for it.
 * - `runtimeExternals` — `@webflow/react` and `@webflow/data-types` are
 *   provided by the consuming site's Webflow toolchain and must never be
 *   bundled into the library, which is also why this package does not depend on
 *   them.
 * - `build: {}` — the shared build helpers already apply the bound React
 *   plugin's own stage plugins, and nothing else about a `.webflow.tsx` file
 *   needs special handling.
 *
 * There is no `emitSchema`: for Code Components the declaration *is* the
 * schema, and emitting a second description of the same props could only ever
 * drift from it.
 */
import { defineForgeCmsPlugin } from "@mission-platform/forge-cms-plugin-api";

import {
  DEFAULT_WEBFLOW_GROUP,
  declarationFileName,
  emitWebflowDeclaration,
  webflowDeclarationDiagnostics,
} from "./declaration.js";
import { emitWebflowEntry } from "./entry.js";
import {
  DEFAULT_WEBFLOW_LIBRARY_NAME,
  WEBFLOW_LIBRARY_MANIFEST,
  emitWebflowManifest,
} from "./manifest.js";

import type {
  CmsArtifact,
  CmsOutputPlugin,
  CmsTargetContext,
  ContentComponent,
} from "@mission-platform/forge-cms-plugin-api";
import type {
  FrameworkOutputPlugin,
  SemanticModule,
} from "@mission-platform/forge-plugin-api";

/** Modules the emitted declarations import that the Webflow toolchain provides. */
export const WEBFLOW_RUNTIME_EXTERNALS: readonly string[] = [
  "@webflow/react",
  "@webflow/data-types",
];

/** Options for {@link forgeWebflowCms}. */
export interface ForgeWebflowCmsOptions {
  /** The package the emitted declarations are generated for. */
  packageName: string;
  /** The framework plugin that compiles the components Webflow renders. */
  plugin: FrameworkOutputPlugin;
  /** The library name shown in the Designer; defaults to `Forge`. */
  libraryName?: string;
  /** The Designer group the components are filed under; defaults to `Mission Platform`. */
  group?: string;
}

/** Bind Webflow Code Component projection to a caller-owned React output plugin. */
export function forgeWebflowCms(
  options: ForgeWebflowCmsOptions,
): CmsOutputPlugin {
  const {
    packageName,
    plugin,
    libraryName = DEFAULT_WEBFLOW_LIBRARY_NAME,
    group = DEFAULT_WEBFLOW_GROUP,
  } = options;

  return defineForgeCmsPlugin({
    id: "webflow",
    framework: plugin,
    packageName,
    island: "framework",
    supportedFrameworks: ["react"],
    runtimeExternals: WEBFLOW_RUNTIME_EXTERNALS,

    emitTemplate(
      component: ContentComponent,
      ir: SemanticModule,
      context: CmsTargetContext,
    ): CmsArtifact {
      context.diagnostics.push(
        ...webflowDeclarationDiagnostics(component, ir.fileName),
      );
      return {
        fileName: declarationFileName(component),
        contents: emitWebflowDeclaration(component, {
          islandEntry: context.islandEntry,
          group,
        }),
        artifactKind: "declaration",
      };
    },

    emitManifest(
      _components: readonly ContentComponent[],
      context: CmsTargetContext,
    ): readonly CmsArtifact[] {
      return [
        {
          fileName: WEBFLOW_LIBRARY_MANIFEST,
          contents: emitWebflowManifest(libraryName, context.framework.id),
          artifactKind: "manifest",
          asset: true,
        },
      ];
    },

    emitEntry(components: readonly ContentComponent[]): readonly CmsArtifact[] {
      return [
        {
          fileName: "index.ts",
          contents: emitWebflowEntry(components),
          artifactKind: "entry",
        },
      ];
    },

    build: {},
  });
}
