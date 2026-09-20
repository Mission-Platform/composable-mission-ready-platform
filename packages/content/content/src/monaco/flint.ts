import {
  createFlintLanguageService,
  tokenizeFlint,
  type FlintLanguageService,
  type FlintPosition,
  type FlintWorkspaceHost,
} from '@mission-platform/flint-language-service';

import type * as monaco from 'monaco-editor';

export const flintLanguageId = 'flint';

/**
 * Configuration options for initializing the Flint Monaco language adapter.
 */
export interface FlintMonacoOptions {
  /** An existing service can be shared by multiple models in one workspace. */
  readonly languageService?: FlintLanguageService;
  /** Host-supplied workspace access; the adapter never accesses the filesystem itself. */
  readonly workspaceHost?: FlintWorkspaceHost;
  /** File name used in validator diagnostics when the model URI has no path. */
  readonly fileName?: string;
}

/**
 * Lifetime handle for an attached Flint Monaco editor session.
 */
export interface FlintMonacoHandle {
  readonly dispose: () => void;
  readonly refresh: () => Promise<void>;
}

/**
 * Type alias representing the Monaco editor namespace.
 */
type MonacoRuntime = typeof monaco;

/** Register the Flint language and the lexical token provider. */
export function registerFlintLanguage(
  monacoRuntime: MonacoRuntime,
  languageId: string = flintLanguageId,
): monaco.IDisposable {
  const languageAlreadyRegistered = monacoRuntime.languages.getLanguages().some(({ id }) => id === languageId);
  if (!languageAlreadyRegistered) {
    monacoRuntime.languages.register({
      id: languageId,
      extensions: ['.flint', '.flt'],
      aliases: ['Flint', 'flint'],
    });
  }
  const tokenProvider = monacoRuntime.languages.setTokensProvider(languageId, {
    getInitialState: createTokenState,
    /**
     * Tokenizes a single line of Flint source code.
     *
     * @param line - Source line text.
     * @param state - Previous tokenization state.
     * @returns Line tokenization result with end state.
     */
    tokenize(line: string, state: monaco.languages.IState) {
      const tokens = tokenizeFlintLine(line);
      return { tokens, endState: state };
    },
  });

  return {
    dispose: () => {
      tokenProvider.dispose();
    },
  };
}

/**
 * Resolves the canonical string URI from a Monaco text model.
 *
 * @param model Active Monaco text model.
 * @returns String representation of the model URI.
 */
function modelUri(model: monaco.editor.ITextModel): string {
  return model.uri.toString();
}

/** Attach diagnostics, completion, hover, model synchronization, and tokenization to an editor. */
export function attachFlintMonaco(
  editor: monaco.editor.IStandaloneCodeEditor,
  monacoRuntime: MonacoRuntime,
  options: FlintMonacoOptions = {},
): FlintMonacoHandle {
  const service = options.languageService ?? createFlintLanguageService(options.workspaceHost);
  const ownsService = options.languageService === undefined;
  const languageRegistration = registerFlintLanguage(monacoRuntime);
  const providerDisposables: monaco.IDisposable[] = [];
  let modelListener: monaco.IDisposable | undefined;
  let disposed = false;
  let refreshGeneration = 0;
  let currentUri: string | undefined;

  /**
   * Resolves the workspace-relative or fallback file name for a model.
   *
   * @param model Active Monaco text model.
   * @returns Resolved file name string.
   */
  const modelFileName = (model: monaco.editor.ITextModel): string =>
    options.fileName ?? model.uri.path ?? modelUri(model);

  /**
   * Retrieves the current editor model if one is attached.
   *
   * @returns Active text model or undefined.
   */
  const currentModel = (): monaco.editor.ITextModel | undefined => {
    const model = editor.getModel();
    if (!model) return undefined;
    return model;
  };

  // Monaco renders the language service's canonical diagnostics, including shared
  // FLINT-ANALYSIS findings; analysis rules are intentionally not duplicated here.
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
        source: `flint/${diagnostic.phase}`,
        startLineNumber,
        startColumn,
        endLineNumber,
        endColumn: endLineNumber === startLineNumber && endColumn === startColumn ? endColumn + 1 : endColumn,
      };
    });
    monacoRuntime.editor.setModelMarkers(model, 'flint', markers);
  };

  /**
   * Refreshes workspace diagnostics and markers for the active model.
   */
  const refresh = async (): Promise<void> => {
    const model = currentModel();
    const uri = currentUri;
    if (model === undefined || uri === undefined) return;
    const generation = ++refreshGeneration;
    await service.refreshWorkspace(uri);
    if (disposed || generation !== refreshGeneration || currentModel() !== model || currentUri !== uri) return;
    setMarkers(model);
  };

  /**
   * Synchronizes document content with the language service.
   *
   * @param model Active text model to synchronize, or undefined.
   * @param open Whether this represents an open operation rather than an update.
   */
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
      refresh().catch(() => {});
    });
    refresh().catch(() => {});
  };

  const modelChangeListener = editor.onDidChangeModel(({ newModelUrl }) => {
    syncModel(modelForUri(monacoRuntime, newModelUrl), true);
  });

  providerDisposables.push(
    monacoRuntime.languages.registerCompletionItemProvider(flintLanguageId, {
      /**
       * Provides completion suggestions at the requested position.
       *
       * @param model - Active text model.
       * @param position - Editor cursor position.
       * @returns Completion list suggestions.
       */
      async provideCompletionItems(model, position) {
        syncDocumentForRequest(model);
        await service.refreshWorkspace(modelUri(model));
        const items = service.complete(modelUri(model), toFlintPosition(position));
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
    monacoRuntime.languages.registerHoverProvider(flintLanguageId, {
      /**
       * Provides hover documentation for the token under the cursor.
       *
       * @param model - Active text model.
       * @param position - Editor cursor position.
       * @returns Hover documentation or undefined.
       */
      async provideHover(model, position) {
        syncDocumentForRequest(model);
        await service.refreshWorkspace(modelUri(model));
        const hover = service.hover(modelUri(model), toFlintPosition(position));
        if (hover !== undefined) {
          return {
            range: toMonacoRange(monacoRuntime, hover.range),
            contents: hover.contents.map((value) => ({ value })),
          };
        }
        return;
      },
    }),
  );

  /**
   * Ensures the active model is synchronized before processing language service queries.
   *
   * @param model Target Monaco text model.
   */
  function syncDocumentForRequest(model: monaco.editor.ITextModel): void {
    if (currentUri === modelUri(model)) return;
    syncModel(model, true);
  }

  syncModel(currentModel(), true);

  /**
   * Disposes all active listeners, providers, and language service document bindings.
   */
  const disposeAll = (): void => {
    modelListener?.dispose();
    modelChangeListener.dispose();
    for (const disposable of providerDisposables) disposable.dispose();
    languageRegistration.dispose();
    if (currentUri !== undefined) {
      const model = currentModel();
      if (model !== undefined) monacoRuntime.editor.setModelMarkers(model, 'flint', []);
      service.closeDocument(currentUri);
    }
    if (ownsService) service.dispose();
  };

  return {
    refresh,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      refreshGeneration += 1;
      disposeAll();
    },
  };
}

/**
 * Creates an empty Monaco tokenization state object.
 *
 * @returns Fresh IState instance.
 */
function createTokenState(): monaco.languages.IState {
  const state: monaco.languages.IState = {
    clone: () => state,
    equals: (other) => other === state,
  };
  return state;
}

/**
 * Resolves a text model from the Monaco editor registry by URI.
 *
 * @param monacoRuntime Active Monaco runtime.
 * @param uri Model URI.
 * @returns Text model if present, or undefined.
 */
function modelForUri(monacoRuntime: MonacoRuntime, uri: monaco.Uri | null): monaco.editor.ITextModel | undefined {
  if (!uri) return undefined;
  const model = monacoRuntime.editor.getModel(uri);
  if (!model) return undefined;
  return model;
}

/**
 * Tokenizes a single line of Flint source code into Monaco tokens.
 *
 * @param line Line text.
 * @returns Array of Monaco token descriptors.
 */
function tokenizeFlintLine(line: string): monaco.languages.IToken[] {
  // The core tokenizer uses UTF-16 offsets, which are also Monaco token offsets.
  // Map Flint token kinds to standard Monaco token names that built-in themes color.
  return tokenizeFlint(line).map((token) => ({
    startIndex: token.range.start.character,
    scopes: tokenKindToMonacoScope(token.kind),
  }));
}

const MONACO_SCOPE_BY_TOKEN_KIND: Readonly<Record<string, string>> = {
  keyword: 'keyword',
  type: 'type',
  string: 'string',
  number: 'number',
  comment: 'comment',
  invalid: 'invalid',
  operator: 'operator',
  punctuation: 'delimiter',
  declaration: 'type',
};

/**
 * Maps Flint token kinds to standard Monaco token scopes.
 *
 * @param kind Token kind string.
 * @returns Standard scope name recognized by editor themes.
 */
function tokenKindToMonacoScope(kind: string): string {
  return MONACO_SCOPE_BY_TOKEN_KIND[kind] ?? 'identifier';
}

/**
 * Maps a diagnostic severity to a Monaco MarkerSeverity.
 *
 * @param monacoRuntime Active Monaco runtime.
 * @param severity Diagnostic severity string.
 * @returns Monaco MarkerSeverity enum value.
 */
function markerSeverity(monacoRuntime: MonacoRuntime, severity: 'error' | 'warning' | 'info'): monaco.MarkerSeverity {
  if (severity === 'error') return monacoRuntime.MarkerSeverity.Error;
  if (severity === 'warning') return monacoRuntime.MarkerSeverity.Warning;
  return monacoRuntime.MarkerSeverity.Info;
}

/**
 * Maps a language service completion kind to a Monaco CompletionItemKind.
 *
 * @param monacoRuntime Active Monaco runtime.
 * @param kind Language service completion kind.
 * @returns Monaco CompletionItemKind enum value.
 */
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

/**
 * Translates a 1-based Monaco position to a 0-based FlintPosition.
 *
 * @param position 1-based Monaco position.
 * @returns 0-based FlintPosition.
 */
function toFlintPosition(position: monaco.Position): FlintPosition {
  return { line: position.lineNumber - 1, character: position.column - 1 };
}

/**
 * Translates a 0-based Flint range to a 1-based Monaco Range.
 *
 * @param monacoRuntime Active Monaco runtime.
 * @param range 0-based start and end FlintPositions.
 * @returns 1-based Monaco Range instance.
 */
function toMonacoRange(
  monacoRuntime: MonacoRuntime,
  range: { start: FlintPosition; end: FlintPosition },
): monaco.Range {
  return new monacoRuntime.Range(
    range.start.line + 1,
    range.start.character + 1,
    range.end.line + 1,
    range.end.character + 1,
  );
}
