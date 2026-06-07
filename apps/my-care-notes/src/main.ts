import '@mission-platform/tokens/scss/tokens';
import '@mission-platform/tokens/scss/themes/light';
import '@mission-platform/tokens/scss/themes/dark';
import '@mission-platform/components/styles';

import HarperWorker from '@mission-platform/harper/worker?worker';
import { createMpI18n } from '@mission-platform/i18n';
import yaml from 'js-yaml';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import { createApp } from 'vue';
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

createApp(RouterView)
  .use(router)
  .use(createMpI18n({ messages: i18nMessages }))
  .mount('#app');
