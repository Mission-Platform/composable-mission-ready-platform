import type {
  ForgeWebScriptAnalysis,
  ForgeWebScriptDocument,
  ForgeWebScriptDocumentSymbol,
  ForgeWebScriptHover,
  ForgeWebScriptLanguageService,
  ForgeWebScriptLocation,
  ForgeWebScriptRange,
} from './types.js';

/** The LSIF version represented by this module. */
export const FORGE_WEB_SCRIPT_LSIF_VERSION = '0.6.0' as const;

export type ForgeWebScriptLsifVertexLabel =
  | 'metaData'
  | 'project'
  | 'document'
  | 'range'
  | 'resultSet'
  | 'definitionResult'
  | 'declarationResult'
  | 'implementationResult'
  | 'referenceResult'
  | 'documentSymbolResult'
  | 'hoverResult'
  | 'moniker'
  | 'diagnosticResult';

export type ForgeWebScriptLsifEdgeLabel =
  | 'contains'
  | 'next'
  | 'item'
  | 'textDocument/definition'
  | 'textDocument/declaration'
  | 'textDocument/implementation'
  | 'textDocument/references'
  | 'textDocument/documentSymbol'
  | 'textDocument/hover'
  | 'moniker'
  | 'diagnostic';

export interface ForgeWebScriptLsifPosition {
  readonly line: number;
  readonly character: number;
}

export interface ForgeWebScriptLsifMetadataVertex {
  readonly id: string;
  readonly type: 'vertex';
  readonly label: 'metaData';
  readonly version: typeof FORGE_WEB_SCRIPT_LSIF_VERSION;
  readonly projectRoot?: string;
  readonly toolName: 'Forge Web Script language service';
  readonly toolVersion: string;
}

export interface ForgeWebScriptLsifProjectVertex {
  readonly id: string;
  readonly type: 'vertex';
  readonly label: 'project';
  readonly kind: 'project';
  readonly name: string;
  readonly resource?: string;
}

export interface ForgeWebScriptLsifDocumentVertex {
  readonly id: string;
  readonly type: 'vertex';
  readonly label: 'document';
  readonly uri: string;
  readonly languageId: 'forge-web-script';
  readonly moduleId: string;
  readonly projectId: string;
  readonly diagnostics: number;
}

export interface ForgeWebScriptLsifRangeVertex {
  readonly id: string;
  readonly type: 'vertex';
  readonly label: 'range';
  readonly start: ForgeWebScriptLsifPosition;
  readonly end: ForgeWebScriptLsifPosition;
  readonly startOffset: number;
  readonly endOffset: number;
}

export interface ForgeWebScriptLsifResultSetVertex {
  readonly id: string;
  readonly type: 'vertex';
  readonly label: 'resultSet';
  readonly symbolName: string;
  readonly symbolKind: string;
}

export interface ForgeWebScriptLsifResultVertex {
  readonly id: string;
  readonly type: 'vertex';
  readonly label:
    | 'definitionResult'
    | 'declarationResult'
    | 'implementationResult'
    | 'referenceResult'
    | 'documentSymbolResult'
    | 'hoverResult'
    | 'diagnosticResult';
  readonly result?: readonly string[];
  readonly contents?: readonly string[];
  readonly diagnostics?: readonly ForgeWebScriptLsifDiagnostic[];
}

export interface ForgeWebScriptLsifMonikerVertex {
  readonly id: string;
  readonly type: 'vertex';
  readonly label: 'moniker';
  readonly kind: 'export';
  readonly scheme: 'forge-web-script';
  readonly identifier: string;
}

export type ForgeWebScriptLsifVertex =
  | ForgeWebScriptLsifMetadataVertex
  | ForgeWebScriptLsifProjectVertex
  | ForgeWebScriptLsifDocumentVertex
  | ForgeWebScriptLsifRangeVertex
  | ForgeWebScriptLsifResultSetVertex
  | ForgeWebScriptLsifResultVertex
  | ForgeWebScriptLsifMonikerVertex;

export interface ForgeWebScriptLsifEdge {
  readonly id: string;
  readonly type: 'edge';
  readonly label: ForgeWebScriptLsifEdgeLabel;
  readonly outV: string;
  readonly inV: string;
}

export interface ForgeWebScriptLsifDiagnostic {
  readonly code: string;
  readonly message: string;
  readonly severity: string;
  readonly phase: string;
  readonly range: ForgeWebScriptLsifPositionRange;
}

export interface ForgeWebScriptLsifGraph {
  readonly vertices: readonly ForgeWebScriptLsifVertex[];
  readonly edges: readonly ForgeWebScriptLsifEdge[];
}

export interface ForgeWebScriptLsifInput {
  readonly service: ForgeWebScriptLanguageService;
  /** All workspace documents, including closed documents read by the host. */
  readonly documents: readonly ForgeWebScriptDocument[];
  readonly projectRoot?: string;
  readonly projectName?: string;
  readonly toolVersion?: string;
}

/** An LSIF diagnostic range uses the same UTF-16 positions as the language service. */
export interface ForgeWebScriptLsifPositionRange {
  readonly start: ForgeWebScriptLsifPosition;
  readonly end: ForgeWebScriptLsifPosition;
}

interface MutableGraph {
  readonly vertices: ForgeWebScriptLsifVertex[];
  readonly edges: ForgeWebScriptLsifEdge[];
}

/**
 * Creates a deterministic LSIF graph from the language-service workspace snapshot.
 *
 * The service remains the source of all navigation, symbol, hover, and diagnostic facts;
 * this function only adapts those facts to LSIF records.
 */
export function createForgeWebScriptLsif(input: ForgeWebScriptLsifInput): ForgeWebScriptLsifGraph;
export function createForgeWebScriptLsif(
  service: ForgeWebScriptLanguageService,
  documents: readonly ForgeWebScriptDocument[],
  projectRoot?: string,
): ForgeWebScriptLsifGraph;
export function createForgeWebScriptLsif(
  inputOrService: ForgeWebScriptLsifInput | ForgeWebScriptLanguageService,
  documents: readonly ForgeWebScriptDocument[] = [],
  projectRoot?: string,
): ForgeWebScriptLsifGraph {
  const input: ForgeWebScriptLsifInput = isInput(inputOrService)
    ? inputOrService
    : { service: inputOrService, documents, ...(projectRoot === undefined ? {} : { projectRoot }) };
  const sortedDocuments = [...input.documents].toSorted((left, right) =>
    canonicalUri(left.uri).localeCompare(canonicalUri(right.uri)),
  );
  const root =
    input.projectRoot === undefined
      ? commonProjectRoot(sortedDocuments.map(({ uri }) => uri))
      : canonicalUri(input.projectRoot);
  const graph: MutableGraph = { vertices: [], edges: [] };
  const ids = new IdAllocator();
  const metadataId = ids.id('metadata');
  const projectId = ids.id(`project:${input.projectName ?? root ?? 'workspace'}`);
  const documentIds = new Map<string, string>();
  for (const document of sortedDocuments)
    documentIds.set(canonicalUri(document.uri), ids.id(`document:${canonicalUri(document.uri)}`));
  const ranges = new Map<string, string>();
  graph.vertices.push(
    {
      id: metadataId,
      type: 'vertex',
      label: 'metaData',
      version: FORGE_WEB_SCRIPT_LSIF_VERSION,
      ...(root === undefined ? {} : { projectRoot: root }),
      toolName: 'Forge Web Script language service',
      toolVersion: input.toolVersion ?? '0.1.0',
    },
    {
      id: projectId,
      type: 'vertex',
      label: 'project',
      kind: 'project',
      name: input.projectName ?? root ?? 'workspace',
      ...(root === undefined ? {} : { resource: root }),
    },
  );
  addEdge(graph, ids, 'contains', metadataId, projectId);

  for (const document of sortedDocuments) {
    addDocument(graph, ids, input.service, document, projectId, documentIds, ranges);
  }
  return finalizeGraph(graph);
}

/** Serializes LSIF records as stable JSONL, with no trailing newline. */
export function serializeForgeWebScriptLsif(graph: ForgeWebScriptLsifGraph): string {
  return [...graph.vertices, ...graph.edges].map((record) => JSON.stringify(record)).join('\n');
}

export const serializeForgeWebScriptLsifGraph = serializeForgeWebScriptLsif;
export const createForgeWebScriptLsifGraph = createForgeWebScriptLsif;

function addDocument(
  graph: MutableGraph,
  ids: IdAllocator,
  service: ForgeWebScriptLanguageService,
  document: ForgeWebScriptDocument,
  projectId: string,
  documentIds: ReadonlyMap<string, string>,
  ranges: Map<string, string>,
): void {
  const sourceUri = document.uri;
  const documentUri = canonicalUri(sourceUri);
  let analysis: ForgeWebScriptAnalysis;
  try {
    analysis = service.diagnose(sourceUri);
  } catch {
    // A deleted or not-yet-open document is still represented, but has no semantic children.
    analysis = { uri: sourceUri, version: document.version, valid: false, diagnostics: [], symbols: [], tokens: [] };
  }
  const moduleId = analysis.module?.name ?? document.fileName ?? documentUri;
  const documentId = documentIds.get(documentUri) ?? ids.id(`document:${documentUri}`);
  graph.vertices.push({
    id: documentId,
    type: 'vertex',
    label: 'document',
    uri: documentUri,
    languageId: 'forge-web-script',
    moduleId,
    projectId,
    diagnostics: analysis.diagnostics.length,
  });
  addEdge(graph, ids, 'contains', projectId, documentId);

  const rangeId = (range: ForgeWebScriptRange): string => {
    const key = `${documentUri}:${range.startOffset}:${range.endOffset}`;
    const existing = ranges.get(key);
    if (existing !== undefined) return existing;
    const id = ids.id(`range:${key}`);
    ranges.set(key, id);
    graph.vertices.push({
      id,
      type: 'vertex',
      label: 'range',
      start: range.start,
      end: range.end,
      startOffset: range.startOffset,
      endOffset: range.endOffset,
    });
    addEdge(graph, ids, 'contains', documentId, id);
    return id;
  };
  const addResultSet = (symbolName: string, symbolKind: string, range: ForgeWebScriptRange): string => {
    const resultSetId = ids.id(
      `resultSet:${documentUri}:${symbolKind}:${symbolName}:${range.startOffset}:${range.endOffset}`,
    );
    graph.vertices.push({ id: resultSetId, type: 'vertex', label: 'resultSet', symbolName, symbolKind });
    return resultSetId;
  };

  const symbols = [...analysis.symbols].toSorted(compareSymbols);
  for (const symbol of symbols) {
    const declarationLocations = safeLocations(() => service.declaration(sourceUri, symbol.range.start));
    const definitionLocations = safeLocations(() => service.definition(sourceUri, symbol.range.start));
    const implementationLocations = safeLocations(() => service.implementation(sourceUri, symbol.range.start));
    const resultSetId = addResultSet(symbol.name, symbol.kind, symbol.range);
    const declarationRangeIds = declarationLocations
      .toSorted(compareLocations)
      .map((location) => rangeIdForLocation(graph, ids, location, ranges, documentIds));
    const definitionRangeIds = definitionLocations
      .toSorted(compareLocations)
      .map((location) => rangeIdForLocation(graph, ids, location, ranges, documentIds));
    const implementationRangeIds = implementationLocations
      .toSorted(compareLocations)
      .map((location) => rangeIdForLocation(graph, ids, location, ranges, documentIds));
    const implementationResultId = ids.id(`implementationResult:${resultSetId}`);
    graph.vertices.push({
      id: implementationResultId,
      type: 'vertex',
      label: 'implementationResult',
      result: implementationRangeIds,
    });
    addEdge(graph, ids, 'textDocument/implementation', resultSetId, implementationResultId);
    const definitionResultId = ids.id(`definitionResult:${resultSetId}`);
    graph.vertices.push({
      id: definitionResultId,
      type: 'vertex',
      label: 'definitionResult',
      result: definitionRangeIds,
    });
    addEdge(graph, ids, 'textDocument/definition', resultSetId, definitionResultId);
    const declarationResultId = ids.id(`declarationResult:${resultSetId}`);
    graph.vertices.push({
      id: declarationResultId,
      type: 'vertex',
      label: 'declarationResult',
      result: declarationRangeIds,
    });
    addEdge(graph, ids, 'textDocument/declaration', resultSetId, declarationResultId);
    for (const rangeId of definitionRangeIds) addEdge(graph, ids, 'item', definitionResultId, rangeId);
    for (const rangeId of declarationRangeIds) addEdge(graph, ids, 'item', declarationResultId, rangeId);
    for (const rangeId of implementationRangeIds) addEdge(graph, ids, 'item', implementationResultId, rangeId);

    const references = safeLocations(() => service.references(sourceUri, symbol.range.start));
    const referenceRangeIds = references
      .toSorted(compareLocations)
      .map((location) => rangeIdForLocation(graph, ids, location, ranges, documentIds));
    const referenceResultId = ids.id(`referenceResult:${resultSetId}`);
    graph.vertices.push({
      id: referenceResultId,
      type: 'vertex',
      label: 'referenceResult',
      result: referenceRangeIds,
    });
    addEdge(graph, ids, 'textDocument/references', resultSetId, referenceResultId);
    for (const rangeId of referenceRangeIds) addEdge(graph, ids, 'item', referenceResultId, rangeId);
    const hover = safeHover(() => service.hover(sourceUri, symbol.range.start));
    if (hover !== undefined) {
      const hoverId = ids.id(`hoverResult:${resultSetId}`);
      graph.vertices.push({ id: hoverId, type: 'vertex', label: 'hoverResult', contents: hover.contents });
      addEdge(graph, ids, 'textDocument/hover', resultSetId, hoverId);
    }
    const monikerId = ids.id(`moniker:${resultSetId}`);
    graph.vertices.push({
      id: monikerId,
      type: 'vertex',
      label: 'moniker',
      kind: 'export',
      scheme: 'forge-web-script',
      identifier: `${moduleId}#${symbol.kind}:${symbol.name}:${symbol.range.startOffset}`,
    });
    addEdge(graph, ids, 'moniker', resultSetId, monikerId);
  }

  const documentSymbols = safeSymbols(() => service.documentSymbols(sourceUri));
  const symbolResultId = ids.id(`documentSymbolResult:${documentUri}`);
  const symbolRangeIds = flattenSymbols(documentSymbols).map(({ selectionRange }) => rangeId(selectionRange));
  graph.vertices.push({
    id: symbolResultId,
    type: 'vertex',
    label: 'documentSymbolResult',
    result: symbolRangeIds,
  });
  addEdge(graph, ids, 'textDocument/documentSymbol', documentId, symbolResultId);
  for (const rangeId of symbolRangeIds) addEdge(graph, ids, 'item', symbolResultId, rangeId);
  const diagnostics = analysis.diagnostics.map((diagnostic) => ({
    code: diagnostic.code,
    message: diagnostic.message,
    severity: diagnostic.severity,
    phase: diagnostic.phase,
    range: { start: diagnostic.range.start, end: diagnostic.range.end },
  }));
  if (diagnostics.length > 0) {
    const diagnosticResultId = ids.id(`diagnosticResult:${document.uri}`);
    graph.vertices.push({ id: diagnosticResultId, type: 'vertex', label: 'diagnosticResult', diagnostics });
    addEdge(graph, ids, 'diagnostic', documentId, diagnosticResultId);
  }
}

function rangeIdForLocation(
  graph: MutableGraph,
  ids: IdAllocator,
  location: ForgeWebScriptLocation,
  ranges: Map<string, string>,
  documentIds: ReadonlyMap<string, string>,
): string {
  const uri = canonicalUri(location.uri);
  const key = `${uri}:${location.range.startOffset}:${location.range.endOffset}`;
  const existing = ranges.get(key);
  if (existing !== undefined) return existing;
  const id = ids.id(`range:${key}`);
  ranges.set(key, id);
  graph.vertices.push({
    id,
    type: 'vertex',
    label: 'range',
    start: location.range.start,
    end: location.range.end,
    startOffset: location.range.startOffset,
    endOffset: location.range.endOffset,
  });
  const documentId = documentIds.get(uri);
  if (documentId !== undefined) addEdge(graph, ids, 'contains', documentId, id);
  return id;
}

function addEdge(
  graph: MutableGraph,
  ids: IdAllocator,
  label: ForgeWebScriptLsifEdgeLabel,
  outV: string,
  inV: string,
): void {
  graph.edges.push({ id: ids.id(`edge:${label}:${outV}:${inV}`), type: 'edge', label, outV, inV });
}

function finalizeGraph(graph: MutableGraph): ForgeWebScriptLsifGraph {
  const vertices = [...graph.vertices].toSorted(compareRecords);
  const edges = [...graph.edges].toSorted(compareRecords);
  return { vertices, edges };
}

function compareRecords(left: { readonly id: string }, right: { readonly id: string }): number {
  return left.id.localeCompare(right.id);
}

function compareSymbols(
  left: ForgeWebScriptAnalysis['symbols'][number],
  right: ForgeWebScriptAnalysis['symbols'][number],
): number {
  return (
    left.range.startOffset - right.range.startOffset ||
    left.range.endOffset - right.range.endOffset ||
    left.name.localeCompare(right.name)
  );
}

function compareLocations(left: ForgeWebScriptLocation, right: ForgeWebScriptLocation): number {
  return (
    canonicalUri(left.uri).localeCompare(canonicalUri(right.uri)) ||
    left.range.startOffset - right.range.startOffset ||
    left.range.endOffset - right.range.endOffset
  );
}

function flattenSymbols(symbols: readonly ForgeWebScriptDocumentSymbol[]): ForgeWebScriptDocumentSymbol[] {
  return symbols.flatMap((symbol) => [symbol, ...flattenSymbols(symbol.children)]);
}

function safeLocations(factory: () => readonly ForgeWebScriptLocation[]): readonly ForgeWebScriptLocation[] {
  return safe(factory, []);
}

function safeHover(factory: () => ForgeWebScriptHover | undefined): ForgeWebScriptHover | undefined {
  return safeOptional(factory);
}

function safeSymbols(factory: () => readonly ForgeWebScriptDocumentSymbol[]): readonly ForgeWebScriptDocumentSymbol[] {
  return safe(factory, []);
}

function safe<T>(factory: () => T, fallback: T): T {
  try {
    return factory();
  } catch {
    return fallback;
  }
}

function safeOptional<T>(factory: () => T | undefined): T | undefined {
  try {
    return factory();
  } catch {
    return;
  }
}

function canonicalUri(uri: string): string {
  const normalized = uri.replaceAll('\\', '/');
  if (normalized.startsWith('file://')) return `file://${collapsePath(normalized.slice('file://'.length))}`;
  if (normalized.startsWith('file:')) return `file://${collapsePath(normalized.slice('file:'.length))}`;
  if (normalized.startsWith('/')) return `file://${collapsePath(normalized)}`;
  return normalized.replaceAll(/\/+/gu, '/');
}

function collapsePath(path: string): string {
  const absolute = path.startsWith('/') ? path : `/${path}`;
  const parts: string[] = [];
  for (const part of absolute.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  return `/${parts.join('/')}`;
}

function commonProjectRoot(uris: readonly string[]): string | undefined {
  const paths = uris
    .filter((uri) => uri.startsWith('file://'))
    .map((uri) => uri.slice('file://'.length).split('/').slice(1, -1));
  if (paths.length === 0) return undefined;
  const first = paths[0] ?? [];
  let length = first.length;
  for (const path of paths.slice(1)) {
    let shared = 0;
    while (shared < path.length && shared < first.length && path[shared] === first[shared]) shared += 1;
    length = Math.min(length, shared);
  }
  return `file://${`/${first.slice(0, Math.max(0, length)).join('/')}`}`;
}

function isInput(value: ForgeWebScriptLsifInput | ForgeWebScriptLanguageService): value is ForgeWebScriptLsifInput {
  return 'service' in value;
}

class IdAllocator {
  readonly #ids = new Map<string, string>();
  #next = 1;

  public id(key: string): string {
    const existing = this.#ids.get(key);
    if (existing !== undefined) return existing;
    const id = `FWS-${String(this.#next).padStart(6, '0')}`;
    this.#next += 1;
    this.#ids.set(key, id);
    return id;
  }
}
