import { readdirSync } from 'node:fs';
import path from 'node:path';

import type { SitemapUrl } from '@mission-platform/seo';

export const SITE_ORIGIN = 'https://docs.mission-platform.dev';
export const DEFAULT_SLUG = 'overview';
export const SUPPORTED_LOCALES = ['en', 'ar', 'de', 'es', 'fr', 'he', 'it', 'ja', 'ko', 'nl', 'zh'] as const;

/** All documentation slugs, excluding translated source trees. */
export function collectDocumentSlugs(documentsDirectory: string): string[] {
  const entries = readdirSync(documentsDirectory, { recursive: true, withFileTypes: true });
  return entries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith('.md') &&
        !path.join(entry.parentPath, entry.name).includes(`${path.sep}locales${path.sep}`),
    )
    .map((entry) => {
      const relative = path.relative(documentsDirectory, path.join(entry.parentPath, entry.name));
      return relative.replace(/\.md$/, '').split(path.sep).join('/');
    })
    .toSorted();
}

export function canonicalForSlug(slug: string, locale: string = 'en'): string {
  if (locale === 'en' && slug === DEFAULT_SLUG) return `${SITE_ORIGIN}/`;
  return `${SITE_ORIGIN}/${locale === 'en' ? '' : `${locale}/`}${slug}`;
}

export function alternatesForSlug(slug: string): Array<{ hreflang: string; href: string }> {
  return SUPPORTED_LOCALES.map((locale) => ({
    hreflang: locale,
    href: canonicalForSlug(slug, locale),
  }));
}

export function buildIncludedRoutes(documentSlugs: readonly string[]): string[] {
  return [
    '/',
    ...documentSlugs.map((slug) => `/${slug}`),
    ...SUPPORTED_LOCALES.filter((locale) => locale !== 'en').flatMap((locale) =>
      documentSlugs.map((slug) => `/${locale}/${slug}`),
    ),
  ];
}

export function buildSitemapUrls(documentSlugs: readonly string[]): SitemapUrl[] {
  return SUPPORTED_LOCALES.flatMap((locale) =>
    documentSlugs.map((slug) => ({
      loc: canonicalForSlug(slug, locale),
      changefreq: 'weekly' as const,
      priority: slug === DEFAULT_SLUG ? 1 : 0.8,
      alternates: alternatesForSlug(slug),
    })),
  );
}