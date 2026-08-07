/**
 * Read-only inspection of the Mission Platform workspace: enumerating members
 * of each workspace group and reading their `package.json` manifests, docs and
 * `llms.txt` files.
 */
import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';

import {docsDir, groupDir, WORKSPACE_GROUPS, type WorkspaceGroup} from './paths.ts';

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
  const manifestPath = join(dir, 'package.json');
  if (!existsSync(manifestPath)) {
    return undefined;
  }
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
  const base = groupDir(group);
  if (!existsSync(base)) {
    return [];
  }
  const members: WorkspaceMember[] = [];
  for (const entry of readdirSync(base)) {
    const dir = join(base, entry);
    if (!statSync(dir).isDirectory()) {
      continue;
    }
    const manifest = safeReadManifest(dir);
    if (manifest) {
      members.push(toMember(group, dir, manifest));
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
  const llmsPath = join(member.dir, 'llms.txt');
  const readmePath = join(member.dir, 'README.md');
  return {
    manifest,
    llms: existsSync(llmsPath) ? readFileSync(llmsPath, 'utf8') : undefined,
    readme: existsSync(readmePath) ? readFileSync(readmePath, 'utf8') : undefined,
  };
}

/** List the markdown files available under `docs/`. */
export function listDocs(): { slug: string; path: string }[] {
  const base = docsDir();
  const results: { slug: string; path: string }[] = [];
  const walk = (dir: string, prefix: string): void => {
    if (!existsSync(dir)) {
      return;
    }
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full, `${prefix}${entry}/`);
      } else if (entry.endsWith('.md')) {
        results.push({slug: `${prefix}${entry.replace(/\.md$/, '')}`, path: full});
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
