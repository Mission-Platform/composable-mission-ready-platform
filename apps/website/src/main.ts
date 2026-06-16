// `scss/tokens` already ships the `light-dark()` colour tokens *and* the
// `[data-theme]`/`.theme-*` scheme pins (inside the `mp.tokens` layer), so the
// separate `scss/themes/{light,dark}` imports are no longer needed. The active
// scheme is pinned on <html> by the pre-paint script in index.html before this
// bundle runs (see also @mission-platform/components' themeInitScript()).
import '@mission-platform/tokens/scss/tokens';
import '@mission-platform/components/styles';

import { createMpI18n, type MpMessageObject } from '@mission-platform/i18n';
import { organization, useSeo, webSite } from '@mission-platform/seo';
import { ViteSSG } from 'vite-ssg';
import { computed, effectScope, h, type VNode } from 'vue';
import { RouterView } from 'vue-router';

import enMessages from './locales/en.yaml';
import { loadLocaleMessages } from './locales/load-locale';
import { DEFAULT_LOCALE, routerOptions, SUPPORTED_LOCALES, type SupportedLocale } from './router';
import {
  canonicalFor,
  LOCALE_BCP47,
  LOCALE_DIR,
  LOCALE_OG,
  resolveLocale,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_ORIGIN,
  SITE_TITLE,
} from './seo-site';

import './styles/global.scss';

/** Root render function — keeps `useHead`-bearing setup in a stable scope. */
const renderRoot = (): VNode => h(RouterView);

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
  ({ app, router }) => {
    // Restore persisted theme (client only, before mount, to avoid a flash
    // of the wrong colour scheme). Skipped during SSG.
    if (!import.meta.env.SSR) {
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
      messages: { en: enMessages as MpMessageObject },
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
        document.documentElement.setAttribute('dir', LOCALE_DIR[locale]);
      }
    });

    // Inject the full SEO surface — standard page meta, Open Graph / Twitter
    // Card meta, and JSON-LD structured data — via the unified `useSeo`
    // composable. The composable reacts to the active route, so prerendered
    // HTML for each locale ends up with locale-correct canonical, og:url,
    // og:locale, hreflang alternates, and matching JSON-LD inLanguage baked
    // in.
    //
    // `useHead` (used internally by `useSeo`) relies on `inject`, so we call
    // it inside `app.runWithContext` to provide the active Vue app context.
    // The detached `effectScope` keeps the watchers alive for the entire
    // lifetime of the app.
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

        const siteTitle = SITE_TITLE;
        const siteDescription = SITE_DESCRIPTION;

        // Per-app SEO surface: standard page meta, Open Graph / Twitter
        // Card meta, and the site-wide JSON-LD graph (`WebSite` +
        // `Organization`). Per-route nodes (e.g. `WebPage`) are emitted by
        // the individual route views via their own `useSeo` calls — those
        // calls are additive thanks to `@unhead/vue`'s array merging.
        useSeo(() => ({
          page: {
            title: siteTitle,
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
          },
          openGraph: {
            title: siteTitle,
            description: siteDescription,
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
                alt: siteTitle,
              },
            ],
            twitter: {
              card: 'summary_large_image',
              title: siteTitle,
              description:
                'An independent, composable Vue 3 monorepo for building modern, mission-ready web experiences.',
              image: `${SITE_ORIGIN}/og-image.svg`,
              imageAlt: siteTitle,
            },
          },
          // Site-wide structured data so search engines can render rich
          // results (sitelinks search box, organization knowledge panel)
          // straight from the prerendered HTML. Per-route `WebPage` nodes
          // are emitted by individual route views and link back into this
          // graph via stable `@id` references.
          jsonLd: [
            webSite({
              name: SITE_NAME,
              url: `${SITE_ORIGIN}/`,
              description: siteDescription,
              // Advertise every supported locale on the site-wide WebSite
              // node so search engines know this is a multilingual property.
              inLanguage: SUPPORTED_LOCALES.map((l) => LOCALE_BCP47[l]),
              searchUrlTemplate: `${SITE_ORIGIN}/?q={search_term_string}`,
            }),
            organization({
              name: SITE_NAME,
              url: `${SITE_ORIGIN}/`,
              logo: `${SITE_ORIGIN}/icon.svg`,
              description: siteDescription,
              sameAs: ['https://github.com/Mission-Platform'],
            }),
          ],
        }));
      }),
    );
  },
);
