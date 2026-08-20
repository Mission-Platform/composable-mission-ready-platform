import {
  createForgeWebScriptLanguageService,
  tokenizeForgeWebScript,
  type ForgeWebScriptLanguageService,
  type ForgeWebScriptPosition,
  type ForgeWebScriptWorkspaceHost,
} from '@mission-platform/forge-web-script-language-service';

import type * as monaco from 'monaco-editor';

export const forgeWebScriptLanguageId = 'fws';

export interface ForgeWebScriptMonacoOptions {
  /** An existing service can be shared by multiple models in one workspace. */
  readonly languageService?: ForgeWebScriptLanguageService;
  /** Host-supplied workspace access; the adapter never accesses the filesystem itself. */
  readonly workspaceHost?: ForgeWebScriptWorkspaceHost;
  /** File name used in validator diagnostics when the model URI has no path. */
  readonly fileName?: string;
}

export interface ForgeWebScriptMonacoHandle {
  readonly dispose: () => void;
  readonly refresh: () => Promise<void>;
}

type MonacoRuntime = typeof monaco;

/** Register the Forge Web Script language and the lexical token provider. */
export function registerForgeWebScriptLanguage(
  monacoRuntime: MonacoRuntime,
  languageId = forgeWebScriptLanguageId,
): monaco.IDisposable {
  const languageAlreadyRegistered = monacoRuntime.languages.getLanguages().some(({ id }) => id === languageId);
  if (!languageAlreadyRegistered) {
    monacoRuntime.languages.register({
      id: languageId,
      extensions: ['.fws'],
      aliases: ['Forge Web Script', 'fws'],
    });
  }
  const tokenProvider = monacoRuntime.languages.setTokensProvider(languageId, {
    getInitialState: createTokenState,
    tokenize(line: string, state: monaco.languages.IState) {
      const tokens = tokenizeForgeWebScriptLine(line);
      return { tokens, endState: state };
    },
  });

  return {
    dispose: () => {
      tokenProvider.dispose();
    },
  };
}

/** Attach diagnostics, completion, hover, model synchronization, and tokenization to an editor. */
export function attachForgeWebScriptMonaco(
  editor: monaco.editor.IStandaloneCodeEditor,
  monacoRuntime: MonacoRuntime,
  options: ForgeWebScriptMonacoOptions = {},
): ForgeWebScriptMonacoHandle {
  const service = options.languageService ?? createForgeWebScriptLanguageService(options.workspaceHost);
  const ownsService = options.languageService === undefined;
  const languageRegistration = registerForgeWebScriptLanguage(monacoRuntime);
  const providerDisposables: monaco.IDisposable[] = [];
  let modelListener: monaco.IDisposable | undefined;
  let disposed = false;
  let refreshGeneration = 0;
  let currentUri: string | undefined;

  const modelUri = (model: monaco.editor.ITextModel): string => model.uri.toString();
  const modelFileName = (model: monaco.editor.ITextModel): string =>
    options.fileName ?? model.uri.path ?? modelUri(model);
  const currentModel = (): monaco.editor.ITextModel | undefined => {
    const model = editor.getModel();
    if (!model) return;
    return model;
  };

  const setMarkers = (model: monaco.editor.ITextModel): void => {
    const analysis = service.diagnose(modelUri(model));
    const markers: monaco.editor.IMarkerData[] = analysis.diagnostics.map((diagnostic) => {
      const startLineNumber = diagnostic.range.start.line + 1;
      const startColumn = diagnostic.range.start.character + 1;
      const endLineNumber = diagnostic.range.end.line + 1;
      const endColumn = diagnostic.range.end.character + 1;
      return {
        code: diagnostic.code,
        severity: markerSeverity(monacoRuntime, diagnostic.severity),
        message: diagnostic.hint === undefined ? diagnostic.message : `${diagnostic.message}\nHint: ${diagnostic.hint}`,
        source: `forge-web-script/${diagnostic.phase}`,
        startLineNumber,
        startColumn,
        endLineNumber,
        endColumn: endLineNumber === startLineNumber && endColumn === startColumn ? endColumn + 1 : endColumn,
      };
    });
    monacoRuntime.editor.setModelMarkers(model, 'forge-web-script', markers);
  };

  const refresh = async (): Promise<void> => {
    const model = currentModel();
    const uri = currentUri;
    if (model === undefined || uri === undefined) return;
    const generation = ++refreshGeneration;
    await service.refreshWorkspace(uri);
    if (disposed || generation !== refreshGeneration || currentModel() !== model || currentUri !== uri) return;
    setMarkers(model);
  };

  const syncModel = (model: monaco.editor.ITextModel | undefined, open: boolean): void => {
    modelListener?.dispose();
    modelListener = undefined;
    if (currentUri !== undefined && currentUri !== model?.uri.toString()) service.closeDocument(currentUri);
    if (model === undefined) return;
    const uri = modelUri(model);
    currentUri = uri;
    const document = {
      uri,
      fileName: modelFileName(model),
      text: model.getValue(),
      version: model.getVersionId(),
    } as const;
    if (open) service.openDocument(document);
    else service.updateDocument(document);
    modelListener = model.onDidChangeContent(() => {
      service.updateDocument({
        uri,
        fileName: modelFileName(model),
        text: model.getValue(),
        version: model.getVersionId(),
      });
      void refresh();
    });
    void refresh();
  };

  const modelChangeListener = editor.onDidChangeModel(({ newModelUrl }) => {
    syncModel(modelForUri(monacoRuntime, newModelUrl), true);
  });

  providerDisposables.push(
    monacoRuntime.languages.registerCompletionItemProvider(forgeWebScriptLanguageId, {
      async provideCompletionItems(model, position) {
        syncDocumentForRequest(model);
        await service.refreshWorkspace(modelUri(model));
        const items = service.complete(modelUri(model), toForgePosition(position));
        return {
          suggestions: items.map((item) => ({
            label: item.label,
            kind: completionKind(monacoRuntime, item.kind),
            detail: item.detail,
            documentation: item.documentation,
            range: toMonacoRange(monacoRuntime, item.range),
            insertText: item.label,
          })),
        };
      },
    }),
    monacoRuntime.languages.registerHoverProvider(forgeWebScriptLanguageId, {
      async provideHover(model, position) {
        syncDocumentForRequest(model);
        await service.refreshWorkspace(modelUri(model));
        const hover = service.hover(modelUri(model), toForgePosition(position));
        if (hover === undefined) return;
        return {
          range: toMonacoRange(monacoRuntime, hover.range),
          contents: hover.contents.map((value) => ({ value })),
        };
      },
    }),
  );

  function syncDocumentForRequest(model: monaco.editor.ITextModel): void {
    if (currentUri === modelUri(model)) return;
    syncModel(model, true);
  }

  syncModel(currentModel(), true);

  return {
    refresh,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      refreshGeneration += 1;
      modelListener?.dispose();
      modelChangeListener.dispose();
      for (const disposable of providerDisposables) disposable.dispose();
      languageRegistration.dispose();
      if (currentUri !== undefined) {
        const model = currentModel();
        if (model !== undefined) monacoRuntime.editor.setModelMarkers(model, 'forge-web-script', []);
        service.closeDocument(currentUri);
      }
      if (ownsService) service.dispose();
    },
  };
}

function createTokenState(): monaco.languages.IState {
  let state: monaco.languages.IState;
  state = {
    clone: () => state,
    equals: (other) => other === state,
  };
  return state;
}

function modelForUri(monacoRuntime: MonacoRuntime, uri: monaco.Uri | null): monaco.editor.ITextModel | undefined {
  if (!uri) return;
  const model = monacoRuntime.editor.getModel(uri);
  if (!model) return;
  return model;
}

function tokenizeForgeWebScriptLine(line: string): monaco.languages.IToken[] {
  // The core tokenizer uses UTF-16 offsets, which are also Monaco token offsets.
  // Map Forge Web Script token kinds to standard Monaco token names that built-in themes color.
  return tokenizeForgeWebScript(line).map((token) => ({
    startIndex: token.range.start.character,
    scopes: tokenKindToMonacoScope(token.kind),
  }));
}

function tokenKindToMonacoScope(kind: string): string {
  // Map Forge Web Script token kinds to standard Monaco token scopes.
  // Built-in themes (vs, vs-dark, hc-*) define rules for these base names.
  switch (kind) {
    case 'keyword': {
      return 'keyword';
    }
    case 'type': {
      return 'type';
    }
    case 'string': {
      return 'string';
    }
    case 'number': {
      return 'number';
    }
    case 'comment': {
      return 'comment';
    }
    case 'invalid': {
      return 'invalid';
    }
    case 'operator': {
      return 'operator';
    }
    case 'punctuation': {
      return 'delimiter';
    }
    case 'declaration': {
      // Declarations are typically highlighted as types or variables; use 'type' for consistency
      return 'type';
    }
    default: {
      return 'identifier';
    }
  }
}

function markerSeverity(monacoRuntime: MonacoRuntime, severity: 'error' | 'warning' | 'info'): monaco.MarkerSeverity {
  if (severity === 'error') return monacoRuntime.MarkerSeverity.Error;
  if (severity === 'warning') return monacoRuntime.MarkerSeverity.Warning;
  return monacoRuntime.MarkerSeverity.Info;
}

function completionKind(
  monacoRuntime: MonacoRuntime,
  kind: 'keyword' | 'type' | 'declaration' | 'value' | 'function' | 'capability',
): monaco.languages.CompletionItemKind {
  if (kind === 'keyword') return monacoRuntime.languages.CompletionItemKind.Keyword;
  if (kind === 'type') return monacoRuntime.languages.CompletionItemKind.TypeParameter;
  if (kind === 'function') return monacoRuntime.languages.CompletionItemKind.Function;
  if (kind === 'capability') return monacoRuntime.languages.CompletionItemKind.Module;
  return monacoRuntime.languages.CompletionItemKind.Variable;
}

function toForgePosition(position: monaco.Position): ForgeWebScriptPosition {
  return { line: position.lineNumber - 1, character: position.column - 1 };
}

function toMonacoRange(
  monacoRuntime: MonacoRuntime,
  range: { start: ForgeWebScriptPosition; end: ForgeWebScriptPosition },
): monaco.Range {
  return new monacoRuntime.Range(
    range.start.line + 1,
    range.start.character + 1,
    range.end.line + 1,
    range.end.character + 1,
  );
}
