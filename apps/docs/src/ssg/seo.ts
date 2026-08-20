/**
 * Framework-neutral SEO builders for the docs app.
 * Uses `@mission-platform/seo` pure builders (page meta, Open Graph, JSON-LD)
 * so prerendered HTML and the client runtime share one contract.
 */
// Import pure builders only via package subpaths. Avoid the package root entry
// (it also exports the Vue `useSeo` composable) so the docs client stays free of
// Vue / `@unhead/vue` peer dependencies.
import { buildPageMeta } from '@mission-platform/seo/meta';
import {
  breadcrumbList,
  organization,
  organizationId,
  webPage,
  webSite,
  webSiteId,
} from '@mission-platform/seo/json-ld';
import {
  alternatesForSearch,
  alternatesForSlug,
  canonicalForSlug,
  DEFAULT_LOCALE,
  LOCALE_BCP47,
  LOCALE_DIR,
  LOCALE_OG,
  searchCanonical,
  SITE_DESCRIPTION,
  SITE_GENERATOR,
  SITE_NAME,
  SITE_OG_IMAGE,
  SITE_ORIGIN,
  SITE_TITLE,
  THEME_COLOR,
  TITLE_TEMPLATE,
  type DocumentationLocale,
} from './site-constants.ts';

type JsonLd = ReturnType<typeof webSite>;

/** Mirrors `@mission-platform/seo` link/meta descriptors without importing the Vue entry. */
interface SeoMetaTag {
  key: 'name' | 'property' | 'http-equiv';
  attr: string;
  content: string;
}

interface SeoLinkTag {
  rel: string;
  href: string;
  hreflang?: string;
}

export type DocsRouteKind = 'document' | 'search' | 'not-found';

export interface DocsRouteSeoInput {
  kind: DocsRouteKind;
  locale: DocumentationLocale;
  slug?: string;
  title: string;
  description: string;
}

export interface DocsRouteSeo {
  title: string;
  language: string;
  direction: 'ltr' | 'rtl';
  metaTags: SeoMetaTag[];
  linkTags: SeoLinkTag[];
  /** Combined Schema.org `@graph` document ready for a single JSON-LD script. */
  jsonLdGraph: Record<string, unknown>;
}

function siteWideJsonLd(locale: DocumentationLocale): JsonLd[] {
  return [
    webSite({
      name: SITE_NAME,
      url: `${SITE_ORIGIN}/`,
      description: SITE_DESCRIPTION,
      inLanguage: LOCALE_BCP47[locale],
      searchUrlTemplate: `${SITE_ORIGIN}/search?q={search_term_string}`,
    }),
    organization({
      name: 'Mission Platform',
      url: `${SITE_ORIGIN}/`,
      logo: `${SITE_ORIGIN}/icon.svg`,
      description: SITE_DESCRIPTION,
      sameAs: ['https://github.com/Mission-Platform'],
    }),
  ];
}

function pageJsonLd(input: DocsRouteSeoInput & { canonical: string }): JsonLd[] {
  if (input.kind !== 'document') return [];
  return [
    {
      ...webPage({
        name: input.title,
        url: input.canonical,
        description: input.description,
        inLanguage: LOCALE_BCP47[input.locale],
      }),
      isPartOf: { '@id': webSiteId(`${SITE_ORIGIN}/`) },
      about: { '@id': organizationId(`${SITE_ORIGIN}/`) },
    } as JsonLd,
    breadcrumbList({
      items: [
        { name: SITE_NAME, url: `${SITE_ORIGIN}/` },
        { name: input.title, url: input.canonical },
      ],
    }),
  ];
}

function toGraph(nodes: readonly JsonLd[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@graph': nodes.map(({ '@context': _context, ...rest }) => rest),
  };
}

function pushMeta(tags: SeoMetaTag[], key: SeoMetaTag['key'], attr: string, content: string | number | undefined): void {
  if (content === undefined || content === null || content === '') return;
  tags.push({ key, attr, content: String(content) });
}

/** Local Open Graph + Twitter builder (same contract as `@mission-platform/seo` `buildOpenGraph`). */
function buildDocsOpenGraph(input: {
  title: string;
  description: string;
  type: string;
  url: string;
  locale: string;
  localeAlternate: readonly string[];
}): SeoMetaTag[] {
  const tags: SeoMetaTag[] = [];
  pushMeta(tags, 'property', 'og:title', input.title);
  pushMeta(tags, 'property', 'og:description', input.description);
  pushMeta(tags, 'property', 'og:type', input.type);
  pushMeta(tags, 'property', 'og:url', input.url);
  pushMeta(tags, 'property', 'og:site_name', SITE_NAME);
  pushMeta(tags, 'property', 'og:locale', input.locale);
  for (const alternate of input.localeAlternate) {
    pushMeta(tags, 'property', 'og:locale:alternate', alternate);
  }
  pushMeta(tags, 'property', 'og:image', SITE_OG_IMAGE);
  pushMeta(tags, 'property', 'og:image:type', 'image/svg+xml');
  pushMeta(tags, 'property', 'og:image:width', 1200);
  pushMeta(tags, 'property', 'og:image:height', 630);
  pushMeta(tags, 'property', 'og:image:alt', SITE_TITLE);
  pushMeta(tags, 'name', 'twitter:card', 'summary_large_image');
  pushMeta(tags, 'name', 'twitter:title', input.title);
  pushMeta(tags, 'name', 'twitter:description', input.description);
  pushMeta(tags, 'name', 'twitter:image', SITE_OG_IMAGE);
  pushMeta(tags, 'name', 'twitter:image:alt', SITE_TITLE);
  return tags;
}

/** Build the full per-route SEO surface for docs pages. */
export function buildDocsRouteSeo(input: DocsRouteSeoInput): DocsRouteSeo {
  const locale = input.locale;
  const slug = input.slug ?? 'overview';
  const isSearch = input.kind === 'search';
  const isMissing = input.kind === 'not-found';
  const canonical = isSearch ? searchCanonical(locale) : canonicalForSlug(slug, locale);
  const alternates = isSearch ? alternatesForSearch() : isMissing ? undefined : alternatesForSlug(slug);
  const robots = isSearch || isMissing ? 'noindex,follow' : 'index,follow';

  const page = buildPageMeta({
    title: input.title,
    titleTemplate: TITLE_TEMPLATE,
    description: input.description,
    author: SITE_NAME,
    generator: SITE_GENERATOR,
    robots,
    themeColor: THEME_COLOR,
    language: LOCALE_BCP47[locale],
    direction: LOCALE_DIR[locale],
    canonical: isMissing ? undefined : canonical,
    alternates,
    applicationName: SITE_NAME,
  });

  const openGraph = buildDocsOpenGraph({
    title: input.title,
    description: input.description,
    type: isSearch || isMissing ? 'website' : 'article',
    url: canonical,
    locale: LOCALE_OG[locale],
    localeAlternate: Object.values(LOCALE_OG).filter((value) => value !== LOCALE_OG[locale]),
  });

  const jsonLdNodes = [...siteWideJsonLd(locale), ...pageJsonLd({ ...input, canonical })];

  return {
    title: page.title ?? TITLE_TEMPLATE.replace('%s', input.title),
    language: page.language ?? LOCALE_BCP47[locale],
    direction: page.direction ?? LOCALE_DIR[locale],
    metaTags: [...page.metaTags, ...openGraph],
    linkTags: page.linkTags,
    jsonLdGraph: toGraph(jsonLdNodes),
  };
}

function escapeAttribute(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
}

/** Serialize a built SEO model into `<head>` markup for static HTML. */
export function serializeDocsHead(seo: DocsRouteSeo, assetTags = ''): string {
  const meta = seo.metaTags
    .map((tag) => {
      if (tag.key === 'http-equiv') {
        return `<meta http-equiv="${escapeAttribute(tag.attr)}" content="${escapeAttribute(tag.content)}">`;
      }
      return `<meta ${tag.key}="${escapeAttribute(tag.attr)}" content="${escapeAttribute(tag.content)}">`;
    })
    .join('');
  const links = seo.linkTags
    .map((tag) => {
      const hreflang = tag.hreflang ? ` hreflang="${escapeAttribute(tag.hreflang)}"` : '';
      return `<link rel="${escapeAttribute(tag.rel)}" href="${escapeAttribute(tag.href)}"${hreflang}>`;
    })
    .join('');
  const jsonLd = `<script type="application/ld+json">${JSON.stringify(seo.jsonLdGraph)}</script>`;
  return `<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeAttribute(seo.title)}</title>${meta}${links}${jsonLd}${assetTags}`;
}

/** Apply a built SEO model to the live document head (client runtime). */
export function applyDocsRouteSeo(seo: DocsRouteSeo): void {
  if (typeof document === 'undefined') return;

  document.title = seo.title;
  document.documentElement.lang = seo.language;
  document.documentElement.dir = seo.direction;

  const managed = 'data-docs-seo';
  document.head.querySelectorAll(`meta[${managed}], link[${managed}], script[${managed}]`).forEach((element) => {
    element.remove();
  });

  // Keep a single charset/viewport if the host HTML already provided them.
  for (const tag of seo.metaTags) {
    if (tag.attr === 'viewport' || tag.key === 'http-equiv') continue;
    const element = document.createElement('meta');
    if (tag.key === 'property') element.setAttribute('property', tag.attr);
    else element.setAttribute('name', tag.attr);
    element.content = tag.content;
    element.setAttribute(managed, 'true');
    document.head.append(element);
  }

  for (const tag of seo.linkTags) {
    const element = document.createElement('link');
    element.rel = tag.rel;
    element.href = tag.href;
    if (tag.hreflang) element.hreflang = tag.hreflang;
    element.setAttribute(managed, 'true');
    document.head.append(element);
  }

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.setAttribute(managed, 'json-ld');
  script.textContent = JSON.stringify(seo.jsonLdGraph);
  document.head.append(script);
}

export function buildDocumentSeo(options: {
  locale: DocumentationLocale;
  slug: string;
  title: string;
  description: string;
  exists: boolean;
}): DocsRouteSeo {
  return buildDocsRouteSeo({
    kind: options.exists ? 'document' : 'not-found',
    locale: options.locale,
    slug: options.slug,
    title: options.exists ? options.title : 'Page not found',
    description: options.exists ? options.description : `No documentation exists for “${options.slug}”.`,
  });
}

export function buildSearchSeo(locale: DocumentationLocale = DEFAULT_LOCALE): DocsRouteSeo {
  return buildDocsRouteSeo({
    kind: 'search',
    locale,
    title: 'Search',
    description: SITE_DESCRIPTION,
  });
}

