import '@mission-platform/tokens/scss/tokens';
import '@mission-platform/tokens/scss/themes/light';
import '@mission-platform/tokens/scss/themes/dark';
import '@mission-platform/components/styles';

import { createMpI18n } from '@mission-platform/i18n';
import { useOpenGraph } from '@mission-platform/open-graph';
import { usePageMeta } from '@mission-platform/page-meta';
import { ViteSSG } from 'vite-ssg';
import { computed, effectScope, h } from 'vue';
import { RouterView } from 'vue-router';

import enMessages from './locales/en.yaml';
import { loadLocaleMessages } from './locales/load-locale';
import { DEFAULT_LOCALE, routerOptions, SUPPORTED_LOCALES, type SupportedLocale } from './router';

import './styles/global.scss';

const SITE_ORIGIN = 'https://mission-platform.dev';

/** Map of locale → BCP-47 tag used for `<html lang>` and `hreflang`. */
const LOCALE_BCP47: Record<SupportedLocale, string> = {
  en: 'en-AU',
  es: 'es-ES',
  fr: 'fr-FR',
  nl: 'nl-NL',
};

/** Map of locale → Open Graph locale code (`og:locale`). */
const LOCALE_OG: Record<SupportedLocale, string> = {
  en: 'en_AU',
  es: 'es_ES',
  fr: 'fr_FR',
  nl: 'nl_NL',
};

/** Resolve a path segment (or undefined) into a supported locale code. */
function resolveLocale(parameter: unknown): SupportedLocale {
  return typeof parameter === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(parameter)
    ? (parameter as SupportedLocale)
    : DEFAULT_LOCALE;
}

/** Build the canonical URL for a given locale. */
function canonicalFor(locale: SupportedLocale): string {
  return locale === DEFAULT_LOCALE ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}/${locale}/`;
}

/** Root render function — keeps `useHead`-bearing setup in a stable scope. */
const renderRoot = (): unknown => h(RouterView);

/**
 * Application entry — exported in the shape `vite-ssg` expects so the same
 * module powers both the SPA client and the static-site generator. During
 * `vite-ssg build` this function runs once per prerendered route in a JSDOM
 * environment; in the browser it runs once on hydration.
 */
export const createApp = ViteSSG(
  // Root component — just the active route's view.
  { setup: () => renderRoot },
  routerOptions,
  ({ app, router, isClient, initialState: _initialState }) => {
    // Restore persisted theme (client only, before mount, to avoid a flash
    // of the wrong colour scheme). Skipped during SSG.
    if (isClient) {
      try {
        const stored = localStorage.getItem('mp-theme');
        if (stored === 'light' || stored === 'dark') {
          document.documentElement.dataset.theme = stored;
        } else if (stored === 'auto') {
          delete document.documentElement.dataset.theme;
        }
      } catch {
        // Ignore (private mode etc.)
      }
    }

    // Seed English (source-of-truth) messages on the global scope at creation
    // time so `<i18n-t scope="global">` and `useI18n({ useScope: 'global' })`
    // resolve them on first paint.
    const i18n = createMpI18n({
      locale: DEFAULT_LOCALE,
      messages: { en: enMessages as Record<string, string> },
    });
    app.use(i18n);

    // Synchronise the active route's `:locale` segment with vue-i18n's
    // active locale on every navigation (both client and server side).
    router.beforeEach(async (to) => {
      const locale = resolveLocale(to.params.locale);
      await loadLocaleMessages(i18n, locale);
      if (i18n.global.locale.value !== locale) {
        i18n.global.locale.value = locale;
      }
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('lang', LOCALE_BCP47[locale]);
      }
    });

    // Inject standard page metadata and Open Graph / Twitter metadata into
    // <head>. The composables react to the active route, so prerendered HTML
    // for each locale ends up with locale-correct canonical, og:url, og:locale
    // and hreflang alternates baked in.
    //
    // `useHead` (used internally by both composables) relies on `inject`, so
    // we call them inside `app.runWithContext` to provide the active Vue
    // app context. The detached `effectScope` keeps the watchers alive for
    // the entire lifetime of the app.
    app.runWithContext(() =>
      effectScope(true).run(() => {
        const currentLocale = computed<SupportedLocale>(() => resolveLocale(router.currentRoute.value.params.locale));
        const currentCanonical = computed(() => canonicalFor(currentLocale.value));
        const alternates = computed(() => [
          ...SUPPORTED_LOCALES.map((locale) => ({
            hreflang: LOCALE_BCP47[locale],
            href: canonicalFor(locale),
          })),
          { hreflang: 'x-default', href: canonicalFor(DEFAULT_LOCALE) },
        ]);

        usePageMeta(() => ({
          title: 'Mission Platform — Composable. Mission Ready.',
          description:
            'Mission Platform is an independent, composable Vue 3 monorepo of design tokens, components, composables, and Cloudflare Workers for building modern, mission-ready web experiences.',
          keywords: [
            'Vue 3',
            'monorepo',
            'design system',
            'components',
            'composable',
            'Cloudflare Workers',
            'TypeScript',
            'Vite',
            'Storybook',
            'mission ready',
            'Mission Platform',
          ],
          author: 'Mission Platform',
          robots: 'index,follow',
          canonical: currentCanonical.value,
          themeColor: '#4a9ebe',
          language: LOCALE_BCP47[currentLocale.value],
          alternates: alternates.value,
        }));

        useOpenGraph(() => ({
          title: 'Mission Platform — Composable. Mission Ready.',
          description:
            'An independent, composable Vue 3 monorepo of design tokens, components, composables, and Cloudflare Workers for building modern, mission-ready web experiences.',
          type: 'website',
          url: currentCanonical.value,
          siteName: 'Mission Platform',
          locale: LOCALE_OG[currentLocale.value],
          localeAlternate: SUPPORTED_LOCALES.filter((l) => l !== currentLocale.value).map((l) => LOCALE_OG[l]),
          images: [
            {
              url: `${SITE_ORIGIN}/og-image.svg`,
              type: 'image/svg+xml',
              width: 1200,
              height: 630,
              alt: 'Mission Platform — Composable. Mission Ready.',
            },
          ],
          twitter: {
            card: 'summary_large_image',
            title: 'Mission Platform — Composable. Mission Ready.',
            description:
              'An independent, composable Vue 3 monorepo for building modern, mission-ready web experiences.',
            image: `${SITE_ORIGIN}/og-image.svg`,
            imageAlt: 'Mission Platform — Composable. Mission Ready.',
          },
        }));
      }),
    );
  },
);
