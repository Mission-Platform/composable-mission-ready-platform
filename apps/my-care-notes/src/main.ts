import '@mission-platform/tokens/scss/tokens';
import '@mission-platform/tokens/scss/themes/light';
import '@mission-platform/tokens/scss/themes/dark';
import '@mission-platform/components/styles';

import { createMpI18n } from '@mission-platform/i18n';
import { useSeo } from '@mission-platform/seo';
import { createHead } from '@unhead/vue/client';
import yaml from 'js-yaml';
import { createApp, effectScope } from 'vue';
import { RouterView } from 'vue-router';

// NOTE: Monaco editor + Harper workers are intentionally NOT imported here.
// They are wired up lazily by `./monaco-environment.ts`, which is itself
// imported only by the editor component the first time it mounts. This keeps
// Monaco and its language/grammar workers out of the app's initial bundle so
// they can be code-split into their own chunks and stripped from any build
// that does not actually render the editor.

import i18nMetaSource from '../i18n-meta.yaml?raw';

import router from './router';

import type { MpLocales } from '@mission-platform/i18n';

const i18nMessages = (yaml.load(i18nMetaSource) ?? {}) as MpLocales;

const app = createApp(RouterView)
  .use(router)
  .use(createMpI18n({ messages: i18nMessages }));

// Register `@unhead/vue` so `useSeo` (which delegates to `useHead`) has an
// active head context to write into.
const head = createHead();
app.use(head);

// Inject the SEO surface (standard page meta + Open Graph / Twitter Card
// meta) into <head> via the unified `@mission-platform/seo` composable.
// `useSeo` relies on `inject`, so we call it inside `app.runWithContext` to
// provide the active Vue app context. The detached `effectScope` keeps the
// underlying watchers alive for the entire lifetime of the app.
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

app.mount('#app');
