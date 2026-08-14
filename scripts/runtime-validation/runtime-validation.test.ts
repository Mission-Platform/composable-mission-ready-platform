import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

import { appScript, validateAppsForFullRun } from './app-sweep.ts';
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
import { compareStorybookIndex, normalizeImportPath } from './storybook-index.ts';
import { egoScript } from './storybook-sweep.ts';
import { workstreamForPackage, workstreamForApp } from './workstreams.ts';

import type { RepositoryInventory, RuntimeManifest, RuntimeResult } from './types.ts';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

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
    expect(inventory.storybookPackages).toHaveLength(18);
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
    const serviceMonitorFiles = discoverAppRouteFiles(path.join(repositoryRoot, 'apps/service-monitor'));
    expect(serviceMonitorFiles).toContain(path.join(repositoryRoot, 'apps/service-monitor/src/worker.tsx'));
    const serviceMonitor = discoverInventory(repositoryRoot).apps.find(
      (app) => app.name === '@mission-platform/service-monitor',
    );
    expect(serviceMonitor?.routerFiles.map((file) => path.resolve(repositoryRoot, file))).toEqual(serviceMonitorFiles);
  });
});

describe('application runtime sweep', () => {
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
