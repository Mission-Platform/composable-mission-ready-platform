// ─── @mission-platform/components/monaco ────────────────────────────────────
//
// Opt-in subpath entry for the Monaco editor component.
//
// `BaseMonacoEditor` brings in `monaco-editor`, its language workers
// (`ts.worker`, `css.worker`, `html.worker`, `json.worker`) and the Harper /
// Hunspell Monaco glue. Those assets are large (multi-megabyte) and
// browser-only — completely useless in apps that don't render a code editor.
//
// Exposing the component from a dedicated subpath instead of the main barrel
// (`@mission-platform/components`) means consumers must opt-in explicitly:
//
//   import { BaseMonacoEditor } from '@mission-platform/components/monaco'
//
// Apps that never import from this subpath get zero Monaco bytes (and zero
// Monaco worker chunks) emitted into their build output — which is critical
// for the SSG-prerendered marketing site.
//
// `BaseMonacoEditor` itself is exported as an async component so even apps
// that *do* opt-in pay the load cost lazily, on first mount, instead of in
// their initial bundle.

import { defineAsyncComponent } from 'vue';

export const BaseMonacoEditor = defineAsyncComponent(
  () => import('./components/base-monaco-editor/base-monaco-editor.vue'),
);

export type { MonacoEditorLanguage, MonacoEditorTheme } from './components/base-monaco-editor';
