import '@mission-platform/tokens/scss/tokens';
import '@mission-platform/tokens/scss/themes/light';
import '@mission-platform/tokens/scss/themes/dark';
import '@mission-platform/components/styles';

import HarperWorker from '@mission-platform/harper/worker?worker';
import { createMpI18n } from '@mission-platform/i18n';
import { useOpenGraph } from '@mission-platform/open-graph';
import yaml from 'js-yaml';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import { createApp, effectScope } from 'vue';
import { RouterView } from 'vue-router';

import i18nMetaSource from '../i18n-meta.yaml?raw';

import router from './router';

import type { MpLocales } from '@mission-platform/i18n';

const i18nMessages = (yaml.load(i18nMetaSource) ?? {}) as MpLocales;

globalThis.MonacoEnvironment = {
  getWorker(_workerId: string, label: string): Worker {
    if (label === 'json') return new JsonWorker();
    if (label === 'css' || label === 'scss' || label === 'less') return new CssWorker();
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new HtmlWorker();
    if (label === 'typescript' || label === 'javascript') return new TsWorker();
    return new EditorWorker();
  },
};

// globalThis.HunspellEnvironment = {
//   getWorker: () => new HunspellWorker(),
// };

globalThis.HarperEnvironment = {
  getWorker: () => new HarperWorker(),
};

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
