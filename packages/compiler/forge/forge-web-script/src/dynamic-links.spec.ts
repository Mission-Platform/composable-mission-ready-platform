import { describe, expect, it } from 'vitest';

import { ForgeWebScriptDynamicLinkCache } from './dynamic-links.ts';

const binding = {
  moduleId: 'decoder',
  alias: 'decoder',
  exports: [{ name: 'decode', parameters: [], result: 'i32' as const }],
};

describe('Forge Web Script dynamic link cache', () => {
  it('loads a module once and invalidates handles by artifact identity', async () => {
    const cache = new ForgeWebScriptDynamicLinkCache();
    let loads = 0;
    const loader = () => {
      loads += 1;
      return { exports: { decode: () => loads }, signatures: { decode: '->i32:' } };
    };
    const identity = { artifactId: 'scanner-a', manifestHash: 'manifest-a' };

    const first = await cache.resolveExport(identity, binding, 'decode', loader);
    const second = await cache.resolveExport(identity, binding, 'decode', loader);
    expect(first).toBe(second);
    expect(loads).toBe(1);

    cache.invalidate(identity);
    const third = await cache.resolveExport(identity, binding, 'decode', loader);
    expect(third).not.toBe(first);
    expect(loads).toBe(2);
  });

  it('reports incompatible ABI signatures before dispatch', () => {
    const cache = new ForgeWebScriptDynamicLinkCache();
    expect(() =>
      cache.resolveExportSync({ artifactId: 'scanner-a', manifestHash: 'manifest-a' }, binding, 'decode', () => ({
        exports: { decode: () => 1 },
        signatures: { decode: 'i64->i32:' },
      })),
    ).toThrow(/incompatible signature/);
    expect(cache.diagnostics).toHaveLength(1);
    expect(cache.diagnostics[0]?.code).toBe('FWS-LINK-006');
  });
});
