import fs from 'node:fs';
import path from 'node:path';

import { DEFAULT_ARTIFACT_DIRECTORY, safeArtifactName } from './paths.ts';
import {
  STORYBOOK_FRAMEWORKS,
  type RepositoryInventory,
  type RuntimeManifest,
  type RuntimeResult,
  type RuntimeStatus,
} from './types.ts';

const WORKSPACE_SCOPES = new Set<RepositoryInventory['workspacePackages'][number]['scope']>([
  'app',
  'package',
  'config',
  'plugin',
  'worker',
  'example',
  'script',
  'mcp',
  'crate',
  'other',
]);
const RUNTIME_STATUSES: ReadonlySet<RuntimeStatus> = new Set([
  'pass',
  'compile-failure',
  'runtime-failure',
  'interaction-failure',
  'blocked',
  'excluded',
]);

function isRuntimeResult(value: unknown): value is RuntimeResult {
  if (!value || typeof value !== 'object') return false;
  const result = value as Partial<RuntimeResult>;
  if (result.target !== 'story' && result.target !== 'app') return false;
  if (
    typeof result.packageOrApp !== 'string' ||
    typeof result.idOrRoute !== 'string' ||
    typeof result.category !== 'string'
  )
    return false;
  if (!RUNTIME_STATUSES.has(result.status as RuntimeStatus)) return false;
  if (result.message !== undefined && typeof result.message !== 'string') return false;
  if (result.attempts !== undefined && (!Number.isInteger(result.attempts) || result.attempts < 1)) return false;
  if (result.workstream !== undefined && typeof result.workstream !== 'string') return false;
  if (result.evidence !== undefined) {
    if (!result.evidence || typeof result.evidence !== 'object') return false;
    const evidence = result.evidence as { screenshot?: unknown; log?: unknown };
    if (evidence.screenshot !== undefined && typeof evidence.screenshot !== 'string') return false;
    if (evidence.log !== undefined && typeof evidence.log !== 'string') return false;
  }
  return (
    result.framework === undefined ||
    STORYBOOK_FRAMEWORKS.includes(result.framework as (typeof STORYBOOK_FRAMEWORKS)[number])
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isWorkspacePackage(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.name === 'string' &&
    typeof item.directory === 'string' &&
    typeof item.relativeDirectory === 'string' &&
    typeof item.scope === 'string' &&
    WORKSPACE_SCOPES.has(item.scope as RepositoryInventory['workspacePackages'][number]['scope'])
  );
}

function isStoryFile(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const story = value as Record<string, unknown>;
  return (
    typeof story.id === 'string' &&
    typeof story.packageName === 'string' &&
    typeof story.filePath === 'string' &&
    typeof story.absolutePath === 'string' &&
    (story.exportedStories === undefined || isStringArray(story.exportedStories)) &&
    (story.excludedFramework === undefined ||
      STORYBOOK_FRAMEWORKS.includes(story.excludedFramework as (typeof STORYBOOK_FRAMEWORKS)[number]))
  );
}

function isAppInventory(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const app = value as Record<string, unknown>;
  return (
    typeof app.name === 'string' &&
    typeof app.directory === 'string' &&
    typeof app.relativeDirectory === 'string' &&
    typeof app.packageJson === 'string' &&
    isStringArray(app.routerFiles) &&
    isStringArray(app.routes)
  );
}

function isRepositoryInventory(value: unknown): value is RepositoryInventory {
  if (!value || typeof value !== 'object') return false;
  const inventory = value as Record<string, unknown>;
  return (
    typeof inventory.repositoryRoot === 'string' &&
    Array.isArray(inventory.workspacePackages) &&
    inventory.workspacePackages.every((item) => isWorkspacePackage(item)) &&
    Array.isArray(inventory.packages) &&
    inventory.packages.every((item) => isWorkspacePackage(item)) &&
    Array.isArray(inventory.apps) &&
    inventory.apps.every((item) => isAppInventory(item)) &&
    Array.isArray(inventory.stories) &&
    inventory.stories.every((item) => isStoryFile(item)) &&
    isStringArray(inventory.storybookPackages)
  );
}

export function createManifest(
  inventory: RepositoryInventory,
  results: RuntimeResult[] = [],
  generatedAt = new Date().toISOString(),
): RuntimeManifest {
  return { schemaVersion: 1, generatedAt, inventory, results };
}

export function serializeManifest(manifest: RuntimeManifest): string {
  return `${JSON.stringify(manifest, undefined, 2)}\n`;
}

export function parseManifest(serialized: string): RuntimeManifest {
  const manifest = JSON.parse(serialized) as RuntimeManifest;
  if (
    manifest.schemaVersion !== 1 ||
    typeof manifest.generatedAt !== 'string' ||
    !isRepositoryInventory(manifest.inventory) ||
    !Array.isArray(manifest.results) ||
    !manifest.results.every(isRuntimeResult)
  ) {
    throw new Error('Invalid runtime validation manifest');
  }
  return manifest;
}

export function writeManifest(repositoryRoot: string, manifest: RuntimeManifest, outputPath?: string): string {
  const target = outputPath ?? path.join(repositoryRoot, DEFAULT_ARTIFACT_DIRECTORY, 'runtime-validation.json');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, serializeManifest(manifest));
  return target;
}

export function summarizeResults(results: RuntimeResult[]): string {
  const counts = new Map<string, number>();
  for (const result of results) counts.set(result.status, (counts.get(result.status) ?? 0) + 1);
  const summary = [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([status, count]) => `${status}=${count}`);
  return summary.length > 0 ? summary.join(' ') : 'no results';
}

export function summarizeFailureGroups(results: RuntimeResult[]): string {
  const groups = new Map<string, number>();
  for (const result of results) {
    if (result.status === 'pass' || result.status === 'excluded') continue;
    const framework = result.framework ?? 'app';
    const workstream = result.workstream ?? 'app';
    const key = `${framework} / ${result.packageOrApp} / ${workstream} / ${result.status}`;
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([group, count]) => `${group}: ${count}`)
    .join('\n');
}

export function failureEvidenceId(result: RuntimeResult): string {
  return safeArtifactName(
    [result.target, result.packageOrApp, result.framework, result.idOrRoute].filter(Boolean).join('__'),
  );
}
