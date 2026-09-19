import type {
  FlintDiagnosticPhase,
  FlintDiagnosticSeverity,
  FlintAnalysisEvidence,
  FlintAnalysisReport,
  FlintImportTypeEnvironment,
  FlintModule,
  FlintSelfHostedStageReport,
  FlintSelfHostedStageRunner,
  FlintVmExecutionMode,
  FlintSourceSpan,
  FlintToken,
} from '@mission-platform/flint';

export interface FlintPosition {
  /** Zero-based line and UTF-16 character offsets. */
  readonly line: number;
  readonly character: number;
}

export interface FlintRange {
  readonly start: FlintPosition;
  readonly end: FlintPosition;
  /** UTF-16 offsets into the document, useful to editor adapters. */
  readonly startOffset: number;
  readonly endOffset: number;
}

export interface FlintLocation {
  readonly uri: string;
  readonly range: FlintRange;
}

export interface FlintDocumentation {
  readonly contents: readonly string[];
}

export interface FlintTextEdit {
  readonly range: FlintRange;
  readonly newText: string;
}

export interface FlintWorkspaceEdit {
  readonly changes: ReadonlyMap<string, readonly FlintTextEdit[]>;
}

export interface FlintDocument {
  readonly uri: string;
  readonly fileName?: string;
  readonly text: string;
  readonly version: number;
}

export interface FlintCallable {
  readonly parameters: readonly string[];
  readonly result: string;
  readonly documentation?: string;
}

export interface FlintWorkspaceOptions {
  readonly requestedCapabilities?: readonly string[];
  readonly requireExports?: boolean;
  readonly capabilitySignatures?: ReadonlyMap<string, FlintCallable>;
  /** Optional host inventory. Signatures and requested capabilities are also included. */
  readonly capabilityNames?: readonly string[];
  /** VM mode used by the bounded FWS compiler stage for editor parity checks. */
  readonly selfHostedVmMode?: FlintVmExecutionMode;
  readonly selfHostedRunner?: FlintSelfHostedStageRunner;
}

export interface FlintAnalysisOptions {
  readonly importTypeEnvironment?: FlintImportTypeEnvironment;
}

export interface FlintWorkspaceHost {
  readFile(uri: string): Promise<string | undefined>;
  listFiles(): Promise<readonly string[]>;
  getOptions(uri: string): Promise<FlintWorkspaceOptions>;
  watch?(listener: (change: FlintWorkspaceChange) => void): FlintDisposable;
}

export type FlintWorkspaceChangeKind = 'created' | 'changed' | 'deleted';

export interface FlintWorkspaceChange {
  readonly uri?: string;
  readonly kind: FlintWorkspaceChangeKind;
}

export interface FlintDisposable {
  dispose(): void;
}

export interface FlintLanguageDiagnostic {
  readonly code: string;
  readonly severity: FlintDiagnosticSeverity;
  readonly phase: FlintDiagnosticPhase;
  readonly message: string;
  readonly fileName: string;
  readonly hint?: string;
  readonly sourceSpan: FlintSourceSpan;
  readonly range: FlintRange;
  readonly ruleId?: string;
  readonly category?: string;
  readonly blocking?: boolean;
  readonly evidence?: readonly FlintAnalysisEvidence[];
  readonly owasp?: readonly string[];
  readonly cwe?: readonly string[];
}

export type FlintSymbolKind = 'module' | 'function' | 'parameter' | 'local' | 'capability' | 'type';

export interface FlintSymbol {
  readonly name: string;
  readonly kind: FlintSymbolKind;
  readonly range: FlintRange;
  readonly detail: string;
  readonly type?: string;
  readonly callable?: FlintCallable;
  readonly containerName?: string;
  readonly scopeRange?: FlintRange;
  readonly declarationRange?: FlintRange;
}

export type FlintCompletionKind = 'keyword' | 'type' | 'declaration' | 'value' | 'function' | 'capability';

export interface FlintCompletion {
  readonly label: string;
  readonly kind: FlintCompletionKind;
  readonly detail?: string;
  readonly documentation?: string;
  readonly range: FlintRange;
}

export interface FlintHover {
  readonly range: FlintRange;
  readonly contents: readonly string[];
}

export type FlintCodeLensKind = 'references';

export interface FlintCodeLens {
  readonly range: FlintRange;
  readonly kind: FlintCodeLensKind;
  readonly title: string;
  readonly symbolName: string;
  readonly symbolKind: FlintSymbolKind;
  readonly referenceCount: number;
}

export type FlintFoldingRangeKind = 'module' | 'declaration' | 'region';

export interface FlintFoldingRange {
  readonly range: FlintRange;
  readonly kind: FlintFoldingRangeKind;
}

export interface FlintInlineValue {
  readonly range: FlintRange;
  readonly variableName: string;
  readonly text: string;
  readonly type?: string;
}

export type FlintInlayHintKind = 'parameter' | 'type';

export interface FlintInlayHint {
  readonly position: FlintPosition;
  readonly label: string;
  readonly kind: FlintInlayHintKind;
  readonly paddingLeft?: boolean;
  readonly paddingRight?: boolean;
}

export interface FlintDocumentSymbol {
  readonly name: string;
  readonly kind: FlintSymbolKind;
  readonly range: FlintRange;
  readonly selectionRange: FlintRange;
  readonly detail?: string;
  readonly children: readonly FlintDocumentSymbol[];
}

export interface FlintWorkspaceIndex {
  refresh(uri?: string): Promise<void>;
  definition(uri: string, position: FlintPosition): readonly FlintLocation[];
  declaration(uri: string, position: FlintPosition): readonly FlintLocation[];
  implementation(uri: string, position: FlintPosition): readonly FlintLocation[];
  references(uri: string, position: FlintPosition): readonly FlintLocation[];
  rename(uri: string, position: FlintPosition, newName: string): FlintWorkspaceEdit | undefined;
  workspaceSymbols?(query?: string): readonly { readonly symbol: FlintSymbol; readonly uri: string }[];
}

export interface FlintTokenClassification {
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
  readonly range: FlintRange;
  readonly token?: FlintToken;
}

export interface FlintAnalysis {
  readonly uri: string;
  readonly version: number;
  readonly valid: boolean;
  readonly module?: FlintModule;
  readonly importTypeEnvironment?: FlintImportTypeEnvironment;
  readonly diagnostics: readonly FlintLanguageDiagnostic[];
  readonly analysis?: FlintAnalysisReport;
  readonly symbols: readonly FlintSymbol[];
  readonly tokens: readonly FlintTokenClassification[];
  readonly selfHosted?: FlintSelfHostedStageReport;
}

export interface FlintLanguageService {
  openDocument(document: FlintDocument): void;
  updateDocument(document: FlintDocument): void;
  closeDocument(uri: string): void;
  diagnose(uri: string): FlintAnalysis;
  complete(uri: string, position: FlintPosition): readonly FlintCompletion[];
  hover(uri: string, position: FlintPosition): FlintHover | undefined;
  definition(uri: string, position: FlintPosition): readonly FlintLocation[];
  declaration(uri: string, position: FlintPosition): readonly FlintLocation[];
  implementation(uri: string, position: FlintPosition): readonly FlintLocation[];
  references(uri: string, position: FlintPosition): readonly FlintLocation[];
  rename(uri: string, position: FlintPosition, newName: string): FlintWorkspaceEdit | undefined;
  codeLenses(uri: string): readonly FlintCodeLens[];
  foldingRanges(uri: string): readonly FlintFoldingRange[];
  inlineValues(uri: string, range?: FlintRange): readonly FlintInlineValue[];
  inlayHints(uri: string, range?: FlintRange): readonly FlintInlayHint[];
  documentSymbols(uri: string): readonly FlintDocumentSymbol[];
  workspaceSymbols?(query?: string): readonly { readonly symbol: FlintSymbol; readonly uri: string }[];
  refreshWorkspace(uri?: string): Promise<void>;
  invalidateWorkspace(change?: FlintWorkspaceChange): void;
  tokenize(uri: string): readonly FlintTokenClassification[];
  dispose(): void;
}
