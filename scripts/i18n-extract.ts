/**
 * i18n-extract — SFC locale block extractor
 *
 * Scans every .vue file under packages/ and apps/, extracts <i18n> blocks,
 * and writes a single i18n-meta.yaml at the workspace root.
 *
 * Output shape:
 *   en:
 *     BaseButton:
 *       loading: Loading…
 *   fr:
 *     BaseButton:
 *       loading: Chargement…
 *
 * Usage:
 *   node --experimental-strip-types scripts/i18n-extract.ts
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse as parseSfc } from '@vue/compiler-sfc';
import yaml from 'js-yaml';

// ─── Types ────────────────────────────────────────────────────────────────────

type LocaleMessages = Record<string, string | LocaleMessages>;
type ComponentMessages = Record<string, LocaleMessages>;
type MetaOutput = Record<string, ComponentMessages>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
const SCAN_DIRS = ['packages', 'apps'];
const SKIP_DIRS = new Set(['node_modules', 'dist', '.storybook', 'storybook-static', 'public']);
const OUTPUT = join(ROOT, 'i18n-meta.yaml');

/** Recursively collect all .vue files under a directory. */
function collectVueFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
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

/**
 * Derive a component name from the SFC source.
 * Priority:
 *   1. defineOptions({ name: '…' })
 *   2. defineComponent({ name: '…' })
 *   3. PascalCase of the filename stem
 */
function extractComponentName(sfcSource: string, filePath: string): string {
  const nameMatch =
    sfcSource.match(/defineOptions\s*\(\s*\{[^}]*name:\s*['"]([^'"]+)['"]/s) ??
    sfcSource.match(/defineComponent\s*\(\s*\{[^}]*name:\s*['"]([^'"]+)['"]/s);

  if (nameMatch) return nameMatch[1];

  const stem = basename(filePath, '.vue');
  return stem.replace(/(^|[-_])(\w)/g, (_, __, c: string) => c.toUpperCase());
}

/** Deep-merge source into target (both plain objects). */
function deepMerge<T extends Record<string, unknown>>(target: T, source: T): T {
  for (const [key, value] of Object.entries(source)) {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      target[key as keyof T] = deepMerge(
        (target[key as keyof T] as Record<string, unknown>) ?? {},
        value as Record<string, unknown>,
      ) as T[keyof T];
    } else {
      target[key as keyof T] = value as T[keyof T];
    }
  }
  return target;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const meta: MetaOutput = {};
let totalFiles = 0;
let totalComponents = 0;

for (const scanDir of SCAN_DIRS) {
  const absDir = join(ROOT, scanDir);
  let files: string[];
  try {
    statSync(absDir);
    files = collectVueFiles(absDir);
  } catch {
    continue;
  }

  for (const filePath of files) {
    const source = readFileSync(filePath, 'utf-8');
    const { descriptor } = parseSfc(source, { filename: filePath });

    const i18nBlocks = descriptor.customBlocks.filter((b) => b.type === 'i18n');
    if (i18nBlocks.length === 0) continue;

    const componentName = extractComponentName(source, filePath);
    const relPath = relative(ROOT, filePath);

    totalFiles++;
    let componentAdded = false;

    for (const block of i18nBlocks) {
      const lang = (block.attrs['lang'] as string | undefined) ?? 'json';
      let parsed: Record<string, LocaleMessages>;

      try {
        if (lang === 'yaml' || lang === 'yml') {
          parsed = yaml.load(block.content) as Record<string, LocaleMessages>;
        } else {
          parsed = JSON.parse(block.content) as Record<string, LocaleMessages>;
        }
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
      totalComponents++;
      console.log(`  ✓  ${relPath}  →  ${componentName}`);
    }
  }
}

// Sort locales alphabetically; within each locale sort component names.
const sorted: MetaOutput = {};
for (const locale of Object.keys(meta).sort()) {
  sorted[locale] = {};
  for (const component of Object.keys(meta[locale]).sort()) {
    sorted[locale][component] = meta[locale][component];
  }
}

const header =
  '# i18n-meta.yaml — auto-generated by scripts/i18n-extract.ts\n' +
  '# Do not edit by hand. Run: pnpm i18n:extract\n' +
  '#\n' +
  '# Shape: <locale> → <ComponentName> → <key> → <value>\n' +
  '# Use this file with your translation tool (Lokalise, POEditor, Crowdin, …).\n\n';

writeFileSync(OUTPUT, header + yaml.dump(sorted, { indent: 2, lineWidth: 120 }), 'utf-8');

console.log(`\n✅  Wrote ${totalComponents} components (${totalFiles} files) → i18n-meta.yaml`);
