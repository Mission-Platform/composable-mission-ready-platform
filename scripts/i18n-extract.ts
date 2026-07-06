/**
 * i18n-extract — SFC locale block extractor (per-app)
 *
 * For every app under apps/, scans the app's own .vue files plus the .vue files
 * of every @mission-platform/* workspace package it depends on, extracts
 * <i18n> blocks, and writes an i18n-meta.yaml at the root of that app.
 *
 * Locale ownership:
 *   - SFC `<i18n>` blocks must contain ONLY the English (`en`) source strings.
 *     They are the single source of truth for keys + English copy.
 *   - All other locales live exclusively in `i18n-meta.yaml`, where they can
 *     be managed by translation tooling (Crowdin, Lokalise, POEditor, …).
 *     This script re-attaches those existing translations on every run so
 *     the meta file remains the source of truth for them.
 *   - Any non-English locale accidentally left inside a `<i18n>` block is
 *     dropped with a warning.
 *
 * Additionally, the per-app i18n-meta.yaml is treated as the source of truth
 * for runtime translation bundles: for every locale present in the meta, a
 * per-locale file is written to apps/<app>/src/locales/<locale>.yaml.
 * The runtime files are grouped by i18next namespace: every package and app
 * owns a `mp.<workspace>` namespace, so the components contributed by
 * @mission-platform/breakpoints land under `mp.breakpoints`, while the app's
 * own components land under `mp.<app-name>`. Within a namespace the
 * <ComponentName> keys are stripped and their children merged, matching the
 * local scope used by the SFC `<i18n>` blocks they pair with.
 *
 * Meta shape (per app, the translation source of truth):
 *   en:
 *     BaseButton:
 *       loading: Loading…
 *
 * Runtime shape (per app + locale, the namespace-grouped derived bundle):
 *   mp.components:
 *     loading: Loading…
 *   mp.my-care-notes:
 *     nav:
 *       notes: Notes
 *
 * Usage:
 *   node --experimental-strip-types scripts/i18n-extract.ts
 */

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse as parseSfc } from '@vue/compiler-sfc';
import yaml from 'js-yaml';

// ─── Types ────────────────────────────────────────────────────────────────────

// @ts-ignore
type LocaleMessages = Record<string, string | LocaleMessages>;
type ComponentMessages = Record<string, LocaleMessages>;
type MetaOutput = Record<string, ComponentMessages>;

interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
const APPS_DIR = join(ROOT, 'apps');
const PACKAGES_DIR = join(ROOT, 'packages');
const SKIP_DIRS = new Set(['node_modules', 'dist', '.storybook', 'storybook-static', 'public']);
const WORKSPACE_SCOPE = '@mission-platform/';

/** The reserved prefix for every Mission Platform i18next namespace. */
const MP_NAMESPACE_PREFIX = 'mp';

/**
 * Build the `mp.<workspace>` i18next namespace for a package/app name, e.g.
 * `@mission-platform/breakpoints` → `mp.breakpoints`. Mirrors `mpNamespace`
 * from `@mission-platform/i18n` (inlined here to keep the script dependency-free).
 */
function mpNamespace(packageName: string): string {
  const unscoped = packageName.startsWith(WORKSPACE_SCOPE) ? packageName.slice(WORKSPACE_SCOPE.length) : packageName;
  return `${MP_NAMESPACE_PREFIX}.${unscoped}`;
}

/** Recursively collect all .vue files under a directory. */
function collectVueFiles(dir: string): string[] {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const files: string[] = [];
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectVueFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.vue')) {
      files.push(full);
    }
  }
  return files;
}

const OPTIONS_REGEX = new RegExp(/defineOptions\s*\(\s*\{[^}]*name:\s*['"]([^'"]+)['"]/s);
const COMPONENTS_REGEX = new RegExp(/defineComponent\s*\(\s*\{[^}]*name:\s*['"]([^'"]+)['"]/s);

/**
 * Derive a component name from the SFC source.
 * Priority:
 *   1. defineOptions({ name: '…' })
 *   2. defineComponent({ name: '…' })
 *   3. PascalCase of the filename stem
 */
function extractComponentName(sfcSource: string, filePath: string): string {
  const nameMatch = OPTIONS_REGEX.exec(sfcSource) ?? COMPONENTS_REGEX.exec(sfcSource);

  if (nameMatch) return nameMatch[1];

  const stem = basename(filePath, '.vue');
  return stem.replaceAll(/(^|[-_])(\w)/g, (_, __, c: string) => c.toUpperCase());
}

/** Deep-merge source into target (both plain objects). */
function deepMerge<T extends Record<string, unknown>>(target: T, source: T): T {
  for (const [key, value] of Object.entries(source)) {
    target[key as keyof T] =
      value !== null && typeof value === 'object' && !Array.isArray(value)
        ? (deepMerge(
            (target[key as keyof T] as Record<string, unknown>) ?? {},
            value as Record<string, unknown>,
          ) as T[keyof T])
        : (value as T[keyof T]);
  }
  return target;
}

function readPackageJson(packageDir: string): PackageJson | undefined {
  try {
    return JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf-8')) as PackageJson;
  } catch {
    return undefined;
  }
}

/** Build a map of workspace package name → absolute directory. */
function loadWorkspacePackages(): Map<string, string> {
  const map = new Map<string, string>();
  let entries;
  try {
    entries = readdirSync(PACKAGES_DIR, { withFileTypes: true });
  } catch {
    return map;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const pkgDir = join(PACKAGES_DIR, entry.name);
    const package_ = readPackageJson(pkgDir);
    if (package_?.name) map.set(package_.name, pkgDir);
  }
  return map;
}

/** Collect workspace-scoped dependency directories transitively for an app. */
function resolveAppPackageDirectories(appPackage: PackageJson, workspacePackages: Map<string, string>): string[] {
  const visited = new Set<string>();
  const queue: string[] = [];

  const addDeps = (package_: PackageJson | undefined) => {
    if (!package_) return;
    for (const deps of [package_.dependencies, package_.devDependencies, package_.peerDependencies]) {
      if (!deps) continue;
      for (const name of Object.keys(deps)) {
        if (name.startsWith(WORKSPACE_SCOPE) && workspacePackages.has(name) && !visited.has(name)) {
          visited.add(name);
          queue.push(name);
        }
      }
    }
  };

  addDeps(appPackage);
  while (queue.length > 0) {
    const name = queue.shift()!;
    const dir = workspacePackages.get(name);
    if (!dir) continue;
    addDeps(readPackageJson(dir));
  }

  return [...visited].map((name) => workspacePackages.get(name)!).filter(Boolean);
}

/** Extract i18n meta from a list of .vue files. */
function extractMetaFromFiles(
  files: string[],
  namespaceForFile: (filePath: string) => string,
): {
  meta: MetaOutput;
  fileCount: number;
  componentCount: number;
  /** Maps each extracted component name to the `mp.<workspace>` namespace that owns it. */
  componentNamespaces: Map<string, string>;
} {
  const meta: MetaOutput = {};
  const componentNamespaces = new Map<string, string>();
  let fileCount = 0;
  let componentCount = 0;

  for (const filePath of files) {
    const source = readFileSync(filePath, 'utf-8');
    const { descriptor } = parseSfc(source, { filename: filePath });

    const i18nBlocks = descriptor.customBlocks.filter((b) => b.type === 'i18n');
    if (i18nBlocks.length === 0) continue;

    const componentName = extractComponentName(source, filePath);
    componentNamespaces.set(componentName, namespaceForFile(filePath));
    const relPath = relative(ROOT, filePath);

    fileCount++;
    let componentAdded = false;

    for (const block of i18nBlocks) {
      const lang = (block.attrs['lang'] as string | undefined) ?? 'json';
      let parsed: Record<string, LocaleMessages>;

      try {
        parsed =
          lang === 'yaml' || lang === 'yml'
            ? (yaml.load(block.content) as Record<string, LocaleMessages>)
            : (JSON.parse(block.content) as Record<string, LocaleMessages>);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`⚠  Could not parse <i18n> block in ${relPath}: ${message}`);
        continue;
      }

      for (const [locale, messages] of Object.entries(parsed)) {
        if (!meta[locale]) meta[locale] = {};
        if (!meta[locale][componentName]) {
          meta[locale][componentName] = {};
          componentAdded = true;
        }
        deepMerge(meta[locale][componentName] as Record<string, unknown>, messages as Record<string, unknown>);
      }
    }

    if (componentAdded) {
      componentCount++;
      console.log(`  ✓  ${relPath}  →  ${componentName}`);
    }
  }

  return { meta, fileCount, componentCount, componentNamespaces };
}

/**
 * Recursively replace leaf string values in `fresh` with the matching leaf
 * values from `existing`, where both share the same key path. Keys present
 * only in `fresh` are kept (newly added); keys present only in `existing`
 * are dropped (removed from source). This guarantees existing translations
 * are never modified by re-running the extractor.
 */
function preserveExistingLeaves(
  fresh: Record<string, unknown>,
  existing: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!existing) return fresh;
  for (const [key, freshValue] of Object.entries(fresh)) {
    const existingValue = existing[key];
    if (
      freshValue !== null &&
      typeof freshValue === 'object' &&
      !Array.isArray(freshValue) &&
      existingValue !== null &&
      typeof existingValue === 'object' &&
      !Array.isArray(existingValue)
    ) {
      preserveExistingLeaves(freshValue as Record<string, unknown>, existingValue as Record<string, unknown>);
    } else if (typeof freshValue === 'string' && typeof existingValue === 'string') {
      fresh[key] = existingValue;
    }
  }
  return fresh;
}

/**
 * Merge non-English translations from the existing `i18n-meta.yaml` back into
 * the freshly extracted meta.
 *
 * SFC `<i18n>` blocks are expected to contain ONLY the English (`en`) source
 * strings — translations into other locales are owned by translation tooling
 * (Crowdin, Lokalise, …) and live exclusively in `i18n-meta.yaml`. This helper
 * ensures that re-running the extractor preserves those translations:
 *
 *   - For every non-English locale present in `existing`, copy each component
 *     entry into `fresh` ONLY if the component also has a fresh English entry
 *     (i.e. it still exists in the codebase). Components that have been
 *     removed from source are dropped, matching the behaviour for English.
 *   - For each preserved component, only keep translation keys that still
 *     exist under the English entry. Stale keys are removed; new English-only
 *     keys remain untranslated until the translation tool fills them in.
 */
function mergeExistingTranslations(fresh: MetaOutput, existing: MetaOutput | undefined): void {
  if (!existing) return;
  const freshEn = fresh['en'] ?? {};
  for (const [locale, components] of Object.entries(existing)) {
    if (locale === 'en') continue;
    for (const [componentName, messages] of Object.entries(components)) {
      const freshEnComponent = freshEn[componentName] as Record<string, unknown> | undefined;
      if (!freshEnComponent) continue;
      if (!fresh[locale]) fresh[locale] = {};
      fresh[locale][componentName] = pruneToShape(
        messages as Record<string, unknown>,
        freshEnComponent,
      ) as LocaleMessages;
    }
  }
}

/**
 * Return a copy of `translated` that only contains keys present in `shape`
 * (the English source). Recurses into nested objects; values whose shape no
 * longer matches the English source are dropped.
 */
function pruneToShape(translated: Record<string, unknown>, shape: Record<string, unknown>): Record<string, unknown> {
  const pruned: Record<string, unknown> = {};
  for (const [key, shapeValue] of Object.entries(shape)) {
    if (!(key in translated)) continue;
    const translatedValue = translated[key];
    pruned[key] =
      shapeValue !== null &&
      typeof shapeValue === 'object' &&
      !Array.isArray(shapeValue) &&
      translatedValue !== null &&
      typeof translatedValue === 'object' &&
      !Array.isArray(translatedValue)
        ? pruneToShape(translatedValue as Record<string, unknown>, shapeValue as Record<string, unknown>)
        : translatedValue;
  }
  return pruned;
}

/** Load existing per-app meta file (if any) so we can preserve translated values. */
function loadExistingMeta(outputPath: string): MetaOutput | undefined {
  try {
    const source = readFileSync(outputPath, 'utf-8');
    const parsed = yaml.load(source);
    if (parsed && typeof parsed === 'object') return parsed as MetaOutput;
  } catch {
    // No existing file (or unreadable) — treat as empty.
  }
  return undefined;
}

function sortMeta(meta: MetaOutput): MetaOutput {
  const sorted: MetaOutput = {};
  for (const locale of Object.keys(meta).sort((a, b) => a.localeCompare(b))) {
    sorted[locale] = {};
    for (const component of Object.keys(meta[locale]).sort((a, b) => a.localeCompare(b))) {
      sorted[locale][component] = meta[locale][component];
    }
  }
  return sorted;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const workspacePackages = loadWorkspacePackages();
// Invert the workspace map so we can resolve a package directory back to its name.
const directoryToPackageName = new Map<string, string>();
for (const [name, dir] of workspacePackages) directoryToPackageName.set(dir, name);

let appEntries;
try {
  statSync(APPS_DIR);
  appEntries = readdirSync(APPS_DIR, { withFileTypes: true });
} catch {
  console.warn(`⚠  No apps/ directory found at ${APPS_DIR}`);
  process.exit(0);
}

for (const entry of appEntries) {
  if (!entry.isDirectory()) continue;
  const appDir = join(APPS_DIR, entry.name);
  const appPackage = readPackageJson(appDir);
  if (!appPackage) continue;

  console.log(`\n▸ ${appPackage.name ?? entry.name}`);

  const packageDirectories = resolveAppPackageDirectories(appPackage, workspacePackages);
  const files = [...collectVueFiles(appDir), ...packageDirectories.flatMap((dir) => collectVueFiles(dir))];

  // Every workspace owns a `mp.<workspace>` namespace: the app's own .vue files
  // resolve to `mp.<app>`, while files contributed by a dependency package
  // resolve to that package's `mp.<package>` namespace.
  const appNamespace = mpNamespace(appPackage.name ?? entry.name);
  const packageNamespaceEntries = packageDirectories.map((dir) => ({
    dir,
    namespace: mpNamespace(directoryToPackageName.get(dir) ?? basename(dir)),
  }));
  // eslint-disable-next-line unicorn/consistent-function-scoping
  const namespaceForFile = (filePath: string): string => {
    for (const { dir, namespace } of packageNamespaceEntries) {
      if (filePath === dir || filePath.startsWith(dir + sep)) return namespace;
    }
    return appNamespace;
  };

  const { meta, fileCount, componentCount, componentNamespaces } = extractMetaFromFiles(files, namespaceForFile);

  const output = join(appDir, 'i18n-meta.yaml');
  const existing = loadExistingMeta(output);

  // Warn about — and ignore — any non-English locales accidentally left in
  // SFC <i18n> blocks. English is the only source-of-truth locale that lives
  // alongside the component; every other locale must be owned by the
  // translation tool via i18n-meta.yaml.
  for (const locale of Object.keys(meta)) {
    if (locale === 'en') continue;
    console.warn(
      `  ⚠  Locale '${locale}' was found inside a <i18n> block. ` +
        'SFC <i18n> blocks must contain only English source strings — ' +
        'translations belong in i18n-meta.yaml (managed by Crowdin/Lokalise/…). ' +
        `Dropping inline '${locale}' messages.`,
    );
    delete meta[locale];
  }

  preserveExistingLeaves(meta as Record<string, unknown>, existing as Record<string, unknown> | undefined);

  // Re-attach all non-English translations from the existing meta so Crowdin-
  // managed translations survive a re-run of the extractor.
  mergeExistingTranslations(meta, existing);

  const sorted = sortMeta(meta);

  const header =
    '# i18n-meta.yaml — auto-generated by scripts/i18n-extract.ts\n' +
    '# Do not edit by hand. Run: pnpm i18n:extract\n' +
    '#\n' +
    `# App: ${appPackage.name ?? entry.name}\n` +
    '# Shape: <locale> → <ComponentName> → <key> → <value>\n' +
    '# Use this file with your translation tool (Lokalise, POEditor, Crowdin, …).\n\n';

  writeFileSync(output, header + yaml.dump(sorted, { indent: 2, lineWidth: 120 }), 'utf-8');

  console.log(`  ✅  Wrote ${componentCount} components (${fileCount} files) → ${relative(ROOT, output)}`);

  // Emit runtime per-locale bundles for every locale present in the meta. The
  // meta is the single source of truth for translations; the files under
  // src/locales/ are derived artefacts (loaded on demand at runtime).
  const localesDir = join(appDir, 'src', 'locales');
  const runtimeHeader =
    '# Auto-generated by scripts/i18n-extract.ts from ../../i18n-meta.yaml\n' +
    '# Do not edit by hand. Edit i18n-meta.yaml and re-run: pnpm i18n:extract\n' +
    '#\n' +
    '# Shape: <mp.namespace> → <key> → <value>. Each package/app owns a\n' +
    '# `mp.<workspace>` namespace; load every namespace into the i18next instance.\n\n';

  for (const locale of Object.keys(sorted)) {
    // Emit every locale (including English): the meta is the single source
    // of truth and runtime bundles — including the eagerly-loaded English
    // global bundle — are derived from it.
    // Group <ComponentName> → <key> by the `mp.<workspace>` namespace that owns
    // the component, then strip the component name (its children are merged),
    // matching the local scope of SFC <i18n> blocks (the en source is also flat).
    const namespaced: Record<string, Record<string, unknown>> = {};
    for (const componentName of Object.keys(sorted[locale])) {
      const namespace = componentNamespaces.get(componentName) ?? appNamespace;
      const target = (namespaced[namespace] ??= {});
      const componentMessages = sorted[locale][componentName] as Record<string, unknown>;
      for (const [key, value] of Object.entries(componentMessages)) {
        if (key in target) {
          console.warn(
            `  ⚠  Key collision while flattening locale '${locale}' namespace ` +
              `'${namespace}': '${key}' from '${componentName}' overrides previous value.`,
          );
        }
        target[key] = value;
      }
    }
    // Sort namespaces for deterministic output.
    const sortedNamespaced: Record<string, Record<string, unknown>> = {};
    for (const namespace of Object.keys(namespaced).sort((a, b) => a.localeCompare(b))) {
      sortedNamespaced[namespace] = namespaced[namespace];
    }
    if (Object.keys(sortedNamespaced).length === 0) continue;
    try {
      mkdirSync(localesDir, { recursive: true });
    } catch {
      // ignore — write will fail with a clearer error if dir cannot be created
    }
    const runtimeOutput = join(localesDir, `${locale}.yaml`);
    writeFileSync(runtimeOutput, runtimeHeader + yaml.dump(sortedNamespaced, { indent: 2, lineWidth: 120 }), 'utf-8');
    console.log(`    ↳  ${locale}  →  ${relative(ROOT, runtimeOutput)}`);
  }
}
