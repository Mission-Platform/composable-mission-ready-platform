// Loads the canonical Markdown corpus and its translated counterparts from the
// monorepo at build time. The English trees remain the source of truth for the
// slug inventory; incomplete translations fall back to their owning English page.

import { parseDocumentationModulePath, qualifiedSlug, type DocumentationSourceRoot } from './documentation-sources';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type DocumentationLocale } from './i18n';

const rawModules = import.meta.glob(
  [
    '../../../docs/**/*.md',
    '../../../packages/**/docs/**/*.md',
    '../../../configs/**/docs/**/*.md',
    '../../../forge-plugins/**/docs/**/*.md',
    '../../../vite-plugins/**/docs/**/*.md',
    '../../../workers/**/docs/**/*.md',
    '../../../extensions/**/docs/**/*.md',
  ],
  {
    query: '?raw',
    import: 'default',
    eager: true,
  },
) as Record<string, string>;

const packageManifests = import.meta.glob(
  [
    '../../../packages/**/package.json',
    '../../../configs/**/package.json',
    '../../../forge-plugins/**/package.json',
    '../../../vite-plugins/**/package.json',
    '../../../workers/**/package.json',
    '../../../extensions/**/package.json',
  ],
  { eager: true, import: 'default' },
) as Record<string, { readonly name?: string }>;

/** A single documentation page. */
export interface DocumentEntry {
  /** Route-friendly identifier, e.g. `overview` or `packages/barcode/index`. */
  slug: string;
  /** Locale of the Markdown source. */
  locale: DocumentationLocale;
  /** Human-readable title taken from the first `# H1` (or derived from slug). */
  title: string;
  /** Short, plain-text summary derived from the first prose paragraph. */
  description: string;
  /** Raw Markdown source. */
  source: string;
  /** Canonical source root that owns this page. */
  sourceRoot: DocumentationSourceRoot;
  /** Published package name, when this is package-owned documentation. */
  packageName?: string;
}

/** A labelled group of documents rendered together in the sidebar. */
export interface NavGroup {
  key: NavGroupKey;
  label: string;
  items: string[];
  /** Package name shown as the section heading for package-owned pages. */
  packageName?: string;
}

export type NavGroupKey =
  | 'gettingStarted'
  | 'architecture'
  | 'authoring'
  | 'buildTooling'
  | 'quality'
  | 'troubleshooting'
  | 'reference'
  | 'packages'
  | 'additional';

/** Slug served at the site root. */
export const DEFAULT_SLUG = 'overview';

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
 * list markers, HTML comments, and machine-translation provenance disclaimers
 * are skipped so the summary reads naturally.
 */
function extractDescription(markdown: string, fallback: string): string {
  const withoutCode = markdown.replaceAll(/```[\s\S]*?```/g, '').replaceAll(/<!--[\s\S]*?-->/g, '');

  // Pattern to detect machine-translation provenance disclaimers across all supported locales.
  // These are typically short paragraphs mentioning "machine-assisted translation" or equivalent.
  // The pattern matches the opening words and key phrases from the provenance text in each locale.
  const provenancePattern =
    /^(machine-assisted|machine-supported|machine-generated|machine translation|assisted translation|maschinenunterstützte|traducción|traduction|traduzione|תרגום|machineondersteunde|由规范|정식|正規の|ترجمة)/i;

  for (const rawBlock of withoutCode.split(/\n{2,}/)) {
    const block = rawBlock.trim();
    if (block.length === 0) continue;
    // Skip headings, blockquotes, tables, and list-only blocks.
    if (/^(#{1,6}\s|>|\||[-*+]\s|\d+\.\s)/.test(block)) continue;
    // Skip machine-translation provenance disclaimers.
    if (provenancePattern.test(block)) continue;

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

function buildManifest(): Record<DocumentationLocale, Record<string, DocumentEntry>> {
  const manifest = Object.fromEntries(SUPPORTED_LOCALES.map((locale) => [locale, {}])) as Record<
    DocumentationLocale,
    Record<string, DocumentEntry>
  >;

  for (const [modulePath, source] of Object.entries(rawModules)) {
    const packagePrefix = modulePath.match(/^(.*)\/docs\//u)?.[1];
    const packageManifest = packagePrefix === undefined ? undefined : packageManifests[`${packagePrefix}/package.json`];
    const parsed = parseDocumentationModulePath(modulePath, packageManifest?.name);
    if (parsed === undefined) continue;
    const { locale, sourceRoot } = parsed;
    const slug = qualifiedSlug(sourceRoot, parsed.documentPath);
    if (manifest[locale][slug] !== undefined) {
      throw new Error(`Duplicate documentation slug ${slug} for locale ${locale}.`);
    }
    manifest[locale][slug] = {
      slug,
      locale,
      source,
      title: extractTitle(source, titleFromSlug(slug)),
      description: extractDescription(source, DEFAULT_DESCRIPTION),
      sourceRoot,
      ...(sourceRoot.packageName === undefined ? {} : { packageName: sourceRoot.packageName }),
    };
  }

  const englishSlugs = new Set(Object.keys(manifest[DEFAULT_LOCALE]));
  if (englishSlugs.size === 0) throw new Error('The English documentation manifest is empty.');

  for (const locale of SUPPORTED_LOCALES) {
    if (locale === DEFAULT_LOCALE) continue;
    for (const slug of englishSlugs) {
      // Package translations are allowed to land independently. Until a
      // translation exists, serve the canonical English source at the stable
      // locale route so navigation, search, and SSG inventories stay complete.
      if (manifest[locale][slug] === undefined) {
        const english = manifest[DEFAULT_LOCALE][slug];
        manifest[locale][slug] = { ...english, locale };
      }
    }
  }

  return manifest;
}

/** Every document keyed first by locale and then by slug. */
export const documentsByLocale = buildManifest();

/** English documents keyed by slug, retained for existing callers. */
export const documents = documentsByLocale[DEFAULT_LOCALE];

/** Canonical roots represented by the runtime Markdown manifest. */
export const documentationSourceRoots: readonly DocumentationSourceRoot[] = [
  ...new Map(Object.values(documents).map((entry) => [entry.sourceRoot.routePrefix, entry.sourceRoot])).values(),
];

/** Return the complete document set for a locale. */
export function getDocuments(locale: DocumentationLocale = DEFAULT_LOCALE): Record<string, DocumentEntry> {
  return documentsByLocale[locale];
}

/** Look up a document by slug. */
export function getDocument(slug: string, locale: DocumentationLocale = DEFAULT_LOCALE): DocumentEntry | undefined {
  return documentsByLocale[locale][slug];
}

/** Return the canonical owner of a document slug, independent of locale. */
export function sourceRootForSlug(slug: string): DocumentationSourceRoot | undefined {
  return documents[slug]?.sourceRoot;
}

/** Title for a slug, falling back to a slug-derived label when unknown. */
export function titleForSlug(slug: string, locale: DocumentationLocale = DEFAULT_LOCALE): string {
  return documentsByLocale[locale][slug]?.title ?? titleFromSlug(slug);
}

/** Meta description for a slug, falling back to a generic site description. */
export function descriptionForSlug(slug: string, locale: DocumentationLocale = DEFAULT_LOCALE): string {
  return documentsByLocale[locale][slug]?.description ?? DEFAULT_DESCRIPTION;
}

/** Build the locale-aware route for a document. English keeps its old URL shape. */
export function documentPath(slug: string, locale: DocumentationLocale = DEFAULT_LOCALE): string {
  return locale === DEFAULT_LOCALE ? `/${slug}` : `/${locale}/${slug}`;
}

// Curated ordering of the sidebar. Mirrors the structure documented in the
// repository `DOCUMENTATION.md`. Any document not listed here is appended under
// an "Additional" group so nothing is silently hidden.
const CURATED_GROUPS: NavGroup[] = [
  { key: 'gettingStarted', label: 'Getting Started', items: ['overview', 'development-setup', 'workspace-structure'] },
  { key: 'architecture', label: 'Architecture', items: ['architecture', 'forge-compiler', 'atomic-component-design'] },
  {
    key: 'authoring',
    label: 'Authoring',
    items: ['package-development', 'composable-authoring', 'store-authoring', 'util-authoring'],
  },
  {
    key: 'buildTooling',
    label: 'Build & Tooling',
    items: [
      'build-system',
      'configs/index',
      'configs/eslint-config',
      'configs/scripts-config',
      'configs/workers-config',
    ],
  },
  { key: 'quality', label: 'Quality', items: ['testing', 'best-practices', 'framework-best-practices'] },
  { key: 'troubleshooting', label: 'Troubleshooting', items: ['troubleshooting', 'circular-dependencies'] },
  {
    key: 'reference',
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
    return { ...group, items };
  }).filter((group) => group.items.length > 0);

  const packageGroups = new Map<string, { packageName?: string; items: string[] }>();
  for (const entry of Object.values(documents)) {
    if (entry.sourceRoot.kind !== 'package') continue;
    const key = entry.sourceRoot.routePrefix;
    const group = packageGroups.get(key) ?? { packageName: entry.packageName, items: [] };
    group.items.push(entry.slug);
    packageGroups.set(key, group);
  }
  const packageSlugs = new Set([...packageGroups.values()].flatMap((group) => group.items));
  for (const [routePrefix, packageGroup] of [...packageGroups.entries()].toSorted(([left], [right]) =>
    left.localeCompare(right),
  )) {
    groups.push({
      key: 'packages',
      label: packageGroup.packageName ?? routePrefix,
      packageName: packageGroup.packageName,
      items: packageGroup.items.toSorted(),
    });
  }

  const leftovers = Object.keys(documents)
    .filter((slug) => !packageSlugs.has(slug))
    .filter((slug) => !seen.has(slug))
    .toSorted();
  if (leftovers.length > 0) {
    groups.push({ key: 'additional', label: 'Additional', items: leftovers });
  }

  return groups;
}

/** Ordered, grouped navigation for the sidebar. */
export const navGroups: NavGroup[] = buildNavGroups();
