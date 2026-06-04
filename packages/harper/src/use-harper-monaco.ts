import * as monaco from 'monaco-editor';
import { onBeforeUnmount, type MaybeRefOrGetter, toValue, watch } from 'vue';

import type { HarperIssue, HarperWorkerResponse } from './types';

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
declare global {
  var HarperEnvironment:
    | {
        getWorker: () => Worker;
      }
    | undefined;
}

/** Maps LSP severity levels to Monaco marker severities. */
const SEVERITY_MAP: Record<1 | 2 | 3 | 4, monaco.MarkerSeverity> = {
  1: monaco.MarkerSeverity.Error,
  2: monaco.MarkerSeverity.Warning,
  3: monaco.MarkerSeverity.Info,
  4: monaco.MarkerSeverity.Hint,
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

/**
 * Vue composable that integrates Harper grammar and style checking into a
 * Monaco editor instance.
 *
 * Harper (https://writewithharper.com) is a fast, offline, privacy-first
 * English grammar checker powered by WebAssembly.  It runs entirely in the
 * browser with no network requests required.
 *
 * The composable spawns a {@link HarperWorker} via
 * `window.HarperEnvironment.getWorker()`, sends editor content to it on
 * every change (debounced), converts the returned {@link HarperIssue}
 * array into Monaco markers, and registers a quick-fix code-action provider
 * so users can apply Harper suggestions directly from the editor lightbulb.
 *
 * @param editorReference - A `MaybeRefOrGetter` wrapping the Monaco editor instance.
 * @param enabled - A `MaybeRefOrGetter<boolean>` that toggles checking on/off.
 * @param languageReference - A `MaybeRefOrGetter<string>` for the editor language
 *   (used when registering the code-action provider).
 */
export function useHarperMonaco(
  editorReference: MaybeRefOrGetter<monaco.editor.IStandaloneCodeEditor | undefined>,
  enabled: MaybeRefOrGetter<boolean>,
  languageReference: MaybeRefOrGetter<string>,
): void {
  let worker: Worker | undefined;
  let contentListener: monaco.IDisposable | undefined;
  let codeActionProvider: monaco.IDisposable | undefined;

  let latestIssues: HarperIssue[] = [];

  function clearMarkers(): void {
    const model = toValue(editorReference)?.getModel();
    if (model) {
      monaco.editor.setModelMarkers(model, 'harper', []);
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
    if (!worker || !toValue(editorReference)) return;
    const model = toValue(editorReference)!.getModel();
    if (!model) return;
    worker.postMessage({ text: model.getValue() });
  }, 300);

  function setup(): void {
    if (!toValue(editorReference)) return;

    if (!globalThis.HarperEnvironment?.getWorker) {
      console.warn(
        '[useHarperMonaco] window.HarperEnvironment.getWorker is not configured. ' +
          'Set window.HarperEnvironment = { getWorker: () => new HarperWorker() } in your app entry.',
      );
      return;
    }

    const newWorker = globalThis.HarperEnvironment.getWorker();
    worker = newWorker;

    newWorker.addEventListener('message', (event_: MessageEvent<HarperWorkerResponse>) => {
      const model = toValue(editorReference)?.getModel();
      if (!model) return;

      latestIssues = event_.data;

      const markers: monaco.editor.IMarkerData[] = event_.data.map((issue) => {
        const startPos = model.getPositionAt(issue.offset);
        const endPos = model.getPositionAt(issue.offset + issue.length);
        return {
          severity: SEVERITY_MAP[issue.severity] ?? monaco.MarkerSeverity.Warning,
          message: issue.message,
          source: `harper(${issue.ruleId})`,
          startLineNumber: startPos.lineNumber,
          startColumn: startPos.column,
          endLineNumber: endPos.lineNumber,
          endColumn: endPos.column,
        };
      });

      monaco.editor.setModelMarkers(model, 'harper', markers);
    });

    contentListener = toValue(editorReference)!.onDidChangeModelContent(sendToWorker);

    const language = toValue(languageReference) || 'plaintext';
    codeActionProvider = monaco.languages.registerCodeActionProvider(language, {
      provideCodeActions(model, range) {
        const actions: monaco.languages.CodeAction[] = [];

        for (const issue of latestIssues) {
          const startPos = model.getPositionAt(issue.offset);
          const endPos = model.getPositionAt(issue.offset + issue.length);
          const issueRange = new monaco.Range(
            startPos.lineNumber,
            startPos.column,
            endPos.lineNumber,
            endPos.column,
          );

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

    sendToWorker();
  }

  watch(
    [() => toValue(enabled), () => toValue(editorReference)] as const,
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

  watch(
    () => toValue(languageReference),
    () => {
      if (toValue(enabled) && worker) {
        sendToWorker();
      }
    },
  );

  onBeforeUnmount(() => {
    teardown();
  });
}
