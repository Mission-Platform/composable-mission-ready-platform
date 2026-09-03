import type * as monaco from 'monaco-editor';

/**
 * Applications must configure a Hunspell worker factory on
 * `window.HunspellEnvironment` before using spell-check, similar to the
 * `window.MonacoEnvironment` pattern used to configure Monaco language workers.
 *
 * @example
 * // In your app's main.ts:
 * import HunspellWorker from '@mission-platform/hunspell/worker?worker'
 *
 * window.HunspellEnvironment = {
 *   getWorker: () => new HunspellWorker(),
 * }
 */
// eslint-disable-next-line unicorn/prefer-global-this -- Required for globalThis type augmentation.
declare global {
  interface GlobalThis {
    HunspellEnvironment:
      | {
          getWorker: () => Worker;
        }
      | undefined;
  }
}

type SpellIssue = {
  text: string;
  offset: number;
  length: number;
  suggestions: string[];
};

type HunspellEnvironment = {
  getWorker: () => Worker;
};

/** A live Hunspell ↔ Monaco integration that can be re-checked or disposed. */
export interface HunspellMonacoHandle {
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
 * Framework-agnostic core that wires Hunspell spell-checking into a Monaco
 * editor instance, returning a {@link HunspellMonacoHandle}.
 *
 * This is the single source of truth shared by the Vue `useHunspellMonaco`
 * composable (which adds reactive enable/language wiring) and the write-once
 * `@mission-platform/components` `ForgeMonacoEditor` (which wires it through
 * the neutral `useEffect` hooks) — so both frameworks behave identically.
 *
 * It spawns a worker via `window.HunspellEnvironment.getWorker()`, sends editor
 * content to it on every change (debounced), converts the returned issues into
 * Monaco warning markers, and registers a quick-fix code-action provider.
 *
 * @param editor - The Monaco editor instance.
 * @param monacoRuntime - The Monaco runtime module (passed in so a lazily
 *   imported runtime is reused rather than statically bundled).
 * @param language - The editor language id (used to register the provider).
 */
export function attachHunspellMonaco(
  editor: monaco.editor.IStandaloneCodeEditor,
  monacoRuntime: typeof monaco,
  language: string = 'plaintext',
): HunspellMonacoHandle {
  let worker: Worker | undefined;
  let contentListener: monaco.IDisposable | undefined;
  let codeActionProvider: monaco.IDisposable | undefined;

  // Stores the latest issues so the code action provider can look up suggestions.
  let latestIssues: SpellIssue[] = [];

  function clearMarkers(): void {
    const model = editor.getModel();
    if (model) {
      monacoRuntime.editor.setModelMarkers(model, 'hunspell', []);
    }
  }

  const sendToWorker = debounce(() => {
    const model = editor.getModel();
    if (!worker || !model) {
      return;
    }
    worker.postMessage({ text: model.getValue() });
  }, 300);

  const environment = (globalThis as typeof globalThis & { HunspellEnvironment?: HunspellEnvironment })
    .HunspellEnvironment;

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
      '[attachHunspellMonaco] window.HunspellEnvironment.getWorker is not configured. ' +
        'Set window.HunspellEnvironment = { getWorker: () => new HunspellWorker() } in your app entry.',
    );
    return { dispose, recheck: sendToWorker };
  }

  const newWorker = environment.getWorker();
  worker = newWorker;

  newWorker.addEventListener('message', (event_: MessageEvent<SpellIssue[]>) => {
    const model = editor.getModel();
    if (!model) {
      return;
    }

    latestIssues = event_.data;

    const markers: monaco.editor.IMarkerData[] = event_.data.map((issue) => {
      const startPos = model.getPositionAt(issue.offset);
      const endPos = model.getPositionAt(issue.offset + issue.length);
      return {
        severity: monacoRuntime.MarkerSeverity.Warning,
        message: `Unknown word: ${issue.text}`,
        startLineNumber: startPos.lineNumber,
        startColumn: startPos.column,
        endLineNumber: endPos.lineNumber,
        endColumn: endPos.column,
        source: 'hunspell',
      };
    });

    monacoRuntime.editor.setModelMarkers(model, 'hunspell', markers);
  });

  contentListener = editor.onDidChangeModelContent(sendToWorker);

  // Register a code action provider to show spelling suggestions as quick fixes.
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

  // Run an initial check.
  sendToWorker();

  return { dispose, recheck: sendToWorker };
}
