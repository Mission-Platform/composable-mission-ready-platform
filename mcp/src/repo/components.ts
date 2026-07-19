/**
 * Inspects the `@mission-platform/components` library so the MCP server can
 * describe how a component is used: its exported symbols, its props interface,
 * its documentation comment, and ready-to-paste Vue and React import snippets.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { groupDir } from './paths.ts';

const COMPONENTS_DIR = join(groupDir('packages'), 'components', 'src', 'components');

export interface ComponentSummary {
  /** Kebab-case folder name, e.g. `base-button`. */
  slug: string;
  /** Exported symbol names taken from the folder's `index.ts`. */
  exports: string[];
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

/** List every component folder alongside its exported symbols. */
export function listComponents(): ComponentSummary[] {
  if (!componentsDirExists()) {
    return [];
  }
  const summaries: ComponentSummary[] = [];
  for (const entry of readdirSync(COMPONENTS_DIR)) {
    const dir = join(COMPONENTS_DIR, entry);
    if (!statSync(dir).isDirectory()) {
      continue;
    }
    const indexPath = join(dir, 'index.ts');
    if (!existsSync(indexPath)) {
      continue;
    }
    summaries.push({ slug: entry, exports: extractExports(readFileSync(indexPath, 'utf8')) });
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
function extractPropsInterface(source: string): { propsInterface?: string; docComment?: string } {
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
  const propsInterface = source.slice(interfaceStart, end).trim();

  // Grab the doc comment immediately preceding the exported function, if any.
  const functionMatch = /\/\*\*[\s\S]*?\*\/\s*export\s+function\s+\w+/.exec(source);
  const docComment = functionMatch ? (/\/\*\*[\s\S]*?\*\//.exec(functionMatch[0])?.[0] ?? undefined) : undefined;

  return { propsInterface, docComment };
}

/** Build a full usage description for a single component. */
export function getComponentUsage(nameOrSlug: string): ComponentUsage | undefined {
  const slug = nameOrSlug
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase();

  const summary = listComponents().find(
    (candidate) => candidate.slug === slug || candidate.slug === nameOrSlug.toLowerCase(),
  );
  if (!summary) {
    return undefined;
  }

  const dir = join(COMPONENTS_DIR, summary.slug);
  const sourceFile = [`${summary.slug}.tsx`, `${summary.slug}.vue`]
    .map((file) => join(dir, file))
    .find((file) => existsSync(file));
  const { propsInterface, docComment } = sourceFile ? extractPropsInterface(readFileSync(sourceFile, 'utf8')) : {};

  const stories = readdirSync(dir).filter((file) => file.includes('.stories.'));
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
