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

  it('extracts native Figma imageHash paints and resolves image bytes', async () => {
    const root: FigmaNode = {
      id: '2:1',
      name: 'ImageCard',
      type: 'FRAME',
      fills: [{ type: 'IMAGE', imageHash: 'native-hash-123' }],
    };
    const document = await extractFigmaDocument(root, {
      loadImage: async (imageIdentifier) => {
        expect(imageIdentifier).toBe('native-hash-123');
        return { content: new Uint8Array([4, 5, 6]), mimeType: 'image/png' };
      },
    });

    expect(document.assets).toHaveLength(1);
    expect(document.assets[0].id).toBe('image-native-hash-123');
    expect(document.assets[0].fileName).toBe('image-native-hash-123.png');
    expect(document.root.assetId).toBe('image-native-hash-123');
    expect(document.root.style?.fills?.[0]).toMatchObject({
      kind: 'image',
      assetId: 'image-native-hash-123',
    });
  });

  it('resolves multiple distinct image fills with individual asset IDs', async () => {
    const root: FigmaNode = {
      id: '3:1',
      name: 'MultiImageLayer',
      type: 'FRAME',
      fills: [
        { type: 'IMAGE', imageHash: 'hash-background' },
        { type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 0.5 } },
        { type: 'IMAGE', imageReference: 'ref-foreground' },
      ],
    };
    const loadedIdentifiers: string[] = [];
    const document = await extractFigmaDocument(root, {
      loadImage: async (imageIdentifier) => {
        loadedIdentifiers.push(imageIdentifier);
        return {
          content: new Uint8Array([1, 2]),
          mimeType: 'image/png',
        };
      },
    });

    expect(loadedIdentifiers).toEqual(['hash-background', 'ref-foreground']);
    expect(document.assets).toHaveLength(2);
    expect(document.root.assetId).toBe('image-hash-background');
    expect(document.root.style?.fills).toHaveLength(3);
    expect(document.root.style?.fills?.[0]).toMatchObject({
      kind: 'image',
      assetId: 'image-hash-background',
    });
    expect(document.root.style?.fills?.[1]).toMatchObject({
      kind: 'solid',
    });
    expect(document.root.style?.fills?.[2]).toMatchObject({
      kind: 'image',
      assetId: 'image-ref-foreground',
    });
  });

  it('emits MISSING_VARIABLE_RESOLVER diagnostic when bound variables exist without a resolver', async () => {
    const root: FigmaNode = {
      id: '4:1',
      name: 'TokenCard',
      type: 'FRAME',
      boundVariables: {
        itemSpacing: { type: 'VARIABLE_ALIAS', id: 'var-spacing-99' },
      },
    };

    const documentWithoutResolver = await extractFigmaDocument(root);
    const resolverDiagnostic = documentWithoutResolver.diagnostics.find(
      (diagnostic) => diagnostic.code === 'MISSING_VARIABLE_RESOLVER',
    );

    expect(resolverDiagnostic).toBeDefined();
    expect(resolverDiagnostic).toMatchObject({
      code: 'MISSING_VARIABLE_RESOLVER',
      severity: 'warning',
      feature: 'token',
      nodeId: '4:1',
      nodeName: 'TokenCard',
    });

    const rootWithoutBindings: FigmaNode = {
      id: '4:2',
      name: 'PlainCard',
      type: 'FRAME',
    };
    const documentWithoutBindings = await extractFigmaDocument(rootWithoutBindings);
    expect(
      documentWithoutBindings.diagnostics.some((diagnostic) => diagnostic.code === 'MISSING_VARIABLE_RESOLVER'),
    ).toBe(false);
  });
});
