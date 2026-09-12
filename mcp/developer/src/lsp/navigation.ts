import {
  boundedLimit,
  hoverContents,
  isSupported,
  normalizeLocations,
  normalizeSymbols,
  position,
  range,
  type LspLocation,
  type LspPosition,
  type LspSupportedResult,
  type LspSymbol,
  type LspUnsupportedResult,
} from './contracts.ts';
import { getLspRequestSession, openLspDocument } from './registry.ts';

type Unsupported = LspUnsupportedResult;

export interface LspNavigationRequest {
  readonly sessionId?: string;
  readonly languageId?: string;
}

export interface LspDocumentPositionRequest extends LspNavigationRequest {
  readonly filePath: string;
  readonly line: number;
  readonly character: number;
}

export interface LspListSymbolsResult extends LspSupportedResult {
  readonly filePath: string;
  readonly uri: string;
  readonly symbols: readonly LspSymbol[];
  readonly truncated: boolean;
}

export interface LspFindSymbolResult extends LspSupportedResult {
  readonly query: string;
  readonly symbols: readonly LspSymbol[];
  readonly truncated: boolean;
}

export interface LspDefinitionResult extends LspSupportedResult {
  readonly locations: readonly LspLocation[];
  readonly truncated: boolean;
}

export interface LspHoverResult extends LspSupportedResult {
  readonly filePath: string;
  readonly uri: string;
  readonly range?: unknown;
  readonly documentation: string;
  readonly source: readonly string[];
}

export interface LspHighlightsResult extends LspSupportedResult {
  readonly filePath: string;
  readonly uri: string;
  readonly highlights: readonly LspLocation[];
  readonly truncated: boolean;
}

function requestPosition(request: LspDocumentPositionRequest): LspPosition {
  return position(request.line, request.character);
}

async function openPosition(request: LspDocumentPositionRequest) {
  const session = await getLspRequestSession(request.sessionId, request.languageId);
  const opened = await openLspDocument(request.filePath, session.sessionId, session.languageId);
  return { session, opened, position: requestPosition(request) };
}

export async function listLspSymbols(
  filePath: string,
  options: LspNavigationRequest & { readonly limit?: number },
): Promise<LspListSymbolsResult | Unsupported> {
  const session = await getLspRequestSession(options.sessionId, options.languageId);
  if (!isSupported(session.protocol.getCapabilities(), 'documentSymbolProvider')) {
    return {
      supported: false,
      operation: 'lsp_list_symbols',
      sessionId: session.sessionId,
      languageId: session.languageId,
      reason: `The ${session.languageId} language server does not advertise documentSymbolProvider.`,
    };
  }
  const opened = await openLspDocument(filePath, session.sessionId, session.languageId);
  const value = await session.protocol.request<unknown>('textDocument/documentSymbol', {
    textDocument: { uri: opened.uri },
  });
  const limit = boundedLimit(options.limit);
  const symbols = normalizeSymbols(value, limit, opened.uri);
  return {
    supported: true,
    sessionId: session.sessionId,
    languageId: session.languageId,
    filePath: opened.filePath,
    uri: opened.uri,
    symbols,
    truncated: Array.isArray(value) && value.length > symbols.length,
  };
}

export async function findLspSymbol(
  query: string,
  options: LspNavigationRequest & { readonly limit?: number },
): Promise<LspFindSymbolResult | Unsupported> {
  const session = await getLspRequestSession(options.sessionId, options.languageId);
  if (!isSupported(session.protocol.getCapabilities(), 'workspaceSymbolProvider')) {
    return {
      supported: false,
      operation: 'lsp_find_symbol',
      sessionId: session.sessionId,
      languageId: session.languageId,
      reason: `The ${session.languageId} language server does not advertise workspaceSymbolProvider.`,
    };
  }
  const value = await session.protocol.request<unknown>('workspace/symbol', { query });
  const limit = boundedLimit(options.limit);
  const symbols = normalizeSymbols(value, limit);
  return {
    supported: true,
    sessionId: session.sessionId,
    languageId: session.languageId,
    query,
    symbols,
    truncated: Array.isArray(value) && value.length > symbols.length,
  };
}

export async function inspectLspSymbol(request: LspDocumentPositionRequest): Promise<LspHoverResult | Unsupported> {
  return getHover(request, 'lsp_inspect_symbol');
}

export async function goToLspDefinition(
  request: LspDocumentPositionRequest & { readonly limit?: number },
): Promise<LspDefinitionResult | Unsupported> {
  const { session, opened, position: cursor } = await openPosition(request);
  if (!isSupported(session.protocol.getCapabilities(), 'definitionProvider')) {
    return {
      supported: false,
      operation: 'lsp_go_to_definition',
      sessionId: session.sessionId,
      languageId: session.languageId,
      reason: `The ${session.languageId} language server does not advertise definitionProvider.`,
    };
  }
  const value = await session.protocol.request<unknown>('textDocument/definition', {
    textDocument: { uri: opened.uri },
    position: cursor,
  });
  const limit = boundedLimit(request.limit);
  const locations = normalizeLocations(value, limit);
  return {
    supported: true,
    sessionId: session.sessionId,
    languageId: session.languageId,
    locations,
    truncated: Array.isArray(value) && value.length > locations.length,
  };
}

export async function getLspSymbolDocumentation(
  request: LspDocumentPositionRequest,
): Promise<LspHoverResult | Unsupported> {
  return getHover(request, 'lsp_get_symbol_documentation');
}

export async function getLspSymbolSource(request: LspDocumentPositionRequest): Promise<LspHoverResult | Unsupported> {
  return getHover(request, 'lsp_get_symbol_source');
}

export async function getLspDocumentHighlights(
  request: LspDocumentPositionRequest & { readonly limit?: number },
): Promise<LspHighlightsResult | Unsupported> {
  const { session, opened, position: cursor } = await openPosition(request);
  if (!isSupported(session.protocol.getCapabilities(), 'documentHighlightProvider')) {
    return {
      supported: false,
      operation: 'lsp_get_document_highlights',
      sessionId: session.sessionId,
      languageId: session.languageId,
      reason: `The ${session.languageId} language server does not advertise documentHighlightProvider.`,
    };
  }
  const value = await session.protocol.request<unknown>('textDocument/documentHighlight', {
    textDocument: { uri: opened.uri },
    position: cursor,
  });
  const limit = boundedLimit(request.limit);
  const highlights = normalizeLocations(value, limit);
  return {
    supported: true,
    sessionId: session.sessionId,
    languageId: session.languageId,
    filePath: opened.filePath,
    uri: opened.uri,
    highlights,
    truncated: Array.isArray(value) && value.length > highlights.length,
  };
}

async function getHover(request: LspDocumentPositionRequest, operation: string): Promise<LspHoverResult | Unsupported> {
  const { session, opened, position: cursor } = await openPosition(request);
  if (!isSupported(session.protocol.getCapabilities(), 'hoverProvider')) {
    return {
      supported: false,
      operation,
      sessionId: session.sessionId,
      languageId: session.languageId,
      reason: `The ${session.languageId} language server does not advertise hoverProvider.`,
    };
  }
  const value = await session.protocol.request<unknown>('textDocument/hover', {
    textDocument: { uri: opened.uri },
    position: cursor,
  });
  const contents = hoverContents(value);
  return {
    supported: true,
    sessionId: session.sessionId,
    languageId: session.languageId,
    filePath: opened.filePath,
    uri: opened.uri,
    ...(value && typeof value === 'object' && 'range' in value && value.range ? { range: range(value.range) } : {}),
    documentation: contents.documentation,
    source: contents.source,
  };
}
