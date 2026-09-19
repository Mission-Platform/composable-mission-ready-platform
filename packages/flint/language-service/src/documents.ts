import { analyzeFlint } from './analysis.js';
import { completeFlint } from './completion.js';
import {
  codeLensesFlint,
  documentSymbolsFlint,
  foldingRangesFlint,
  inlayHintsFlint,
  inlineValuesFlint,
} from './features.js';
import { hoverFlint } from './hover.js';
import { normalizeFlintWorkspaceOptions } from './options.js';
import { positionAtOffset } from './positions.js';
import { createFlintWorkspaceIndex, type FlintWorkspaceSemanticIndex } from './workspace-index.js';

import type {
  FlintAnalysis,
  FlintCodeLens,
  FlintDocumentSymbol,
  FlintDocument,
  FlintDisposable,
  FlintFoldingRange,
  FlintInlayHint,
  FlintInlineValue,
  FlintLanguageService,
  FlintPosition,
  FlintWorkspaceChange,
  FlintWorkspaceHost,
  FlintWorkspaceOptions,
  FlintRange,
} from './types.js';

const emptyOptions = normalizeFlintWorkspaceOptions();

/** Computes a cache key for an analyzed document. */
function documentCacheKey(document: FlintDocument, workspaceOptions: FlintWorkspaceOptions): string {
  return `${document.text}\0${document.fileName ?? ''}\0${optionsKey(workspaceOptions)}`;
}

/** Creates a language service managing analysis, symbols, and LSP features for open documents. */
export function createFlintLanguageService(host?: FlintWorkspaceHost): FlintLanguageService {
  const documents = new Map<string, FlintDocument>();
  const options = new Map<string, FlintWorkspaceOptions>();
  const cache = new Map<string, { readonly key: string; readonly analysis: FlintAnalysis }>();
  let disposed = false;
  let watcher: FlintDisposable | undefined;
  let workspaceIndex: FlintWorkspaceSemanticIndex | undefined;
  const assertActive = (): void => {
    if (disposed) throw new Error('Flint language service has been disposed.');
  };
  const getDocument = (uri: string): FlintDocument => {
    const document = documents.get(uri);
    if (document === undefined) throw new Error(`No open Flint document for '${uri}'.`);
    return document;
  };
  const invalidateWorkspace = (change?: FlintWorkspaceChange): void => {
    assertActive();
    if (change?.uri === undefined) {
      cache.clear();
      options.clear();
      workspaceIndex?.invalidate(change);
      return;
    }
    cache.delete(change.uri);
    options.delete(change.uri);
    workspaceIndex?.invalidate(change);
  };
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
    await workspaceIndex?.refresh(uri);
  };
  watcher = host?.watch?.((change) => {
    invalidateWorkspace(change);
  });
  const diagnose = (uri: string): FlintAnalysis => {
    assertActive();
    const document = getDocument(uri);
    const workspaceOptions = options.get(uri) ?? emptyOptions;
    const snapshot = workspaceIndex?.analysisSnapshot(uri);
    const key = `${documentCacheKey(document, workspaceOptions)}\0${snapshot?.identity ?? 'local'}`;
    const cached = cache.get(uri);
    if (cached?.key === key) return cached.analysis;
    const analysis = snapshot?.analysis ?? analyzeFlint(document, workspaceOptions);
    cache.set(uri, { key, analysis });
    return analysis;
  };
  workspaceIndex = createFlintWorkspaceIndex(
    {
      documents,
      diagnose,
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
      workspaceIndex?.invalidate({ uri: document.uri, kind: 'changed' });
    },
    /** Updates document content following edit changes. */
    updateDocument(document): void {
      assertActive();
      const previous = documents.get(document.uri);
      if (previous !== undefined && document.version < previous.version) return;
      documents.set(document.uri, document);
      cache.delete(document.uri);
      workspaceIndex?.invalidate({ uri: document.uri, kind: 'changed' });
    },
    /** Closes a document and releases its cache entries. */
    closeDocument(uri): void {
      assertActive();
      documents.delete(uri);
      options.delete(uri);
      cache.delete(uri);
      workspaceIndex?.invalidate({ uri, kind: 'deleted' });
    },
    diagnose,
    /** Returns code completion items at the cursor position. */
    complete(uri, position: FlintPosition) {
      const document = getDocument(uri);
      const analysis = diagnose(uri);
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
      const analysis = diagnose(uri);
      return hoverFlint(
        document.text,
        position,
        workspaceIndex?.symbolsFor(uri) ?? analysis.symbols,
        options.get(uri) ?? emptyOptions,
      );
    },
    /** Resolves definition locations for the symbol under the cursor. */
    definition(uri, position) {
      return workspaceIndex?.definition(uri, position) ?? [];
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
    /** Computes actionable code lens commands for the document. */
    codeLenses(uri): readonly FlintCodeLens[] {
      const analysis = diagnose(uri);
      const document = getDocument(uri);
      return codeLensesFlint(analysis.module, analysis.symbols, (symbol) => {
        return workspaceIndex?.references(uri, positionAtOffset(document.text, symbol.range.startOffset)).length ?? 0;
      });
    },
    /** Computes code folding ranges for functions, blocks, and imports. */
    foldingRanges(uri): readonly FlintFoldingRange[] {
      const analysis = diagnose(uri);
      return foldingRangesFlint(getDocument(uri).text, analysis.module);
    },
    /** Computes inline variable values for debug visualization. */
    inlineValues(uri, range?: FlintRange): readonly FlintInlineValue[] {
      const analysis = diagnose(uri);
      return inlineValuesFlint(getDocument(uri).text, analysis.module, analysis.symbols, range);
    },
    /** Computes parameter and type inlay hints for code display. */
    inlayHints(uri, range?: FlintRange): readonly FlintInlayHint[] {
      const analysis = diagnose(uri);
      return inlayHintsFlint(getDocument(uri).text, analysis.module, range, analysis.importTypeEnvironment);
    },
    /** Returns document symbol hierarchy for outline navigation. */
    documentSymbols(uri): readonly FlintDocumentSymbol[] {
      const analysis = diagnose(uri);
      return documentSymbolsFlint(getDocument(uri).text, analysis.module, analysis.symbols);
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
    /** Disposes the language service and releases cached data. */
    dispose(): void {
      if (disposed) return;
      disposed = true;
      watcher?.dispose();
      documents.clear();
      options.clear();
      cache.clear();
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

export { type FlintDisposable } from './types.js';
