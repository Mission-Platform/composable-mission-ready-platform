/**
 * Site-wide SEO constants and helpers shared between `main.ts` (which emits
 * the per-app `WebSite` + `Organization` JSON-LD graph nodes once for the
 * whole site) and individual route views (which each emit their own
 * per-route `WebPage` node, linked into the site-wide graph via stable
 * `@id` references).
 *
 * Keeping these in a dedicated module avoids duplicating the locale tables
 * and canonical-URL logic between the entry point and the views.
 */
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type SupportedLocale } from './router';

export const SITE_ORIGIN = 'https://mission-platform.dev';

export const SITE_NAME = 'Mission Platform';
export const SITE_TITLE = 'Mission Platform — Composable. Mission Ready.';
export const SITE_DESCRIPTION =
  'A composable monorepo of design tokens, components, composables, WebAssembly modules, and Cloudflare Workers — authored once in the framework-agnostic Forge runtime and built for Vue, React, Svelte, Solid, and Web Components.';

/** Value emitted as the `<meta name="generator">` tag. */
export const SITE_GENERATOR = 'Mission Platform';

/** Map of locale → BCP-47 tag used for `<html lang>` and `hreflang`. */
export const LOCALE_BCP47: Record<SupportedLocale, string> = {
  en: 'en-AU',
  es: 'es-ES',
  fr: 'fr-FR',
  nl: 'nl-NL',
  it: 'it-IT',
  de: 'de-DE',
  ko: 'ko-KR',
  ja: 'ja-JP',
  zh: 'zh-CN',
  ar: 'ar',
  he: 'he-IL',
};

/** Map of locale → Open Graph locale code (`og:locale`). */
export const LOCALE_OG: Record<SupportedLocale, string> = {
  en: 'en_AU',
  es: 'es_ES',
  fr: 'fr_FR',
  nl: 'nl_NL',
  it: 'it_IT',
  de: 'de_DE',
  ko: 'ko_KR',
  ja: 'ja_JP',
  zh: 'zh_CN',
  ar: 'ar_AR',
  he: 'he_IL',
};

/** Map of locale → writing direction. */
export const LOCALE_DIR: Record<SupportedLocale, 'ltr' | 'rtl'> = {
  en: 'ltr',
  es: 'ltr',
  fr: 'ltr',
  nl: 'ltr',
  it: 'ltr',
  de: 'ltr',
  ko: 'ltr',
  ja: 'ltr',
  zh: 'ltr',
  ar: 'rtl',
  he: 'rtl',
};

/** Resolve a path segment (or undefined) into a supported locale code. */
export function resolveLocale(parameter: unknown): SupportedLocale {
  return typeof parameter === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(parameter)
    ? (parameter as SupportedLocale)
    : DEFAULT_LOCALE;
}

/** Build the canonical URL for a given locale. */
export function canonicalFor(locale: SupportedLocale): string {
  return locale === DEFAULT_LOCALE ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}/${locale}/`;
}
