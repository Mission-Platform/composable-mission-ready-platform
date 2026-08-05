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

/** Origin the documentation site is deployed under (no trailing slash). */
export const SITE_ORIGIN = 'https://docs.mission-platform.dev';

export const SITE_NAME = 'Mission Platform Docs';
export const SITE_TITLE = 'Mission Platform Documentation';
export const SITE_DESCRIPTION =
  'Documentation for the Mission Platform — a composable, framework-neutral monorepo of write-once components, design tokens, composables, and Cloudflare Workers for building modern, mission-ready web experiences.';

/** BCP-47 language tag used for `<html lang>` and structured data. */
export const SITE_LANGUAGE = 'en-AU';

/** Open Graph locale code (`og:locale`). */
export const SITE_OG_LOCALE = 'en_AU';

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
export function canonicalForSlug(slug: string): string {
  if (slug === DEFAULT_SLUG || slug.length === 0) return `${SITE_ORIGIN}/`;
  return `${SITE_ORIGIN}/${slug}`;
}
