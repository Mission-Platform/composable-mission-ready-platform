/**
 * Lazy Monaco environment setup for My Care Notes.
 *
 * Centralises Monaco's `?worker` imports and the `globalThis.MonacoEnvironment`
 * wiring in a dedicated module that is imported **only** by the editor
 * component (`./components/monaco-editor.vue`) — not by `main.ts`. That way
 * Vite/Rollup can split the worker entries into separate chunks that are
 * fetched on demand, the first time an editor is rendered, instead of being
 * shipped as part of the app's initial bundle.
 *
 * `ensureMonacoEnvironment` is idempotent — only the first call wires the
 * environment up; subsequent calls are no-ops.
 */
import HarperWorker from '@mission-platform/harper/worker?worker';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

let configured = false;

export function ensureMonacoEnvironment(): void {
  if (configured) return;
  configured = true;

  globalThis.MonacoEnvironment = {
    getWorker(_workerId: string, label: string): Worker {
      if (label === 'json') return new JsonWorker();
      if (label === 'css' || label === 'scss' || label === 'less') return new CssWorker();
      if (label === 'html' || label === 'handlebars' || label === 'razor') return new HtmlWorker();
      if (label === 'typescript' || label === 'javascript') return new TsWorker();
      return new EditorWorker();
    },
  };

  globalThis.HarperEnvironment = {
    getWorker: () => new HarperWorker(),
  };
}
