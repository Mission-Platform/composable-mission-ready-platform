// `scss/tokens` already ships the `light-dark()` colour tokens *and* the
// `[data-theme]`/`.theme-*` scheme pins (inside the `mp.tokens` layer), so the
// separate `scss/themes/{light,dark}` imports are no longer needed. The active
// scheme is pinned on <html> by the pre-paint script in index.html before this
// bundle runs.
import '@mission-platform/tokens/scss/tokens';

import { createForgeI18N, createForgeI18NVue, forgeNamespace } from '@mission-platform/i18n';
import { organization, useSeo, webSite } from '@mission-platform/seo';
import { resources as defaultLocaleResources } from 'virtual:i18n-resources';
import { ViteSSG } from 'vite-ssg';
import { computed, effectScope } from 'vue';

import { renderRoot } from './app-root';
import { DEFAULT_LOCALE, routerOptions, SUPPORTED_LOCALES, type SupportedLocale } from './router';
import {
  canonicalFor,
  LOCALE_BCP47,
  LOCALE_DIR,
  LOCALE_OG,
  resolveLocale,
  SITE_DESCRIPTION,
  SITE_GENERATOR,
  SITE_NAME,
  SITE_ORIGIN,
  SITE_TITLE,
} from './seo-site';

import type { Resource } from 'i18next';

import './styles/global.scss';

/**
 * Application entry — exported in the shape `vite-ssg` expects so the same
 * module powers both the SPA client and the static-site generator. During
 * `vite-ssg build` this function runs once per prerendered route in a JSDOM
 * environment; in the browser it runs once on hydration.
 */
export const createApp = ViteSSG(
  // Root component — the active route's view with application-level providers.
  { setup: () => renderRoot },
  routerOptions,
  async ({ app, router }) => {
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

    // Synchronise the active route's `:locale` segment with i18next's active
    // locale on every navigation (both client and server side).
    const localeBundles: Record<string, () => Promise<{ resources: Resource }>> = {
      es: () => import('virtual:i18n-locale-es'),
      fr: () => import('virtual:i18n-locale-fr'),
      nl: () => import('virtual:i18n-locale-nl'),
      it: () => import('virtual:i18n-locale-it'),
      de: () => import('virtual:i18n-locale-de'),
      ko: () => import('virtual:i18n-locale-ko'),
      ja: () => import('virtual:i18n-locale-ja'),
      zh: () => import('virtual:i18n-locale-zh'),
      ar: () => import('virtual:i18n-locale-ar'),
      he: () => import('virtual:i18n-locale-he'),
    };

    // Seed English (source-of-truth) messages at creation time so the first
    // paint resolves them. Additional locales are loaded lazily per route.
    const i18n = createForgeI18N({
      locale: DEFAULT_LOCALE,
      fallbackLocale: DEFAULT_LOCALE,
      namespace: forgeNamespace('website'),
      resources: defaultLocaleResources,
    });
    app.use(createForgeI18NVue(i18n));

    router.beforeEach(async (to) => {
      const locale = resolveLocale(to.params.locale);

      if (locale !== DEFAULT_LOCALE && !i18n.hasResourceBundle(locale, 'mp.website')) {
        const { resources } = await localeBundles[locale]();
        for (const [namespace, messages] of Object.entries(resources[locale] ?? {})) {
          i18n.addResourceBundle(locale, namespace, messages, true, true);
        }
      }

      if (i18n.language !== locale) {
        await i18n.changeLanguage(locale);
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

        const siteTitle = computed(() =>
          i18n.t(($) => $.seo.title, { ns: 'mp.website', lng: currentLocale.value, defaultValue: SITE_TITLE }),
        );
        const siteDescription = computed(() =>
          i18n.t(($) => $.seo.description, {
            ns: 'mp.website',
            lng: currentLocale.value,
            defaultValue: SITE_DESCRIPTION,
          }),
        );
        const twitterDescription = computed(() =>
          i18n.t(($) => $['seo']['twitter-description'], {
            ns: 'mp.website',
            lng: currentLocale.value,
            defaultValue: SITE_DESCRIPTION,
          }),
        );
        const keywords = computed(() =>
          i18n
            .t(($) => $.seo.keywords, {
              ns: 'mp.website',
              lng: currentLocale.value,
              defaultValue: 'Mission Platform',
            })
            .split(',')
            .map((keyword) => keyword.trim())
            .filter(Boolean),
        );

        // Per-app SEO surface: standard page meta, Open Graph / Twitter
        // Card meta, and the site-wide JSON-LD graph (`WebSite` +
        // `Organization`). Per-route nodes (e.g. `WebPage`) are emitted by
        // the individual route views via their own `useSeo` calls — those
        // calls are additive thanks to `@unhead/vue`'s array merging.
        useSeo(() => ({
          page: {
            title: siteTitle.value,
            description: siteDescription.value,
            keywords: keywords.value,
            author: 'Mission Platform',
            generator: SITE_GENERATOR,
            robots: 'index,follow',
            canonical: currentCanonical.value,
            themeColor: '#4a9ebe',
            language: LOCALE_BCP47[currentLocale.value],
            direction: LOCALE_DIR[currentLocale.value],
            alternates: alternates.value,
          },
          openGraph: {
            title: siteTitle.value,
            description: siteDescription.value,
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
                alt: siteTitle.value,
              },
            ],
            twitter: {
              card: 'summary_large_image',
              title: siteTitle.value,
              description: twitterDescription.value,
              image: `${SITE_ORIGIN}/og-image.svg`,
              imageAlt: siteTitle.value,
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
              description: siteDescription.value,
              // Advertise every supported locale on the site-wide WebSite
              // node so search engines know this is a multilingual property.
              inLanguage: SUPPORTED_LOCALES.map((l) => LOCALE_BCP47[l]),
              searchUrlTemplate: `${SITE_ORIGIN}/?q={search_term_string}`,
            }),
            organization({
              name: SITE_NAME,
              url: `${SITE_ORIGIN}/`,
              logo: `${SITE_ORIGIN}/icon.svg`,
              description: siteDescription.value,
              sameAs: ['https://github.com/Mission-Platform'],
            }),
          ],
        }));
      }),
    );
  },
);
