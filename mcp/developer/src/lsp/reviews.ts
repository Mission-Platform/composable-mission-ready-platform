import { extname } from 'node:path';

import { readGitChangedFiles, readGitDiff, type GitChangedFile } from '../git/index.ts';

import { inspectLspSymbol, goToLspDefinition, listLspSymbols } from './navigation.ts';
import { getLspDiagnostics } from './registry.ts';
import { findLspCallers } from './relationships.ts';
import { getLspTestsForFile } from './workflows.ts';

const MAX_REVIEW_FILES = 100;
const DEFAULT_REVIEW_FILES = 25;
const REVIEWABLE_EXTENSIONS = new Set([
  '.css',
  '.fws',
  '.html',
  '.js',
  '.json',
  '.jsx',
  '.scss',
  '.ts',
  '.tsx',
  '.vue',
  '.yaml',
  '.yml',
]);

export interface LspReviewRequest {
  readonly filePath: string;
  readonly sessionId?: string;
  readonly languageId?: string;
  readonly limit?: number;
}

export interface LspDebugContextRequest extends LspReviewRequest {
  readonly line: number;
  readonly character: number;
}

export interface ReviewChangesRequest {
  readonly ref?: string;
  readonly path?: string;
  readonly staged?: boolean;
  readonly sessionId?: string;
  readonly languageId?: string;
  readonly maxFiles?: number;
  readonly includeTests?: boolean;
  readonly timeoutMs?: number;
  readonly maxOutputBytes?: number;
}

interface CapturedResult<T> {
  readonly success: boolean;
  readonly result?: T;
  readonly error?: string;
}

function capture<T>(operation: () => Promise<T>): Promise<CapturedResult<T>> {
  return operation()
    .then((result) => ({ success: true, result }))
    .catch((error: unknown) => ({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }));
}

function reviewableFiles(files: readonly GitChangedFile[], maxFiles: number): readonly GitChangedFile[] {
  return files.filter((file) => REVIEWABLE_EXTENSIONS.has(extname(file.path).toLowerCase())).slice(0, maxFiles);
}

export async function getLspDebugContext(request: LspDebugContextRequest) {
  const diagnostics = await getLspDiagnostics(request.filePath, request.sessionId, request.languageId);
  const position = {
    filePath: request.filePath,
    line: request.line,
    character: request.character,
    sessionId: diagnostics.sessionId,
    languageId: request.languageId,
    limit: request.limit,
  };
  const [symbol, definition, callers, tests] = await Promise.all([
    capture(() => inspectLspSymbol(position)),
    capture(() => goToLspDefinition(position)),
    capture(() => findLspCallers({ ...position, direction: 'incoming', limit: request.limit })),
    capture(() =>
      getLspTestsForFile({
        filePath: request.filePath,
        sessionId: diagnostics.sessionId,
        languageId: request.languageId,
        limit: request.limit,
      }),
    ),
  ]);
  return {
    operation: 'lsp_debug_context' as const,
    filePath: diagnostics.filePath,
    sessionId: diagnostics.sessionId,
    languageId: request.languageId,
    diagnostics,
    symbol,
    definition,
    callers,
    tests,
  };
}

export async function reviewLspStructure(request: LspReviewRequest) {
  const diagnostics = await getLspDiagnostics(request.filePath, request.sessionId, request.languageId);
  const options = {
    filePath: request.filePath,
    sessionId: diagnostics.sessionId,
    languageId: request.languageId,
    limit: request.limit,
  };
  const [symbols, tests] = await Promise.all([
    capture(() => listLspSymbols(request.filePath, options)),
    capture(() =>
      getLspTestsForFile({
        filePath: request.filePath,
        sessionId: diagnostics.sessionId,
        languageId: request.languageId,
        limit: request.limit,
      }),
    ),
  ]);
  return {
    operation: 'lsp_review_structure' as const,
    filePath: diagnostics.filePath,
    sessionId: diagnostics.sessionId,
    languageId: request.languageId,
    diagnostics,
    symbols,
    tests,
  };
}

export async function reviewChanges(request: ReviewChangesRequest) {
  const maxFiles = Math.min(Math.max(Math.trunc(request.maxFiles ?? DEFAULT_REVIEW_FILES), 1), MAX_REVIEW_FILES);
  const changed = readGitChangedFiles({
    ref: request.ref,
    path: request.path,
    staged: request.staged,
    timeoutMs: request.timeoutMs,
    maxOutputBytes: request.maxOutputBytes,
  });
  const diff = readGitDiff({
    ref: request.ref,
    path: request.path,
    staged: request.staged,
    stat: true,
    timeoutMs: request.timeoutMs,
    maxOutputBytes: request.maxOutputBytes,
  });
  const files = reviewableFiles(changed.files, maxFiles);
  const diagnostics = request.languageId
    ? await Promise.all(
        files.map(async (file) => ({
          path: file.path,
          diagnostics: await capture(() => getLspDiagnostics(file.path, request.sessionId, request.languageId)),
        })),
      )
    : [];
  const tests =
    request.includeTests && request.languageId
      ? await Promise.all(
          files.map(async (file) => ({
            path: file.path,
            tests: await capture(() =>
              getLspTestsForFile({
                filePath: file.path,
                sessionId: request.sessionId,
                languageId: request.languageId,
                limit: maxFiles,
              }),
            ),
          })),
        )
      : [];
  return {
    operation: 'review_changes' as const,
    changed,
    diff,
    selectedFiles: files.map((file) => file.path),
    truncated: changed.files.length > files.length,
    diagnostics,
    tests,
    message: request.languageId
      ? 'Review includes bounded language-server evidence for reviewable changed files.'
      : 'Git evidence is complete; provide languageId to include language-server diagnostics and test correlation.',
  };
}
