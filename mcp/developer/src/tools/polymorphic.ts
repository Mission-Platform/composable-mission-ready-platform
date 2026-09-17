/**
 * Polymorphic dispatchers for @mission-platform/mcp-developer.
 *
 * Consolidates multiple related single-action tools into polymorphic dispatchers:
 * 1. scaffold: component | composable | package | app | worker | crate | store | util
 * 2. i18n: list | coverage | add | remove | update
 * 3. git_metadata: branches | tags | remotes | files
 *
 * This dramatically reduces the prompt token footprint of tool definitions.
 */

import {
  appFiles,
  componentFiles,
  composableFiles,
  crateFiles,
  normalizeComposableName,
  packageFiles,
  storeFiles,
  utilFiles,
  workerFiles,
  type ScaffoldAtomicLevel,
} from '@mission-platform/mcp-shared/knowledge/templates';
import {
  addLocale,
  localeCoverage,
  removeLocale,
  resolveMemberLocales,
  surveyLocales,
  updateTranslation,
} from '@mission-platform/mcp-shared/repo/locales';
import { resolveRepoPath, type WorkspaceGroup } from '@mission-platform/mcp-shared/repo/paths';
import { findMember } from '@mission-platform/mcp-shared/repo/scanner';
import { z } from 'zod';

import { readGitBranches, readGitLsFiles, readGitRemotes, readGitTags, type GitCommandResult } from '../git/index.ts';
import { validateName, writeIntoPackage, writeScaffold } from '../scaffold/writer.ts';

/**
 * Normalize unit or component identifier into kebab-case.
 */
function normalizeUnitName(raw: string): string {
  return raw
    .replaceAll(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replaceAll(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Validate and resolve the filesystem path for a package target.
 */
function resolvePackageTarget(packageName: string): { packageDir: string; relativePackageDir: string; folder: string } {
  const folder = packageName.replace(/^@mission-platform\//, '').trim();
  if (!folder) {
    throw new Error('Provide a package folder name (e.g. "components").');
  }
  const nameError = validateName(folder);
  if (nameError) {
    throw new Error(nameError);
  }
  const member = findMember('packages', packageName);
  if (!member) {
    const relativePackageDir = `packages/${folder}`;
    throw new Error(`Package "${relativePackageDir}" does not exist.`);
  }
  return {
    packageDir: resolveRepoPath(member.dir, member.relativeDir),
    relativePackageDir: member.relativeDir,
    folder,
  };
}

export const scaffoldInputSchema = {
  type: z
    .enum(['component', 'composable', 'package', 'app', 'worker', 'crate', 'store', 'util'])
    .describe('Target entity type to scaffold.'),
  name: z.string().describe('Kebab-case entity name, e.g. "forge-input", "use-storage", "analytics".'),
  level: z
    .enum(['atom', 'molecule', 'organism', 'template', 'page'])
    .optional()
    .describe('Atomic design level (required for component).'),
  area: z
    .string()
    .optional()
    .describe('Storybook functional area (for component, e.g. "Forms", "Data"). Defaults to "General".'),
  package: z
    .string()
    .optional()
    .describe(
      'Target package folder under packages/ (for component, composable, store, util). Defaults to "components" for component.',
    ),
  group: z
    .enum(['apps', 'packages', 'edge-workers', 'tooling-vite', 'tooling-configs', 'crates'])
    .optional()
    .describe('Workspace group (for package). Defaults to "packages".'),
  description: z.string().optional().describe('Short entity description.'),
  vue: z
    .boolean()
    .optional()
    .describe('Set true if the package ships Vue components (adds stylelint + vue deps). Defaults to false.'),
  apply: z.boolean().optional().describe('Write files to disk. Defaults to false (dry run).'),
};

export type ScaffoldInput = z.infer<z.ZodObject<typeof scaffoldInputSchema>>;

/**
 * Scaffold a top-level workspace member (package, app, worker, or crate).
 */
function scaffoldWorkspaceEntity(
  entityType: 'package' | 'app' | 'worker' | 'crate',
  name: string,
  args: ScaffoldInput,
): object {
  const apply = args.apply === true;
  const description = args.description?.trim() ?? '';

  switch (entityType) {
    case 'package': {
      const files = packageFiles({
        name,
        description,
        vue: args.vue === true,
      });
      const group = (args.group as WorkspaceGroup | undefined) ?? 'packages';
      return writeScaffold({ group, name, files, apply });
    }

    case 'app': {
      const files = appFiles({ name, description });
      return writeScaffold({ group: 'apps', name, files, apply });
    }

    case 'worker': {
      const files = workerFiles({ name, description });
      return writeScaffold({ group: 'edge-workers', name, files, apply });
    }

    case 'crate': {
      const files = crateFiles({ name, description });
      return writeScaffold({ group: 'crates', name, files, apply });
    }

    default: {
      throw new Error(`Unsupported workspace entity type: "${String(entityType)}".`);
    }
  }
}

/**
 * Scaffold an internal unit inside an existing package (component, composable, store, or util).
 */
function scaffoldPackageUnit(
  entityType: 'component' | 'composable' | 'store' | 'util',
  name: string,
  args: ScaffoldInput,
): object {
  const apply = args.apply === true;

  switch (entityType) {
    case 'component': {
      const normalizedName = normalizeUnitName(name);
      const nameError = validateName(normalizedName);
      if (nameError) throw new Error(nameError);
      if (!args.level) {
        throw new Error('Component scaffolding requires a "level" (atom, molecule, organism, template, page).');
      }
      const target = resolvePackageTarget(args.package?.trim() || 'components');
      const scaffold = componentFiles({
        name: normalizedName,
        level: args.level as ScaffoldAtomicLevel,
        area: args.area?.trim() || 'General',
        description: args.description?.trim(),
      });
      const result = writeIntoPackage({
        packageDir: target.packageDir,
        relativePackageDir: target.relativePackageDir,
        files: scaffold.files,
        barrelUpdates: [{ relativePath: 'src/components/index.ts', exportLine: scaffold.barrelExport }],
        apply,
      });
      return {
        ...result,
        componentName: scaffold.componentName,
        storyTitle: scaffold.storyTitle,
        levelFolder: scaffold.levelFolder,
      };
    }

    case 'composable': {
      const normalized = normalizeComposableName(name);
      const target = resolvePackageTarget(args.package?.trim() || 'components');
      const scaffold = composableFiles({ name: normalized, description: args.description?.trim() });
      const result = writeIntoPackage({
        packageDir: target.packageDir,
        relativePackageDir: target.relativePackageDir,
        files: scaffold.files,
        barrelUpdates: [{ relativePath: 'src/composables/index.ts', exportLine: scaffold.barrelExport }],
        apply,
      });
      return {
        ...result,
        name: scaffold.name,
        functionName: scaffold.functionName,
        camel: scaffold.functionName,
      };
    }

    case 'store': {
      const normalizedName = normalizeUnitName(name);
      const packageName = args.package?.trim();
      if (!packageName) throw new Error('Provide a target "package" folder under packages/.');
      const nameError = validateName(normalizedName);
      if (nameError) throw new Error(nameError);
      const target = resolvePackageTarget(packageName);
      const scaffold = storeFiles({ name: normalizedName, description: args.description?.trim() });
      const result = writeIntoPackage({
        packageDir: target.packageDir,
        relativePackageDir: target.relativePackageDir,
        files: scaffold.files,
        barrelUpdates: [{ relativePath: 'src/stores/index.ts', exportLine: scaffold.barrelExport }],
        apply,
      });
      return {
        ...result,
        name: scaffold.name,
        pascal: scaffold.pascal,
      };
    }

    case 'util': {
      const normalizedName = normalizeUnitName(name);
      const packageName = args.package?.trim();
      if (!packageName) throw new Error('Provide a target "package" folder under packages/.');
      const nameError = validateName(normalizedName);
      if (nameError) throw new Error(nameError);
      const target = resolvePackageTarget(packageName);
      const scaffold = utilFiles({ name: normalizedName, description: args.description?.trim() });
      const result = writeIntoPackage({
        packageDir: target.packageDir,
        relativePackageDir: target.relativePackageDir,
        files: scaffold.files,
        barrelUpdates: [{ relativePath: 'src/utils/index.ts', exportLine: scaffold.barrelExport }],
        apply,
      });
      return {
        ...result,
        name: scaffold.name,
        functionName: scaffold.functionName,
      };
    }

    default: {
      throw new Error(`Unsupported package unit type: "${String(entityType)}".`);
    }
  }
}

/**
 * Polymorphic scaffolding dispatcher for workspace members and internal package units.
 */
export function dispatchScaffold(args: ScaffoldInput): object {
  const name = args.name?.trim();
  if (!name) {
    throw new Error('Provide a kebab-case "name".');
  }

  const entityType = args.type;
  switch (entityType) {
    case 'package':
    case 'app':
    case 'worker':
    case 'crate': {
      return scaffoldWorkspaceEntity(entityType, name, args);
    }

    case 'component':
    case 'composable':
    case 'store':
    case 'util': {
      return scaffoldPackageUnit(entityType, name, args);
    }

    default: {
      throw new Error(`Unsupported entity type: "${String(entityType)}".`);
    }
  }
}

export const i18nInputSchema = {
  action: z.enum(['list', 'coverage', 'add', 'remove', 'update']).describe('Localization action to perform.'),
  name: z
    .string()
    .optional()
    .describe(
      'Workspace member folder (e.g. "website"). Required for coverage, add, remove, update; optional for list.',
    ),
  group: z
    .enum(['apps', 'packages', 'edge-workers', 'tooling-vite', 'tooling-configs', 'crates'])
    .optional()
    .describe('Workspace group. Defaults to "apps".'),
  locale: z.string().optional().describe('Locale code (e.g. "fr", "de-DE", "ja"). Required for add, remove, update.'),
  key: z.string().optional().describe('Dot-notated key path (e.g. "common.buttons.save"). Required for update.'),
  value: z.string().optional().describe('Translated string value. Required for update.'),
  namespace: z.string().optional().describe('Translation namespace (for nested layout).'),
  fill: z
    .enum(['source', 'empty'])
    .optional()
    .describe('How to fill new locale keys: "source" (copy default) or "empty" (empty strings). Defaults to "empty".'),
  apply: z.boolean().optional().describe('Write files to disk. Defaults to false (dry run).'),
};

export type I18nInput = z.infer<z.ZodObject<typeof i18nInputSchema>>;

/**
 * Require and resolve locales for a specific workspace member.
 */
function requireMemberLocales(group: WorkspaceGroup, name?: string) {
  if (!name) throw new Error('Provide a workspace member folder "name".');
  const resolved = resolveMemberLocales(group, name);
  if (!resolved) {
    throw new Error(`"${name}" in ${group}/ has no YAML locale files.`);
  }
  return resolved;
}

/**
 * Handle read-only i18n operations (list and coverage).
 */
function handleI18nQuery(action: 'list' | 'coverage', group: WorkspaceGroup, name?: string): object {
  if (action === 'list' && !name) {
    return surveyLocales(group);
  }
  const resolved = requireMemberLocales(group, name);
  const coverage = localeCoverage(resolved);

  if (action === 'coverage') {
    return {
      member: name,
      localesDir: resolved.relativeLocalesDir,
      layout: resolved.layout,
      defaultLocale: resolved.defaultLocale,
      coverage,
    };
  }

  return {
    member: name,
    localesDir: resolved.relativeLocalesDir,
    layout: resolved.layout,
    defaultLocale: resolved.defaultLocale,
    namespaces: resolved.namespaces,
    locales: resolved.locales,
    coverage,
  };
}

/**
 * Handle mutating i18n operations (add, remove, update).
 */
function handleI18nMutation(
  action: 'add' | 'remove' | 'update',
  group: WorkspaceGroup,
  name: string | undefined,
  args: I18nInput,
): object | string {
  const resolved = requireMemberLocales(group, name);
  const locale = args.locale?.trim();

  switch (action) {
    case 'add': {
      if (!locale) throw new Error('Provide a "locale" code to add.');
      return addLocale(resolved, locale, {
        fill: args.fill ?? 'empty',
        apply: args.apply === true,
      });
    }

    case 'remove': {
      if (!locale) throw new Error('Provide a "locale" code to remove.');
      return removeLocale(resolved, locale, args.apply === true);
    }

    case 'update': {
      if (!locale) throw new Error('Provide a "locale" code.');
      const key = args.key?.trim();
      if (!key) throw new Error('Provide a dot-notated "key" path.');
      if (args.value === undefined) throw new Error('Provide a "value" string.');
      return updateTranslation({
        resolved,
        code: locale,
        entries: { [key]: args.value },
        namespace: args.namespace?.trim(),
        apply: args.apply === true,
      });
    }

    default: {
      throw new Error(`Unsupported i18n mutation action: "${String(action)}".`);
    }
  }
}

/**
 * Polymorphic localization dispatcher for inspecting and modifying YAML translation catalogues.
 */
export function dispatchI18n(args: I18nInput): object | string {
  const group = (args.group as WorkspaceGroup | undefined) ?? 'apps';
  const name = args.name?.trim();

  switch (args.action) {
    case 'list':
    case 'coverage': {
      return handleI18nQuery(args.action, group, name);
    }

    case 'add':
    case 'remove':
    case 'update': {
      return handleI18nMutation(args.action, group, name, args);
    }

    default: {
      throw new Error(`Unsupported i18n action: "${String(args.action)}".`);
    }
  }
}

export const gitMetadataInputSchema = {
  kind: z.enum(['branches', 'tags', 'remotes', 'files']).describe('Git metadata category to query.'),
  path: z.string().min(1).max(4096).optional().describe('Repository-relative path filter (for files).'),
  pattern: z.string().min(1).max(512).optional().describe('Glob or substring pattern (for tags).'),
  limit: z.number().int().min(1).max(500).optional().describe('Maximum items to return (for tags).'),
  includeUntracked: z.boolean().optional().describe('Include untracked files (for files).'),
  includeStages: z.boolean().optional().describe('Include staging info (for files).'),
  timeoutMs: z.number().int().min(10).max(120_000).optional(),
  maxOutputBytes: z.number().int().min(1).max(1_048_576).optional(),
};

export type GitMetadataInput = z.infer<z.ZodObject<typeof gitMetadataInputSchema>>;

/**
 * Polymorphic Git metadata inspection dispatcher. Query repository branches, tags, remotes, or ls-files.
 */
export function dispatchGitMetadata(args: GitMetadataInput): GitCommandResult {
  switch (args.kind) {
    case 'branches': {
      return readGitBranches(args);
    }
    case 'tags': {
      return readGitTags(args);
    }
    case 'remotes': {
      return readGitRemotes(args);
    }
    case 'files': {
      return readGitLsFiles(args);
    }
    default: {
      throw new Error(`Unsupported git metadata kind: "${String(args.kind)}".`);
    }
  }
}
