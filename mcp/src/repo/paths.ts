/**
 * Locates the Mission Platform repository root and exposes the canonical
 * workspace directories. The root can be overridden with the
 * `MISSION_REPO_ROOT` environment variable; otherwise it is discovered by
 * walking up from this file until a `pnpm-workspace.yaml` is found.
 */
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The workspace groups understood by the tooling. */
export type WorkspaceGroup = 'packages' | 'apps' | 'workers' | 'vite-plugins' | 'configs';

export const WORKSPACE_GROUPS: readonly WorkspaceGroup[] = ['packages', 'apps', 'workers', 'vite-plugins', 'configs'];

let cachedRoot: string | undefined;

export function findRepoRoot(): string {
  if (cachedRoot) {
    return cachedRoot;
  }

  const override = process.env['MISSION_REPO_ROOT'];
  if (override && existsSync(join(override, 'pnpm-workspace.yaml'))) {
    cachedRoot = resolve(override);
    return cachedRoot;
  }

  let current = dirname(fileURLToPath(import.meta.url));
  // Walk up towards the filesystem root looking for the workspace manifest.
  for (let depth = 0; depth < 12; depth += 1) {
    if (existsSync(join(current, 'pnpm-workspace.yaml'))) {
      cachedRoot = current;
      return cachedRoot;
    }
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  // Fall back to two levels above `mcp/src/repo` (i.e. the repo root layout).
  cachedRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
  return cachedRoot;
}

export function groupDir(group: WorkspaceGroup): string {
  return join(findRepoRoot(), group);
}

export function docsDir(): string {
  return join(findRepoRoot(), 'docs');
}
