import { describe, expect, it } from 'vitest';

import { extractFigmaDocument } from './extract';
import { validateFigmaSelection } from './selection';

import type { FigmaNode } from './types';

describe('Figma extraction', () => {
  it('validates actionable root selection errors', () => {
    expect(validateFigmaSelection([]).error).toContain('exactly one');
    expect(
      validateFigmaSelection([
        { id: '1', name: 'A', type: 'FRAME' },
        { id: '2', name: 'B', type: 'FRAME' },
      ]).error,
    ).toContain('only one');
    expect(validateFigmaSelection([{ id: '1', name: 'Text', type: 'TEXT' }]).error).toContain('supported root');
  });

  it('extracts hierarchy, layout, mappings, tokens, fallbacks, and image assets', async () => {
    const root: FigmaNode = {
      id: '1:1',
      name: 'Checkout',
      type: 'FRAME',
      width: 320,
      height: 100,
      layoutMode: 'HORIZONTAL',
      itemSpacing: 12,
      paddingTop: 8,
      paddingRight: 8,
      paddingBottom: 8,
      paddingLeft: 8,
      primaryAxisAlignItems: 'SPACE_BETWEEN',
      counterAxisAlignItems: 'CENTER',
      boundVariables: { itemSpacing: { type: 'VARIABLE_ALIAS', id: 'spacing' } },
      children: [
        {
          id: '1:2',
          name: 'Button instance',
          type: 'INSTANCE',
          mainComponent: { name: 'ForgeButton' },
          componentProperties: { variant: { type: 'VARIANT', value: 'primary' } },
          children: [{ id: '1:3', name: 'Label', type: 'TEXT', characters: 'Continue' }],
        },
        {
          id: '1:4',
          name: 'Hero',
          type: 'RECTANGLE',
          fills: [{ type: 'IMAGE', imageReference: 'hero-ref' }],
        },
        { id: '1:5', name: 'Vector fallback', type: 'VECTOR' },
      ],
    };
    const document = await extractFigmaDocument(root, {
      resolveVariable: (id) =>
        id === 'spacing'
          ? {
              name: 'Spacing',
              alias: 'component.layout.gap',
              collection: 'Mission Platform / Component',
              mode: 'Light',
              resolvedValue: 12,
            }
          : undefined,
      loadImage: async () => ({ content: new Uint8Array([1, 2, 3]), mimeType: 'image/png', width: 10, height: 10 }),
    });

    expect(document.root.layout).toMatchObject({
      mode: 'horizontal',
      gap: 12,
      justify: 'space-between',
      align: 'center',
    });
    expect(document.root.style?.tokens?.itemSpacing?.cssVariable).toBe('--mp-layout-gap');
    expect(document.root.children?.[0].component).toMatchObject({
      registryName: 'ForgeButton',
      confidence: 'explicit',
    });
    expect(document.root.children?.[0].text).toBeUndefined();
    expect(document.assets).toHaveLength(1);
    expect(document.root.children?.[1].assetId).toBe('image-hero-ref');
    expect(document.diagnostics.some((diagnostic) => diagnostic.code === 'UNSUPPORTED_NODE')).toBe(true);
  });
});
