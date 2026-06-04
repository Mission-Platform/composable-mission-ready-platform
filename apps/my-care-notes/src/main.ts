import '@mission-platform/tokens/scss/tokens';
import '@mission-platform/tokens/scss/themes/light';
import '@mission-platform/tokens/scss/themes/dark';
import '@mission-platform/components/styles';

import { locales as uiLocales } from '@mission-platform/components/locales';
import HarperWorker from '@mission-platform/harper/worker?worker';
import { createMpI18n } from '@mission-platform/i18n';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import { createApp } from 'vue';
import { RouterView } from 'vue-router';

import router from './router';

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
  .use(createMpI18n({ modules: [uiLocales] }))
  .mount('#app');
