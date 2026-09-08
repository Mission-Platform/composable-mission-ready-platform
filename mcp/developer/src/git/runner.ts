import { spawnSync } from 'node:child_process';

import { findRepoRoot } from '@mission-platform/mcp-shared/repo/paths';

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_TIMEOUT_MS = 120_000;
const DEFAULT_OUTPUT_BYTES = 128 * 1024;
const MAX_OUTPUT_BYTES = 1024 * 1024;

export interface GitCommandOptions {
  readonly timeoutMs?: number;
  readonly maxOutputBytes?: number;
}

export interface GitCommandResult {
  readonly operation: string;
  readonly workspaceRoot: string;
  readonly command: readonly string[];
  readonly exitCode: number | null;
  readonly signal: string | null;
  readonly timedOut: boolean;
  readonly stdout: string;
  readonly stderr: string;
  readonly outputTruncated: boolean;
  readonly success: boolean;
  readonly message: string;
}

export interface GitCommandInputOptions extends GitCommandOptions {
  readonly input?: string;
}

export function boundedTimeout(value: number | undefined): number {
  const timeout = Math.trunc(value ?? DEFAULT_TIMEOUT_MS);
  if (!Number.isInteger(timeout) || timeout < 10 || timeout > MAX_TIMEOUT_MS) {
    throw new Error(`timeoutMs must be an integer between 10 and ${MAX_TIMEOUT_MS}.`);
  }
  return timeout;
}

export function boundedOutput(value: number | undefined): number {
  const output = Math.trunc(value ?? DEFAULT_OUTPUT_BYTES);
  if (!Number.isInteger(output) || output < 1 || output > MAX_OUTPUT_BYTES) {
    throw new Error(`maxOutputBytes must be an integer between 1 and ${MAX_OUTPUT_BYTES}.`);
  }
  return output;
}

function trimOutput(value: string, limit: number): { value: string; truncated: boolean } {
  if (Buffer.byteLength(value, 'utf8') <= limit) return { value, truncated: false };
  const bytes = Buffer.from(value, 'utf8').subarray(0, limit);
  return { value: bytes.toString('utf8'), truncated: true };
}

export function runGit(
  operation: string,
  args: readonly string[],
  options: GitCommandInputOptions = {},
): GitCommandResult {
  const workspaceRoot = findRepoRoot();
  const timeoutMs = boundedTimeout(options.timeoutMs);
  const maxOutputBytes = boundedOutput(options.maxOutputBytes);
  const result = spawnSync('git', args, {
    cwd: workspaceRoot,
    encoding: 'utf8',
    shell: false,
    timeout: timeoutMs,
    maxBuffer: maxOutputBytes,
    input: options.input,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const stdout = trimOutput(typeof result.stdout === 'string' ? result.stdout : '', maxOutputBytes);
  const stderr = trimOutput(typeof result.stderr === 'string' ? result.stderr : '', maxOutputBytes);
  const errorCode = (result.error as NodeJS.ErrnoException | undefined)?.code;
  const timedOut = errorCode === 'ETIMEDOUT';
  const outputTruncated = stdout.truncated || stderr.truncated || errorCode === 'ENOBUFS';
  const success = result.status === 0 && !result.error;
  return {
    operation,
    workspaceRoot,
    command: ['git', ...args],
    exitCode: result.status,
    signal: result.signal,
    timedOut,
    stdout: stdout.value,
    stderr: stderr.value,
    outputTruncated,
    success,
    message: timedOut
      ? `Git ${operation} timed out after ${timeoutMs} ms.`
      : success
        ? `Git ${operation} completed successfully.`
        : `Git ${operation} exited with code ${result.status ?? 'unknown'}.`,
  };
}
