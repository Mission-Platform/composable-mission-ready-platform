/* eslint-disable unicorn/prevent-abbreviations */
import {
  createForgeWebScriptLanguageService,
  type ForgeWebScriptAnalysis,
  type ForgeWebScriptLanguageService,
  type ForgeWebScriptDocumentSymbol,
  type ForgeWebScriptHover,
  type ForgeWebScriptLocation,
  type ForgeWebScriptRange,
  type ForgeWebScriptSymbolKind,
  type ForgeWebScriptTextEdit,
  type ForgeWebScriptTokenClassification,
  type ForgeWebScriptWorkspaceOptions,
  type ForgeWebScriptWorkspaceChange,
  type ForgeWebScriptWorkspaceHost,
} from '@mission-platform/forge-web-script-language-service';
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
  type CompletionItem,
  type CompletionParams,
  type CodeLens,
  type CodeLensParams,
  type Connection,
  type DeclarationParams,
  type Diagnostic,
  type DidChangeWatchedFilesParams,
  type DocumentSymbol,
  type DocumentSymbolParams,
  type FoldingRange,
  type FoldingRangeParams,
  type Hover,
  type HoverParams,
  type DefinitionParams,
  type ImplementationParams,
  type InlineValue,
  type InlineValueParams,
  type InlayHint,
  type InlayHintParams,
  type InitializeParams,
  type InitializeResult,
  type PublishDiagnosticsParams,
  type ReferenceParams,
  type RenameParams,
  type SemanticTokens,
  type SemanticTokensParams,
  type SemanticTokensLegend,
  type ServerCapabilities,
  type Location,
  type WorkspaceEdit,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { createForgeWebScriptNodeWorkspaceHost } from './workspace.js';

export interface ForgeWebScriptLspServerOptions {
  readonly service?: ForgeWebScriptLanguageService;
  readonly workspaceHost?: ForgeWebScriptWorkspaceHost;
  readonly workspaceOptions?: ForgeWebScriptWorkspaceOptions;
  readonly createWorkspaceHost?: (roots: readonly string[]) => ForgeWebScriptWorkspaceHost;
  readonly publishDiagnostics?: (params: PublishDiagnosticsParams) => Promise<void> | void;
  readonly progress?: (event: ForgeWebScriptLspProgressEvent) => Promise<void> | void;
  readonly log?: (event: ForgeWebScriptLspLogEvent) => Promise<void> | void;
}

export interface ForgeWebScriptLspProgressEvent {
  readonly token: string;
  readonly kind: 'begin' | 'report' | 'end';
  readonly title: string;
  readonly message?: string;
  readonly percentage?: number;
}

export interface ForgeWebScriptLspLogEvent {
  readonly level: 'info' | 'warning' | 'error';
  readonly event: string;
  readonly message: string;
  readonly data?: Readonly<Record<string, unknown>>;
}

export interface ForgeWebScriptLspDocument {
  readonly uri: string;
  readonly version: number;
  readonly text: string;
  readonly fileName?: string;
}

export interface ForgeWebScriptLspServer {
  initialize(params: InitializeParams): InitializeResult;
  openDocument(document: ForgeWebScriptLspDocument): Promise<void>;
  updateDocument(document: ForgeWebScriptLspDocument): Promise<void>;
  closeDocument(uri: string): Promise<void>;
  changeWatchedFiles(params: DidChangeWatchedFilesParams): Promise<void>;
  completion(params: CompletionParams): CompletionItem[];
  hover(params: HoverParams): Hover | undefined;
  definition(params: DefinitionParams): Location[];
  declaration(params: DeclarationParams): Location[];
  implementation(params: ImplementationParams): Location[];
  references(params: ReferenceParams): Location[];
  documentSymbols(params: DocumentSymbolParams): DocumentSymbol[];
  codeLens(params: CodeLensParams): CodeLens[];
  foldingRanges(params: FoldingRangeParams): FoldingRange[];
  inlineValues(params: InlineValueParams): InlineValue[];
  inlayHints(params: InlayHintParams): InlayHint[];
  rename(params: RenameParams): WorkspaceEdit | undefined;
  semanticTokens(params: SemanticTokensParams): SemanticTokens;
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
] as const;

const semanticTokenTypeIndexes = new Map(semanticTokenTypes.map((type, index) => [type, index]));

const semanticTokensLegend: SemanticTokensLegend = {
  tokenTypes: [...semanticTokenTypes],
  tokenModifiers: [],
};

const defaultCapabilities: ServerCapabilities = {
  textDocumentSync: TextDocumentSyncKind.Full,
  completionProvider: { triggerCharacters: [' ', ':', '('] },
  hoverProvider: true,
  definitionProvider: true,
  declarationProvider: true,
  implementationProvider: true,
  referencesProvider: true,
  documentSymbolProvider: true,
  codeLensProvider: { resolveProvider: false },
  foldingRangeProvider: true,
  inlineValueProvider: true,
  inlayHintProvider: { resolveProvider: false },
  renameProvider: true,
  semanticTokensProvider: {
    legend: semanticTokensLegend,
    full: true,
  },
  workspaceSymbolProvider: false,
  workspace: { workspaceFolders: { supported: true, changeNotifications: true } },
};

export function createForgeWebScriptLspServer(options: ForgeWebScriptLspServerOptions = {}): ForgeWebScriptLspServer {
  let service = options.service;
  let host = options.workspaceHost;
  let workspaceSubscription: { dispose(): void } | undefined;
  let initialized = false;
  let disposed = false;
  let supportsWorkDoneProgress = false;
  let progressSequence = 0;
  const documents = new Map<string, ForgeWebScriptLspDocument>();
  let queue: Promise<void> = Promise.resolve();
  const publishDiagnostics = options.publishDiagnostics ?? (() => Promise.resolve());
  const emitProgress = (event: ForgeWebScriptLspProgressEvent): void => {
    if (!supportsWorkDoneProgress) return;
    void options.progress?.(event);
  };
  const emitLog = (event: ForgeWebScriptLspLogEvent): void => {
    void options.log?.(event);
  };
  const withProgress = async <T>(title: string, uri: string | undefined, operation: () => Promise<T>): Promise<T> => {
    const token = `forge-web-script/${++progressSequence}`;
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

  const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
    const next = queue.then(operation, operation);
    queue = next.then(
      () => void 0,
      () => void 0,
    );
    return next;
  };
  const assertReady = (): ForgeWebScriptLanguageService => {
    if (disposed) throw new Error('Forge Web Script LSP server has been disposed.');
    if (!initialized || service === undefined) throw new Error('Forge Web Script LSP server is not initialized.');
    return service;
  };
  const publish = async (uri: string): Promise<void> => {
    const languageService = assertReady();
    try {
      await withProgress('Refreshing Forge Web Script workspace', uri, () => languageService.refreshWorkspace(uri));
      const analysis = languageService.diagnose(uri);
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
  const publishAll = async (): Promise<void> => {
    for (const uri of documents.keys()) await publish(uri);
  };
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
  let noHover: ForgeWebScriptHover | undefined;
  let noEdit: WorkspaceEdit | undefined;
  const queryLocations = (uri: string, operation: () => readonly ForgeWebScriptLocation[]): Location[] => {
    assertReady();
    if (!documents.has(uri)) return [];
    return safeQuery(uri, [], () => operation().map((location) => toLspLocation(location)));
  };

  return {
    initialize(params): InitializeResult {
      if (disposed) throw new Error('Forge Web Script LSP server has been disposed.');
      if (initialized) return { capabilities: defaultCapabilities };
      supportsWorkDoneProgress = params.capabilities?.window?.workDoneProgress === true;
      const roots = workspaceRoots(params);
      host ??=
        options.createWorkspaceHost?.(roots) ??
        createForgeWebScriptNodeWorkspaceHost({ roots, ...options.workspaceOptions });
      if (service === undefined) {
        service = createForgeWebScriptLanguageService(host);
      }
      workspaceSubscription = host.watch?.((change) => {
        service?.invalidateWorkspace(change);
        void enqueue(() => publishAll());
      });
      initialized = true;
      emitLog({ level: 'info', event: 'server.initialized', message: 'Forge Web Script LSP server initialized.' });
      return { capabilities: defaultCapabilities, serverInfo: { name: 'forge-web-script-lsp', version: '0.1.0' } };
    },
    openDocument(document): Promise<void> {
      return enqueue(async () => {
        const languageService = assertReady();
        documents.set(document.uri, document);
        languageService.openDocument(document);
        await publish(document.uri);
      });
    },
    updateDocument(document): Promise<void> {
      return enqueue(async () => {
        const languageService = assertReady();
        const previous = documents.get(document.uri);
        if (previous !== undefined && document.version < previous.version) return;
        documents.set(document.uri, document);
        languageService.updateDocument(document);
        await publish(document.uri);
      });
    },
    closeDocument(uri): Promise<void> {
      return enqueue(async () => {
        const languageService = assertReady();
        documents.delete(uri);
        languageService.closeDocument(uri);
        await publishDiagnostics({ uri, diagnostics: [] });
      });
    },
    changeWatchedFiles(params): Promise<void> {
      return enqueue(async () => {
        const languageService = assertReady();
        for (const change of params.changes) {
          languageService.invalidateWorkspace({ uri: change.uri, kind: toWorkspaceChangeKind(change.type) });
        }
        await publishAll();
      });
    },
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
    hover(params): Hover | undefined {
      const languageService = assertReady();
      if (!documents.has(params.textDocument.uri)) return undefined;
      const result = safeQuery(params.textDocument.uri, noHover, () =>
        languageService.hover(params.textDocument.uri, params.position),
      );
      if (result === undefined) return;
      return {
        range: toLspRange(result.range),
        contents: { kind: MarkupKind.Markdown, value: result.contents.join('\n\n') },
      };
    },
    definition(params): Location[] {
      const languageService = assertReady();
      return queryLocations(params.textDocument.uri, () =>
        languageService.definition(params.textDocument.uri, params.position),
      );
    },
    declaration(params): Location[] {
      const languageService = assertReady();
      return queryLocations(params.textDocument.uri, () =>
        languageService.declaration(params.textDocument.uri, params.position),
      );
    },
    implementation(params): Location[] {
      const languageService = assertReady();
      return queryLocations(params.textDocument.uri, () =>
        languageService.implementation(params.textDocument.uri, params.position),
      );
    },
    references(params): Location[] {
      const languageService = assertReady();
      return queryLocations(params.textDocument.uri, () =>
        languageService.references(params.textDocument.uri, params.position),
      );
    },
    documentSymbols(params): DocumentSymbol[] {
      const languageService = assertReady();
      if (!documents.has(params.textDocument.uri)) return [];
      return safeQuery(params.textDocument.uri, [], () =>
        languageService.documentSymbols(params.textDocument.uri).map((symbol) => toDocumentSymbol(symbol)),
      );
    },
    codeLens(params): CodeLens[] {
      const languageService = assertReady();
      if (!documents.has(params.textDocument.uri)) return [];
      return safeQuery(params.textDocument.uri, [], () =>
        languageService.codeLenses(params.textDocument.uri).map((lens) => ({
          range: toLspRange(lens.range),
          command: {
            title: lens.title,
            command: 'forge-web-script.showReferences',
            arguments: [
              params.textDocument.uri,
              lens.range.start,
              languageService
                .references(params.textDocument.uri, lens.range.start)
                .map((location) => toLspLocation(location)),
            ],
          },
        })),
      );
    },
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
        })),
      );
    },
    rename(params): WorkspaceEdit | undefined {
      const languageService = assertReady();
      if (!documents.has(params.textDocument.uri)) return undefined;
      const result = safeQuery(params.textDocument.uri, noEdit, () => {
        const edit = languageService.rename(params.textDocument.uri, params.position, params.newName);
        if (edit === undefined) return;
        return {
          changes: Object.fromEntries(
            [...edit.changes].map(([targetUri, edits]) => [targetUri, edits.map((item) => toLspTextEdit(item))]),
          ),
        };
      });
      return result;
    },
    semanticTokens(params): SemanticTokens {
      const languageService = assertReady();
      const document = documents.get(params.textDocument.uri);
      if (document === undefined) return { data: [] };
      return safeQuery(params.textDocument.uri, { data: [] }, () => ({
        data: encodeSemanticTokens(languageService.tokenize(document.uri), document.text),
      }));
    },
    async shutdown(): Promise<void> {
      await queue;
      this.dispose();
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      emitLog({ level: 'info', event: 'server.disposed', message: 'Forge Web Script LSP server disposed.' });
      workspaceSubscription?.dispose();
      service?.dispose();
      documents.clear();
    },
  } satisfies ForgeWebScriptLspServer;
}

export function registerForgeWebScriptLsp(
  connection: Connection,
  options: ForgeWebScriptLspServerOptions = {},
): ForgeWebScriptLspServer {
  const documents = new TextDocuments(TextDocument);
  let clientSupportsWorkDoneProgress = false;
  type WorkDoneProgressReporter = Awaited<ReturnType<Connection['window']['createWorkDoneProgress']>>;
  interface ProgressState {
    reporter?: WorkDoneProgressReporter;
    finished?: boolean;
    ready: Promise<void>;
  }
  const progressReporters = new Map<string, ProgressState>();
  const sendProgressEvent = (state: ProgressState, event: ForgeWebScriptLspProgressEvent): void => {
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
  };
  const queueProgressEvent = (event: ForgeWebScriptLspProgressEvent): void => {
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
      .catch(() => void 0)
      .finally(() => {
        if (event.kind === 'end') {
          state.finished = true;
          progressReporters.delete(event.token);
        }
      });
  };
  const server = createForgeWebScriptLspServer({
    ...options,
    publishDiagnostics: (params) => connection.sendDiagnostics(params),
    progress: async (event) => {
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
          sendProgressEvent(state, { token, kind: 'end', title: 'Forge Web Script workspace refresh' });
          state.finished = true;
        })
        .catch(() => void 0);
    }
    progressReporters.clear();
    dispose();
  };
  connection.onInitialize((params) => {
    clientSupportsWorkDoneProgress = params.capabilities?.window?.workDoneProgress === true;
    return server.initialize(params);
  });
  documents.onDidOpen(({ document }) => void server.openDocument(toDocument(document)));
  documents.onDidChangeContent(({ document }) => void server.updateDocument(toDocument(document)));
  documents.onDidClose(({ document }) => void server.closeDocument(document.uri));
  connection.onDidChangeWatchedFiles((params) => void server.changeWatchedFiles(params));
  connection.onCompletion((params) => server.completion(params));
  connection.onHover((params) => server.hover(params));
  connection.onDefinition((params) => server.definition(params));
  connection.onDeclaration((params) => server.declaration(params));
  connection.onImplementation((params) => server.implementation(params));
  connection.onReferences((params) => server.references(params));
  connection.onDocumentSymbol((params) => server.documentSymbols(params));
  connection.onCodeLens((params) => server.codeLens(params));
  connection.onFoldingRanges((params) => server.foldingRanges(params));
  connection.onRequest('textDocument/inlineValue', (params: InlineValueParams) => server.inlineValues(params));
  connection.onRequest('textDocument/inlayHint', (params: InlayHintParams) => server.inlayHints(params));
  connection.onRenameRequest((params) => server.rename(params));
  connection.onRequest('textDocument/semanticTokens/full', (params: SemanticTokensParams) =>
    server.semanticTokens(params),
  );
  connection.onShutdown(() => server.shutdown());
  connection.onExit(() => server.dispose());
  documents.listen(connection);
  return server;
}

function toDocument(document: TextDocument): ForgeWebScriptLspDocument {
  return { uri: document.uri, version: document.version, text: document.getText(), fileName: document.uri };
}

function toLspLocation(location: ForgeWebScriptLocation): Location {
  return { uri: location.uri, range: toLspRange(location.range) };
}

function toDocumentSymbol(symbol: ForgeWebScriptDocumentSymbol): DocumentSymbol {
  return {
    name: symbol.name,
    detail: symbol.detail,
    kind: symbolKind(symbol.kind),
    range: toLspRange(symbol.range),
    selectionRange: toLspRange(symbol.selectionRange),
    children: symbol.children.map((child) => toDocumentSymbol(child)),
  };
}

function symbolKind(kind: ForgeWebScriptSymbolKind): SymbolKind {
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

function workspaceRoots(params: InitializeParams): readonly string[] {
  if (params.workspaceFolders !== undefined && params.workspaceFolders !== null && params.workspaceFolders.length > 0)
    return params.workspaceFolders.map((folder) => folder.uri);
  if (params.rootUri !== undefined && params.rootUri !== null) return [params.rootUri];
  return [];
}

function toPublishDiagnostics(analysis: ForgeWebScriptAnalysis): PublishDiagnosticsParams {
  return {
    uri: analysis.uri,
    diagnostics: analysis.diagnostics.map((diagnostic): Diagnostic => ({
      range: toLspRange(diagnostic.range),
      severity: diagnosticSeverity(diagnostic.severity),
      code: diagnostic.code,
      source: 'forge-web-script',
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

function toLspRange(range: { start: { line: number; character: number }; end: { line: number; character: number } }) {
  return { start: range.start, end: range.end };
}

function fromLspRange(
  range: { start: { line: number; character: number }; end: { line: number; character: number } },
  source: string,
): ForgeWebScriptRange {
  const document = TextDocument.create('file:///forge-web-script-range.fws', 'fws', 0, source);
  return {
    start: range.start,
    end: range.end,
    startOffset: document.offsetAt(range.start),
    endOffset: document.offsetAt(range.end),
  };
}

function toLspTextEdit(edit: ForgeWebScriptTextEdit): { range: ReturnType<typeof toLspRange>; newText: string } {
  return { range: toLspRange(edit.range), newText: edit.newText };
}

function diagnosticSeverity(severity: 'error' | 'warning' | 'info'): DiagnosticSeverity {
  return severity === 'error'
    ? DiagnosticSeverity.Error
    : severity === 'warning'
      ? DiagnosticSeverity.Warning
      : DiagnosticSeverity.Information;
}

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

function toWorkspaceChangeKind(type: FileChangeType): ForgeWebScriptWorkspaceChange['kind'] {
  return type === FileChangeType.Created ? 'created' : type === FileChangeType.Deleted ? 'deleted' : 'changed';
}

function encodeSemanticTokens(tokens: readonly ForgeWebScriptTokenClassification[], source: string): number[] {
  const data: number[] = [];
  let previousLine = 0;
  let previousCharacter = 0;

  for (const token of tokens) {
    const tokenType = semanticTokenTypeIndexes.get(token.kind);
    if (tokenType === undefined || token.range.endOffset <= token.range.startOffset) continue;
    for (const segment of tokenSegments(token, source)) {
      const lineDelta = segment.line - previousLine;
      const startDelta = lineDelta === 0 ? segment.character - previousCharacter : segment.character;
      data.push(lineDelta, startDelta, segment.length, tokenType, 0);
      previousLine = segment.line;
      previousCharacter = segment.character;
    }
  }
  return data;
}

function tokenSegments(
  token: ForgeWebScriptTokenClassification,
  source: string,
): readonly { line: number; character: number; length: number }[] {
  const { start, end, startOffset, endOffset } = token.range;
  if (start.line === end.line)
    return [{ line: start.line, character: start.character, length: end.character - start.character }];

  const segments: Array<{ line: number; character: number; length: number }> = [];
  let lineStartOffset = startOffset;
  for (let line = start.line; line <= end.line; line += 1) {
    const lineBreakOffset = source.indexOf('\n', lineStartOffset);
    const lineEndOffset = line === end.line || lineBreakOffset === -1 ? endOffset : lineBreakOffset;
    const character = line === start.line ? start.character : 0;
    const length = line === end.line ? end.character - character : lineEndOffset - lineStartOffset;
    if (length > 0) segments.push({ line, character, length });
    if (line === end.line || lineBreakOffset === -1) break;
    lineStartOffset = lineBreakOffset + 1;
  }
  return segments;
}
