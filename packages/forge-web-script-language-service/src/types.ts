import type {
  ForgeWebScriptDiagnosticPhase,
  ForgeWebScriptDiagnosticSeverity,
  ForgeWebScriptImportTypeEnvironment,
  ForgeWebScriptModule,
  ForgeWebScriptSelfHostedStageReport,
  ForgeWebScriptSelfHostedStageRunner,
  ForgeWebScriptVmExecutionMode,
  ForgeWebScriptSourceSpan,
  ForgeWebScriptToken,
} from '@mission-platform/forge-web-script';

export interface ForgeWebScriptPosition {
  /** Zero-based line and UTF-16 character offsets. */
  readonly line: number;
  readonly character: number;
}

export interface ForgeWebScriptRange {
  readonly start: ForgeWebScriptPosition;
  readonly end: ForgeWebScriptPosition;
  /** UTF-16 offsets into the document, useful to editor adapters. */
  readonly startOffset: number;
  readonly endOffset: number;
}

export interface ForgeWebScriptLocation {
  readonly uri: string;
  readonly range: ForgeWebScriptRange;
}

export interface ForgeWebScriptDocumentation {
  readonly contents: readonly string[];
}

export interface ForgeWebScriptTextEdit {
  readonly range: ForgeWebScriptRange;
  readonly newText: string;
}

export interface ForgeWebScriptWorkspaceEdit {
  readonly changes: ReadonlyMap<string, readonly ForgeWebScriptTextEdit[]>;
}

export interface ForgeWebScriptDocument {
  readonly uri: string;
  readonly fileName?: string;
  readonly text: string;
  readonly version: number;
}

export interface ForgeWebScriptCallable {
  readonly parameters: readonly string[];
  readonly result: string;
  readonly documentation?: string;
}

export interface ForgeWebScriptWorkspaceOptions {
  readonly requestedCapabilities?: readonly string[];
  readonly requireExports?: boolean;
  readonly capabilitySignatures?: ReadonlyMap<string, ForgeWebScriptCallable>;
  /** Optional host inventory. Signatures and requested capabilities are also included. */
  readonly capabilityNames?: readonly string[];
  /** VM mode used by the bounded FWS compiler stage for editor parity checks. */
  readonly selfHostedVmMode?: ForgeWebScriptVmExecutionMode;
  readonly selfHostedRunner?: ForgeWebScriptSelfHostedStageRunner;
}

export interface ForgeWebScriptAnalysisOptions {
  readonly importTypeEnvironment?: ForgeWebScriptImportTypeEnvironment;
}

export interface ForgeWebScriptWorkspaceHost {
  readFile(uri: string): Promise<string | undefined>;
  listFiles(): Promise<readonly string[]>;
  getOptions(uri: string): Promise<ForgeWebScriptWorkspaceOptions>;
  watch?(listener: (change: ForgeWebScriptWorkspaceChange) => void): ForgeWebScriptDisposable;
}

export type ForgeWebScriptWorkspaceChangeKind = 'created' | 'changed' | 'deleted';

export interface ForgeWebScriptWorkspaceChange {
  readonly uri?: string;
  readonly kind: ForgeWebScriptWorkspaceChangeKind;
}

export interface ForgeWebScriptDisposable {
  dispose(): void;
}

export interface ForgeWebScriptLanguageDiagnostic {
  readonly code: string;
  readonly severity: ForgeWebScriptDiagnosticSeverity;
  readonly phase: ForgeWebScriptDiagnosticPhase;
  readonly message: string;
  readonly fileName: string;
  readonly hint?: string;
  readonly sourceSpan: ForgeWebScriptSourceSpan;
  readonly range: ForgeWebScriptRange;
}

export type ForgeWebScriptSymbolKind = 'module' | 'function' | 'parameter' | 'local' | 'capability' | 'type';

export interface ForgeWebScriptSymbol {
  readonly name: string;
  readonly kind: ForgeWebScriptSymbolKind;
  readonly range: ForgeWebScriptRange;
  readonly detail: string;
  readonly type?: string;
  readonly callable?: ForgeWebScriptCallable;
  readonly containerName?: string;
  readonly scopeRange?: ForgeWebScriptRange;
  readonly declarationRange?: ForgeWebScriptRange;
}

export type ForgeWebScriptCompletionKind = 'keyword' | 'type' | 'declaration' | 'value' | 'function' | 'capability';

export interface ForgeWebScriptCompletion {
  readonly label: string;
  readonly kind: ForgeWebScriptCompletionKind;
  readonly detail?: string;
  readonly documentation?: string;
  readonly range: ForgeWebScriptRange;
}

export interface ForgeWebScriptHover {
  readonly range: ForgeWebScriptRange;
  readonly contents: readonly string[];
}

export type ForgeWebScriptCodeLensKind = 'references';

export interface ForgeWebScriptCodeLens {
  readonly range: ForgeWebScriptRange;
  readonly kind: ForgeWebScriptCodeLensKind;
  readonly title: string;
  readonly symbolName: string;
  readonly symbolKind: ForgeWebScriptSymbolKind;
  readonly referenceCount: number;
}

export type ForgeWebScriptFoldingRangeKind = 'module' | 'declaration' | 'region';

export interface ForgeWebScriptFoldingRange {
  readonly range: ForgeWebScriptRange;
  readonly kind: ForgeWebScriptFoldingRangeKind;
}

export interface ForgeWebScriptInlineValue {
  readonly range: ForgeWebScriptRange;
  readonly variableName: string;
  readonly text: string;
  readonly type?: string;
}

export type ForgeWebScriptInlayHintKind = 'parameter' | 'type';

export interface ForgeWebScriptInlayHint {
  readonly position: ForgeWebScriptPosition;
  readonly label: string;
  readonly kind: ForgeWebScriptInlayHintKind;
  readonly paddingLeft?: boolean;
  readonly paddingRight?: boolean;
}

export interface ForgeWebScriptDocumentSymbol {
  readonly name: string;
  readonly kind: ForgeWebScriptSymbolKind;
  readonly range: ForgeWebScriptRange;
  readonly selectionRange: ForgeWebScriptRange;
  readonly detail?: string;
  readonly children: readonly ForgeWebScriptDocumentSymbol[];
}

export interface ForgeWebScriptWorkspaceIndex {
  refresh(uri?: string): Promise<void>;
  definition(uri: string, position: ForgeWebScriptPosition): readonly ForgeWebScriptLocation[];
  declaration(uri: string, position: ForgeWebScriptPosition): readonly ForgeWebScriptLocation[];
  implementation(uri: string, position: ForgeWebScriptPosition): readonly ForgeWebScriptLocation[];
  references(uri: string, position: ForgeWebScriptPosition): readonly ForgeWebScriptLocation[];
  rename(uri: string, position: ForgeWebScriptPosition, newName: string): ForgeWebScriptWorkspaceEdit | undefined;
}

export interface ForgeWebScriptTokenClassification {
  readonly kind:
    | 'comment'
    | 'declaration'
    | 'identifier'
    | 'invalid'
    | 'keyword'
    | 'number'
    | 'operator'
    | 'punctuation'
    | 'string'
    | 'type';
  readonly text: string;
  readonly range: ForgeWebScriptRange;
  readonly token?: ForgeWebScriptToken;
}

export interface ForgeWebScriptAnalysis {
  readonly uri: string;
  readonly version: number;
  readonly valid: boolean;
  readonly module?: ForgeWebScriptModule;
  readonly importTypeEnvironment?: ForgeWebScriptImportTypeEnvironment;
  readonly diagnostics: readonly ForgeWebScriptLanguageDiagnostic[];
  readonly symbols: readonly ForgeWebScriptSymbol[];
  readonly tokens: readonly ForgeWebScriptTokenClassification[];
  readonly selfHosted?: ForgeWebScriptSelfHostedStageReport;
}

export interface ForgeWebScriptLanguageService {
  openDocument(document: ForgeWebScriptDocument): void;
  updateDocument(document: ForgeWebScriptDocument): void;
  closeDocument(uri: string): void;
  diagnose(uri: string): ForgeWebScriptAnalysis;
  complete(uri: string, position: ForgeWebScriptPosition): readonly ForgeWebScriptCompletion[];
  hover(uri: string, position: ForgeWebScriptPosition): ForgeWebScriptHover | undefined;
  definition(uri: string, position: ForgeWebScriptPosition): readonly ForgeWebScriptLocation[];
  declaration(uri: string, position: ForgeWebScriptPosition): readonly ForgeWebScriptLocation[];
  implementation(uri: string, position: ForgeWebScriptPosition): readonly ForgeWebScriptLocation[];
  references(uri: string, position: ForgeWebScriptPosition): readonly ForgeWebScriptLocation[];
  rename(uri: string, position: ForgeWebScriptPosition, newName: string): ForgeWebScriptWorkspaceEdit | undefined;
  codeLenses(uri: string): readonly ForgeWebScriptCodeLens[];
  foldingRanges(uri: string): readonly ForgeWebScriptFoldingRange[];
  inlineValues(uri: string, range?: ForgeWebScriptRange): readonly ForgeWebScriptInlineValue[];
  inlayHints(uri: string, range?: ForgeWebScriptRange): readonly ForgeWebScriptInlayHint[];
  documentSymbols(uri: string): readonly ForgeWebScriptDocumentSymbol[];
  refreshWorkspace(uri?: string): Promise<void>;
  invalidateWorkspace(change?: ForgeWebScriptWorkspaceChange): void;
  tokenize(uri: string): readonly ForgeWebScriptTokenClassification[];
  dispose(): void;
}
