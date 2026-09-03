import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createServer } from 'vite';
import { afterEach, describe, expect, it } from 'vitest';

import {
  abiManifest as collectionAbiManifest,
  load as loadCollections,
  loadSync as loadCollectionsSync,
} from '../fixtures/valid/collections.fws';
import { abiManifest, load, loadSync, manifest } from '../fixtures/valid/scalar.fws';

import { defineForgeWebScriptVitestConfig, forgeWebScriptVitestPlugin } from './vitest.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('Forge Web Script Vitest adapter', () => {
  it('imports the generated module contract and virtual artifact queries', async () => {
    const scalarManifestQuery = await import('../fixtures/valid/scalar.fws?forge-web-script-manifest');
    const scalarWasmQuery = await import('../fixtures/valid/scalar.fws?forge-web-script-wasm');
    const scalarSourceMapQuery = await import('../fixtures/valid/scalar.fws?forge-web-script-source-map');
    const scalarManifest = scalarManifestQuery.default;
    const scalarWasm = scalarWasmQuery.default;
    const scalarSourceMap = scalarSourceMapQuery.default;
    expect(manifest).toMatchObject({ moduleName: expect.any(String) });
    expect(abiManifest).toEqual(manifest);
    expect(scalarManifest).toEqual(manifest);
    const loaded = await load<{ answer: () => number }>();
    expect(loaded.answer()).toBe(42);
    expect(loadSync<{ answer: () => number }>().answer()).toBe(42);
    expect(scalarWasm).toBeInstanceOf(Uint8Array);
    expect(scalarSourceMap).toMatchObject({ sourcesContent: [expect.stringContaining('answer')] });
  });

  it('loads generated collection and enum artifacts with ordered scalar exports', async () => {
    const collectionManifestQuery = await import('../fixtures/valid/collections.fws?forge-web-script-manifest');
    const collectionWatQuery = await import('../fixtures/valid/collections.fws?forge-web-script-wat');
    const generatedManifest = collectionManifestQuery.default;

    expect(collectionAbiManifest).toEqual(generatedManifest);
    expect(generatedManifest.enumDeclarations).toEqual([
      expect.objectContaining({
        name: 'State',
        exported: true,
        representation: 'i32',
        variants: expect.arrayContaining([
          { name: 'Idle', value: -1 },
          { name: 'Ready', value: 0 },
          { name: 'Done', value: 7 },
        ]),
      }),
    ]);
    expect(collectionWatQuery.default).toContain('br_table');

    const loaded = await loadCollections<{
      dispatch: (state: number) => number;
      arrayValue: () => number;
      vectorValue: () => number;
    }>();
    expect(loaded.dispatch(-1)).toBe(10);
    expect(loaded.dispatch(123)).toBe(-1);
    expect(loaded.arrayValue()).toBe(2);
    expect(loaded.vectorValue()).toBe(5);
    expect(loadCollectionsSync<{ dispatch: (state: number) => number }>().dispatch(0)).toBe(20);
  });

  it('loads graph declarations through the plugin graph path', async () => {
    const { graphMetadata } = await import('../fixtures/graphs/entry.fws?forge-web-script-declarations');
    expect(graphMetadata.linkedModules).toHaveLength(2);
    expect(graphMetadata.graphHash).toEqual(expect.any(String));
    expect(graphMetadata.linkMode).toEqual(expect.any(String));
  });

  it('preserves consumer Vite plugins and settings while composing the config', () => {
    const consumerPlugin = { name: 'consumer-plugin' };
    const config = defineForgeWebScriptVitestConfig({
      environment: 'node',
      overrides: {
        plugins: [consumerPlugin],
        resolve: { alias: { '@fixture-root': '/tmp/fixtures' } },
      },
    });
    const pluginNames = (config.plugins ?? []).flatMap((plugin) => {
      const candidate: unknown = Array.isArray(plugin) ? plugin[0] : plugin;
      if (typeof candidate !== 'object' || candidate === null || !('name' in candidate)) return [];
      const name = (candidate as { readonly name?: unknown }).name;
      return typeof name === 'string' ? [name] : [];
    });
    expect(pluginNames).toContain('@mission-platform/vite-plugin-forge-web-script');
    expect(pluginNames).toContain('consumer-plugin');
    expect(config.resolve?.alias).toMatchObject({ '@fixture-root': '/tmp/fixtures' });
  });

  it('invalidates graph artifacts when a dependency changes in the Vite server lifecycle', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'forge-web-script-vitest-'));
    temporaryDirectories.push(root);
    const entry = path.join(root, 'entry.fws');
    const dependency = path.join(root, 'dependency.fws');
    await writeFile(
      entry,
      'import "./dependency.fws" as dependency;\nexport fn answer() -> i32 { return 42; }\n',
      'utf8',
    );
    await writeFile(dependency, 'export fn dependency() -> i32 { return 1; }\n', 'utf8');

    const plugin = forgeWebScriptVitestPlugin({ root });
    const server = await createServer({ root, appType: 'custom', plugins: [plugin] });
    try {
      const query = `${entry}?forge-web-script-source-map`;
      const initial = await server.transformRequest(query);
      expect(initial?.code).toContain('dependency() -> i32 { return 1; }');

      await writeFile(dependency, 'export fn dependency() -> i32 { return 2; }\n', 'utf8');
      const entryModule = server.moduleGraph.getModuleById(query);
      if (entryModule === undefined) throw new Error('Expected the graph entry in Vite module graph.');
      server.moduleGraph.invalidateModule(entryModule);
      if (typeof plugin.handleHotUpdate !== 'function') throw new Error('Expected Forge Web Script HMR hook.');
      const handleHotUpdate = plugin.handleHotUpdate as unknown as (context: {
        readonly file: string;
        readonly modules: readonly (typeof entryModule)[];
        readonly read: () => Promise<string>;
        readonly server: typeof server;
        readonly timestamp: number;
      }) => unknown;
      handleHotUpdate({
        file: dependency,
        modules: [entryModule],
        read: () => readFile(dependency, 'utf8'),
        server,
        timestamp: Date.now(),
      });

      const updated = await server.transformRequest(query);
      expect(updated?.code).toContain('dependency() -> i32 { return 2; }');
    } finally {
      await server.close();
    }
  });
});
