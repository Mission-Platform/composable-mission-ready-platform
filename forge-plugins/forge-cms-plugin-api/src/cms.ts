/**
 * The contract a CMS output target implements.
 *
 * A {@link CmsOutputPlugin} *composes* a {@link FrameworkOutputPlugin} rather
 * than being one: the framework plugin still owns how a neutral component is
 * lowered to React/Vue/Solid/Svelte/Web-Components source, while the CMS plugin
 * owns how that component is projected onto a content platform — its schema,
 * its platform-native template, the aggregate manifest, and the module entry.
 *
 * The generic driver in `driver.ts` calls the emitters below and writes every
 * returned {@link CmsArtifact}; it never maps a string id onto a target, so
 * adding a platform is an additive package with no edits here.
 */
import type { ContentComponent } from "./content-model.js";
import type {
  CompilerDiagnostic,
  FrameworkBuildAdapters,
  FrameworkOutputPlugin,
  SemanticModule,
} from "@mission-platform/forge-plugin-api";

/** The role an emitted artifact plays in the target's output tree. */
export type CmsArtifactKind =
  "schema" | "template" | "manifest" | "entry" | "declaration" | "module";

/** A single file a target asks the driver to write. */
export interface CmsArtifact {
  /** Path relative to the target output directory. */
  readonly fileName: string;
  readonly contents: string;
  readonly artifactKind: CmsArtifactKind;
  /**
   * Copy the file to `dist/cms/<cmsId>/` alongside the bundled modules rather
   * than leaving it in the per-framework directory. Used for manifests and any
   * other non-JavaScript sidecar a platform consumes directly.
   */
  readonly asset?: boolean;
}

/** Everything an emitter may need about the build it runs in. */
export interface CmsTargetContext {
  readonly rootDir: string;
  readonly outDir: string;
  /** Import specifier the generated templates use for the built components. */
  readonly componentsImport: string;
  readonly framework: FrameworkOutputPlugin;
  /** Relative specifier of the co-generated island entry, when islands are enabled. */
  readonly islandEntry?: string;
  /** Diagnostics sink: an emitter reports unsupported mappings here. */
  readonly diagnostics: CompilerDiagnostic[];
}

/** The built-in CMS target ids, open to any additional string id. */
export type CmsTargetId =
  "storyblok" | "astro" | "ghost" | "jekyll" | "webflow" | (string & {});

/** How a target obtains an interactive runtime for a component. */
export type CmsIslandStrategy = "none" | "framework";

/** A composable CMS output plugin. */
export interface CmsOutputPlugin {
  readonly id: CmsTargetId;
  /** The framework plugin this target is bound to for wrappers and islands. */
  readonly framework: FrameworkOutputPlugin;
  /** The consuming package's name, used to derive cache and import paths. */
  readonly packageName: string;
  /** Modules the emitted templates import that must stay external. */
  readonly runtimeExternals?: readonly string[];
  /** `'framework'` co-generates a hydrated island from the bound plugin. */
  readonly island?: CmsIslandStrategy;
  /** Restrict which framework plugin ids this target accepts (Webflow → react). */
  readonly supportedFrameworks?: readonly string[];

  emitSchema?(
    component: ContentComponent,
    ir: SemanticModule,
    context: CmsTargetContext,
  ): CmsArtifact | undefined;
  emitTemplate(
    component: ContentComponent,
    ir: SemanticModule,
    context: CmsTargetContext,
  ): CmsArtifact;
  emitManifest?(
    components: readonly ContentComponent[],
    context: CmsTargetContext,
  ): readonly CmsArtifact[];
  emitEntry?(
    components: readonly ContentComponent[],
    context: CmsTargetContext,
  ): readonly CmsArtifact[];

  readonly build: FrameworkBuildAdapters;
}

/**
 * Validate and return a CMS output plugin.
 *
 * Failures are thrown at configuration time — a mis-declared target must never
 * reach the driver and silently emit a partial tree.
 */
export function defineForgeCmsPlugin<T extends CmsOutputPlugin>(plugin: T): T {
  if (typeof plugin !== "object" || plugin === null) {
    throw new TypeError("A Forge CMS plugin must be an object.");
  }
  if (typeof plugin.id !== "string" || plugin.id.length === 0) {
    throw new TypeError("A Forge CMS plugin requires a non-empty `id`.");
  }
  if (
    typeof plugin.packageName !== "string" ||
    plugin.packageName.length === 0
  ) {
    throw new TypeError(
      `The Forge CMS plugin "${plugin.id}" requires a non-empty \`packageName\`.`,
    );
  }
  if (
    typeof plugin.framework !== "object" ||
    plugin.framework === null ||
    typeof plugin.framework.id !== "string"
  ) {
    throw new TypeError(
      `The Forge CMS plugin "${plugin.id}" requires a bound framework output plugin.`,
    );
  }
  if (typeof plugin.emitTemplate !== "function") {
    throw new TypeError(
      `The Forge CMS plugin "${plugin.id}" must implement \`emitTemplate\`.`,
    );
  }
  if (typeof plugin.build !== "object" || plugin.build === null) {
    throw new TypeError(
      `The Forge CMS plugin "${plugin.id}" must declare \`build\` adapters.`,
    );
  }
  if (
    plugin.supportedFrameworks !== undefined &&
    !plugin.supportedFrameworks.includes(plugin.framework.id)
  ) {
    throw new TypeError(
      `The Forge CMS plugin "${plugin.id}" does not support the "${plugin.framework.id}" framework plugin ` +
        `(supported: ${plugin.supportedFrameworks.join(", ")}).`,
    );
  }
  return plugin;
}

/** The directory segment a target's per-framework output is written under. */
export function cmsTargetDirectory(plugin: CmsOutputPlugin): string {
  return `${plugin.id}/${plugin.framework.id}`;
}
