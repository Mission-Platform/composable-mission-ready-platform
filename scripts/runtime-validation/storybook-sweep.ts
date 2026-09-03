import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

import { classifyFailure } from './classification.ts';
import { terminateProcessTree } from './cleanup.ts';
import { artifactPath } from './paths.ts';
import { withRetry } from './retry.ts';
import { compareStorybookIndex, normalizeImportPath, readStorybookIndex } from './storybook-index.ts';
import { workstreamForPackage } from './workstreams.ts';

import type { RepositoryInventory, RuntimeResult, StorybookFramework, StorybookIndexEntry } from './types.ts';

interface PipedProcess {
  pid?: number;
  stdout: { on(event: 'data', listener: (chunk: Buffer) => void): void };
  stderr: { on(event: 'data', listener: (chunk: Buffer) => void): void };
  stdin: { end(input: string): void };
  kill(signal?: NodeJS.Signals): boolean;
  on(event: 'error', listener: (error: Error) => void): void;
  on(event: 'close', listener: (code: number | null, signal: string | null) => void): void;
}

export interface StorybookSweepOptions {
  framework: StorybookFramework;
  packageName?: string;
  storyId?: string;
  port?: number;
  build?: boolean;
  browser?: boolean;
  maxStories?: number;
  workers?: number;
  timeoutMs?: number;
}

interface EgoStoryResult {
  id: string;
  status: RuntimeResult['status'];
  category: string;
  message?: string;
  evidence?: RuntimeResult['evidence'];
  attempts?: number;
}

interface StaticServer {
  url: string;
  close: () => Promise<void>;
}

const MAX_CHILD_LOG_CHARS = 256 * 1024;
const LOG_TRUNCATION_MARKER = '\n...[child output truncated]...\n';

function appendBounded(current: string, chunk: string): string {
  const combined = current + chunk;
  if (combined.length <= MAX_CHILD_LOG_CHARS) return combined;
  return LOG_TRUNCATION_MARKER + combined.slice(-MAX_CHILD_LOG_CHARS + LOG_TRUNCATION_MARKER.length);
}

const MIME_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? (error.stack ?? error.message) : String(error);
}

function writeLog(repositoryRoot: string, id: string, content: string): string {
  const target = artifactPath(repositoryRoot, 'manifest', id, 'log');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
  return target;
}

function egoFailureEvidence(repositoryRoot: string, framework: string, id: string, message: string): string {
  const target = artifactPath(repositoryRoot, 'story', `${framework}-${id}-runner`, 'log');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${message}\n`);
  return target;
}

async function runBuild(
  repositoryRoot: string,
  framework: StorybookFramework,
): Promise<{ ok: true; log: string } | { ok: false; log: string; error: string }> {
  return new Promise((resolve) => {
    const child = spawn('pnpm', [`build-storybook:${framework}`], {
      cwd: repositoryRoot,
      env: { ...process.env, STORYBOOK_FRAMEWORK: framework },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    }) as unknown as PipedProcess;
    let output = '';
    let settled = false;
    let terminating = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const finish = (result: { ok: true; log: string } | { ok: false; log: string; error: string }): void => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      resolve(result);
    };
    timeout = setTimeout(() => {
      terminating = true;
      void terminateProcessTree(child, { graceMs: 250 }).then(() =>
        finish({
          ok: false,
          log: output,
          error: `Storybook ${framework} build timed out after 120000ms`,
        }),
      );
    }, 120_000);
    const append = (chunk: Buffer): void => {
      output = appendBounded(output, chunk.toString());
    };
    child.stdout.on('data', append);
    child.stderr.on('data', append);
    child.on('error', (error) => {
      if (!terminating) finish({ ok: false, log: output, error: errorMessage(error) });
    });
    child.on('close', (code, signal) => {
      if (terminating) return;
      const log = output || `build exited with code=${code ?? 'null'} signal=${signal ?? 'null'}`;
      if (code === 0) finish({ ok: true, log });
      else
        finish({
          ok: false,
          log,
          error: `Storybook ${framework} build exited with code=${code ?? 'null'} signal=${signal ?? 'null'}`,
        });
    });
  });
}

export async function startStaticServer(root: string, requestedPort = 0): Promise<StaticServer> {
  const realRoot = fs.realpathSync(root);
  const server = http.createServer((request, response) => {
    try {
      const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
      const requestedPath = decodeURIComponent(requestUrl.pathname);
      if (requestedPath === '/favicon.ico') {
        response.writeHead(204).end();
        return;
      }
      const candidate = path.resolve(realRoot, `.${requestedPath}`);
      if (!candidate.startsWith(`${realRoot}${path.sep}`) && candidate !== realRoot) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      const filePath = candidate === realRoot ? path.join(realRoot, 'index.html') : candidate;
      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        response.writeHead(404).end('Not found');
        return;
      }
      let realFilePath: string;
      try {
        realFilePath = fs.realpathSync(filePath);
      } catch {
        response.writeHead(404).end('Not found');
        return;
      }
      if (!realFilePath.startsWith(`${realRoot}${path.sep}`) && realFilePath !== realRoot) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      response.writeHead(200, {
        'content-type': MIME_TYPES[path.extname(realFilePath).toLowerCase()] ?? 'application/octet-stream',
      });
      fs.createReadStream(realFilePath).pipe(response);
    } catch (error) {
      response.writeHead(500).end(errorMessage(error));
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(requestedPort, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Storybook static server did not expose a TCP address');
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}

export function egoScript(
  stories: Array<{ id: string }>,
  baseUrl: string,
  repositoryRoot: string,
  taskName = 'storybook renderer sweep',
  artifactPrefix = 'storybook',
): string {
  const serializedStories = JSON.stringify(stories);
  const serializedBaseUrl = JSON.stringify(baseUrl);
  const serializedRoot = JSON.stringify(repositoryRoot);
  const errorSource = JSON.stringify(`
    (() => {
      const errors = (window.__runtimeValidationErrors ||= []);
      window.addEventListener('error', (event) => errors.push('page: ' + (event.error?.stack || event.message)));
      window.addEventListener('unhandledrejection', (event) => errors.push('unhandled-rejection: ' + String(event.reason)));
    })();
  `);
  return String.raw`
(async () => {
const fs = await import('node:fs');
const path = await import('node:path');
const stories = ${serializedStories};
const baseUrl = ${serializedBaseUrl};
const repositoryRoot = ${serializedRoot};
const artifactPrefix = ${JSON.stringify(artifactPrefix)};
const task = await useOrCreateTaskSpace(${JSON.stringify(taskName)});
await cdp('Runtime.enable');
await cdp('Log.enable');
await cdp('Network.enable');
await cdp('Page.enable');
await cdp('Page.addScriptToEvaluateOnNewDocument', { source: ${errorSource} });
const sleep = (seconds) => wait(seconds);
const artifact = (id, extension) => {
  const safe = id.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^\.+/, '_').slice(0, 180) || 'item';
  const target = path.join(repositoryRoot, '.artifacts/runtime-validation/story', artifactPrefix, safe + '.' + extension);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  return target;
};
const collectErrors = (events) => events.flatMap((event) => {
  if (event.method === 'Log.entryAdded' && event.params.entry?.level === 'error') return ['console: ' + (event.params.entry.text ?? '')];
  if (event.method === 'Runtime.consoleAPICalled' && ['error', 'assert'].includes(event.params.type)) return ['console: ' + event.params.args.map((arg) => arg.value ?? arg.description ?? '').join(' ')];
  if (event.method === 'Runtime.exceptionThrown') return ['exception: ' + (event.params.exceptionDetails?.text ?? '')];
  if (event.method === 'Network.loadingFailed') return ['network: ' + (event.params.errorText ?? event.params.type ?? 'request failed')];
  if (event.method === 'Network.responseReceived' && event.params.response?.status >= 400) return ['network: HTTP ' + event.params.response.status + ' ' + event.params.response.url];
  return [];
});
const transient = (result) => /timeout|timed out|econnreset|connection refused|net::err|502|503|504/i.test(result.message || '');
const readStoryState = async () => await js("(() => { const root = document.querySelector('#storybook-root'); return { root: Boolean(root), children: root?.childElementCount ?? 0, text: root?.textContent?.trim() ?? '' }; })()");
const waitForStoryContent = async () => {
  let state = await readStoryState();
  for (let attempt = 0; attempt < 10 && state.root && !state.children && !state.text; attempt += 1) {
    await sleep(0.2);
    state = await readStoryState();
  }
  return state;
};
const saveEvidence = async (story, result, state, errors) => {
  const log = artifact(story.id, 'log');
  fs.writeFileSync(log, JSON.stringify({ story, state, errors, attempts: result.attempts }, null, 2) + '\n');
  result.evidence = { log };
  try {
    const screenshot = await cdp('Page.captureScreenshot', { format: 'png' });
    const screenshotPath = artifact(story.id, 'png');
    fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'));
    result.evidence.screenshot = screenshotPath;
  } catch (screenshotError) {
    result.message = (result.message || '') + '\nScreenshot failed: ' + String(screenshotError);
  }
};
const checkAttempt = async (story, attempt) => {
  const result = { id: story.id };
  let state = { root: false, children: 0, text: '' };
  let errors = [];
  try {
    await drainEvents();
    await gotoAndWait(baseUrl + '/iframe.html?id=' + encodeURIComponent(story.id), { timeout: 8, settle: 0.25 });
    await waitForElement('#storybook-root', { timeout: 5 });
    state = await waitForStoryContent();
    const pageErrors = await js("(() => { const errors = window.__runtimeValidationErrors || []; window.__runtimeValidationErrors = []; return errors; })()");
    errors = collectErrors(await drainEvents()).concat(pageErrors);
    const errorMessage = errors.length > 0 ? ('\\nCaptured errors:\\n' + errors.join('\\n')) : '';

    if (!state.root) {
      result.status = 'runtime-failure'; result.category = 'missing-story-root'; result.message = 'Storybook root element was not created.' + errorMessage;
    } else if (!state.children && !state.text) {
      result.status = 'runtime-failure'; result.category = 'empty-story-root'; result.message = 'Storybook root rendered no content.' + errorMessage;
    } else if (errors.length) {
      const interactionError = errors.some((error) => /play function|interaction|expect\(/i.test(error));
      const networkErrors = errors.filter((error) => error.startsWith('network:'));
      const isExternalNetworkError = networkErrors.every((error) => /ERR_BLOCKED_BY_ORB|ERR_ABORTED|ERR_BLOCKED/i.test(error));
      const isOnlyNetworkError = networkErrors.length === errors.length;

      if (isExternalNetworkError && isOnlyNetworkError) {
        result.status = 'blocked';
        result.category = 'network-blocked';
        result.message = errors.join('\n');
      } else {
        result.status = interactionError ? 'interaction-failure' : 'runtime-failure';
        result.category = interactionError ? 'interaction' : (networkErrors.length > 0 ? 'network' : 'browser-console');
        result.message = errors.join('\n');
      }
    } else {
      result.status = 'pass'; result.category = 'render-and-play';
    }
    result.attempts = attempt;
  } catch (error) {
    result.status = /permission|browser executable|sandbox|not installed|missing dependency/i.test(String(error)) ? 'blocked' : 'runtime-failure';
    result.category = result.status === 'blocked' ? 'environment' : 'navigation';
    result.message = String(error);
    result.attempts = attempt;
  }
  if (result.status !== 'pass') await saveEvidence(story, result, state, errors);
  return result;
};
const check = async (story) => {
  let result;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    result = await checkAttempt(story, attempt);
    if (result.status === 'pass' || attempt === 2 || !transient(result)) break;
    await sleep(0.5);
  }
  cliLog(JSON.stringify({ kind: 'result', result }));
  return result;
};
for (const story of stories) await check(story);
cliLog(JSON.stringify({ kind: 'done', count: stories.length }));
await completeTaskSpace(task.id, { keep: false });
})();
`;
}

async function runEgoChecks(
  repositoryRoot: string,
  baseUrl: string,
  entries: StorybookIndexEntry[],
  taskName: string,
  artifactPrefix: string,
  timeoutMs: number,
): Promise<EgoStoryResult[]> {
  if (entries.length === 0) return [];
  return new Promise((resolve) => {
    const child = spawn('ego-browser', ['nodejs'], {
      cwd: repositoryRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: true,
    }) as unknown as PipedProcess;
    const results: EgoStoryResult[] = [];
    let pending = '';
    let diagnostics = '';
    let settled = false;
    let timedOut = false;
    let terminating = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      terminating = true;
      diagnostics = appendBounded(diagnostics, `Ego Lite timed out after ${timeoutMs}ms`);
      void terminateProcessTree(child, { graceMs: 250 }).then(() => {
        if (settled) return;
        const message = diagnostics || `Ego Lite timed out after ${timeoutMs}ms`;
        finish(
          entries.map((entry) => ({
            id: entry.id,
            ...classifyFailure('environment', new Error(message)),
            message,
            evidence: { log: egoFailureEvidence(repositoryRoot, artifactPrefix, entry.id, message) },
          })),
        );
      });
    }, timeoutMs);
    const finish = (value: EgoStoryResult[]): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(value);
    };
    const parseOutput = (chunk: Buffer): void => {
      const text = chunk.toString();
      pending = appendBounded(pending, text);
      for (const line of pending.split('\n').slice(0, -1)) {
        try {
          const message = JSON.parse(line) as { kind?: string; result?: EgoStoryResult };
          if (message.kind === 'result' && message.result) results.push(message.result);
        } catch {
          // ego-browser may emit non-JSON diagnostic lines; stderr is retained below.
        }
      }
      pending = pending.split('\n').at(-1) ?? '';
    };
    const appendDiagnostics = (chunk: Buffer): void => {
      const text = chunk.toString();
      diagnostics = appendBounded(diagnostics, text);
      parseOutput(chunk);
    };
    child.stdout.on('data', parseOutput);
    child.stderr.on('data', appendDiagnostics);
    child.on('error', (error) => {
      if (terminating) return;
      const message = errorMessage(error);
      finish(
        entries.map((entry) => ({
          id: entry.id,
          ...classifyFailure('environment', new Error(message)),
          message,
          evidence: { log: egoFailureEvidence(repositoryRoot, artifactPrefix, entry.id, message) },
        })),
      );
    });
    child.on('close', (code) => {
      if (terminating) return;
      if (code !== 0 && results.length === 0) {
        const message = timedOut ? diagnostics : diagnostics || `ego-browser exited with code ${code ?? 'null'}`;
        finish(
          entries.map((entry) => ({
            id: entry.id,
            ...classifyFailure('environment', new Error(message)),
            message,
            evidence: { log: egoFailureEvidence(repositoryRoot, artifactPrefix, entry.id, message) },
          })),
        );
      } else if (results.length === 0) {
        const message = diagnostics || 'ego-browser completed without returning story results';
        finish(
          entries.map((entry) => ({
            id: entry.id,
            ...classifyFailure('runtime', new Error(message)),
            message,
            evidence: { log: egoFailureEvidence(repositoryRoot, artifactPrefix, entry.id, message) },
          })),
        );
      } else finish(results);
    });
    child.stdin.end(
      egoScript(
        entries.map((entry) => ({ id: entry.id })),
        baseUrl,
        repositoryRoot,
        taskName,
        artifactPrefix,
      ),
    );
  });
}

async function runEgoChecksParallel(
  repositoryRoot: string,
  baseUrl: string,
  entries: StorybookIndexEntry[],
  workers: number,
  framework: StorybookFramework,
  timeoutMs: number,
): Promise<EgoStoryResult[]> {
  const count = Math.max(1, Math.min(entries.length, Math.max(workers, Math.ceil(entries.length / 64))));
  const chunks = Array.from({ length: count }, () => [] as StorybookIndexEntry[]);
  for (const [index, entry] of entries.entries()) chunks[index % count].push(entry);
  const results = await Promise.all(
    chunks.map((chunk, index) =>
      runEgoChecks(
        repositoryRoot,
        baseUrl,
        chunk,
        `storybook renderer sweep ${framework} ${index + 1}`,
        framework,
        timeoutMs,
      ),
    ),
  );
  return results.flat();
}

function sourceEntries(
  repositoryRoot: string,
  inventory: RepositoryInventory,
  entries: StorybookIndexEntry[],
): StorybookIndexEntry[] {
  const sourceFiles = new Set(inventory.stories.map((story) => story.filePath));
  return entries.filter(
    (entry) => entry.importPath && sourceFiles.has(normalizeImportPath(repositoryRoot, entry.importPath)),
  );
}

function storyForEntry(repositoryRoot: string, inventory: RepositoryInventory, entry: StorybookIndexEntry) {
  const normalizedImport = entry.importPath ? normalizeImportPath(repositoryRoot, entry.importPath) : undefined;
  return inventory.stories.find((story) => story.filePath === normalizedImport);
}

function resultForEntry(
  repositoryRoot: string,
  inventory: RepositoryInventory,
  framework: StorybookFramework,
  entry: StorybookIndexEntry,
  results: Map<string, EgoStoryResult>,
): RuntimeResult {
  const browserResult = results.get(entry.id);
  const packageName = storyForEntry(repositoryRoot, inventory, entry)?.packageName ?? '@mission-platform/storybook';
  if (!browserResult)
    return {
      target: 'story',
      packageOrApp: packageName,
      framework,
      idOrRoute: entry.id,
      status: 'blocked',
      category: 'browser-result-missing',
      message: 'Ego Lite did not return a result for this indexed story.',
      workstream: workstreamForPackage(packageName),
    };
  return {
    target: 'story',
    packageOrApp: packageName,
    framework,
    idOrRoute: entry.id,
    status: browserResult.status,
    category: browserResult.category,
    message: browserResult.message,
    evidence: browserResult.evidence,
    attempts: browserResult.attempts,
    workstream: workstreamForPackage(packageName),
  };
}

export async function validateStorybookFramework(
  repositoryRoot: string,
  inventory: RepositoryInventory,
  options: StorybookSweepOptions,
): Promise<RuntimeResult[]> {
  const sourceStory = options.storyId ? inventory.stories.find((story) => story.id === options.storyId) : undefined;
  const frameworkStories = inventory.stories.filter(
    (story) =>
      (!options.packageName || story.packageName === options.packageName) &&
      (!options.storyId || !sourceStory || story.id === options.storyId),
  );
  const excluded = frameworkStories
    .filter(() => !options.storyId || sourceStory !== undefined)
    .filter(
      (story) =>
        story.excludedFramework === options.framework ||
        (story.packageName === '@mission-platform/storybook' && story.excludedFramework),
    )
    .map<RuntimeResult>((story) => ({
      target: 'story',
      packageOrApp: story.packageName,
      framework: options.framework,
      idOrRoute: story.id,
      status: 'excluded',
      category: 'framework-specific-story',
      message: `Story filename targets the ${story.excludedFramework} renderer and is outside the neutral matrix.`,
      workstream: workstreamForPackage(story.packageName),
    }));
  const expected = frameworkStories.filter((story) => !excluded.some((result) => result.idOrRoute === story.id));
  const buildLogPath = artifactPath(repositoryRoot, 'manifest', `storybook-${options.framework}-build`, 'log');
  if (options.build !== false) {
    const build = await runBuild(repositoryRoot, options.framework);
    fs.mkdirSync(path.dirname(buildLogPath), { recursive: true });
    fs.writeFileSync(buildLogPath, build.log);
    if (!build.ok) {
      return [
        ...excluded,
        ...expected.map<RuntimeResult>((story) => ({
          target: 'story',
          packageOrApp: story.packageName,
          framework: options.framework,
          idOrRoute: story.id,
          status: 'compile-failure',
          category: 'storybook-build',
          message: build.error,
          evidence: { log: buildLogPath },
          workstream: workstreamForPackage(story.packageName),
        })),
      ];
    }
  }
  const indexPath = path.join(repositoryRoot, 'apps/storybook/storybook-static/index.json');
  let index;
  try {
    index = readStorybookIndex(indexPath);
  } catch (error) {
    const message = errorMessage(error);
    const log = writeLog(repositoryRoot, `storybook-${options.framework}-index`, message);
    return [
      ...excluded,
      ...expected.map<RuntimeResult>((story) => ({
        target: 'story',
        packageOrApp: story.packageName,
        framework: options.framework,
        idOrRoute: story.id,
        status: 'compile-failure',
        category: 'storybook-index',
        message,
        evidence: { log },
        workstream: workstreamForPackage(story.packageName),
      })),
    ];
  }
  const comparison = compareStorybookIndex(repositoryRoot, inventory, index, options.framework);
  const comparisonLog = artifactPath(
    repositoryRoot,
    'manifest',
    `storybook-${options.framework}-index-mismatch`,
    'log',
  );
  fs.mkdirSync(path.dirname(comparisonLog), { recursive: true });
  fs.writeFileSync(
    comparisonLog,
    JSON.stringify(
      {
        framework: options.framework,
        missing: comparison.missing.map((story) => ({ id: story.id, filePath: story.filePath })),
        unexpected: comparison.unexpected.map((entry) => ({ id: entry.id, importPath: entry.importPath })),
      },
      undefined,
      2,
    ) + '\n',
  );
  const expectedFiles = new Set(expected.map((story) => story.filePath));
  const selectedEntries = sourceEntries(
    repositoryRoot,
    inventory,
    Object.values(index.entries).filter((entry) => entry.type !== 'docs'),
  )
    .filter((entry) => expectedFiles.has(normalizeImportPath(repositoryRoot, entry.importPath ?? '')))
    .filter((entry) => !options.storyId || entry.id === options.storyId)
    .slice(0, options.maxStories ?? Number.POSITIVE_INFINITY);
  if (options.storyId && !sourceStory && selectedEntries.length === 0) {
    return [
      {
        target: 'story',
        packageOrApp: '@mission-platform/storybook',
        framework: options.framework,
        idOrRoute: options.storyId,
        status: 'blocked',
        category: 'target-not-found',
        message: `No generated Storybook entry matched ${options.storyId}.`,
        evidence: { log: comparisonLog },
        workstream: 'framework:' + options.framework,
      },
    ];
  }
  const missing = comparison.missing
    .filter(
      (story) =>
        expected.includes(story) &&
        (!options.packageName || story.packageName === options.packageName) &&
        (!options.storyId || sourceStory !== undefined),
    )
    .map<RuntimeResult>((story) => ({
      target: 'story',
      packageOrApp: story.packageName,
      framework: options.framework,
      idOrRoute: story.id,
      status: 'compile-failure',
      category: 'story-index-missing',
      message: `No generated Storybook entry imports ${story.filePath}.`,
      evidence: { log: comparisonLog },
      workstream: workstreamForPackage(story.packageName),
    }));
  const unexpected = comparison.unexpected
    .filter((entry) => !selectedEntries.some((selected) => selected.id === entry.id))
    .map<RuntimeResult>((entry) => ({
      target: 'story',
      packageOrApp: '@mission-platform/storybook',
      framework: options.framework,
      idOrRoute: entry.id,
      status: 'compile-failure',
      category: 'story-index-unexpected',
      message: `Generated Storybook entry imports ${entry.importPath ?? 'an unknown source file'}.`,
      evidence: { log: comparisonLog },
      workstream: workstreamForPackage(
        typeof entry.componentPath === 'string' ? entry.componentPath : '@mission-platform/storybook',
      ),
    }));
  if (options.browser === false)
    return [
      ...excluded,
      ...missing,
      ...unexpected,
      ...selectedEntries.map<RuntimeResult>((entry) => ({
        target: 'story',
        packageOrApp: storyForEntry(repositoryRoot, inventory, entry)?.packageName ?? '@mission-platform/storybook',
        framework: options.framework,
        idOrRoute: entry.id,
        status: 'blocked',
        category: 'browser-not-requested',
        workstream: workstreamForPackage(
          storyForEntry(repositoryRoot, inventory, entry)?.packageName ?? '@mission-platform/storybook',
        ),
      })),
    ];
  const staticServer = await startStaticServer(
    path.join(repositoryRoot, 'apps/storybook/storybook-static'),
    options.port,
  );
  try {
    const browserResults = await withRetry(
      () =>
        runEgoChecksParallel(
          repositoryRoot,
          staticServer.url,
          selectedEntries,
          options.workers ?? 4,
          options.framework,
          options.timeoutMs ?? 120_000,
        ),
      { attempts: 2, delayMs: 500 },
    );
    const byId = new Map<string, EgoStoryResult>(browserResults.value.map((result) => [result.id, result]));
    return [
      ...excluded,
      ...missing,
      ...unexpected,
      ...selectedEntries.map((entry) => resultForEntry(repositoryRoot, inventory, options.framework, entry, byId)),
    ];
  } finally {
    await staticServer.close();
  }
}
