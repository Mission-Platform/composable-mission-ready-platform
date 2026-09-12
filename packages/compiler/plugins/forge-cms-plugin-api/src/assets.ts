/**
 * Shared asset management utilities for Forge CMS targets.
 *
 * Synchronizes emitted CMS assets (such as manifests, schemas, and templates)
 * into `dist/cms/<targetId>` and ensures obsolete or deleted assets from prior
 * builds are safely pruned without modifying framework-specific build outputs.
 */
import fs from "node:fs";
import path from "node:path";

import {
  ensureForgeArtifactDirectory,
  resolveForgeArtifactPath,
  validateForgeArtifactName,
} from "@mission-platform/vite-plugin-forge";

import type { CmsArtifact } from "./cms.js";

export const KNOWN_FRAMEWORKS: ReadonlySet<string> = new Set([
  "react",
  "vue",
  "solid",
  "svelte",
  "web-components",
  "html",
  "astro",
  "preact",
]);

/**
 * Prune stale files and empty directories in `destinationRoot` that do not
 * correspond to active assets, preserving framework directories and non-asset trees.
 */
export function pruneStaleAssets(
  destinationRoot: string,
  activeAssetNames: ReadonlySet<string>,
  preservedDirectories: ReadonlySet<string> = new Set(),
): void {
  if (!fs.existsSync(destinationRoot)) {
    return;
  }

  const pruneDirectory = (currentDirectory: string): boolean => {
    let isEmpty = true;
    const entries = fs.readdirSync(currentDirectory, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDirectory, entry.name);
      const relative = path
        .relative(destinationRoot, fullPath)
        .split(path.sep)
        .join("/");

      if (entry.isDirectory()) {
        if (
          currentDirectory === destinationRoot &&
          (preservedDirectories.has(entry.name) ||
            KNOWN_FRAMEWORKS.has(entry.name))
        ) {
          isEmpty = false;
          continue;
        }
        if (entry.isSymbolicLink()) {
          isEmpty = false;
          continue;
        }
        const childEmpty = pruneDirectory(fullPath);
        if (childEmpty) {
          const hasActiveChild = [...activeAssetNames].some((name) =>
            name.startsWith(`${relative}/`),
          );
          if (hasActiveChild) {
            isEmpty = false;
          } else {
            fs.rmdirSync(fullPath);
          }
        } else {
          isEmpty = false;
        }
      } else if (entry.isFile()) {
        if (activeAssetNames.has(relative)) {
          isEmpty = false;
        } else {
          fs.rmSync(fullPath, { force: true });
        }
      } else {
        isEmpty = false;
      }
    }
    return isEmpty;
  };

  pruneDirectory(destinationRoot);
}

/**
 * Synchronize assets from `safeCacheDirectory` into `destinationRoot`,
 * pruning stale or removed assets from previous builds.
 */
export function copyAndPruneAssets(
  safeCacheDirectory: string,
  destinationRoot: string,
  assets: readonly CmsArtifact[],
  preservedDirectories: ReadonlySet<string> = new Set(),
): void {
  const activeAssets = assets.filter((asset) => {
    const source = resolveForgeArtifactPath(
      safeCacheDirectory,
      asset.fileName,
    );
    return fs.existsSync(source);
  });
  const activeAssetNames = new Set(
    activeAssets.map((asset) => validateForgeArtifactName(asset.fileName)),
  );

  pruneStaleAssets(destinationRoot, activeAssetNames, preservedDirectories);

  for (const asset of activeAssets) {
    const source = resolveForgeArtifactPath(
      safeCacheDirectory,
      asset.fileName,
    );
    const destination = resolveForgeArtifactPath(
      destinationRoot,
      asset.fileName,
    );
    ensureForgeArtifactDirectory(
      destinationRoot,
      path.dirname(destination),
    );
    fs.copyFileSync(source, destination);
  }
}
