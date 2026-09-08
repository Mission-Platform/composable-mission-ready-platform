import { existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { resolveRepoPath } from '@mission-platform/mcp-shared/repo/paths';

import {
  boundedLimit,
  isSupported,
  position,
  range,
  type LspCommandResult,
  type LspDiagnosticDelta,
  type LspPosition,
  type LspRange,
  type LspTextEdit,
  type LspUnsupportedResult,
  type LspWorkspaceEdit,
} from './contracts.ts';
import { getLspOpenDocumentSnapshot, getLspRequestSession, openLspDocument } from './registry.ts';

import type { LspDiagnostic } from './protocol.ts';

const DIAGNOSTIC_WAIT_MS = 1000;

export interface LspEditFileResult {
  readonly filePath: string;
  readonly uri: string;
  readonly edits: readonly LspTextEdit[];
  readonly versionBefore?: number;
  readonly versionAfter?: number;
}

export interface LspEditResult {
  readonly supported: true;
  readonly sessionId: string;
  readonly languageId: string;
  readonly dryRun: boolean;
  readonly applied: boolean;
  readonly files: readonly LspEditFileResult[];
  readonly diagnosticDelta: Readonly<Record<string, LspDiagnosticDelta>>;
  readonly message: string;
}

export interface LspEditRequest {
  readonly sessionId?: string;
  readonly languageId?: string;
  readonly filePath?: string;
  readonly edits?: unknown;
  readonly workspaceEdit?: unknown;
  readonly apply?: boolean;
  readonly expectedVersions?: Readonly<Record<string, number>>;
}

export interface LspPositionEditRequest extends LspEditRequest {
  readonly filePath: string;
  readonly line: number;
  readonly character: number;
}

export interface LspRenameRequest extends LspPositionEditRequest {
  readonly newName: string;
}

export interface LspFormatRequest extends LspEditRequest {
  readonly filePath: string;
  readonly start?: LspPosition;
  readonly end?: LspPosition;
}

export interface LspFixRequest extends LspEditRequest {
  readonly filePath: string;
  readonly start: LspPosition;
  readonly end: LspPosition;
  readonly diagnostics?: readonly LspDiagnostic[];
  readonly actionIndex?: number;
}

export interface LspPreparedFile {
  readonly filePath: string;
  readonly uri: string;
  readonly edits: readonly LspTextEdit[];
  readonly originalText: string;
  readonly updatedText: string;
  readonly version?: number;
}

export interface LspPreparedWorkspaceEdit {
  readonly files: readonly LspPreparedFile[];
}

interface NormalizeOptions {
  readonly workspaceRoot?: string;
  readonly contents?: ReadonlyMap<string, string>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toTextEdit(value: unknown): LspTextEdit {
  if (!isRecord(value) || typeof value['newText'] !== 'string')
    throw new Error('Workspace edit contains an invalid text edit.');
  return { range: range(value['range']), newText: value['newText'] };
}

function uriToPath(uri: string, workspaceRoot: string): { filePath: string; uri: string } {
  if (!uri.startsWith('file:')) throw new Error('Workspace edits may only target file:// URIs.');
  let filePath: string;
  try {
    filePath = fileURLToPath(uri);
  } catch {
    throw new Error('Workspace edit contains an invalid file URI.');
  }
  const resolved = resolveRepoPath(filePath, 'workspace edit', { allowMissing: true });
  const root = resolveRepoPath(workspaceRoot, 'workspace root');
  if (resolved !== root && !resolved.startsWith(`${root}/`)) {
    throw new Error('Workspace edit paths must remain within the repository root.');
  }
  if (!existsSync(resolved)) throw new Error(`Workspace edit target does not exist: ${resolved}`);
  return { filePath: resolved, uri: pathToFileURL(resolved).href };
}

function pathToTarget(filePath: string, _workspaceRoot: string): { filePath: string; uri: string } {
  const resolved = resolveRepoPath(filePath, 'workspace edit', { allowMissing: true });
  if (!existsSync(resolved)) throw new Error(`Workspace edit target does not exist: ${resolved}`);
  return { filePath: resolved, uri: pathToFileURL(resolved).href };
}

function lineStarts(text: string): number[] {
  const starts = [0];
  for (let index = text.indexOf('\n'); index !== -1; index = text.indexOf('\n', index + 1)) starts.push(index + 1);
  return starts;
}

function offset(text: string, value: LspPosition, starts: readonly number[]): number {
  if (value.line < 0 || value.line >= starts.length || !Number.isInteger(value.character) || value.character < 0) {
    throw new Error('Workspace edit range contains an invalid position.');
  }
  const start = starts[value.line]!;
  const newline = text.indexOf('\n', start);
  const end = newline === -1 ? text.length : newline - (text[newline - 1] === '\r' ? 1 : 0);
  if (start + value.character > end) throw new Error('Workspace edit range exceeds the target line.');
  return start + value.character;
}

function validateEdits(text: string, edits: readonly LspTextEdit[]): LspTextEdit[] {
  const starts = lineStarts(text);
  const located = edits.map((edit) => ({
    edit,
    start: offset(text, edit.range.start, starts),
    end: offset(text, edit.range.end, starts),
  }));
  located.sort((left, right) => left.start - right.start || left.end - right.end);
  for (const [index, edit] of located.entries()) {
    if (edit.start > edit.end) throw new Error('Workspace edit ranges must have start before end.');
    const previous = located[index - 1];
    if (previous && previous.end > edit.start) throw new Error('Workspace edit ranges overlap.');
  }
  return located.map((entry) => entry.edit);
}

function applyTextEdits(text: string, edits: readonly LspTextEdit[]): string {
  const starts = lineStarts(text);
  const located = edits
    .map((edit) => ({ edit, start: offset(text, edit.range.start, starts), end: offset(text, edit.range.end, starts) }))
    .sort((left, right) => right.start - left.start);
  let result = text;
  for (const edit of located) result = `${result.slice(0, edit.start)}${edit.edit.newText}${result.slice(edit.end)}`;
  return result;
}

function collectRawEdits(
  workspaceEdit: unknown,
  workspaceRoot: string,
): Map<string, { uri: string; edits: LspTextEdit[]; version?: number }> {
  if (!isRecord(workspaceEdit)) throw new Error('Provide a valid WorkspaceEdit object.');
  const collected = new Map<string, { uri: string; edits: LspTextEdit[]; version?: number }>();
  const add = (uri: string, edits: unknown, version?: number) => {
    const target = uriToPath(uri, workspaceRoot);
    if (!Array.isArray(edits)) throw new Error('Workspace edit entries must contain an edits array.');
    const existing = collected.get(target.filePath);
    const normalized = edits.map((edit) => toTextEdit(edit));
    if (existing) {
      if (existing.version !== undefined && version !== undefined && existing.version !== version) {
        throw new Error(`Workspace edit contains conflicting versions for ${target.filePath}.`);
      }
      existing.edits.push(...normalized);
      if (existing.version === undefined) existing.version = version;
    } else collected.set(target.filePath, { uri: target.uri, edits: normalized, version });
  };

  const changes = workspaceEdit['changes'];
  if (isRecord(changes)) {
    for (const [uri, edits] of Object.entries(changes)) add(uri, edits);
  }
  const documentChanges = workspaceEdit['documentChanges'];
  if (Array.isArray(documentChanges)) {
    for (const change of documentChanges) {
      if (!isRecord(change)) throw new Error('Workspace edit contains an invalid document change.');
      if (isRecord(change['textDocument']) && typeof change['textDocument']['uri'] === 'string') {
        add(
          change['textDocument']['uri'],
          change['edits'],
          typeof change['textDocument']['version'] === 'number' ? change['textDocument']['version'] : undefined,
        );
      } else {
        throw new Error('Create, delete, and rename resource operations are not supported by the safe edit path.');
      }
    }
  }
  if (collected.size === 0) throw new Error('Workspace edit does not contain any text edits.');
  return collected;
}

export function normalizeWorkspaceEdit(
  workspaceEdit: unknown,
  options: NormalizeOptions = {},
): LspPreparedWorkspaceEdit {
  const workspaceRoot = options.workspaceRoot ?? resolveRepoPath('.', 'workspace root');
  const collected = collectRawEdits(workspaceEdit, workspaceRoot);
  const files: LspPreparedFile[] = [];
  for (const [filePath, entry] of collected) {
    const text = options.contents?.get(entry.uri) ?? readFileSync(filePath, 'utf8');
    const edits = validateEdits(text, entry.edits);
    files.push({
      filePath,
      uri: entry.uri,
      edits,
      originalText: text,
      updatedText: applyTextEdits(text, edits),
      ...(entry.version === undefined ? {} : { version: entry.version }),
    });
  }
  return { files };
}

function directWorkspaceEdit(filePath: string, edits: unknown, workspaceRoot: string): LspWorkspaceEdit {
  const target = pathToTarget(filePath, workspaceRoot);
  if (!Array.isArray(edits)) throw new Error('The edits field must be an array.');
  return { changes: { [target.uri]: edits.map((edit) => toTextEdit(edit)) } };
}

function editInput(request: LspEditRequest, workspaceRoot: string): unknown {
  if (request.workspaceEdit !== undefined && request.edits !== undefined) {
    throw new Error('Provide only one of workspaceEdit and edits.');
  }
  if (request.workspaceEdit !== undefined) return request.workspaceEdit;
  if (request.filePath === undefined || request.edits === undefined) {
    throw new Error('Provide a filePath with edits or a WorkspaceEdit.');
  }
  return directWorkspaceEdit(request.filePath, request.edits, workspaceRoot);
}

async function prepare(request: LspEditRequest, sessionId: string, languageId: string, workspaceRoot: string) {
  const prepared = normalizeWorkspaceEdit(editInput(request, workspaceRoot), { workspaceRoot });
  for (const file of prepared.files) {
    const expected = file.version ?? request.expectedVersions?.[file.filePath] ?? request.expectedVersions?.[file.uri];
    if (expected === undefined) continue;
    const snapshot = await getLspOpenDocumentSnapshot(file.filePath, sessionId, languageId);
    if (snapshot && snapshot.version !== expected) {
      throw new Error(
        `Stale open-document version for ${file.filePath}: expected ${expected}, current ${snapshot.version}.`,
      );
    }
  }
  return prepared;
}

function emptyDelta(): Readonly<Record<string, LspDiagnosticDelta>> {
  return {};
}

function diagnosticKey(diagnostic: LspDiagnostic): string {
  return JSON.stringify([diagnostic.range, diagnostic.message, diagnostic.code, diagnostic.source]);
}

function diagnosticDelta(before: readonly LspDiagnostic[], after: readonly LspDiagnostic[]): LspDiagnosticDelta {
  const afterKeys = new Set(after.map((diagnostic) => diagnosticKey(diagnostic)));
  const beforeKeys = new Set(before.map((diagnostic) => diagnosticKey(diagnostic)));
  return {
    before,
    after,
    introduced: after.filter((diagnostic) => !beforeKeys.has(diagnosticKey(diagnostic))),
    resolved: before.filter((diagnostic) => !afterKeys.has(diagnosticKey(diagnostic))),
  };
}

function previewResult(sessionId: string, languageId: string, prepared: LspPreparedWorkspaceEdit): LspEditResult {
  return {
    supported: true,
    sessionId,
    languageId,
    dryRun: true,
    applied: false,
    files: prepared.files.map((file) => ({
      filePath: file.filePath,
      uri: file.uri,
      edits: file.edits,
      ...(file.version === undefined ? {} : { versionBefore: file.version }),
    })),
    diagnosticDelta: emptyDelta(),
    message: 'Validated edit preview; no files were written.',
  };
}

function atomicWrite(files: readonly LspPreparedFile[]): void {
  const token = `${process.pid}-${Date.now()}`;
  const temporary = files.map((file, index) => ({
    file,
    temp: `${file.filePath}.mcp-edit-${token}-${index}.tmp`,
    backup: `${file.filePath}.mcp-edit-${token}-${index}.bak`,
  }));
  try {
    for (const entry of temporary) writeFileSync(entry.temp, entry.file.updatedText, 'utf8');
    for (const entry of temporary) {
      renameSync(entry.file.filePath, entry.backup);
      renameSync(entry.temp, entry.file.filePath);
    }
  } catch (error) {
    for (const entry of temporary.toReversed()) {
      try {
        if (existsSync(entry.backup)) {
          if (existsSync(entry.file.filePath)) unlinkSync(entry.file.filePath);
          renameSync(entry.backup, entry.file.filePath);
        }
      } catch {
        // Best effort rollback; the original error remains actionable.
      }
    }
    throw error;
  } finally {
    for (const entry of temporary) {
      if (existsSync(entry.temp)) unlinkSync(entry.temp);
      if (existsSync(entry.backup)) unlinkSync(entry.backup);
    }
  }
}

async function applyPrepared(
  sessionId: string,
  languageId: string,
  prepared: LspPreparedWorkspaceEdit,
  protocol: Awaited<ReturnType<typeof getLspRequestSession>>['protocol'],
): Promise<LspEditResult> {
  const before = new Map(prepared.files.map((file) => [file.uri, protocol.diagnosticsFor(file.uri) ?? []]));
  const snapshots = new Map<string, number | undefined>();
  for (const file of prepared.files)
    snapshots.set(file.uri, (await getLspOpenDocumentSnapshot(file.filePath, sessionId, languageId))?.version);
  atomicWrite(prepared.files);
  const diagnosticDeltaByFile: Record<string, LspDiagnosticDelta> = {};
  const files: LspEditFileResult[] = [];
  for (const file of prepared.files) {
    const opened = await openLspDocument(file.filePath, sessionId, languageId);
    const after = await protocol.waitForDiagnostics(file.uri, DIAGNOSTIC_WAIT_MS);
    diagnosticDeltaByFile[file.filePath] = diagnosticDelta(before.get(file.uri) ?? [], after);
    files.push({
      filePath: file.filePath,
      uri: file.uri,
      edits: file.edits,
      ...(snapshots.get(file.uri) === undefined ? {} : { versionBefore: snapshots.get(file.uri) }),
      versionAfter: opened.version,
    });
  }
  return {
    supported: true,
    sessionId,
    languageId,
    dryRun: false,
    applied: true,
    files,
    diagnosticDelta: diagnosticDeltaByFile,
    message: 'Validated edit applied atomically and open documents were resynchronized.',
  };
}

export async function previewLspEdit(request: LspEditRequest): Promise<LspEditResult> {
  const session = await getLspRequestSession(request.sessionId, request.languageId);
  const prepared = await prepare(request, session.sessionId, session.languageId, session.workspaceRoot);
  return previewResult(session.sessionId, session.languageId, prepared);
}

export async function applyLspEdit(request: LspEditRequest): Promise<LspEditResult> {
  const session = await getLspRequestSession(request.sessionId, request.languageId);
  const prepared = await prepare(request, session.sessionId, session.languageId, session.workspaceRoot);
  if (request.apply !== true) return previewResult(session.sessionId, session.languageId, prepared);
  return applyPrepared(session.sessionId, session.languageId, prepared, session.protocol);
}

export async function simulateLspChain(
  request: LspEditRequest & { readonly steps: readonly LspEditRequest[] },
): Promise<{
  supported: true;
  sessionId: string;
  languageId: string;
  dryRun: true;
  steps: readonly LspEditResult[];
  safeToApplyThroughStep: number;
  message: string;
}> {
  const session = await getLspRequestSession(request.sessionId, request.languageId);
  const contents = new Map<string, string>();
  const results: LspEditResult[] = [];
  for (const [index, step] of request.steps.entries()) {
    const input = editInput(step, session.workspaceRoot);
    const prepared = normalizeWorkspaceEdit(input, { workspaceRoot: session.workspaceRoot, contents });
    for (const file of prepared.files) contents.set(file.uri, file.updatedText);
    results.push(previewResult(session.sessionId, session.languageId, prepared));
    if (index + 1 >= boundedLimit(request.steps.length)) break;
  }
  return {
    supported: true,
    sessionId: session.sessionId,
    languageId: session.languageId,
    dryRun: true,
    steps: results,
    safeToApplyThroughStep: results.length,
    message: 'Validated edit chain in memory; no files were written.',
  };
}

export async function replaceLspSymbolBody(
  request: LspEditRequest & { readonly filePath: string; readonly symbolRange: LspRange; readonly newText: string },
): Promise<LspEditResult> {
  return applyLspEdit({
    ...request,
    filePath: request.filePath,
    edits: [{ range: request.symbolRange, newText: request.newText }],
  });
}

export async function safeDeleteLspSymbol(
  request: LspEditRequest & { readonly filePath: string; readonly symbolRange: LspRange },
): Promise<LspEditResult> {
  return replaceLspSymbolBody({ ...request, newText: '' });
}

function unsupportedEdit(
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

export async function renameLspSymbol(request: LspRenameRequest): Promise<LspEditResult | LspUnsupportedResult> {
  const session = await getLspRequestSession(request.sessionId, request.languageId);
  if (!isSupported(session.protocol.getCapabilities(), 'renameProvider'))
    return unsupportedEdit('lsp_rename', session.sessionId, session.languageId, 'renameProvider');
  const opened = await openLspDocument(request.filePath, session.sessionId, session.languageId);
  const value = await session.protocol.request<unknown>('textDocument/rename', {
    textDocument: { uri: opened.uri },
    position: position(request.line, request.character),
    newName: request.newName,
  });
  const prepared = await prepare(
    { ...request, workspaceEdit: value },
    session.sessionId,
    session.languageId,
    session.workspaceRoot,
  );
  if (request.apply !== true) return previewResult(session.sessionId, session.languageId, prepared);
  return applyPrepared(session.sessionId, session.languageId, prepared, session.protocol);
}

export interface LspFixAction {
  readonly title: string;
  readonly kind?: string;
  readonly edit?: LspPreparedWorkspaceEdit;
  readonly command?: string;
  readonly commandArguments?: readonly unknown[];
}

export async function suggestLspFixes(request: LspFixRequest): Promise<
  | {
      supported: true;
      sessionId: string;
      languageId: string;
      actions: readonly LspFixAction[];
      applied?: LspEditResult | LspCommandResult;
    }
  | LspUnsupportedResult
> {
  const session = await getLspRequestSession(request.sessionId, request.languageId);
  if (!isSupported(session.protocol.getCapabilities(), 'codeActionProvider'))
    return unsupportedEdit('lsp_suggest_fixes', session.sessionId, session.languageId, 'codeActionProvider');
  const opened = await openLspDocument(request.filePath, session.sessionId, session.languageId);
  const value = await session.protocol.request<unknown>('textDocument/codeAction', {
    textDocument: { uri: opened.uri },
    range: { start: request.start, end: request.end },
    context: { diagnostics: request.diagnostics ?? [] },
  });
  const raw = Array.isArray(value) ? value : [];
  const actions: LspFixAction[] = [];
  for (const entry of raw.slice(0, boundedLimit(raw.length))) {
    if (!isRecord(entry) || typeof entry['title'] !== 'string') continue;
    const edit =
      entry['edit'] === undefined
        ? undefined
        : normalizeWorkspaceEdit(entry['edit'], { workspaceRoot: session.workspaceRoot });
    const commandObject = isRecord(entry['command']) ? entry['command'] : undefined;
    const command =
      commandObject && typeof commandObject['command'] === 'string' ? commandObject['command'] : undefined;
    const commandArguments =
      commandObject && Array.isArray(commandObject['arguments']) ? commandObject['arguments'] : undefined;
    actions.push({
      title: entry['title'],
      ...(typeof entry['kind'] === 'string' ? { kind: entry['kind'] } : {}),
      ...(edit ? { edit } : {}),
      ...(command ? { command } : {}),
      ...(commandArguments ? { commandArguments } : {}),
    });
  }
  const selected = request.actionIndex === undefined ? undefined : actions[request.actionIndex];
  if (request.apply === true && !selected)
    throw new Error('Set actionIndex to the code action that should be applied.');
  let applied: LspEditResult | LspCommandResult | undefined;
  if (request.apply === true && selected?.edit) {
    applied = await applyPrepared(session.sessionId, session.languageId, selected.edit, session.protocol);
  } else if (request.apply === true && selected?.command) {
    const commandResult = await executeLspCommand({
      sessionId: session.sessionId,
      languageId: session.languageId,
      command: selected.command,
      arguments: selected.commandArguments,
      apply: true,
    });
    if (!('applied' in commandResult)) throw new Error(commandResult.reason);
    applied = commandResult;
  }
  return {
    supported: true,
    sessionId: session.sessionId,
    languageId: session.languageId,
    actions,
    ...(applied ? { applied } : {}),
  };
}

async function formatLsp(
  request: LspFormatRequest,
  method: 'textDocument/formatting' | 'textDocument/rangeFormatting',
  capability: string,
): Promise<LspEditResult | LspUnsupportedResult> {
  const session = await getLspRequestSession(request.sessionId, request.languageId);
  if (!isSupported(session.protocol.getCapabilities(), capability))
    return unsupportedEdit(
      method.endsWith('rangeFormatting') ? 'lsp_format_range' : 'lsp_format_document',
      session.sessionId,
      session.languageId,
      capability,
    );
  const opened = await openLspDocument(request.filePath, session.sessionId, session.languageId);
  const params: Record<string, unknown> = { textDocument: { uri: opened.uri } };
  if (method.endsWith('rangeFormatting')) params['range'] = range({ start: request.start, end: request.end });
  const value = await session.protocol.request<unknown>(method, params);
  const prepared = await prepare(
    { ...request, workspaceEdit: { changes: { [opened.uri]: Array.isArray(value) ? value : [] } } },
    session.sessionId,
    session.languageId,
    session.workspaceRoot,
  );
  if (request.apply !== true) return previewResult(session.sessionId, session.languageId, prepared);
  return applyPrepared(session.sessionId, session.languageId, prepared, session.protocol);
}

export function formatLspDocument(request: LspFormatRequest): Promise<LspEditResult | LspUnsupportedResult> {
  return formatLsp(request, 'textDocument/formatting', 'documentFormattingProvider');
}

export function formatLspRange(
  request: LspFormatRequest & { readonly start: LspPosition; readonly end: LspPosition },
): Promise<LspEditResult | LspUnsupportedResult> {
  return formatLsp(request, 'textDocument/rangeFormatting', 'documentRangeFormattingProvider');
}

export async function executeLspCommand(request: {
  readonly command: string;
  readonly arguments?: readonly unknown[];
  readonly sessionId?: string;
  readonly languageId?: string;
  readonly apply?: boolean;
}): Promise<LspCommandResult | LspUnsupportedResult> {
  const session = await getLspRequestSession(request.sessionId, request.languageId);
  const capabilities = session.protocol.getCapabilities();
  if (!isSupported(capabilities, 'executeCommandProvider'))
    return unsupportedEdit('lsp_execute_command', session.sessionId, session.languageId, 'executeCommandProvider');
  const provider = capabilities['executeCommandProvider'];
  if (isRecord(provider) && Array.isArray(provider['commands']) && !provider['commands'].includes(request.command)) {
    return {
      supported: false,
      operation: 'lsp_execute_command',
      sessionId: session.sessionId,
      languageId: session.languageId,
      reason: `The language server did not advertise the command "${request.command}".`,
    };
  }
  if (request.apply !== true)
    return {
      command: request.command,
      sessionId: session.sessionId,
      languageId: session.languageId,
      applied: false,
      message: 'Command preview only; set apply=true to execute the server command.',
    };
  const result = await session.protocol.request<unknown>('workspace/executeCommand', {
    command: request.command,
    arguments: request.arguments ?? [],
  });
  return {
    command: request.command,
    sessionId: session.sessionId,
    languageId: session.languageId,
    applied: true,
    ...(result === undefined ? {} : { result }),
    message: 'Server command executed explicitly.',
  };
}
