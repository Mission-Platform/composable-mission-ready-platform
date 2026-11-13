import type { FlintAnalysisEvidence, FlintAnalysisReport } from '@mission-platform/flint-analysis';
import type {
  FlintDiagnosticPhase,
  FlintDiagnosticSeverity,
  FlintImportTypeEnvironment,
  FlintModule,
  FlintSelfHostedStageReport,
  FlintSelfHostedStageRunner,
  FlintVmExecutionMode,
  FlintSourceSpan,
  FlintToken,
} from '@mission-platform/flint-ast';

/** Line and character position in a source document. */
export interface FlintPosition {
  /** Zero-based line and UTF-16 character offsets. */
  readonly line: number;
  readonly character: number;
}

/** Range delimited by start and end positions with character offsets. */
export interface FlintRange {
  readonly start: FlintPosition;
  readonly end: FlintPosition;
  /** UTF-16 offsets into the document, useful to editor adapters. */
  readonly startOffset: number;
  readonly endOffset: number;
}

/** Document URI and range identifying a source code location. */
export interface FlintLocation {
  readonly uri: string;
  readonly range: FlintRange;
}

/** Documentation comments and markdown description for a symbol. */
export interface FlintDocumentation {
  readonly contents: readonly string[];
}

/** Text edit replacing a range with new text. */
export interface FlintTextEdit {
  readonly range: FlintRange;
  readonly newText: string;
}

/** Multi-document workspace edits mapping document URIs to text edits. */
export interface FlintWorkspaceEdit {
  readonly changes: ReadonlyMap<string, readonly FlintTextEdit[]>;
}

/** Synchronized document representation with URI, version, and text. */
export interface FlintDocument {
  readonly uri: string;
  readonly fileName?: string;
  readonly text: string;
  readonly version: number;
}

/** One ordered UTF-16 text change from an incremental document notification. */
export interface FlintContentChange {
  readonly range?: { readonly start: FlintPosition; readonly end: FlintPosition };
  readonly text: string;
}

/** A semantic-token snapshot and optional delta against a known prior snapshot. */
export interface FlintSemanticTokens {
  readonly resultId: string;
  readonly data: readonly number[];
  readonly delta?: {
    readonly start: number;
    readonly deleteCount: number;
    readonly data: readonly number[];
  };
}

export interface FlintDocumentLink {
  readonly range: FlintRange;
  readonly target?: string;
  readonly tooltip?: string;
}
export interface FlintColor {
  readonly range: FlintRange;
  readonly color: { readonly red: number; readonly green: number; readonly blue: number; readonly alpha: number };
}
export interface FlintColorPresentation {
  readonly label: string;
  readonly textEdit?: FlintTextEdit;
}
export interface FlintSelectionRange {
  readonly range: FlintRange;
  readonly parent?: FlintSelectionRange;
}
export interface FlintCommand {
  readonly command: string;
  readonly title: string;
  readonly arguments?: readonly unknown[];
}
export interface FlintCallHierarchyItem {
  readonly name: string;
  readonly uri: string;
  readonly range: FlintRange;
  readonly selectionRange: FlintRange;
}
export interface FlintCallHierarchyEdge {
  readonly from: FlintCallHierarchyItem;
  readonly to: FlintCallHierarchyItem;
  readonly fromRanges: readonly FlintRange[];
}
export interface FlintLinkedEditingRanges {
  readonly ranges: readonly FlintRange[];
  readonly wordPattern?: string;
}
export interface FlintMoniker {
  readonly scheme: string;
  readonly identifier: string;
  readonly unique: 'read' | 'write' | 'readWrite';
}
export interface FlintInlineCompletion {
  readonly insertText: string;
  readonly range?: FlintRange;
  readonly command?: FlintCommand;
}
export interface FlintDiagnosticReport {
  readonly kind: 'full' | 'unchanged';
  readonly resultId: string;
  readonly items: readonly FlintLanguageDiagnostic[];
}

/** Callable signature descriptor including parameters and return type. */
export interface FlintCallable {
  readonly parameters: readonly string[];
  readonly result: string;
  readonly documentation?: string;
}

/** Compiler and language service configuration options for a workspace. */
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

/** Options controlling compiler frontend analysis and diagnostics. */
export interface FlintAnalysisOptions {
  readonly importTypeEnvironment?: FlintImportTypeEnvironment;
}

/** Abstract host interface providing filesystem access and watching. */
export interface FlintWorkspaceHost {
  readFile(uri: string): Promise<string | undefined>;
  listFiles(): Promise<readonly string[]>;
  getOptions(uri: string): Promise<FlintWorkspaceOptions>;
  watch?(listener: (change: FlintWorkspaceChange) => void): FlintDisposable;
}

/** Category of workspace document change (created, changed, deleted). */
export type FlintWorkspaceChangeKind = 'created' | 'changed' | 'deleted';

/** Document modification event in the workspace. */
export interface FlintWorkspaceChange {
  readonly uri?: string;
  readonly kind: FlintWorkspaceChangeKind;
}

/** Disposable resource subscription handle. */
export interface FlintDisposable {
  dispose(): void;
}

/** Static analysis or compiler diagnostic reported by the language service. */
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

/** Kind category of a language symbol (function, struct, local, etc.). */
export type FlintSymbolKind = 'module' | 'function' | 'parameter' | 'local' | 'capability' | 'type' | 'markup';

/** Symbol descriptor with name, kind, container, and location. */
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

/** Autocomplete suggestion category (keyword, type, function, etc.). */
export type FlintCompletionKind = 'keyword' | 'type' | 'declaration' | 'value' | 'function' | 'capability';

/** Autocomplete suggestion item with insert text and documentation. */
export interface FlintCompletion {
  readonly label: string;
  readonly kind: FlintCompletionKind;
  readonly detail?: string;
  readonly documentation?: string;
  readonly range: FlintRange;
}

/** Hover tooltip documentation for a symbol or token. */
export interface FlintHover {
  readonly range: FlintRange;
  readonly contents: readonly string[];
}

/** Category of code lens action (references, debug, etc.). */
export type FlintCodeLensKind = 'references';

/** Actionable command embedded directly in editor source code. */
export interface FlintCodeLens {
  readonly range: FlintRange;
  readonly kind: FlintCodeLensKind;
  readonly title: string;
  readonly symbolName: string;
  readonly symbolKind: FlintSymbolKind;
  readonly referenceCount: number;
  readonly data?: string;
}

/** Category of code folding range (comment, imports, region). */
export type FlintFoldingRangeKind = 'module' | 'declaration' | 'region' | 'markup';

/** Range of source code collapsible in the editor. */
export interface FlintFoldingRange {
  readonly range: FlintRange;
  readonly kind: FlintFoldingRangeKind;
}

/** Evaluated runtime variable value shown inline during debugging. */
export interface FlintInlineValue {
  readonly range: FlintRange;
  readonly variableName: string;
  readonly text: string;
  readonly type?: string;
}

/** Category of inlay hint (parameter, type). */
export type FlintInlayHintKind = 'parameter' | 'type';

/** Inlined hint text displayed beside parameters or variable bindings. */
export interface FlintInlayHint {
  readonly position: FlintPosition;
  readonly label: string;
  readonly kind: FlintInlayHintKind;
  readonly paddingLeft?: boolean;
  readonly paddingRight?: boolean;
  readonly data?: string;
}

/** Hierarchical document outline symbol node. */
export interface FlintDocumentSymbol {
  readonly name: string;
  readonly kind: FlintSymbolKind;
  readonly range: FlintRange;
  readonly selectionRange: FlintRange;
  readonly detail?: string;
  readonly children: readonly FlintDocumentSymbol[];
}

/** Global workspace index tracking definitions, references, and symbols. */
export interface FlintWorkspaceIndex {
  refresh(uri?: string): Promise<void>;
  definition(uri: string, position: FlintPosition): readonly FlintLocation[];
  declaration(uri: string, position: FlintPosition): readonly FlintLocation[];
  implementation(uri: string, position: FlintPosition): readonly FlintLocation[];
  references(uri: string, position: FlintPosition): readonly FlintLocation[];
  rename(uri: string, position: FlintPosition, newName: string): FlintWorkspaceEdit | undefined;
  workspaceSymbols?(query?: string): readonly { readonly symbol: FlintSymbol; readonly uri: string }[];
}

/** Semantic classification and highlighting token. */
export interface FlintTokenClassification {
  readonly kind:
    | 'comment'
    | 'component-region'
    | 'css-property'
    | 'css-selector'
    | 'css-value'
    | 'declaration'
    | 'html-attribute'
    | 'html-tag'
    | 'markup-directive'
    | 'markup-interpolation'
    | 'markup-slot'
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

/** Completed compiler analysis report for a document. */
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

/** Unified language service providing code intelligence queries across documents. */
export interface FlintLanguageService {
  openDocument(document: FlintDocument): void;
  updateDocument(document: FlintDocument): void;
  applyChanges(uri: string, version: number, changes: readonly FlintContentChange[]): FlintDocument | undefined;
  closeDocument(uri: string): void;
  diagnose(uri: string): FlintAnalysis;
  complete(uri: string, position: FlintPosition): readonly FlintCompletion[];
  hover(uri: string, position: FlintPosition): FlintHover | undefined;
  definition(uri: string, position: FlintPosition): readonly FlintLocation[];
  declaration(uri: string, position: FlintPosition): readonly FlintLocation[];
  implementation(uri: string, position: FlintPosition): readonly FlintLocation[];
  references(uri: string, position: FlintPosition): readonly FlintLocation[];
  rename(uri: string, position: FlintPosition, newName: string): FlintWorkspaceEdit | undefined;
  markupEdit(uri: string, range: FlintRange, newText: string): FlintTextEdit | undefined;
  resolveCodeLens(uri: string, lens: FlintCodeLens): FlintCodeLens | undefined;
  resolveInlayHint(uri: string, hint: FlintInlayHint): FlintInlayHint | undefined;
  codeLenses(uri: string): readonly FlintCodeLens[];
  foldingRanges(uri: string): readonly FlintFoldingRange[];
  inlineValues(uri: string, range?: FlintRange): readonly FlintInlineValue[];
  inlayHints(uri: string, range?: FlintRange): readonly FlintInlayHint[];
  documentSymbols(uri: string): readonly FlintDocumentSymbol[];
  workspaceSymbols?(query?: string): readonly { readonly symbol: FlintSymbol; readonly uri: string }[];
  refreshWorkspace(uri?: string): Promise<void>;
  invalidateWorkspace(change?: FlintWorkspaceChange): void;
  tokenize(uri: string): readonly FlintTokenClassification[];
  semanticTokens(uri: string, previousResultId?: string): FlintSemanticTokens;
  documentLinks(uri: string): readonly FlintDocumentLink[];
  colors(uri: string): readonly FlintColor[];
  colorPresentations(uri: string, color: FlintColor): readonly FlintColorPresentation[];
  formatting(uri: string, range?: FlintRange): readonly FlintTextEdit[];
  selectionRanges(uri: string, positions: readonly FlintPosition[]): readonly FlintSelectionRange[];
  executeCommand(uri: string, command: FlintCommand): readonly FlintWorkspaceEdit[];
  prepareCallHierarchy(uri: string, position: FlintPosition): FlintCallHierarchyItem | undefined;
  incomingCalls(item: FlintCallHierarchyItem): readonly FlintCallHierarchyEdge[];
  outgoingCalls(item: FlintCallHierarchyItem): readonly FlintCallHierarchyEdge[];
  linkedEditingRanges(uri: string, position: FlintPosition): FlintLinkedEditingRanges | undefined;
  monikers(uri: string, position: FlintPosition): readonly FlintMoniker[];
  inlineCompletions(uri: string, position: FlintPosition): readonly FlintInlineCompletion[];
  diagnosticReport(uri: string, previousResultId?: string): FlintDiagnosticReport;
  dispose(): void;
}
