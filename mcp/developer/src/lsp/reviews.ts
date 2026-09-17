import { extname } from 'node:path';

import { analyzeCode, scanSecrets, type SecurityFinding } from '@mission-platform/mcp-shared/security';

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

/**
 * Collect bounded LSP diagnostics for reviewable files when languageId is provided.
 */
async function collectReviewDiagnostics(
  files: readonly { readonly path: string }[],
  sessionId?: string,
  languageId?: string,
) {
  if (!languageId) return [];
  return await Promise.all(
    files.map(async (file) => ({
      path: file.path,
      diagnostics: await capture(() => getLspDiagnostics(file.path, sessionId, languageId)),
    })),
  );
}

/**
 * Collect correlated test files for reviewable files when requested.
 */
async function collectReviewTests(
  files: readonly { readonly path: string }[],
  maxFiles: number,
  sessionId?: string,
  languageId?: string,
  includeTests?: boolean,
) {
  if (!includeTests || !languageId) return [];
  return await Promise.all(
    files.map(async (file) => ({
      path: file.path,
      tests: await capture(() =>
        getLspTestsForFile({
          filePath: file.path,
          sessionId,
          languageId,
          limit: maxFiles,
        }),
      ),
    })),
  );
}

/**
 * Run secret and code vulnerability scanning across reviewable changed files.
 */
function scanReviewSecurityFindings(files: readonly { readonly path: string }[]): SecurityFinding[] {
  const securityFindings: SecurityFinding[] = [];
  for (const file of files) {
    try {
      const secretResult = scanSecrets({ path: file.path });
      const codeResult = analyzeCode({ path: file.path });
      securityFindings.push(...secretResult.findings, ...codeResult.findings);
    } catch {
      // Ignored if file unreadable or deleted
    }
  }
  return securityFindings;
}

/**
 * Build a structured security scorecard summary for change review evidence.
 */
function buildSecurityReviewSummary(securityFindings: readonly SecurityFinding[]) {
  return {
    clean: securityFindings.length === 0,
    findingsCount: securityFindings.length,
    criticalCount: securityFindings.filter((f) => f.severity === 'critical').length,
    highCount: securityFindings.filter((f) => f.severity === 'high').length,
    owaspCategories: [...new Set(securityFindings.map((f) => f.owasp).filter(Boolean))],
    cweWeaknesses: [...new Set(securityFindings.map((f) => f.cwe).filter(Boolean))],
    isoControls: [...new Set(securityFindings.map((f) => f.isoControl).filter(Boolean))],
    findings: securityFindings,
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

  const [diagnostics, tests] = await Promise.all([
    collectReviewDiagnostics(files, request.sessionId, request.languageId),
    collectReviewTests(files, maxFiles, request.sessionId, request.languageId, request.includeTests),
  ]);

  const securityFindings = scanReviewSecurityFindings(files);
  const securitySummary = buildSecurityReviewSummary(securityFindings);

  const message = request.languageId
    ? 'Review includes bounded language-server evidence and security checks for reviewable changed files.'
    : 'Git evidence and security scan are complete; provide languageId to include language-server diagnostics and test correlation.';

  return {
    operation: 'review_changes' as const,
    changed,
    diff,
    selectedFiles: files.map((file) => file.path),
    truncated: changed.files.length > files.length,
    diagnostics,
    tests,
    security: securitySummary,
    message,
  };
}
