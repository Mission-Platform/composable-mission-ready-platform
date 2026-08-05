/**
 * Writes generated scaffolds to disk under the correct workspace group.
 *
 * Safety first: the target folder must not already exist, names are validated
 * against the kebab-case convention, and callers must explicitly opt in with
 * `apply: true` — otherwise a dry-run preview is returned and nothing is written.
 *
 * In-package scaffolding (components, composables, stores, utils) uses
 * {@link writeIntoPackage}: it refuses to overwrite existing files, can append
 * export lines to barrel files, and is dry-run unless `apply: true`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { groupDir, type WorkspaceGroup } from '@mission-platform/mcp-shared/repo/paths';

export interface ScaffoldRequest {
  group: WorkspaceGroup;
  name: string;
  files: Record<string, string>;
  apply: boolean;
}

export interface ScaffoldResult {
  applied: boolean;
  targetDir: string;
  relativeDir: string;
  files: string[];
  message: string;
  /** Preview of barrel lines that would be / were appended. */
  barrelUpdates?: string[];
}

export interface BarrelUpdate {
  /** Path relative to the package root, e.g. `src/components/index.ts`. */
  relativePath: string;
  /** Full export statement to append (without trailing newline requirement). */
  exportLine: string;
}

export interface PackageWriteRequest {
  /** Absolute path to the package root (e.g. `.../packages/components`). */
  packageDir: string;
  /** Repo-relative package path for messages (e.g. `packages/components`). */
  relativePackageDir: string;
  /** New files keyed by path relative to the package root. */
  files: Record<string, string>;
  /** Optional barrel appends performed after writing files. */
  barrelUpdates?: BarrelUpdate[];
  apply: boolean;
}

const NAME_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export function validateName(name: string): string | undefined {
  if (!NAME_PATTERN.test(name)) {
    return `Invalid name "${name}". Use kebab-case: lowercase letters, digits and single hyphens (e.g. "date-utils").`;
  }
  return undefined;
}

export function writeScaffold(request: ScaffoldRequest): ScaffoldResult {
  const { group, name, files, apply } = request;

  const nameError = validateName(name);
  if (nameError) {
    throw new Error(nameError);
  }

  const targetDir = join(groupDir(group), name);
  const relativeDir = `${group}/${name}`;
  const fileList = Object.keys(files).sort();

  if (existsSync(targetDir)) {
    throw new Error(`Target "${relativeDir}" already exists. Choose another name or edit it manually.`);
  }

  if (!apply) {
    return {
      applied: false,
      targetDir,
      relativeDir,
      files: fileList,
      message: `Dry run — no files written. Pass "apply": true to create ${fileList.length} files under ${relativeDir}/.`,
    };
  }

  for (const [relativePath, contents] of Object.entries(files)) {
    const fullPath = join(targetDir, relativePath);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, contents, 'utf8');
  }

  return {
    applied: true,
    targetDir,
    relativeDir,
    files: fileList,
    message: `Created ${fileList.length} files under ${relativeDir}/. Next: run "pnpm install", then build/lint/test with a --filter on @mission-platform/${name}.`,
  };
}

/**
 * Write files into an existing package. Never overwrites existing source files.
 * Barrel updates append an export line when missing (or create the barrel).
 */
export function writeIntoPackage(request: PackageWriteRequest): ScaffoldResult {
  const { packageDir, relativePackageDir, files, apply } = request;
  const barrelUpdates = request.barrelUpdates ?? [];

  if (!existsSync(packageDir)) {
    throw new Error(`Package directory "${relativePackageDir}" does not exist.`);
  }

  const fileList = Object.keys(files).sort();
  const collisions = fileList.filter((relativePath) => existsSync(join(packageDir, relativePath)));
  if (collisions.length > 0) {
    throw new Error(
      `Refusing to overwrite existing file(s) in ${relativePackageDir}: ${collisions.join(', ')}. Choose another name.`,
    );
  }

  const barrelPreview = barrelUpdates.map((update) => `${update.relativePath}: ${update.exportLine.trim()}`);

  if (!apply) {
    return {
      applied: false,
      targetDir: packageDir,
      relativeDir: relativePackageDir,
      files: fileList,
      barrelUpdates: barrelPreview,
      message: `Dry run — no files written. Pass "apply": true to create ${fileList.length} file(s) under ${relativePackageDir}/ and update ${barrelUpdates.length} barrel(s).`,
    };
  }

  for (const [relativePath, contents] of Object.entries(files)) {
    const fullPath = join(packageDir, relativePath);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, contents, 'utf8');
  }

  for (const update of barrelUpdates) {
    applyBarrelUpdate(packageDir, update);
  }

  return {
    applied: true,
    targetDir: packageDir,
    relativeDir: relativePackageDir,
    files: fileList,
    barrelUpdates: barrelPreview,
    message: `Created ${fileList.length} file(s) under ${relativePackageDir}/ and updated ${barrelUpdates.length} barrel(s).`,
  };
}

function applyBarrelUpdate(packageDir: string, update: BarrelUpdate): void {
  const fullPath = join(packageDir, update.relativePath);
  const line = update.exportLine.trim();
  mkdirSync(dirname(fullPath), { recursive: true });

  if (!existsSync(fullPath)) {
    writeFileSync(fullPath, `${line}\n`, 'utf8');
    return;
  }

  const existing = readFileSync(fullPath, 'utf8');
  if (existing.includes(line)) {
    return;
  }

  // Replace a placeholder empty export with the first real export.
  const stripped = existing.replace(/^\s*export\s*\{\s*\}\s*;?\s*$/m, '').trimEnd();
  const next = stripped.length > 0 ? `${stripped}\n${line}\n` : `${line}\n`;
  writeFileSync(fullPath, next, 'utf8');
}
