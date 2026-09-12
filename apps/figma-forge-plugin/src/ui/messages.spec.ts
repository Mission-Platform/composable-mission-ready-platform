import { describe, expect, it } from 'vitest';

import {
  generateRequestId,
  isForgeBridgeConfig,
  isForgePluginMainMessage,
  isForgePluginUiMessage,
  isTrustedForgePluginMessageEvent,
  isValidRequestId,
} from './messages';

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
    expect(isTrustedForgePluginMessageEvent(messageEvent({} as WindowProxy, 'https://www.figma.com'), parent)).toBe(
      false,
    );
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

  it('validates requestId in main-thread conversion results', () => {
    const validResult = {
      type: 'conversion-result',
      requestId: 'req-valid-123',
      bundle: { componentName: 'Button', files: [], diagnostics: [] },
    };

    expect(isForgePluginMainMessage(validResult)).toBe(true);
    expect(isForgePluginMainMessage({ ...validResult, requestId: '' })).toBe(false);
    expect(isForgePluginMainMessage({ ...validResult, requestId: 123 })).toBe(false);
    expect(isForgePluginMainMessage({ ...validResult, requestId: 'x'.repeat(129) })).toBe(false);
  });

  it('validates UI messages including optional requestId on convert', () => {
    expect(isForgePluginUiMessage({ type: 'convert' })).toBe(true);
    expect(isForgePluginUiMessage({ type: 'convert', requestId: 'req-456' })).toBe(true);
    expect(isForgePluginUiMessage({ type: 'convert', requestId: '' })).toBe(false);
    expect(isForgePluginUiMessage({ type: 'convert', requestId: 123 })).toBe(false);
    expect(isForgePluginUiMessage({ type: 'convert', requestId: 'y'.repeat(129) })).toBe(false);

    expect(isForgePluginUiMessage({ type: 'get-bridge-config' })).toBe(true);
    expect(isForgePluginUiMessage({ type: 'request-selection-status' })).toBe(true);
    expect(
      isForgePluginUiMessage({
        type: 'set-bridge-config',
        config: {
          bridgeUrl: 'http://127.0.0.1:8787/export',
          authToken: 'token',
          repositoryRootId: 'root',
          targetDirectory: 'components',
        },
      }),
    ).toBe(true);
    expect(isForgePluginUiMessage({ type: 'set-bridge-config', config: { bridgeUrl: 'bad' } })).toBe(false);
    expect(isForgePluginUiMessage({ type: 'unknown' })).toBe(false);
    expect(isForgePluginUiMessage()).toBe(false);
    expect(isForgePluginUiMessage('convert')).toBe(false);
  });

  it('validates requestId format and uniqueness with generateRequestId', () => {
    expect(isValidRequestId('valid-id')).toBe(true);
    expect(isValidRequestId('')).toBe(false);
    expect(isValidRequestId('z'.repeat(129))).toBe(false);
    expect(isValidRequestId(123)).toBe(false);
    expect(isValidRequestId()).toBe(false);

    const id1 = generateRequestId();
    const id2 = generateRequestId();
    expect(isValidRequestId(id1)).toBe(true);
    expect(isValidRequestId(id2)).toBe(true);
    expect(id1).not.toBe(id2);
  });
});
