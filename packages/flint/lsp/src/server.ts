/* eslint-disable unicorn/prevent-abbreviations */
import {
  CompletionItemKind,
  DiagnosticSeverity,
  FileChangeType,
  InlayHintKind,
  MarkupKind,
  SymbolKind,
  TextDocumentSyncKind,
  TextDocuments,
  TextEdit,
  type CodeAction,
  type CodeActionParams,
  type CompletionItem,
  type CompletionParams,
  type CodeLens,
  type CodeLensParams,
  type ColorInformation,
  type ColorPresentation,
  type ColorPresentationParams,
  type Connection,
  type DidChangeTextDocumentParams,
  type DeclarationParams,
  type Diagnostic,
  type DocumentColorParams,
  type DocumentFormattingParams,
  type DocumentLink,
  type DocumentLinkParams,
  type DocumentRangeFormattingParams,
  type DocumentDiagnosticParams,
  type DidChangeWatchedFilesParams,
  type DocumentSymbol,
  type DocumentSymbolParams,
  type FoldingRange,
  type FoldingRangeParams,
  type Hover,
  type HoverParams,
  type ExecuteCommandParams,
  type DefinitionParams,
  type ImplementationParams,
  type InlineValue,
  type InlineValueParams,
  type InlayHint,
  type InlayHintParams,
  type SelectionRangeParams,
  type SelectionRange,
  type InitializeParams,
  type InitializeResult,
  type PublishDiagnosticsParams,
  type ReferenceParams,
  type RenameParams,
  type SemanticTokens,
  type SemanticTokensDelta,
  type SemanticTokensDeltaParams,
  type SemanticTokensParams,
  type SemanticTokensLegend,
  type ServerCapabilities,
  type SymbolInformation,
  type WorkspaceSymbolParams,
  type Location,
  type WorkspaceEdit,
  type CallHierarchyItem,
  type CallHierarchyPrepareParams,
  type CallHierarchyIncomingCallsParams,
  type CallHierarchyIncomingCall,
  type CallHierarchyOutgoingCallsParams,
  type CallHierarchyOutgoingCall,
  type LinkedEditingRangeParams,
  type LinkedEditingRanges,
  type MonikerParams,
  type Moniker,
  type InlineCompletionParams,
  type InlineCompletionItem,
  type TypeHierarchyPrepareParams,
  type TypeHierarchyItem,
  type TypeHierarchySubtypesParams,
  type TypeHierarchySupertypesParams,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

import {
  createFlintLanguageService,
  type FlintAnalysis,
  type FlintContentChange,
  type FlintColor,
  type FlintCommand,
  type FlintLanguageService,
  type FlintDocumentSymbol,
  type FlintHover,
  type FlintLocation,
  type FlintRange,
  type FlintSymbolKind,
  type FlintTextEdit,
  type FlintWorkspaceOptions,
  type FlintWorkspaceChange,
  type FlintWorkspaceHost,
} from '@mission-platform/flint-language-service';

import { createFlintNodeWorkspaceHost } from './workspace.js';

/** Options configuring Flint language server creation. */
export interface FlintLspServerOptions {
  readonly service?: FlintLanguageService;
  readonly workspaceHost?: FlintWorkspaceHost;
  readonly workspaceOptions?: FlintWorkspaceOptions;
  readonly createWorkspaceHost?: (roots: readonly string[]) => FlintWorkspaceHost;
  readonly publishDiagnostics?: (params: PublishDiagnosticsParams) => Promise<void> | void;
  readonly progress?: (event: FlintLspProgressEvent) => Promise<void> | void;
  readonly log?: (event: FlintLspLogEvent) => Promise<void> | void;
}

/** Progress notification event payload emitted during analysis. */
export interface FlintLspProgressEvent {
  readonly token: string;
  readonly kind: 'begin' | 'report' | 'end';
  readonly title: string;
  readonly message?: string;
  readonly percentage?: number;
}

/** Telemetry log event emitted by the language server. */
export interface FlintLspLogEvent {
  readonly level: 'info' | 'warning' | 'error';
  readonly event: string;
  readonly message: string;
  readonly data?: Readonly<Record<string, unknown>>;
}

/** Synchronized text document representation with version and URI. */
export interface FlintLspDocument {
  readonly uri: string;
  readonly version: number;
  readonly text: string;
  readonly fileName?: string;
}

/**
 * Progress reporting handle for long-running LSP operations.
 */
type WorkDoneProgressReporter = Awaited<ReturnType<Connection['window']['createWorkDoneProgress']>>;

/** State tracker managing active LSP progress sessions. */
interface ProgressState {
  reporter?: WorkDoneProgressReporter;
  finished?: boolean;
  ready: Promise<void>;
}

/** Dispatches an LSP work-done progress notification to the client. */
// skipcq: JS-R1005
function sendProgressEvent(state: ProgressState, event: FlintLspProgressEvent): void {
  const reporter = state.reporter;
  if (reporter === undefined) return;
  if (event.kind === 'begin') {
    reporter.begin(event.title, event.percentage, event.message);
  } else if (event.kind === 'report') {
    if (event.percentage === undefined) reporter.report(event.message ?? '');
    else if (event.message === undefined) reporter.report(event.percentage);
    else reporter.report(event.percentage, event.message);
  } else {
    reporter.done();
  }
}

/** Full language server handler interface dispatching LSP protocol requests. */
export interface FlintLspServer {
  initialize(params: InitializeParams): InitializeResult;
  openDocument(document: FlintLspDocument): Promise<void>;
  updateDocument(document: FlintLspDocument): Promise<void>;
  updateDocumentChanges(document: FlintLspDocument, changes: readonly FlintContentChange[]): Promise<void>;
  closeDocument(uri: string): Promise<void>;
  changeWatchedFiles(params: DidChangeWatchedFilesParams): Promise<void>;
  completion(params: CompletionParams): CompletionItem[];
  hover(params: HoverParams): Hover | undefined;
  definition(params: DefinitionParams): Location[];
  declaration(params: DeclarationParams): Location[];
  implementation(params: ImplementationParams): Location[];
  references(params: ReferenceParams): Location[];
  documentSymbols(params: DocumentSymbolParams): DocumentSymbol[];
  workspaceSymbols?(params: WorkspaceSymbolParams): SymbolInformation[];
  codeActions?(params: CodeActionParams): CodeAction[];
  codeLens(params: CodeLensParams): CodeLens[];
  codeLensResolve(lens: CodeLens): CodeLens;
  foldingRanges(params: FoldingRangeParams): FoldingRange[];
  inlineValues(params: InlineValueParams): InlineValue[];
  inlayHints(params: InlayHintParams): InlayHint[];
  inlayHintResolve(hint: InlayHint): InlayHint;
  rename(params: RenameParams): WorkspaceEdit | undefined;
  semanticTokens(params: SemanticTokensParams): SemanticTokens;
  semanticTokensDelta(params: SemanticTokensDeltaParams): SemanticTokensDelta;
  documentLinks(params: DocumentLinkParams): DocumentLink[];
  colors(params: DocumentColorParams): ColorInformation[];
  colorPresentations(params: ColorPresentationParams): ColorPresentation[];
  formatting(params: DocumentFormattingParams): TextEdit[];
  rangeFormatting(params: DocumentRangeFormattingParams): TextEdit[];
  selectionRanges(params: SelectionRangeParams): SelectionRange[];
  executeCommand(params: ExecuteCommandParams): null;
  prepareCallHierarchy(params: CallHierarchyPrepareParams): CallHierarchyItem[];
  incomingCalls(params: CallHierarchyIncomingCallsParams): CallHierarchyIncomingCall[];
  outgoingCalls(params: CallHierarchyOutgoingCallsParams): CallHierarchyOutgoingCall[];
  linkedEditingRanges(params: LinkedEditingRangeParams): LinkedEditingRanges | null;
  monikers(params: MonikerParams): Moniker[];
  inlineCompletions(params: InlineCompletionParams): InlineCompletionItem[];
  prepareTypeHierarchy(params: TypeHierarchyPrepareParams): TypeHierarchyItem[];
  typeHierarchySubtypes(params: TypeHierarchySubtypesParams): TypeHierarchyItem[];
  typeHierarchySupertypes(params: TypeHierarchySupertypesParams): TypeHierarchyItem[];
  diagnosticReport(params: DocumentDiagnosticParams): {
    readonly kind: 'full' | 'unchanged';
    readonly resultId: string;
    readonly items: Diagnostic[];
  };
  shutdown(): Promise<void>;
  dispose(): void;
}

const semanticTokenTypes = [
  'comment',
  'declaration',
  'identifier',
  'invalid',
  'keyword',
  'number',
  'operator',
  'punctuation',
  'string',
  'type',
  'component-region',
  'css-property',
  'css-selector',
  'css-value',
  'html-attribute',
  'html-tag',
  'markup-directive',
  'markup-interpolation',
  'markup-slot',
] as const;

const semanticTokensLegend: SemanticTokensLegend = {
  tokenTypes: [...semanticTokenTypes],
  tokenModifiers: [],
};

const defaultCapabilities: ServerCapabilities = {
  textDocumentSync: TextDocumentSyncKind.Incremental,
  completionProvider: { triggerCharacters: [' ', ':', '('] },
  hoverProvider: true,
  definitionProvider: true,
  declarationProvider: true,
  implementationProvider: true,
  referencesProvider: true,
  documentSymbolProvider: true,
  codeActionProvider: true,
  codeLensProvider: { resolveProvider: true },
  documentLinkProvider: { resolveProvider: false },
  colorProvider: true,
  documentFormattingProvider: true,
  documentRangeFormattingProvider: true,
  selectionRangeProvider: true,
  executeCommandProvider: { commands: ['flint.refreshWorkspace', 'flint.showReferences'] },
  callHierarchyProvider: true,
  linkedEditingRangeProvider: true,
  monikerProvider: true,
  typeHierarchyProvider: true,
  diagnosticProvider: { identifier: 'flint', interFileDependencies: true, workspaceDiagnostics: true },
  inlineCompletionProvider: {},
  foldingRangeProvider: true,
  inlineValueProvider: true,
  inlayHintProvider: { resolveProvider: true },
  renameProvider: true,
  semanticTokensProvider: {
    legend: semanticTokensLegend,
    full: { delta: true },
  },
  workspaceSymbolProvider: true,
  workspace: { workspaceFolders: { supported: true, changeNotifications: true } },
};

/** Instantiates a FlintLspServer backed by language service and workspace host. */
export function createFlintLspServer(options: FlintLspServerOptions = {}): FlintLspServer {
  let service = options.service;
  let host = options.workspaceHost;
  let workspaceSubscription: { dispose(): void } | undefined;
  let initialized = false;
  let disposed = false;
  let supportsWorkDoneProgress = false;
  let progressSequence = 0;
  const documents = new Map<string, FlintLspDocument>();
  const latestDocumentVersions = new Map<string, number>();
  let queue: Promise<void> = Promise.resolve();
  const publishDiagnostics = options.publishDiagnostics ?? (() => Promise.resolve());
  // skipcq: JS-D1001
  const emitProgress = (event: FlintLspProgressEvent): void => {
    if (!supportsWorkDoneProgress) return;
    options.progress?.(event);
  };
  // skipcq: JS-D1001
  const emitLog = (event: FlintLspLogEvent): void => {
    options.log?.(event);
  };
  // skipcq: JS-D1001
  const withProgress = async <T>(title: string, uri: string | undefined, operation: () => Promise<T>): Promise<T> => {
    const token = `flint/${++progressSequence}`;
    const data = uri === undefined ? undefined : { uri };
    emitLog({ level: 'info', event: 'workspace.refresh.begin', message: title, data });
    emitProgress({ token, kind: 'begin', title, percentage: 0 });
    try {
      const result = await operation();
      emitProgress({ token, kind: 'report', title, message: 'Workspace index refreshed.', percentage: 100 });
      emitLog({ level: 'info', event: 'workspace.refresh.end', message: title, data });
      return result;
    } catch (error: unknown) {
      emitLog({
        level: 'error',
        event: 'workspace.refresh.failure',
        message: error instanceof Error ? error.message : String(error),
        data,
      });
      throw error;
    } finally {
      emitProgress({ token, kind: 'end', title });
    }
  };

  // skipcq: JS-D1001
  const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
    const next = queue.then(operation, operation);
    queue = next.then(
      () => {
        /* no-op */
      },
      () => {
        /* no-op */
      },
    );
    return next;
  };
  // skipcq: JS-D1001
  const assertReady = (): FlintLanguageService => {
    if (disposed) throw new Error('Flint LSP server has been disposed.');
    if (!initialized || service === undefined) throw new Error('Flint LSP server is not initialized.');
    return service;
  };
  // skipcq: JS-D1001, JS-R1005
  const publish = async (uri: string, expectedVersion?: number): Promise<void> => {
    const languageService = assertReady();
    try {
      if (expectedVersion !== undefined && (latestDocumentVersions.get(uri) ?? expectedVersion) > expectedVersion) {
        return;
      }
      await withProgress('Refreshing Flint workspace', uri, () => languageService.refreshWorkspace(uri));
      if (expectedVersion !== undefined && (latestDocumentVersions.get(uri) ?? expectedVersion) > expectedVersion) {
        return;
      }
      const analysis = languageService.diagnose(uri);
      if (expectedVersion !== undefined && (latestDocumentVersions.get(uri) ?? expectedVersion) > expectedVersion) {
        return;
      }
      await publishDiagnostics(toPublishDiagnostics(analysis));
    } catch (error: unknown) {
      emitLog({
        level: 'error',
        event: 'diagnostics.failure',
        message: error instanceof Error ? error.message : String(error),
        data: { uri },
      });
      await publishDiagnostics({ uri, diagnostics: [] });
    }
  };
  // skipcq: JS-D1001
  const publishAll = async (): Promise<void> => {
    for (const uri of documents.keys()) await publish(uri);
  };
  // skipcq: JS-D1001
  const safeQuery = <T>(uri: string, fallback: T, operation: () => T): T => {
    try {
      return operation();
    } catch (error: unknown) {
      emitLog({
        level: 'error',
        event: 'query.failure',
        message: error instanceof Error ? error.message : String(error),
        data: { uri },
      });
      return fallback;
    }
  };
  let noHover: FlintHover | undefined;
  let noEdit: WorkspaceEdit | undefined;
  // skipcq: JS-D1001
  const queryLocations = (uri: string, operation: () => readonly FlintLocation[]): Location[] => {
    assertReady();
    if (!documents.has(uri)) return [];
    return safeQuery(uri, [], () => operation().map((location) => toLspLocation(location)));
  };

  return {
    /** Handles LSP initialize request and returns server capabilities. */
    // skipcq: JS-R1005
    initialize(params): InitializeResult {
      if (disposed) throw new Error('Flint LSP server has been disposed.');
      if (initialized) return { capabilities: defaultCapabilities };
      supportsWorkDoneProgress = params.capabilities?.window?.workDoneProgress === true;
      const roots = workspaceRoots(params);
      host ??=
        options.createWorkspaceHost?.(roots) ?? createFlintNodeWorkspaceHost({ roots, ...options.workspaceOptions });
      if (service === undefined) {
        service = createFlintLanguageService(host);
      }
      workspaceSubscription = host.watch?.((change) => {
        service?.invalidateWorkspace(change);
        enqueue(() => publishAll()).catch(() => {
          /* no-op */
        });
      });
      initialized = true;
      emitLog({ level: 'info', event: 'server.initialized', message: 'Flint LSP server initialized.' });
      return { capabilities: defaultCapabilities, serverInfo: { name: 'flint-lsp', version: '0.1.0' } };
    },
    /** Synchronizes an opened text document into the language service. */
    openDocument(document): Promise<void> {
      latestDocumentVersions.set(document.uri, document.version);
      return enqueue(async () => {
        const languageService = assertReady();
        documents.set(document.uri, document);
        languageService.openDocument(document);
        await publish(document.uri, document.version);
      });
    },
    /** Updates document content following incremental text changes. */
    updateDocument(document): Promise<void> {
      const languageService = assertReady();
      const previous = documents.get(document.uri);
      if (previous !== undefined && document.version <= previous.version) return Promise.resolve();
      documents.set(document.uri, document);
      languageService.updateDocument(document);
      const targetVersion = document.version;
      latestDocumentVersions.set(document.uri, targetVersion);
      return enqueue(async () => {
        if ((latestDocumentVersions.get(document.uri) ?? targetVersion) > targetVersion) return;
        await publish(document.uri, targetVersion);
      });
    },
    /** Applies ordered UTF-16 changes through the shared language-service contract. */
    updateDocumentChanges(document, changes): Promise<void> {
      const languageService = assertReady();
      const previous = documents.get(document.uri);
      if (previous !== undefined && document.version <= previous.version) return Promise.resolve();
      latestDocumentVersions.set(document.uri, document.version);
      return enqueue(async () => {
        const next = languageService.applyChanges(document.uri, document.version, changes);
        if (next === undefined) return;
        documents.set(document.uri, { ...document, text: next.text });
        await publish(document.uri, document.version);
      });
    },
    /** Cleans up language service state when a document is closed. */
    closeDocument(uri): Promise<void> {
      latestDocumentVersions.delete(uri);
      return enqueue(async () => {
        const languageService = assertReady();
        documents.delete(uri);
        languageService.closeDocument(uri);
        await publishDiagnostics({ uri, diagnostics: [] });
      });
    },
    /** Propagates filesystem file changes to the workspace host. */
    changeWatchedFiles(params): Promise<void> {
      return enqueue(async () => {
        const languageService = assertReady();
        for (const change of params.changes) {
          languageService.invalidateWorkspace({ uri: change.uri, kind: toWorkspaceChangeKind(change.type) });
        }
        await publishAll();
      });
    },
    /** Computes code completion items at the cursor position. */
    completion(params): CompletionItem[] {
      const languageService = assertReady();
      const document = documents.get(params.textDocument.uri);
      if (document === undefined) return [];
      return safeQuery(params.textDocument.uri, [], () =>
        languageService.complete(params.textDocument.uri, params.position).map((item) => ({
          label: item.label,
          kind: completionKind(item.kind),
          detail: item.detail,
          documentation: item.documentation,
          textEdit: TextEdit.replace(toLspRange(item.range), item.label),
        })),
      );
    },
    /** Computes hover documentation for the token under the cursor. */
    hover(params): Hover | undefined {
      const languageService = assertReady();
      if (!documents.has(params.textDocument.uri)) return undefined;
      const result = safeQuery(params.textDocument.uri, noHover, () =>
        languageService.hover(params.textDocument.uri, params.position),
      );
      if (result === undefined) return undefined;
      return {
        range: toLspRange(result.range),
        contents: { kind: MarkupKind.Markdown, value: result.contents.join('\n\n') },
      };
    },
    /** Resolves definition locations for the symbol at the requested position. */
    definition(params): Location[] {
      const languageService = assertReady();
      return queryLocations(params.textDocument.uri, () =>
        languageService.definition(params.textDocument.uri, params.position),
      );
    },
    /** Resolves declaration locations for the symbol at the requested position. */
    declaration(params): Location[] {
      const languageService = assertReady();
      return queryLocations(params.textDocument.uri, () =>
        languageService.declaration(params.textDocument.uri, params.position),
      );
    },
    /** Resolves implementation locations for interface or method symbols. */
    implementation(params): Location[] {
      const languageService = assertReady();
      return queryLocations(params.textDocument.uri, () =>
        languageService.implementation(params.textDocument.uri, params.position),
      );
    },
    /** Finds all references to the symbol at the requested position. */
    references(params): Location[] {
      const languageService = assertReady();
      return queryLocations(params.textDocument.uri, () =>
        languageService.references(params.textDocument.uri, params.position),
      );
    },
    /** Returns document symbol hierarchy for outline navigation. */
    documentSymbols(params): DocumentSymbol[] {
      const languageService = assertReady();
      if (!documents.has(params.textDocument.uri)) return [];
      return safeQuery(params.textDocument.uri, [], () =>
        languageService.documentSymbols(params.textDocument.uri).map((symbol) => toDocumentSymbol(symbol)),
      );
    },
    /**
     * Searches symbols across all indexed workspace documents.
     */
    workspaceSymbols(params: WorkspaceSymbolParams): SymbolInformation[] {
      const languageService = assertReady();
      const results = languageService.workspaceSymbols?.(params.query) ?? [];
      return results.map(({ symbol, uri: symbolUri }) => ({
        name: symbol.name,
        kind: symbolKind(symbol.kind),
        location: {
          uri: symbolUri,
          range: toLspRange(symbol.range),
        },
        ...(symbol.containerName === undefined ? {} : { containerName: symbol.containerName }),
      }));
    },
    /**
     * Computes quick-fix and refactoring code actions for diagnostics.
     */
    // skipcq: JS-R1005
    codeActions(params: CodeActionParams): CodeAction[] {
      assertReady();
      if (!documents.has(params.textDocument.uri)) return [];
      const actions: CodeAction[] = [];
      for (const diagnostic of params.context.diagnostics) {
        switch (diagnostic.code) {
          case 'FLINT-PARSE-017': {
            actions.push({
              title: 'Close parenthesis',
              kind: 'quickfix',
              diagnostics: [diagnostic],
              edit: {
                changes: {
                  [params.textDocument.uri]: [TextEdit.insert(diagnostic.range.end, ')')],
                },
              },
            });
            break;
          }
          case 'FLINT-PARSE-018': {
            actions.push({
              title: 'Close curly brace',
              kind: 'quickfix',
              diagnostics: [diagnostic],
              edit: {
                changes: {
                  [params.textDocument.uri]: [TextEdit.insert(diagnostic.range.end, '}')],
                },
              },
            });
            break;
          }
          case 'FLINT-PARSE-019': {
            actions.push({
              title: 'Close square bracket',
              kind: 'quickfix',
              diagnostics: [diagnostic],
              edit: {
                changes: {
                  [params.textDocument.uri]: [TextEdit.insert(diagnostic.range.end, ']')],
                },
              },
            });
            break;
          }
          default: {
            break;
          }
        }
        const hint = (diagnostic.data as { hint?: string } | undefined)?.hint;
        if (hint !== undefined && hint.length > 0 && diagnostic.code !== 'FLINT-PARSE-017') {
          actions.push({
            title: `Fix: ${hint}`,
            kind: 'quickfix',
            diagnostics: [diagnostic],
            edit: {
              changes: {
                [params.textDocument.uri]: [TextEdit.replace(diagnostic.range, '')],
              },
            },
          });
        }
      }
      return actions;
    },
    /** Computes actionable code lens commands for functions and modules. */
    codeLens(params): CodeLens[] {
      const languageService = assertReady();
      if (!documents.has(params.textDocument.uri)) return [];
      return safeQuery(params.textDocument.uri, [], () =>
        languageService.codeLenses(params.textDocument.uri).map((lens) => ({
          range: toLspRange(lens.range),
          command: {
            title: lens.title,
            command: 'flint.showReferences',
            arguments: [
              params.textDocument.uri,
              lens.range.start,
              languageService
                .references(params.textDocument.uri, lens.range.start)
                .map((location) => toLspLocation(location)),
            ],
          },
          data: { uri: params.textDocument.uri, providerData: lens.data },
        })),
      );
    },
    codeLensResolve(lens): CodeLens {
      const data = asProviderData(lens.data);
      if (data === undefined) return lens;
      const languageService = assertReady();
      const resolved = safeQuery(data.uri, undefined, () => {
        const sourceLens = languageService
          .codeLenses(data.uri)
          .find((candidate) => candidate.data === data.providerData);
        return sourceLens === undefined ? undefined : languageService.resolveCodeLens(data.uri, sourceLens);
      });
      return resolved === undefined ? lens : { ...lens, data: { uri: data.uri, providerData: resolved.data } };
    },
    /** Computes code folding ranges for functions, blocks, and imports. */
    foldingRanges(params): FoldingRange[] {
      const languageService = assertReady();
      if (!documents.has(params.textDocument.uri)) return [];
      return safeQuery(params.textDocument.uri, [], () =>
        languageService.foldingRanges(params.textDocument.uri).map((range) => ({
          startLine: range.range.start.line,
          startCharacter: range.range.start.character,
          endLine: range.range.end.line,
          endCharacter: range.range.end.character,
          kind: range.kind === 'region' ? 'region' : 'declaration',
        })),
      );
    },
    /** Computes inline variable values for debug visualization. */
    inlineValues(params): InlineValue[] {
      const languageService = assertReady();
      const document = documents.get(params.textDocument.uri);
      if (document === undefined) return [];
      return safeQuery(params.textDocument.uri, [], () =>
        languageService
          .inlineValues(params.textDocument.uri, fromLspRange(params.range, document.text))
          .map((value) => ({
            range: toLspRange(value.range),
            text: value.text,
          })),
      );
    },
    /** Computes parameter and type inlay hints for code display. */
    inlayHints(params): InlayHint[] {
      const languageService = assertReady();
      const document = documents.get(params.textDocument.uri);
      if (document === undefined) return [];
      return safeQuery(params.textDocument.uri, [], () =>
        languageService.inlayHints(params.textDocument.uri, fromLspRange(params.range, document.text)).map((hint) => ({
          position: hint.position,
          label: hint.label,
          kind: hint.kind === 'parameter' ? InlayHintKind.Parameter : InlayHintKind.Type,
          paddingLeft: hint.paddingLeft,
          paddingRight: hint.paddingRight,
          data: { uri: params.textDocument.uri, providerData: hint.data },
        })),
      );
    },
    inlayHintResolve(hint): InlayHint {
      const data = asProviderData(hint.data);
      if (data === undefined) return hint;
      const languageService = assertReady();
      const resolved = safeQuery(data.uri, undefined, () =>
        languageService.resolveInlayHint(data.uri, {
          position: hint.position,
          label: typeof hint.label === 'string' ? hint.label : '',
          kind: hint.kind === InlayHintKind.Parameter ? 'parameter' : 'type',
          data: data.providerData,
        }),
      );
      return resolved === undefined ? hint : { ...hint, data: { uri: data.uri, providerData: resolved.data } };
    },
    /** Performs symbol rename across all workspace documents. */
    rename(params): WorkspaceEdit | undefined {
      const languageService = assertReady();
      if (!documents.has(params.textDocument.uri)) return undefined;
      const result = safeQuery(params.textDocument.uri, noEdit, () => {
        const edit = languageService.rename(params.textDocument.uri, params.position, params.newName);
        // eslint-disable-next-line unicorn/no-useless-undefined
        if (edit === undefined) return undefined;
        // skipcq: JS-0045
        return {
          changes: Object.fromEntries(
            [...edit.changes].map(([targetUri, edits]) => [targetUri, edits.map((item) => toLspTextEdit(item))]),
          ),
        };
      });
      return result;
    },
    /** Computes semantic syntax highlighting tokens for a document. */
    semanticTokens(params): SemanticTokens {
      const languageService = assertReady();
      const document = documents.get(params.textDocument.uri);
      if (document === undefined) return { resultId: '', data: [] };
      return safeQuery(params.textDocument.uri, { resultId: '', data: [] }, () => {
        const tokens = languageService.semanticTokens(document.uri);
        return { resultId: tokens.resultId, data: [...tokens.data] };
      });
    },
    semanticTokensDelta(params): SemanticTokensDelta {
      const languageService = assertReady();
      const document = documents.get(params.textDocument.uri);
      if (document === undefined) return { resultId: '', edits: [] };
      return safeQuery(params.textDocument.uri, { resultId: '', edits: [] }, () => {
        const tokens = languageService.semanticTokens(document.uri, params.previousResultId);
        if (tokens.delta === undefined) return { resultId: tokens.resultId, edits: [] };
        return {
          resultId: tokens.resultId,
          edits: [{ start: tokens.delta.start, deleteCount: tokens.delta.deleteCount, data: [...tokens.delta.data] }],
        };
      });
    },
    documentLinks(params): DocumentLink[] {
      const languageService = assertReady();
      return safeQuery(params.textDocument.uri, [], () =>
        languageService.documentLinks(params.textDocument.uri).map((link) => ({
          range: toLspRange(link.range),
          target: link.target,
          tooltip: link.tooltip,
        })),
      );
    },
    colors(params): ColorInformation[] {
      const languageService = assertReady();
      return safeQuery(params.textDocument.uri, [], () =>
        languageService.colors(params.textDocument.uri).map((item) => ({
          range: toLspRange(item.range),
          color: item.color,
        })),
      );
    },
    colorPresentations(params): ColorPresentation[] {
      const languageService = assertReady();
      const color: FlintColor = {
        range: { start: params.range.start, end: params.range.end, startOffset: 0, endOffset: 0 },
        color: params.color,
      };
      return safeQuery(params.textDocument.uri, [], () =>
        languageService.colorPresentations(params.textDocument.uri, color).map((item) => ({
          label: item.label,
          textEdit: item.textEdit === undefined ? undefined : toLspTextEdit(item.textEdit),
        })),
      );
    },
    formatting(params): TextEdit[] {
      const languageService = assertReady();
      return safeQuery(params.textDocument.uri, [], () =>
        languageService.formatting(params.textDocument.uri).map(toLspTextEdit),
      );
    },
    rangeFormatting(params): TextEdit[] {
      const languageService = assertReady();
      return safeQuery(params.textDocument.uri, [], () =>
        languageService.formatting(params.textDocument.uri).map(toLspTextEdit),
      );
    },
    selectionRanges(params): SelectionRange[] {
      const languageService = assertReady();
      return safeQuery(params.textDocument.uri, [], () =>
        languageService.selectionRanges(params.textDocument.uri, params.positions).map((selection) => ({
          range: toLspRange(selection.range),
          parent: selection.parent === undefined ? undefined : { range: toLspRange(selection.parent.range) },
        })),
      );
    },
    executeCommand(params): null {
      const languageService = assertReady();
      safeQuery(params.arguments?.[0] && typeof params.arguments[0] === 'string' ? params.arguments[0] : '', [], () => {
        const uri = typeof params.arguments?.[0] === 'string' ? params.arguments[0] : '';
        const command: FlintCommand = { command: params.command, title: params.command, arguments: params.arguments };
        return languageService.executeCommand(uri, command);
      });
      return null;
    },
    prepareCallHierarchy(params): CallHierarchyItem[] {
      const languageService = assertReady();
      return safeQuery(params.textDocument.uri, [], () => {
        const item = languageService.prepareCallHierarchy(params.textDocument.uri, params.position);
        return item === undefined
          ? []
          : [
              {
                name: item.name,
                kind: SymbolKind.Function,
                uri: item.uri,
                range: toLspRange(item.range),
                selectionRange: toLspRange(item.selectionRange),
              },
            ];
      });
    },
    incomingCalls(params): CallHierarchyIncomingCall[] {
      const languageService = assertReady();
      const source = documents.get(params.item.uri)?.text ?? '';
      return safeQuery(params.item.uri, [], () =>
        languageService
          .incomingCalls({
            name: params.item.name,
            uri: params.item.uri,
            range: fromLspRange(params.item.range, source),
            selectionRange: fromLspRange(params.item.selectionRange, source),
          })
          .map((edge) => ({
            from: {
              name: edge.from.name,
              kind: SymbolKind.Function,
              uri: edge.from.uri,
              range: toLspRange(edge.from.range),
              selectionRange: toLspRange(edge.from.selectionRange),
            },
            fromRanges: edge.fromRanges.map((range) => toLspRange(range)),
          })),
      );
    },
    outgoingCalls(params): CallHierarchyOutgoingCall[] {
      const languageService = assertReady();
      const source = documents.get(params.item.uri)?.text ?? '';
      return safeQuery(params.item.uri, [], () =>
        languageService
          .outgoingCalls({
            name: params.item.name,
            uri: params.item.uri,
            range: fromLspRange(params.item.range, source),
            selectionRange: fromLspRange(params.item.selectionRange, source),
          })
          .map((edge) => ({
            to: {
              name: edge.to.name,
              kind: SymbolKind.Function,
              uri: edge.to.uri,
              range: toLspRange(edge.to.range),
              selectionRange: toLspRange(edge.to.selectionRange),
            },
            fromRanges: edge.fromRanges.map((range) => toLspRange(range)),
          })),
      );
    },
    linkedEditingRanges(params): LinkedEditingRanges | null {
      const languageService = assertReady();
      return safeQuery(params.textDocument.uri, null, () => {
        const result = languageService.linkedEditingRanges(params.textDocument.uri, params.position);
        return result === undefined ? null : { ranges: result.ranges.map(toLspRange), wordPattern: result.wordPattern };
      });
    },
    monikers(params): Moniker[] {
      const languageService = assertReady();
      return safeQuery(params.textDocument.uri, [], () =>
        languageService.monikers(params.textDocument.uri, params.position).map((item) => ({
          scheme: item.scheme,
          identifier: item.identifier,
          unique: item.unique as Moniker['unique'],
        })),
      );
    },
    inlineCompletions(params): InlineCompletionItem[] {
      const languageService = assertReady();
      return safeQuery(params.textDocument.uri, [], () =>
        languageService.inlineCompletions(params.textDocument.uri, params.position).map((item) => ({
          insertText: item.insertText,
          range: item.range === undefined ? undefined : toLspRange(item.range),
        })),
      );
    },
    prepareTypeHierarchy(_params): TypeHierarchyItem[] {
      return [];
    },
    typeHierarchySubtypes(_params): TypeHierarchyItem[] {
      return [];
    },
    typeHierarchySupertypes(_params): TypeHierarchyItem[] {
      return [];
    },
    diagnosticReport(params): {
      readonly kind: 'full' | 'unchanged';
      readonly resultId: string;
      readonly items: Diagnostic[];
    } {
      const languageService = assertReady();
      return safeQuery(params.textDocument.uri, { kind: 'full', resultId: '', items: [] }, () => {
        const report = languageService.diagnosticReport(params.textDocument.uri, params.previousResultId);
        return {
          kind: report.kind,
          resultId: report.resultId,
          items: report.items.map((item) => ({
            range: toLspRange(item.range),
            severity: diagnosticSeverity(item.severity),
            code: item.code,
            source: 'flint',
            message: item.message,
          })),
        };
      });
    },
    /**
     * Prepares the language server for process shutdown.
     */
    async shutdown(): Promise<void> {
      await queue;
      this.dispose();
    },
    /** Releases all language server resources and watchers. */
    dispose(): void {
      if (disposed) return;
      disposed = true;
      emitLog({ level: 'info', event: 'server.disposed', message: 'Flint LSP server disposed.' });
      workspaceSubscription?.dispose();
      service?.dispose();
      documents.clear();
    },
  } satisfies FlintLspServer;
}

/** Binds Flint language server request and notification handlers to a connection. */
export function registerFlintLsp(connection: Connection, options: FlintLspServerOptions = {}): FlintLspServer {
  const documents = new TextDocuments(TextDocument);
  let clientSupportsWorkDoneProgress = false;
  const progressReporters = new Map<string, ProgressState>();
  // skipcq: JS-D1001
  const queueProgressEvent = (event: FlintLspProgressEvent): void => {
    if (!clientSupportsWorkDoneProgress) return;
    if (event.kind === 'begin') {
      const state: ProgressState = { ready: Promise.resolve() };
      state.ready = connection.window
        .createWorkDoneProgress()
        .then((reporter) => {
          state.reporter = reporter;
          sendProgressEvent(state, event);
        })
        .catch(() => {
          progressReporters.delete(event.token);
        });
      progressReporters.set(event.token, state);
      return;
    }
    const state = progressReporters.get(event.token);
    if (state === undefined) return;
    state.ready = state.ready
      .then(() => sendProgressEvent(state, event))
      .catch(() => {
        /* no-op */
      })
      .finally(() => {
        if (event.kind === 'end') {
          state.finished = true;
          progressReporters.delete(event.token);
        }
      });
  };
  const server = createFlintLspServer({
    ...options,
    publishDiagnostics: (params) => connection.sendDiagnostics(params),
    progress: (event) => {
      options.progress?.(event);
      queueProgressEvent(event);
    },
    log: (event) => {
      options.log?.(event);
      return connection.sendNotification('window/logMessage', {
        type: event.level === 'error' ? 1 : event.level === 'warning' ? 2 : 3,
        message: `${event.event}: ${event.message}${event.data === undefined ? '' : ` ${JSON.stringify(event.data)}`}`,
      });
    },
  });
  const dispose = server.dispose.bind(server);
  server.dispose = (): void => {
    for (const [token, state] of progressReporters) {
      state.ready = state.ready
        .then(() => {
          if (state.finished) return;
          sendProgressEvent(state, { token, kind: 'end', title: 'Flint workspace refresh' });
          state.finished = true;
        })
        .catch(() => {
          /* no-op */
        });
    }
    progressReporters.clear();
    dispose();
  };
  connection.onInitialize((params) => {
    clientSupportsWorkDoneProgress = params.capabilities?.window?.workDoneProgress === true;
    return server.initialize(params);
  });
  documents.onDidOpen(({ document }) => {
    server.openDocument(toDocument(document)).catch(() => {
      /* no-op */
    });
  });
  documents.onDidChangeContent(({ document }) => {
    server.updateDocument(toDocument(document)).catch(() => {
      /* no-op */
    });
  });
  connection.onDidChangeTextDocument((params: DidChangeTextDocumentParams) => {
    const document = documents.get(params.textDocument.uri);
    const version = params.textDocument.version ?? (document?.version ?? 0) + 1;
    const changes = params.contentChanges as readonly FlintContentChange[];
    server
      .updateDocumentChanges(
        {
          uri: params.textDocument.uri,
          version,
          text: document?.getText() ?? '',
          fileName: params.textDocument.uri,
        },
        changes,
      )
      .catch(() => {
        /* no-op */
      });
  });
  documents.onDidClose(({ document }) => {
    server.closeDocument(document.uri).catch(() => {
      /* no-op */
    });
  });
  connection.onDidChangeWatchedFiles((params) => {
    server.changeWatchedFiles(params).catch(() => {
      /* no-op */
    });
  });
  connection.onCompletion((params) => server.completion(params));
  connection.onHover((params) => server.hover(params));
  connection.onDefinition((params) => server.definition(params));
  connection.onDeclaration((params) => server.declaration(params));
  connection.onImplementation((params) => server.implementation(params));
  connection.onReferences((params) => server.references(params));
  connection.onDocumentSymbol((params) => server.documentSymbols(params));
  connection.onWorkspaceSymbol((params) => server.workspaceSymbols?.(params) ?? []);
  connection.onCodeAction((params) => server.codeActions?.(params) ?? []);
  connection.onCodeLens((params) => server.codeLens(params));
  connection.onCodeLensResolve((lens) => server.codeLensResolve(lens));
  connection.onFoldingRanges((params) => server.foldingRanges(params));
  connection.onRequest('textDocument/inlineValue', (params: InlineValueParams) => server.inlineValues(params));
  connection.onRequest('textDocument/inlayHint', (params: InlayHintParams) => server.inlayHints(params));
  connection.onRequest('inlayHint/resolve', (hint: InlayHint) => server.inlayHintResolve(hint));
  connection.onRenameRequest((params) => server.rename(params));
  connection.onRequest('textDocument/semanticTokens/full', (params: SemanticTokensParams) =>
    server.semanticTokens(params),
  );
  connection.onRequest('textDocument/semanticTokens/full/delta', (params: SemanticTokensDeltaParams) =>
    server.semanticTokensDelta(params),
  );
  connection.onRequest('textDocument/documentLink', (params: DocumentLinkParams) => server.documentLinks(params));
  connection.onRequest('textDocument/documentColor', (params: DocumentColorParams) => server.colors(params));
  connection.onRequest('textDocument/colorPresentation', (params: ColorPresentationParams) =>
    server.colorPresentations(params),
  );
  connection.onRequest('textDocument/formatting', (params: DocumentFormattingParams) => server.formatting(params));
  connection.onRequest('textDocument/rangeFormatting', (params: DocumentRangeFormattingParams) =>
    server.rangeFormatting(params),
  );
  connection.onRequest('textDocument/selectionRange', (params: SelectionRangeParams) => server.selectionRanges(params));
  connection.onRequest('workspace/executeCommand', (params: ExecuteCommandParams) => server.executeCommand(params));
  connection.onRequest('textDocument/prepareCallHierarchy', (params: CallHierarchyPrepareParams) =>
    server.prepareCallHierarchy(params),
  );
  connection.onRequest('callHierarchy/incomingCalls', (params: CallHierarchyIncomingCallsParams) =>
    server.incomingCalls(params),
  );
  connection.onRequest('callHierarchy/outgoingCalls', (params: CallHierarchyOutgoingCallsParams) =>
    server.outgoingCalls(params),
  );
  connection.onRequest('textDocument/linkedEditingRange', (params: LinkedEditingRangeParams) =>
    server.linkedEditingRanges(params),
  );
  connection.onRequest('textDocument/moniker', (params: MonikerParams) => server.monikers(params));
  connection.onRequest('textDocument/inlineCompletion', (params: InlineCompletionParams) =>
    server.inlineCompletions(params),
  );
  connection.onRequest('textDocument/prepareTypeHierarchy', (params: TypeHierarchyPrepareParams) =>
    server.prepareTypeHierarchy(params),
  );
  connection.onRequest('typeHierarchy/subtypes', (params: TypeHierarchySubtypesParams) =>
    server.typeHierarchySubtypes(params),
  );
  connection.onRequest('typeHierarchy/supertypes', (params: TypeHierarchySupertypesParams) =>
    server.typeHierarchySupertypes(params),
  );
  connection.onRequest('textDocument/diagnostic', (params: DocumentDiagnosticParams) =>
    server.diagnosticReport(params),
  );
  connection.onRequest('workspace/diagnostic', () => ({ items: [] }));
  connection.onShutdown(() => server.shutdown());
  connection.onExit(() => server.dispose());
  documents.listen(connection);
  return server;
}

/** Converts an LSP text document item into a FlintLspDocument. */
function toDocument(document: TextDocument): FlintLspDocument {
  return { uri: document.uri, version: document.version, text: document.getText(), fileName: document.uri };
}

interface ProviderData {
  readonly uri: string;
  readonly providerData?: string;
}

function asProviderData(value: unknown): ProviderData | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const candidate = value as { uri?: unknown; providerData?: unknown };
  return typeof candidate.uri === 'string' &&
    (candidate.providerData === undefined || typeof candidate.providerData === 'string')
    ? { uri: candidate.uri, ...(candidate.providerData === undefined ? {} : { providerData: candidate.providerData }) }
    : undefined;
}

/** Converts a Flint source location into an LSP Location object. */
function toLspLocation(location: FlintLocation): Location {
  return { uri: location.uri, range: toLspRange(location.range) };
}

/** Converts a Flint symbol into an LSP DocumentSymbol. */
function toDocumentSymbol(symbol: FlintDocumentSymbol): DocumentSymbol {
  return {
    name: symbol.name,
    detail: symbol.detail,
    kind: symbolKind(symbol.kind),
    range: toLspRange(symbol.range),
    selectionRange: toLspRange(symbol.selectionRange),
    children: symbol.children.map((child) => toDocumentSymbol(child)),
  };
}

/** Maps a Flint symbol kind to its LSP SymbolKind enum value. */
// skipcq: JS-R1005
function symbolKind(kind: FlintSymbolKind): SymbolKind {
  return kind === 'module'
    ? SymbolKind.Namespace
    : kind === 'function'
      ? SymbolKind.Function
      : kind === 'parameter'
        ? SymbolKind.Variable
        : kind === 'local'
          ? SymbolKind.Variable
          : kind === 'capability'
            ? SymbolKind.Field
            : SymbolKind.TypeParameter;
}

/** Extracts normalized workspace root URIs from initialization parameters. */
// skipcq: JS-R1005
function workspaceRoots(params: InitializeParams): readonly string[] {
  if (params.workspaceFolders !== undefined && params.workspaceFolders !== null && params.workspaceFolders.length > 0)
    return params.workspaceFolders.map((folder) => folder.uri);
  if (params.rootUri !== undefined && params.rootUri !== null) return [params.rootUri];
  return [];
}

/** Converts Flint compiler diagnostics into LSP PublishDiagnosticsParams. */
function toPublishDiagnostics(analysis: FlintAnalysis): PublishDiagnosticsParams {
  return {
    uri: analysis.uri,
    diagnostics: analysis.diagnostics.map((diagnostic): Diagnostic => ({
      range: toLspRange(diagnostic.range),
      severity: diagnosticSeverity(diagnostic.severity),
      code: diagnostic.code,
      source: 'flint',
      message: diagnostic.message,
      data: {
        phase: diagnostic.phase,
        hint: diagnostic.hint,
        fileName: diagnostic.fileName,
        ruleId: diagnostic.ruleId,
        category: diagnostic.category,
        blocking: diagnostic.blocking,
        evidence: diagnostic.evidence,
        owasp: diagnostic.owasp,
        cwe: diagnostic.cwe,
      },
    })),
  };
}

/** Converts a Flint source span into an LSP Range. */
function toLspRange(range: { start: { line: number; character: number }; end: { line: number; character: number } }) {
  return { start: range.start, end: range.end };
}

/** Converts an LSP Range into a 0-based Flint source range. */
function fromLspRange(
  range: { start: { line: number; character: number }; end: { line: number; character: number } },
  source: string,
): FlintRange {
  const document = TextDocument.create('file:///flint-range.flint', 'flint', 0, source);
  return {
    start: range.start,
    end: range.end,
    startOffset: document.offsetAt(range.start),
    endOffset: document.offsetAt(range.end),
  };
}

/** Converts a Flint text edit into an LSP TextEdit. */
function toLspTextEdit(edit: FlintTextEdit): { range: ReturnType<typeof toLspRange>; newText: string } {
  return { range: toLspRange(edit.range), newText: edit.newText };
}

/** Maps a Flint diagnostic severity to an LSP DiagnosticSeverity. */
function diagnosticSeverity(severity: 'error' | 'warning' | 'info'): DiagnosticSeverity {
  return severity === 'error'
    ? DiagnosticSeverity.Error
    : severity === 'warning'
      ? DiagnosticSeverity.Warning
      : DiagnosticSeverity.Information;
}

/** Maps a Flint completion item kind to an LSP CompletionItemKind. */
function completionKind(kind: string): CompletionItemKind {
  return kind === 'keyword'
    ? CompletionItemKind.Keyword
    : kind === 'type'
      ? CompletionItemKind.TypeParameter
      : kind === 'function'
        ? CompletionItemKind.Function
        : kind === 'capability'
          ? CompletionItemKind.Reference
          : CompletionItemKind.Variable;
}

/** Maps an LSP FileChangeType to a Flint workspace change kind. */
function toWorkspaceChangeKind(type: FileChangeType): FlintWorkspaceChange['kind'] {
  return type === FileChangeType.Created ? 'created' : type === FileChangeType.Deleted ? 'deleted' : 'changed';
}
