/**
 * The generic CMS projection driver.
 *
 * One loop serves every target: discover the components exported by the neutral
 * barrel, obtain each component's neutral IR (shared through the compiler's own
 * semantic cache, so two CMS targets in one build infer it once), project it
 * onto the neutral content model, then hand both to the target's emitters and
 * write whatever they return.
 *
 * The driver never knows what a Storyblok schema or a Handlebars partial looks
 * like — it only knows how to place a {@link CmsArtifact}. Adding a platform
 * therefore requires no change here.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  analyzeForgeModule,
  discoverComponents,
  parseTsx,
} from "@mission-platform/vite-plugin-forge";

import { analyzeContentComponent } from "./analyze.js";
import { generateIsland } from "./island.js";

import type { CmsArtifact, CmsOutputPlugin, CmsTargetContext } from "./cms.js";
import type { ContentComponent } from "./content-model.js";
import type { CompilerDiagnostic } from "@mission-platform/forge-plugin-api";

const RM_RETRY_OPTIONS = { maxRetries: 5, retryDelay: 100 } as const;

/** The entry written when a target declares no `emitEntry` (Handlebars, Liquid). */
const PLACEHOLDER_ENTRY: CmsArtifact = {
  fileName: "index.ts",
  contents: "export {};\n",
  artifactKind: "entry",
};

/** Options for {@link generateCmsArtifacts}. */
export interface GenerateCmsArtifactsOptions {
  readonly plugin: CmsOutputPlugin;
  /** Absolute path of the neutral components barrel. */
  readonly componentsModule: string;
  /** Absolute path of the directory generated files are written to. */
  readonly outDir: string;
  /** Import specifier the generated templates use for the built components. */
  readonly componentsImport: string;
  /** Prefix stripped from neutral export names; defaults to `Forge`. */
  readonly stripPrefix?: string;
  /** Root of the consuming package; defaults to the parent of `outDir`. */
  readonly rootDir?: string;
}

/** Everything one target run produced. */
export interface GeneratedCmsTree {
  /** Absolute path of the entry module the bundler should build. */
  readonly entry: string;
  /** Every artifact written, in emission order. */
  readonly artifacts: readonly CmsArtifact[];
  /** The components projected onto the neutral content model. */
  readonly components: readonly ContentComponent[];
  readonly diagnostics: readonly CompilerDiagnostic[];
}

/** Format a diagnostic for a build log line. */
function formatDiagnostic(diagnostic: CompilerDiagnostic): string {
  const location =
    diagnostic.span?.line === undefined
      ? diagnostic.fileName
      : `${diagnostic.fileName}:${diagnostic.span.line}`;
  return `[${diagnostic.code}] ${location}: ${diagnostic.message}`;
}

/**
 * Report the diagnostics collected during a run: warnings and information are
 * logged, errors abort the build so a target never silently ships a partial
 * projection.
 */
function reportDiagnostics(
  targetId: string,
  diagnostics: readonly CompilerDiagnostic[],
): void {
  const errors = diagnostics.filter(
    (diagnostic) => diagnostic.severity === "error",
  );
  for (const diagnostic of diagnostics) {
    if (diagnostic.severity !== "error") {
      console.warn(`forge-cms:${targetId} ${formatDiagnostic(diagnostic)}`);
    }
  }
  if (errors.length > 0) {
    throw new Error(
      `The "${targetId}" CMS target reported ${errors.length} error(s):\n` +
        errors.map((error) => `  ${formatDiagnostic(error)}`).join("\n"),
    );
  }
}

/** Write one artifact beneath the target output directory. */
function writeArtifact(outputDirectory: string, artifact: CmsArtifact): void {
  const destination = path.join(outputDirectory, artifact.fileName);
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, artifact.contents, "utf8");
}

/**
 * Run the full discover → IR → content model → emit → write loop for one CMS
 * target, returning the entry module path and everything that was written.
 */
export function generateCmsArtifacts(
  options: GenerateCmsArtifactsOptions,
): GeneratedCmsTree {
  const { plugin, outDir } = options;
  const stripPrefix = options.stripPrefix ?? "Forge";
  const discovered = discoverComponents(
    readFileSync(options.componentsModule, "utf8"),
    stripPrefix,
  );
  const componentsDirectory = path.dirname(options.componentsModule);

  rmSync(outDir, { recursive: true, force: true, ...RM_RETRY_OPTIONS });
  mkdirSync(outDir, { recursive: true });

  const island = generateIsland({
    plugin,
    componentsModule: options.componentsModule,
    outDir,
    stripPrefix,
  });

  const diagnostics: CompilerDiagnostic[] = [];
  const context: CmsTargetContext = {
    rootDir: options.rootDir ?? path.dirname(outDir),
    outDir,
    componentsImport: options.componentsImport,
    framework: plugin.framework,
    islandEntry: island?.specifier,
    diagnostics,
  };

  const artifacts: CmsArtifact[] = [];
  const components: ContentComponent[] = [];

  for (const discoveredComponent of discovered) {
    const sourcePath = path.join(
      componentsDirectory,
      discoveredComponent.sourceDir,
      `${discoveredComponent.folder}.tsx`,
    );
    const source = readFileSync(sourcePath, "utf8");
    const semantic = analyzeForgeModule({
      source,
      fileName: sourcePath,
      moduleKind: "component",
      componentName: discoveredComponent.neutralName,
      sourceRoot: componentsDirectory,
    });
    diagnostics.push(...(semantic.diagnostics ?? []));

    const component = analyzeContentComponent(
      parseTsx(sourcePath, source),
      {
        neutralName: discoveredComponent.neutralName,
        publicName: discoveredComponent.publicName,
        folder: discoveredComponent.folder,
        propertiesType: discoveredComponent.propertiesType,
      },
      semantic,
    );
    components.push(component);

    const schema = plugin.emitSchema?.(component, semantic, context);
    if (schema !== undefined) {
      artifacts.push(schema);
    }
    artifacts.push(plugin.emitTemplate(component, semantic, context));
  }

  artifacts.push(...(plugin.emitManifest?.(components, context) ?? []));

  const entries = plugin.emitEntry?.(components, context) ?? [];
  artifacts.push(...(entries.length > 0 ? entries : [PLACEHOLDER_ENTRY]));

  for (const artifact of artifacts) {
    writeArtifact(outDir, artifact);
  }

  reportDiagnostics(plugin.id, diagnostics);

  const entryArtifact =
    artifacts.find((artifact) => artifact.artifactKind === "entry") ??
    PLACEHOLDER_ENTRY;

  return {
    entry: path.join(outDir, entryArtifact.fileName),
    artifacts,
    components,
    diagnostics,
  };
}
