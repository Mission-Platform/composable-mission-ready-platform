import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, readlinkSync } from 'node:fs';
import { relative, resolve, isAbsolute } from 'node:path';

import lint from '@commitlint/lint';
import load from '@commitlint/load';
import { findRepoRoot, resolveRepoPath } from '@mission-platform/mcp-shared/repo/paths';

import { runGit, type GitCommandInputOptions, type GitCommandResult } from './runner.ts';

export const COMMIT_TYPES = [
  'feat',
  'fix',
  'refactor',
  'style',
  'chore',
  'docs',
  'test',
  'build',
  'ci',
  'perf',
  'revert',
] as const;

export type CommitType = (typeof COMMIT_TYPES)[number];

export interface CommitMessageInput {
  readonly type: CommitType;
  readonly scope?: string;
  readonly description: string;
  readonly body?: string;
  readonly footers?: readonly string[];
}

export type CommitMode =
  { readonly kind: 'staged-only' } | { readonly kind: 'paths'; readonly paths: readonly string[] };

export interface CommitMessageValidation {
  readonly message: string;
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

export interface CommitPreviewAction {
  readonly command: readonly string[];
  readonly files: readonly string[];
}

export interface CommitPlan {
  readonly planId: string;
  readonly message: string;
  readonly mode: CommitMode;
  readonly snapshot: string;
  readonly preview: {
    readonly command: readonly string[];
    readonly files: readonly string[];
    readonly actions: readonly CommitPreviewAction[];
  };
}

export interface CommitPlanOptions extends CommitMessageInput, Omit<GitCommandInputOptions, 'input'> {
  readonly mode: CommitMode;
}

export interface CommitApplyOptions extends Omit<GitCommandInputOptions, 'input'> {}

export interface CommitApplyResult {
  readonly operation: 'commit-apply';
  readonly success: boolean;
  readonly stale: boolean;
  readonly message: string;
  readonly snapshot: string;
  readonly stage?: GitCommandResult;
  readonly commit?: GitCommandResult;
  readonly commitId?: string;
  readonly error?: string;
}

const FOOTER_PATTERN = /^(?:BREAKING CHANGE|[A-Za-z][A-Za-z0-9-]*!?)[ \t]*:[ \t]*\S.*$/;

function rejectNul(value: string, label: string): void {
  if (value.includes('\0')) throw new Error(`${label} must not contain NUL characters.`);
}

function normalizeMessagePart(value: string, label: string): string {
  if (typeof value !== 'string') throw new Error(`${label} must be a string.`);
  rejectNul(value, label);
  return value.replaceAll('\r\n', '\n').replaceAll('\r', '\n').trim();
}

function normalizeMode(mode: CommitMode): CommitMode {
  if (!mode || typeof mode !== 'object') throw new Error('commit mode is required.');
  if (mode.kind === 'staged-only') return { kind: 'staged-only' };
  if (mode.kind !== 'paths' || !Array.isArray(mode.paths) || mode.paths.length === 0) {
    throw new Error('commit mode paths must contain at least one repository-relative path.');
  }

  const paths = mode.paths.map((path) => normalizeCommitPath(path));
  if (new Set(paths).size !== paths.length) {
    throw new Error('commit mode paths must not contain duplicates.');
  }
  return { kind: 'paths', paths };
}

export function normalizeCommitPath(path: string): string {
  if (typeof path !== 'string' || !path.trim() || path.includes('\0')) {
    throw new Error('commit paths must be non-empty strings without NUL characters.');
  }
  if (isAbsolute(path) || /^[A-Za-z]:[\\/]/.test(path)) {
    throw new Error(`commit path "${path}" must be repository-relative.`);
  }
  const segments = path.split(/[\\/]/);
  if (segments.includes('..')) {
    throw new Error(`commit path "${path}" must not traverse outside the repository root.`);
  }

  const root = findRepoRoot();
  const resolved = resolveRepoPath(path, 'Commit path', { allowMissing: true });
  const relativePath = relative(root, resolved).replaceAll('\\', '/');
  if (!relativePath || relativePath === '.') {
    throw new Error(`commit path "${path}" must identify a file or directory below the repository root.`);
  }
  return relativePath;
}

export function buildCommitMessage(input: CommitMessageInput): string {
  if (!input || typeof input !== 'object') throw new Error('commit message input is required.');
  const type = normalizeMessagePart(input.type, 'commit type');
  const scope = input.scope === undefined ? undefined : normalizeMessagePart(input.scope, 'commit scope');
  const description = normalizeMessagePart(input.description, 'commit description');
  if (!type) throw new Error('commit type must not be empty.');
  if (!description) throw new Error('commit description must not be empty.');
  if (description.includes('\n')) throw new Error('commit description must be a single line.');
  if (scope?.includes('\n')) throw new Error('commit scope must be a single line.');

  const body = input.body === undefined ? undefined : normalizeMessagePart(input.body, 'commit body');
  if (body?.includes('\0')) throw new Error('commit body must not contain NUL characters.');
  const footers = (input.footers ?? []).map((footer) => normalizeMessagePart(footer, 'commit footer'));
  if (footers.some((footer) => !footer || footer.includes('\n') || !FOOTER_PATTERN.test(footer))) {
    throw new Error('each commit footer must be a non-empty single-line "Token: value" entry.');
  }

  const header = `${type}${scope ? `(${scope})` : ''}: ${description}`;
  return [header, body, footers.length > 0 ? footers.join('\n') : undefined].filter(Boolean).join('\n\n');
}

function formatLintIssue(issue: { readonly name: string; readonly message: string }): string {
  return `${issue.name}: ${issue.message}`;
}

export async function validateCommitMessage(input: CommitMessageInput): Promise<CommitMessageValidation> {
  const message = buildCommitMessage(input);
  const root = findRepoRoot();
  const loaded = await load({}, { cwd: root, file: resolve(root, 'commitlint.config.mjs') });
  const report = await lint(message, loaded.rules, { defaultIgnores: false });
  const errors = report.errors.map((issue) => formatLintIssue(issue));
  const warnings = report.warnings.map((issue) => formatLintIssue(issue));
  return { message, valid: report.valid, errors, warnings };
}

function requireGitSuccess(result: GitCommandResult): string {
  if (!result.success) {
    throw new Error(`${result.message}${result.stderr ? ` ${result.stderr.trim()}` : ''}`);
  }
  if (result.outputTruncated)
    throw new Error(`Git ${result.operation} output was truncated; refusing an unsafe snapshot.`);
  return result.stdout;
}

function parseNullPaths(value: string): string[] {
  return value
    .split('\0')
    .filter(Boolean)
    .map((path) => path.replaceAll('\\', '/'));
}

function untrackedPaths(status: string): string[] {
  return status
    .split('\0')
    .filter((entry) => entry.startsWith('? '))
    .map((entry) => entry.slice(2));
}

function modeKey(mode: CommitMode): string {
  return mode.kind === 'staged-only' ? mode.kind : `${mode.kind}:${mode.paths.join('\0')}`;
}

function captureSelectedWorktreeHashes(paths: readonly string[], options: GitCommandInputOptions): string[] {
  const selectedFiles = parseNullPaths(
    requireGitSuccess(
      runGit(
        'commit-snapshot-selected-files',
        ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', ...paths],
        options,
      ),
    ),
  ).sort();

  return selectedFiles.map((path) => {
    const hash = runGit('commit-snapshot-selected-file', ['hash-object', '--no-filters', '--', path], options);
    if (hash.success) return `${path}\0${requireGitSuccess(hash).trim()}`;
    if (existsSync(resolveRepoPath(path, 'Commit path', { allowMissing: true }))) {
      return requireGitSuccess(hash);
    }
    return `${path}\0<missing>`;
  });
}

/**
 * Resolve symlink target for a repository path if applicable.
 */
function readSymlinkTarget(resolved: string): string | undefined {
  try {
    if (lstatSync(resolved).isSymbolicLink()) {
      return readlinkSync(resolved);
    }
  } catch {
    // Ignored
  }
  return undefined;
}

/**
 * Hash an untracked repository path for the commit snapshot.
 */
function hashUntrackedPath(path: string, options: GitCommandInputOptions): string {
  const resolved = resolveRepoPath(path, 'Untracked path', { allowMissing: true, allowSymlink: true });
  const symlinkTarget = readSymlinkTarget(resolved);
  if (symlinkTarget !== undefined) {
    return `${path}\0symlink:${symlinkTarget}`;
  }
  if (!existsSync(resolved)) {
    return `${path}\0<missing>`;
  }
  try {
    if (lstatSync(resolved).isDirectory()) {
      return `${path}\0directory`;
    }
  } catch {
    return `${path}\0<missing>`;
  }
  const hash = runGit('commit-snapshot-untracked', ['hash-object', '--no-filters', '--', path], options);
  if (hash.success) {
    return `${path}\0${hash.stdout.trim()}`;
  }
  return existsSync(resolved) ? requireGitSuccess(hash) : `${path}\0<missing>`;
}

export function captureCommitSnapshot(
  message: string,
  mode: CommitMode,
  options: GitCommandInputOptions = {},
): { readonly snapshot: string; readonly files: readonly string[] } {
  rejectNul(message, 'commit message');
  const normalizedMode = normalizeMode(mode);
  const status = requireGitSuccess(
    runGit('commit-snapshot-status', ['status', '--porcelain=v2', '--branch', '--untracked-files=all', '-z'], options),
  );
  const cached = requireGitSuccess(runGit('commit-snapshot-index', ['diff', '--cached', '--raw', '-z', '--'], options));
  const worktree = requireGitSuccess(runGit('commit-snapshot-worktree', ['diff', '--raw', '-z', '--'], options));
  const stagedFiles = parseNullPaths(
    requireGitSuccess(runGit('commit-snapshot-files', ['diff', '--cached', '--name-only', '-z', '--'], options)),
  ).sort();
  const paths = untrackedPaths(status).sort();
  const untrackedHashes = paths.map((path) => hashUntrackedPath(path, options));
  const selectedWorktreeHashes =
    normalizedMode.kind === 'paths' ? captureSelectedWorktreeHashes(normalizedMode.paths, options) : [];
  const files = normalizedMode.kind === 'staged-only' ? stagedFiles : [...normalizedMode.paths];
  if (normalizedMode.kind === 'staged-only' && files.length === 0) {
    throw new Error('staged-only commit mode requires at least one staged file.');
  }

  const material = [
    message,
    modeKey(normalizedMode),
    status,
    cached,
    worktree,
    untrackedHashes.join('\n'),
    selectedWorktreeHashes.join('\n'),
  ].join('\n\0');
  const snapshot = `sha256:${createHash('sha256').update(material).digest('hex')}`;
  return { snapshot, files };
}

export async function createCommitPlan(options: CommitPlanOptions): Promise<CommitPlan> {
  const validation = await validateCommitMessage(options);
  if (!validation.valid) {
    throw new Error(`commit message failed validation: ${[...validation.errors, ...validation.warnings].join('; ')}`);
  }
  const mode = normalizeMode(options.mode);
  const captured = captureCommitSnapshot(validation.message, mode, options);
  const commitCommand =
    mode.kind === 'staged-only'
      ? ['git', 'commit', '-F', '-']
      : ['git', 'commit', '--only', '-F', '-', '--', ...mode.paths];
  const actions: CommitPreviewAction[] = [];
  if (mode.kind === 'paths') actions.push({ command: ['git', 'add', '--', ...mode.paths], files: mode.paths });
  actions.push({ command: commitCommand, files: captured.files });
  return {
    planId: randomUUID(),
    message: validation.message,
    mode,
    snapshot: captured.snapshot,
    preview: { command: commitCommand, files: captured.files, actions },
  };
}

export function applyCommitPlan(plan: CommitPlan, options: CommitApplyOptions = {}): CommitApplyResult {
  const mode = normalizeMode(plan.mode);
  const current = captureCommitSnapshot(plan.message, mode, options);
  if (current.snapshot !== plan.snapshot) {
    return {
      operation: 'commit-apply',
      success: false,
      stale: true,
      message: 'Commit plan is stale because repository state, message, or selected paths changed.',
      snapshot: current.snapshot,
      error: 'Re-plan before applying; no Git mutation was performed.',
    };
  }

  let stage: GitCommandResult | undefined;
  if (mode.kind === 'paths') {
    stage = runGit('commit-stage', ['add', '--', ...mode.paths], options);
    if (!stage.success) {
      return {
        operation: 'commit-apply',
        success: false,
        stale: false,
        message: stage.message,
        snapshot: current.snapshot,
        stage,
        error: stage.stderr || stage.message,
      };
    }
  }

  const commitArgs =
    mode.kind === 'staged-only' ? ['commit', '-F', '-'] : ['commit', '--only', '-F', '-', '--', ...mode.paths];
  const commit = runGit('commit', commitArgs, { ...options, input: `${plan.message}\n` });
  if (!commit.success) {
    return {
      operation: 'commit-apply',
      success: false,
      stale: false,
      message: commit.message,
      snapshot: current.snapshot,
      stage,
      commit,
      error: commit.stderr || commit.message,
    };
  }
  const head = runGit('commit-revision', ['rev-parse', '--verify', 'HEAD'], options);
  return {
    operation: 'commit-apply',
    success: true,
    stale: false,
    message: commit.message,
    snapshot: current.snapshot,
    stage,
    commit,
    commitId: head.success && !head.outputTruncated ? head.stdout.trim() : undefined,
  };
}
