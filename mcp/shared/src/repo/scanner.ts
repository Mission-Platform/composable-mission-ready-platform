/**
 * Read-only inspection of the Mission Platform workspace: enumerating members
 * of each workspace group and reading their `package.json` manifests, docs and
 * `llms.txt` files.
 */
import {lstatSync, readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

import {docsDir, groupDir, resolveRepoPath, WORKSPACE_GROUPS, type WorkspaceGroup} from './paths.ts';

export interface PackageManifest {
  name?: string;
  version?: string;
  description?: string;
  private?: boolean;
  type?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  exports?: unknown;

  [key: string]: unknown;
}

export interface WorkspaceMember {
  group: WorkspaceGroup;
  dir: string;
  relativeDir: string;
  name: string;
  version: string;
  description: string;
  private: boolean;
  scripts: string[];
  dependencies: string[];
  devDependencies: string[];
  peerDependencies: string[];
}

export function readJson<T = unknown>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function safeReadManifest(dir: string): PackageManifest | undefined {
  let manifestPath: string;
  try {
    manifestPath = resolveRepoPath(join(dir, 'package.json'), 'package manifest');
  } catch {
    return undefined;
  }
  if (!lstatSync(manifestPath).isFile()) return undefined;
  try {
    return readJson<PackageManifest>(manifestPath);
  } catch {
    return undefined;
  }
}

function toMember(group: WorkspaceGroup, dir: string, manifest: PackageManifest): WorkspaceMember {
  const folder = dir.split(/[\\/]/).pop() ?? dir;
  return {
    group,
    dir,
    relativeDir: `${group}/${folder}`,
    name: manifest.name ?? folder,
    version: manifest.version ?? '0.0.0',
    description: manifest.description ?? '',
    private: manifest.private === true,
    scripts: Object.keys(manifest.scripts ?? {}),
    dependencies: Object.keys(manifest.dependencies ?? {}),
    devDependencies: Object.keys(manifest.devDependencies ?? {}),
    peerDependencies: Object.keys(manifest.peerDependencies ?? {}),
  };
}

/** List every member of a single workspace group that has a `package.json`. */
export function listGroup(group: WorkspaceGroup): WorkspaceMember[] {
  let base: string;
  try {
    base = resolveRepoPath(groupDir(group), `${group} workspace group`);
  } catch {
    return [];
  }
  const members: WorkspaceMember[] = [];
  for (const entry of readdirSync(base, {withFileTypes: true})) {
    if (!entry.isDirectory()) {
      continue;
    }
    const dir = join(base, entry.name);
    let safeDir: string;
    try {
      safeDir = resolveRepoPath(dir, `${group} workspace member`);
    } catch {
      continue;
    }
    const manifest = safeReadManifest(safeDir);
    if (manifest) {
      members.push(toMember(group, safeDir, manifest));
    }
  }
  return members.sort((a, b) => a.name.localeCompare(b.name));
}

/** List members across every workspace group. */
export function listAll(): WorkspaceMember[] {
  return WORKSPACE_GROUPS.flatMap((group) => listGroup(group));
}

/** Find a member by folder name or scoped package name within a group. */
export function findMember(group: WorkspaceGroup, nameOrFolder: string): WorkspaceMember | undefined {
  const needle = nameOrFolder.replace('@mission-platform/', '').toLowerCase();
  return listGroup(group).find((member) => {
    const folder = member.relativeDir.split('/')[1] ?? '';
    return folder.toLowerCase() === needle || member.name.toLowerCase() === nameOrFolder.toLowerCase();
  });
}

/** Read a member's full manifest and, when present, its `llms.txt`. */
export function readMemberDetails(member: WorkspaceMember): {
  manifest: PackageManifest;
  llms?: string;
  readme?: string;
} {
  const manifest = safeReadManifest(member.dir) ?? {};
  const readRegularText = (name: string): string | undefined => {
    try {
      const path = resolveRepoPath(join(member.dir, name), `member ${name}`);
      return lstatSync(path).isFile() ? readFileSync(path, 'utf8') : undefined;
    } catch {
      return undefined;
    }
  };
  return {
    manifest,
    llms: readRegularText('llms.txt'),
    readme: readRegularText('README.md'),
  };
}

/** List the markdown files available under `docs/`. */
export function listDocs(): { slug: string; path: string }[] {
  let base: string;
  try {
    base = resolveRepoPath(docsDir(), 'documentation directory');
  } catch {
    return [];
  }
  const results: { slug: string; path: string }[] = [];
  const walk = (dir: string, prefix: string): void => {
    for (const entry of readdirSync(dir, {withFileTypes: true})) {
      if (entry.isSymbolicLink()) {
        continue;
      }
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, `${prefix}${entry.name}/`);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push({slug: `${prefix}${entry.name.replace(/\.md$/, '')}`, path: full});
      }
    }
  };
  walk(base, '');
  return results.sort((a, b) => a.slug.localeCompare(b.slug));
}

export function readDoc(slug: string): string | undefined {
  const document = listDocs().find((candidate) => candidate.slug === slug);
  return document ? readFileSync(document.path, 'utf8') : undefined;
}
