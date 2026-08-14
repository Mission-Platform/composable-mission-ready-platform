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

export function readStorybookIndex(filePath: string): StorybookIndex {
  const value = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Partial<StorybookIndex>;
  if (!value.entries || typeof value.entries !== 'object') throw new Error(`Invalid Storybook index: ${filePath}`);
  return { ...value, entries: value.entries } as StorybookIndex;
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
