import { findRepoRoot, resolveRepoPath } from '@mission-platform/mcp-shared/repo/paths';

import { runGit, type GitCommandOptions, type GitCommandResult } from './runner.ts';
const MAX_PATTERN_LENGTH = 512;
const DEFAULT_GREP_MATCHES = 100;
const MAX_GREP_MATCHES = 500;
const DEFAULT_REF_LIMIT = 100;
const MAX_REF_LIMIT = 500;
const MAX_BLAME_LINE = 1_000_000;
const MAX_BLAME_LINE_RANGE = 10_000;

export type { GitCommandOptions, GitCommandResult } from './runner.ts';
export type GitReadOptions = GitCommandOptions;
export type GitReadResult = GitCommandResult;

export interface GitChangedFile {
  readonly path: string;
  readonly indexStatus: string;
  readonly worktreeStatus: string;
  readonly staged: boolean;
  readonly unstaged: boolean;
  readonly untracked: boolean;
}

export interface GitChangedFilesResult extends GitCommandResult {
  readonly operation: 'changed-files';
  readonly files: readonly GitChangedFile[];
}

function revision(value: string, label = 'revision'): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > 512 || normalized.includes('\0')) {
    throw new Error(`${label} must be a non-empty value of at most 512 characters.`);
  }
  return normalized;
}

function searchPattern(value: string): string {
  if (!value.trim() || value.length > MAX_PATTERN_LENGTH || value.includes('\0')) {
    throw new Error(`pattern must be a non-empty value of at most ${MAX_PATTERN_LENGTH} characters.`);
  }
  return value;
}

function boundedGrepMatches(value: number | undefined): number {
  const maxMatches = value ?? DEFAULT_GREP_MATCHES;
  if (!Number.isInteger(maxMatches) || maxMatches < 1 || maxMatches > MAX_GREP_MATCHES) {
    throw new Error(`maxMatches must be an integer between 1 and ${MAX_GREP_MATCHES}.`);
  }
  return maxMatches;
}

function boundedRefLimit(value: number | undefined): number {
  const limit = value ?? DEFAULT_REF_LIMIT;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_REF_LIMIT) {
    throw new Error(`limit must be an integer between 1 and ${MAX_REF_LIMIT}.`);
  }
  return limit;
}

function refPattern(value: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > MAX_PATTERN_LENGTH || normalized.includes('\0')) {
    throw new Error(`pattern must be a non-empty value of at most ${MAX_PATTERN_LENGTH} characters.`);
  }
  return normalized;
}

function blameLineRange(startLine: number | undefined, endLine: number | undefined): string | undefined {
  if (startLine === undefined && endLine === undefined) return undefined;

  const start = startLine ?? 1;
  const end = endLine ?? start;
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 1 ||
    end < 1 ||
    start > MAX_BLAME_LINE ||
    end > MAX_BLAME_LINE
  ) {
    throw new Error(`startLine and endLine must be integers between 1 and ${MAX_BLAME_LINE}.`);
  }
  if (end < start || end - start + 1 > MAX_BLAME_LINE_RANGE) {
    throw new Error(`blame line range must contain between 1 and ${MAX_BLAME_LINE_RANGE} lines.`);
  }
  return `${start},${end}`;
}

function repositoryPath(value: string): string {
  if (!value.trim() || value.includes('\0')) {
    throw new Error('Git path must be a non-empty value without NUL characters.');
  }
  const root = findRepoRoot();
  const resolved = resolveRepoPath(value, 'Git path');
  const relative = resolved.slice(root.length).replace(/^[/\\]/, '');
  return relative || '.';
}

function parseChangedFiles(output: string): GitChangedFile[] {
  return output
    .split('\0')
    .filter(Boolean)
    .flatMap((entry) => {
      if (entry.length < 4) return [];
      const indexStatus = entry[0] ?? ' ';
      const worktreeStatus = entry[1] ?? ' ';
      const path = entry.slice(3);
      if (!path) return [];
      return [
        {
          path,
          indexStatus,
          worktreeStatus,
          staged: indexStatus !== ' ' && indexStatus !== '?',
          unstaged: worktreeStatus !== ' ' && worktreeStatus !== '?',
          untracked: indexStatus === '?' && worktreeStatus === '?',
        },
      ];
    });
}

function parseDiffChangedFiles(output: string): GitChangedFile[] {
  const fields = output.split('\0').filter(Boolean);
  const files: GitChangedFile[] = [];
  for (let index = 0; index + 1 < fields.length; index += 2) {
    const status = fields[index] ?? '';
    const path = fields[index + 1] ?? '';
    if (!status || !path) continue;
    files.push({
      path,
      indexStatus: status[0] ?? 'M',
      worktreeStatus: ' ',
      staged: true,
      unstaged: false,
      untracked: false,
    });
  }
  return files;
}

export function readGitChangedFiles(
  options: GitReadOptions & { readonly path?: string; readonly ref?: string; readonly staged?: boolean } = {},
): GitChangedFilesResult {
  const useDiff = options.ref !== undefined || options.staged === true;
  const args = useDiff
    ? ['diff', '--name-status', '-z', '--no-color', '--no-ext-diff']
    : ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--no-renames'];
  if (useDiff && options.staged) args.push('--cached');
  if (useDiff && options.ref) args.push('--end-of-options', revision(options.ref));
  args.push('--');
  if (options.path) args.push(repositoryPath(options.path));
  const result = runGit('changed-files', args, options);
  const files = (useDiff ? parseDiffChangedFiles(result.stdout) : parseChangedFiles(result.stdout)).filter(
    (file) => !options.staged || file.staged,
  );
  return { ...result, operation: 'changed-files', files };
}

export function readGitStatus(options: GitReadOptions = {}): GitReadResult {
  return runGit('status', ['status', '--short', '--branch', '--untracked-files=all', '--no-renames'], options);
}

export interface GitDiffOptions extends GitReadOptions {
  readonly ref?: string;
  readonly path?: string;
  readonly staged?: boolean;
  readonly stat?: boolean;
}

export function readGitDiff(options: GitDiffOptions = {}): GitReadResult {
  const args = ['diff', '--no-color', '--no-ext-diff'];
  if (options.stat) args.push('--stat');
  if (options.staged) args.push('--cached');
  if (options.ref) args.push('--end-of-options', revision(options.ref));
  args.push('--');
  if (options.path) args.push(repositoryPath(options.path));
  return runGit('diff', args, options);
}

export interface GitLogOptions extends GitReadOptions {
  readonly ref?: string;
  readonly path?: string;
  readonly limit?: number;
}

export function readGitLog(options: GitLogOptions = {}): GitReadResult {
  const limit = Math.trunc(options.limit ?? 20);
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    throw new Error('limit must be an integer between 1 and 500.');
  }
  const args = ['log', '--no-color', '--date=iso-strict', '--format=fuller', `--max-count=${limit}`];
  if (options.ref) args.push('--end-of-options', revision(options.ref));
  args.push('--');
  if (options.path) args.push(repositoryPath(options.path));
  return runGit('log', args, options);
}

export interface GitGrepOptions extends GitReadOptions {
  readonly pattern: string;
  readonly ref?: string;
  readonly path?: string;
  readonly regex?: boolean;
  readonly ignoreCase?: boolean;
  readonly maxMatches?: number;
}

export function readGitGrep(options: GitGrepOptions): GitReadResult {
  const maxMatches = boundedGrepMatches(options.maxMatches);
  const args = [
    'grep',
    '--no-color',
    '--full-name',
    '--line-number',
    options.regex ? '--extended-regexp' : '--fixed-strings',
    ...(options.ignoreCase ? ['--ignore-case'] : []),
    `--max-count=${maxMatches}`,
    '-e',
    searchPattern(options.pattern),
  ];
  if (options.ref === undefined) args.push('--end-of-options');
  else args.push('--end-of-options', revision(options.ref));
  args.push('--');
  if (options.path !== undefined) args.push(repositoryPath(options.path));
  return runGit('grep', args, options);
}

export interface GitBlameOptions extends GitReadOptions {
  readonly path: string;
  readonly revision?: string;
  readonly startLine?: number;
  readonly endLine?: number;
}

export function readGitBlame(options: GitBlameOptions): GitReadResult {
  const args = ['blame'];
  const range = blameLineRange(options.startLine, options.endLine);
  if (range) args.push('-L', range);
  if (options.revision === undefined) {
    args.push('--end-of-options');
  } else {
    const blameRevision = revision(options.revision);
    if (blameRevision.startsWith('-')) {
      throw new Error('revision must not begin with "-" for git blame.');
    }
    args.push(blameRevision, '--end-of-options');
  }
  args.push('--', repositoryPath(options.path));
  return runGit('blame', args, options);
}

export interface GitLsFilesOptions extends GitReadOptions {
  readonly path?: string;
  readonly includeUntracked?: boolean;
  readonly includeStages?: boolean;
}

export function readGitLsFiles(options: GitLsFilesOptions = {}): GitReadResult {
  const args = ['ls-files', '--full-name', '--cached'];
  if (options.includeStages) args.push('--stage');
  if (options.includeUntracked) args.push('--others', '--exclude-standard');
  args.push('--');
  if (options.path !== undefined) args.push(repositoryPath(options.path));
  return runGit('ls-files', args, options);
}

export interface GitTagsOptions extends GitReadOptions {
  readonly pattern?: string;
  readonly limit?: number;
}

export function readGitTags(options: GitTagsOptions = {}): GitReadResult {
  const limit = boundedRefLimit(options.limit);
  const args = [
    'for-each-ref',
    `--count=${limit}`,
    '--sort=refname',
    '--format=%(refname:short)\t%(objectname)\t%(creatordate:iso-strict)',
    '--',
    options.pattern === undefined ? 'refs/tags' : `refs/tags/${refPattern(options.pattern)}`,
  ];
  return runGit('tags', args, options);
}

export function sanitizeGitRemoteUrl(value: string): string {
  let normalized = value.trim();

  // Always strip user:pass@ or user@
  normalized = normalized
    .replace(/^(?:[a-zA-Z0-9._%+-]+)(?::[^/@\s]+)?@/, '')
    .replace(/(:\/\/)(?:[^/@\s]+)(?::[^/@\s]+)?@/, '$1');

  // Now try URL parsing to normalize the host/path if it's a valid URL
  try {
    const parsed = new URL(normalized);
    return parsed.toString();
  } catch {
    // If not a valid URL (e.g. scp-style), return normalized
    return normalized;
  }
}

function sanitizeRemoteOutput(value: string): string {
  return value
    .split('\n')
    .map((line) => {
      const match = /^(\S+)(\s+)(\S+)(\s+\((?:fetch|push)\))$/.exec(line);
      if (match) return `${match[1]}${match[2]}${sanitizeGitRemoteUrl(match[3])}${match[4]}`;
      return line
        .replaceAll(/([a-z][a-z\d+.-]*:\/\/)[^/@\s]+@/gi, '$1')
        .replaceAll(/(^|\s)(?:[^/@\s]+)(?::[^/@\s]*)?@(?=[^:/\s]+:)/g, '$1');
    })
    .join('\n');
}

export function readGitRemotes(options: GitReadOptions = {}): GitReadResult {
  const result = runGit('remotes', ['remote', '--verbose'], options);
  return {
    ...result,
    stdout: sanitizeRemoteOutput(result.stdout),
    stderr: sanitizeRemoteOutput(result.stderr),
  };
}

export interface GitShowOptions extends GitReadOptions {
  readonly revision: string;
  readonly path?: string;
}

export function readGitShow(options: GitShowOptions): GitReadResult {
  const args = [
    'show',
    '--no-color',
    '--no-ext-diff',
    '--format=fuller',
    '--stat',
    '--patch',
    '--end-of-options',
    revision(options.revision),
    '--',
    ...(options.path ? [repositoryPath(options.path)] : []),
  ];
  return runGit('show', args, options);
}

export function readGitBranches(options: GitReadOptions = {}): GitReadResult {
  return runGit(
    'branches',
    ['branch', '--all', '--no-color', '--no-column', '--format=%(refname:short)\t%(objectname)\t%(HEAD)'],
    options,
  );
}
