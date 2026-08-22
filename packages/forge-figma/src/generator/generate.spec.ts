import { describe, expect, it } from 'vitest';

import { generateForgeExportBundle } from './generate';

describe('generateForgeExportBundle', () => {
  it('generates deterministic neutral source for mapped and unmapped layers', () => {
    const bundle = generateForgeExportBundle({
      schemaVersion: 1,
      source: { nodeId: '0:1', name: 'Checkout panel' },
      diagnostics: [],
      assets: [{ id: 'image-hero', fileName: 'hero.png', mimeType: 'image/png', content: new Uint8Array([1, 2, 3]) }],
      root: {
        id: '0:1',
        name: 'Checkout panel',
        type: 'frame',
        layout: {
          mode: 'horizontal',
          width: 320,
          height: 80,
          gap: 12,
          padding: { top: 8, right: 8, bottom: 8, left: 8 },
        },
        style: {
          fills: [{ kind: 'solid', color: '#ffffff' }],
          tokens: {
            fill: {
              path: 'component.button.primary.background',
              cssVariable: '--mp-button-primary-background',
              modes: ['light', 'dark'],
            },
          },
        },
        children: [
          {
            id: '0:2',
            name: 'ForgeButton',
            type: 'instance',
            component: {
              registryName: 'ForgeButton',
              confidence: 'explicit',
              properties: [{ name: 'variant', type: 'variant', value: 'primary' }],
            },
            children: [{ id: '0:3', name: 'Label', type: 'text', text: { characters: 'Continue' } }],
          },
          { id: '0:4', name: 'Hero image', type: 'image', assetId: 'image-hero' },
        ],
      },
    });

    const source = bundle.files.find((file) => file.kind === 'tsx')?.content;
    const styles = bundle.files.find((file) => file.kind === 'scss')?.content;
    expect(source).toContain('import { ForgeButton } from "@mission-platform/components";');
    expect(source).toContain('variant={"primary"}');
    expect(source).toContain('data-forge-layer="Hero image"');
    expect(source).toContain('src={"./assets/hero.png"}');
    expect(bundle.files).toContainEqual(expect.objectContaining({ path: 'assets/hero.png', kind: 'asset' }));
    expect(styles).toContain('display: flex;');
    expect(styles).toContain('background: var(--mp-button-primary-background);');
    expect(bundle.files.map((file) => file.path)).toMatchSnapshot();
  });

  it('reports unsupported effects without dropping the layer', () => {
    const bundle = generateForgeExportBundle({
      schemaVersion: 1,
      source: { nodeId: '0:1', name: 'Unsupported' },
      assets: [],
      diagnostics: [],
      root: {
        id: '0:1',
        name: 'Unsupported',
        type: 'frame',
        style: { effects: [{ kind: 'unknown' }] },
        children: [{ id: '0:2', name: 'Fallback', type: 'unknown' }],
      },
    });

    expect(bundle.diagnostics.some((diagnostic) => diagnostic.code === 'UNSUPPORTED_EFFECT')).toBe(true);
    expect(bundle.files.find((file) => file.kind === 'tsx')?.content).toContain('data-forge-layer="Fallback"');
  });

  it('aggregates mapped components that share an import path', () => {
    const bundle = generateForgeExportBundle({
      schemaVersion: 1,
      source: { nodeId: '0:1', name: 'Mapped components' },
      assets: [],
      diagnostics: [],
      root: {
        id: '0:1',
        name: 'Mapped components',
        type: 'frame',
        children: [
          {
            id: '0:2',
            name: 'Button',
            type: 'instance',
            component: { registryName: 'ForgeButton', confidence: 'explicit' },
          },
          {
            id: '0:3',
            name: 'Card',
            type: 'instance',
            component: { registryName: 'ForgeCard', confidence: 'explicit' },
          },
        ],
      },
    });

    const source = bundle.files.find((file) => file.kind === 'tsx')?.content;
    expect(source).toContain('import { ForgeButton, ForgeCard } from "@mission-platform/components";');
    expect(source).toContain('<ForgeButton ');
    expect(source).toContain('<ForgeCard ');
  });
});
