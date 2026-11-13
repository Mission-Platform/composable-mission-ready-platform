import type * as monaco from 'monaco-editor';

/**
 * Standard issue structure reported by a worker linter or spellchecker.
 */
export interface MonacoWorkerIssue {
  readonly offset: number;
  readonly length: number;
  readonly message?: string;
  readonly text?: string;
  readonly suggestions?: readonly string[];
  readonly severity?: monaco.MarkerSeverity;
  readonly source?: string;
}

export interface MonacoWorkerBridgeOptions<TIssue extends MonacoWorkerIssue = MonacoWorkerIssue> {
  readonly editor: monaco.editor.IStandaloneCodeEditor;
  readonly monacoRuntime: typeof monaco;
  readonly language?: string;
  readonly markerOwner: string;
  readonly workerFactory?: () => Worker;
  readonly missingWorkerWarning?: string;
  readonly debounceMs?: number;
  readonly mapIssueToMarker?: (
    issue: TIssue,
    model: monaco.editor.ITextModel,
    monacoRuntime: typeof monaco,
  ) => monaco.editor.IMarkerData;
  readonly extractIssues?: (data: unknown) => readonly TIssue[];
  readonly quickFixTitle?: (suggestion: string) => string;
}

export interface MonacoWorkerBridgeHandle {
  readonly dispose: () => void;
  readonly recheck: () => void;
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
 * Attaches a Web Worker issue provider (grammar/spell checker or linter) to a Monaco editor instance.
 * Manages worker lifecycle, text change debouncing, model marker updates, and quick-fix code actions.
 */
export function attachMonacoWorkerIssueProvider<TIssue extends MonacoWorkerIssue = MonacoWorkerIssue>(
  options: MonacoWorkerBridgeOptions<TIssue>,
): MonacoWorkerBridgeHandle {
  const {
    editor,
    monacoRuntime,
    language = 'plaintext',
    markerOwner,
    workerFactory,
    missingWorkerWarning,
    debounceMs = 300,
    quickFixTitle = (suggestion) => `Change to "${suggestion}"`,
    extractIssues = (data) => (Array.isArray(data) ? (data as TIssue[]) : []),
    mapIssueToMarker,
  } = options;

  let worker: Worker | undefined;
  let contentListener: monaco.IDisposable | undefined;
  let codeActionProvider: monaco.IDisposable | undefined;
  let latestIssues: readonly TIssue[] = [];

  function clearMarkers(): void {
    const model = editor.getModel();
    if (model) {
      monacoRuntime.editor.setModelMarkers(model, markerOwner, []);
    }
  }

  const sendToWorker = debounce(() => {
    const model = editor.getModel();
    if (!worker || !model) {
      return;
    }
    worker.postMessage({ text: model.getValue() });
  }, debounceMs);

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

  if (!workerFactory) {
    if (missingWorkerWarning) {
      console.warn(missingWorkerWarning);
    }
    return { dispose, recheck: sendToWorker };
  }

  const newWorker = workerFactory();
  worker = newWorker;

  newWorker.addEventListener('message', (event_: MessageEvent) => {
    const model = editor.getModel();
    if (!model) {
      return;
    }

    const issues = extractIssues(event_.data);
    latestIssues = issues;

    const markers: monaco.editor.IMarkerData[] = issues.map((issue) => {
      if (mapIssueToMarker) {
        return mapIssueToMarker(issue, model, monacoRuntime);
      }
      const startPos = model.getPositionAt(issue.offset);
      const endPos = model.getPositionAt(issue.offset + issue.length);
      return {
        severity: issue.severity ?? monacoRuntime.MarkerSeverity.Warning,
        message: issue.message ?? (issue.text ? `Unknown word: ${issue.text}` : 'Issue detected'),
        startLineNumber: startPos.lineNumber,
        startColumn: startPos.column,
        endLineNumber: endPos.lineNumber,
        endColumn: endPos.column,
        source: issue.source ?? markerOwner,
      };
    });

    monacoRuntime.editor.setModelMarkers(model, markerOwner, markers);
  });

  contentListener = editor.onDidChangeModelContent(sendToWorker);

  codeActionProvider = monacoRuntime.languages.registerCodeActionProvider(language || 'plaintext', {
    provideCodeActions(model, range) {
      const actions: monaco.languages.CodeAction[] = [];

      for (const issue of latestIssues) {
        if (!issue.suggestions || issue.suggestions.length === 0) {
          continue;
        }

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
            title: quickFixTitle(suggestion),
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
