/**
 * Workspace task runners and build graph intelligence for @mission-platform/mcp-developer.
 *
 * Provides bounded tools for:
 * 1. Detecting affected packages from git diffs / root config changes (repo_affected_packages)
 * 2. Priming upstream workspace dependencies for APFS-linked worktrees (repo_prime_dependencies)
 * 3. Bounded Turborepo task execution (turbo_run)
 * 4. Fine-grained single test file execution (run_test_file)
 * 5. Story discovery and inspection (list_stories)
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { findRepoRoot, resolveRepoPath } from '@mission-platform/mcp-shared/repo/paths';
import { listAll, type WorkspaceMember } from '@mission-platform/mcp-shared/repo/scanner';

import { readGitChangedFiles } from '../git/index.ts';

const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_TIMEOUT_MS = 180_000;
const DEFAULT_OUTPUT_BYTES = 1024 * 1024;
const MAX_OUTPUT_BYTES = 4 * 1024 * 1024;

const SAFE_TASK_PATTERN = /^[a-z0-9_:-]+$/i;
const SAFE_FILTER_PATTERN = /^[A-Za-z0-9@._/^{}*~-]+$/;
const TEST_FILE_PATTERN = /\.(?:test|spec)\.[cm]?[jt]sx?$/;

const ROOT_CONFIG_FILES = new Set([
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'turbo.json',
  'tsconfig.base.json',
  'tsconfig.json',
]);

export interface AffectedPackageEntry {
  readonly name: string;
  readonly relativeDir: string;
  readonly changedFileCount: number;
  readonly sampleFiles: readonly string[];
}

export interface AffectedPackagesResult {
  readonly rootConfigChanged: boolean;
  readonly totalChangedFiles: number;
  readonly affectedPackages: readonly AffectedPackageEntry[];
  readonly rootFiles: readonly string[];
  readonly summary: string;
}

export interface PrimeDependenciesResult {
  readonly packageName: string;
  readonly filter: string;
  readonly success: boolean;
  readonly exitCode: number | null;
  readonly durationMs: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly outputTruncated: boolean;
  readonly message: string;
}

export interface TurboTaskResult {
  readonly task: string;
  readonly filter?: string;
  readonly dry: boolean;
  readonly success: boolean;
  readonly exitCode: number | null;
  readonly durationMs: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly outputTruncated: boolean;
  readonly message: string;
}

export interface TestFileRunResult {
  readonly filePath: string;
  readonly runner: 'node:test' | 'vitest';
  readonly success: boolean;
  readonly exitCode: number | null;
  readonly durationMs: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly outputTruncated: boolean;
  readonly message: string;
}

export interface StoryEntry {
  readonly filePath: string;
  readonly componentName: string;
  readonly level?: string;
  readonly packageName?: string;
}

export interface ListStoriesResult {
  readonly totalStories: number;
  readonly stories: readonly StoryEntry[];
  readonly limit: number;
  readonly message: string;
}

/**
 * Bounded execution timeout helper ensuring timeoutMs is within 10ms to 180,000ms.
 */
function boundedTimeout(value: number | undefined): number {
  const timeout = Math.trunc(value ?? DEFAULT_TIMEOUT_MS);
  if (!Number.isInteger(timeout) || timeout < 10 || timeout > MAX_TIMEOUT_MS) {
    throw new Error(`timeoutMs must be an integer between 10 and ${MAX_TIMEOUT_MS}.`);
  }
  return timeout;
}

/**
 * Bounded output buffer size helper ensuring maxOutputBytes is within 1 to 1MB.
 */
function boundedOutput(value: number | undefined): number {
  const output = Math.trunc(value ?? DEFAULT_OUTPUT_BYTES);
  if (!Number.isInteger(output) || output < 1 || output > MAX_OUTPUT_BYTES) {
    throw new Error(`maxOutputBytes must be an integer between 1 and ${MAX_OUTPUT_BYTES}.`);
  }
  return output;
}

/**
 * Trim stdout/stderr string to a max byte length, returning whether it was truncated.
 */
function trimOutput(value: string, limit: number): { value: string; truncated: boolean } {
  if (Buffer.byteLength(value, 'utf8') <= limit) return { value, truncated: false };
  const bytes = Buffer.from(value, 'utf8').subarray(0, limit);
  return { value: bytes.toString('utf8'), truncated: true };
}

interface ProcessExecutionOptions {
  cwd: string;
  command: string;
  args: string[];
  timeoutMs: number;
  maxOutputBytes: number;
}

interface ProcessExecutionResult {
  success: boolean;
  exitCode: number | null;
  durationMs: number;
  stdout: string;
  stderr: string;
  outputTruncated: boolean;
  timedOut: boolean;
}

/**
 * Execute a child process synchronously with bounded buffer, timeout, and timing metrics.
 */
function executeBoundedProcess(options: ProcessExecutionOptions): ProcessExecutionResult {
  const startedAt = Date.now();
  const result = spawnSync(options.command, options.args, {
    cwd: options.cwd,
    encoding: 'utf8',
    shell: false,
    timeout: options.timeoutMs,
    maxBuffer: options.maxOutputBytes,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const durationMs = Date.now() - startedAt;

  const stdout = trimOutput(typeof result.stdout === 'string' ? result.stdout : '', options.maxOutputBytes);
  const stderr = trimOutput(typeof result.stderr === 'string' ? result.stderr : '', options.maxOutputBytes);
  const errorCode = (result.error as NodeJS.ErrnoException | undefined)?.code;
  const timedOut = errorCode === 'ETIMEDOUT';
  const bufferExceeded = stdout.truncated || stderr.truncated || errorCode === 'ENOBUFS';
  const success = result.status === 0 && !result.error;

  return {
    success,
    exitCode: result.status,
    durationMs,
    stdout: stdout.value,
    stderr: stderr.value,
    outputTruncated: bufferExceeded,
    timedOut,
  };
}

/**
 * Format a task status message based on execution outcome.
 */
function formatTaskMessage(
  entity: string,
  result: ProcessExecutionResult,
  timeoutMs: number,
  successTemplate: (durationMs: number) => string,
): string {
  if (result.timedOut) {
    return `"${entity}" timed out after ${timeoutMs} ms.`;
  }
  if (result.success) {
    return successTemplate(result.durationMs);
  }
  return `"${entity}" failed with exit code ${result.exitCode ?? 'unknown'}.`;
}

/**
 * Partition changed files into root configs and member-specific packages.
 */
function partitionChangedFiles(
  changedFiles: readonly string[],
  members: readonly WorkspaceMember[],
): { rootFiles: string[]; packageFileMap: Map<string, string[]>; rootConfigChanged: boolean } {
  const rootFiles: string[] = [];
  const packageFileMap = new Map<string, string[]>();
  let rootConfigChanged = false;

  for (const file of changedFiles) {
    if (ROOT_CONFIG_FILES.has(file)) {
      rootConfigChanged = true;
      rootFiles.push(file);
      continue;
    }

    const matchedMember = members.find((member) => file.startsWith(`${member.relativeDir}/`));
    if (matchedMember) {
      const existing = packageFileMap.get(matchedMember.name) ?? [];
      existing.push(file);
      packageFileMap.set(matchedMember.name, existing);
    } else {
      rootFiles.push(file);
    }
  }

  return { rootFiles, packageFileMap, rootConfigChanged };
}

/**
 * Build sorted affected package entries from package-to-files mapping.
 */
function buildAffectedPackageEntries(
  packageFileMap: Map<string, string[]>,
  members: readonly WorkspaceMember[],
): AffectedPackageEntry[] {
  const affectedPackages: AffectedPackageEntry[] = [];
  for (const [name, files] of packageFileMap.entries()) {
    const member = members.find((m) => m.name === name);
    affectedPackages.push({
      name,
      relativeDir: member ? member.relativeDir : name,
      changedFileCount: files.length,
      sampleFiles: files.slice(0, 5),
    });
  }
  affectedPackages.sort((a, b) => b.changedFileCount - a.changedFileCount);
  return affectedPackages;
}

/**
 * Generate human-readable summary of affected workspace packages.
 */
function formatAffectedSummary(
  rootConfigChanged: boolean,
  rootFiles: readonly string[],
  affectedCount: number,
  totalChangedFiles: number,
): string {
  if (rootConfigChanged) {
    const changedConfigs = rootFiles.filter((f) => ROOT_CONFIG_FILES.has(f)).join(', ');
    return `Root configuration changed (${changedConfigs}). All workspace packages may be affected. ${affectedCount} packages directly modified.`;
  }
  if (affectedCount === 0) {
    return 'No workspace packages affected by current changes.';
  }
  return `${affectedCount} package(s) affected across ${totalChangedFiles} changed files.`;
}

/**
 * Maps changed repository files to affected workspace packages and detects root configuration modifications.
 */
export function getAffectedPackages(options: { ref?: string; path?: string } = {}): AffectedPackagesResult {
  const changedReport = readGitChangedFiles(options);
  const changedFiles = changedReport.files.map((file) => file.path);
  const members = listAll();

  const { rootFiles, packageFileMap, rootConfigChanged } = partitionChangedFiles(changedFiles, members);
  const affectedPackages = buildAffectedPackageEntries(packageFileMap, members);
  const summary = formatAffectedSummary(rootConfigChanged, rootFiles, affectedPackages.length, changedFiles.length);

  return {
    rootConfigChanged,
    totalChangedFiles: changedFiles.length,
    affectedPackages,
    rootFiles,
    summary,
  };
}

/**
 * Resolve the canonical package name for upstream dependency priming.
 */
function resolvePrimingPackageName(rawName: string, members: readonly WorkspaceMember[]): string {
  const member = members.find(
    (m) => m.name === rawName || m.relativeDir === rawName || m.name === `@mission-platform/${rawName}`,
  );
  if (member) return member.name;
  return rawName.startsWith('@') ? rawName : `@mission-platform/${rawName}`;
}

/**
 * Builds upstream workspace dependencies for a package via Turborepo filter (`<pkg>^...`).
 * Crucial in APFS-linked worktrees where internal dist/ artifacts may not be compiled yet.
 */
export function primeUpstreamDependencies(request: {
  readonly packageName: string;
  readonly timeoutMs?: number;
  readonly maxOutputBytes?: number;
}): PrimeDependenciesResult {
  const rawName = request.packageName.trim();
  if (!SAFE_FILTER_PATTERN.test(rawName)) {
    throw new Error('packageName contains invalid characters.');
  }

  const repoRoot = findRepoRoot();
  const members = listAll();
  const resolvedName = resolvePrimingPackageName(rawName, members);
  const filter = `${resolvedName}^...`;
  const timeoutMs = boundedTimeout(request.timeoutMs);
  const maxOutputBytes = boundedOutput(request.maxOutputBytes);

  const execResult = executeBoundedProcess({
    cwd: repoRoot,
    command: 'pnpm',
    args: ['exec', 'turbo', 'run', 'build', '--filter', filter],
    timeoutMs,
    maxOutputBytes,
  });

  const message = formatTaskMessage(
    filter,
    execResult,
    timeoutMs,
    (duration) => `Upstream dependencies for "${resolvedName}" built successfully in ${duration} ms.`,
  );

  return {
    packageName: resolvedName,
    filter,
    success: execResult.success,
    exitCode: execResult.exitCode,
    durationMs: execResult.durationMs,
    stdout: execResult.stdout,
    stderr: execResult.stderr,
    outputTruncated: execResult.outputTruncated,
    message,
  };
}

/**
 * Runs a Turborepo task across packages with strict parameter bounds and timeout.
 */
export function runTurboTask(request: {
  readonly task: string;
  readonly filter?: string;
  readonly dry?: boolean;
  readonly timeoutMs?: number;
  readonly maxOutputBytes?: number;
}): TurboTaskResult {
  const task = request.task.trim();
  if (!SAFE_TASK_PATTERN.test(task)) {
    throw new Error(`Invalid task name "${task}". Use alphanumeric names like "build:check", "lint", "test".`);
  }

  const filter = request.filter?.trim();
  if (filter && !SAFE_FILTER_PATTERN.test(filter)) {
    throw new Error(`Invalid filter pattern "${filter}".`);
  }

  const repoRoot = findRepoRoot();
  const timeoutMs = boundedTimeout(request.timeoutMs);
  const maxOutputBytes = boundedOutput(request.maxOutputBytes);

  const args = ['exec', 'turbo', 'run', task];
  if (filter) args.push('--filter', filter);
  if (request.dry) args.push('--dry=json');

  const execResult = executeBoundedProcess({
    cwd: repoRoot,
    command: 'pnpm',
    args,
    timeoutMs,
    maxOutputBytes,
  });

  const message = formatTaskMessage(
    task,
    execResult,
    timeoutMs,
    (duration) => `Turborepo task "${task}" completed successfully in ${duration} ms.`,
  );

  return {
    task,
    filter,
    dry: request.dry === true,
    success: execResult.success,
    exitCode: execResult.exitCode,
    durationMs: execResult.durationMs,
    stdout: execResult.stdout,
    stderr: execResult.stderr,
    outputTruncated: execResult.outputTruncated,
    message,
  };
}

/**
 * Build execution arguments for targeted test execution.
 */
function buildTestRunArgs(
  runner: 'node:test' | 'vitest',
  relativePath: string,
  testNamePattern?: string,
): { command: string; args: string[] } {
  if (runner === 'node:test') {
    return { command: 'node', args: ['--test', relativePath] };
  }
  const vitestArgs = ['exec', 'vitest', 'run', relativePath];
  if (testNamePattern) {
    vitestArgs.push('-t', testNamePattern);
  }
  return { command: 'pnpm', args: vitestArgs };
}

/**
 * Runs an individual test file using vitest or node:test with targeted execution.
 */
export function runTestFile(request: {
  readonly filePath: string;
  readonly testNamePattern?: string;
  readonly timeoutMs?: number;
  readonly maxOutputBytes?: number;
}): TestFileRunResult {
  const repoRoot = findRepoRoot();
  const absolutePath = resolveRepoPath(request.filePath, 'filePath');

  if (!TEST_FILE_PATTERN.test(absolutePath)) {
    throw new Error(`"${request.filePath}" is not a recognized test file (*.test.ts, *.spec.ts).`);
  }

  const relativePath = relative(repoRoot, absolutePath);
  const runner: 'node:test' | 'vitest' = relativePath.startsWith('mcp/') ? 'node:test' : 'vitest';
  const timeoutMs = boundedTimeout(request.timeoutMs);
  const maxOutputBytes = boundedOutput(request.maxOutputBytes);

  const { command, args } = buildTestRunArgs(runner, relativePath, request.testNamePattern);
  const execResult = executeBoundedProcess({
    cwd: repoRoot,
    command,
    args,
    timeoutMs,
    maxOutputBytes,
  });

  const message = formatTaskMessage(
    relativePath,
    execResult,
    timeoutMs,
    (duration) => `Test "${relativePath}" passed in ${duration} ms.`,
  );

  return {
    filePath: relativePath,
    runner,
    success: execResult.success,
    exitCode: execResult.exitCode,
    durationMs: execResult.durationMs,
    stdout: execResult.stdout,
    stderr: execResult.stderr,
    outputTruncated: execResult.outputTruncated,
    message,
  };
}

/**
 * Check whether a directory entry should be skipped during story scanning.
 */
function isIgnoredScanEntry(entry: string): boolean {
  return entry === 'node_modules' || entry === 'dist' || entry.startsWith('.');
}

/**
 * Check whether a filename matches story naming conventions.
 */
function isStoryFileName(entry: string): boolean {
  return entry.endsWith('.stories.tsx') || entry.endsWith('.stories.ts');
}

/**
 * Extract StoryEntry metadata from a discovered story file path.
 */
function extractStoryEntry(
  repoRoot: string,
  fullPath: string,
  entry: string,
  filterPackage?: string,
  filterComponent?: string,
): StoryEntry | undefined {
  const relativeFilePath = relative(repoRoot, fullPath);
  const fileBase = entry.replace(/\.stories\.[jt]sx?$/, '');
  const segments = relativeFilePath.split('/');
  const atomicLevels = new Set(['atoms', 'molecules', 'organisms', 'templates', 'pages']);
  const foundLevel = segments.find((s) => atomicLevels.has(s));
  const packageName = segments.length > 1 ? segments[1] : undefined;

  if (filterPackage && packageName && !packageName.toLowerCase().includes(filterPackage)) {
    return undefined;
  }
  if (filterComponent && !fileBase.toLowerCase().includes(filterComponent)) {
    return undefined;
  }

  return {
    filePath: relativeFilePath,
    componentName: fileBase,
    level: foundLevel,
    packageName,
  };
}

/**
 * Recursively scan a directory for Storybook story files up to maximum depth and limit.
 */
function scanStoriesDirectory(
  dir: string,
  repoRoot: string,
  stories: StoryEntry[],
  limit: number,
  filterPackage?: string,
  filterComponent?: string,
  currentDepth = 0,
): void {
  if (currentDepth > 10 || stories.length >= limit) return;
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }

  for (const entry of entries) {
    if (stories.length >= limit) break;
    if (isIgnoredScanEntry(entry)) continue;

    const fullPath = join(dir, entry);
    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      scanStoriesDirectory(fullPath, repoRoot, stories, limit, filterPackage, filterComponent, currentDepth + 1);
    } else if (isStoryFileName(entry)) {
      const story = extractStoryEntry(repoRoot, fullPath, entry, filterPackage, filterComponent);
      if (story) stories.push(story);
    }
  }
}

/**
 * Discovers and inspects Storybook story files across the repository.
 */
export function listStories(
  options: {
    readonly component?: string;
    readonly package?: string;
    readonly limit?: number;
  } = {},
): ListStoriesResult {
  const repoRoot = findRepoRoot();
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 500);
  const stories: StoryEntry[] = [];

  const candidateDirs = ['packages', 'apps'];
  const filterComponent = options.component?.toLowerCase().trim();
  const filterPackage = options.package?.toLowerCase().trim();

  for (const base of candidateDirs) {
    const fullBase = join(repoRoot, base);
    if (existsSync(fullBase)) {
      scanStoriesDirectory(fullBase, repoRoot, stories, limit, filterPackage, filterComponent);
    }
  }

  return {
    totalStories: stories.length,
    stories,
    limit,
    message: `Found ${stories.length} Storybook story file(s).`,
  };
}
