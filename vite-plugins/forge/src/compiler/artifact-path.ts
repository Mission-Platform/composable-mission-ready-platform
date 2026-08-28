import { lstatSync, mkdirSync } from 'node:fs';
import path from 'node:path';

function pathError(relativeName: string): Error {
  return new Error(`Forge artifact path must be a strict relative path: ${relativeName}`);
}

/** Validate an artifact name without normalising away unsafe path segments. */
export function validateForgeArtifactName(relativeName: string): string {
  if (
    typeof relativeName !== 'string' ||
    relativeName.length === 0 ||
    relativeName.includes('\\') ||
    path.posix.isAbsolute(relativeName) ||
    path.win32.isAbsolute(relativeName)
  ) {
    throw pathError(relativeName);
  }

  const segments = relativeName.split('/');
  if (segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..')) {
    throw pathError(relativeName);
  }
  return relativeName;
}

/** Validate a single path component used to construct an artifact root. */
export function validateForgeArtifactSegment(segment: string): string {
  validateForgeArtifactName(segment);
  if (segment.includes('/')) throw pathError(segment);
  return segment;
}

function assertNoSymlinkComponents(root: string, target: string): void {
  let current = root;
  const relative = path.relative(root, target);
  for (const segment of relative.split(path.sep)) {
    if (segment.length === 0) continue;
    current = path.join(current, segment);
    try {
      if (lstatSync(current).isSymbolicLink()) {
        throw new Error(`Forge artifact path contains a symlink: ${target}`);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw error;
    }
  }
}

/**
 * Validate an output root and reject an existing symlink or non-directory.
 * Descendant components are checked by the artifact resolver before use.
 */
export function assertForgeArtifactRoot(root: string): string {
  const resolvedRoot = path.resolve(root);
  try {
    const stats = lstatSync(resolvedRoot);
    if (stats.isSymbolicLink()) {
      throw new Error(`Forge artifact root contains a symlink: ${resolvedRoot}`);
    }
    if (!stats.isDirectory()) {
      throw new Error(`Forge artifact root must be a directory: ${resolvedRoot}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  return resolvedRoot;
}

/** Resolve an artifact name and verify that existing path components are safe. */
export function resolveForgeArtifactPath(root: string, relativeName: string): string {
  const safeRoot = assertForgeArtifactRoot(root);
  const safeName = validateForgeArtifactName(relativeName);
  const resolvedPath = path.resolve(safeRoot, ...safeName.split('/'));
  const relative = path.relative(safeRoot, resolvedPath);
  if (relative.length === 0 || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw pathError(relativeName);
  }
  assertNoSymlinkComponents(safeRoot, resolvedPath);
  return resolvedPath;
}

/** Create an output directory one component at a time without following links. */
export function ensureForgeArtifactDirectory(root: string, directory: string): string {
  const safeRoot = assertForgeArtifactRoot(root);
  const resolvedDirectory = path.resolve(directory);
  const relative = path.relative(safeRoot, resolvedDirectory);
  if (relative.length !== 0 && (relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))) {
    throw new Error(`Forge artifact directory must stay inside the target tree: ${directory}`);
  }

  let current = safeRoot;
  try {
    const stats = lstatSync(current);
    if (stats.isSymbolicLink() || !stats.isDirectory()) {
      throw new Error(`Forge artifact directory contains an unsafe component: ${current}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    mkdirSync(current, { recursive: true });
  }
  const segments = relative.split(path.sep).filter((segment) => segment.length > 0);
  for (const segment of segments) {
    current = path.join(current, segment);
    try {
      const stats = lstatSync(current);
      if (stats.isSymbolicLink() || !stats.isDirectory()) {
        throw new Error(`Forge artifact directory contains an unsafe component: ${current}`);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      mkdirSync(current);
    }
  }
  return resolvedDirectory;
}
