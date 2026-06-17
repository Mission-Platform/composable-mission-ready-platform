// `scss/tokens` already ships the `light-dark()` colour tokens *and* the
// `[data-theme]`/`.theme-*` scheme pins, so the separate `scss/themes/...`
// imports remain for any consumers that pin a single scheme. The active scheme
// is pinned on <html> by the pre-paint script in index.html before this bundle
// runs (see also @mission-platform/components' themeInitScript()).
import '@mission-platform/tokens/scss/tokens';
import '@mission-platform/tokens/scss/themes/light';
import '@mission-platform/tokens/scss/themes/dark';
import '@mission-platform/components/styles';

import { createMpI18n } from '@mission-platform/i18n';
import { useSeo } from '@mission-platform/seo';
import yaml from 'js-yaml';
import { ViteSSG } from 'vite-ssg';
import { effectScope, h, type VNode } from 'vue';
import { RouterView } from 'vue-router';

// NOTE: Monaco editor + Harper workers are intentionally NOT imported here.
// They are wired up lazily by `./monaco-environment.ts`, which is itself
// imported only by the editor component the first time it mounts. This keeps
// Monaco and its language/grammar workers out of the app's initial bundle and
// out of the `vite-ssg` server build entirely.

import i18nMetaSource from '../i18n-meta.yaml?raw';

import { routerOptions } from './router';

import type { MpLocales } from '@mission-platform/i18n';

const i18nMessages = (yaml.load(i18nMetaSource) ?? {}) as MpLocales;

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
  ({ app }) => {
    app.use(createMpI18n({ messages: i18nMessages }));

    // Inject the SEO surface (standard page meta + Open Graph / Twitter Card
    // meta) into <head> via the unified `@mission-platform/seo` composable.
    // `useSeo` relies on `inject`, so we call it inside `app.runWithContext`
    // to provide the active Vue app context. The detached `effectScope` keeps
    // the underlying watchers alive for the entire lifetime of the app.
    app.runWithContext(() => {
      effectScope(true).run(() => {
        useSeo({
          openGraph: {
            title: 'My Care Notes',
            description:
              'A privacy-first, offline-capable note-taking app with built-in spell and grammar checking, powered by the Mission Platform.',
            type: 'website',
            url: 'https://my-care-notes.mission-platform.dev/',
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
