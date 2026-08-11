// Loads every Markdown document from the monorepo `docs/` directory at build
// time (via Vite's glob import) so this site always mirrors the canonical
// documentation without a copy step. Each entry exposes its slug, derived
// title, and raw Markdown source.

const rawModules = import.meta.glob('../../../docs/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const DOCS_PREFIX = '../../../docs/';

/** A single documentation page. */
export interface DocumentEntry {
  /** Route-friendly identifier, e.g. `overview` or `configs/eslint-config`. */
  slug: string;
  /** Human-readable title taken from the first `# H1` (or derived from slug). */
  title: string;
  /** Short, plain-text summary derived from the first prose paragraph. */
  description: string;
  /** Raw Markdown source. */
  source: string;
}

/** A labelled group of documents rendered together in the sidebar. */
export interface NavGroup {
  label: string;
  items: string[];
}

/** Slug served at the site root. */
export const DEFAULT_SLUG = 'overview';

function toSlug(modulePath: string): string {
  return modulePath.slice(DOCS_PREFIX.length).replace(/\.md$/, '');
}

function titleFromSlug(slug: string): string {
  const last = slug.split('/').pop() ?? slug;
  return last.replaceAll('-', ' ').replaceAll(/\b\w/g, (char) => char.toUpperCase());
}

function extractTitle(markdown: string, fallback: string): string {
  const match = markdown.match(/^#\s+(.+?)\s*$/m);
  return match ? match[1].trim() : fallback;
}

/** Fallback description used when a document has no usable prose paragraph. */
const DEFAULT_DESCRIPTION = 'Documentation for the Mission Platform — a composable, mission-ready monorepo.';

/** Maximum length of a generated meta description before it is truncated. */
const DESCRIPTION_MAX_LENGTH = 160;

/**
 * Derive a plain-text meta description from a Markdown document: the first
 * real prose paragraph, stripped of Markdown syntax and clamped to a
 * search-engine-friendly length. Headings, fenced code blocks, blockquotes,
 * list markers, and HTML comments are skipped so the summary reads naturally.
 */
function extractDescription(markdown: string, fallback: string): string {
  const withoutCode = markdown.replaceAll(/```[\s\S]*?```/g, '').replaceAll(/<!--[\s\S]*?-->/g, '');

  for (const rawBlock of withoutCode.split(/\n{2,}/)) {
    const block = rawBlock.trim();
    if (block.length === 0) continue;
    // Skip headings, blockquotes, tables, and list-only blocks.
    if (/^(#{1,6}\s|>|\||[-*+]\s|\d+\.\s)/.test(block)) continue;

    const text = block
      .replaceAll(/\r?\n/g, ' ')
      // Images → alt text; links → link text.
      .replaceAll(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replaceAll(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      // Inline emphasis / code markers.
      .replaceAll(/[*_`]+/g, '')
      .replaceAll(/\s+/g, ' ')
      .trim();

    if (text.length === 0) continue;
    if (text.length <= DESCRIPTION_MAX_LENGTH) return text;
    return `${text.slice(0, DESCRIPTION_MAX_LENGTH - 1).trimEnd()}…`;
  }

  return fallback;
}

/** Every document keyed by slug. */
export const documents: Record<string, DocumentEntry> = Object.fromEntries(
  Object.entries(rawModules).map(([modulePath, source]) => {
    const slug = toSlug(modulePath);
    return [
      slug,
      {
        slug,
        source,
        title: extractTitle(source, titleFromSlug(slug)),
        description: extractDescription(source, DEFAULT_DESCRIPTION),
      },
    ];
  }),
);

/** Look up a document by slug. */
export function getDocument(slug: string): DocumentEntry | undefined {
  return documents[slug];
}

/** Title for a slug, falling back to a slug-derived label when unknown. */
export function titleForSlug(slug: string): string {
  return documents[slug]?.title ?? titleFromSlug(slug);
}

/** Meta description for a slug, falling back to a generic site description. */
export function descriptionForSlug(slug: string): string {
  return documents[slug]?.description ?? DEFAULT_DESCRIPTION;
}

// Curated ordering of the sidebar. Mirrors the structure documented in the
// repository `DOCUMENTATION.md`. Any document not listed here is appended under
// an "Additional" group so nothing is silently hidden.
const CURATED_GROUPS: NavGroup[] = [
  { label: 'Getting Started', items: ['overview', 'development-setup', 'workspace-structure'] },
  { label: 'Architecture', items: ['architecture', 'forge-compiler', 'atomic-component-design'] },
  {
    label: 'Authoring',
    items: ['package-development', 'composable-authoring', 'store-authoring', 'util-authoring'],
  },
  {
    label: 'Build & Tooling',
    items: [
      'build-system',
      'configs/index',
      'configs/eslint-config',
      'configs/scripts-config',
      'configs/workers-config',
    ],
  },
  { label: 'Quality', items: ['testing', 'best-practices', 'framework-best-practices'] },
  { label: 'Troubleshooting', items: ['troubleshooting', 'circular-dependencies'] },
  {
    label: 'Reference',
    items: ['api-reference', 'external-consumer-setup', 'migration-guides/vue2-to-vue3'],
  },
];

function buildNavGroups(): NavGroup[] {
  const seen = new Set<string>();
  const groups: NavGroup[] = CURATED_GROUPS.map((group) => {
    const items = group.items.filter((slug) => {
      if (!documents[slug]) return false;
      seen.add(slug);
      return true;
    });
    return { label: group.label, items };
  }).filter((group) => group.items.length > 0);

  const leftovers = Object.keys(documents)
    .filter((slug) => !seen.has(slug))
    .toSorted();
  if (leftovers.length > 0) {
    groups.push({ label: 'Additional', items: leftovers });
  }

  return groups;
}

/** Ordered, grouped navigation for the sidebar. */
export const navGroups: NavGroup[] = buildNavGroups();
