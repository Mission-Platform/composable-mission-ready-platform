import { spawn, type ChildProcessByStdio } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';

import { resolveRepoPath } from '@mission-platform/mcp-shared/repo/paths';
import { listAll, readMemberDetails, type PackageManifest } from '@mission-platform/mcp-shared/repo/scanner';

import { getLspRequestSession } from './registry.ts';

import type { Readable } from 'node:stream';

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_TIMEOUT_MS = 120_000;
const DEFAULT_OUTPUT_BYTES = 64 * 1024;
const MAX_OUTPUT_BYTES = 1024 * 1024;
const MAX_MANIFEST_BYTES = 1024 * 1024;
const MAX_SCAN_FILES = 20_000;
const MAX_TEST_FILE_BYTES = 256 * 1024;
const FORCE_KILL_DELAY_MS = 250;
const WORKFLOW_EXECUTABLE = 'pnpm';

export interface LspWorkflowRequest {
  readonly sessionId?: string;
  readonly languageId?: string;
  readonly packageName?: string;
  readonly timeoutMs?: number;
  readonly maxOutputBytes?: number;
  readonly signal?: AbortSignal;
}

export interface LspTestsForFileRequest extends LspWorkflowRequest {
  readonly filePath: string;
  readonly limit?: number;
}

export interface LspRelatedTest {
  readonly filePath: string;
  readonly score: number;
  readonly reason: string;
}

export interface LspTestsForFileResult {
  readonly supported: true;
  readonly sessionId: string;
  readonly languageId: string;
  readonly filePath: string;
  readonly packageRoot: string;
  readonly tests: readonly LspRelatedTest[];
  readonly message: string;
}

export type LspWorkflowStatus = 'passed' | 'failed' | 'timed-out' | 'cancelled' | 'spawn-error';

export interface LspWorkflowCommandResult {
  readonly supported: true;
  readonly operation: 'lsp_run_build' | 'lsp_run_tests';
  readonly sessionId: string;
  readonly languageId: string;
  readonly workspaceRoot: string;
  readonly packageName?: string;
  readonly script: 'build' | 'test';
  readonly command: readonly string[];
  readonly cwd: string;
  readonly status: LspWorkflowStatus;
  readonly success: boolean;
  readonly exitCode: number | null;
  readonly signal: string | null;
  readonly timedOut: boolean;
  readonly cancelled: boolean;
  readonly stdout: string;
  readonly stderr: string;
  readonly outputTruncated: boolean;
  readonly durationMs: number;
  readonly message: string;
}

export interface WorkflowCommand {
  readonly executable: string;
  readonly args: readonly string[];
  readonly cwd: string;
  readonly workspaceRoot: string;
  readonly packageName?: string;
  readonly script: 'build' | 'test';
}

interface WorkflowProcessResult {
  readonly status: LspWorkflowStatus;
  readonly exitCode: number | null;
  readonly signal: string | null;
  readonly timedOut: boolean;
  readonly cancelled: boolean;
  readonly stdout: string;
  readonly stderr: string;
  readonly outputTruncated: boolean;
  readonly durationMs: number;
  readonly message: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function boundedTimeout(value: number | undefined): number {
  const timeout = Math.trunc(value ?? DEFAULT_TIMEOUT_MS);
  if (!Number.isInteger(timeout) || timeout < 10 || timeout > MAX_TIMEOUT_MS) {
    throw new Error(`timeoutMs must be an integer between 10 and ${MAX_TIMEOUT_MS}.`);
  }
  return timeout;
}

function boundedOutput(value: number | undefined): number {
  const output = Math.trunc(value ?? DEFAULT_OUTPUT_BYTES);
  if (!Number.isInteger(output) || output < 1 || output > MAX_OUTPUT_BYTES) {
    throw new Error(`maxOutputBytes must be an integer between 1 and ${MAX_OUTPUT_BYTES}.`);
  }
  return output;
}

function boundedLimit(value: number | undefined): number {
  const limit = Math.trunc(value ?? 50);
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    throw new Error('limit must be an integer between 1 and 500.');
  }
  return limit;
}

function readManifest(path: string): PackageManifest {
  if (!existsSync(path) || !statSync(path).isFile()) throw new Error('Package manifest does not exist.');
  if (statSync(path).size > MAX_MANIFEST_BYTES) throw new Error('Package manifest exceeds the safety limit.');
  const value: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (!isRecord(value)) throw new Error('Package manifest must contain a JSON object.');
  return value as PackageManifest;
}

function packageForName(
  packageName: string | undefined,
  workspaceRoot: string,
): { manifest: PackageManifest; dir: string; name?: string } {
  const rootManifest = readManifest(join(workspaceRoot, 'package.json'));
  if (packageName === undefined) {
    return { manifest: rootManifest, dir: workspaceRoot };
  }
  if (!/^[A-Za-z0-9@._/-]+$/.test(packageName) || packageName.startsWith('-')) {
    throw new Error('packageName must identify a repository package, not a command or path expression.');
  }
  if (packageName === rootManifest.name) return { manifest: rootManifest, dir: workspaceRoot, name: rootManifest.name };
  const member = listAll().find((candidate) => candidate.name === packageName || candidate.relativeDir === packageName);
  if (!member) throw new Error(`Package "${packageName}" is not a known workspace package.`);
  const details = readMemberDetails(member);
  return { manifest: details.manifest, dir: member.dir, name: member.name };
}

function resolveWorkflowCommand(
  script: 'build' | 'test',
  packageName: string | undefined,
  workspaceRoot: string,
): WorkflowCommand {
  const target = packageForName(packageName, workspaceRoot);
  if (!target.manifest.scripts || typeof target.manifest.scripts[script] !== 'string') {
    throw new Error(
      `${packageName ? `Package "${packageName}"` : 'The repository'} does not define a ${script} script.`,
    );
  }
  const args = target.name ? ['--filter', target.name, 'run', script] : ['run', script];
  return {
    executable: WORKFLOW_EXECUTABLE,
    args,
    cwd: workspaceRoot,
    workspaceRoot,
    ...(target.name ? { packageName: target.name } : {}),
    script,
  };
}

function appendOutput(
  current: Buffer<ArrayBufferLike>,
  chunk: Buffer | string,
  remaining: { value: number },
  truncated: { value: boolean },
): Buffer<ArrayBufferLike> {
  const input = Buffer.from(chunk);
  if (input.length > remaining.value) {
    truncated.value = true;
    const kept = input.subarray(0, Math.max(remaining.value, 0));
    remaining.value = 0;
    return Buffer.concat([current, kept]);
  }
  remaining.value -= input.length;
  return Buffer.concat([current, input]);
}

/**
 * Determines the workflow terminal status from execution indicators.
 */
function resolveWorkflowStatus(
  timedOut: boolean,
  cancelled: boolean,
  spawnError: Error | undefined,
  code: number | null,
): LspWorkflowStatus {
  if (timedOut) return 'timed-out';
  if (cancelled) return 'cancelled';
  if (spawnError) return 'spawn-error';
  return code === 0 ? 'passed' : 'failed';
}

const DEFAULT_STATUS_MESSAGES: Partial<Record<LspWorkflowStatus, string>> = {
  cancelled: 'Workflow was cancelled.',
  passed: 'Workflow completed successfully.',
};

/**
 * Builds the workflow summary message.
 */
function resolveWorkflowMessage(
  status: LspWorkflowStatus,
  spawnError: Error | undefined,
  code: number | null,
  timeoutMs: number,
): string {
  if (spawnError) return spawnError.message;
  if (status === 'timed-out') return `Workflow timed out after ${timeoutMs} ms.`;
  return DEFAULT_STATUS_MESSAGES[status] ?? `Workflow exited with code ${code ?? 'unknown'}.`;
}

/** Execute only a command resolved from a repository script, never an arbitrary shell string. */
export function runBoundedWorkflowProcess(
  command: WorkflowCommand,
  options: { readonly timeoutMs?: number; readonly maxOutputBytes?: number; readonly signal?: AbortSignal } = {},
): Promise<WorkflowProcessResult> {
  if (command.executable !== WORKFLOW_EXECUTABLE) throw new Error('Workflow executable is not allowlisted.');
  const workspaceRoot = resolve(command.workspaceRoot);
  const cwd = resolve(command.cwd);
  const cwdRelative = relative(workspaceRoot, cwd);
  if (cwdRelative.startsWith('..') || resolve(workspaceRoot, cwdRelative) !== cwd) {
    throw new Error('Workflow cwd must remain inside the repository root.');
  }
  const timeoutMs = boundedTimeout(options.timeoutMs);
  const maxOutputBytes = boundedOutput(options.maxOutputBytes);
  const startedAt = Date.now();

  return new Promise((resolveResult) => {
    let child: ChildProcessByStdio<null, Readable, Readable>;
    try {
      child = spawn(command.executable, [...command.args], {
        cwd,
        shell: false,
        detached: process.platform !== 'win32',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      resolveResult({
        status: 'spawn-error',
        exitCode: null,
        signal: null,
        timedOut: false,
        cancelled: false,
        stdout: '',
        stderr: '',
        outputTruncated: false,
        durationMs: Date.now() - startedAt,
        message: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    let stdout: Buffer<ArrayBufferLike> = Buffer.alloc(0);
    let stderr: Buffer<ArrayBufferLike> = Buffer.alloc(0);
    const remaining = { value: maxOutputBytes };
    const outputTruncated = { value: false };
    let timedOut = false;
    let cancelled = false;
    let spawnError: Error | undefined;
    let killTimer: NodeJS.Timeout | undefined;
    let timeoutTimer: NodeJS.Timeout | undefined;
    let settled = false;
    let terminating = false;

    /**
     * Terminates the child process group or individual process with the given signal.
     */
    function killProcessGroup(signal: NodeJS.Signals): void {
      try {
        if (child.pid && process.platform !== 'win32') process.kill(-child.pid, signal);
        else child.kill(signal);
      } catch {
        child.kill(signal);
      }
    }

    /**
     * Terminates the spawned workflow process group and schedules force-kill escalation.
     */
    function terminate(reason: 'timeout' | 'cancel'): void {
      if (terminating) return;
      terminating = true;
      if (reason === 'timeout') timedOut = true;
      else cancelled = true;
      killProcessGroup('SIGTERM');
      killTimer = setTimeout(() => {
        killProcessGroup('SIGKILL');
        child.stdout.destroy();
        child.stderr.destroy();
      }, FORCE_KILL_DELAY_MS);
    }

    /**
     * Handles cancellation abort signals from the caller.
     */
    function onAbort(): void {
      terminate('cancel');
    }

    if (options.signal?.aborted) {
      terminate('cancel');
    } else {
      options.signal?.addEventListener('abort', onAbort, { once: true });
    }
    timeoutTimer = setTimeout(() => terminate('timeout'), timeoutMs);
    child.stdout.on('data', (chunk: Buffer | string) => {
      stdout = appendOutput(stdout, chunk, remaining, outputTruncated);
    });
    child.stderr.on('data', (chunk: Buffer | string) => {
      stderr = appendOutput(stderr, chunk, remaining, outputTruncated);
    });
    child.once('error', (error) => {
      spawnError = error;
    });

    /**
     * Settles the workflow result promise once the process exits or closes.
     */
    function finish(code: number | null, signal: string | null): void {
      if (settled) return;
      settled = true;
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (!terminating && killTimer) clearTimeout(killTimer);
      options.signal?.removeEventListener('abort', onAbort);
      const status = resolveWorkflowStatus(timedOut, cancelled, spawnError, code);
      resolveResult({
        status,
        exitCode: code,
        signal,
        timedOut,
        cancelled,
        stdout: stdout.toString('utf8'),
        stderr: stderr.toString('utf8'),
        outputTruncated: outputTruncated.value,
        durationMs: Date.now() - startedAt,
        message: resolveWorkflowMessage(status, spawnError, code, timeoutMs),
      });
    }

    child.once('exit', (code, signal) => {
      if (timedOut || cancelled) {
        child.stdout.destroy();
        child.stderr.destroy();
        finish(code, signal);
      }
    });
    child.once('close', (code, signal) => {
      finish(code, signal);
    });
  });
}

async function runWorkflow(
  operation: 'lsp_run_build' | 'lsp_run_tests',
  script: 'build' | 'test',
  request: LspWorkflowRequest,
): Promise<LspWorkflowCommandResult> {
  const session = await getLspRequestSession(request.sessionId, request.languageId);
  const command = resolveWorkflowCommand(script, request.packageName, session.workspaceRoot);
  const result = await runBoundedWorkflowProcess(command, request);
  return {
    supported: true,
    operation,
    sessionId: session.sessionId,
    languageId: session.languageId,
    workspaceRoot: session.workspaceRoot,
    ...(command.packageName ? { packageName: command.packageName } : {}),
    script,
    command: [command.executable, ...command.args],
    cwd: command.cwd,
    ...result,
    success: result.status === 'passed',
  };
}

export function runLspBuild(request: LspWorkflowRequest = {}): Promise<LspWorkflowCommandResult> {
  return runWorkflow('lsp_run_build', 'build', request);
}

export function runLspTests(request: LspWorkflowRequest = {}): Promise<LspWorkflowCommandResult> {
  return runWorkflow('lsp_run_tests', 'test', request);
}

function nearestPackageRoot(filePath: string, workspaceRoot: string): string {
  let current = dirname(filePath);
  while (current.startsWith(workspaceRoot) && current !== dirname(current)) {
    if (existsSync(join(current, 'package.json'))) return current;
    current = dirname(current);
  }
  return workspaceRoot;
}

function isWithin(root: string, target: string): boolean {
  const pathRelative = relative(root, target);
  return pathRelative === '' || (!pathRelative.startsWith('..') && !isAbsolute(pathRelative));
}

function collectCandidateFiles(root: string): string[] {
  const files: string[] = [];
  const skipped = new Set(['.git', '.turbo', 'coverage', 'dist', 'node_modules', 'target', 'vendor']);
  const visit = (directory: string): void => {
    if (files.length >= MAX_SCAN_FILES) return;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink() || skipped.has(entry.name)) continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile()) files.push(path);
      if (files.length >= MAX_SCAN_FILES) return;
    }
  };
  visit(root);
  return files;
}

function relatedTest(filePath: string, candidate: string, sourceBase: string): LspRelatedTest | undefined {
  if (candidate === filePath) return undefined;
  const candidateName = basename(candidate).toLowerCase();
  const source = sourceBase.toLowerCase();
  const isTestName = /(?:^|[._-])(test|spec)(?:[._-]|$)/.test(candidateName);
  if (!isTestName) return undefined;
  let score = 20;
  let reason = 'test file in the same package';
  if (candidateName.includes(`${source}.`)) {
    score += 60;
    reason = 'test filename matches the source basename';
  } else if (candidateName.includes(source)) {
    score += 35;
    reason = 'test filename contains the source basename';
  }
  const pathLower = candidate.toLowerCase();
  if (pathLower.includes('/test/') || pathLower.includes('/tests/') || pathLower.includes('/__tests__/')) score += 10;
  try {
    if (statSync(candidate).size <= MAX_TEST_FILE_BYTES) {
      const contents = readFileSync(candidate, 'utf8');
      if (contents.includes(basename(filePath))) {
        score += 25;
        reason = 'test references the source filename';
      }
    }
  } catch {
    return undefined;
  }
  return { filePath: candidate, score, reason };
}

export async function getLspTestsForFile(request: LspTestsForFileRequest): Promise<LspTestsForFileResult> {
  const session = await getLspRequestSession(request.sessionId, request.languageId);
  const filePath = resolveRepoPath(request.filePath, 'test correlation source file');
  if (!statSync(filePath).isFile()) throw new Error('filePath must refer to a file.');
  const packageRoot = request.packageName
    ? packageForName(request.packageName, session.workspaceRoot).dir
    : nearestPackageRoot(filePath, session.workspaceRoot);
  if (!isWithin(packageRoot, filePath)) {
    throw new Error(`filePath must remain inside the selected package (${request.packageName}).`);
  }
  const sourceBase = basename(filePath, extname(filePath));
  const tests = collectCandidateFiles(packageRoot)
    .map((candidate) => relatedTest(filePath, candidate, sourceBase))
    .filter((candidate): candidate is LspRelatedTest => candidate !== undefined)
    .sort((left, right) => right.score - left.score || left.filePath.localeCompare(right.filePath))
    .slice(0, boundedLimit(request.limit))
    .map((test) => ({ ...test, filePath: relative(session.workspaceRoot, test.filePath).replaceAll('\\', '/') }));
  return {
    supported: true,
    sessionId: session.sessionId,
    languageId: session.languageId,
    filePath: relative(session.workspaceRoot, filePath).replaceAll('\\', '/'),
    packageRoot: relative(session.workspaceRoot, packageRoot).replaceAll('\\', '/') || '.',
    tests,
    message: tests.length > 0 ? `Found ${tests.length} related test file(s).` : 'No related test files were found.',
  };
}
