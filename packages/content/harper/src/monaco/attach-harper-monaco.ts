import type { HarperIssue, HarperWorkerResponse } from '../types';
import type * as monaco from 'monaco-editor';

/**
 * Applications must configure a Harper worker factory on
 * `window.HarperEnvironment` before using grammar and style checking,
 * following the same pattern as `window.HunspellEnvironment` and
 * `window.MonacoEnvironment`.
 *
 * @example
 * // In your app's main.ts:
 * import HarperWorker from '@mission-platform/harper/worker?worker'
 *
 * window.HarperEnvironment = {
 *   getWorker: () => new HarperWorker(),
 * }
 */
// eslint-disable-next-line unicorn/prefer-global-this -- Required for globalThis type augmentation.
declare global {
  interface GlobalThis {
    HarperEnvironment:
      | {
          getWorker: () => Worker;
        }
      | undefined;
  }
}

type HarperEnvironment = {
  getWorker: () => Worker;
};

/** A live Harper ↔ Monaco integration that can be re-checked or disposed. */
export interface HarperMonacoHandle {
  /** Tear down the worker, listeners, markers, and code-action provider. */
  dispose: () => void;
  /** Re-send the current editor contents to the worker for checking. */
  recheck: () => void;
}

function debounce<T extends unknown[]>(
  function_: (...arguments_: T) => void,
  delay: number,
): (...arguments_: T) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...arguments_: T) => {
    clearTimeout(timer);
    timer = setTimeout(() => function_(...arguments_), delay);
  };
}

/**
 * Framework-agnostic core that wires Harper grammar/style checking into a
 * Monaco editor instance, returning a {@link HarperMonacoHandle}.
 *
 * This is the single source of truth shared by the Vue `useHarperMonaco`
 * composable (which adds reactive enable/language wiring) and the write-once
 * `@mission-platform/components` `ForgeMonacoEditor` (which wires it through
 * the neutral `useEffect` hooks) — so both frameworks behave identically.
 *
 * Harper (https://writewithharper.com) is a fast, offline, privacy-first
 * English grammar checker powered by WebAssembly. It spawns a worker via
 * `window.HarperEnvironment.getWorker()`, sends editor content to it on every
 * change (debounced), converts the returned issues into Monaco markers, and
 * registers a quick-fix code-action provider.
 *
 * @param editor - The Monaco editor instance.
 * @param monacoRuntime - The Monaco runtime module (passed in so a lazily
 *   imported runtime is reused rather than statically bundled).
 * @param language - The editor language id (used to register the provider).
 */
export function attachHarperMonaco(
  editor: monaco.editor.IStandaloneCodeEditor,
  monacoRuntime: typeof monaco,
  language: string = 'plaintext',
): HarperMonacoHandle {
  const severityMap: Record<1 | 2 | 3 | 4, monaco.MarkerSeverity> = {
    1: monacoRuntime.MarkerSeverity.Error,
    2: monacoRuntime.MarkerSeverity.Warning,
    3: monacoRuntime.MarkerSeverity.Info,
    4: monacoRuntime.MarkerSeverity.Hint,
  };

  let worker: Worker | undefined;
  let contentListener: monaco.IDisposable | undefined;
  let codeActionProvider: monaco.IDisposable | undefined;

  let latestIssues: HarperIssue[] = [];

  function clearMarkers(): void {
    const model = editor.getModel();
    if (model) {
      monacoRuntime.editor.setModelMarkers(model, 'harper', []);
    }
  }

  const sendToWorker = debounce(() => {
    const model = editor.getModel();
    if (!worker || !model) {
      return;
    }
    worker.postMessage({ text: model.getValue() });
  }, 300);

  const environment = (globalThis as typeof globalThis & { HarperEnvironment?: HarperEnvironment }).HarperEnvironment;

  function dispose(): void {
    contentListener?.dispose();
    contentListener = undefined;
    codeActionProvider?.dispose();
    codeActionProvider = undefined;
    latestIssues = [];
    if (worker) {
      clearMarkers();
      worker.terminate();
      worker = undefined;
    }
  }

  if (!environment?.getWorker) {
    console.warn(
      '[attachHarperMonaco] window.HarperEnvironment.getWorker is not configured. ' +
        'Set window.HarperEnvironment = { getWorker: () => new HarperWorker() } in your app entry.',
    );
    return { dispose, recheck: sendToWorker };
  }

  const newWorker = environment.getWorker();
  worker = newWorker;

  newWorker.addEventListener('message', (event_: MessageEvent<HarperWorkerResponse>) => {
    const model = editor.getModel();
    if (!model) {
      return;
    }

    latestIssues = event_.data;

    const markers: monaco.editor.IMarkerData[] = event_.data.map((issue) => {
      const startPos = model.getPositionAt(issue.offset);
      const endPos = model.getPositionAt(issue.offset + issue.length);
      return {
        severity: severityMap[issue.severity] ?? monacoRuntime.MarkerSeverity.Warning,
        message: issue.message,
        source: `harper(${issue.ruleId})`,
        startLineNumber: startPos.lineNumber,
        startColumn: startPos.column,
        endLineNumber: endPos.lineNumber,
        endColumn: endPos.column,
      };
    });

    monacoRuntime.editor.setModelMarkers(model, 'harper', markers);
  });

  contentListener = editor.onDidChangeModelContent(sendToWorker);

  codeActionProvider = monacoRuntime.languages.registerCodeActionProvider(language || 'plaintext', {
    provideCodeActions(model, range) {
      const actions: monaco.languages.CodeAction[] = [];

      for (const issue of latestIssues) {
        const startPos = model.getPositionAt(issue.offset);
        const endPos = model.getPositionAt(issue.offset + issue.length);
        const issueRange = new monacoRuntime.Range(
          startPos.lineNumber,
          startPos.column,
          endPos.lineNumber,
          endPos.column,
        );

        if (!issueRange.intersectRanges(range)) {
          continue;
        }

        for (const suggestion of issue.suggestions) {
          actions.push({
            title: `Change to "${suggestion}"`,
            kind: 'quickfix',
            diagnostics: [],
            edit: {
              edits: [
                {
                  resource: model.uri,
                  textEdit: { range: issueRange, text: suggestion },
                  versionId: model.getVersionId(),
                },
              ],
            },
            isPreferred: actions.length === 0,
          });
        }
      }

      return { actions, dispose: () => {} };
    },
  });

  sendToWorker();

  return { dispose, recheck: sendToWorker };
}
