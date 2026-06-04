import * as monaco from 'monaco-editor';
import { onBeforeUnmount, type Ref, watch } from 'vue';

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
declare global {
  // Extends Window (for browser environments) and globalThis (for TypeScript's
  // typeof globalThis index) so that `globalThis.HunspellEnvironment` is typed.
  var HunspellEnvironment:
    | {
        getWorker: () => Worker;
      }
    | undefined;

}

type SpellIssue = {
  text: string;
  offset: number;
  length: number;
  suggestions: string[];
};

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

export function useHunspellMonaco(
  editorReference: Ref<monaco.editor.IStandaloneCodeEditor | undefined>,
  enabled: Ref<boolean>,
  languageReference: Ref<string>,
): void {
  let worker: Worker | undefined;
  let contentListener: monaco.IDisposable | undefined;
  let codeActionProvider: monaco.IDisposable | undefined;

  // Stores the latest issues so the code action provider can look up suggestions
  let latestIssues: SpellIssue[] = [];

  function clearMarkers(): void {
    const model = editorReference.value?.getModel();
    if (model) {
      monaco.editor.setModelMarkers(model, 'hunspell', []);
    }
  }

  function teardown(): void {
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

  const sendToWorker = debounce(() => {
    if (!worker || !editorReference.value) return;
    const model = editorReference.value.getModel();
    if (!model) return;
    worker.postMessage({ text: model.getValue() });
  }, 300);

  function setup(): void {
    if (!editorReference.value) return;

    if (!globalThis.HunspellEnvironment?.getWorker) {
      console.warn(
        '[useHunspellMonaco] window.HunspellEnvironment.getWorker is not configured. ' +
          'Set window.HunspellEnvironment = { getWorker: () => new HunspellWorker() } in your app entry.',
      );
      return;
    }

    const newWorker = globalThis.HunspellEnvironment.getWorker();
    worker = newWorker;

    newWorker.addEventListener('message', (event_: MessageEvent<SpellIssue[]>) => {
      const model = editorReference.value?.getModel();
      if (!model) return;

      latestIssues = event_.data;

      const markers: monaco.editor.IMarkerData[] = event_.data.map((issue) => {
        const startPos = model.getPositionAt(issue.offset);
        const wordLength = issue.length;
        const endPos = model.getPositionAt(issue.offset + wordLength);
        return {
          severity: monaco.MarkerSeverity.Warning,
          message: `Unknown word: ${issue.text}`,
          startLineNumber: startPos.lineNumber,
          startColumn: startPos.column,
          endLineNumber: endPos.lineNumber,
          endColumn: endPos.column,
          source: 'hunspell',
        };
      });

      monaco.editor.setModelMarkers(model, 'hunspell', markers);
    });

    contentListener = editorReference.value.onDidChangeModelContent(sendToWorker);

    // Register a code action provider to show spelling suggestions as quick fixes.
    // We register per language so Monaco shows the lightbulb on hunspell markers.
    const language = languageReference.value || 'plaintext';
    codeActionProvider = monaco.languages.registerCodeActionProvider(language, {
      provideCodeActions(model, range) {
        const actions: monaco.languages.CodeAction[] = [];

        for (const issue of latestIssues) {
          const startPos = model.getPositionAt(issue.offset);
          const endPos = model.getPositionAt(issue.offset + issue.length);
          const issueRange = new monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column);

          if (!issueRange.intersectRanges(range)) continue;

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

    // Run an initial check
    sendToWorker();
  }

  watch(
    [enabled, editorReference],
    ([isEnabled]) => {
      if (isEnabled) {
        teardown();
        setup();
      } else {
        teardown();
      }
    },
    { immediate: true },
  );

  watch(languageReference, () => {
    if (enabled.value && worker) {
      sendToWorker();
    }
  });

  onBeforeUnmount(() => {
    teardown();
  });
}
