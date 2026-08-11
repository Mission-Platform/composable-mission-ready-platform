/**
 * Co-generated framework islands.
 *
 * A CMS target that declares `island: 'framework'` (Astro, Webflow) needs a
 * *real* runtime component to hydrate, not a bespoke DOM controller. Rather
 * than importing the host package's already-built `./vue` / `./react` subpath —
 * which would make the CMS output depend on another build having run first —
 * the driver runs the bound framework plugin over the same neutral barrel into
 * a sibling `island/` directory. The emitted template then imports a file it
 * owns, and the tsdown stage plugins of the bound plugin compile it in the very
 * same build.
 */
import path from "node:path";

import { generateFrameworkSources } from "@mission-platform/vite-plugin-forge";

import type { CmsOutputPlugin } from "./cms.js";

/** The directory name, relative to the target output directory, islands are generated into. */
export const ISLAND_DIRECTORY = "island";

/** Options for {@link generateIsland}. */
export interface GenerateIslandOptions {
  readonly plugin: CmsOutputPlugin;
  /** Absolute path of the neutral components barrel. */
  readonly componentsModule: string;
  /** Absolute path of the target output directory (the island is a subdirectory of it). */
  readonly outDir: string;
  /** Prefix stripped from neutral export names. */
  readonly stripPrefix?: string;
}

/** The generated island tree, or `undefined` when the target does not use islands. */
export interface GeneratedIsland {
  /** Absolute path of the generated island entry module. */
  readonly entry: string;
  /** Absolute path of the generated island directory. */
  readonly directory: string;
  /** Relative specifier a template in the target output directory imports the island by. */
  readonly specifier: string;
}

/**
 * Co-generate the framework island tree for a target, returning the specifier
 * an emitted template should import it by.
 */
export function generateIsland(
  options: GenerateIslandOptions,
): GeneratedIsland | undefined {
  if (options.plugin.island !== "framework") {
    return undefined;
  }
  const directory = path.join(options.outDir, ISLAND_DIRECTORY);
  const entry = generateFrameworkSources({
    plugin: options.plugin.framework,
    componentsModule: options.componentsModule,
    outDir: directory,
    stripPrefix: options.stripPrefix,
  });
  return {
    entry,
    directory,
    specifier: `./${ISLAND_DIRECTORY}/${path.basename(entry).replace(/\.tsx?$/, ".js")}`,
  };
}
