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
  '.flint',
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

interface SecurityScanExecutionResult {
  readonly findings: readonly SecurityFinding[];
  readonly errors?: readonly string[];
  readonly incomplete?: boolean;
}

/**
 * Scan a single file using the provided scanner function and capture errors.
 */
function scanFileSecurity(
  filePath: string,
  scanFn: (options: { path: string }) => SecurityScanExecutionResult,
  failureLabel: string,
): { findings: readonly SecurityFinding[]; errors: readonly string[]; incomplete: boolean } {
  try {
    const result = scanFn({ path: filePath });
    return {
      findings: result.findings,
      errors: result.errors ?? [],
      incomplete: Boolean(result.incomplete),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      findings: [],
      errors: [`Failed to ${failureLabel} for "${filePath}": ${message}`],
      incomplete: true,
    };
  }
}

/**
 * Execute security scanning across a batch of files and accumulate findings and errors.
 */
function scanFileBatch(
  files: readonly { readonly path: string }[],
  scanFn: (options: { path: string }) => SecurityScanExecutionResult,
  failureLabel: string,
  target: { securityFindings: SecurityFinding[]; scanErrors: string[]; incomplete: boolean },
): void {
  for (const file of files) {
    const outcome = scanFileSecurity(file.path, scanFn, failureLabel);
    target.securityFindings.push(...outcome.findings);
    target.scanErrors.push(...outcome.errors);
    if (outcome.incomplete) {
      target.incomplete = true;
    }
  }
}

/**
 * Run secret and code vulnerability scanning across reviewable changed files.
 */
function scanReviewSecurityFindings(
  codeFiles: readonly { readonly path: string }[],
  secretFiles: readonly { readonly path: string }[],
): { securityFindings: SecurityFinding[]; scanErrors: string[]; incomplete: boolean } {
  const result = {
    securityFindings: [] as SecurityFinding[],
    scanErrors: [] as string[],
    incomplete: false,
  };
  scanFileBatch(secretFiles, scanSecrets, 'scan secrets', result);
  scanFileBatch(codeFiles, analyzeCode, 'analyze code', result);
  return result;
}

/**
 * Count security findings matching a specific severity level.
 */
function countBySeverity(findings: readonly SecurityFinding[], severity: 'critical' | 'high'): number {
  return findings.filter((f) => f.severity === severity).length;
}

/**
 * Extract unique security standard categories from findings.
 */
function extractUniqueCategories(findings: readonly SecurityFinding[], key: 'owasp' | 'cwe' | 'isoControl'): string[] {
  return [
    ...new Set(
      findings.map((f) => f[key]).filter((item): item is string => typeof item === 'string' && item.length > 0),
    ),
  ];
}

/**
 * Resolve incomplete boolean flag for security review report.
 */
function resolveReviewIncompleteStatus(incomplete: boolean, hasErrors: boolean): true | undefined {
  if (incomplete || hasErrors) {
    return true;
  }
  return undefined;
}

/**
 * Build a structured security scorecard summary for change review evidence.
 */
function buildSecurityReviewSummary(
  securityFindings: readonly SecurityFinding[],
  scanErrors: readonly string[] = [],
  incomplete = false,
) {
  const hasErrors = scanErrors.length > 0;
  const isClean = securityFindings.length === 0 && !incomplete && !hasErrors;
  return {
    clean: isClean,
    incomplete: resolveReviewIncompleteStatus(incomplete, hasErrors),
    errors: hasErrors ? scanErrors : undefined,
    findingsCount: securityFindings.length,
    criticalCount: countBySeverity(securityFindings, 'critical'),
    highCount: countBySeverity(securityFindings, 'high'),
    owaspCategories: extractUniqueCategories(securityFindings, 'owasp'),
    cweWeaknesses: extractUniqueCategories(securityFindings, 'cwe'),
    isoControls: extractUniqueCategories(securityFindings, 'isoControl'),
    findings: securityFindings,
  };
}

/**
 * Determine whether git diff changed-files input is incomplete or truncated.
 */
function isGitInputIncomplete(
  changed: {
    readonly success: boolean;
    readonly outputTruncated: boolean;
    readonly timedOut: boolean;
    readonly files: readonly unknown[];
  },
  maxFiles: number,
): boolean {
  if (!changed.success) return true;
  if (changed.outputTruncated) return true;
  if (changed.timedOut) return true;
  return changed.files.length > maxFiles;
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
  const allChangedFiles = changed.files.slice(0, maxFiles);

  const [diagnostics, tests] = await Promise.all([
    collectReviewDiagnostics(files, request.sessionId, request.languageId),
    collectReviewTests(files, maxFiles, request.sessionId, request.languageId, request.includeTests),
  ]);

  const { securityFindings, scanErrors, incomplete } = scanReviewSecurityFindings(files, allChangedFiles);
  const gitIncomplete = isGitInputIncomplete(changed, maxFiles);
  if (!changed.success && changed.message) {
    scanErrors.push(changed.message);
  }
  const securitySummary = buildSecurityReviewSummary(securityFindings, scanErrors, incomplete || gitIncomplete);

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
