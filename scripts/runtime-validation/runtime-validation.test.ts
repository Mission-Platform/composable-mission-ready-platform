import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PNG } from 'pngjs';
import { describe, expect, it, vi } from 'vitest';

import { matchesStorySelector, parseVisualParityArgs, selectedPairs } from '../visual-parity/cli.ts';
import { comparePngFiles } from '../visual-parity/diff.ts';
import {
  buildStoryIframeUrl,
  buildStoryReadinessSource,
  egoProcessTimeoutMs,
  runVisualParityCapture,
  VISUAL_PARITY_CAPTURE_CHUNK_SIZE,
  visualParityEgoScript,
} from '../visual-parity/ego-script.ts';
import { reportHasFailures, writeVisualParityReport } from '../visual-parity/report.ts';
import { buildStorybookDevSpawnArgs } from '../visual-parity/servers.ts';
import { createRendererDefinitions, type VisualParityReport } from '../visual-parity/types.ts';

import { appBuildArgs, appScript, validateAppsForFullRun, waitForHttp } from './app-sweep.ts';
import { classifyFailure } from './classification.ts';
import { createProcessRegistry, terminateProcessTree } from './cleanup.ts';
import { discoverInventory } from './inventory.ts';
import {
  createManifest,
  parseManifest,
  serializeManifest,
  summarizeFailureGroups,
  summarizeResults,
} from './manifest.ts';
import { isTransientRuntimeError, withRetry } from './retry.ts';
import { discoverAppRouteFiles, discoverAppRoutes, expandRoutePattern } from './routes.ts';
import { selectResults } from './runner.ts';
import {
  compareStorybookIndex,
  normalizeImportPath,
  pairStorybookIndexes,
  parseStorybookIndex,
} from './storybook-index.ts';
import { egoScript, startStaticServer } from './storybook-sweep.ts';
import { workstreamForPackage, workstreamForApp } from './workstreams.ts';

import type { RepositoryInventory, RuntimeManifest, RuntimeResult } from './types.ts';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function makeStorybookIndex(framework: string) {
  return parseStorybookIndex({
    entries: {
      button: {
        id: 'components-button--default',
        importPath: '../../packages/components/src/button.stories.tsx',
        title: 'Button',
        name: 'Default',
      },
      framework: {
        id: 'storybook-i18n--default',
        importPath: '../../apps/storybook/src/components/i18n/i18n.vue.stories.tsx',
        title: 'i18n',
      },
      ...(framework === 'web-component'
        ? {
            onlyHere: {
              id: `${framework}-only--default`,
              importPath: '../../packages/components/src/only-here.stories.tsx',
            },
          }
        : {}),
    },
  });
}

describe('repository inventory', () => {
  it('discovers all deployable apps, Storybook package roots, and package stories', () => {
    const inventory = discoverInventory(repositoryRoot);
    expect(inventory.apps.map((app) => app.name)).toEqual([
      '@mission-platform/docs',
      '@mission-platform/my-care-notes',
      '@mission-platform/service-monitor',
      '@mission-platform/storybook',
      '@mission-platform/website',
    ]);
    expect(inventory.apps.some((app) => app.name === '@mission-platform/figma-forge-plugin')).toBe(false);
    expect(inventory.storybookPackages).toHaveLength(22);
    expect(inventory.stories.some((story) => story.id.includes('@mission-platform/components:'))).toBe(true);
    expect(inventory.stories.some((story) => story.exportedStories?.includes('Default'))).toBe(true);
  });

  it('includes app-hosted framework-specific stories as explicit excludedFramework inventory entries', () => {
    const inventory = discoverInventory(repositoryRoot);
    const appStories = inventory.stories.filter((story) => story.packageName === '@mission-platform/storybook');
    const excludedVue = appStories.filter((story) => story.excludedFramework === 'vue');

    const i18nStory = appStories.find((story) =>
      story.filePath.endsWith('apps/storybook/src/components/i18n/i18n.vue.stories.tsx'),
    );
    const speechAudioStory = appStories.find((story) =>
      story.filePath.endsWith('apps/storybook/src/components/speech-audio/speech-audio.vue.stories.tsx'),
    );

    expect(i18nStory).toBeTruthy();
    expect(speechAudioStory).toBeTruthy();
    expect(i18nStory?.excludedFramework).toBe('vue');
    expect(speechAudioStory?.excludedFramework).toBe('vue');
    expect(excludedVue.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps framework coverage explicit for every story', () => {
    const inventory = discoverInventory(repositoryRoot);
    const storiesWithCoverage = inventory.stories.filter(
      (story) => !story.excludedFramework || story.excludedFramework === 'vue',
    );
    expect(storiesWithCoverage.length).toBeGreaterThan(0);
  });
});

describe('route discovery', () => {
  it('expands documented route families', () => {
    expect(discoverAppRoutes(repositoryRoot, 'docs')).toEqual(
      expect.arrayContaining(['/', '/overview', '/search', '/__not-found__']),
    );
    expect(discoverAppRoutes(repositoryRoot, '@mission-platform/website')).toContain('/es');
    expect(discoverAppRoutes(repositoryRoot, 'my-care-notes')).toContain('/?overlay=snippet-new');
    expect(discoverAppRoutes(repositoryRoot, 'service-monitor')).toEqual(
      expect.arrayContaining(['/', '/dashboard', '/monitors']),
    );
  });

  it('expands a route pattern without requiring a browser', () => {
    expect(expandRoutePattern('/:slug(.*)', 'docs')).toContain('/__not-found__');
  });

  it('keeps route-file inventory aligned with route discovery', () => {
    const docsRouteFiles = discoverAppRouteFiles(path.join(repositoryRoot, 'apps/docs'));
    expect(docsRouteFiles).toContain(path.join(repositoryRoot, 'apps/docs/src/app/router.ts'));
    const serviceMonitorFiles = discoverAppRouteFiles(path.join(repositoryRoot, 'apps/service-monitor'));
    expect(serviceMonitorFiles).toContain(path.join(repositoryRoot, 'apps/service-monitor/src/worker.tsx'));
    const serviceMonitor = discoverInventory(repositoryRoot).apps.find(
      (app) => app.name === '@mission-platform/service-monitor',
    );
    expect(serviceMonitor?.routerFiles.map((file) => path.resolve(repositoryRoot, file))).toEqual(serviceMonitorFiles);
  });
});

describe('application runtime sweep', () => {
  it('builds each app together with its workspace dependencies', () => {
    expect(appBuildArgs('@mission-platform/website')).toEqual(['--filter', '@mission-platform/website...', 'build']);
  });

  it('generates route checks with app-root and documented contract assertions', () => {
    const script = appScript(
      ['/', '/?overlay=snippet-new'],
      'http://127.0.0.1:7300',
      repositoryRoot,
      'my-care-notes',
      'test app sweep',
    );
    expect(script).toContain("document.querySelector('#app, #root, #storybook-root')");
    expect(script).toContain('state.search === expectedQuery');
    expect(script).toContain("state.pathname === '/overview'");
    expect(script).toContain('Page.captureScreenshot');
  });

  it('runs only the supported apps in a full app sweep and offsets explicit ports', async () => {
    const inventory = {
      repositoryRoot,
      workspacePackages: [],
      packages: [],
      apps: [
        ...['docs', 'website', 'my-care-notes', 'storybook', 'service-monitor'].map((name) => ({
          name: `@mission-platform/${name}`,
          directory: path.join(repositoryRoot, 'apps', name),
          relativeDirectory: `apps/${name}`,
          packageJson: path.join(repositoryRoot, 'apps', name, 'package.json'),
          routerFiles: [],
          routes: ['/'],
        })),
      ],
      stories: [],
      storybookPackages: [],
    } satisfies RepositoryInventory;
    const calls: Array<{ app?: string; port?: number }> = [];
    const validate = vi.fn(async (_root, _inventory, options) => {
      calls.push({ app: options.app, port: options.port });
      return [];
    });

    await validateAppsForFullRun(repositoryRoot, inventory, { port: 7400 }, validate);

    expect(calls).toEqual([
      { app: '@mission-platform/docs', port: 7400 },
      { app: '@mission-platform/website', port: 7401 },
      { app: '@mission-platform/my-care-notes', port: 7402 },
      { app: '@mission-platform/storybook', port: 7403 },
      { app: '@mission-platform/service-monitor', port: 7404 },
    ]);
  });

  it('uses a separate deterministic port range when no full-run port is supplied', async () => {
    const inventory = {
      repositoryRoot,
      workspacePackages: [],
      packages: [],
      apps: ['docs', 'website', 'my-care-notes', 'storybook', 'service-monitor'].map((name) => ({
        name: `@mission-platform/${name}`,
        directory: path.join(repositoryRoot, 'apps', name),
        relativeDirectory: `apps/${name}`,
        packageJson: path.join(repositoryRoot, 'apps', name, 'package.json'),
        routerFiles: [],
        routes: ['/'],
      })),
      stories: [],
      storybookPackages: [],
    } satisfies RepositoryInventory;
    const calls: Array<{ app?: string; port?: number }> = [];
    const validate = vi.fn(async (_root, _inventory, options) => {
      calls.push({ app: options.app, port: options.port });
      return [];
    });

    await validateAppsForFullRun(repositoryRoot, inventory, {}, validate);

    expect(calls.map(({ port }) => port)).toEqual([7305, 7306, 7307, 7308, 7309]);
  });

  it('does not treat an HTTP error response as app readiness', async () => {
    const server = http.createServer((_request, response) => response.writeHead(503).end());
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test server did not expose a TCP address');

    try {
      await expect(waitForHttp(`http://127.0.0.1:${address.port}`, 250)).rejects.toThrow('last HTTP status 503');
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  });
});

describe('manifest and index contracts', () => {
  it('round-trips a machine-readable manifest and summarizes statuses', () => {
    const inventory = {
      repositoryRoot,
      workspacePackages: [],
      packages: [],
      apps: [],
      stories: [],
      storybookPackages: [],
    } satisfies RepositoryInventory;
    const result: RuntimeResult = {
      target: 'app',
      packageOrApp: '@mission-platform/docs',
      idOrRoute: '/search',
      status: 'blocked',
      category: 'environment',
    };
    const manifest = createManifest(inventory, [result], '2026-08-12T00:00:00.000Z');
    expect(parseManifest(serializeManifest(manifest))).toEqual(manifest);
    expect(summarizeResults([result])).toBe('blocked=1');
    expect(summarizeFailureGroups([result])).toBe('app / @mission-platform/docs / app / blocked: 1');
    expect(() =>
      parseManifest(
        serializeManifest({
          ...manifest,
          results: [{ ...result, framework: 'unknown' as RuntimeResult['framework'] }],
        }),
      ),
    ).toThrow('Invalid runtime validation manifest');
    expect(() =>
      parseManifest(
        serializeManifest({
          ...manifest,
          inventory: { ...inventory, apps: [{ name: '@mission-platform/docs' }] },
        } as unknown as RuntimeManifest),
      ),
    ).toThrow('Invalid runtime validation manifest');
    expect(() =>
      parseManifest(
        serializeManifest({
          ...manifest,
          results: [{ ...result, attempts: 0 }],
        }),
      ),
    ).toThrow('Invalid runtime validation manifest');
  });

  it('reports missing and unexpected Storybook index entries', () => {
    const story = {
      id: '@mission-platform/components:button.stories.tsx',
      packageName: '@mission-platform/components',
      filePath: 'packages/components/src/button.stories.tsx',
      absolutePath: path.join(repositoryRoot, 'packages/components/src/button.stories.tsx'),
    };
    const inventory = {
      repositoryRoot,
      workspacePackages: [],
      packages: [],
      apps: [],
      stories: [story],
      storybookPackages: [],
    } satisfies RepositoryInventory;
    const comparison = compareStorybookIndex(
      repositoryRoot,
      inventory,
      { entries: { extra: { id: 'extra', importPath: './missing.stories.tsx' } } },
      'vue',
    );
    expect(comparison.missing).toEqual([story]);
    expect(comparison.unexpected).toHaveLength(1);
  });

  it('normalizes generated Storybook imports from the app root', () => {
    expect(normalizeImportPath(repositoryRoot, '../../packages/components/src/button.stories.tsx')).toBe(
      'packages/components/src/button.stories.tsx',
    );
  });

  it('parses fetched indexes and pairs only neutral entries shared by all renderers', () => {
    const neutralStory = {
      id: '@mission-platform/components:button.stories.tsx',
      packageName: '@mission-platform/components',
      filePath: 'packages/components/src/button.stories.tsx',
      absolutePath: path.join(repositoryRoot, 'packages/components/src/button.stories.tsx'),
    };
    const frameworkStory = {
      id: '@mission-platform/storybook:i18n.vue.stories.tsx',
      packageName: '@mission-platform/storybook',
      filePath: 'apps/storybook/src/components/i18n/i18n.vue.stories.tsx',
      absolutePath: path.join(repositoryRoot, 'apps/storybook/src/components/i18n/i18n.vue.stories.tsx'),
      excludedFramework: 'vue' as const,
    };
    const onlyHereStory = {
      id: '@mission-platform/components:only-here.stories.tsx',
      packageName: '@mission-platform/components',
      filePath: 'packages/components/src/only-here.stories.tsx',
      absolutePath: path.join(repositoryRoot, 'packages/components/src/only-here.stories.tsx'),
    };
    const inventory = {
      repositoryRoot,
      workspacePackages: [],
      packages: [],
      apps: [],
      stories: [neutralStory, frameworkStory, onlyHereStory],
      storybookPackages: [],
    } satisfies RepositoryInventory;
    const pairing = pairStorybookIndexes(repositoryRoot, inventory, {
      'web-component': makeStorybookIndex('web-component'),
      react: makeStorybookIndex('react'),
      vue: makeStorybookIndex('vue'),
    });

    expect(pairing.pairs).toHaveLength(1);
    expect(pairing.pairs[0]).toMatchObject({ storyId: 'components-button--default' });
    expect(pairing.pairs[0]?.sourceImport).toBe('packages/components/src/button.stories.tsx');
    expect(pairing.pairs[0]?.entries.react?.id).toBe('components-button--default');
    expect(pairing.missing.some((missing) => missing.storyId === 'web-component-only--default')).toBe(true);
    expect(pairing.missingStories).toEqual([onlyHereStory]);
    expect(pairing.missing.some((missing) => missing.sourceImport.includes('i18n.vue'))).toBe(false);
  });

  it('rejects malformed fetched Storybook indexes', () => {
    expect(() => parseStorybookIndex({ entries: [] })).toThrow('Invalid Storybook index');
    expect(() => parseStorybookIndex({})).toThrow('Invalid Storybook index');
  });

  it('generates an Ego Lite script with browser error and framework-scoped evidence capture', () => {
    const script = egoScript(
      [{ id: 'atoms-button--default' }],
      'http://127.0.0.1:4173',
      repositoryRoot,
      'storybook renderer sweep react 1',
      'react',
    );
    expect(script).toContain("await cdp('Network.enable')");
    expect(script).toContain("await cdp('Page.captureScreenshot'");
    expect(script).toContain('artifactPrefix = "react"');
    expect(script).toContain('storybook renderer sweep react 1');
    expect(script).toContain('const waitForStoryContent = async () =>');
    expect(script).toContain('attempt < 10');
  });

  it('assigns runtime failures to package workstreams', () => {
    expect(workstreamForPackage('@mission-platform/components')).toBe('package-ui');
    expect(workstreamForPackage('@mission-platform/map')).toBe('package-browser-integration');
    expect(workstreamForPackage('@mission-platform/qr-code')).toBe('package-data-codec-email');
    expect(workstreamForPackage('@mission-platform/unknown')).toBe('package:@mission-platform/unknown');
  });

  it('emits an explicit excluded result for a framework-specific story', () => {
    const inventory = {
      repositoryRoot,
      workspacePackages: [],
      packages: [],
      apps: [],
      stories: [
        {
          id: 'pkg:button.vue.stories.ts',
          packageName: 'pkg',
          filePath: 'button.vue.stories.ts',
          absolutePath: '/button.vue.stories.ts',
          excludedFramework: 'vue' as const,
        },
      ],
      storybookPackages: [],
    } satisfies RepositoryInventory;
    const results = selectResults(inventory, { framework: 'vue' });
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ status: 'excluded', category: 'framework-specific-story' });
  });

  it('emits explicit excluded results for app-hosted framework-specific stories', () => {
    const inventory = discoverInventory(repositoryRoot);
    const vueExcludedStories = inventory.stories.filter(
      (story) =>
        story.packageName === '@mission-platform/storybook' &&
        story.excludedFramework === 'vue' &&
        story.id.includes('@mission-platform/storybook:'),
    );
    expect(vueExcludedStories.length).toBeGreaterThanOrEqual(2);

    const results = selectResults(inventory, { framework: 'vue', packageName: '@mission-platform/storybook' });
    const excludedIds = new Set(
      results
        .filter(
          (r) => r.status === 'excluded' && r.framework === 'vue' && r.packageOrApp === '@mission-platform/storybook',
        )
        .map((r) => r.idOrRoute),
    );

    const i18nStory = vueExcludedStories.find((s) =>
      s.filePath.endsWith('apps/storybook/src/components/i18n/i18n.vue.stories.tsx'),
    );
    const speechAudioStory = vueExcludedStories.find((s) =>
      s.filePath.endsWith('apps/storybook/src/components/speech-audio/speech-audio.vue.stories.tsx'),
    );
    expect(i18nStory).toBeTruthy();
    expect(speechAudioStory).toBeTruthy();

    expect(excludedIds.has(i18nStory!.id)).toBe(true);
    expect(excludedIds.has(speechAudioStory!.id)).toBe(true);

    const reactResults = selectResults(inventory, { framework: 'react', packageName: '@mission-platform/storybook' });
    expect(reactResults.filter((result) => result.status === 'excluded')).toHaveLength(vueExcludedStories.length);
  });

  it('supports focused story and app selections without cross-target results', () => {
    const inventory = {
      repositoryRoot,
      workspacePackages: [],
      packages: [],
      apps: [
        {
          name: 'app',
          directory: '/app',
          relativeDirectory: 'apps/app',
          packageJson: '/app/package.json',
          routerFiles: [],
          routes: ['/'],
        },
      ],
      stories: [
        {
          id: 'pkg:button.stories.ts',
          packageName: 'pkg',
          filePath: 'button.stories.ts',
          absolutePath: '/button.stories.ts',
        },
      ],
      storybookPackages: [],
    } satisfies RepositoryInventory;
    expect(selectResults(inventory, { storyId: 'pkg:button.stories.ts', includeApps: false })).toHaveLength(5);
    expect(selectResults(inventory, { app: 'app', includeStories: false })).toHaveLength(1);
  });

  it('does not silently pass an unknown focused target', () => {
    const inventory = {
      repositoryRoot,
      workspacePackages: [],
      packages: [],
      apps: [],
      stories: [],
      storybookPackages: [],
    } satisfies RepositoryInventory;
    expect(selectResults(inventory, { storyId: 'missing', includeApps: false })).toMatchObject([
      { status: 'blocked', category: 'target-not-found', idOrRoute: 'missing' },
    ]);
  });
});

describe('Storybook static server', () => {
  it('rejects files reached through symlinks outside the static root', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'storybook-static-root-'));
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'storybook-static-outside-'));
    fs.writeFileSync(path.join(outside, 'secret.txt'), 'not public');
    fs.symlinkSync(path.join(outside, 'secret.txt'), path.join(root, 'secret.txt'));

    const server = await startStaticServer(root);
    try {
      const response = await fetch(`${server.url}/secret.txt`);
      expect(response.status).toBe(403);
    } finally {
      await server.close();
      fs.rmSync(root, { recursive: true, force: true });
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });
});

describe('visual parity renderer definitions', () => {
  it('assigns isolated deterministic loopback ports and renderer environments', () => {
    expect(createRendererDefinitions()).toEqual([
      expect.objectContaining({ framework: 'web-component', port: 6200, host: '127.0.0.1' }),
      expect.objectContaining({ framework: 'react', port: 6201, host: '127.0.0.1' }),
      expect.objectContaining({ framework: 'vue', port: 6202, host: '127.0.0.1' }),
    ]);
    expect(createRendererDefinitions({ ports: { react: 7101 } })[1]).toMatchObject({ port: 7101 });
  });

  it('builds Storybook dev spawn args using exact-port and automation-safe flags', () => {
    const cert = { certificate: '/tmp/cert.pem', key: '/tmp/key.pem' };
    const webComponent = createRendererDefinitions()[0];
    const args = buildStorybookDevSpawnArgs(cert, webComponent);

    expect(args).toContain('--exact-port');
    expect(args).toContain('--ci');
    expect(args).toContain('--no-open');
    expect(args).toContain('--https');
    expect(args).not.toContain('--strictPort');

    const hostIndex = args.indexOf('--host');
    expect(hostIndex).toBeGreaterThanOrEqual(0);
    expect(args[hostIndex + 1]).toBe(webComponent.host);

    const portIndex = args.indexOf('--port');
    expect(portIndex).toBeGreaterThanOrEqual(0);
    expect(args[portIndex + 1]).toBe(String(webComponent.port));

    const sslCertIndex = args.indexOf('--ssl-cert');
    expect(sslCertIndex).toBeGreaterThanOrEqual(0);
    expect(args[sslCertIndex + 1]).toBe(cert.certificate);
  });

  it('builds iframe-only deterministic Ego Lite capture scripts', async () => {
    expect(buildStoryIframeUrl('https://127.0.0.1:6200/', 'components/button--default')).toBe(
      'https://127.0.0.1:6200/iframe.html?id=components%2Fbutton--default',
    );

    const script = visualParityEgoScript({
      repositoryRoot,
      artifactDirectory: path.join(repositoryRoot, '.artifacts/visual-parity'),
      captures: [
        { renderer: 'web-component', storyId: 'components-button--default', baseUrl: 'https://127.0.0.1:6200' },
        { renderer: 'react', storyId: 'components-button--default', baseUrl: 'https://127.0.0.1:6201' },
        { renderer: 'vue', storyId: 'components-button--default', baseUrl: 'https://127.0.0.1:6202' },
      ],
      timeoutMs: 8000,
      retries: 2,
    });

    expect(script).toContain("await cdp('Emulation.setDeviceMetricsOverride'");
    expect(script).toContain("await cdp('Security.setIgnoreCertificateErrors', { ignore: true })");
    expect(script).toContain('deviceScaleFactor: viewport.deviceScaleFactor');
    expect(script).toContain("document.documentElement.dataset.theme = 'light'");
    expect(script).toContain('document.fonts.ready');
    expect(script).toContain('customElements.whenDefined');
    expect(script).toContain('requestAnimationFrame(() => requestAnimationFrame');
    expect(script).toContain('storyRenders');
    expect(script).toContain('current?.phase');
    expect(script).toContain('isTerminalPhase');
    expect(script).toContain('Date.now() +');
    expect(script).toContain("await waitForElement('#storybook-root'");
    expect(script).toContain('Page.captureScreenshot');
    expect(script).toContain('completeTaskSpace(task.id, { keep: false })');
    expect(script).toContain('net::ERR_ABORTED|canceled');
    expect(script).not.toContain('http://storybook');
    expect(script).toContain('/iframe.html?id=');
    expect(buildStoryReadinessSource(8000)).toContain('Date.now() + 4000');
    expect(buildStoryReadinessSource(8000)).toContain("phase === 'finished'");
    expect(VISUAL_PARITY_CAPTURE_CHUNK_SIZE).toBeGreaterThan(0);
    expect(egoProcessTimeoutMs(1, 30_000)).toBeGreaterThanOrEqual(30_000);
    expect(egoProcessTimeoutMs(120, 120_000)).toBeGreaterThan(120_000);
    expect(egoProcessTimeoutMs(120, 120_000)).toBeLessThan(120 * 120_000);
    expect(
      visualParityEgoScript({
        repositoryRoot,
        artifactDirectory: path.join(repositoryRoot, '.artifacts/visual-parity'),
        captures: [],
        taskName: 'visual parity capture#2',
      }),
    ).toContain('visual parity capture#2');

    await expect(
      runVisualParityCapture({
        repositoryRoot,
        artifactDirectory: path.join(repositoryRoot, '.artifacts/visual-parity'),
        captures: [],
      }),
    ).resolves.toEqual({ results: [], diagnostics: [], cleanupErrors: [] });
  });
});

describe('retry and failure classification', () => {
  it('retries one transient failure but not deterministic failures', async () => {
    let attempts = 0;
    await expect(
      withRetry(
        async () => {
          attempts += 1;
          if (attempts === 1) throw new Error('network timeout');
          return 'ok';
        },
        { delayMs: 0 },
      ),
    ).resolves.toEqual({ value: 'ok', attempts: 2 });
    expect(isTransientRuntimeError(new Error('module syntax error'))).toBe(false);
    await expect(
      withRetry(
        async () => {
          throw new Error('module syntax error');
        },
        { delayMs: 0 },
      ),
    ).rejects.toThrow('module syntax error');
  });

  it('normalizes retry attempt and delay options', async () => {
    const delays: number[] = [];
    let attempts = 0;
    await expect(
      withRetry(
        async () => {
          attempts += 1;
          if (attempts < 2) throw new Error('network timeout');
          return 'ok';
        },
        {
          attempts: 2.9,
          delayMs: -10,
          sleep: async (delay) => {
            delays.push(delay);
          },
        },
      ),
    ).resolves.toEqual({ value: 'ok', attempts: 2 });
    expect(delays).toEqual([0]);
  });

  it('maps phases and environment failures to the runtime result contract', () => {
    expect(classifyFailure('compile', new Error('syntax error'))).toEqual({
      status: 'compile-failure',
      category: 'compile',
    });
    expect(classifyFailure('interaction', new Error('play failed'))).toEqual({
      status: 'interaction-failure',
      category: 'interaction',
    });
    expect(classifyFailure('runtime', new Error('browser executable missing'))).toEqual({
      status: 'blocked',
      category: 'environment',
    });
  });
});

describe('managed process cleanup', () => {
  it('terminates a process group and escalates after the grace period', async () => {
    const signals: Array<[number, NodeJS.Signals]> = [];
    await terminateProcessTree(
      { pid: 42 },
      { graceMs: 1, wait: async () => {}, kill: (pid, signal) => signals.push([pid, signal]) },
    );
    expect(signals).toEqual([
      [-42, 'SIGTERM'],
      [-42, 'SIGKILL'],
    ]);
  });

  it('uses negative pid group kills even when the managed process has its own .kill()', async () => {
    try {
      const killCalls: Array<[number, NodeJS.Signals]> = [];
      const killSpy = vi.spyOn(globalThis.process, 'kill').mockImplementation(((
        pid: number,
        signal: NodeJS.Signals,
      ) => {
        killCalls.push([pid, signal]);
        return true;
      }) as unknown as typeof globalThis.process.kill);

      const managed = { pid: 42, kill: vi.fn() } satisfies { pid: number; kill: () => void };

      await terminateProcessTree(managed, { graceMs: 1, wait: async () => {} });

      expect(killCalls).toEqual([
        [-42, 'SIGTERM'],
        [-42, 'SIGKILL'],
      ]);
      expect(managed.kill).not.toHaveBeenCalled();
      killSpy.mockRestore();
    } finally {
      // Defensive: ensure no leaked spy.
      vi.restoreAllMocks();
    }
  });

  it('falls back to managed .kill(signal) if group kill (-pid) is not supported', async () => {
    const killSpy = vi.spyOn(globalThis.process, 'kill').mockImplementation((() => {
      throw new Error('negative pid group kill unsupported');
    }) as unknown as typeof globalThis.process.kill);

    const managedKill = vi.fn();
    await terminateProcessTree({ pid: 42, kill: managedKill }, { graceMs: 1, wait: async () => {} });

    expect(managedKill).toHaveBeenCalledTimes(2);
    expect(managedKill).toHaveBeenNthCalledWith(1, 'SIGTERM');
    expect(managedKill).toHaveBeenNthCalledWith(2, 'SIGKILL');
    killSpy.mockRestore();
  });

  it('cleans every registered process and clears the registry', async () => {
    const killed: number[] = [];
    const registry = createProcessRegistry({ kill: (pid) => killed.push(pid) });
    registry.add({ pid: 1 });
    registry.add({ pid: 2 });
    await registry.cleanup();
    expect(killed).toEqual([-1, -1, -2, -2]);
    await registry.cleanup();
    expect(killed).toHaveLength(4);
  });
});

describe('workstreams', () => {
  it('maps apps to the correct workstreams', () => {
    expect(workstreamForApp('docs')).toBe('vue-apps');
    expect(workstreamForApp('website')).toBe('vue-apps');
    expect(workstreamForApp('my-care-notes')).toBe('vue-apps');
    expect(workstreamForApp('service-monitor')).toBe('redwood-react-apps');
    expect(workstreamForApp('storybook')).toBe('storybook-ci');
    expect(workstreamForApp('unknown')).toBe('app:unknown');
  });
});

describe('visual parity diffing and CLI options', () => {
  it('passes identical PNGs, reports mismatches, and rejects dimensions before pixel comparison', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'visual-parity-'));
    try {
      const baselinePath = path.join(directory, 'baseline.png');
      const candidatePath = path.join(directory, 'candidate.png');
      const diffPath = path.join(directory, 'diff.png');
      const baseline = new PNG({ width: 2, height: 2 });
      baseline.data.fill(255);
      fs.writeFileSync(baselinePath, PNG.sync.write(baseline));
      fs.writeFileSync(candidatePath, PNG.sync.write(baseline));

      expect(comparePngFiles({ baselinePath, candidatePath, diffPath })).toMatchObject({
        status: 'pass',
        mismatchPixels: 0,
        mismatchRatio: 0,
      });
      baseline.data[0] = 0;
      fs.writeFileSync(candidatePath, PNG.sync.write(baseline));
      expect(comparePngFiles({ baselinePath, candidatePath, diffPath })).toMatchObject({
        status: 'visual-mismatch',
        mismatchPixels: 1,
        diffPath,
      });
      const smaller = new PNG({ width: 1, height: 1 });
      fs.writeFileSync(candidatePath, PNG.sync.write(smaller));
      expect(comparePngFiles({ baselinePath, candidatePath, diffPath })).toMatchObject({
        status: 'dimension-mismatch',
        mismatchPixels: 0,
      });
      expect(fs.existsSync(diffPath)).toBe(true);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it('parses selectors, isolated ports, deterministic settings, and diff thresholds', () => {
    const options = parseVisualParityArgs(
      [
        '--package',
        '@mission-platform/components',
        '--story',
        'forge-button--focus-visible',
        '--max-stories',
        '2',
        '--port',
        '6300',
        '--workers',
        '2',
        '--timeout-ms',
        '90000',
        '--pixel-threshold',
        '0.2',
        '--diff-threshold',
        '0.01',
      ],
      repositoryRoot,
    );
    expect(options).toMatchObject({
      packageName: '@mission-platform/components',
      storyId: 'forge-button--focus-visible',
      maxStories: 2,
      ports: { 'web-component': 6300, react: 6301, vue: 6302 },
      workers: 2,
      timeoutMs: 90_000,
      pixelThreshold: 0.2,
      maxMismatchRatio: 0.01,
      theme: 'light',
      viewport: { name: 'md', deviceScaleFactor: 1 },
    });
  });

  it('matches exact and compact Storybook story selectors used by the CLI', () => {
    expect(
      matchesStorySelector('atoms-display-forgebutton--focus-visible', 'atoms-display-forgebutton--focus-visible'),
    ).toBe(true);
    expect(matchesStorySelector('atoms-display-forgebutton--focus-visible', 'forge-button--focus-visible')).toBe(true);
    expect(matchesStorySelector('atoms-display-forgebutton--focus-visible', 'focus-visible')).toBe(true);
    expect(matchesStorySelector('atoms-display-forgebutton--primary', 'forge-button--focus-visible')).toBe(false);
    expect(matchesStorySelector('atoms-display-forgebutton--primary', 'atoms-display-forgebutton--default')).toBe(
      false,
    );

    const inventory = {
      repositoryRoot,
      workspacePackages: [],
      packages: [],
      apps: [],
      stories: [
        {
          id: '@mission-platform/components:forge-button.stories.tsx',
          packageName: '@mission-platform/components',
          filePath: 'packages/components/src/forge-button.stories.tsx',
          absolutePath: path.join(repositoryRoot, 'packages/components/src/forge-button.stories.tsx'),
        },
      ],
      storybookPackages: [],
    } satisfies RepositoryInventory;
    const pairs = [
      {
        storyId: 'atoms-display-forgebutton--focus-visible',
        sourceImport: 'packages/components/src/forge-button.stories.tsx',
        entries: {
          'web-component': { id: 'atoms-display-forgebutton--focus-visible' },
          react: { id: 'atoms-display-forgebutton--focus-visible' },
          vue: { id: 'atoms-display-forgebutton--focus-visible' },
        },
      },
    ];
    expect(
      selectedPairs(pairs, inventory, {
        repositoryRoot,
        storyId: 'forge-button--focus-visible',
        ports: {},
        viewport: { name: 'md', width: 1024, height: 768, deviceScaleFactor: 1 },
        theme: 'light',
        workers: 1,
        timeoutMs: 1000,
        pixelThreshold: 0.1,
        maxMismatchRatio: 0,
        outputDirectory: path.join(repositoryRoot, '.artifacts/visual-parity'),
      }),
    ).toHaveLength(1);
  });

  it('serializes the visual-parity report and classifies comparison failures', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'visual-parity-report-'));
    try {
      const report: VisualParityReport = {
        schemaVersion: 1,
        generatedAt: new Date(0).toISOString(),
        status: 'fail',
        options: {
          repositoryRoot,
          packageName: '@mission-platform/components',
          storyId: 'atoms-display-forgebutton--primary',
          ports: {},
          viewport: { name: 'md', width: 1024, height: 768, deviceScaleFactor: 1 },
          theme: 'light',
          workers: 1,
          timeoutMs: 1000,
          pixelThreshold: 0.1,
          maxMismatchRatio: 0,
          outputDirectory: directory,
        },
        renderers: [],
        results: [
          {
            storyId: 'atoms-display-forgebutton--primary',
            packageName: '@mission-platform/components',
            comparisons: [
              {
                baseline: 'web-component',
                candidate: 'react',
                status: 'visual-mismatch',
                mismatchPixels: 12,
                mismatchRatio: 0.01,
              },
              {
                baseline: 'web-component',
                candidate: 'vue',
                status: 'runtime-failure',
                message: 'Storybook root rendered no content.',
              },
            ],
          },
        ],
        captures: [],
        diagnostics: [],
        cleanupErrors: [],
      };
      const target = writeVisualParityReport(directory, report);
      expect(fs.existsSync(target)).toBe(true);
      expect(JSON.parse(fs.readFileSync(target, 'utf8'))).toMatchObject({
        status: 'fail',
        results: [
          {
            comparisons: [{ status: 'visual-mismatch' }, { status: 'runtime-failure' }],
          },
        ],
      });
      expect(reportHasFailures(report)).toBe(true);
      expect(
        reportHasFailures({
          ...report,
          status: 'pass',
          results: [
            {
              storyId: 'ok',
              packageName: '@mission-platform/components',
              comparisons: [
                { baseline: 'web-component', candidate: 'react', status: 'pass' },
                { baseline: 'web-component', candidate: 'vue', status: 'pass' },
              ],
            },
          ],
        }),
      ).toBe(false);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
});
