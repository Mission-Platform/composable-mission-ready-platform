/**
 * Node- and browser-safe site constants for docs prerender + runtime SEO.
 * Kept free of Vite-only APIs (`import.meta.glob`) so the prerender script can
 * import these modules under plain Node (`--experimental-strip-types`).
 */

export const SITE_ORIGIN = 'https://docs.mission-platform.dev';
export const DEFAULT_SLUG = 'overview';
export const SITE_NAME = 'Mission Platform Docs';
export const SITE_TITLE = 'Mission Platform Documentation';
export const SITE_DESCRIPTION =
  'Documentation for the Mission Platform — a composable, framework-neutral monorepo of write-once components, design tokens, composables, and Cloudflare Workers for building modern, mission-ready web experiences.';
export const SITE_GENERATOR = 'Mission Platform';
export const TITLE_TEMPLATE = `%s · ${SITE_NAME}`;
export const SITE_OG_IMAGE = `${SITE_ORIGIN}/og-image.svg`;
export const THEME_COLOR = '#4a9ebe';

export const SUPPORTED_LOCALES = ['en', 'ar', 'de', 'es', 'fr', 'he', 'it', 'ja', 'ko', 'nl', 'zh'] as const;
export type DocumentationLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: DocumentationLocale = 'en';

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

export const LOCALE_DIR: Record<DocumentationLocale, 'ltr' | 'rtl'> = {
  en: 'ltr',
  ar: 'rtl',
  de: 'ltr',
  es: 'ltr',
  fr: 'ltr',
  he: 'rtl',
  it: 'ltr',
  ja: 'ltr',
  ko: 'ltr',
  nl: 'ltr',
  zh: 'ltr',
};

export function resolveDocumentationLocale(value: unknown): DocumentationLocale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value)
    ? (value as DocumentationLocale)
    : DEFAULT_LOCALE;
}

export function canonicalForSlug(slug: string, locale: DocumentationLocale = DEFAULT_LOCALE): string {
  if (locale === DEFAULT_LOCALE && (slug === DEFAULT_SLUG || slug.length === 0)) return `${SITE_ORIGIN}/`;
  return `${SITE_ORIGIN}/${locale === DEFAULT_LOCALE ? '' : `${locale}/`}${slug}`;
}

export function alternatesForSlug(slug: string): Array<{ hreflang: string; href: string }> {
  return [
    ...SUPPORTED_LOCALES.map((locale) => ({ hreflang: LOCALE_BCP47[locale], href: canonicalForSlug(slug, locale) })),
    { hreflang: 'x-default', href: canonicalForSlug(slug, DEFAULT_LOCALE) },
  ];
}

export function searchCanonical(locale: DocumentationLocale): string {
  return `${SITE_ORIGIN}/${locale === DEFAULT_LOCALE ? '' : `${locale}/`}search`;
}

export function alternatesForSearch(): Array<{ hreflang: string; href: string }> {
  return [
    ...SUPPORTED_LOCALES.map((locale) => ({ hreflang: LOCALE_BCP47[locale], href: searchCanonical(locale) })),
    { hreflang: 'x-default', href: searchCanonical(DEFAULT_LOCALE) },
  ];
}

export function documentPath(slug: string, locale: DocumentationLocale = DEFAULT_LOCALE): string {
  return locale === DEFAULT_LOCALE ? `/${slug}` : `/${locale}/${slug}`;
}
