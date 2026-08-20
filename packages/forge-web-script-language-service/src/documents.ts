import { analyzeForgeWebScript } from './analysis.js';
import { completeForgeWebScript } from './completion.js';
import {
  codeLensesForgeWebScript,
  documentSymbolsForgeWebScript,
  foldingRangesForgeWebScript,
  inlayHintsForgeWebScript,
  inlineValuesForgeWebScript,
} from './features.js';
import { hoverForgeWebScript } from './hover.js';
import { normalizeForgeWebScriptWorkspaceOptions } from './options.js';
import { positionAtOffset } from './positions.js';
import { createForgeWebScriptWorkspaceIndex, type ForgeWebScriptWorkspaceSemanticIndex } from './workspace-index.js';

import type {
  ForgeWebScriptAnalysis,
  ForgeWebScriptCodeLens,
  ForgeWebScriptDocumentSymbol,
  ForgeWebScriptDocument,
  ForgeWebScriptDisposable,
  ForgeWebScriptFoldingRange,
  ForgeWebScriptInlayHint,
  ForgeWebScriptInlineValue,
  ForgeWebScriptLanguageService,
  ForgeWebScriptPosition,
  ForgeWebScriptWorkspaceChange,
  ForgeWebScriptWorkspaceHost,
  ForgeWebScriptWorkspaceOptions,
  ForgeWebScriptRange,
} from './types.js';

const emptyOptions = normalizeForgeWebScriptWorkspaceOptions();

export function createForgeWebScriptLanguageService(host?: ForgeWebScriptWorkspaceHost): ForgeWebScriptLanguageService {
  const documents = new Map<string, ForgeWebScriptDocument>();
  const options = new Map<string, ForgeWebScriptWorkspaceOptions>();
  const cache = new Map<string, { readonly key: string; readonly analysis: ForgeWebScriptAnalysis }>();
  let disposed = false;
  let watcher: ForgeWebScriptDisposable | undefined;
  let workspaceIndex: ForgeWebScriptWorkspaceSemanticIndex | undefined;
  const assertActive = (): void => {
    if (disposed) throw new Error('Forge Web Script language service has been disposed.');
  };
  const getDocument = (uri: string): ForgeWebScriptDocument => {
    const document = documents.get(uri);
    if (document === undefined) throw new Error(`No open Forge Web Script document for '${uri}'.`);
    return document;
  };
  const keyFor = (document: ForgeWebScriptDocument, workspaceOptions: ForgeWebScriptWorkspaceOptions): string =>
    `${document.text}\0${document.fileName ?? ''}\0${optionsKey(workspaceOptions)}`;
  const invalidateWorkspace = (change?: ForgeWebScriptWorkspaceChange): void => {
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
            const next = normalizeForgeWebScriptWorkspaceOptions(await host.getOptions(target));
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
  const diagnose = (uri: string): ForgeWebScriptAnalysis => {
    assertActive();
    const document = getDocument(uri);
    const workspaceOptions = options.get(uri) ?? emptyOptions;
    const key = keyFor(document, workspaceOptions);
    const cached = cache.get(uri);
    if (cached?.key === key) return cached.analysis;
    const analysis = analyzeForgeWebScript(document, workspaceOptions);
    cache.set(uri, { key, analysis });
    return analysis;
  };
  workspaceIndex = createForgeWebScriptWorkspaceIndex(
    {
      documents,
      diagnose,
      getOptions: (uri) => options.get(uri) ?? emptyOptions,
    },
    host,
  );
  return {
    openDocument(document): void {
      assertActive();
      documents.set(document.uri, document);
      cache.delete(document.uri);
      workspaceIndex?.invalidate({ uri: document.uri, kind: 'changed' });
    },
    updateDocument(document): void {
      assertActive();
      const previous = documents.get(document.uri);
      if (previous !== undefined && document.version < previous.version) return;
      documents.set(document.uri, document);
      cache.delete(document.uri);
      workspaceIndex?.invalidate({ uri: document.uri, kind: 'changed' });
    },
    closeDocument(uri): void {
      assertActive();
      documents.delete(uri);
      options.delete(uri);
      cache.delete(uri);
      workspaceIndex?.invalidate({ uri, kind: 'deleted' });
    },
    diagnose,
    complete(uri, position: ForgeWebScriptPosition) {
      const document = getDocument(uri);
      const analysis = diagnose(uri);
      return completeForgeWebScript(
        document.text,
        position,
        workspaceIndex?.symbolsFor(uri) ?? analysis.symbols,
        options.get(uri) ?? emptyOptions,
      );
    },
    hover(uri, position: ForgeWebScriptPosition) {
      const document = getDocument(uri);
      const analysis = diagnose(uri);
      return hoverForgeWebScript(
        document.text,
        position,
        workspaceIndex?.symbolsFor(uri) ?? analysis.symbols,
        options.get(uri) ?? emptyOptions,
      );
    },
    definition(uri, position) {
      return workspaceIndex?.definition(uri, position) ?? [];
    },
    declaration(uri, position) {
      return workspaceIndex?.declaration(uri, position) ?? [];
    },
    implementation(uri, position) {
      return workspaceIndex?.implementation(uri, position) ?? [];
    },
    references(uri, position) {
      return workspaceIndex?.references(uri, position) ?? [];
    },
    rename(uri, position, newName) {
      return workspaceIndex?.rename(uri, position, newName);
    },
    codeLenses(uri): readonly ForgeWebScriptCodeLens[] {
      const analysis = diagnose(uri);
      const document = getDocument(uri);
      return codeLensesForgeWebScript(analysis.module, analysis.symbols, (symbol) => {
        return workspaceIndex?.references(uri, positionAtOffset(document.text, symbol.range.startOffset)).length ?? 0;
      });
    },
    foldingRanges(uri): readonly ForgeWebScriptFoldingRange[] {
      const analysis = diagnose(uri);
      return foldingRangesForgeWebScript(getDocument(uri).text, analysis.module);
    },
    inlineValues(uri, range?: ForgeWebScriptRange): readonly ForgeWebScriptInlineValue[] {
      const analysis = diagnose(uri);
      return inlineValuesForgeWebScript(getDocument(uri).text, analysis.module, analysis.symbols, range);
    },
    inlayHints(uri, range?: ForgeWebScriptRange): readonly ForgeWebScriptInlayHint[] {
      const analysis = diagnose(uri);
      return inlayHintsForgeWebScript(getDocument(uri).text, analysis.module, range);
    },
    documentSymbols(uri): readonly ForgeWebScriptDocumentSymbol[] {
      const analysis = diagnose(uri);
      return documentSymbolsForgeWebScript(getDocument(uri).text, analysis.module, analysis.symbols);
    },
    refreshWorkspace,
    invalidateWorkspace,
    tokenize(uri) {
      return diagnose(uri).tokens;
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      watcher?.dispose();
      documents.clear();
      options.clear();
      cache.clear();
    },
  } satisfies ForgeWebScriptLanguageService;
}

function optionsKey(value: ForgeWebScriptWorkspaceOptions): string {
  const options = normalizeForgeWebScriptWorkspaceOptions(value);
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

export { type ForgeWebScriptDisposable } from './types.js';
