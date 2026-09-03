import fs from 'node:fs';
import path from 'node:path';

import { relativeRepositoryPath, toPosixPath } from './paths.ts';
import { discoverAppRouteFiles, discoverAppRoutes } from './routes.ts';
import {
  STORYBOOK_FRAMEWORKS,
  type StorybookFramework,
  type RepositoryInventory,
  type StoryFile,
  type WorkspacePackage,
} from './types.ts';

const WORKSPACE_ROOTS: Array<[string, WorkspacePackage['scope']]> = [
  ['apps', 'app'],
  ['packages', 'package'],
  ['examples', 'example'],
  ['mcp', 'mcp'],
  ['scripts', 'script'],
  ['crates', 'crate'],
];

const STORY_FILE_PATTERN = /^(.*)\.(stories|story)\.(js|jsx|mjs|ts|tsx|svelte|vue)$/;
const FRAMEWORK_SUFFIXES: Record<string, StorybookFramework> = {
  vue: 'vue',
  react: 'react',
  solid: 'solid',
  svelte: 'svelte',
  'web-component': 'web-component',
};
const IGNORED_DIRECTORIES = new Set(['.git', 'node_modules', 'dist', 'coverage', '.turbo', '.cache']);

interface PackageJson {
  name?: unknown;
  scripts?: {
    dev?: unknown;
  };
}

function readPackage(directory: string): PackageJson | undefined {
  const manifestPath = path.join(directory, 'package.json');
  if (!fs.existsSync(manifestPath)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as PackageJson;
  } catch {
    return undefined;
  }
}

function collectPackageDirectories(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  const packageJson = readPackage(directory);
  const children = fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !IGNORED_DIRECTORIES.has(entry.name));
  return [
    ...(packageJson?.name ? [directory] : []),
    ...children.flatMap((entry) => collectPackageDirectories(path.join(directory, entry.name))),
  ];
}

function workspacePackage(
  repositoryRoot: string,
  directory: string,
  scope: WorkspacePackage['scope'],
): WorkspacePackage | undefined {
  const manifest = readPackage(directory);
  if (typeof manifest?.name !== 'string') return undefined;
  return {
    name: manifest.name,
    directory,
    relativeDirectory: relativeRepositoryPath(repositoryRoot, directory),
    scope,
  };
}

export function discoverWorkspacePackages(repositoryRoot: string): WorkspacePackage[] {
  const packages = new Map<string, WorkspacePackage>();
  for (const [root, scope] of WORKSPACE_ROOTS) {
    for (const directory of collectPackageDirectories(path.join(repositoryRoot, root))) {
      const workspace = workspacePackage(repositoryRoot, directory, scope);
      if (workspace) packages.set(workspace.relativeDirectory, workspace);
    }
  }
  return [...packages.values()].sort((left, right) => left.relativeDirectory.localeCompare(right.relativeDirectory));
}

function frameworkSuffix(storyBaseName: string): StorybookFramework | undefined {
  const suffix = storyBaseName.split('.').at(-1);
  return suffix ? FRAMEWORK_SUFFIXES[suffix] : undefined;
}

function collectStoryFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && !IGNORED_DIRECTORIES.has(entry.name))
      return collectStoryFiles(path.join(directory, entry.name));
    if (!entry.isFile() || !STORY_FILE_PATTERN.test(entry.name)) return [];
    return [path.join(directory, entry.name)];
  });
}

function storyExports(absolutePath: string): string[] {
  const source = fs.readFileSync(absolutePath, 'utf8');
  const names = new Set<string>();
  for (const match of source.matchAll(/^\s*export\s+(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm))
    names.add(match[1]);
  for (const match of source.matchAll(/^\s*export\s*\{([^}]+)\}/gm)) {
    for (const part of match[1].split(',')) {
      const name = part
        .trim()
        .split(/\s+as\s+/)
        .at(-1);
      if (name && /^[A-Za-z_$][\w$]*$/.test(name) && name !== 'default') names.add(name);
    }
  }
  return [...names].sort();
}

export function discoverStories(repositoryRoot: string, packages: WorkspacePackage[]): StoryFile[] {
  const packageStories = packages
    .filter((workspace) => workspace.scope === 'package')
    .flatMap((workspace) =>
      collectStoryFiles(path.join(workspace.directory, 'src')).map((absolutePath) => {
        const fileName = path.basename(absolutePath);
        const match = STORY_FILE_PATTERN.exec(fileName);
        const excludedFramework = match ? frameworkSuffix(match[1]) : undefined;
        const filePath = relativeRepositoryPath(repositoryRoot, absolutePath);
        return {
          id: `${workspace.name}:${toPosixPath(path.relative(path.join(workspace.directory, 'src'), absolutePath))}`,
          packageName: workspace.name,
          filePath,
          absolutePath,
          exportedStories: storyExports(absolutePath),
          ...(excludedFramework ? { excludedFramework } : {}),
        };
      }),
    );

  const storybookApp = packages.find(
    (workspace) => workspace.scope === 'app' && workspace.name === '@mission-platform/storybook',
  );
  const appStories = storybookApp
    ? collectStoryFiles(path.join(storybookApp.directory, 'src')).map((absolutePath) => {
        const fileName = path.basename(absolutePath);
        const match = STORY_FILE_PATTERN.exec(fileName);
        const excludedFramework = match ? frameworkSuffix(match[1]) : undefined;
        const filePath = relativeRepositoryPath(repositoryRoot, absolutePath);
        return {
          id: `${storybookApp.name}:${toPosixPath(path.relative(path.join(storybookApp.directory, 'src'), absolutePath))}`,
          packageName: storybookApp.name,
          filePath,
          absolutePath,
          exportedStories: storyExports(absolutePath),
          ...(excludedFramework ? { excludedFramework } : {}),
        };
      })
    : [];

  return [...packageStories, ...appStories].sort((left, right) => left.id.localeCompare(right.id));
}

export function discoverStorybookPackages(repositoryRoot: string): string[] {
  const mainPath = path.join(repositoryRoot, 'apps/storybook/.storybook/main.ts');
  if (!fs.existsSync(mainPath)) return [];
  const source = fs.readFileSync(mainPath, 'utf8');
  const packagesBlock = /packages:\s*\[([\s\S]*?)\]/m.exec(source)?.[1] ?? '';
  return [...packagesBlock.matchAll(/['"]([^'"]+)['"]/g)].map((match) => match[1]);
}

export function discoverInventory(repositoryRoot: string): RepositoryInventory {
  const workspacePackages = discoverWorkspacePackages(repositoryRoot);
  const packages = workspacePackages.filter((workspace) => workspace.scope === 'package');
  const apps = workspacePackages
    .filter(
      (workspace) => workspace.scope === 'app' && typeof readPackage(workspace.directory)?.scripts?.dev === 'string',
    )
    .map((workspace) => {
      const appDirectory = workspace.directory;
      const routerFiles = discoverAppRouteFiles(appDirectory);
      return {
        name: workspace.name,
        directory: appDirectory,
        relativeDirectory: workspace.relativeDirectory,
        packageJson: path.join(appDirectory, 'package.json'),
        routerFiles: routerFiles.map((filePath) => relativeRepositoryPath(repositoryRoot, filePath)),
        routes: discoverAppRoutes(repositoryRoot, workspace.name),
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
  return {
    repositoryRoot,
    workspacePackages,
    packages,
    apps,
    stories: discoverStories(repositoryRoot, workspacePackages),
    storybookPackages: discoverStorybookPackages(repositoryRoot),
  };
}

export function storyFrameworks(story: StoryFile): StorybookFramework[] {
  if (!story.excludedFramework) return [...STORYBOOK_FRAMEWORKS];
  if (story.packageName === '@mission-platform/storybook') return [];
  return STORYBOOK_FRAMEWORKS.filter((framework) => framework !== story.excludedFramework);
}
