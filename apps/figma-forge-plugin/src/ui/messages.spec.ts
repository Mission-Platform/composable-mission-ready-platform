import { describe, expect, it } from 'vitest';

import { isForgeBridgeConfig, isForgePluginMainMessage, isTrustedForgePluginMessageEvent } from './messages';

const messageEvent = (source: MessageEventSource | null, origin: string) =>
  ({ source, origin }) as MessageEvent<unknown>;

describe('Forge Figma UI message security', () => {
  it('requires a non-empty authentication token while preserving the local bridge URL rules', () => {
    const config = {
      bridgeUrl: 'http://127.0.0.1:8787/export',
      authToken: 'test-token',
      repositoryRootId: 'repo',
      targetDirectory: 'components',
    };

    expect(isForgeBridgeConfig(config)).toBe(true);
    expect(isForgeBridgeConfig({ ...config, authToken: '' })).toBe(false);
    expect(isForgeBridgeConfig({ ...config, bridgeUrl: 'https://example.test/export' })).toBe(false);
  });

  it('requires the expected parent source and origin', () => {
    const parent = {} as WindowProxy;

    expect(isTrustedForgePluginMessageEvent(messageEvent(parent, 'https://www.figma.com'), parent)).toBe(true);
    expect(isTrustedForgePluginMessageEvent(messageEvent({}, 'https://www.figma.com'), parent)).toBe(false);
    expect(isTrustedForgePluginMessageEvent(messageEvent(parent, 'https://attacker.test'), parent)).toBe(false);
  });

  it('rejects malformed main-thread payloads', () => {
    expect(isForgePluginMainMessage({ type: 'selection-status', selectionCount: -1 })).toBe(false);
    expect(isForgePluginMainMessage({ type: 'bridge-config', config: { bridgeUrl: 'https://attacker.test' } })).toBe(
      false,
    );
    expect(isForgePluginMainMessage({ type: 'conversion-result', bundle: { files: 'not-an-array' } })).toBe(false);
    expect(
      isForgePluginMainMessage({
        type: 'conversion-result',
        bundle: { componentName: 'Button', files: [{ path: '../secret', kind: 'tsx', content: 'x' }], diagnostics: [] },
      }),
    ).toBe(false);
  });
});
