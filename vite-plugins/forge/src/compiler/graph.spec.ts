import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { buildForgeFileGraph } from './graph';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function createFixture(files: Record<string, string>): Promise<{ root: string; entry: string }> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'forge-graph-'));
  temporaryDirectories.push(root);
  for (const [relativePath, source] of Object.entries(files)) {
    const filePath = path.join(root, relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, source);
  }
  return { root, entry: path.join(root, 'components', 'index.ts') };
}

describe('buildForgeFileGraph', () => {
  it('follows nested relative imports, aliases, re-exports, type exports, and styles', async () => {
    const fixture = await createFixture({
      'components/index.ts': `export { ForgeMap } from './molecules/forge-map';\nexport type { MapProperties } from './molecules/forge-map';`,
      'components/molecules/forge-map/index.tsx': `import { useMap } from '@/composables/use-map';\nimport './forge-map.css';\nexport { ForgeMap } from './forge-map';\nexport type { MapProperties } from './types';`,
      'components/molecules/forge-map/forge-map.tsx': `export function ForgeMap() { return null; }`,
      'components/molecules/forge-map/types.ts': `export interface MapProperties { zoom: number; }`,
      'composables/use-map.ts': `export function useMap() { return undefined; }`,
      'components/molecules/forge-map/forge-map.css': '.map {}',
    });

    const graph = await buildForgeFileGraph({ entry: fixture.entry, sourceRoot: fixture.root });

    expect(graph.diagnostics).toEqual([]);
    expect(graph.nodes.get(fixture.entry)?.kind).toBe('entry');
    expect(graph.nodes.get(path.join(fixture.root, 'components/molecules/forge-map/forge-map.tsx'))?.kind).toBe(
      'component',
    );
    expect(graph.nodes.get(path.join(fixture.root, 'composables/use-map.ts'))?.kind).toBe('composable');
    expect(graph.nodes.get(path.join(fixture.root, 'components/molecules/forge-map/forge-map.css'))?.kind).toBe(
      'style',
    );
    expect(graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          from: path.join(fixture.root, 'components/molecules/forge-map/index.tsx'),
          to: path.join(fixture.root, 'composables/use-map.ts'),
          relation: 'import',
          specifier: '@/composables/use-map',
          resolved: true,
        }),
        expect.objectContaining({
          to: path.join(fixture.root, 'components/molecules/forge-map/forge-map.css'),
          relation: 'style',
          specifier: './forge-map.css',
          resolved: true,
        }),
        expect.objectContaining({
          to: path.join(fixture.root, 'components/molecules/forge-map/forge-map.tsx'),
          relation: 're-export',
          specifier: './forge-map',
          resolved: true,
        }),
      ]),
    );
    expect(graph.nodes.get(path.join(fixture.root, 'components/molecules/forge-map/index.tsx'))?.exports).toEqual(
      expect.arrayContaining([expect.objectContaining({ exportedName: 'MapProperties', typeOnly: true })]),
    );
  });

  it('classifies nested index modules as folder entry files', async () => {
    const fixture = await createFixture({
      'components/index.ts': `export { ForgeMap } from './molecules/forge-map';
export { useMap } from '../composables';`,
      'components/molecules/forge-map/index.ts': `export { ForgeMap } from './forge-map';`,
      'components/molecules/forge-map/forge-map.tsx': `export function ForgeMap() { return null; }`,
      'composables/index.tsx': `export { useMap } from './use-map';`,
      'composables/use-map.ts': `export function useMap() { return undefined; }`,
    });

    const graph = await buildForgeFileGraph({ entry: fixture.entry, sourceRoot: fixture.root });

    expect(graph.nodes.get(fixture.entry)?.kind).toBe('entry');
    expect(graph.nodes.get(path.join(fixture.root, 'components/molecules/forge-map/index.ts'))?.kind).toBe('folder');
    expect(graph.nodes.get(path.join(fixture.root, 'composables/index.tsx'))?.kind).toBe('folder');
    expect(graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          from: path.join(fixture.root, 'components/molecules/forge-map/index.ts'),
          to: path.join(fixture.root, 'components/molecules/forge-map/forge-map.tsx'),
          relation: 're-export',
          resolved: true,
        }),
        expect.objectContaining({
          from: path.join(fixture.root, 'composables/index.tsx'),
          to: path.join(fixture.root, 'composables/use-map.ts'),
          relation: 're-export',
          resolved: true,
        }),
      ]),
    );
  });

  it('reports unresolved local imports with source and specifier context', async () => {
    const fixture = await createFixture({
      'components/index.ts': `import '@/utils/missing';\nimport './unsupported.bin';\nexport const ForgeMap = 1;`,
      'utils/unused.ts': 'export const value = 1;',
      'components/unsupported.bin': 'binary placeholder',
    });

    const graph = await buildForgeFileGraph({ entry: fixture.entry, sourceRoot: fixture.root });

    expect(graph.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'missing-file',
          source: fixture.entry,
          specifier: '@/utils/missing',
        }),
        expect.objectContaining({
          code: 'unsupported-extension',
          source: fixture.entry,
          specifier: './unsupported.bin',
        }),
      ]),
    );
  });

  it('reports ambiguous explicit exports and cycles deterministically', async () => {
    const fixture = await createFixture({
      'components/index.ts': `export { value as duplicate } from './a';\nexport { value as duplicate } from './b';`,
      'components/a.ts': `import './b';\nexport const value = 1;`,
      'components/b.ts': `import './a';\nexport const value = 2;`,
    });

    const graph = await buildForgeFileGraph({ entry: fixture.entry, sourceRoot: fixture.root });

    expect(graph.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'ambiguous-export', specifier: 'duplicate' }),
        expect.objectContaining({ code: 'cycle' }),
      ]),
    );
  });
});
