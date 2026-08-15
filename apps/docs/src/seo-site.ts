/**
 * Site-wide SEO constants and helpers shared between `main.ts` (which emits the
 * per-app `WebSite` + `Organization` JSON-LD graph nodes once for the whole
 * site) and the individual route views (which each emit their own per-route
 * `WebPage` node, linked into the site-wide graph via stable `@id` references).
 *
 * Keeping these in a dedicated module avoids duplicating the canonical-URL
 * logic between the entry point, the views, and the build-time Vite config.
 */
import { DEFAULT_SLUG } from './documentation';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type DocumentationLocale } from './i18n';

/** Origin the documentation site is deployed under (no trailing slash). */
export const SITE_ORIGIN = 'https://docs.mission-platform.dev';

export const SITE_NAME = 'Mission Platform Docs';
export const SITE_TITLE = 'Mission Platform Documentation';
export const SITE_DESCRIPTION =
  'Documentation for the Mission Platform — a composable, framework-neutral monorepo of write-once components, design tokens, composables, and Cloudflare Workers for building modern, mission-ready web experiences.';

/** BCP-47 language tag used for `<html lang>` and structured data. */
export const LOCALE_BCP47: Record<DocumentationLocale, string> = {
  en: 'en-AU',
  ar: 'ar',
  de: 'de-DE',
  es: 'es-ES',
  fr: 'fr-FR',
  he: 'he-IL',
  it: 'it-IT',
  ja: 'ja-JP',
  ko: 'ko-KR',
  nl: 'nl-NL',
  zh: 'zh-CN',
};

/** BCP-47 language tag used by the default English site baseline. */
export const SITE_LANGUAGE = LOCALE_BCP47[DEFAULT_LOCALE];

/** Open Graph locale code (`og:locale`). */
export const LOCALE_OG: Record<DocumentationLocale, string> = {
  en: 'en_AU',
  ar: 'ar_AR',
  de: 'de_DE',
  es: 'es_ES',
  fr: 'fr_FR',
  he: 'he_IL',
  it: 'it_IT',
  ja: 'ja_JP',
  ko: 'ko_KR',
  nl: 'nl_NL',
  zh: 'zh_CN',
};

/** Open Graph locale code used by the default English site baseline. */
export const SITE_OG_LOCALE = LOCALE_OG[DEFAULT_LOCALE];

/** Value emitted as the `<meta name="generator">` tag. */
export const SITE_GENERATOR = 'Mission Platform';

/**
 * `<title>` template applied to every page title. The `%s` placeholder is
 * replaced with the per-page title by `@unhead/vue`.
 */
export const TITLE_TEMPLATE = `%s · ${SITE_NAME}`;

/** Absolute URL of the social-share image used for Open Graph / Twitter cards. */
export const SITE_OG_IMAGE = `${SITE_ORIGIN}/og-image.svg`;

/**
 * Build the canonical URL for a documentation slug. The default slug is served
 * at the site root, so it canonicalises to the origin to avoid a duplicate
 * `/overview` + `/` pair being indexed separately.
 */
export function canonicalForSlug(slug: string, locale: DocumentationLocale = DEFAULT_LOCALE): string {
  if (locale === DEFAULT_LOCALE && (slug === DEFAULT_SLUG || slug.length === 0)) return `${SITE_ORIGIN}/`;
  return `${SITE_ORIGIN}/${locale === DEFAULT_LOCALE ? '' : `${locale}/`}${slug}`;
}

/** Build the complete hreflang set for one translated document. */
export function alternatesForSlug(slug: string): Array<{ hreflang: string; href: string }> {
  return [
    ...SUPPORTED_LOCALES.map((locale) => ({ hreflang: LOCALE_BCP47[locale], href: canonicalForSlug(slug, locale) })),
    { hreflang: 'x-default', href: canonicalForSlug(slug, DEFAULT_LOCALE) },
  ];
}

/** Build the locale-aware search URL used by metadata and result links. */
export function searchCanonical(locale: DocumentationLocale): string {
  return `${SITE_ORIGIN}/${locale === DEFAULT_LOCALE ? '' : `${locale}/`}search`;
}

/** Build hreflang links for the locale-aware search landing page. */
export function alternatesForSearch(): Array<{ hreflang: string; href: string }> {
  return [
    ...SUPPORTED_LOCALES.map((locale) => ({ hreflang: LOCALE_BCP47[locale], href: searchCanonical(locale) })),
    { hreflang: 'x-default', href: searchCanonical(DEFAULT_LOCALE) },
  ];
}
