import { analyzeFlint } from './analysis.js';
import { completeFlint } from './completion.js';
import { completeEmbeddedCss, diagnoseEmbeddedCss, hoverEmbeddedCss, isEmbeddedCssPosition } from './embedded-css.js';
import {
  codeLensesFlint,
  documentSymbolsFlint,
  foldingRangesFlint,
  inlayHintsFlint,
  inlineValuesFlint,
} from './features.js';
import { hoverFlint } from './hover.js';
import {
  completeMarkup,
  createMarkupEdit,
  hoverMarkup,
  isMarkupPosition,
  markupDefinitions,
  markupFoldingRanges,
  markupSymbols,
  tokenizeMarkup,
} from './markup.js';
import { normalizeFlintWorkspaceOptions } from './options.js';
import { offsetAtPosition, positionAtOffset, rangeFromOffsets } from './positions.js';
import { createFlintWorkspaceIndex } from './workspace-index.js';

import type {
  FlintAnalysis,
  FlintCallHierarchyEdge,
  FlintCallHierarchyItem,
  FlintColor,
  FlintColorPresentation,
  FlintContentChange,
  FlintCodeLens,
  FlintDocumentSymbol,
  FlintDocumentLink,
  FlintDocument,
  FlintDiagnosticReport,
  FlintFoldingRange,
  FlintInlayHint,
  FlintInlineValue,
  FlintLanguageService,
  FlintInlineCompletion,
  FlintLinkedEditingRanges,
  FlintMoniker,
  FlintSelectionRange,
  FlintCommand,
  FlintSemanticTokens,
  FlintTextEdit,
  FlintWorkspaceEdit,
  FlintPosition,
  FlintWorkspaceChange,
  FlintWorkspaceHost,
  FlintWorkspaceOptions,
  FlintRange,
  FlintTokenClassification,
} from './types.js';

const emptyOptions = normalizeFlintWorkspaceOptions();

/** Applies ordered UTF-16 edits to a document, including full-text fallback changes. */
export function applyFlintContentChanges(text: string, changes: readonly FlintContentChange[]): string {
  return changes.reduce((current, change) => {
    if (change.range === undefined) return change.text;
    const start = offsetAtPosition(current, change.range.start);
    const end = offsetAtPosition(current, change.range.end);
    return `${current.slice(0, start)}${change.text}${current.slice(end)}`;
  }, text);
}

const semanticTokenKinds = [
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

function encodeSemanticTokens(tokens: readonly FlintTokenClassification[]): readonly number[] {
  const typeIndexes = new Map(semanticTokenKinds.map((kind, index) => [kind, index]));
  const data: number[] = [];
  let previousLine = 0;
  let previousCharacter = 0;
  for (const token of tokens) {
    const type = typeIndexes.get(token.kind);
    const length = token.range.end.character - token.range.start.character;
    if (type === undefined || length <= 0) continue;
    const lineDelta = token.range.start.line - previousLine;
    const characterDelta =
      lineDelta === 0 ? token.range.start.character - previousCharacter : token.range.start.character;
    data.push(lineDelta, characterDelta, length, type, 0);
    previousLine = token.range.start.line;
    previousCharacter = token.range.start.character;
  }
  return data;
}

function semanticTokenDelta(previous: readonly number[], next: readonly number[]) {
  let start = 0;
  while (start < previous.length && start < next.length && previous[start] === next[start]) start += 1;
  let previousEnd = previous.length;
  let nextEnd = next.length;
  while (previousEnd > start && nextEnd > start && previous[previousEnd - 1] === next[nextEnd - 1]) {
    previousEnd -= 1;
    nextEnd -= 1;
  }
  return { start, deleteCount: previousEnd - start, data: next.slice(start, nextEnd) };
}

function wordRangeAt(document: FlintDocument, position: FlintPosition): FlintRange {
  const offset = offsetAtPosition(document.text, position);
  const before = document.text.slice(0, offset);
  const after = document.text.slice(offset);
  const prefix = /[\w$-]+$/u.exec(before)?.[0] ?? '';
  const suffix = /^[\w$-]*/u.exec(after)?.[0] ?? '';
  return {
    start: positionAtOffset(document.text, offset - prefix.length),
    end: positionAtOffset(document.text, offset + suffix.length),
    startOffset: offset - prefix.length,
    endOffset: offset + suffix.length,
  };
}

/** Computes a cache key for an analyzed document. */
function documentCacheKey(document: FlintDocument, workspaceOptions: FlintWorkspaceOptions): string {
  return `${document.text}\0${document.fileName ?? ''}\0${optionsKey(workspaceOptions)}`;
}

/** Creates a language service managing analysis, symbols, and LSP features for open documents. */
export function createFlintLanguageService(host?: FlintWorkspaceHost): FlintLanguageService {
  const documents = new Map<string, FlintDocument>();
  const options = new Map<string, FlintWorkspaceOptions>();
  const cache = new Map<string, { readonly key: string; readonly analysis: FlintAnalysis }>();
  const semanticSnapshots = new Map<string, Map<string, readonly number[]>>();
  let disposed = false;
  // skipcq: JS-0242
  let workspaceIndex: ReturnType<typeof createFlintWorkspaceIndex> | undefined;
  // skipcq: JS-D1001
  const assertActive = (): void => {
    if (disposed) throw new Error('Flint language service has been disposed.');
  };
  // skipcq: JS-D1001
  const getDocument = (uri: string): FlintDocument => {
    const document = documents.get(uri);
    if (document === undefined) throw new Error(`No open Flint document for '${uri}'.`);
    return document;
  };
  // skipcq: JS-D1001
  const invalidateWorkspace = (change?: FlintWorkspaceChange): void => {
    assertActive();
    if (change?.uri === undefined) {
      cache.clear();
      options.clear();
      // skipcq: JS-0357
      workspaceIndex?.invalidate(change);
      return;
    }
    cache.delete(change.uri);
    semanticSnapshots.delete(change.uri);
    options.delete(change.uri);
    // skipcq: JS-0357
    workspaceIndex?.invalidate(change);
  };
  const watcher = host?.watch?.((change) => {
    invalidateWorkspace(change);
  });
  // skipcq: JS-D1001
  const refreshWorkspace = async (uri?: string): Promise<void> => {
    assertActive();
    if (host !== undefined) {
      const targets = uri === undefined ? [...documents.keys()] : [uri];
      await Promise.all(
        targets.map(async (target) => {
          try {
            const next = normalizeFlintWorkspaceOptions(await host.getOptions(target));
            if (optionsKey(options.get(target) ?? emptyOptions) !== optionsKey(next)) cache.delete(target);
            options.set(target, next);
          } catch {
            options.set(target, emptyOptions);
            cache.delete(target);
          }
        }),
      );
    }
    // skipcq: JS-0357
    await workspaceIndex?.refresh(uri);
  };
  // skipcq: JS-D1001
  const diagnose = (uri: string): FlintAnalysis => {
    assertActive();
    const document = getDocument(uri);
    const workspaceOptions = options.get(uri) ?? emptyOptions;
    // skipcq: JS-0357
    const snapshot = workspaceIndex?.analysisSnapshot(uri);
    const key = `${documentCacheKey(document, workspaceOptions)}\0${snapshot?.identity ?? 'local'}`;
    const cached = cache.get(uri);
    if (cached?.key === key) return cached.analysis;
    const baseAnalysis = snapshot?.analysis ?? analyzeFlint(document, workspaceOptions);
    const embeddedCssDiagnostics = diagnoseEmbeddedCss(document);
    const markupTokens = tokenizeMarkup(document, baseAnalysis.module);
    const tokenKeys = new Set(
      baseAnalysis.tokens.map((token) => `${token.kind}:${token.range.startOffset}:${token.range.endOffset}`),
    );
    const analysis =
      embeddedCssDiagnostics.length === 0 && markupTokens.length === 0
        ? baseAnalysis
        : {
            ...baseAnalysis,
            diagnostics: [...baseAnalysis.diagnostics, ...embeddedCssDiagnostics],
            tokens: [
              ...baseAnalysis.tokens,
              ...markupTokens.filter(
                (token) => !tokenKeys.has(`${token.kind}:${token.range.startOffset}:${token.range.endOffset}`),
              ),
            ],
          };
    cache.set(uri, { key, analysis });
    return analysis;
  };
  workspaceIndex = createFlintWorkspaceIndex(
    {
      documents,
      diagnose: (uri) => diagnose(uri),
      getOptions: (uri) => options.get(uri) ?? emptyOptions,
    },
    host,
  );
  return {
    /** Opens and analyzes a text document. */
    openDocument(document): void {
      assertActive();
      documents.set(document.uri, document);
      cache.delete(document.uri);
      semanticSnapshots.delete(document.uri);
      workspaceIndex?.invalidate({ uri: document.uri, kind: 'changed' });
    },
    /** Updates document content following edit changes. */
    updateDocument(document): void {
      assertActive();
      const previous = documents.get(document.uri);
      if (previous !== undefined && document.version < previous.version) return;
      documents.set(document.uri, document);
      cache.delete(document.uri);
      semanticSnapshots.delete(document.uri);
      workspaceIndex?.invalidate({ uri: document.uri, kind: 'changed' });
    },
    applyChanges(uri, version, changes) {
      const previous = documents.get(uri);
      if (previous === undefined || version <= previous.version) return;
      const next = { ...previous, text: applyFlintContentChanges(previous.text, changes), version };
      documents.set(uri, next);
      cache.delete(uri);
      workspaceIndex?.invalidate({ uri, kind: 'changed' });
      return next;
    },
    /** Closes a document and releases its cache entries. */
    closeDocument(uri): void {
      assertActive();
      documents.delete(uri);
      options.delete(uri);
      cache.delete(uri);
      semanticSnapshots.delete(uri);
      workspaceIndex?.invalidate({ uri, kind: 'deleted' });
    },
    diagnose,
    /** Returns code completion items at the cursor position. */
    complete(uri, position: FlintPosition) {
      const document = getDocument(uri);
      if (isEmbeddedCssPosition(document, position) !== undefined) return completeEmbeddedCss(document, position);
      const analysis = diagnose(uri);
      if (isMarkupPosition(document, analysis.module, position))
        return completeMarkup(document, analysis.module, position);
      return completeFlint(
        document.text,
        position,
        workspaceIndex?.symbolsFor(uri) ?? analysis.symbols,
        options.get(uri) ?? emptyOptions,
      );
    },
    /** Returns hover documentation for the token at the cursor position. */
    hover(uri, position: FlintPosition) {
      const document = getDocument(uri);
      if (isEmbeddedCssPosition(document, position) !== undefined) return hoverEmbeddedCss(document, position);
      const analysis = diagnose(uri);
      if (isMarkupPosition(document, analysis.module, position))
        return hoverMarkup(document, analysis.module, position);
      return hoverFlint(
        document.text,
        position,
        workspaceIndex?.symbolsFor(uri) ?? analysis.symbols,
        options.get(uri) ?? emptyOptions,
      );
    },
    /** Resolves definition locations for the symbol under the cursor. */
    definition(uri, position) {
      const document = getDocument(uri);
      const analysis = diagnose(uri);
      const markup = markupDefinitions(
        document,
        analysis.module,
        workspaceIndex?.symbolsFor(uri) ?? analysis.symbols,
        position,
      );
      return markup.length === 0 ? (workspaceIndex?.definition(uri, position) ?? []) : markup;
    },
    /** Resolves declaration locations for the symbol under the cursor. */
    declaration(uri, position) {
      return workspaceIndex?.declaration(uri, position) ?? [];
    },
    /** Resolves implementation locations for the symbol under the cursor. */
    implementation(uri, position) {
      return workspaceIndex?.implementation(uri, position) ?? [];
    },
    /** Finds all references to the symbol under the cursor. */
    references(uri, position) {
      return workspaceIndex?.references(uri, position) ?? [];
    },
    /** Computes workspace edits to rename the symbol under the cursor. */
    rename(uri, position, newName) {
      return workspaceIndex?.rename(uri, position, newName);
    },
    markupEdit(uri, range, newText) {
      const document = getDocument(uri);
      return createMarkupEdit(document, diagnose(uri).module, range, newText);
    },
    /** Computes actionable code lens commands for the document. */
    codeLenses(uri): readonly FlintCodeLens[] {
      const analysis = diagnose(uri);
      const document = getDocument(uri);
      return codeLensesFlint(analysis.module, analysis.symbols, (symbol) => {
        return workspaceIndex?.references(uri, positionAtOffset(document.text, symbol.range.startOffset)).length ?? 0;
      }).map((lens) => ({ ...lens, data: `${uri}@${document.version}@${lens.range.startOffset}` }));
    },
    resolveCodeLens(uri, lens) {
      const document = getDocument(uri);
      return lens.data?.startsWith(`${uri}@${document.version}@`) === true ? lens : undefined;
    },
    /** Computes code folding ranges for functions, blocks, and imports. */
    foldingRanges(uri): readonly FlintFoldingRange[] {
      const analysis = diagnose(uri);
      const document = getDocument(uri);
      return [...foldingRangesFlint(document.text, analysis.module), ...markupFoldingRanges(document, analysis.module)];
    },
    /** Computes inline variable values for debug visualization. */
    inlineValues(uri, range?: FlintRange): readonly FlintInlineValue[] {
      const analysis = diagnose(uri);
      return inlineValuesFlint(getDocument(uri).text, analysis.module, analysis.symbols, range);
    },
    /** Computes parameter and type inlay hints for code display. */
    inlayHints(uri, range?: FlintRange): readonly FlintInlayHint[] {
      const analysis = diagnose(uri);
      const document = getDocument(uri);
      return inlayHintsFlint(document.text, analysis.module, range, analysis.importTypeEnvironment).map((hint) => ({
        ...hint,
        data: `${uri}@${document.version}@${hint.position.line}:${hint.position.character}`,
      }));
    },
    resolveInlayHint(uri, hint) {
      const document = getDocument(uri);
      return hint.data?.startsWith(`${uri}@${document.version}@`) === true ? hint : undefined;
    },
    /** Returns document symbol hierarchy for outline navigation. */
    documentSymbols(uri): readonly FlintDocumentSymbol[] {
      const analysis = diagnose(uri);
      const document = getDocument(uri);
      return [
        ...documentSymbolsFlint(document.text, analysis.module, analysis.symbols),
        ...markupSymbols(document, analysis.module),
      ];
    },
    /** Searches symbols across all indexed workspace documents. */
    workspaceSymbols(query?: string) {
      return workspaceIndex?.workspaceSymbols(query) ?? [];
    },
    refreshWorkspace,
    invalidateWorkspace,
    /** Computes semantic tokens for syntax highlighting. */
    tokenize(uri) {
      return diagnose(uri).tokens;
    },
    semanticTokens(uri, previousResultId?): FlintSemanticTokens {
      const document = getDocument(uri);
      const data = encodeSemanticTokens(diagnose(uri).tokens);
      const resultId = `${document.version}:${data.join(',')}`;
      const snapshots = semanticSnapshots.get(uri) ?? new Map<string, readonly number[]>();
      const previous = previousResultId === undefined ? undefined : snapshots.get(previousResultId);
      snapshots.set(resultId, data);
      semanticSnapshots.set(uri, snapshots);
      return previous === undefined
        ? { resultId, data }
        : { resultId, data, delta: semanticTokenDelta(previous, data) };
    },
    documentLinks(uri): readonly FlintDocumentLink[] {
      const document = getDocument(uri);
      const links: FlintDocumentLink[] = [];
      for (const match of document.text.matchAll(/https?:\/\/[^\s"'<>]+/gu)) {
        const startOffset = match.index ?? 0;
        links.push({
          range: rangeFromOffsets(document.text, startOffset, startOffset + match[0].length),
          target: match[0],
          tooltip: 'Open link',
        });
      }
      return links;
    },
    colors(uri): readonly FlintColor[] {
      const document = getDocument(uri);
      return [...document.text.matchAll(/#[\da-f]{6,8}\b/giu)].map((match) => {
        const value = match[0].slice(1);
        const red = Number.parseInt(value.slice(0, 2), 16) / 255;
        const green = Number.parseInt(value.slice(2, 4), 16) / 255;
        const blue = Number.parseInt(value.slice(4, 6), 16) / 255;
        const alpha = value.length === 8 ? Number.parseInt(value.slice(6, 8), 16) / 255 : 1;
        const startOffset = match.index ?? 0;
        return {
          range: rangeFromOffsets(document.text, startOffset, startOffset + match[0].length),
          color: { red, green, blue, alpha },
        };
      });
    },
    colorPresentations(_uri, color): readonly FlintColorPresentation[] {
      const red = Math.round(color.color.red * 255)
        .toString(16)
        .padStart(2, '0');
      const green = Math.round(color.color.green * 255)
        .toString(16)
        .padStart(2, '0');
      const blue = Math.round(color.color.blue * 255)
        .toString(16)
        .padStart(2, '0');
      const alpha =
        color.color.alpha < 1
          ? Math.round(color.color.alpha * 255)
              .toString(16)
              .padStart(2, '0')
          : '';
      const label = `#${red}${green}${blue}${alpha}`;
      return [{ label, textEdit: { range: color.range, newText: label } }];
    },
    formatting(uri, range?): readonly FlintTextEdit[] {
      void range;
      getDocument(uri);
      return [];
    },
    selectionRanges(uri, positions): readonly FlintSelectionRange[] {
      const document = getDocument(uri);
      return positions.map((position) => {
        const word = wordRangeAt(document, position);
        const lineStart = document.text.lastIndexOf('\n', word.startOffset - 1) + 1;
        const lineEnd = document.text.indexOf('\n', word.endOffset);
        const end = lineEnd < 0 ? document.text.length : lineEnd;
        return { range: word, parent: { range: rangeFromOffsets(document.text, lineStart, end) } };
      });
    },
    executeCommand(uri, command: FlintCommand): readonly FlintWorkspaceEdit[] {
      getDocument(uri);
      return command.command === 'flint.refreshWorkspace' || command.command === 'flint.showReferences' ? [] : [];
    },
    prepareCallHierarchy(uri, position): FlintCallHierarchyItem | undefined {
      const document = getDocument(uri);
      const offset = offsetAtPosition(document.text, position);
      const symbol = diagnose(uri).symbols.find(
        (candidate) => candidate.range.startOffset <= offset && offset <= candidate.range.endOffset,
      );
      return symbol === undefined
        ? undefined
        : { name: symbol.name, uri, range: symbol.range, selectionRange: symbol.range };
    },
    incomingCalls(_item: FlintCallHierarchyItem): readonly FlintCallHierarchyEdge[] {
      return [];
    },
    outgoingCalls(_item: FlintCallHierarchyItem): readonly FlintCallHierarchyEdge[] {
      return [];
    },
    linkedEditingRanges(uri, position): FlintLinkedEditingRanges | undefined {
      const document = getDocument(uri);
      const word = wordRangeAt(document, position);
      const value = document.text.slice(word.startOffset, word.endOffset);
      if (value.length === 0) return undefined;
      const ranges = [
        ...document.text.matchAll(new RegExp(`\\b${value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}\\b`, 'gu')),
      ].map((match) => rangeFromOffsets(document.text, match.index ?? 0, (match.index ?? 0) + value.length));
      return ranges.length < 2 ? undefined : { ranges, wordPattern: '[A-Za-z_][A-Za-z0-9_]*' };
    },
    monikers(_uri: string, _position: FlintPosition): readonly FlintMoniker[] {
      return [];
    },
    inlineCompletions(uri, position): readonly FlintInlineCompletion[] {
      return this.complete(uri, position).map((item) => ({ insertText: item.label, range: item.range }));
    },
    diagnosticReport(uri, previousResultId?): FlintDiagnosticReport {
      const analysis = diagnose(uri);
      const resultId = `${analysis.version}:${analysis.diagnostics.length}`;
      return previousResultId === resultId
        ? { kind: 'unchanged', resultId, items: [] }
        : { kind: 'full', resultId, items: analysis.diagnostics };
    },
    /** Disposes the language service and releases cached data. */
    dispose(): void {
      if (disposed) return;
      disposed = true;
      watcher?.dispose();
      documents.clear();
      options.clear();
      cache.clear();
      semanticSnapshots.clear();
    },
  } satisfies FlintLanguageService;
}

/** Serializes workspace options into a stable cache key string. */
function optionsKey(value: FlintWorkspaceOptions): string {
  const options = normalizeFlintWorkspaceOptions(value);
  return JSON.stringify({
    requestedCapabilities: [...(options.requestedCapabilities ?? [])].toSorted(),
    requireExports: options.requireExports,
    capabilityNames: [...(options.capabilityNames ?? [])].toSorted(),
    selfHostedVmMode: options.selfHostedVmMode,
    capabilitySignatures: [...(options.capabilitySignatures ?? new Map())]
      .map(([name, callable]) => [name, callable])
      .toSorted(([left], [right]) => left.localeCompare(right)),
  });
}
