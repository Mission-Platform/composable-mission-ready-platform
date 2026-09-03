import { describe, expect, it } from 'vitest';

import { startForgePlugin } from './code';

import type { FigmaSelectionHost } from './extractor';

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
});
