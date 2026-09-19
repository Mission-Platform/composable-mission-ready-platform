import fs from 'node:fs';
import path from 'node:path';

import { relativeRepositoryPath } from './paths.ts';

import type {
  RepositoryInventory,
  StoryFile,
  StorybookFramework,
  StorybookIndex,
  StorybookIndexEntry,
} from './types.ts';

export interface StorybookIndexComparison {
  missing: StoryFile[];
  unexpected: StorybookIndexEntry[];
  matched: StoryFile[];
}

export const STORYBOOK_PARITY_FRAMEWORKS = ['web-component', 'react', 'vue', 'solid', 'svelte'] as const;
export type StorybookParityFramework = (typeof STORYBOOK_PARITY_FRAMEWORKS)[number];

export interface StorybookIndexPair {
  storyId: string;
  sourceImport: string;
  entries: Partial<Record<StorybookParityFramework, StorybookIndexEntry>>;
}

export interface StorybookIndexMissingPair {
  storyId: string;
  sourceImport: string;
  missingFrameworks: StorybookParityFramework[];
  entries: Partial<Record<StorybookParityFramework, StorybookIndexEntry>>;
}

export interface StorybookIndexPairing {
  pairs: StorybookIndexPair[];
  missing: StorybookIndexMissingPair[];
  missingStories: StoryFile[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseStorybookIndex(value: unknown, source = 'fetched payload'): StorybookIndex {
  if (!isRecord(value) || !isRecord(value.entries)) throw new Error(`Invalid Storybook index: ${source}`);
  return { ...(value as Partial<StorybookIndex>), entries: value.entries as Record<string, StorybookIndexEntry> };
}

export function readStorybookIndex(filePath: string): StorybookIndex {
  return parseStorybookIndex(JSON.parse(fs.readFileSync(filePath, 'utf8')), filePath);
}

export function normalizeImportPath(repositoryRoot: string, importPath: string): string {
  // Storybook emits import paths relative to the Storybook app directory, not
  // the `.storybook` configuration directory.  Keep this normalization tied
  // to the generated index contract so build and runtime checks use the same
  // source path identity.
  const absolute = path.resolve(path.join(repositoryRoot, 'apps/storybook'), importPath);
  return relativeRepositoryPath(repositoryRoot, absolute).replace(/^\.\//, '');
}

function entryMatchesStory(repositoryRoot: string, entry: StorybookIndexEntry, story: StoryFile): boolean {
  return Boolean(entry.importPath && normalizeImportPath(repositoryRoot, entry.importPath) === story.filePath);
}

function neutralStories(inventory: RepositoryInventory): StoryFile[] {
  return inventory.stories.filter((story) => !story.excludedFramework);
}

function parityEntries(
  repositoryRoot: string,
  inventory: RepositoryInventory,
  index: StorybookIndex,
): Map<string, { entry: StorybookIndexEntry; sourceImport: string }> {
  const neutralFiles = new Set(neutralStories(inventory).map((story) => story.filePath));
  const entries = new Map<string, { entry: StorybookIndexEntry; sourceImport: string }>();
  for (const entry of Object.values(index.entries)) {
    if (entry.type === 'docs' || !entry.importPath) continue;
    const sourceImport = normalizeImportPath(repositoryRoot, entry.importPath);
    if (!neutralFiles.has(sourceImport)) continue;
    entries.set(`${entry.id}\u0000${sourceImport}`, { entry, sourceImport });
  }
  return entries;
}

/**
 * Resolves the active frameworks to evaluate, prioritizing explicit target frameworks.
 *
 * @param indexes - Map of framework to parsed Storybook index.
 * @param targetFrameworks - Optional explicit framework array.
 * @returns Array of active frameworks to pair.
 */
function resolveActiveFrameworks(
  indexes: Partial<Record<StorybookParityFramework, StorybookIndex>> | Record<string, StorybookIndex>,
  targetFrameworks?: readonly StorybookParityFramework[],
): readonly StorybookParityFramework[] {
  if (targetFrameworks && targetFrameworks.length > 0) return targetFrameworks;
  const detected = STORYBOOK_PARITY_FRAMEWORKS.filter((framework) => indexes[framework] !== undefined);
  return detected.length > 0 ? detected : STORYBOOK_PARITY_FRAMEWORKS;
}

/**
 * Builds entry maps for all active frameworks from the discovered stories inventory.
 *
 * @param repositoryRoot - Absolute repository root directory.
 * @param inventory - Discovered stories inventory.
 * @param indexes - Map of framework to parsed Storybook index.
 * @param activeFrameworks - Frameworks to evaluate.
 * @returns Map of framework to story entry records.
 */
function buildFrameworkEntriesMap(
  repositoryRoot: string,
  inventory: RepositoryInventory,
  indexes: Partial<Record<StorybookParityFramework, StorybookIndex>> | Record<string, StorybookIndex>,
  activeFrameworks: readonly StorybookParityFramework[],
) {
  const byFramework: Partial<
    Record<StorybookParityFramework, Map<string, { entry: StorybookIndexEntry; sourceImport: string }>>
  > = {};
  for (const framework of activeFrameworks) {
    const index = indexes[framework];
    byFramework[framework] = index ? parityEntries(repositoryRoot, inventory, index) : new Map();
  }
  return byFramework;
}

/**
 * Collects and sorts all unique story entry keys across active framework maps.
 *
 * @param byFramework - Map of framework to story entry records.
 * @param activeFrameworks - Frameworks to evaluate.
 * @returns Sorted array of unique entry keys.
 */
function collectKeys(
  byFramework: Partial<Record<StorybookParityFramework, Map<string, unknown>>>,
  activeFrameworks: readonly StorybookParityFramework[],
): string[] {
  const keys = new Set<string>();
  for (const framework of activeFrameworks) {
    const map = byFramework[framework];
    if (map) {
      for (const key of map.keys()) keys.add(key);
    }
  }
  return [...keys].sort();
}

/**
 * Pairs story entries across framework Storybook indexes to identify complete pairs and missing framework implementations.
 *
 * @param repositoryRoot - Absolute repository root directory.
 * @param inventory - Discovered stories inventory.
 * @param indexes - Map of framework to parsed Storybook index.
 * @param targetFrameworks - Optional subset of frameworks to compare against.
 * @returns Categorized pairs, missing framework pairings, and unindexed stories.
 */
export function pairStorybookIndexes(
  repositoryRoot: string,
  inventory: RepositoryInventory,
  indexes: Partial<Record<StorybookParityFramework, StorybookIndex>> | Record<string, StorybookIndex>,
  targetFrameworks?: readonly StorybookParityFramework[],
): StorybookIndexPairing {
  const activeFrameworks = resolveActiveFrameworks(indexes, targetFrameworks);
  const byFramework = buildFrameworkEntriesMap(repositoryRoot, inventory, indexes, activeFrameworks);
  const keys = collectKeys(byFramework, activeFrameworks);

  const pairs: StorybookIndexPair[] = [];
  const missing: StorybookIndexMissingPair[] = [];
  for (const key of keys) {
    const separator = key.indexOf('\u0000');
    const storyId = key.slice(0, separator);
    const sourceImport = key.slice(separator + 1);
    const entries: Partial<Record<StorybookParityFramework, StorybookIndexEntry>> = {};
    for (const framework of activeFrameworks) {
      const value = byFramework[framework]?.get(key)?.entry;
      if (value) entries[framework] = value;
    }
    const missingFrameworks = activeFrameworks.filter((framework) => !entries[framework]);
    if (missingFrameworks.length > 0) missing.push({ storyId, sourceImport, missingFrameworks, entries });
    else pairs.push({ storyId, sourceImport, entries });
  }

  const missingStories = neutralStories(inventory).filter((story) =>
    activeFrameworks.some(
      (framework) =>
        ![...(byFramework[framework]?.values() ?? [])].some((value) => value.sourceImport === story.filePath),
    ),
  );
  return { pairs, missing, missingStories };
}

export function compareStorybookIndex(
  repositoryRoot: string,
  inventory: RepositoryInventory,
  index: StorybookIndex,
  framework: StorybookFramework,
): StorybookIndexComparison {
  const expected = inventory.stories.filter(
    (story) =>
      !story.excludedFramework ||
      (story.packageName !== '@mission-platform/storybook' && story.excludedFramework !== framework),
  );
  const entries = Object.values(index.entries).filter((entry) => entry.type !== 'docs');
  const matched = expected.filter((story) => entries.some((entry) => entryMatchesStory(repositoryRoot, entry, story)));
  const missing = expected.filter((story) => !matched.includes(story));
  const unexpected = entries.filter(
    (entry) => !expected.some((story) => entryMatchesStory(repositoryRoot, entry, story)),
  );
  return { missing, unexpected, matched };
}
