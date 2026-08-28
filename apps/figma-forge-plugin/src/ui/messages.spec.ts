import { describe, expect, it } from 'vitest';

import { isForgePluginMainMessage, isTrustedForgePluginMessageEvent } from './messages';

const messageEvent = (source: MessageEventSource | null, origin: string) =>
  ({ source, origin }) as MessageEvent<unknown>;

describe('Forge Figma UI message security', () => {
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
