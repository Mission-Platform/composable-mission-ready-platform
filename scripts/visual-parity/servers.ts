import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';

import { createProcessRegistry, terminateProcessTree } from '../runtime-validation/cleanup.ts';
import { parseStorybookIndex } from '../runtime-validation/storybook-index.ts';

import {
  createRendererDefinitions,
  type StorybookRendererServer,
  type StorybookRendererServers,
  type VisualParityRendererDefinition,
  type VisualParityServerOptions,
} from './types.ts';

import type { StorybookIndex } from '../runtime-validation/types.ts';

const STORYBOOK_PACKAGE = '@mission-platform/storybook';
const CERTIFICATE_DIRECTORY = path.join('apps', 'storybook', '.storybook', 'certs');
const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_CLEANUP_GRACE_MS = 250;

interface CommandResult {
  output: string;
  error?: string;
}

interface ProcessLike {
  exitCode: number | null;
  stdout?: { on(event: 'data', listener: (chunk: Buffer) => void): void };
  stderr?: { on(event: 'data', listener: (chunk: Buffer) => void): void };
  on(event: 'error', listener: (error: Error) => void): void;
  on(event: 'close', listener: (code: number | null, signal: NodeJS.Signals | null) => void): void;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? (error.stack ?? error.message) : String(error);
}

function certificatePaths(repositoryRoot: string): { certificate: string; key: string } {
  const directory = path.join(repositoryRoot, CERTIFICATE_DIRECTORY);
  return { certificate: path.join(directory, 'cert.pem'), key: path.join(directory, 'key.pem') };
}

function serverLogPath(repositoryRoot: string, framework: string): string {
  return path.join(repositoryRoot, '.artifacts', 'visual-parity', 'servers', `${framework}.log`);
}

export function buildStorybookDevSpawnArgs(
  certificate: { certificate: string; key: string },
  definition: VisualParityRendererDefinition,
): string[] {
  return [
    '--host',
    definition.host,
    '--port',
    String(definition.port),
    '--exact-port',
    '--https',
    '--ssl-cert',
    certificate.certificate,
    '--ssl-key',
    certificate.key,
    '--ci',
    '--no-open',
  ];
}

function writeLog(target: string, content: string): void {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function runCertificate(repositoryRoot: string, timeoutMs: number): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = spawn('pnpm', ['--filter', STORYBOOK_PACKAGE, 'run', 'storybook:cert'], {
      cwd: repositoryRoot,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    }) as unknown as ProcessLike;
    let output = '';
    let settled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const finish = (result: CommandResult): void => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      resolve(result);
    };
    child.stdout?.on('data', (chunk: Buffer) => (output += chunk.toString()));
    child.stderr?.on('data', (chunk: Buffer) => (output += chunk.toString()));
    child.on('error', (error: Error) => finish({ output, error: errorMessage(error) }));
    child.on('close', (code: number | null, signal: NodeJS.Signals | null) =>
      finish({
        output,
        error:
          code === 0 ? undefined : `Certificate command exited with ${signal ? `signal ${signal}` : `code ${code}`}`,
      }),
    );
    timeout = setTimeout(() => {
      void terminateProcessTree(child as unknown as ChildProcess, { graceMs: DEFAULT_CLEANUP_GRACE_MS }).then(() =>
        finish({ output, error: `Certificate command timed out after ${timeoutMs}ms.` }),
      );
    }, timeoutMs);
  });
}

export async function generateSharedStorybookCertificate(
  repositoryRoot: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<{ output: string; certificate: string; key: string }> {
  const result = await runCertificate(repositoryRoot, timeoutMs);
  const paths = certificatePaths(repositoryRoot);
  writeLog(path.join(repositoryRoot, '.artifacts', 'visual-parity', 'servers', 'certificate.log'), result.output);
  if (result.error) throw new Error(`${result.error}\n${result.output}`.trim());
  if (!fs.existsSync(paths.certificate) || !fs.existsSync(paths.key))
    throw new Error(`Storybook certificate command completed without creating ${paths.certificate} and ${paths.key}.`);
  return { output: result.output, ...paths };
}

function fetchStorybookIndex(url: string): Promise<StorybookIndex> {
  return new Promise((resolve, reject) => {
    const request = https.get(`${url}/index.json`, { rejectUnauthorized: false }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk: string) => (body += chunk));
      response.once('end', () => {
        if (response.statusCode !== 200) {
          reject(new Error(`Storybook index returned HTTP ${response.statusCode ?? 'unknown'} at ${url}/index.json.`));
          return;
        }
        try {
          resolve(parseStorybookIndex(JSON.parse(body), `${url}/index.json`));
        } catch (error) {
          reject(error);
        }
      });
    });
    request.once('error', reject);
    request.setTimeout(1000, () => request.destroy(new Error('Storybook index request timed out.')));
  });
}

async function waitForStorybookIndex(
  child: ChildProcess,
  url: string,
  getOutput: () => string,
  getSpawnError: () => Error | undefined,
  timeoutMs: number,
): Promise<StorybookIndex> {
  const deadline = Date.now() + timeoutMs;
  let lastError = 'No response received.';
  while (Date.now() < deadline) {
    const startupError = getSpawnError();
    if (startupError) throw new Error(`Could not start Storybook at ${url}: ${startupError.message}`);
    if (child.exitCode !== null)
      throw new Error(`Storybook exited before becoming ready at ${url}: ${getOutput()}`.trim());
    try {
      return await fetchStorybookIndex(url);
    } catch (error) {
      lastError = errorMessage(error);
      await new Promise<void>((resolve) => setTimeout(resolve, 150));
    }
  }
  throw new Error(`Storybook did not expose index.json at ${url} within ${timeoutMs}ms: ${lastError}`);
}

async function launchServer(
  repositoryRoot: string,
  definition: VisualParityRendererDefinition,
  certificate: { certificate: string; key: string },
  timeoutMs: number,
  cleanupGraceMs: number,
  registry: ReturnType<typeof createProcessRegistry>,
): Promise<StorybookRendererServer> {
  const child = spawn(
    'pnpm',
    ['--filter', STORYBOOK_PACKAGE, 'exec', 'storybook', 'dev', ...buildStorybookDevSpawnArgs(certificate, definition)],
    {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        ...definition.environment,
        STORYBOOK_VITE_CACHE_DIR: path.join(
          repositoryRoot,
          '.artifacts',
          'visual-parity',
          'vite-cache',
          definition.framework,
        ),
        NODE_OPTIONS: process.env.NODE_OPTIONS ?? '--max-old-space-size=8192',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    },
  ) as unknown as ProcessLike;
  let output = '';
  let spawnError: Error | undefined;
  let closed = false;
  child.stdout?.on('data', (chunk: Buffer) => (output += chunk.toString()));
  child.stderr?.on('data', (chunk: Buffer) => (output += chunk.toString()));
  child.on('error', (error: Error) => (spawnError = error));
  registry.add(child as never);
  const getOutput = (): string => output;
  const logPath = serverLogPath(repositoryRoot, definition.framework);
  const close = async (): Promise<void> => {
    if (closed) return;
    closed = true;
    registry.remove(child as unknown as ChildProcess);
    try {
      await terminateProcessTree(child as never, { graceMs: cleanupGraceMs });
    } finally {
      writeLog(logPath, output);
    }
  };
  try {
    const index = await waitForStorybookIndex(
      child as unknown as ChildProcess,
      definition.url,
      getOutput,
      () => spawnError,
      timeoutMs,
    );
    return { definition, index, logPath, getOutput, close };
  } catch (error) {
    await close();
    throw new Error(`${errorMessage(error)}\nServer log: ${logPath}`.trim());
  }
}

export async function startStorybookServers(
  repositoryRoot: string,
  options: VisualParityServerOptions = {},
): Promise<StorybookRendererServers> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const cleanupGraceMs = options.cleanupGraceMs ?? DEFAULT_CLEANUP_GRACE_MS;
  const certificateResult = await generateSharedStorybookCertificate(repositoryRoot, timeoutMs);
  const registry = createProcessRegistry({ graceMs: cleanupGraceMs });
  const definitions = createRendererDefinitions(options);
  const running: Partial<Record<VisualParityRendererDefinition['framework'], StorybookRendererServer>> = {};
  try {
    const servers: StorybookRendererServer[] = [];
    for (const definition of definitions) {
      const server = await launchServer(
        repositoryRoot,
        definition,
        certificateResult,
        timeoutMs,
        cleanupGraceMs,
        registry,
      );
      running[definition.framework] = server;
      servers.push(server);
    }
    const byFramework = Object.fromEntries(
      servers.map((server) => [server.definition.framework, server]),
    ) as StorybookRendererServers['servers'];
    let closed = false;
    const close = async (): Promise<void> => {
      if (closed) return;
      closed = true;
      const results = await Promise.allSettled(servers.map((server) => server.close()));
      await registry.cleanup();
      const failure = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
      if (failure) throw failure.reason;
    };
    return { certificateOutput: certificateResult.output, servers: byFramework, close };
  } catch (error) {
    try {
      await registry.cleanup();
    } finally {
      for (const server of Object.values(running)) {
        if (server) writeLog(server.logPath, server.getOutput());
      }
    }
    throw error;
  }
}

export async function withStorybookServers<T>(
  repositoryRoot: string,
  options: VisualParityServerOptions,
  callback: (servers: StorybookRendererServers) => Promise<T>,
): Promise<T> {
  const servers = await startStorybookServers(repositoryRoot, options);
  try {
    return await callback(servers);
  } finally {
    await servers.close();
  }
}
