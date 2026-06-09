import '@mission-platform/tokens/scss/tokens';
import '@mission-platform/tokens/scss/themes/light';
import '@mission-platform/tokens/scss/themes/dark';
import '@mission-platform/components/styles';

import { createMpI18n } from '@mission-platform/i18n';
import { useOpenGraph } from '@mission-platform/open-graph';
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

// Inject Open Graph / Twitter Card metadata into <head> via the
// @mission-platform/open-graph composable. An effect scope is required so
// `watchEffect` inside the composable has a parent scope to attach to.
effectScope(true).run(() => {
  useOpenGraph({
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
  });
});

createApp(RouterView)
  .use(router)
  .use(createMpI18n({ messages: i18nMessages }))
  .mount('#app');
