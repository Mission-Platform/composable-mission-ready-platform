import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  discoverComponents,
  discoverComponentsFromGraph,
  discoverHelperExports,
  discoverHelperExportsFromGraph,
} from './discover';
import { buildForgeFileGraph } from './graph';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

const BARREL = `
export { ForgeBadge, type BadgeProperties } from './forge-badge';
export { ForgeToast, type ToastProperties, type ToastVariant } from './forge-toast';
export { ForgeToastContainer, type ToastContainerProperties } from './forge-toast-container';
export {
  clearToasts,
  showToast,
  useToast,
  type ToastOptions,
  type ToastPosition,
} from './toast-store';
`;

const NESTED_BARREL = `
export { ForgeBadge, type BadgeProperties } from './atoms/forge-badge';
export { ForgeQuote, type QuoteProperties } from './molecules/forge-quote';
export {
  clearToasts,
  showToast,
  useToast,
  type ToastOptions,
  type ToastPosition,
} from './toast-store';
`;

describe('discoverComponents', () => {
  it('projects nested export chains and helpers from canonical source nodes', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'forge-discover-'));
    temporaryDirectories.push(root);
    const files: Record<string, string> = {
      'components/index.ts': `export { ForgeBadge, type BadgeProperties } from './atoms/forge-badge';\nexport { useToast } from '@/composables/use-toast';`,
      'components/atoms/forge-badge/index.ts': `export { ForgeBadge, type BadgeProperties } from './forge-badge';`,
      'components/atoms/forge-badge/forge-badge.tsx': `export interface BadgeProperties { tone: string; }\nexport function ForgeBadge() { return null; }`,
      'composables/use-toast.ts': `export function useToast() { return undefined; }`,
    };
    await Promise.all(
      Object.entries(files).map(async ([relativePath, source]) => {
        const filePath = path.join(root, relativePath);
        await mkdir(path.dirname(filePath), { recursive: true });
        await writeFile(filePath, source);
      }),
    );

    const graph = buildForgeFileGraph({ entry: path.join(root, 'components/index.ts'), sourceRoot: root });
    const components = discoverComponentsFromGraph(graph);
    const helpers = discoverHelperExportsFromGraph(graph, new Set(components.map((component) => component.folder)));

    expect(components).toEqual([
      expect.objectContaining({
        neutralName: 'ForgeBadge',
        publicName: 'Badge',
        folder: 'forge-badge',
        sourceDir: 'atoms/forge-badge',
        sourcePath: path.join(root, 'components/atoms/forge-badge/forge-badge.tsx'),
        typeExports: ['BadgeProperties'],
        propertiesType: 'BadgeProperties',
      }),
    ]);
    expect(helpers).toEqual([
      expect.objectContaining({
        base: 'use-toast',
        relativePath: 'composables/use-toast',
        sourcePath: path.join(root, 'composables/use-toast.ts'),
        values: [{ localName: 'useToast', exportedName: 'useToast' }],
      }),
    ]);
  });

  it('matches type-only exports from composable modules', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'forge-discover-composable-types-'));
    temporaryDirectories.push(root);
    const files: Record<string, string> = {
      'components/index.ts': "export { useLayer, type UseLayerOptions } from '../composables/use-layer';\n",
      'composables/use-layer.ts':
        'export interface UseLayerOptions { layer: string; }\nexport function useLayer(): void {}\n',
    };
    await Promise.all(
      Object.entries(files).map(async ([relativePath, source]) => {
        const filePath = path.join(root, relativePath);
        await mkdir(path.dirname(filePath), { recursive: true });
        await writeFile(filePath, source);
      }),
    );

    const graph = buildForgeFileGraph({ entry: path.join(root, 'components/index.ts'), sourceRoot: root });
    const helpers = discoverHelperExportsFromGraph(graph, new Set());

    expect(helpers).toEqual([
      expect.objectContaining({
        base: 'use-layer',
        values: [{ localName: 'useLayer', exportedName: 'useLayer' }],
        types: [{ localName: 'UseLayerOptions', exportedName: 'UseLayerOptions' }],
        sourcePath: path.join(root, 'composables/use-layer.ts'),
      }),
    ]);
  });

  it('keeps folder as the basename and sourceDir flat for a flat re-export', () => {
    const components = discoverComponents(BARREL);
    const badge = components.find((component) => component.neutralName === 'ForgeBadge');

    expect(badge).toMatchObject({
      neutralName: 'ForgeBadge',
      publicName: 'Badge',
      folder: 'forge-badge',
      sourceDir: 'forge-badge',
      propertiesType: 'BadgeProperties',
    });
  });

  it('keeps folder as the basename and sourceDir nested for an atomic-design re-export', () => {
    const components = discoverComponents(NESTED_BARREL);

    expect(components.map((component) => [component.folder, component.sourceDir])).toEqual([
      ['forge-badge', 'atoms/forge-badge'],
      ['forge-quote', 'molecules/forge-quote'],
    ]);
    expect(components.find((component) => component.neutralName === 'ForgeBadge')).toMatchObject({
      publicName: 'Badge',
      folder: 'forge-badge',
      sourceDir: 'atoms/forge-badge',
      propertiesType: 'BadgeProperties',
    });
  });
});

describe('discoverHelperExports', () => {
  it('forwards non-component helper re-exports (value + type names)', () => {
    const components = discoverComponents(BARREL);
    const folders = new Set(components.map((component) => component.folder));
    const helpers = discoverHelperExports(BARREL, folders);

    expect(helpers).toHaveLength(1);
    expect(helpers[0]).toEqual({
      base: 'toast-store',
      relativePath: 'toast-store',
      values: [
        { localName: 'clearToasts', exportedName: 'clearToasts' },
        { localName: 'showToast', exportedName: 'showToast' },
        { localName: 'useToast', exportedName: 'useToast' },
      ],
      types: [
        { localName: 'ToastOptions', exportedName: 'ToastOptions' },
        { localName: 'ToastPosition', exportedName: 'ToastPosition' },
      ],
    });
  });

  it('preserves nested folder paths in relativePath while keeping base as the file name', () => {
    const nestedBarrel = `
export { useObservable } from './composables/use-observable';
export { useSubscribe, useSubscription, type Unsubscribable } from './composables/use-subscription';
export { innerDimensions, type Margin } from './utils/margins';
`;
    const helpers = discoverHelperExports(nestedBarrel, new Set());

    expect(helpers.map((helper) => [helper.base, helper.relativePath])).toEqual([
      ['use-observable', 'composables/use-observable'],
      ['use-subscription', 'composables/use-subscription'],
      ['margins', 'utils/margins'],
    ]);
  });

  it('never treats a component re-export as a helper', () => {
    const components = discoverComponents(BARREL);
    const folders = new Set(components.map((component) => component.folder));
    const helpers = discoverHelperExports(BARREL, folders);

    // The PascalCase component lines (forge-badge / forge-toast / forge-toast-container)
    // are excluded by the component-folder set.
    expect(helpers.map((helper) => helper.base)).not.toContain('forge-toast');
    expect(helpers.map((helper) => helper.base)).not.toContain('forge-toast-container');
    // …and the helper line never produces a phantom component.
    expect(components.map((component) => component.folder)).not.toContain('toast-store');
  });

  it('never treats a nested component re-export as a helper (folder is still the basename)', () => {
    const components = discoverComponents(NESTED_BARREL);
    const folders = new Set(components.map((component) => component.folder));
    const helpers = discoverHelperExports(NESTED_BARREL, folders);

    expect(folders.has('forge-badge')).toBe(true);
    expect(folders.has('forge-quote')).toBe(true);
    expect(helpers.map((helper) => helper.base)).toEqual(['toast-store']);
  });
});
