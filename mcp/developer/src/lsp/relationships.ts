import {
  boundedLimit,
  isSupported,
  normalizeLocationLike,
  normalizeLocations,
  position,
  unsupported,
  type LspLocation,
  type LspPosition,
  type LspSupportedResult,
  type LspUnsupportedResult,
} from './contracts.ts';
import { getLspEditingContext, getLspRequestSession, openLspDocument } from './registry.ts';

type Unsupported = LspUnsupportedResult;

interface PositionRequest {
  readonly filePath: string;
  readonly line: number;
  readonly character: number;
  readonly sessionId?: string;
  readonly languageId?: string;
}

export interface LspReferencesResult extends LspSupportedResult {
  readonly references: readonly LspLocation[];
  readonly truncated: boolean;
  readonly includeDeclaration: boolean;
}

export interface LspCallHierarchyItem {
  readonly name: string;
  readonly kind: number;
  readonly uri: string;
  readonly location: LspLocation;
  readonly selectionRange: LspLocation['range'];
  readonly detail?: string;
}

export interface LspCallResult extends LspSupportedResult {
  readonly direction: 'incoming' | 'outgoing' | 'both';
  readonly callers: readonly {
    readonly item: LspCallHierarchyItem;
    readonly ranges: readonly LspLocation['range'][];
  }[];
  readonly truncated: boolean;
}

export interface LspImplementationsResult extends LspSupportedResult {
  readonly implementations: readonly LspLocation[];
  readonly truncated: boolean;
}

export interface LspTypeHierarchyResult extends LspSupportedResult {
  readonly direction: 'supertypes' | 'subtypes' | 'both';
  readonly items: readonly LspCallHierarchyItem[];
  readonly truncated: boolean;
}

export interface LspCrossReferencesResult extends LspSupportedResult {
  readonly references: readonly LspLocation[];
  readonly workspaceFolders: readonly string[];
  readonly truncated: boolean;
  readonly includeDeclaration: boolean;
}

function cursor(request: PositionRequest): LspPosition {
  return position(request.line, request.character);
}

async function openPosition(request: PositionRequest) {
  const session = await getLspRequestSession(request.sessionId, request.languageId);
  const opened = await openLspDocument(request.filePath, session.sessionId, session.languageId);
  return { session, opened, position: cursor(request) };
}

export async function findLspReferences(
  request: PositionRequest & { readonly includeDeclaration?: boolean; readonly limit?: number },
): Promise<LspReferencesResult | Unsupported> {
  const { session, opened, position: requestPosition } = await openPosition(request);
  if (!isSupported(session.protocol.getCapabilities(), 'referencesProvider')) {
    return unsupported('lsp_find_references', session.sessionId, session.languageId, 'referencesProvider');
  }
  const includeDeclaration = request.includeDeclaration ?? false;
  const value = await session.protocol.request<unknown>('textDocument/references', {
    textDocument: { uri: opened.uri },
    position: requestPosition,
    context: { includeDeclaration },
  });
  const limit = boundedLimit(request.limit);
  const references = normalizeLocations(value, limit);
  return {
    supported: true,
    sessionId: session.sessionId,
    languageId: session.languageId,
    references,
    truncated: Array.isArray(value) && value.length > references.length,
    includeDeclaration,
  };
}

export async function findLspCallers(
  request: PositionRequest & { readonly direction?: 'incoming' | 'outgoing' | 'both'; readonly limit?: number },
): Promise<LspCallResult | Unsupported> {
  const { session, opened, position: requestPosition } = await openPosition(request);
  if (!isSupported(session.protocol.getCapabilities(), 'callHierarchyProvider')) {
    return unsupported('lsp_find_callers', session.sessionId, session.languageId, 'callHierarchyProvider');
  }
  const prepared = await session.protocol.request<unknown>('textDocument/prepareCallHierarchy', {
    textDocument: { uri: opened.uri },
    position: requestPosition,
  });
  const item = Array.isArray(prepared) ? prepared[0] : prepared;
  const direction = request.direction ?? 'incoming';
  const limit = boundedLimit(request.limit);
  if (!item) {
    return {
      supported: true,
      sessionId: session.sessionId,
      languageId: session.languageId,
      direction,
      callers: [],
      truncated: false,
    };
  }
  const callers: LspCallResult['callers'][number][] = [];
  let truncated = false;
  for (const method of direction === 'both'
    ? ['incomingCalls', 'outgoingCalls']
    : [direction === 'incoming' ? 'incomingCalls' : 'outgoingCalls']) {
    const result = await session.protocol.request<unknown>(`callHierarchy/${method}`, { item });
    if (!Array.isArray(result)) continue;
    for (const [index, entry] of result.entries()) {
      if (index >= limit) {
        truncated = true;
        break;
      }
      if (!isRecord(entry)) continue;
      const callItem = normalizeCallItem(entry['from'] ?? entry['to']);
      if (!callItem) continue;
      const ranges = Array.isArray(entry['fromRanges'])
        ? entry['fromRanges'].flatMap((value) => {
            const location = normalizeLocationLike({ uri: callItem.uri, range: value });
            return location ? [location.range] : [];
          })
        : [];
      callers.push({ item: callItem, ranges });
    }
    if (callers.length >= limit) break;
  }
  return {
    supported: true,
    sessionId: session.sessionId,
    languageId: session.languageId,
    direction,
    callers: callers.slice(0, limit),
    truncated,
  };
}

export async function findLspImplementations(
  request: PositionRequest & { readonly limit?: number },
): Promise<LspImplementationsResult | Unsupported> {
  const { session, opened, position: requestPosition } = await openPosition(request);
  if (!isSupported(session.protocol.getCapabilities(), 'implementationProvider')) {
    return unsupported('lsp_find_implementations', session.sessionId, session.languageId, 'implementationProvider');
  }
  const value = await session.protocol.request<unknown>('textDocument/implementation', {
    textDocument: { uri: opened.uri },
    position: requestPosition,
  });
  const limit = boundedLimit(request.limit);
  const implementations = normalizeLocations(value, limit);
  return {
    supported: true,
    sessionId: session.sessionId,
    languageId: session.languageId,
    implementations,
    truncated: Array.isArray(value) && value.length > implementations.length,
  };
}

export async function getLspTypeHierarchy(
  request: PositionRequest & { readonly direction?: 'supertypes' | 'subtypes' | 'both'; readonly limit?: number },
): Promise<LspTypeHierarchyResult | Unsupported> {
  const { session, opened, position: requestPosition } = await openPosition(request);
  if (!isSupported(session.protocol.getCapabilities(), 'typeHierarchyProvider')) {
    return unsupported('lsp_type_hierarchy', session.sessionId, session.languageId, 'typeHierarchyProvider');
  }
  const prepared = await session.protocol.request<unknown>('textDocument/prepareTypeHierarchy', {
    textDocument: { uri: opened.uri },
    position: requestPosition,
  });
  const item = Array.isArray(prepared) ? prepared[0] : prepared;
  const direction = request.direction ?? 'both';
  const limit = boundedLimit(request.limit);
  const items: LspCallHierarchyItem[] = [];
  let truncated = false;
  if (item) {
    for (const method of direction === 'both' ? ['supertypes', 'subtypes'] : [direction]) {
      const result = await session.protocol.request<unknown>(`typeHierarchy/${method}`, { item });
      if (!Array.isArray(result)) continue;
      for (const [index, value] of result.entries()) {
        if (index >= limit) {
          truncated = true;
          break;
        }
        const normalized = normalizeCallItem(value);
        if (!normalized) continue;
        items.push(normalized);
      }
      if (items.length >= limit) break;
    }
  }
  return {
    supported: true,
    sessionId: session.sessionId,
    languageId: session.languageId,
    direction,
    items: items.slice(0, limit),
    truncated,
  };
}

export async function getLspCrossRepoReferences(
  request: PositionRequest & { readonly includeDeclaration?: boolean; readonly limit?: number },
): Promise<LspCrossReferencesResult | Unsupported> {
  const result = await findLspReferences(request);
  if (!result.supported) return result;
  const session = await getLspRequestSession(request.sessionId, request.languageId);
  const context = await getLspEditingContext(session.sessionId, session.languageId);
  return {
    supported: true,
    sessionId: result.sessionId,
    languageId: result.languageId,
    references: result.references,
    workspaceFolders: context.workspaceFolders.map((folder) => folder.path),
    truncated: result.truncated,
    includeDeclaration: result.includeDeclaration,
  };
}

function normalizeCallItem(value: unknown): LspCallHierarchyItem | undefined {
  if (!isRecord(value) || typeof value['name'] !== 'string' || typeof value['uri'] !== 'string') return undefined;
  const location = normalizeLocationLike({ uri: value['uri'], range: value['range'] });
  const selection = normalizeLocationLike({ uri: value['uri'], range: value['selectionRange'] });
  if (!location || !selection) return undefined;
  return {
    name: value['name'],
    kind: typeof value['kind'] === 'number' ? value['kind'] : 0,
    uri: value['uri'],
    location,
    selectionRange: selection.range,
    ...(typeof value['detail'] === 'string' ? { detail: value['detail'] } : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
