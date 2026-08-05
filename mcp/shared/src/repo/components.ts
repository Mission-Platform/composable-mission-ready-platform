/**
 * Inspects the `@mission-platform/components` library so the MCP server can
 * describe how a component is used: its exported symbols, its props interface,
 * its documentation comment, atomic-design level, and ready-to-paste Vue and
 * React import snippets.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { groupDir } from './paths.ts';

const COMPONENTS_DIR = join(groupDir('packages'), 'components', 'src', 'components');

/** Atomic-design level folders under `src/components/`. */
export const ATOMIC_LEVELS = ['atoms', 'molecules', 'organisms', 'templates', 'pages'] as const;

export type AtomicLevel = (typeof ATOMIC_LEVELS)[number];

export interface ComponentSummary {
  /** Kebab-case folder name, e.g. `base-button`. */
  slug: string;
  /** Exported symbol names taken from the folder's `index.ts`. */
  exports: string[];
  /**
   * Atomic-design level derived from the folder path under
   * `src/components/<level>/` (e.g. `atoms`). `unknown` when the component
   * lives outside the atomic hierarchy.
   */
  level: AtomicLevel | 'unknown';
  /** Path relative to `src/components`, e.g. `atoms/base-button`. */
  relativePath: string;
}

export interface ComponentUsage extends ComponentSummary {
  /** The primary exported component name, e.g. `BaseButton`. */
  componentName: string;
  /** Source of the primary props interface, if it could be located. */
  propsInterface?: string;
  /** The leading JSDoc/TSDoc comment describing the component, if any. */
  docComment?: string;
  /** Names of Storybook story files found in the folder. */
  stories: string[];
  /** Ready-to-use import examples for both frameworks. */
  vueImport: string;
  reactImport: string;
}

function componentsDirExists(): boolean {
  return existsSync(COMPONENTS_DIR) && statSync(COMPONENTS_DIR).isDirectory();
}

function isDirectory(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory();
}

function readComponentFolder(level: AtomicLevel | 'unknown', slug: string, dir: string): ComponentSummary | undefined {
  const indexPath = join(dir, 'index.ts');
  // Accept either a barrel or a primary source file so scaffolds without an
  // index yet (and legacy folders) still surface.
  const hasIndex = existsSync(indexPath);
  const hasSource =
    existsSync(join(dir, `${slug}.tsx`)) ||
    existsSync(join(dir, `${slug}.ts`)) ||
    existsSync(join(dir, `${slug}.vue`));
  if (!hasIndex && !hasSource) {
    return undefined;
  }

  const exports = hasIndex ? extractExports(readFileSync(indexPath, 'utf8')) : [];
  const relativePath = level === 'unknown' ? slug : `${level}/${slug}`;
  return { slug, exports, level, relativePath };
}

/** List every component folder alongside its exported symbols and atomic level. */
export function listComponents(): ComponentSummary[] {
  if (!componentsDirExists()) {
    return [];
  }

  const summaries: ComponentSummary[] = [];
  const seen = new Set<string>();

  for (const level of ATOMIC_LEVELS) {
    const levelDir = join(COMPONENTS_DIR, level);
    if (!isDirectory(levelDir)) {
      continue;
    }
    for (const entry of readdirSync(levelDir)) {
      const dir = join(levelDir, entry);
      if (!isDirectory(dir)) {
        continue;
      }
      const summary = readComponentFolder(level, entry, dir);
      if (!summary) {
        continue;
      }
      seen.add(entry);
      summaries.push(summary);
    }
  }

  // Legacy flat folders directly under `src/components/` (non-atomic).
  for (const entry of readdirSync(COMPONENTS_DIR)) {
    if ((ATOMIC_LEVELS as readonly string[]).includes(entry) || seen.has(entry)) {
      continue;
    }
    const dir = join(COMPONENTS_DIR, entry);
    if (!isDirectory(dir)) {
      continue;
    }
    const summary = readComponentFolder('unknown', entry, dir);
    if (summary) {
      summaries.push(summary);
    }
  }

  return summaries.sort((a, b) => a.slug.localeCompare(b.slug));
}

/** Parse the named exports from an `index.ts` barrel file. */
function extractExports(source: string): string[] {
  const names = new Set<string>();
  const exportBlock = /export\s*(?:type\s*)?\{([^}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = exportBlock.exec(source)) !== null) {
    const body = match[1] ?? '';
    for (const raw of body.split(',')) {
      const token = raw.trim().replace(/^type\s+/, '');
      const name = (token.split(/\s+as\s+/)[1] ?? token).trim();
      if (name) {
        names.add(name);
      }
    }
  }
  return [...names];
}

/** Convert a kebab-case slug (`base-button`) to PascalCase (`BaseButton`). */
function toPascalCase(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/** Extract the props interface source and preceding doc comment, if present. */
function extractPropertiesInterface(source: string): { propsInterface?: string; docComment?: string } {
  const interfaceStart = source.search(/export\s+interface\s+\w*Properties\b/);
  if (interfaceStart === -1) {
    return {};
  }

  // Capture the balanced `{ ... }` body of the interface.
  const braceStart = source.indexOf('{', interfaceStart);
  if (braceStart === -1) {
    return {};
  }
  let depth = 0;
  let end = braceStart;
  for (let index = braceStart; index < source.length; index += 1) {
    const character = source[index];
    if (character === '{') {
      depth += 1;
    } else if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        end = index + 1;
        break;
      }
    }
  }
  const propertiesInterface = source.slice(interfaceStart, end).trim();

  // Grab the doc comment immediately preceding the exported function, if any.
  const functionMatch = /\/\*\*[\s\S]*?\*\/\s*export\s+function\s+\w+/.exec(source);
  const documentComment = functionMatch ? (/\/\*\*[\s\S]*?\*\//.exec(functionMatch[0])?.[0] ?? undefined) : undefined;

  return { propsInterface: propertiesInterface, docComment: documentComment };
}

function resolveComponentDirectory(summary: ComponentSummary): string {
  return join(COMPONENTS_DIR, summary.relativePath);
}

/** Build a full usage description for a single component. */
export function getComponentUsage(nameOrSlug: string): ComponentUsage | undefined {
  const slug = nameOrSlug
    .replaceAll(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replaceAll(/\s+/g, '-')
    .toLowerCase();

  const summary = listComponents().find(
    (candidate) => candidate.slug === slug || candidate.slug === nameOrSlug.toLowerCase(),
  );
  if (!summary) {
    return undefined;
  }

  const dir = resolveComponentDirectory(summary);
  const sourceFile = [`${summary.slug}.tsx`, `${summary.slug}.vue`, `${summary.slug}.ts`]
    .map((file) => join(dir, file))
    .find((file) => existsSync(file));
  const { propsInterface, docComment } = sourceFile ? extractPropertiesInterface(readFileSync(sourceFile, 'utf8')) : {};

  const stories = existsSync(dir) ? readdirSync(dir).filter((file) => file.includes('.stories.')) : [];
  const componentName = summary.exports.find((name) => name.startsWith('Base')) ?? toPascalCase(summary.slug);

  return {
    ...summary,
    componentName,
    propsInterface,
    docComment,
    stories,
    vueImport: `import { ${componentName} } from '@mission-platform/components/vue';`,
    reactImport: `import { ${componentName} } from '@mission-platform/components/react';`,
  };
}
