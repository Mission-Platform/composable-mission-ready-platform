import { spawn } from 'node:child_process';
import fs from 'node:fs';

import { terminateProcessTree } from '../runtime-validation/cleanup.ts';

import {
  DEFAULT_VISUAL_PARITY_VIEWPORT,
  type VisualParityCaptureOptions,
  type VisualParityCaptureResult,
  type VisualParityCaptureRun,
  type VisualParityDiagnostic,
  type VisualParityRenderer,
  type VisualParityViewport,
} from './types.ts';

interface PipedProcess {
  pid?: number;
  exitCode?: number | null;
  stdin: { end(input: string): void };
  stdout: { on(event: 'data', listener: (chunk: Buffer) => void): void };
  stderr: { on(event: 'data', listener: (chunk: Buffer) => void): void };
  on(event: 'error', listener: (error: Error) => void): void;
  on(event: 'close', listener: (code: number | null, signal: string | null) => void): void;
}

interface CaptureMessage {
  kind?: string;
  result?: VisualParityCaptureResult;
  diagnostics?: string[];
  cleanupErrors?: string[];
}

const PAGE_ERROR_SOURCE = `
  (() => {
    const errors = (window.__visualParityErrors ||= []);
    window.addEventListener('error', (event) => {
      errors.push({ kind: 'page', message: event.error?.stack || event.message || 'Page error' });
    });
    window.addEventListener('unhandledrejection', (event) => {
      errors.push({ kind: 'page', message: 'Unhandled rejection: ' + String(event.reason) });
    });
  })();
`;

/** Browser-side readiness probe. `timeoutMs` is injected by the generated script. */
export function buildStoryReadinessSource(timeoutMs = 15_000): string {
  // Keep readiness inside a bounded slice of the overall capture budget so retries remain possible.
  const budgetMs = Math.max(2_000, Math.min(20_000, Math.floor(timeoutMs * 0.5)));
  return String.raw`(async () => {
  const root = document.querySelector('#storybook-root');
  const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
  const deadline = Date.now() + ${budgetMs};
  const readRender = () => {
    const preview = window.__STORYBOOK_PREVIEW__;
    const renders = preview?.storyRenders;
    const current = Array.isArray(renders) ? renders[renders.length - 1] : undefined;
    return {
      phase: current?.phase ?? null,
      id: current?.id ?? null,
      count: Array.isArray(renders) ? renders.length : 0,
    };
  };
  const hasContent = (node) => {
    if (!node) return false;
    if (node.childElementCount > 0) return true;
    if ((node.textContent || '').trim()) return true;
    const shadow = node.shadowRoot;
    if (shadow && (shadow.childElementCount > 0 || (shadow.textContent || '').trim())) return true;
    return false;
  };
  const isTerminalPhase = (phase) => phase === 'finished' || phase === 'afterEach' || phase === 'aborted';
  const waitForImages = async () => {
    const images = [...document.images];
    await Promise.all(images.map((image) => image.complete
      ? Promise.resolve()
      : new Promise((resolve) => {
          const finish = () => { image.removeEventListener('load', finish); image.removeEventListener('error', finish); resolve(); };
          image.addEventListener('load', finish, { once: true });
          image.addEventListener('error', finish, { once: true });
          setTimeout(finish, 5000);
        })));
    return {
      pending: images.filter((image) => !image.complete).length,
      failures: images.filter((image) => image.complete && image.naturalWidth === 0 && image.currentSrc).length,
    };
  };
  const waitForCustomElements = async () => {
    const tags = [...new Set([...root.querySelectorAll('*')]
      .map((element) => element.localName)
      .filter((tag) => tag.includes('-')))];
    const pending = [];
    await Promise.all(tags.map(async (tag) => {
      let resolved = false;
      await Promise.race([
        customElements.whenDefined(tag).then(() => { resolved = true; }),
        wait(5000),
      ]);
      if (!resolved) pending.push(tag);
    }));
    return pending;
  };
  if (!root) {
    return {
      root: false,
      content: false,
      fontsReady: false,
      imagesPending: 0,
      imageFailures: 0,
      customElementsPending: [],
      animationFrames: 0,
      storyRenderComplete: false,
      phase: null,
    };
  }
  document.documentElement.dataset.theme = 'light';
  document.body?.setAttribute('data-theme', 'light');
  root.setAttribute('data-theme', 'light');

  // Storybook mounts #storybook-root before the selected story/play work finishes.
  // Wait for real content and a terminal render phase instead of capturing empty shells.
  let storyRenderComplete = false;
  let phase = null;
  while (Date.now() < deadline) {
    const render = readRender();
    phase = render.phase;
    const contentReady = hasContent(root);
    if (isTerminalPhase(phase) && contentReady) {
      storyRenderComplete = phase === 'finished' || phase === 'afterEach';
      break;
    }
    // Content without an exposed phase still needs a short settle for play/fonts.
    if (contentReady && phase == null && render.count === 0) {
      await wait(150);
      if (hasContent(root)) {
        const delayed = readRender();
        phase = delayed.phase;
        if (isTerminalPhase(phase) || phase == null) {
          storyRenderComplete = phase == null || phase === 'finished' || phase === 'afterEach';
          break;
        }
      }
    }
    await wait(100);
  }

  const content = hasContent(root);
  if (!storyRenderComplete) {
    const render = readRender();
    phase = render.phase;
    storyRenderComplete = isTerminalPhase(phase) && phase !== 'aborted';
  }

  let fontsReady = true;
  try {
    if (document.fonts?.ready) await document.fonts.ready;
  } catch {
    fontsReady = false;
  }
  const images = await waitForImages();
  const customElementsPending = content ? await waitForCustomElements() : [];
  let animationFrames = 0;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  animationFrames = 2;
  await wait(50);
  return {
    root: true,
    content: hasContent(root),
    fontsReady,
    imagesPending: images.pending,
    imageFailures: images.failures,
    customElementsPending,
    animationFrames,
    storyRenderComplete,
    phase,
  };
})()`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? (error.stack ?? error.message) : String(error);
}

export function buildStoryIframeUrl(baseUrl: string, storyId: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/iframe.html?id=${encodeURIComponent(storyId)}`;
}

function normalizeViewport(viewport?: VisualParityViewport): VisualParityViewport {
  const value = viewport ?? DEFAULT_VISUAL_PARITY_VIEWPORT;
  if (value.name !== 'md' || value.width !== 1024 || value.height !== 768 || value.deviceScaleFactor !== 1) {
    throw new Error('Visual parity capture currently supports only the deterministic md viewport (1024x768 @ 1x).');
  }
  return value;
}

/**
 * Generates the stdin program consumed by `ego-browser nodejs`.
 *
 * The generated program deliberately navigates only to Storybook iframe URLs,
 * so manager/chrome layout cannot affect the captured pixels.
 */
export function visualParityEgoScript(options: VisualParityCaptureOptions): string {
  const viewport = normalizeViewport(options.viewport);
  const retries = Math.max(1, Math.floor(options.retries ?? 3));
  const timeoutSeconds = Math.max(1, Math.ceil((options.timeoutMs ?? 30_000) / 1000));
  const taskName = `${options.taskName ?? 'visual parity capture'}-${Date.now()}-${process.pid}`;
  const captures = options.captures.map((capture) => ({
    ...capture,
    url: buildStoryIframeUrl(capture.baseUrl, capture.storyId),
  }));
  return String.raw`
(async () => {
const fs = await import('node:fs');
const path = await import('node:path');
const captures = ${JSON.stringify(captures)};
const repositoryRoot = ${JSON.stringify(options.repositoryRoot)};
const artifactDirectory = ${JSON.stringify(options.artifactDirectory)};
const viewport = ${JSON.stringify(viewport)};
const theme = ${JSON.stringify(options.theme ?? 'light')};
const maxAttempts = ${retries};
const timeoutSeconds = ${timeoutSeconds};
const task = await useOrCreateTaskSpace(${JSON.stringify(taskName)});
const allDiagnostics = [];
let cleanupErrors = [];
try {
await cdp('Runtime.enable');
await cdp('Log.enable');
await cdp('Network.enable');
await cdp('Page.enable');
await cdp('Security.enable');
await cdp('Security.setIgnoreCertificateErrors', { ignore: true });
await cdp('Network.setCacheDisabled', { cacheDisabled: true });
await cdp('Emulation.setDeviceMetricsOverride', {
  width: viewport.width,
  height: viewport.height,
  deviceScaleFactor: viewport.deviceScaleFactor,
  mobile: false,
  screenWidth: viewport.width,
  screenHeight: viewport.height,
});
await cdp('Page.addScriptToEvaluateOnNewDocument', { source: ${JSON.stringify(PAGE_ERROR_SOURCE)} });
const sleep = (seconds) => wait(seconds);
const artifact = (capture) => {
  const directory = path.join(artifactDirectory, 'stories', safe(capture.storyId), capture.renderer);
  fs.mkdirSync(directory, { recursive: true });
  return path.join(directory, 'capture.png');
};
const safe = (value) => value.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^\.+/, '_').slice(0, 180) || 'story';
const collectErrors = (events) => events.flatMap((event) => {
  if (event.method === 'Log.entryAdded' && event.params.entry?.level === 'error') return [{ kind: 'console', message: event.params.entry.text ?? '' }];
  if (event.method === 'Runtime.consoleAPICalled' && ['error', 'assert'].includes(event.params.type)) return [{ kind: 'console', message: event.params.args.map((arg) => arg.value ?? arg.description ?? '').join(' ') }];
  if (event.method === 'Runtime.exceptionThrown') return [{ kind: 'exception', message: event.params.exceptionDetails?.text ?? 'Runtime exception' }];
  if (event.method === 'Network.loadingFailed') return [{ kind: 'network', message: event.params.errorText ?? event.params.type ?? 'Request failed' }];
  if (event.method === 'Network.responseReceived' && event.params.response?.status >= 400) return [{ kind: 'network', message: 'HTTP ' + event.params.response.status + ' ' + event.params.response.url }];
  return [];
});
const isBenignDiagnostic = (diagnostic) => {
  if (diagnostic.kind === 'network' && /HTTP 404 .*\/favicon\.ico(?:\?|$)/i.test(diagnostic.message)) return true;
  // Storybook iframe navigations commonly abort the previous document request.
  if (diagnostic.kind === 'network' && /net::ERR_ABORTED|canceled/i.test(diagnostic.message)) return true;
  return false;
};
const readPageErrors = async () => await js("(() => { const errors = window.__visualParityErrors || []; window.__visualParityErrors = []; return errors; })()");
const isTransient = (message) => /timeout|timed out|econnreset|connection refused|net::err|502|503|504|rendered no content|did not settle|did not become ready/i.test(message || '');
const readinessSource = ${JSON.stringify(buildStoryReadinessSource(options.timeoutMs ?? 30_000))};
const captureAttempt = async (capture, attempt) => {
  const result = {
    storyId: capture.storyId,
    renderer: capture.renderer,
    url: capture.url,
    status: 'runtime-failure',
    attempts: attempt,
    diagnostics: [],
  };
  try {
    await drainEvents();
    await gotoAndWait(capture.url, { timeout: timeoutSeconds, settle: 0.25 });
    try {
      await waitForElement('#storybook-root', { timeout: timeoutSeconds });
    } catch (error) {
      const readiness = await js(readinessSource);
      result.readiness = readiness;
      result.message = readiness.root
        ? 'Storybook root did not become ready before the timeout: ' + String(error)
        : 'Storybook root element was not created.';
      result.diagnostics = [{ kind: 'readiness', message: result.message }];
      return result;
    }
    const readiness = await js(readinessSource);
    result.readiness = readiness;
    const diagnostics = collectErrors(await drainEvents()).concat(await readPageErrors());
    result.diagnostics = diagnostics;
    const hasFavicon404 = diagnostics.some((diagnostic) => diagnostic.kind === 'network' && /HTTP 404 .*\/favicon\.ico(?:\?|$)/i.test(diagnostic.message));
    const blockingDiagnostics = diagnostics.filter((diagnostic) => {
      if (isBenignDiagnostic(diagnostic)) return false;
      if (hasFavicon404 && diagnostic.kind === 'console' && /status of 404 \(Not Found\)/i.test(diagnostic.message)) return false;
      return true;
    });
    if (!readiness.root) {
      result.message = 'Storybook root element was not created.';
      result.diagnostics.push({ kind: 'readiness', message: result.message });
    } else if (!readiness.content) {
      result.message = (blockingDiagnostics.length ? blockingDiagnostics.map((diagnostic) => diagnostic.message).join('\\n') + '\\n' : '') + 'Storybook root rendered no content.';
      result.diagnostics.push({ kind: 'readiness', message: result.message });
    } else if (readiness.imagesPending || readiness.imageFailures || readiness.customElementsPending.length || !readiness.fontsReady || readiness.animationFrames < 2) {
      result.message = 'Story readiness conditions did not settle.';
      result.diagnostics.push({ kind: 'readiness', message: result.message });
    } else if (blockingDiagnostics.length) {
      result.message = blockingDiagnostics.map((diagnostic) => diagnostic.message).join('\\n');
    } else {
      const screenshot = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      const imagePath = artifact(capture);
      const image = Buffer.from(screenshot.data, 'base64');
      fs.writeFileSync(imagePath, image);
      result.status = 'pass';
      result.imagePath = imagePath;
      result.imageBytes = image.byteLength;
    }
  } catch (error) {
    result.message = String(error);
    result.diagnostics = [{ kind: 'navigation', message: result.message }];
    result.status = /permission|browser executable|sandbox|not installed|missing dependency/i.test(result.message) ? 'blocked' : 'runtime-failure';
  }
  return result;
};
const capture = async (item) => {
  let result;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    result = await captureAttempt(item, attempt);
    if (result.status === 'pass' || attempt === maxAttempts || !isTransient(result.message)) break;
    await sleep(2);
  }
  cliLog(JSON.stringify({ kind: 'capture', result }));
  return result;
};
for (const item of captures) await capture(item);
} catch (error) {
  const message = String(error);
  allDiagnostics.push(message);
} finally {
  try {
    await completeTaskSpace(task.id, { keep: false });
  } catch (error) {
    cleanupErrors = [String(error)];
  }
  cliLog(JSON.stringify({ kind: 'done', diagnostics: allDiagnostics, cleanupErrors }));
}
})();
`;
}

/** Backwards-compatible short name matching the runtime-validation harness. */
export const egoScript = visualParityEgoScript;

function failureResult(
  capture: VisualParityCaptureOptions['captures'][number],
  message: string,
  status: 'runtime-failure' | 'blocked',
): VisualParityCaptureResult {
  return {
    storyId: capture.storyId,
    renderer: capture.renderer,
    url: buildStoryIframeUrl(capture.baseUrl, capture.storyId),
    status,
    attempts: 0,
    diagnostics: [{ kind: 'environment', message }],
    message,
  };
}

/** Default captures per Ego Lite process; keeps large inventories under process timeouts. */
export const VISUAL_PARITY_CAPTURE_CHUNK_SIZE = 120;

function chunkCaptures<T>(items: readonly T[], chunkSize: number): T[][] {
  if (items.length === 0) return [];
  const size = Math.max(1, Math.floor(chunkSize));
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size) as T[]);
  return chunks;
}

/** Wall-clock budget for one Ego Lite process covering a capture chunk. */
export function egoProcessTimeoutMs(captureCount: number, perCaptureTimeoutMs = 30_000): number {
  const count = Math.max(1, captureCount);
  // Process budget is independent of the generous per-story readiness timeout: real captures
  // average well under a few seconds, with headroom for retries and first-load compilation.
  const perCaptureBudget = Math.max(6_000, Math.min(15_000, Math.floor(perCaptureTimeoutMs / 3)));
  return Math.max(perCaptureTimeoutMs, 90_000 + count * perCaptureBudget);
}

async function runVisualParityCaptureChunk(options: VisualParityCaptureOptions): Promise<VisualParityCaptureRun> {
  return new Promise((resolve) => {
    const child = spawn('ego-browser', ['nodejs'], {
      cwd: options.repositoryRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: true,
    }) as unknown as PipedProcess;
    const results: VisualParityCaptureResult[] = [];
    const diagnostics: string[] = [];
    let cleanupErrors: string[] = [];
    let pending = '';
    let stderr = '';
    let settled = false;
    const timeoutMs = egoProcessTimeoutMs(options.captures.length, options.timeoutMs ?? 30_000);
    const timeout = setTimeout(() => {
      diagnostics.push(`Ego Lite timed out after ${timeoutMs}ms`);
      void terminateProcessTree(child, { graceMs: 250 }).finally(finish);
    }, timeoutMs);
    const finish = (): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      const byKey = new Map(results.map((result) => [`${result.renderer}:${result.storyId}`, result]));
      for (const capture of options.captures) {
        const key = `${capture.renderer}:${capture.storyId}`;
        if (!byKey.has(key)) {
          const message = (diagnostics.at(-1) ?? stderr.trim()) || 'Ego Lite completed without a capture result.';
          results.push(failureResult(capture, message, diagnostics.length > 0 ? 'runtime-failure' : 'blocked'));
        }
      }
      resolve({ results, diagnostics, cleanupErrors });
    };
    const parse = (chunk: Buffer): void => {
      pending += chunk.toString();
      const lines = pending.split('\n');
      pending = lines.pop() ?? '';
      for (const line of lines) {
        try {
          const message = JSON.parse(line) as CaptureMessage;
          if (message.kind === 'capture' && message.result) results.push(message.result);
          if (message.kind === 'done') {
            diagnostics.push(...(message.diagnostics ?? []));
            cleanupErrors = message.cleanupErrors ?? [];
          }
        } catch {
          // ego-browser may emit human-readable diagnostics alongside JSON.
        }
      }
    };
    child.stdout.on('data', parse);
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      parse(chunk);
    });
    child.on('error', (error) => {
      diagnostics.push(errorMessage(error));
      finish();
    });
    child.on('close', (code) => {
      if (pending.trim()) parse(Buffer.from(`${pending}\n`));
      if (code !== 0 && diagnostics.length === 0)
        diagnostics.push(stderr || `ego-browser exited with code ${code ?? 'null'}`);
      finish();
    });
    child.stdin.end(visualParityEgoScript(options));
  });
}

async function mapPool<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const limit = Math.max(1, Math.floor(concurrency));
  const results = new Array<R>(items.length);
  let next = 0;
  const run = async (): Promise<void> => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index]!, index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return results;
}

/** Runs the generated program and parses one structured result per renderer/story. */
export async function runVisualParityCapture(options: VisualParityCaptureOptions): Promise<VisualParityCaptureRun> {
  normalizeViewport(options.viewport);
  if (options.captures.length === 0) return { results: [], diagnostics: [], cleanupErrors: [] };
  fs.mkdirSync(options.artifactDirectory, { recursive: true });
  const chunks = chunkCaptures(options.captures, VISUAL_PARITY_CAPTURE_CHUNK_SIZE);
  const workers = Math.max(1, Math.floor(options.workers ?? 1));
  const chunkRuns = await mapPool(chunks, workers, async (captures, index) =>
    runVisualParityCaptureChunk({
      ...options,
      captures,
      // Isolate task spaces so parallel Ego Lite workers do not collide.
      taskName: `${options.taskName ?? 'visual parity capture'}#${index + 1}`,
    }),
  );
  return {
    results: chunkRuns.flatMap((run) => run.results),
    diagnostics: chunkRuns.flatMap((run) => run.diagnostics),
    cleanupErrors: chunkRuns.flatMap((run) => run.cleanupErrors),
  };
}

export function visualParityCaptureUrl(baseUrl: string, storyId: string): string {
  return buildStoryIframeUrl(baseUrl, storyId);
}

export type VisualParityCaptureDiagnostic = VisualParityDiagnostic;
export type VisualParityCaptureRenderer = VisualParityRenderer;
