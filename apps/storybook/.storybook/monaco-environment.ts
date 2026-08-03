/**
 * Lazy Monaco environment setup for the Vue Storybook.
 *
 * Mirrors the My Care Notes app (`apps/my-care-notes/src/monaco-environment.ts`):
 * it centralises Monaco's `?worker` imports and the `globalThis.MonacoEnvironment`
 * wiring so that the `BaseMonacoEditor` used by the WYSIWYG editor (its code-block
 * dialog and HTML source view) runs its language services **in web workers**
 * rather than falling back to the main thread. Without this, Monaco warns that it
 * "could not create web workers" and does all of its heavy work synchronously on
 * the UI thread, which locks the browser up as soon as the editor is used.
 *
 * `ensureMonacoEnvironment` is idempotent — only the first call wires the
 * environment up; subsequent calls are no-ops.
 */
import HarperWorker from '@mission-platform/harper/worker?worker';
import HunspellWorker from '@mission-platform/hunspell/worker?worker';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

interface MonacoEnvironmentLike {
  getWorker(workerId: string, label: string): Worker;
}

interface WorkerEnvironmentLike {
  getWorker(): Worker;
}

interface EditorGlobals {
  MonacoEnvironment?: MonacoEnvironmentLike;
  HarperEnvironment?: WorkerEnvironmentLike;
  HunspellEnvironment?: WorkerEnvironmentLike;
}

let configured = false;

export function ensureMonacoEnvironment(): void {
  if (configured) return;
  configured = true;

  const globals = globalThis as typeof globalThis & EditorGlobals;

  globals.MonacoEnvironment = {
    getWorker(_workerId: string, label: string): Worker {
      if (label === 'json') return new JsonWorker();
      if (label === 'css' || label === 'scss' || label === 'less') return new CssWorker();
      if (label === 'html' || label === 'handlebars' || label === 'razor') return new HtmlWorker();
      if (label === 'typescript' || label === 'javascript') return new TsWorker();
      return new EditorWorker();
    },
  };

  // Spell (Hunspell) + grammar (Harper) checking used by the editor's source
  // view also run off the main thread.
  globals.HarperEnvironment = {
    getWorker: () => new HarperWorker(),
  };
  globals.HunspellEnvironment = {
    getWorker: () => new HunspellWorker(),
  };
}
