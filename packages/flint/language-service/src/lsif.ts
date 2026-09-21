import type {
  FlintAnalysis,
  FlintDocument,
  FlintDocumentSymbol,
  FlintHover,
  FlintLanguageService,
  FlintLocation,
  FlintRange,
} from './types.js';

/** The LSIF version represented by this module. */
export const FLINT_LSIF_VERSION = '0.6.0' as const;

/** LSIF graph vertex label enumeration. */
export type FlintLsifVertexLabel =
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

/** LSIF graph edge label enumeration. */
export type FlintLsifEdgeLabel =
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

/** LSIF line and character position coordinate. */
export interface FlintLsifPosition {
  readonly line: number;
  readonly character: number;
}

/** LSIF metadata vertex declaring format version and tool capabilities. */
export interface FlintLsifMetadataVertex {
  readonly id: string;
  readonly type: 'vertex';
  readonly label: 'metaData';
  readonly version: typeof FLINT_LSIF_VERSION;
  readonly projectRoot?: string;
  readonly toolName: 'Flint language service';
  readonly toolVersion: string;
}

/** LSIF project vertex representing a compilation root. */
export interface FlintLsifProjectVertex {
  readonly id: string;
  readonly type: 'vertex';
  readonly label: 'project';
  readonly kind: 'project';
  readonly name: string;
  readonly resource?: string;
}

/** LSIF document vertex representing an indexed source file. */
export interface FlintLsifDocumentVertex {
  readonly id: string;
  readonly type: 'vertex';
  readonly label: 'document';
  readonly uri: string;
  readonly languageId: 'flint';
  readonly moduleId: string;
  readonly projectId: string;
  readonly diagnostics: number;
}

/** LSIF range vertex bounding a symbol occurrence. */
export interface FlintLsifRangeVertex {
  readonly id: string;
  readonly type: 'vertex';
  readonly label: 'range';
  readonly start: FlintLsifPosition;
  readonly end: FlintLsifPosition;
  readonly startOffset: number;
  readonly endOffset: number;
}

/** LSIF result set vertex linking multiple ranges to shared definitions. */
export interface FlintLsifResultSetVertex {
  readonly id: string;
  readonly type: 'vertex';
  readonly label: 'resultSet';
  readonly symbolName: string;
  readonly symbolKind: string;
}

/** LSIF query result vertex containing hover, definition, or references. */
export interface FlintLsifResultVertex {
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
  readonly diagnostics?: readonly FlintLsifDiagnostic[];
}

/** LSIF moniker vertex establishing global cross-project symbol identity. */
export interface FlintLsifMonikerVertex {
  readonly id: string;
  readonly type: 'vertex';
  readonly label: 'moniker';
  readonly kind: 'export';
  readonly scheme: 'flint';
  readonly identifier: string;
}

/** Tagged union of all valid LSIF graph vertices. */
export type FlintLsifVertex =
  | FlintLsifMetadataVertex
  | FlintLsifProjectVertex
  | FlintLsifDocumentVertex
  | FlintLsifRangeVertex
  | FlintLsifResultSetVertex
  | FlintLsifResultVertex
  | FlintLsifMonikerVertex;

/** Directed relationship edge between LSIF graph vertices. */
export interface FlintLsifEdge {
  readonly id: string;
  readonly type: 'edge';
  readonly label: FlintLsifEdgeLabel;
  readonly outV: string;
  readonly inV: string;
}

/** Diagnostic record exported into LSIF dump artifacts. */
export interface FlintLsifDiagnostic {
  readonly code: string;
  readonly message: string;
  readonly severity: string;
  readonly phase: string;
  readonly range: FlintLsifPositionRange;
}

/** Complete LSIF index dump containing vertices and edges. */
export interface FlintLsifGraph {
  readonly vertices: readonly FlintLsifVertex[];
  readonly edges: readonly FlintLsifEdge[];
}

/** Source documents and language service input for LSIF graph generation. */
export interface FlintLsifInput {
  readonly service: FlintLanguageService;
  /** All workspace documents, including closed documents read by the host. */
  readonly documents: readonly FlintDocument[];
  readonly projectRoot?: string;
  readonly projectName?: string;
  readonly toolVersion?: string;
}

/** An LSIF diagnostic range uses the same UTF-16 positions as the language service. */
export interface FlintLsifPositionRange {
  readonly start: FlintLsifPosition;
  readonly end: FlintLsifPosition;
}

/** Mutable builder accumulating LSIF vertices and edges during graph synthesis. */
interface MutableGraph {
  readonly vertices: FlintLsifVertex[];
  readonly edges: FlintLsifEdge[];
}

/** Monotonic integer identifier generator for LSIF vertices and edges. */
class IdAllocator {
  readonly #ids = new Map<string, string>();
  #next = 1;

  /** Allocates the next sequential integer identifier. */
  public id(key: string): string {
    const existing = this.#ids.get(key);
    if (existing !== undefined) return existing;
    const id = `FLINT-${String(this.#next).padStart(6, '0')}`;
    this.#next += 1;
    this.#ids.set(key, id);
    return id;
  }
}

/**
 * Creates a deterministic LSIF graph from the language-service workspace snapshot.
 *
 * The service remains the source of all navigation, symbol, hover, and diagnostic facts;
 * this function only adapts those facts to LSIF records.
 */
export function createFlintLsif(input: FlintLsifInput): FlintLsifGraph;
/** Generates a complete LSIF index dump for the specified documents. */
// skipcq: JS-R1005
export function createFlintLsif(
  service: FlintLanguageService,
  documents: readonly FlintDocument[],
  projectRoot?: string,
): FlintLsifGraph;
/** Generates a complete LSIF index dump for the specified documents. */
export function createFlintLsif(
  inputOrService: FlintLsifInput | FlintLanguageService,
  documents: readonly FlintDocument[] = [],
  projectRoot?: string,
): FlintLsifGraph {
  const input: FlintLsifInput = isInput(inputOrService)
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
      version: FLINT_LSIF_VERSION,
      ...(root === undefined ? {} : { projectRoot: root }),
      toolName: 'Flint language service',
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
export function serializeFlintLsif(graph: FlintLsifGraph): string {
  return [...graph.vertices, ...graph.edges].map((record) => JSON.stringify(record)).join('\n');
}

export const serializeFlintLsifGraph = serializeFlintLsif;
export const createFlintLsifGraph = createFlintLsif;

/** Indexes a document into the LSIF graph, emitting ranges and edges. */
// skipcq: JS-R1005
function addDocument(
  graph: MutableGraph,
  ids: IdAllocator,
  service: FlintLanguageService,
  document: FlintDocument,
  projectId: string,
  documentIds: ReadonlyMap<string, string>,
  ranges: Map<string, string>,
): void {
  const sourceUri = document.uri;
  const documentUri = canonicalUri(sourceUri);
  let analysis: FlintAnalysis;
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
    languageId: 'flint',
    moduleId,
    projectId,
    diagnostics: analysis.diagnostics.length,
  });
  addEdge(graph, ids, 'contains', projectId, documentId);

  // skipcq: JS-D1001
  const rangeId = (range: FlintRange): string => {
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
  // skipcq: JS-D1001
  const addResultSet = (symbolName: string, symbolKind: string, range: FlintRange): string => {
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
      scheme: 'flint',
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

/** Resolves or creates an LSIF range vertex for a source location. */
function rangeIdForLocation(
  graph: MutableGraph,
  ids: IdAllocator,
  location: FlintLocation,
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

/** Emits a directed relationship edge between two LSIF elements. */
function addEdge(graph: MutableGraph, ids: IdAllocator, label: FlintLsifEdgeLabel, outV: string, inV: string): void {
  graph.edges.push({ id: ids.id(`edge:${label}:${outV}:${inV}`), type: 'edge', label, outV, inV });
}

/** Finalizes and sorts LSIF graph elements for deterministic serialization. */
function finalizeGraph(graph: MutableGraph): FlintLsifGraph {
  const vertices = [...graph.vertices].toSorted(compareRecords);
  const edges = [...graph.edges].toSorted(compareRecords);
  return { vertices, edges };
}

/** Sort comparator for ordering LSIF graph entries. */
function compareRecords(left: { readonly id: string }, right: { readonly id: string }): number {
  return left.id.localeCompare(right.id);
}

/** Sort comparator for ordering document symbols. */
function compareSymbols(left: FlintAnalysis['symbols'][number], right: FlintAnalysis['symbols'][number]): number {
  return (
    left.range.startOffset - right.range.startOffset ||
    left.range.endOffset - right.range.endOffset ||
    left.name.localeCompare(right.name)
  );
}

/** Sort comparator for ordering source locations. */
function compareLocations(left: FlintLocation, right: FlintLocation): number {
  return (
    canonicalUri(left.uri).localeCompare(canonicalUri(right.uri)) ||
    left.range.startOffset - right.range.startOffset ||
    left.range.endOffset - right.range.endOffset
  );
}

/** Flattens hierarchical document symbol trees into a list. */
function flattenSymbols(symbols: readonly FlintDocumentSymbol[]): FlintDocumentSymbol[] {
  return symbols.flatMap((symbol) => [symbol, ...flattenSymbols(symbol.children)]);
}

/** Wraps location query execution with defensive error handling. */
function safeLocations(factory: () => readonly FlintLocation[]): readonly FlintLocation[] {
  return safe(factory, []);
}

/** Wraps hover query execution with defensive error handling. */
function safeHover(factory: () => FlintHover | undefined): FlintHover | undefined {
  return safeOptional(factory);
}

/** Wraps symbol query execution with defensive error handling. */
function safeSymbols(factory: () => readonly FlintDocumentSymbol[]): readonly FlintDocumentSymbol[] {
  return safe(factory, []);
}

/** Executes a language service query safely, catching thrown errors. */
function safe<T>(factory: () => T, fallback: T): T {
  try {
    return factory();
  } catch {
    return fallback;
  }
}

/** Executes an optional query safely, returning fallback on error. */
function safeOptional<T>(factory: () => T | undefined): T | undefined {
  try {
    return factory();
  } catch {
    return undefined;
  }
}

/** Normalizes a document URI into canonical form. */
function canonicalUri(uri: string): string {
  const normalized = uri.replaceAll('\\', '/');
  if (normalized.startsWith('file://')) return `file://${collapsePath(normalized.slice('file://'.length))}`;
  if (normalized.startsWith('file:')) return `file://${collapsePath(normalized.slice('file:'.length))}`;
  if (normalized.startsWith('/')) return `file://${collapsePath(normalized)}`;
  return normalized.replaceAll(/\/+/gu, '/');
}

/** Simplifies and collapses relative path segments. */
// skipcq: JS-R1005
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

/** Determines the lowest common directory root among document URIs. */
// skipcq: JS-R1005
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

/** Type guard checking whether input matches the FlintLsifInput object shape. */
function isInput(value: FlintLsifInput | FlintLanguageService): value is FlintLsifInput {
  return 'service' in value;
}
