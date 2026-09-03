/**
 * Per-app SEO constants for My Care Notes, shared between `main.ts` (which
 * emits the per-app `WebSite` + `Organization` JSON-LD graph nodes once) and
 * route views (which each emit their own per-route `WebPage` node, linked
 * into the site-wide graph via stable `@id` references).
 */
export const APP_ORIGIN = 'https://care-notes.mission-platform.com/';
export const APP_TITLE = 'My Care Notes';
export const APP_DESCRIPTION =
  'A privacy-first, offline-capable note-taking app with built-in spell and grammar checking, powered by the Mission Platform.';
export const APP_LOCALE_BCP47 = 'en-AU';
export const APP_LOCALE_OG = 'en_AU';

export const PUBLISHER_NAME = 'Mission Platform';
export const PUBLISHER_URL = 'https://mission-platform.com/';
export const PUBLISHER_LOGO = 'https://mission-platform.com/icon.svg';
