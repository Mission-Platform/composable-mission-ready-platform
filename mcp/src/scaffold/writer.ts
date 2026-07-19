/**
 * Writes generated scaffolds to disk under the correct workspace group.
 *
 * Safety first: the target folder must not already exist, names are validated
 * against the kebab-case convention, and callers must explicitly opt in with
 * `apply: true` — otherwise a dry-run preview is returned and nothing is written.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { groupDir, type WorkspaceGroup } from '../repo/paths.ts';

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
