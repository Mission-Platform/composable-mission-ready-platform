import { describe, expect, it } from 'vitest';

import { convertCurrentSelection, createHostImageLoader, createHostVariableResolver, startForgePlugin } from './code';

import type { FigmaNode, FigmaSelectionHost } from './extractor';

describe('Forge plugin messaging', () => {
  it('persists bridge configuration and unwraps Figma UI messages', async () => {
    const posted: unknown[] = [];
    const storage = new Map<string, unknown>();
    let selectionCallback: (() => void) | undefined;
    let selection: readonly [{ readonly id: string; readonly name: string; readonly type: string }] = [
      { id: '1:1', name: 'Checkout', type: 'FRAME' },
    ];
    const host: FigmaSelectionHost = {
      currentPage: {
        get selection() {
          return selection;
        },
      },
      ui: {
        postMessage: (message) => posted.push(message),
      },
      showUI: () => {},
      onSelectionChange: (callback) => {
        selectionCallback = callback;
      },
      clientStorage: {
        getAsync: async (key) => storage.get(key),
        setAsync: async (key, value) => {
          storage.set(key, value);
        },
      },
    };

    startForgePlugin(host, '<html />');
    expect(posted[0]).toEqual({ type: 'selection-status', selectionCount: 1 });
    await host.ui.onmessage?.({ pluginMessage: { type: 'request-selection-status' } });
    expect(posted[1]).toEqual({ type: 'selection-status', selectionCount: 1 });
    selection = [] as never as typeof selection;
    selectionCallback?.();
    expect(posted[2]).toEqual({ type: 'selection-status', selectionCount: 0 });

    const config = {
      bridgeUrl: 'http://localhost:8787/export',
      authToken: 'test-token',
      repositoryRootId: 'repo',
      targetDirectory: 'components',
    } as const;
    await host.ui.onmessage?.({ pluginMessage: { type: 'set-bridge-config', config } });
    expect(storage.size).toBe(1);
    expect(posted.at(-1)).toEqual({ type: 'bridge-config-saved', config });

    await host.ui.onmessage?.({ pluginMessage: { type: 'get-bridge-config' } });
    expect(posted.at(-1)).toEqual({ type: 'bridge-config', config });
  });

  it('wires host getImageByHash to resolve native image bytes during conversion', async () => {
    const node: FigmaNode = {
      id: '1:1',
      name: 'HeroImage',
      type: 'FRAME',
      fills: [{ type: 'IMAGE', imageHash: 'native-sha1-hash' }],
    };
    const host: FigmaSelectionHost = {
      currentPage: { selection: [node] },
      ui: { postMessage: () => {} },
      showUI: () => {},
      getImageByHash: (hash: string) => {
        expect(hash).toBe('native-sha1-hash');
        return {
          getBytesAsync: async () => new Uint8Array([10, 20, 30]),
        };
      },
    };

    const loader = createHostImageLoader(host);
    expect(loader).toBeDefined();
    const loadedBytes = await loader?.('native-sha1-hash', node);
    expect(loadedBytes?.content).toEqual(new Uint8Array([10, 20, 30]));

    const result = await convertCurrentSelection(host);
    expect(result.error).toBeUndefined();
    const assetFiles = result.bundle?.files.filter((file) => file.kind === 'asset') ?? [];
    expect(assetFiles).toHaveLength(1);
    expect(assetFiles[0].path).toBe('assets/image-native-sha1-hash.png');
    expect(assetFiles[0].content).toEqual(new Uint8Array([10, 20, 30]));
  });

  it('wires host variables API to resolve design variables and aliases', async () => {
    const node: FigmaNode = {
      id: '1:1',
      name: 'TokenCard',
      type: 'FRAME',
      layoutMode: 'HORIZONTAL',
      itemSpacing: 16,
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }],
      boundVariables: {
        itemSpacing: { type: 'VARIABLE_ALIAS', id: 'var-spacing' },
        fill: { type: 'VARIABLE_ALIAS', id: 'var-fill-alias' },
      },
    };
    const host: FigmaSelectionHost = {
      currentPage: { selection: [node] },
      ui: { postMessage: () => {} },
      showUI: () => {},
      variables: {
        getVariableById: (id: string) => {
          if (id === 'var-spacing') {
            return {
              id: 'var-spacing',
              name: 'component.layout.gap',
              variableCollectionId: 'col-1',
              valuesByMode: { 'mode-1': 16 },
            };
          }
          if (id === 'var-fill-alias') {
            return {
              id: 'var-fill-alias',
              name: 'local-fill-token',
              variableCollectionId: 'col-1',
              valuesByMode: {
                'mode-1': { type: 'VARIABLE_ALIAS', id: 'var-resolved-fill' },
              },
            };
          }
          if (id === 'var-resolved-fill') {
            return {
              id: 'var-resolved-fill',
              name: 'component.button.background',
            };
          }
          return;
        },
        getVariableCollectionById: (id: string) => {
          if (id === 'col-1') {
            return {
              id: 'col-1',
              name: 'Mission Platform / Component',
              defaultModeId: 'mode-1',
              modes: [{ modeId: 'mode-1', name: 'Light' }],
            };
          }
          return;
        },
      },
    };

    const resolver = createHostVariableResolver(host);
    expect(resolver).toBeDefined();
    const resolvedSpacing = resolver?.('var-spacing');
    expect(resolvedSpacing).toMatchObject({
      name: 'component.layout.gap',
      collection: 'Mission Platform / Component',
      resolvedValue: 16,
    });

    const result = await convertCurrentSelection(host);
    expect(result.error).toBeUndefined();
    const scssFile = result.bundle?.files.find((file) => file.kind === 'scss');
    expect(scssFile?.content).toContain('--mp-layout-gap');
    expect(scssFile?.content).toContain('--mp-button-background');
  });

  it('emits MISSING_VARIABLE_RESOLVER when host lacks variable resolution API', async () => {
    const node: FigmaNode = {
      id: '1:1',
      name: 'NoResolverCard',
      type: 'FRAME',
      boundVariables: {
        itemSpacing: { type: 'VARIABLE_ALIAS', id: 'unresolved-var' },
      },
    };
    const host: FigmaSelectionHost = {
      currentPage: { selection: [node] },
      ui: { postMessage: () => {} },
      showUI: () => {},
    };

    const result = await convertCurrentSelection(host);
    expect(result.error).toBeUndefined();
    const diagnostic = result.bundle?.diagnostics.find((item) => item.code === 'MISSING_VARIABLE_RESOLVER');
    expect(diagnostic).toBeDefined();
    expect(diagnostic?.nodeName).toBe('NoResolverCard');
  });

  it('converts selection automatically when receiving convert UI message with native host wiring', async () => {
    const posted: unknown[] = [];
    const node: FigmaNode = {
      id: '1:1',
      name: 'NativeFigmaCard',
      type: 'FRAME',
      fills: [{ type: 'IMAGE', imageHash: 'ui-hash-456' }],
    };
    const host: FigmaSelectionHost = {
      currentPage: { selection: [node] },
      ui: {
        postMessage: (message) => posted.push(message),
      },
      showUI: () => {},
      getImageByHash: (hash: string) => {
        expect(hash).toBe('ui-hash-456');
        return {
          getBytesAsync: async () => new Uint8Array([7, 8, 9]),
        };
      },
    };

    startForgePlugin(host, '<html />');
    await host.ui.onmessage?.({ pluginMessage: { type: 'convert' } });

    const conversionMessage = posted.find(
      (message): message is { type: 'conversion-result'; bundle?: unknown } =>
        typeof message === 'object' && message !== null && (message as { type?: string }).type === 'conversion-result',
    );
    expect(conversionMessage).toBeDefined();
    expect(conversionMessage?.bundle).toBeDefined();
  });

  it('echoes requestId back on conversion responses for both success and error', async () => {
    const posted: unknown[] = [];
    const node: FigmaNode = {
      id: '1:1',
      name: 'Card',
      type: 'FRAME',
    };
    let currentSelection: readonly FigmaNode[] = [node];
    const host: FigmaSelectionHost = {
      currentPage: {
        get selection() {
          return currentSelection;
        },
      },
      ui: {
        postMessage: (message) => posted.push(message),
      },
      showUI: () => {},
    };

    startForgePlugin(host, '<html />');

    // Success response with requestId
    await host.ui.onmessage?.({ pluginMessage: { type: 'convert', requestId: 'req-success-1' } });
    const successMessage = posted.find(
      (message): message is { type: 'conversion-result'; requestId?: string; bundle?: unknown } =>
        typeof message === 'object' &&
        message !== null &&
        (message as { type?: string }).type === 'conversion-result' &&
        (message as { requestId?: string }).requestId === 'req-success-1',
    );
    expect(successMessage).toBeDefined();
    expect(successMessage?.requestId).toBe('req-success-1');
    expect(successMessage?.bundle).toBeDefined();

    // Error response with requestId when selection is invalid (0 selected)
    currentSelection = [];
    await host.ui.onmessage?.({ pluginMessage: { type: 'convert', requestId: 'req-error-2' } });
    const errorMessage = posted.find(
      (message): message is { type: 'conversion-result'; requestId?: string; error?: string } =>
        typeof message === 'object' &&
        message !== null &&
        (message as { type?: string }).type === 'conversion-result' &&
        (message as { requestId?: string }).requestId === 'req-error-2',
    );
    expect(errorMessage).toBeDefined();
    expect(errorMessage?.requestId).toBe('req-error-2');
    expect(errorMessage?.error).toBeDefined();
  });
});
