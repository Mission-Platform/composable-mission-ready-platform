import {
  type ForgeWebScriptExpression,
  type ForgeWebScriptFunction,
  type ForgeWebScriptModule,
  type ForgeWebScriptResolvedModule,
  type ForgeWebScriptSourceSpan,
  type ForgeWebScriptStatement,
  type ForgeWebScriptTypeName,
  hashForgeWebScriptModuleGraph,
  resolveForgeWebScriptImportTypeEnvironment,
  resolveForgeWebScriptModuleGraph,
} from '@mission-platform/forge-web-script';

import { analyzeForgeWebScript } from './analysis.js';
import { offsetAtPosition, rangeFromOffsets } from './positions.js';

import type {
  ForgeWebScriptAnalysis,
  ForgeWebScriptDocument,
  ForgeWebScriptLocation,
  ForgeWebScriptPosition,
  ForgeWebScriptSymbol,
  ForgeWebScriptTextEdit,
  ForgeWebScriptWorkspaceChange,
  ForgeWebScriptWorkspaceEdit,
  ForgeWebScriptWorkspaceHost,
  ForgeWebScriptWorkspaceIndex,
  ForgeWebScriptWorkspaceOptions,
} from './types.js';

interface WorkspaceIndexCallbacks {
  readonly documents: ReadonlyMap<string, ForgeWebScriptDocument>;
  readonly diagnose: (uri: string) => ForgeWebScriptAnalysis;
  readonly getOptions: (uri: string) => ForgeWebScriptWorkspaceOptions;
}

interface WorkspaceRecord {
  readonly uri: string;
  readonly source: string;
  readonly moduleId: string;
  readonly analysis: ForgeWebScriptAnalysis;
  readonly graphKey?: string;
  readonly module?: ForgeWebScriptModule;
  readonly symbols: readonly IndexedSymbol[];
}

interface IndexedSymbol {
  readonly id: string;
  readonly record: WorkspaceRecord;
  readonly symbol: ForgeWebScriptSymbol;
  readonly exported: boolean;
  readonly interfaceName?: string;
}

interface IndexedReference {
  readonly target: IndexedSymbol;
  readonly uri: string;
  readonly range: ForgeWebScriptLocation['range'];
}

/**
 * Semantic facts shared by editor adapters. The index deliberately keeps all
 * protocol-neutral values and uses the parser's spans for every navigation
 * range.
 */
export class ForgeWebScriptWorkspaceSemanticIndex implements ForgeWebScriptWorkspaceIndex {
  readonly #callbacks: WorkspaceIndexCallbacks;
  readonly #host: ForgeWebScriptWorkspaceHost | undefined;
  readonly #records = new Map<string, WorkspaceRecord>();
  /** importer identity -> alias -> target record URI */
  readonly #imports = new Map<string, Map<string, string>>();
  readonly #declarations = new Map<string, IndexedSymbol>();
  readonly #references: IndexedReference[] = [];
  #dirty = true;

  public constructor(callbacks: WorkspaceIndexCallbacks, host?: ForgeWebScriptWorkspaceHost) {
    this.#callbacks = callbacks;
    this.#host = host;
  }

  public async refresh(uri?: string): Promise<void> {
    const documents = this.#callbacks.documents;
    const listed = uri === undefined && this.#host !== undefined ? await this.#host.listFiles().catch(() => []) : [];
    const entries = uniqueUris([...documents.keys(), ...listed].filter((entry) => entry.endsWith('.fws')));
    if (uri !== undefined && documents.has(uri) && !entries.some((entry) => sameIdentity(entry, uri))) {
      entries.push(uri);
    }
    if (entries.length === 0) {
      this.#records.clear();
      this.#imports.clear();
      this.#rebuildFacts();
      this.#dirty = false;
      return;
    }

    const resolver = {
      resolve: (source: string, importer: string): string | undefined => resolveSource(source, importer),
      load: async (fileName: string): Promise<string> => this.#loadSource(fileName),
    };

    const result = await resolveForgeWebScriptModuleGraph(entries, resolver);
    const graphKey = hashForgeWebScriptModuleGraph(result.graph);
    const nextRecords = new Map<string, WorkspaceRecord>();
    const nextImports = new Map<string, Map<string, string>>();

    for (const module of result.graph.modules) {
      const open = this.#findDocument(module.fileName);
      const documentUri = open?.uri ?? canonicalDocumentUri(module.fileName);
      const options = open === undefined ? await this.#optionsFor(documentUri) : this.#callbacks.getOptions(open.uri);
      const document: ForgeWebScriptDocument = open ?? {
        uri: documentUri,
        fileName: module.fileName,
        text: module.source,
        version: 0,
      };
      const importTypeEnvironment = resolveForgeWebScriptImportTypeEnvironment(module, result.graph);
      const analysis = analyzeForgeWebScript(document, options, { importTypeEnvironment });
      nextRecords.set(document.uri, this.#createRecord(document, analysis, module, undefined, graphKey));
    }

    for (const edge of result.graph.edges) {
      const importerDocument = this.#findDocument(edge.importer);
      const targetDocument = this.#findDocument(edge.resolved);
      const importerUri =
        importerDocument?.uri ??
        [...nextRecords.values()].find((record) => sameIdentity(record.uri, edge.importer))?.uri ??
        canonicalDocumentUri(edge.importer);
      const targetUri =
        targetDocument?.uri ??
        [...nextRecords.values()].find((record) => sameIdentity(record.uri, edge.resolved))?.uri ??
        canonicalDocumentUri(edge.resolved);
      const importerRecord =
        nextRecords.get(importerUri) ??
        [...nextRecords.values()].find((record) => sameIdentity(record.uri, importerUri));
      const alias = importerRecord?.module?.sourceImports.find((item) => item.source === edge.source)?.alias;
      if (alias === undefined) continue;
      const aliases = nextImports.get(identityKey(importerUri)) ?? new Map<string, string>();
      aliases.set(alias, targetUri);
      nextImports.set(identityKey(importerUri), aliases);
    }

    for (const document of documents.values()) {
      if ([...nextRecords.keys()].some((key) => sameIdentity(key, document.uri))) continue;
      const analysis = this.#callbacks.diagnose(document.uri);
      nextRecords.set(document.uri, this.#createRecord(document, analysis));
    }

    this.#records.clear();
    for (const [key, record] of nextRecords) this.#records.set(key, record);
    this.#imports.clear();
    for (const [key, value] of nextImports) this.#imports.set(key, value);
    this.#indexOpenDocumentImports();
    this.#rebuildFacts();
    this.#dirty = false;
    void uri;
  }

  public invalidate(_change?: ForgeWebScriptWorkspaceChange): void {
    this.#dirty = true;
  }

  public analysisSnapshot(
    uri: string,
  ): { readonly analysis: ForgeWebScriptAnalysis; readonly identity: string } | undefined {
    if (this.#dirty) return undefined;
    const record = this.#findRecord(uri);
    if (record?.graphKey === undefined) return undefined;
    const current = this.#findDocument(uri);
    if (current !== undefined && (current.text !== record.source || current.version !== record.analysis.version)) {
      return undefined;
    }
    return { analysis: record.analysis, identity: record.graphKey };
  }

  public definition(uri: string, position: ForgeWebScriptPosition): readonly ForgeWebScriptLocation[] {
    const target = this.#targetAt(uri, position);
    return target === undefined ? [] : [this.#location(target)];
  }

  public declaration(uri: string, position: ForgeWebScriptPosition): readonly ForgeWebScriptLocation[] {
    return this.definition(uri, position);
  }

  public implementation(_uri: string, _position: ForgeWebScriptPosition): readonly ForgeWebScriptLocation[] {
    // Forge Web Script models interfaces as type bounds only; there is no reliable
    // implementation relationship in the current AST/type model.
    return [];
  }

  public references(uri: string, position: ForgeWebScriptPosition): readonly ForgeWebScriptLocation[] {
    const target = this.#targetAt(uri, position);
    if (target === undefined) return [];
    return this.#references
      .filter((reference) => reference.target.id === target.id)
      .map(({ uri: targetUri, range }) => ({ uri: targetUri, range }));
  }

  public rename(
    uri: string,
    position: ForgeWebScriptPosition,
    newName: string,
  ): ForgeWebScriptWorkspaceEdit | undefined {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(newName)) return undefined;
    const target = this.#targetAt(uri, position);
    if (target === undefined) return undefined;
    if (target.symbol.kind === 'module' || target.symbol.kind === 'capability') return undefined;

    const edits = new Map<string, ForgeWebScriptTextEdit[]>();
    const add = (targetUri: string, range: ForgeWebScriptLocation['range']): void => {
      const current = edits.get(targetUri) ?? [];
      if (
        current.some((edit) => edit.range.startOffset === range.startOffset && edit.range.endOffset === range.endOffset)
      ) {
        return;
      }
      current.push({ range, newText: newName });
      edits.set(targetUri, current);
    };

    add(target.record.uri, target.symbol.range);
    for (const reference of this.#references) {
      if (reference.target.id === target.id) add(reference.uri, reference.range);
    }
    for (const ranges of edits.values()) ranges.sort((left, right) => right.range.startOffset - left.range.startOffset);
    return { changes: edits };
  }

  /** Symbols from other modules that are safe to expose as workspace candidates. */
  public symbolsFor(uri: string): readonly ForgeWebScriptSymbol[] {
    this.#ensureIndexed();
    const record = this.#findRecord(uri);
    if (record === undefined) return [];
    const own = record.symbols.map(({ symbol }) => symbol);
    const importedUris = new Set(this.#imports.get(identityKey(record.uri))?.values());
    const workspace = [...this.#declarations.values()]
      .filter(
        (candidate) =>
          importedUris.has(candidate.record.uri) &&
          candidate.exported &&
          candidate.interfaceName === undefined &&
          (candidate.symbol.kind === 'function' || candidate.symbol.kind === 'type'),
      )
      .map(({ symbol }) => symbol);
    return [...own, ...workspace];
  }

  async #optionsFor(uri: string): Promise<ForgeWebScriptWorkspaceOptions> {
    return this.#host?.getOptions(uri).catch(() => ({})) ?? Promise.resolve({});
  }

  async #loadSource(fileName: string): Promise<string> {
    const open = this.#findDocument(fileName);
    if (open !== undefined) return open.text;
    if (this.#host === undefined) return '';
    const candidates = uriCandidates(fileName);
    for (const candidate of candidates) {
      try {
        const text = await this.#host.readFile(candidate);
        if (text !== undefined) return text;
      } catch {
        // try next candidate
      }
    }
    return '';
  }

  #findDocument(uri: string): ForgeWebScriptDocument | undefined {
    const documents = this.#callbacks.documents;
    return documents.get(uri) ?? [...documents.values()].find((document) => sameIdentity(document.uri, uri));
  }

  #createRecord(
    document: ForgeWebScriptDocument,
    analysis: ForgeWebScriptAnalysis,
    graphModule?: ForgeWebScriptResolvedModule,
    previous?: WorkspaceRecord,
    graphKey?: string,
  ): WorkspaceRecord {
    // Do not reuse a parsed module after the current source becomes malformed.
    // Keeping the old AST would make navigation target declarations that no
    // longer exist in the open buffer.
    const module = graphModule?.module ?? analysis.module;
    const record: WorkspaceRecord = {
      uri: document.uri,
      source: document.text,
      moduleId: graphModule?.moduleId ?? module?.name ?? previous?.moduleId ?? document.uri,
      analysis,
      ...(graphKey === undefined ? {} : { graphKey }),
      ...(module === undefined ? {} : { module }),
      symbols: [],
    };
    return { ...record, symbols: this.#indexSymbols(record) };
  }

  #indexSymbols(record: WorkspaceRecord): readonly IndexedSymbol[] {
    const module = record.module;
    if (module === undefined) return [];
    const result: IndexedSymbol[] = [];
    for (const symbol of record.analysis.symbols) {
      const topFunction = module.functions.find(
        (declaration) => declaration.name === symbol.name && containsSpan(declaration.span, symbol.range.startOffset),
      );
      const interfaceDeclaration = module.interfaces.find((declaration) => declaration.name === symbol.containerName);
      const interfaceMethod = interfaceDeclaration?.functions.find(
        (method) => method.name === symbol.name && containsSpan(method.span, symbol.range.startOffset),
      );
      const topType =
        symbol.kind === 'type' &&
        symbol.containerName === undefined &&
        [...module.structs, ...module.enums, ...module.interfaces].some(
          (declaration) => declaration.name === symbol.name,
        );
      const isDeclaration =
        symbol.kind === 'module' ||
        symbol.kind === 'capability' ||
        topFunction !== undefined ||
        interfaceMethod !== undefined ||
        topType;
      if (!isDeclaration && symbol.kind !== 'local' && symbol.kind !== 'parameter') continue;
      const exported = topFunction?.exported ?? (topType || symbol.kind === 'module');
      const id = `${record.moduleId}:${symbol.kind}:${symbol.name}:${symbol.range.startOffset}:${symbol.range.endOffset}`;
      result.push({
        id,
        record,
        symbol,
        exported,
        ...(interfaceMethod === undefined ? {} : { interfaceName: interfaceDeclaration?.name }),
      });
    }
    return result;
  }

  #indexOpenDocumentImports(): void {
    for (const record of this.#records.values()) {
      if (record.module === undefined) continue;
      const key = identityKey(record.uri);
      const aliases = new Map<string, string>();
      for (const sourceImport of record.module.sourceImports) {
        const resolved = resolveSource(sourceImport.source, record.uri);
        if (resolved === undefined) continue;
        const target = this.#findRecord(resolved);
        if (target === undefined) continue;
        aliases.set(sourceImport.alias, target.uri);
      }
      this.#imports.delete(key);
      if (aliases.size > 0) this.#imports.set(key, aliases);
    }
  }

  #rebuildFacts(): void {
    this.#declarations.clear();
    this.#references.length = 0;
    const records = [...this.#records.values()];
    for (const record of records) for (const symbol of record.symbols) this.#declarations.set(symbol.id, symbol);
    for (const record of records) {
      if (record.module === undefined) continue;
      for (const declaration of record.module.functions) this.#collectStatements(record, declaration, declaration.body);
    }
  }

  #collectStatements(
    record: WorkspaceRecord,
    declaration: ForgeWebScriptFunction,
    statements: readonly ForgeWebScriptStatement[],
  ): void {
    for (const statement of statements) {
      switch (statement.kind) {
        case 'let': {
          this.#collectType(record, statement.type);
          this.#collectExpression(record, declaration, statement.value);
          break;
        }
        case 'assignment': {
          this.#collectName(record, declaration, statement.name, statement.span.start, statement.span.end);
          this.#collectExpression(record, declaration, statement.value);
          break;
        }
        case 'return':
        case 'yield': {
          if (statement.value !== undefined) this.#collectExpression(record, declaration, statement.value);
          break;
        }
        case 'expression-statement': {
          this.#collectExpression(record, declaration, statement.expression);
          break;
        }
        case 'if': {
          this.#collectExpression(record, declaration, statement.condition);
          this.#collectStatements(record, declaration, statement.consequent);
          if (statement.alternate !== undefined) this.#collectStatements(record, declaration, statement.alternate);
          break;
        }
        case 'while':
        case 'do-while': {
          this.#collectExpression(record, declaration, statement.condition);
          this.#collectStatements(record, declaration, statement.body);
          break;
        }
        case 'for': {
          if (statement.initializer !== undefined)
            this.#collectStatements(record, declaration, [statement.initializer]);
          this.#collectExpression(record, declaration, statement.condition);
          if (statement.update !== undefined) this.#collectStatements(record, declaration, [statement.update]);
          this.#collectStatements(record, declaration, statement.body);
          break;
        }
        case 'iterator-loop': {
          this.#collectName(record, declaration, statement.binding, statement.span.start, statement.span.end);
          this.#collectExpression(record, declaration, statement.iterator);
          this.#collectStatements(record, declaration, statement.body);
          break;
        }
        case 'match-statement': {
          this.#collectExpression(record, declaration, statement.value);
          for (const arm of statement.arms) this.#collectExpression(record, declaration, arm.value);
          break;
        }
        case 'switch': {
          this.#collectExpression(record, declaration, statement.value);
          for (const switchCase of statement.cases) this.#collectStatements(record, declaration, switchCase.body);
          if (statement.defaultCase !== undefined) this.#collectStatements(record, declaration, statement.defaultCase);
          break;
        }
        default: {
          break;
        }
      }
    }
  }

  #collectExpression(
    record: WorkspaceRecord,
    declaration: ForgeWebScriptFunction,
    expression: ForgeWebScriptExpression,
  ): void {
    switch (expression.kind) {
      case 'identifier': {
        this.#collectName(record, declaration, expression.name, expression.span.start, expression.span.end);
        break;
      }
      case 'function-value': {
        this.#collectName(record, declaration, expression.name, expression.span.start, expression.span.end);
        break;
      }
      case 'call': {
        this.#collectName(record, declaration, expression.callee, expression.span.start, expression.span.end);
        for (const argument of expression.arguments) this.#collectExpression(record, declaration, argument);
        break;
      }
      case 'binary': {
        this.#collectExpression(record, declaration, expression.left);
        this.#collectExpression(record, declaration, expression.right);
        break;
      }
      case 'unary': {
        this.#collectExpression(record, declaration, expression.operand);
        break;
      }
      case 'struct-value': {
        this.#collectType(record, expression.type);
        for (const value of Object.values(expression.fields)) this.#collectExpression(record, declaration, value);
        break;
      }
      case 'enum-value': {
        this.#collectType(record, expression.type);
        for (const argument of expression.arguments) this.#collectExpression(record, declaration, argument);
        break;
      }
      case 'match': {
        this.#collectExpression(record, declaration, expression.value);
        for (const arm of expression.arms) this.#collectExpression(record, declaration, arm.value);
        break;
      }
      case 'array-literal':
      case 'vector-literal': {
        for (const value of expression.elements) this.#collectExpression(record, declaration, value);
        break;
      }
      case 'index': {
        this.#collectExpression(record, declaration, expression.receiver);
        this.#collectExpression(record, declaration, expression.index);
        break;
      }
      case 'literal': {
        break;
      }
      default: {
        break;
      }
    }
  }

  #collectType(record: WorkspaceRecord, type: ForgeWebScriptTypeName): void {
    if (type.reference !== undefined) {
      const target = this.#resolve(record, type.reference, type.span.start);
      if (target !== undefined) {
        this.#references.push({
          target,
          uri: record.uri,
          range: rangeFromOffsets(record.source, type.span.start, type.span.end),
        });
      }
    }
    for (const argument of type.arguments ?? []) this.#collectType(record, argument);
  }

  #collectName(
    record: WorkspaceRecord,
    declaration: ForgeWebScriptFunction,
    name: string,
    start: number,
    end: number,
  ): void {
    const target = this.#resolve(record, name, start);
    if (target === undefined) return;
    const member = name.split('.').at(-1) ?? name;
    const range =
      identifierRange(record.source, record.analysis.tokens, member, start, end) ??
      rangeFromOffsets(record.source, start, Math.min(end, start + member.length));
    this.#references.push({ target, uri: record.uri, range });
    void declaration;
  }

  #resolve(record: WorkspaceRecord, name: string, offset: number): IndexedSymbol | undefined {
    const parts = name.split('.');
    if (parts.length > 1) {
      const alias = parts[0] ?? '';
      const member = parts.at(-1) ?? '';
      const imported = record.module?.sourceImports.find((sourceImport) => sourceImport.alias === alias);
      const mappedUri = this.#imports.get(identityKey(record.uri))?.get(alias);
      const resolvedUri =
        mappedUri ?? (imported === undefined ? undefined : resolveSource(imported.source, record.uri));
      const targetRecord =
        resolvedUri === undefined
          ? undefined
          : (this.#findRecord(resolvedUri) ??
            [...this.#records.values()].find((candidate) =>
              imported === undefined ? false : candidate.uri.endsWith(imported.source.replace(/^\.\//u, '/')),
            ));
      if (targetRecord === undefined) return undefined;
      const candidates = targetRecord.symbols.filter(
        (symbol) =>
          symbol.symbol.name === member &&
          symbol.exported &&
          symbol.interfaceName === undefined &&
          symbol.symbol.kind !== 'module' &&
          symbol.symbol.kind !== 'capability',
      );
      return candidates.length === 1 ? candidates[0] : undefined;
    }

    const locals = record.symbols
      .filter(
        (symbol) =>
          (symbol.symbol.kind === 'local' || symbol.symbol.kind === 'parameter') &&
          symbol.symbol.name === name &&
          symbol.symbol.range.startOffset <= offset &&
          (symbol.symbol.scopeRange === undefined ||
            containsOffset(symbol.symbol.scopeRange.startOffset, symbol.symbol.scopeRange.endOffset, offset)),
      )
      .toSorted((left, right) => right.symbol.range.startOffset - left.symbol.range.startOffset);
    if (locals[0] !== undefined) return locals[0];

    const candidates = record.symbols.filter(
      (symbol) =>
        symbol.symbol.name === name &&
        symbol.symbol.kind !== 'local' &&
        symbol.symbol.kind !== 'parameter' &&
        symbol.symbol.kind !== 'module' &&
        symbol.interfaceName === undefined,
    );
    return candidates.length === 1 ? candidates[0] : undefined;
  }

  #findRecord(uri: string): WorkspaceRecord | undefined {
    return (
      this.#records.get(uri) ??
      [...this.#records.entries()].find(([key, record]) => sameIdentity(key, uri) || sameIdentity(record.uri, uri))?.[1]
    );
  }

  #targetAt(uri: string, position: ForgeWebScriptPosition): IndexedSymbol | undefined {
    this.#ensureIndexed();
    const record = this.#findRecord(uri);
    if (record === undefined) return undefined;
    const offset = offsetAtPosition(record.source, position);

    const references = this.#references
      .filter(
        (candidate) =>
          sameIdentity(candidate.uri, record.uri) &&
          candidate.range.startOffset <= offset &&
          offset <= candidate.range.endOffset,
      )
      .toSorted(
        (left, right) =>
          left.range.endOffset - left.range.startOffset - (right.range.endOffset - right.range.startOffset),
      );
    if (references[0] !== undefined) return references[0].target;

    const declarations = record.symbols
      .filter((symbol) => {
        if (!(symbol.symbol.range.startOffset <= offset && offset <= symbol.symbol.range.endOffset)) return false;
        // File-backed modules often span the entire source when no `module` keyword is present.
        // Those ranges are not useful navigation targets for arbitrary cursor positions.
        if (symbol.symbol.kind === 'module') {
          return symbol.symbol.range.endOffset - symbol.symbol.range.startOffset <= symbol.symbol.name.length + 1;
        }
        return true;
      })
      .toSorted(
        (left, right) =>
          left.symbol.range.endOffset -
          left.symbol.range.startOffset -
          (right.symbol.range.endOffset - right.symbol.range.startOffset),
      );
    return declarations[0];
  }

  #ensureIndexed(): void {
    if (!this.#dirty) return;
    for (const document of this.#callbacks.documents.values()) {
      const analysis = this.#callbacks.diagnose(document.uri);
      const previous = this.#findRecord(document.uri);
      this.#records.set(document.uri, this.#createRecord(document, analysis, undefined, previous));
      // Drop stale import edges for open buffers; they are recomputed from the current AST below.
      this.#imports.delete(identityKey(document.uri));
    }
    // Retain host-loaded records from the last refresh so cross-module queries keep working until
    // the next explicit refresh replaces the snapshot. Closed documents that only existed as open
    // buffers are dropped when no identity-equivalent open document remains.
    for (const uri of this.#records.keys()) {
      const stillOpen = [...this.#callbacks.documents.values()].some((document) => sameIdentity(document.uri, uri));
      if (stillOpen) continue;
      const record = this.#records.get(uri);
      if (record?.analysis.version === 0) continue;
      // Keep non-open workspace snapshots from refresh; only remove stale open-buffer clones.
      if (record !== undefined && record.module !== undefined) continue;
      this.#records.delete(uri);
      this.#imports.delete(identityKey(uri));
    }
    this.#indexOpenDocumentImports();
    this.#rebuildFacts();
    this.#dirty = false;
  }

  #location(symbol: IndexedSymbol): ForgeWebScriptLocation {
    return { uri: symbol.record.uri, range: symbol.symbol.range };
  }
}

function identityKey(uri: string): string {
  return normalizeIdentity(uri);
}

function sameIdentity(left: string, right: string): boolean {
  return normalizeIdentity(left) === normalizeIdentity(right);
}

function normalizeIdentity(uri: string): string {
  const normalized = uri.replaceAll('\\', '/');
  if (normalized.startsWith('file:')) {
    return normalized.replace(/^file:\/+/u, '/').replaceAll(/\/+/gu, '/');
  }
  return normalized.replaceAll(/\/+/gu, '/');
}

function canonicalDocumentUri(fileName: string): string {
  if (fileName.startsWith('file:')) {
    const path = fileName.replace(/^file:\/+/u, '/');
    return `file://${path}`;
  }
  if (fileName.startsWith('/')) return `file://${fileName}`;
  return fileName;
}

function uriCandidates(fileName: string): readonly string[] {
  const identity = normalizeIdentity(fileName);
  const path = identity.startsWith('/') ? identity : `/${identity}`;
  return uniqueUris([fileName, canonicalDocumentUri(fileName), path, `file:${path}`, `file://${path}`]);
}

function uniqueUris(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const key = normalizeIdentity(value);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

function containsSpan(span: ForgeWebScriptSourceSpan, offset: number): boolean {
  return span.start <= offset && offset <= span.end;
}

function containsOffset(start: number, end: number, offset: number): boolean {
  return start <= offset && offset <= end;
}

function identifierRange(
  source: string,
  tokens: ForgeWebScriptAnalysis['tokens'],
  name: string,
  start: number,
  end: number,
): ForgeWebScriptLocation['range'] | undefined {
  const token = tokens.find(
    ({ token: current }) =>
      current !== undefined &&
      current.kind === 'identifier' &&
      current.text === name &&
      current.span.start >= start &&
      current.span.end <= end,
  )?.token;
  return token === undefined ? undefined : rangeFromOffsets(source, token.span.start, token.span.end);
}

function resolveSource(source: string, importer: string): string | undefined {
  if (/^[A-Za-z][A-Za-z\d+.-]*:/u.test(source) && !source.startsWith('file:')) return source;
  if (importer.includes('://') || importer.startsWith('file:')) {
    try {
      const path = normalizeIdentity(importer);
      const base = `file://${path.startsWith('/') ? path : `/${path}`}`;
      return new URL(source, base.endsWith('/') ? base : base.replace(/\/[^/]*$/u, '/')).href;
    } catch {
      return undefined;
    }
  }
  const parts = `${importer.slice(0, Math.max(importer.lastIndexOf('/'), 0))}/${source}`.split('/');
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part === '..') resolved.pop();
    else resolved.push(part);
  }
  return `/${resolved.join('/')}`;
}

export function createForgeWebScriptWorkspaceIndex(
  callbacks: WorkspaceIndexCallbacks,
  host?: ForgeWebScriptWorkspaceHost,
): ForgeWebScriptWorkspaceSemanticIndex {
  return new ForgeWebScriptWorkspaceSemanticIndex(callbacks, host);
}

export type { WorkspaceIndexCallbacks };
