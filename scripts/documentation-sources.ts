import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

/** Workspace roots whose package documentation is published by the docs site. */
export const DOCUMENTATION_WORKSPACE_FAMILIES = ['packages', 'extensions'] as const;

export interface DocumentationSourceRoot {
  readonly kind: 'project' | 'package';
  readonly rootDirectory: string;
  readonly routePrefix: string;
  readonly workspaceDirectory: string;
  readonly packageName?: string;
}

function packageNameFallback(workspaceDirectory: string): string {
  return `@mission-platform/${workspaceDirectory.split('/').pop() ?? workspaceDirectory}`;
}

export function projectDocumentationSourceRoot(rootDirectory: string): DocumentationSourceRoot {
  return { kind: 'project', rootDirectory, routePrefix: '', workspaceDirectory: '' };
}

export function packageDocumentationSourceRoot(
  workspaceDirectory: string,
  rootDirectory: string,
  packageName?: string,
): DocumentationSourceRoot {
  return {
    kind: 'package',
    rootDirectory,
    routePrefix: workspaceDirectory,
    workspaceDirectory,
    packageName: packageName ?? packageNameFallback(workspaceDirectory),
  };
}

function packageRoots(repoRoot: string): DocumentationSourceRoot[] {
  const roots: DocumentationSourceRoot[] = [];
  for (const family of DOCUMENTATION_WORKSPACE_FAMILIES) {
    const familyDirectory = path.join(repoRoot, family);
    if (!existsSync(familyDirectory)) continue;
    const pending = [familyDirectory];
    while (pending.length > 0) {
      const directory = pending.pop()!;
      let entries;
      try {
        entries = readdirSync(directory, { withFileTypes: true });
      } catch {
        continue;
      }
      if (entries.some((entry) => entry.isFile() && entry.name === 'package.json')) {
        const docsDirectory = path.join(directory, 'docs');
        if (existsSync(docsDirectory)) {
          const workspaceDirectory = path.relative(repoRoot, directory).split(path.sep).join('/');
          let packageName: string | undefined;
          try {
            packageName = (JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8')) as { name?: string })
              .name;
          } catch {
            // Malformed package manifests are reported by package validation.
          }
          roots.push(packageDocumentationSourceRoot(workspaceDirectory, docsDirectory, packageName));
        }
      }
      for (const entry of entries) {
        if (
          entry.isDirectory() &&
          !entry.isSymbolicLink() &&
          entry.name !== 'node_modules' &&
          !entry.name.startsWith('.')
        ) {
          pending.push(path.join(directory, entry.name));
        }
      }
    }
  }
  return roots.sort((left, right) => left.routePrefix.localeCompare(right.routePrefix));
}

/** Discover the project docs and every package docs directory owned by the site. */
export function discoverDocumentationRoots(repoRoot: string): readonly DocumentationSourceRoot[] {
  return [projectDocumentationSourceRoot(path.join(repoRoot, 'docs')), ...packageRoots(repoRoot)];
}

export function qualifiedSlug(sourceRoot: DocumentationSourceRoot, localSlug: string): string {
  return sourceRoot.routePrefix ? `${sourceRoot.routePrefix}/${localSlug}` : localSlug;
}

/** Find the most specific owner of a canonical Markdown path. */
export function rootForPath(
  filePath: string,
  documentationRoots: readonly DocumentationSourceRoot[],
): DocumentationSourceRoot | undefined {
  const normalizedFile = path.resolve(filePath);
  return documentationRoots
    .filter((sourceRoot) => {
      const rootDirectory = path.resolve(sourceRoot.rootDirectory);
      return normalizedFile === rootDirectory || normalizedFile.startsWith(`${rootDirectory}${path.sep}`);
    })
    .toSorted((left, right) => right.rootDirectory.length - left.rootDirectory.length)[0];
}
