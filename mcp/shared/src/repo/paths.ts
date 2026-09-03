/**
 * Locates the Mission Platform repository root and exposes the canonical
 * workspace directories. The root can be overridden with the
 * `MISSION_REPO_ROOT` environment variable; otherwise it is discovered by
 * walking up from this file until a `pnpm-workspace.yaml` is found.
 */
import {existsSync, lstatSync, realpathSync} from 'node:fs';
import {dirname, isAbsolute, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

/** The workspace groups understood by the tooling. */
export type WorkspaceGroup = 'packages' | 'apps' | 'edge-workers' | 'tooling-vite' | 'tooling-configs' | 'crates';

export const WORKSPACE_GROUPS: readonly WorkspaceGroup[] = [
  'packages',
  'apps',
  'crates',
];

let cachedRoot: string | undefined;

export interface RepoPathOptions {
  /** Permit a path that does not exist yet, after validating its parent. */
  allowMissing?: boolean;
}

function isOutside(root: string, candidate: string): boolean {
  const path = relative(root, candidate);
  return path === '..' || path.startsWith(`..${'/'}`) || path.startsWith(`..\\`) || isAbsolute(path);
}

function rejectSymlinkComponents(root: string, candidate: string, label: string): void {
  const segments = relative(root, candidate).split(/[\\/]/).filter(Boolean);
  let current = root;
  for (const segment of segments) {
    current = join(current, segment);
    try {
      if (lstatSync(current).isSymbolicLink()) {
        throw new Error(`${label} must not traverse symlink "${current}".`);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return;
      }
      throw error;
    }
  }
}

/**
 * Resolve a path against the canonical repository root.
 *
 * Lexical traversal is rejected before filesystem access. Existing paths are
 * checked by real path and every existing component is lstat-checked so a
 * symlink cannot be used as a repository member, source, or write target. For
 * new paths, all existing parent components receive the same checks.
 */
export function resolveRepoPath(path: string, label: string, options: RepoPathOptions = {}): string {
  const root = realpathSync(findRepoRoot());
  const candidate = isAbsolute(path) ? resolve(path) : resolve(root, path);
  if (isOutside(root, candidate)) {
    throw new Error(`${label} must remain within the repository root.`);
  }

  rejectSymlinkComponents(root, candidate, label);
  try {
    const realCandidate = realpathSync(candidate);
    if (isOutside(root, realCandidate)) {
      throw new Error(`${label} must not resolve outside the repository root.`);
    }
    return candidate;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
    if (!options.allowMissing) {
      throw new Error(`${label} does not exist within the repository root.`);
    }
    return candidate;
  }
}

export function findRepoRoot(): string {
  if (cachedRoot) {
    return cachedRoot;
  }

  const override = process.env['MISSION_REPO_ROOT'];
  if (override && existsSync(join(override, 'pnpm-workspace.yaml'))) {
    cachedRoot = realpathSync(resolve(override));
    return cachedRoot;
  }

  let current = dirname(fileURLToPath(import.meta.url));
  // Walk up towards the filesystem root looking for the workspace manifest.
  for (let depth = 0; depth < 12; depth += 1) {
    if (existsSync(join(current, 'pnpm-workspace.yaml'))) {
      cachedRoot = realpathSync(current);
      return cachedRoot;
    }
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  // Fall back to two levels above `mcp/src/repo` (i.e. the repo root layout).
  cachedRoot = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..'));
  return cachedRoot;
}

export function groupDir(group: WorkspaceGroup): string {
  const relativeGroup = {
    packages: 'packages',
    apps: 'apps',
    'edge-workers': 'packages/edge/workers',
    'tooling-vite': 'packages/tooling/vite',
    'tooling-configs': 'packages/tooling/configs',
    crates: 'crates',
  }[group];
  return join(findRepoRoot(), relativeGroup);
}

export function docsDir(): string {
  return join(findRepoRoot(), 'docs');
}
