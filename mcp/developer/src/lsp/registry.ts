import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { basename, isAbsolute, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { findRepoRoot, resolveRepoPath } from '@mission-platform/mcp-shared/repo/paths';

import { readLspConfiguration, type LspServerDefinition } from './configuration.ts';
import {
  LspProtocolClient,
  type LspDiagnostic,
  type LspInitializeResult,
  type LspWorkspaceFolder as LspProtocolWorkspaceFolder,
} from './protocol.ts';

const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;
const CONFIG_FILE = 'agent-lsp.json';

export interface DetectedLspServer {
  readonly languageId: string;
  readonly extensions: readonly string[];
  readonly command: readonly string[];
  readonly executable: string;
  readonly executableAvailable: boolean;
  readonly portable: boolean;
  readonly issues: readonly string[];
}

export interface LspDetectionReport {
  readonly contractVersion: 1;
  readonly workspaceRoot: string;
  readonly configPath: string;
  readonly configPresent: boolean;
  readonly servers: readonly DetectedLspServer[];
  readonly warnings: readonly string[];
}

export interface LspStatusReport {
  readonly contractVersion: 1;
  readonly workspaceRoot: string;
  readonly lifecycle: 'discovery-only' | 'starting' | 'running' | 'failed';
  readonly activeSessions: readonly LspSessionSummary[];
  readonly sessionCount: number;
  readonly message: string;
}

export type LspSessionState = 'starting' | 'running' | 'failed';

export interface LspSessionSummary {
  readonly sessionId: string;
  readonly languageId: string;
  readonly state: LspSessionState;
  readonly pid: number | null;
  readonly command: readonly string[];
  readonly startedAt: string;
  readonly error?: string;
}

export interface LspStartReport {
  readonly session: LspSessionSummary;
  readonly message: string;
}

export interface LspShutdownReport {
  readonly stopped: number;
  readonly sessionIds: readonly string[];
  readonly message: string;
}

export interface LspOpenDocumentReport {
  readonly sessionId: string;
  readonly filePath: string;
  readonly uri: string;
  readonly languageId: string;
  readonly version: number;
  readonly message: string;
}

export interface LspDiagnosticsReport {
  readonly sessionId: string;
  readonly filePath: string;
  readonly uri: string;
  readonly diagnostics: readonly LspDiagnostic[];
  readonly message: string;
}

export interface LspWorkspaceFolder {
  readonly path: string;
  readonly uri: string;
  readonly name: string;
}

export interface LspServerCapabilities {
  readonly sessionId: string;
  readonly languageId: string;
  readonly initialized: boolean;
  readonly capabilities: Readonly<Record<string, unknown>>;
  readonly serverInfo?: Readonly<Record<string, unknown>>;
}

export interface LspOpenDocumentSnapshot {
  readonly filePath: string;
  readonly uri: string;
  readonly languageId: string;
  readonly version: number;
  readonly textBytes: number;
}

export interface LspSessionContext {
  readonly sessionId: string;
  readonly languageId: string;
  readonly state: LspSessionState;
  readonly workspaceRoot: string;
  readonly workspaceFolders: readonly LspWorkspaceFolder[];
  readonly serverCapabilities: LspServerCapabilities;
  readonly openDocuments: readonly LspOpenDocumentSnapshot[];
}

export interface LspRequestSession {
  readonly sessionId: string;
  readonly languageId: string;
  readonly workspaceRoot: string;
  readonly protocol: LspProtocolClient;
}

interface OpenDocument {
  readonly languageId: string;
  readonly text: string;
  readonly version: number;
}

interface LspSession {
  readonly sessionId: string;
  readonly languageId: string;
  readonly command: readonly string[];
  readonly startedAt: string;
  readonly child: ChildProcessWithoutNullStreams;
  readonly protocol: LspProtocolClient;
  readonly openDocuments: Map<string, OpenDocument>;
  readonly workspaceFolders: Map<string, LspWorkspaceFolder>;
  initializeResult?: LspInitializeResult;
  state: LspSessionState;
  error?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeWorkspacePath(value: string, workspaceRoot: string): { value: string; portable: boolean } {
  if (!isAbsolute(value)) {
    return { value, portable: true };
  }

  const relativePath = relative(workspaceRoot, value);
  if (relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath))) {
    return { value: relativePath ? `<workspace>/${relativePath}` : '<workspace>', portable: false };
  }

  return { value: '<external-path>', portable: false };
}

function executableAvailable(executable: string, workspaceRoot: string): boolean {
  const lookup = process.platform === 'win32' ? 'where' : 'which';
  const result = spawnSync(lookup, [executable], {
    cwd: workspaceRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 1000,
  });
  return result.status === 0;
}

function expandCommandPlaceholders(command: readonly string[], workspaceRoot: string): string[] {
  return command.map((part) =>
    part.replaceAll('<project_dir>', workspaceRoot).replaceAll('<workspace>', workspaceRoot),
  );
}

function validateCommandPaths(command: readonly string[]): void {
  const workspaceRoot = findRepoRoot();
  for (const part of command) {
    if (!isAbsolute(part)) continue;
    resolveRepoPath(part, 'LSP command path');
    const relativePath = relative(workspaceRoot, part);
    if (relativePath === '..' || relativePath.startsWith(`..${'/'}`) || isAbsolute(relativePath)) {
      throw new Error('LSP commands must not reference paths outside the repository root.');
    }
  }
}

function detectServer(definition: LspServerDefinition, workspaceRoot: string): DetectedLspServer {
  let portable = true;
  const command = definition.command.map((part) => {
    const normalized = normalizeWorkspacePath(part, workspaceRoot);
    portable &&= normalized.portable;
    return normalized.value;
  });
  const executable = command[0];
  const issues: string[] = [];

  if (!portable) {
    issues.push('command contains an absolute path and is not portable');
  }
  if (!executableAvailable(executable, workspaceRoot)) {
    issues.push(`executable "${executable}" is not available on PATH`);
  }

  return {
    languageId: definition.languageId,
    extensions: definition.extensions,
    command,
    executable,
    executableAvailable: issues.every((issue) => !issue.startsWith('executable "')),
    portable,
    issues,
  };
}

export function detectLspServers(): LspDetectionReport {
  const workspaceRoot = findRepoRoot();
  const { configPresent, configPath, servers } = readLspConfiguration();
  const warnings: string[] = [];
  const detectedServers = configPresent ? servers.map((definition) => detectServer(definition, workspaceRoot)) : [];

  if (!configPresent) {
    warnings.push(`No ${CONFIG_FILE} was found; no language servers are configured.`);
  }

  return {
    contractVersion: 1,
    workspaceRoot,
    configPath,
    configPresent,
    servers: detectedServers,
    warnings,
  };
}

function sessionSummary(session: LspSession): LspSessionSummary {
  return {
    sessionId: session.sessionId,
    languageId: session.languageId,
    state: session.state,
    pid: session.child.pid ?? null,
    command: session.command.map((part) => normalizeWorkspacePath(part, findRepoRoot()).value),
    startedAt: session.startedAt,
    ...(session.error ? { error: session.error } : {}),
  };
}

function sessionForRequest(sessionId: string | undefined, languageId: string | undefined): LspSession {
  if (sessionId) {
    const session = sessions.get(sessionId);
    if (!session) throw new Error(`No active LSP session "${sessionId}" exists.`);
    if (languageId && session.languageId !== languageId) {
      throw new Error(`LSP session "${sessionId}" uses language "${session.languageId}", not "${languageId}".`);
    }
    return session;
  }
  const matches = languageId
    ? [...sessions.values()].filter((session) => session.languageId === languageId)
    : [...sessions.values()];
  if (matches.length === 1 && matches[0]) return matches[0];
  if (matches.length === 0) throw new Error('No matching active LSP session exists. Start a session first.');
  throw new Error('sessionId is required when multiple matching LSP sessions are active.');
}

function documentUri(filePath: string): { filePath: string; uri: string } {
  const resolved = resolveRepoPath(filePath, 'LSP document');
  if (statSync(resolved).isDirectory()) throw new Error('LSP document path must refer to a file.');
  return { filePath: resolved, uri: pathToFileURL(resolved).href };
}

export function resolveLspDocument(filePath: string): { filePath: string; uri: string } {
  return documentUri(filePath);
}

function readDocument(filePath: string): string {
  const size = statSync(filePath).size;
  if (size > MAX_DOCUMENT_BYTES) throw new Error(`LSP document exceeds the ${MAX_DOCUMENT_BYTES}-byte limit.`);
  return readFileSync(filePath, 'utf8');
}

function workspaceFolder(filePath: string): LspWorkspaceFolder {
  return {
    path: filePath,
    uri: pathToFileURL(filePath).href,
    name: basename(filePath),
  };
}

function protocolWorkspaceFolder(folder: LspWorkspaceFolder): LspProtocolWorkspaceFolder {
  return { uri: folder.uri, name: folder.name };
}

function configuredServer(languageId: string | undefined): {
  languageId: string;
  command: string[];
} {
  const workspaceRoot = findRepoRoot();
  const { configPresent, servers } = readLspConfiguration();
  if (!configPresent) throw new Error(`No ${CONFIG_FILE} was found; no language servers are configured.`);

  const matching = languageId ? servers.filter((definition) => definition.languageId === languageId) : servers;
  if (matching.length === 0) throw new Error(`No LSP server is configured for language "${languageId ?? ''}".`);
  if (matching.length > 1) {
    throw new Error(
      `languageId is required when multiple LSP servers are configured: ${servers
        .map((definition) => definition.languageId)
        .join(', ')}.`,
    );
  }

  const definition = matching[0];
  if (!definition) throw new Error('LSP configuration did not contain a server definition.');

  const command = expandCommandPlaceholders(definition.command, workspaceRoot);
  validateCommandPaths(command);
  if (!executableAvailable(command[0]!, workspaceRoot)) {
    throw new Error(`LSP executable "${command[0]}" is not available on PATH.`);
  }
  return { languageId: definition.languageId, command };
}

const sessions = new Map<string, LspSession>();
let nextSessionId = 1;

export function startLspSession(languageId?: string): LspStartReport {
  const configured = configuredServer(languageId);
  const sessionId = `lsp-${nextSessionId++}`;
  const startedAt = new Date().toISOString();
  const child = spawn(configured.command[0]!, configured.command.slice(1), {
    cwd: findRepoRoot(),
    shell: false,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const protocol = new LspProtocolClient(child, { workspaceRoot: findRepoRoot() });
  const session: LspSession = {
    sessionId,
    languageId: configured.languageId,
    command: configured.command,
    startedAt,
    child,
    protocol,
    openDocuments: new Map(),
    workspaceFolders: new Map([[pathToFileURL(findRepoRoot()).href, workspaceFolder(findRepoRoot())]]),
    state: 'starting',
  };
  sessions.set(sessionId, session);

  let stderr = '';
  child.stdout.on('data', () => {});
  child.stderr.on('data', (chunk: Buffer | string) => {
    if (stderr.length < 4096) stderr += chunk.toString().slice(0, 4096 - stderr.length);
  });
  child.once('spawn', () => {
    if (session.state === 'starting') session.state = 'running';
  });
  child.once('error', (error) => {
    session.state = 'failed';
    session.error = error.message;
  });
  child.once('close', (code) => {
    if (session.state === 'starting' || session.state === 'running') {
      session.state = 'failed';
      session.error = stderr.trim() || `Language server exited with code ${code ?? 'unknown'}.`;
    }
  });

  void protocol
    .initialize()
    .then((result) => {
      session.initializeResult = result;
      if (session.state === 'starting') session.state = 'running';
    })
    .catch((error: unknown) => {
      session.state = 'failed';
      session.error = error instanceof Error ? error.message : String(error);
    });

  return {
    session: sessionSummary(session),
    message: `Started LSP server for ${configured.languageId}.`,
  };
}

async function initializeSession(session: LspSession): Promise<LspInitializeResult> {
  const result = await session.protocol.initialize();
  session.initializeResult = result;
  if (session.state === 'starting') session.state = 'running';
  return result;
}

export async function getLspRequestSession(sessionId?: string, languageId?: string): Promise<LspRequestSession> {
  const session = sessionForRequest(sessionId, languageId);
  await initializeSession(session);
  return {
    sessionId: session.sessionId,
    languageId: session.languageId,
    workspaceRoot: findRepoRoot(),
    protocol: session.protocol,
  };
}

export async function getLspOpenDocumentSnapshot(
  filePath: string,
  sessionId?: string,
  languageId?: string,
): Promise<LspOpenDocumentSnapshot | undefined> {
  const session = sessionForRequest(sessionId, languageId);
  await initializeSession(session);
  const document = documentUri(filePath);
  const open = session.openDocuments.get(document.uri);
  if (!open) return undefined;
  return {
    filePath: document.filePath,
    uri: document.uri,
    languageId: open.languageId,
    version: open.version,
    textBytes: Buffer.byteLength(open.text, 'utf8'),
  };
}

function workspaceFoldersSupported(session: LspSession): boolean {
  const workspace = session.initializeResult?.capabilities?.['workspace'];
  if (!isRecord(workspace)) return false;
  const folders = workspace['workspaceFolders'];
  return folders === true || isRecord(folders);
}

function serverCapabilities(session: LspSession): LspServerCapabilities {
  return {
    sessionId: session.sessionId,
    languageId: session.languageId,
    initialized: session.initializeResult !== undefined,
    capabilities: session.initializeResult?.capabilities ?? {},
    ...(session.initializeResult?.serverInfo ? { serverInfo: session.initializeResult.serverInfo } : {}),
  };
}

export async function listLspWorkspaceFolders(
  sessionId?: string,
  languageId?: string,
): Promise<{ sessionId: string; languageId: string; workspaceFolders: readonly LspWorkspaceFolder[] }> {
  const session = sessionForRequest(sessionId, languageId);
  await initializeSession(session);
  return {
    sessionId: session.sessionId,
    languageId: session.languageId,
    workspaceFolders: [...session.workspaceFolders.values()],
  };
}

export async function addLspWorkspaceFolder(
  folderPath: string,
  sessionId?: string,
  languageId?: string,
): Promise<{
  sessionId: string;
  languageId: string;
  folder: LspWorkspaceFolder;
  workspaceFolders: readonly LspWorkspaceFolder[];
}> {
  const session = sessionForRequest(sessionId, languageId);
  const resolvedPath = resolveRepoPath(folderPath, 'LSP workspace folder');
  if (!statSync(resolvedPath).isDirectory()) throw new Error('LSP workspace folder path must refer to a directory.');
  await initializeSession(session);
  if (!workspaceFoldersSupported(session)) {
    throw new Error(`LSP server for ${session.languageId} does not support workspace folder changes.`);
  }

  const folder = workspaceFolder(resolvedPath);
  if (!session.workspaceFolders.has(folder.uri)) {
    session.protocol.addWorkspaceFolder(protocolWorkspaceFolder(folder));
    session.workspaceFolders.set(folder.uri, folder);
  }
  return {
    sessionId: session.sessionId,
    languageId: session.languageId,
    folder,
    workspaceFolders: [...session.workspaceFolders.values()],
  };
}

export async function getLspServerCapabilities(
  sessionId?: string,
  languageId?: string,
): Promise<LspServerCapabilities> {
  const session = sessionForRequest(sessionId, languageId);
  await initializeSession(session);
  return serverCapabilities(session);
}

export async function getLspEditingContext(sessionId?: string, languageId?: string): Promise<LspSessionContext> {
  const session = sessionForRequest(sessionId, languageId);
  await initializeSession(session);
  return {
    sessionId: session.sessionId,
    languageId: session.languageId,
    state: session.state,
    workspaceRoot: findRepoRoot(),
    workspaceFolders: [...session.workspaceFolders.values()],
    serverCapabilities: serverCapabilities(session),
    openDocuments: [...session.openDocuments.entries()].map(([uri, document]) => ({
      filePath: fileURLToPath(uri),
      uri,
      languageId: document.languageId,
      version: document.version,
      textBytes: Buffer.byteLength(document.text, 'utf8'),
    })),
  };
}

export async function openLspDocument(
  filePath: string,
  sessionId?: string,
  languageId?: string,
  documentLanguageId?: string,
): Promise<LspOpenDocumentReport> {
  const session = sessionForRequest(sessionId, languageId);
  await initializeSession(session);
  const document = documentUri(filePath);
  const text = readDocument(document.filePath);
  const previous = session.openDocuments.get(document.uri);
  const version = (previous?.version ?? 0) + 1;
  const resolvedLanguageId = documentLanguageId ?? previous?.languageId ?? session.languageId;
  session.protocol.clearDiagnostics(document.uri);

  if (previous) {
    session.protocol.notify('textDocument/didChange', {
      textDocument: { uri: document.uri, version },
      contentChanges: [{ text }],
    });
  } else {
    session.protocol.notify('textDocument/didOpen', {
      textDocument: { uri: document.uri, languageId: resolvedLanguageId, version, text },
    });
  }
  session.openDocuments.set(document.uri, { languageId: resolvedLanguageId, text, version });

  return {
    sessionId: session.sessionId,
    filePath: document.filePath,
    uri: document.uri,
    languageId: resolvedLanguageId,
    version,
    message: previous ? 'Updated the open LSP document.' : 'Opened the LSP document.',
  };
}

export async function getLspDiagnostics(
  filePath: string,
  sessionId?: string,
  languageId?: string,
  documentLanguageId?: string,
): Promise<LspDiagnosticsReport> {
  const opened = await openLspDocument(filePath, sessionId, languageId, documentLanguageId);
  const session = sessions.get(opened.sessionId);
  if (!session) throw new Error(`LSP session "${opened.sessionId}" ended while reading diagnostics.`);
  const diagnostics = await session.protocol.waitForDiagnostics(opened.uri);
  return {
    sessionId: opened.sessionId,
    filePath: opened.filePath,
    uri: opened.uri,
    diagnostics,
    message: `Received ${diagnostics.length} diagnostic(s).`,
  };
}

function targetSessions(sessionId: string | undefined, languageId: string | undefined, all: boolean): LspSession[] {
  if (all) return [...sessions.values()];
  if (sessionId) {
    const session = sessions.get(sessionId);
    if (!session) throw new Error(`No active LSP session "${sessionId}" exists.`);
    return [session];
  }
  if (languageId) return [...sessions.values()].filter((session) => session.languageId === languageId);
  throw new Error('Provide sessionId, languageId, or all=true.');
}

export function shutdownLspSessions(sessionId?: string, languageId?: string, all = false): LspShutdownReport {
  const targets = targetSessions(sessionId, languageId, all);
  for (const session of targets) {
    sessions.delete(session.sessionId);
    session.protocol.dispose();
    session.child.stdin.end();
    session.child.kill('SIGTERM');
  }
  return {
    stopped: targets.length,
    sessionIds: targets.map((session) => session.sessionId),
    message:
      targets.length > 0 ? `Stopped ${targets.length} LSP session(s).` : 'No matching LSP sessions were running.',
  };
}

export function restartLspSession(sessionId?: string, languageId?: string): LspStartReport {
  const target = targetSessions(sessionId, languageId, false)[0];
  const selectedLanguageId = target?.languageId ?? languageId;
  if (target) shutdownLspSessions(target.sessionId);
  return startLspSession(selectedLanguageId);
}

export function getLspStatus(): LspStatusReport {
  const activeSessions = [...sessions.values()].map((session) => sessionSummary(session));
  const lifecycle =
    activeSessions.length === 0
      ? 'discovery-only'
      : activeSessions.some((session) => session.state === 'failed')
        ? 'failed'
        : activeSessions.some((session) => session.state === 'starting')
          ? 'starting'
          : 'running';
  return {
    contractVersion: 1,
    workspaceRoot: findRepoRoot(),
    lifecycle,
    activeSessions,
    sessionCount: activeSessions.length,
    message:
      activeSessions.length > 0
        ? `${activeSessions.length} LSP session(s) are active.`
        : 'No LSP sessions are running; language-server startup is available for configured servers.',
  };
}
