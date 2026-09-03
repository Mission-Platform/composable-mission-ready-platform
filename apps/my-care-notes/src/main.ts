// `scss/tokens` already ships the `light-dark()` colour tokens *and* the
// `[data-theme]`/`.theme-*` scheme pins, so the separate `scss/themes/...`
// imports remain for any consumers that pin a single scheme. The active scheme
// is pinned on <html> by the pre-paint script in index.html before this bundle
// runs.
import '@mission-platform/tokens/scss/tokens';
import '@mission-platform/tokens/scss/themes/light';
import '@mission-platform/tokens/scss/themes/dark';

import { createForgeI18N, forgeNamespace, createForgeI18NVue } from '@mission-platform/i18n';
import { useSeo } from '@mission-platform/seo';
import { supportedLocales } from 'virtual:i18n-locales';
import { resources as defaultLocaleResources } from 'virtual:i18n-resources';
import { ViteSSG } from 'vite-ssg';
import { effectScope, h, type VNode } from 'vue';
import { RouterView } from 'vue-router';

import { routerOptions } from './router';
import { APP_ORIGIN } from './seo-app';

import type { Resource } from 'i18next';

// NOTE: Monaco editor + Harper workers are intentionally NOT imported here.
// They are wired up lazily by `./monaco-environment.ts`, which is itself
// imported only by the editor component the first time it mounts. This keeps
// Monaco and its language/grammar workers out of the app's initial bundle and
// out of the `vite-ssg` server build entirely.

/** Root render function — keeps the `useSeo`-bearing route view in a stable scope. */
const renderRoot = (): VNode => h(RouterView);

/**
 * Application entry — exported in the shape `vite-ssg` expects so the same
 * module powers both the SPA client and the static-site generator. During
 * `vite-ssg build` this function runs once for the prerendered `/` route in a
 * JSDOM environment; in the browser it runs once on hydration.
 *
 * `vite-ssg` installs `@unhead/vue` itself, so `useSeo` (which delegates to
 * `useHead`) has an active head context to write into on both the client and
 * the server (where the tags are baked into the prerendered HTML).
 */
export const createApp = ViteSSG(
  // Root component — just the active route's view.
  { setup: () => renderRoot },
  routerOptions,
  async ({ app, router }) => {
    // Seed English (source-of-truth) messages at creation time.
    const i18n = createForgeI18N({
      locale: 'en',
      fallbackLocale: 'en',
      namespace: forgeNamespace('my-care-notes'),
      resources: defaultLocaleResources,
    });
    app.use(createForgeI18NVue(i18n));

    const localeBundles: Record<string, () => Promise<{ resources: Resource }>> = {
      ar: () => import('virtual:i18n-locale-ar'),
      de: () => import('virtual:i18n-locale-de'),
      es: () => import('virtual:i18n-locale-es'),
      fr: () => import('virtual:i18n-locale-fr'),
      he: () => import('virtual:i18n-locale-he'),
      it: () => import('virtual:i18n-locale-it'),
      ja: () => import('virtual:i18n-locale-ja'),
      ko: () => import('virtual:i18n-locale-ko'),
      nl: () => import('virtual:i18n-locale-nl'),
      zh: () => import('virtual:i18n-locale-zh'),
    };

    router.beforeEach(async (to) => {
      const routeLocale = typeof to.params['lang'] === 'string' ? to.params['lang'] : 'en';
      const locale = supportedLocales.includes(routeLocale as (typeof supportedLocales)[number]) ? routeLocale : 'en';

      if (locale !== 'en' && !i18n.hasResourceBundle(locale, 'mp.my-care-notes')) {
        const { resources } = await localeBundles[locale]!();
        for (const [namespace, messages] of Object.entries(resources[locale] ?? {})) {
          i18n.addResourceBundle(locale, namespace, messages, true, true);
        }
      }

      if (i18n.language !== locale) await i18n.changeLanguage(locale);
    });

    // Inject the SEO surface (standard page meta + Open Graph / Twitter Card
    // meta) into <head> via the unified `@mission-platform/seo` composable.
    // `useSeo` relies on `inject`, so we call it inside `app.runWithContext`
    // to provide the active Vue app context. The detached `effectScope` keeps
    // the underlying watchers alive for the entire lifetime of the app.
    app.runWithContext(() => {
      effectScope(true).run(() => {
        useSeo({
          page: {
            author: 'Mission Platform',
            generator: 'Mission Platform',
          },
          openGraph: {
            title: 'My Care Notes',
            description:
              'A privacy-first, offline-capable note-taking app with built-in spell and grammar checking, powered by the Mission Platform.',
            type: 'website',
            url: APP_ORIGIN,
            siteName: 'My Care Notes',
            locale: 'en_AU',
            twitter: {
              card: 'summary',
            },
          },
        });
      });
    });
  },
);
