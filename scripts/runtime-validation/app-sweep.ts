import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

import { classifyFailure } from './classification.ts';
import { terminateProcessTree } from './cleanup.ts';
import { artifactPath } from './paths.ts';
import { workstreamForApp } from './workstreams.ts';

import type { AppInventory, RepositoryInventory, RuntimeResult } from './types.ts';

export interface AppSweepOptions {
  app?: string;
  route?: string;
  port?: number;
  build?: boolean;
  browser?: boolean;
  timeoutMs?: number;
}

interface BrowserAppResult {
  route: string;
  status: RuntimeResult['status'];
  category: string;
  message?: string;
  evidence?: RuntimeResult['evidence'];
  attempts?: number;
}

interface ProcessResult {
  ok: boolean;
  output: string;
  error?: string;
}

function appShortName(app: AppInventory): string {
  return app.name.replace(/^@mission-platform\//, '');
}

export function appBuildArgs(appName: string): string[] {
  return ['--filter', `${appName}...`, 'build'];
}

function writeAppLog(repositoryRoot: string, app: AppInventory, suffix: string, content: string): string {
  const target = artifactPath(repositoryRoot, 'app', `${appShortName(app)}-${suffix}`, 'log');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
  return target;
}

function runProcess(repositoryRoot: string, args: string[], timeoutMs: number): Promise<ProcessResult> {
  return new Promise((resolve) => {
    const child = spawn('pnpm', args, {
      cwd: repositoryRoot,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    });
    let output = '';
    let settled = false;
    const finish = (result: ProcessResult): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(result);
    };
    const timeout = setTimeout(() => {
      void terminateProcessTree(child, { graceMs: 250 }).then(() =>
        finish({ ok: false, output, error: `Command timed out after ${timeoutMs}ms: pnpm ${args.join(' ')}` }),
      );
    }, timeoutMs);
    child.stdout?.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.on('error', (error) => finish({ ok: false, output, error: error.stack ?? error.message }));
    child.on('close', (code, signal) =>
      finish({
        ok: code === 0,
        output,
        error: code === 0 ? undefined : `Command exited with ${signal ? `signal ${signal}` : `code ${code}`}`,
      }),
    );
  });
}

function waitForHttp(url: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const attempt = (): void => {
      const request = http.get(url, (response) => {
        response.resume();
        response.once('end', () => resolve());
      });
      request.once('error', () => {
        if (Date.now() >= deadline) reject(new Error(`Server did not become ready at ${url}`));
        else setTimeout(attempt, 150);
      });
      request.setTimeout(1000, () => request.destroy());
    };
    attempt();
  });
}

export function appScript(
  routes: string[],
  baseUrl: string,
  repositoryRoot: string,
  appName: string,
  taskName: string,
): string {
  const templateTick = String.fromCodePoint(96);
  return String.raw`
(async () => {
const fs = await import('node:fs');
const path = await import('node:path');
const routes = ${JSON.stringify(routes)};
const baseUrl = ${JSON.stringify(baseUrl)};
const repositoryRoot = ${JSON.stringify(repositoryRoot)};
const appName = ${JSON.stringify(appName)};
const task = await useOrCreateTaskSpace(${JSON.stringify(taskName)});
await cdp('Runtime.enable');
await cdp('Log.enable');
await cdp('Network.enable');
await cdp('Page.enable');
await cdp('Page.addScriptToEvaluateOnNewDocument', { source: ${JSON.stringify(`
  (() => {
    const errors = (window.__runtimeValidationErrors ||= []);
    window.addEventListener('error', (event) => errors.push('page: ' + (event.error?.stack || event.message)));
    window.addEventListener('unhandledrejection', (event) => errors.push('unhandled-rejection: ' + String(event.reason)));
  })();
`)} });
const artifact = (route, extension) => {
  const safe = route.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^\.+/, '_').slice(0, 180) || 'root';
  const target = path.join(repositoryRoot, '.artifacts/runtime-validation/app', appName, safe + '.' + extension);
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
const checkRoute = async (route, attempt) => {
  const result = { route, attempts: attempt };
  let state = {};
  let errors = [];
  try {
    await drainEvents();
    await gotoAndWait(baseUrl + route, { timeout: 12, settle: 0.5 });
    await wait(0.5);
    state = await js(String.raw${templateTick}(() => {
      const root = document.querySelector('#app, #root, #storybook-root');
      return {
        pathname: location.pathname,
        search: location.search,
        title: document.title,
        lang: document.documentElement.lang,
        root: Boolean(root),
        children: root?.childElementCount ?? 0,
        text: (root?.textContent || '').trim().slice(0, 400),
        bodyText: (document.body?.innerText || '').trim().slice(0, 800),
      };
    })()${templateTick});
    errors = collectErrors(await drainEvents()).concat(await js("(() => { const errors = window.__runtimeValidationErrors || []; window.__runtimeValidationErrors = []; return errors; })()"));
    const root = state.root && (state.children > 0 || state.text);
    const expectedQuery = route.includes('?') ? route.slice(route.indexOf('?')) : '';
    const expectedLocale = appName === 'website' ? (route === '/' ? 'en' : route.slice(1).split('/')[0]) : '';
    const expectedState = appName === 'docs' && route === '/' ? state.pathname === '/overview'
      : appName === 'website' && expectedLocale ? state.lang.toLowerCase().startsWith(expectedLocale.toLowerCase())
      : appName === 'my-care-notes' && expectedQuery ? state.search === expectedQuery
      : true;
    if (!state.root) {
      result.status = 'runtime-failure'; result.category = 'missing-app-root'; result.message = 'The application did not create a root element.';
    } else if (!root) {
      result.status = 'runtime-failure'; result.category = 'empty-app-root'; result.message = 'The application root rendered no content.';
    } else if (!expectedState) {
      result.status = 'runtime-failure'; result.category = 'route-contract'; result.message = 'Rendered route state did not match the documented route contract.';
    } else if (errors.length) {
      result.status = 'runtime-failure'; result.category = errors.some((error) => error.startsWith('network:')) ? 'network' : 'browser-console'; result.message = errors.join('\\n');
    } else {
      result.status = 'pass'; result.category = 'route-render';
    }
    if (result.status !== 'pass') {
      const log = artifact(route, 'log');
      fs.writeFileSync(log, JSON.stringify({ appName, route, state, errors, attempts: attempt }, null, 2) + '\\n');
      result.evidence = { log };
      try {
        const screenshot = await cdp('Page.captureScreenshot', { format: 'png' });
        const screenshotPath = artifact(route, 'png');
        fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'));
        result.evidence.screenshot = screenshotPath;
      } catch (screenshotError) {
        result.message += '\\nScreenshot failed: ' + String(screenshotError);
      }
    }
  } catch (error) {
    result.status = /permission|browser executable|sandbox|not installed|missing dependency/i.test(String(error)) ? 'blocked' : 'runtime-failure';
    result.category = result.status === 'blocked' ? 'environment' : 'navigation';
    result.message = String(error);
  }
  cliLog(JSON.stringify({ kind: 'result', result }));
  return result;
};
for (const route of routes) {
  let result;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    result = await checkRoute(route, attempt);
    if (result.status === 'pass' || attempt === 2 || !/timeout|timed out|econnreset|connection refused|net::err|network/i.test(result.message || '')) break;
    await wait(0.5);
  }
}
cliLog(JSON.stringify({ kind: 'done', count: routes.length }));
})();
`;
}

function runEgoAppChecks(
  repositoryRoot: string,
  baseUrl: string,
  routes: string[],
  appName: string,
  timeoutMs: number,
): Promise<BrowserAppResult[]> {
  return new Promise((resolve) => {
    const child = spawn('ego-browser', ['nodejs'], {
      cwd: repositoryRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: true,
    });
    const results: BrowserAppResult[] = [];
    let pending = '';
    let diagnostics = '';
    let settled = false;
    const finish = (value: BrowserAppResult[]): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(value);
    };
    const parse = (chunk: Buffer): void => {
      pending += chunk.toString();
      const lines = pending.split('\n');
      pending = lines.pop() ?? '';
      for (const line of lines) {
        try {
          const message = JSON.parse(line) as { kind?: string; result?: BrowserAppResult };
          if (message.kind === 'result' && message.result) results.push(message.result);
        } catch {
          // Ego Lite diagnostics are retained separately from structured results.
        }
      }
    };
    const timeout = setTimeout(() => {
      diagnostics += `Ego Lite timed out after ${timeoutMs}ms`;
      void terminateProcessTree(child, { graceMs: 250 });
    }, timeoutMs);
    child.stdout?.on('data', parse);
    child.stderr?.on('data', (chunk: Buffer) => {
      diagnostics += chunk.toString();
      parse(chunk);
    });
    child.on('error', (error) => {
      const message = error.stack ?? error.message;
      finish(routes.map((route) => ({ route, ...classifyFailure('environment', error), message })));
    });
    child.on('close', (code) => {
      if (results.length === 0) {
        const error = new Error(diagnostics || `ego-browser exited with code ${code ?? 'null'}`);
        const log = artifactPath(repositoryRoot, 'app', `${appName}-ego-runner`, 'log');
        fs.mkdirSync(path.dirname(log), { recursive: true });
        fs.writeFileSync(log, `${error.message}\n`);
        finish(
          routes.map((route) => ({
            route,
            ...classifyFailure('runtime', error),
            message: error.message,
            evidence: { log },
          })),
        );
      } else finish(results);
    });
    child.stdin?.end(appScript(routes, baseUrl, repositoryRoot, appName, `runtime validation app ${appName}`));
  });
}

function selectedApps(inventory: RepositoryInventory, options: AppSweepOptions): AppInventory[] {
  return inventory.apps.filter(
    (app) =>
      !options.app || app.name === options.app || appShortName(app) === options.app.replace(/^@mission-platform\//, ''),
  );
}

/** Apps covered by the current full validation lane. */
export const FULL_APP_VALIDATION_APPS = ['docs', 'website', 'my-care-notes', 'storybook', 'service-monitor'] as const;

export function fullAppNames(inventory: RepositoryInventory, requestedApp?: string): string[] {
  const normalizedRequest = requestedApp?.replace(/^@mission-platform\//, '');
  return inventory.apps
    .filter((app) => FULL_APP_VALIDATION_APPS.includes(appShortName(app) as (typeof FULL_APP_VALIDATION_APPS)[number]))
    .filter((app) => !normalizedRequest || appShortName(app) === normalizedRequest)
    .map((app) => app.name);
}

export async function validateApps(
  repositoryRoot: string,
  inventory: RepositoryInventory,
  options: AppSweepOptions = {},
): Promise<RuntimeResult[]> {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const apps = selectedApps(inventory, options);
  const allResults: RuntimeResult[] = [];
  for (const [index, app] of apps.entries()) {
    const routes = app.routes.filter((route) => !options.route || route === options.route);
    const selectedRoutes = routes.length > 0 ? routes : options.route ? [options.route] : ['/'];
    let buildLog = '';
    if (options.build ?? true) {
      const build = await runProcess(repositoryRoot, appBuildArgs(app.name), 120_000);
      buildLog = build.output;
      if (!build.ok) {
        const log = writeAppLog(repositoryRoot, app, 'build', `${build.error ?? 'Build failed'}\n${build.output}`);
        allResults.push(
          {
            target: 'app',
            packageOrApp: app.name,
            idOrRoute: '__build__',
            ...classifyFailure('compile', new Error(build.error ?? 'App build failed')),
            message: build.error,
            evidence: { log },
            workstream: workstreamForApp(appShortName(app)),
          },
          ...selectedRoutes.map<RuntimeResult>((route) => ({
            target: 'app',
            packageOrApp: app.name,
            idOrRoute: route,
            ...classifyFailure('compile', new Error(build.error ?? 'App build failed')),
            message: build.error,
            evidence: { log },
            workstream: workstreamForApp(appShortName(app)),
          })),
        );
        continue;
      }
      allResults.push({
        target: 'app',
        packageOrApp: app.name,
        idOrRoute: '__build__',
        status: 'pass',
        category: 'build',
        workstream: workstreamForApp(appShortName(app)),
      });
    }

    const port = (options.port ?? 7300) + index;
    const child = spawn(
      'pnpm',
      ['--filter', app.name, 'exec', 'vite', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
      {
        cwd: repositoryRoot,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: true,
      },
    );
    let serverOutput = '';
    child.stdout?.on('data', (chunk: Buffer) => (serverOutput += chunk.toString()));
    child.stderr?.on('data', (chunk: Buffer) => (serverOutput += chunk.toString()));
    try {
      await waitForHttp(`http://127.0.0.1:${port}/`, 15_000);
      allResults.push({
        target: 'app',
        packageOrApp: app.name,
        idOrRoute: '__startup__',
        status: 'pass',
        category: 'startup',
        workstream: workstreamForApp(appShortName(app)),
      });
      if (options.browser ?? true) {
        const browserResults = await runEgoAppChecks(
          repositoryRoot,
          `http://127.0.0.1:${port}`,
          selectedRoutes,
          appShortName(app),
          timeoutMs,
        );
        const byRoute = new Map(browserResults.map((result) => [result.route, result]));
        allResults.push(
          ...selectedRoutes.map<RuntimeResult>((route) => {
            const result = byRoute.get(route);
            return {
              target: 'app',
              packageOrApp: app.name,
              idOrRoute: route,
              status: result?.status ?? 'blocked',
              category: result?.category ?? 'browser-result-missing',
              message: result?.message,
              evidence: result?.evidence,
              attempts: result?.attempts,
              workstream: workstreamForApp(appShortName(app)),
            };
          }),
        );
      } else {
        allResults.push(
          ...selectedRoutes.map<RuntimeResult>((route) => ({
            target: 'app',
            packageOrApp: app.name,
            idOrRoute: route,
            status: 'pass',
            category: 'startup',
            message: buildLog ? undefined : 'Build was skipped; preview server was ready.',
            workstream: workstreamForApp(appShortName(app)),
          })),
        );
      }
    } catch (error) {
      const log = writeAppLog(repositoryRoot, app, 'startup', `${String(error)}\n${serverOutput}`);
      allResults.push(
        {
          target: 'app',
          packageOrApp: app.name,
          idOrRoute: '__startup__',
          ...classifyFailure('environment', error),
          message: String(error),
          evidence: { log },
          workstream: workstreamForApp(appShortName(app)),
        },
        ...selectedRoutes.map<RuntimeResult>((route) => ({
          target: 'app',
          packageOrApp: app.name,
          idOrRoute: route,
          ...classifyFailure('environment', error),
          message: String(error),
          evidence: { log },
          workstream: workstreamForApp(appShortName(app)),
        })),
      );
    } finally {
      await terminateProcessTree(child, { graceMs: 250 });
    }
  }
  return allResults;
}

export async function validateAppsForFullRun(
  repositoryRoot: string,
  inventory: RepositoryInventory,
  options: AppSweepOptions = {},
  validate: typeof validateApps = validateApps,
): Promise<RuntimeResult[]> {
  const apps = fullAppNames(inventory, options.app);
  const allResults: RuntimeResult[] = [];
  const basePort = options.port ?? 7305;
  for (const [index, app] of apps.entries()) {
    allResults.push(
      ...(await validate(repositoryRoot, inventory, {
        ...options,
        app,
        port: basePort + index,
      })),
    );
  }
  return allResults;
}
