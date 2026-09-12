import { fileURLToPath, pathToFileURL } from 'node:url';

import { findRepoRoot } from '@mission-platform/mcp-shared/repo/paths';

import type { LspDiagnostic } from './protocol.ts';

export interface LspPosition {
  readonly line: number;
  readonly character: number;
}

export interface LspRange {
  readonly start: LspPosition;
  readonly end: LspPosition;
}

export interface LspLocation {
  readonly uri: string;
  readonly path: string | null;
  readonly range: LspRange;
  readonly external: boolean;
}

export interface LspSymbol {
  readonly name: string;
  readonly kind: number;
  readonly detail?: string;
  readonly location: LspLocation;
  readonly containerName?: string;
  readonly children?: readonly LspSymbol[];
}

export interface LspTextDocumentIdentifier {
  readonly uri: string;
  readonly version?: number;
}

export interface LspTextEdit {
  readonly range: LspRange;
  readonly newText: string;
}

export interface LspWorkspaceEdit {
  readonly changes?: Readonly<Record<string, readonly LspTextEdit[]>>;
  readonly documentChanges?: readonly (LspTextDocumentEdit | LspResourceOperation)[];
}

export interface LspTextDocumentEdit {
  readonly textDocument: LspTextDocumentIdentifier;
  readonly edits: readonly LspTextEdit[];
}

export interface LspResourceOperation {
  readonly kind: 'create' | 'delete' | 'rename';
  readonly uri?: string;
  readonly oldUri?: string;
  readonly newUri?: string;
}

export interface LspDiagnosticDelta {
  readonly before: readonly LspDiagnostic[];
  readonly after: readonly LspDiagnostic[];
  readonly introduced: readonly LspDiagnostic[];
  readonly resolved: readonly LspDiagnostic[];
}

export interface LspCommandResult {
  readonly command: string;
  readonly sessionId: string;
  readonly languageId: string;
  readonly applied: boolean;
  readonly result?: unknown;
  readonly message: string;
}

export interface LspUnsupportedResult {
  readonly supported: false;
  readonly operation: string;
  readonly sessionId: string;
  readonly languageId: string;
  readonly reason: string;
}

export interface LspSupportedResult {
  readonly supported: true;
  readonly sessionId: string;
  readonly languageId: string;
}

export const DEFAULT_LSP_RESULT_LIMIT = 100;
export const MAX_LSP_RESULT_LIMIT = 500;

export function boundedLimit(limit: number | undefined): number {
  return Math.min(Math.max(Math.trunc(limit ?? DEFAULT_LSP_RESULT_LIMIT), 1), MAX_LSP_RESULT_LIMIT);
}

export function position(line: number, character: number): LspPosition {
  if (!Number.isInteger(line) || line < 0 || !Number.isInteger(character) || character < 0) {
    throw new Error('LSP positions must use non-negative integer line and character values.');
  }
  return { line, character };
}

export function range(value: unknown): LspRange {
  if (!isRecord(value)) throw new Error('LSP response contained an invalid range.');
  return { start: normalizePosition(value['start']), end: normalizePosition(value['end']) };
}

export function normalizeLocation(value: unknown): LspLocation | undefined {
  if (!isRecord(value)) return undefined;
  const uri = typeof value['uri'] === 'string' ? value['uri'] : undefined;
  const rawRange = value['range'];
  if (!uri || !rawRange) return undefined;
  const normalizedRange = safeRange(rawRange);
  if (!normalizedRange) return undefined;
  return normalizeUriLocation(uri, normalizedRange);
}

export function normalizeLocationLike(value: unknown): LspLocation | undefined {
  const direct = normalizeLocation(value);
  if (direct) return direct;
  if (!isRecord(value) || typeof value['targetUri'] !== 'string') return undefined;
  const targetRange = safeRange(value['targetSelectionRange'] ?? value['targetRange']);
  return targetRange ? normalizeUriLocation(value['targetUri'], targetRange) : undefined;
}

export function normalizeSymbol(value: unknown, defaultUri?: string): LspSymbol | undefined {
  if (!isRecord(value) || typeof value['name'] !== 'string') return undefined;
  const location =
    normalizeLocationLike(value['location']) ??
    (defaultUri && safeRange(value['range'])
      ? normalizeUriLocation(defaultUri, safeRange(value['range'])!)
      : undefined);
  if (!location) return undefined;
  const children = Array.isArray(value['children'])
    ? value['children'].flatMap((child) => {
        const symbol = normalizeSymbol(child, defaultUri);
        return symbol ? [symbol] : [];
      })
    : undefined;
  return {
    name: value['name'],
    kind: typeof value['kind'] === 'number' ? value['kind'] : 0,
    ...(typeof value['detail'] === 'string' ? { detail: value['detail'] } : {}),
    location,
    ...(typeof value['containerName'] === 'string' ? { containerName: value['containerName'] } : {}),
    ...(children && children.length > 0 ? { children } : {}),
  };
}

export function normalizeSymbols(value: unknown, limit: number, defaultUri?: string): LspSymbol[] {
  if (!Array.isArray(value)) return [];
  const symbols: LspSymbol[] = [];
  for (const entry of value) {
    const symbol = normalizeSymbol(entry, defaultUri);
    if (!symbol) continue;
    symbols.push(trimSymbolChildren(symbol, limit));
    if (symbols.length >= limit) break;
  }
  return symbols;
}

function trimSymbolChildren(symbol: LspSymbol, limit: number): LspSymbol {
  if (!symbol.children) return symbol;
  return {
    ...symbol,
    children: symbol.children.slice(0, limit).map((child) => trimSymbolChildren(child, limit)),
  };
}

export function normalizeLocations(value: unknown, limit: number): LspLocation[] {
  if (!Array.isArray(value)) {
    const location = normalizeLocationLike(value);
    return location ? [location] : [];
  }
  const seen = new Set<string>();
  const locations: LspLocation[] = [];
  for (const entry of value) {
    const location = normalizeLocationLike(entry);
    if (!location) continue;
    const key = `${location.uri}:${location.range.start.line}:${location.range.start.character}:${location.range.end.line}:${location.range.end.character}`;
    if (seen.has(key)) continue;
    seen.add(key);
    locations.push(location);
    if (locations.length >= limit) break;
  }
  return locations;
}

export function documentationText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!isRecord(value)) return '';
  if (typeof value['value'] === 'string') return value['value'];
  return '';
}

export function hoverContents(value: unknown): { documentation: string; source: string[] } {
  if (!isRecord(value)) return { documentation: '', source: [] };
  const contents = value['contents'];
  const entries = Array.isArray(contents) ? contents : [contents];
  const documentation: string[] = [];
  const source: string[] = [];
  for (const entry of entries) {
    if (typeof entry === 'string') {
      documentation.push(entry);
      continue;
    }
    if (!isRecord(entry)) continue;
    const text = documentationText(entry);
    const language = typeof entry['language'] === 'string' ? entry['language'] : undefined;
    if (language || text.startsWith('```')) source.push(text);
    else if (text) documentation.push(text);
  }
  return { documentation: documentation.join('\n\n'), source };
}

export function unsupported(
  operation: string,
  sessionId: string,
  languageId: string,
  capability: string,
): LspUnsupportedResult {
  return {
    supported: false,
    operation,
    sessionId,
    languageId,
    reason: `The ${languageId} language server does not advertise ${capability}.`,
  };
}

export function isSupported(capabilities: Readonly<Record<string, unknown>>, name: string): boolean {
  const value = capabilities[name];
  return value === true || (typeof value === 'object' && value !== null);
}

function normalizePosition(value: unknown): LspPosition {
  if (!isRecord(value) || typeof value['line'] !== 'number' || typeof value['character'] !== 'number') {
    throw new Error('LSP response contained an invalid position.');
  }
  return position(value['line'], value['character']);
}

function safeRange(value: unknown): LspRange | undefined {
  try {
    return range(value);
  } catch {
    return undefined;
  }
}

function normalizeUriLocation(uri: string, normalizedRange: LspRange): LspLocation {
  let path: string | null = null;
  let external = true;
  if (uri.startsWith('file:')) {
    try {
      const candidate = fileURLToPath(uri);
      const root = findRepoRoot();
      const relative =
        candidate === root ? '' : candidate.startsWith(`${root}/`) ? candidate.slice(root.length + 1) : null;
      if (relative !== null) {
        path = relative || '.';
        external = false;
      }
    } catch {
      // Keep an external URI opaque rather than exposing an unbounded path.
    }
  }
  return { uri, path, range: normalizedRange, external };
}

export function fileLocation(path: string, value: LspRange): LspLocation {
  return normalizeUriLocation(pathToFileURL(path).href, value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
