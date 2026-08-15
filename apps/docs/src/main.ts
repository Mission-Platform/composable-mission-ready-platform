import '@mission-platform/tokens/scss/tokens';
// highlight.js ships only a light theme here; the dark / auto (system) syntax
// palettes are layered on in `./styles/global.scss` so code blocks follow the
// active colour theme like the rest of the UI.
import 'highlight.js/styles/github.css';

import { createForgeI18NVue } from '@mission-platform/i18n';
import { organization, useSeo, webSite } from '@mission-platform/seo';
import { ViteSSG } from 'vite-ssg';
import { effectScope } from 'vue';

import App from './App.vue';
import { createDocumentationI18n, LOCALE_DIR, resolveDocumentationLocale } from './i18n';
import { routerOptions } from './router';
import {
  SITE_DESCRIPTION,
  SITE_GENERATOR,
  LOCALE_BCP47,
  LOCALE_OG,
  SITE_NAME,
  SITE_OG_IMAGE,
  SITE_ORIGIN,
  SITE_TITLE,
  TITLE_TEMPLATE,
} from './seo-site';

import './styles/global.scss';

/**
 * Application entry — exported in the shape `vite-ssg` expects so the same
 * module powers both the SPA client and the static-site generator. During
 * `vite-ssg build` this function runs once per prerendered documentation route
 * in a JSDOM environment; in the browser it runs once on hydration.
 *
 * `vite-ssg` installs `@unhead/vue` itself, so `useSeo` (which delegates to
 * `useHead`) has an active head context to write into on both the client and
 * the server (where the tags are baked into the prerendered HTML).
 */
export const createApp = ViteSSG(App, routerOptions, ({ app, router }) => {
  // Restore the persisted colour scheme + UI language before mount so there is
  // no flash of the wrong theme/locale. Skipped during SSG, where there is no
  // `localStorage` (the prerendered HTML ships the default-locale chrome).
  const routeLocale = resolveDocumentationLocale(router.currentRoute.value.params.locale);
  const initialLocale = routeLocale;
  if (!import.meta.env.SSR) {
    try {
      const storedTheme = localStorage.getItem('mp-theme');
      if (storedTheme === 'light' || storedTheme === 'dark') {
        document.documentElement.dataset.theme = storedTheme;
      } else if (storedTheme === 'auto') {
        delete document.documentElement.dataset.theme;
      }
    } catch {
      // Ignore (private mode etc.)
    }
  }

  // Localise the app chrome to the locale encoded in the content route.
  const i18n = createDocumentationI18n(initialLocale);
  app.use(createForgeI18NVue(i18n));
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('lang', initialLocale);
    document.documentElement.setAttribute('dir', LOCALE_DIR[initialLocale]);
  }

  // Inject the site-wide SEO surface — a default page-meta baseline (title
  // template, description, language, theme colour) plus the site-wide JSON-LD
  // graph (`WebSite` + `Organization`). Per-route nodes (`WebPage`,
  // `BreadcrumbList`, per-page title/description/canonical) are emitted by the
  // individual route views via their own additive `useSeo` calls.
  //
  // `useSeo` relies on `inject`, so we call it inside `app.runWithContext` to
  // provide the active Vue app context. The detached `effectScope` keeps the
  // underlying watchers alive for the entire lifetime of the app.
  app.runWithContext(() => {
    effectScope(true).run(() => {
      useSeo({
        page: {
          title: SITE_TITLE,
          titleTemplate: TITLE_TEMPLATE,
          description: SITE_DESCRIPTION,
          author: SITE_NAME,
          generator: SITE_GENERATOR,
          robots: 'index,follow',
          themeColor: '#4a9ebe',
          language: LOCALE_BCP47[initialLocale],
        },
        openGraph: {
          title: SITE_TITLE,
          description: SITE_DESCRIPTION,
          type: 'website',
          url: `${SITE_ORIGIN}/`,
          siteName: SITE_NAME,
          locale: LOCALE_OG[initialLocale],
          images: [
            {
              url: SITE_OG_IMAGE,
              type: 'image/svg+xml',
              width: 1200,
              height: 630,
              alt: SITE_TITLE,
            },
          ],
          twitter: {
            card: 'summary_large_image',
            title: SITE_TITLE,
            description: SITE_DESCRIPTION,
            image: SITE_OG_IMAGE,
            imageAlt: SITE_TITLE,
          },
        },
        // Site-wide structured data so search engines can render rich results
        // (sitelinks search box, organization knowledge panel) straight from
        // the prerendered HTML. Per-route `WebPage` nodes link back into this
        // graph via stable `@id` references.
        jsonLd: [
          webSite({
            name: SITE_NAME,
            url: `${SITE_ORIGIN}/`,
            description: SITE_DESCRIPTION,
            inLanguage: LOCALE_BCP47[initialLocale],
            searchUrlTemplate: `${SITE_ORIGIN}/search?q={search_term_string}`,
          }),
          organization({
            name: 'Mission Platform',
            url: `${SITE_ORIGIN}/`,
            logo: `${SITE_ORIGIN}/icon.svg`,
            description: SITE_DESCRIPTION,
            sameAs: ['https://github.com/Mission-Platform'],
          }),
        ],
      });
    });
  });
});
