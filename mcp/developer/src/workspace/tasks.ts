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

/**
 * Maps changed repository files to affected workspace packages and detects root configuration modifications.
 */
export function getAffectedPackages(options: { ref?: string; path?: string } = {}): AffectedPackagesResult {
  const changedReport = readGitChangedFiles(options);
  const changedFiles = changedReport.files.map((file) => file.path);

  const rootFiles: string[] = [];
  const packageFileMap = new Map<string, string[]>();
  let rootConfigChanged = false;

  const members: readonly WorkspaceMember[] = listAll();

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

  // Sort by changed file count descending
  affectedPackages.sort((a, b) => b.changedFileCount - a.changedFileCount);

  const summary = rootConfigChanged
    ? `Root configuration changed (${rootFiles.filter((f) => ROOT_CONFIG_FILES.has(f)).join(', ')}). All workspace packages may be affected. ${affectedPackages.length} packages directly modified.`
    : affectedPackages.length === 0
      ? 'No workspace packages affected by current changes.'
      : `${affectedPackages.length} package(s) affected across ${changedFiles.length} changed files.`;

  return {
    rootConfigChanged,
    totalChangedFiles: changedFiles.length,
    affectedPackages,
    rootFiles,
    summary,
  };
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
  const member = members.find(
    (m) => m.name === rawName || m.relativeDir === rawName || m.name === `@mission-platform/${rawName}`,
  );
  const resolvedName = member ? member.name : rawName.startsWith('@') ? rawName : `@mission-platform/${rawName}`;

  const filter = `${resolvedName}^...`;
  const timeoutMs = boundedTimeout(request.timeoutMs);
  const maxOutputBytes = boundedOutput(request.maxOutputBytes);

  const startedAt = Date.now();
  const result = spawnSync('pnpm', ['exec', 'turbo', 'run', 'build', '--filter', filter], {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: false,
    timeout: timeoutMs,
    maxBuffer: maxOutputBytes,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const durationMs = Date.now() - startedAt;

  const stdout = trimOutput(typeof result.stdout === 'string' ? result.stdout : '', maxOutputBytes);
  const stderr = trimOutput(typeof result.stderr === 'string' ? result.stderr : '', maxOutputBytes);
  const errorCode = (result.error as NodeJS.ErrnoException | undefined)?.code;
  const timedOut = errorCode === 'ETIMEDOUT';
  const outputTruncated = stdout.truncated || stderr.truncated || errorCode === 'ENOBUFS';
  const success = result.status === 0 && !result.error;

  return {
    packageName: resolvedName,
    filter,
    success,
    exitCode: result.status,
    durationMs,
    stdout: stdout.value,
    stderr: stderr.value,
    outputTruncated,
    message: timedOut
      ? `Dependency priming for "${filter}" timed out after ${timeoutMs} ms.`
      : success
        ? `Upstream dependencies for "${resolvedName}" built successfully in ${durationMs} ms.`
        : `Upstream dependency build for "${filter}" failed with exit code ${result.status ?? 'unknown'}.`,
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
  if (filter) {
    args.push('--filter', filter);
  }
  if (request.dry) {
    args.push('--dry=json');
  }

  const startedAt = Date.now();
  const result = spawnSync('pnpm', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: false,
    timeout: timeoutMs,
    maxBuffer: maxOutputBytes,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const durationMs = Date.now() - startedAt;

  const stdout = trimOutput(typeof result.stdout === 'string' ? result.stdout : '', maxOutputBytes);
  const stderr = trimOutput(typeof result.stderr === 'string' ? result.stderr : '', maxOutputBytes);
  const errorCode = (result.error as NodeJS.ErrnoException | undefined)?.code;
  const timedOut = errorCode === 'ETIMEDOUT';
  const outputTruncated = stdout.truncated || stderr.truncated || errorCode === 'ENOBUFS';
  const success = result.status === 0 && !result.error;

  return {
    task,
    filter,
    dry: request.dry === true,
    success,
    exitCode: result.status,
    durationMs,
    stdout: stdout.value,
    stderr: stderr.value,
    outputTruncated,
    message: timedOut
      ? `Turborepo task "${task}" timed out after ${timeoutMs} ms.`
      : success
        ? `Turborepo task "${task}" completed successfully in ${durationMs} ms.`
        : `Turborepo task "${task}" failed with exit code ${result.status ?? 'unknown'}.`,
  };
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
  const isNodeTest = relativePath.startsWith('mcp/');
  const runner: 'node:test' | 'vitest' = isNodeTest ? 'node:test' : 'vitest';

  const timeoutMs = boundedTimeout(request.timeoutMs);
  const maxOutputBytes = boundedOutput(request.maxOutputBytes);

  const command = runner === 'node:test' ? 'node' : 'pnpm';
  const args =
    runner === 'node:test'
      ? ['--test', relativePath]
      : request.testNamePattern
        ? ['exec', 'vitest', 'run', relativePath, '-t', request.testNamePattern]
        : ['exec', 'vitest', 'run', relativePath];

  const startedAt = Date.now();
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: false,
    timeout: timeoutMs,
    maxBuffer: maxOutputBytes,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const durationMs = Date.now() - startedAt;

  const stdout = trimOutput(typeof result.stdout === 'string' ? result.stdout : '', maxOutputBytes);
  const stderr = trimOutput(typeof result.stderr === 'string' ? result.stderr : '', maxOutputBytes);
  const errorCode = (result.error as NodeJS.ErrnoException | undefined)?.code;
  const timedOut = errorCode === 'ETIMEDOUT';
  const outputTruncated = stdout.truncated || stderr.truncated || errorCode === 'ENOBUFS';
  const success = result.status === 0 && !result.error;

  return {
    filePath: relativePath,
    runner,
    success,
    exitCode: result.status,
    durationMs,
    stdout: stdout.value,
    stderr: stderr.value,
    outputTruncated,
    message: timedOut
      ? `Test execution for "${relativePath}" timed out after ${timeoutMs} ms.`
      : success
        ? `Test "${relativePath}" passed in ${durationMs} ms.`
        : `Test "${relativePath}" failed with exit code ${result.status ?? 'unknown'}.`,
  };
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

  function scanDirectory(dir: string, currentDepth = 0): void {
    if (currentDepth > 10 || stories.length >= limit) return;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (stories.length >= limit) break;
      if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue;

      const fullPath = join(dir, entry);
      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        scanDirectory(fullPath, currentDepth + 1);
      } else if (entry.endsWith('.stories.tsx') || entry.endsWith('.stories.ts')) {
        const relativeFilePath = relative(repoRoot, fullPath);

        // Derive component name and level
        const fileBase = entry.replace(/\.stories\.[jt]sx?$/, '');
        const segments = relativeFilePath.split('/');
        const atomicLevels = new Set(['atoms', 'molecules', 'organisms', 'templates', 'pages']);
        const foundLevel = segments.find((s) => atomicLevels.has(s));
        const packageName = segments.length > 1 ? segments[1] : undefined;

        if (filterPackage && packageName && !packageName.toLowerCase().includes(filterPackage)) {
          continue;
        }

        if (filterComponent && !fileBase.toLowerCase().includes(filterComponent)) {
          continue;
        }

        stories.push({
          filePath: relativeFilePath,
          componentName: fileBase,
          level: foundLevel,
          packageName,
        });
      }
    }
  }

  for (const base of candidateDirs) {
    const fullBase = join(repoRoot, base);
    if (existsSync(fullBase)) {
      scanDirectory(fullBase);
    }
  }

  return {
    totalStories: stories.length,
    stories,
    limit,
    message: `Found ${stories.length} Storybook story file(s).`,
  };
}
