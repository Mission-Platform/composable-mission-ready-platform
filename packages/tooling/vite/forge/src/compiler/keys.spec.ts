import { describe, expect, it } from 'vitest';

import {
  createForgeFingerprint,
  createForgeSemanticCacheKey,
  createForgeTargetCacheKey,
  stableSerialize,
} from './keys.js';

const source = {
  fileName: '/workspace/src/ForgeButton.tsx',
  moduleKind: 'component' as const,
  source: 'export const ForgeButton = () => <button />;',
  optimize: { hoistStatic: true },
};

describe('Forge cache keys', () => {
  it('serializes equivalent object inputs independently of insertion order', () => {
    expect(stableSerialize({ b: 2, a: 1 })).toBe(stableSerialize({ a: 1, b: 2 }));
    expect(createForgeFingerprint({ b: 2, a: 1 })).toBe(createForgeFingerprint({ a: 1, b: 2 }));
  });

  it('includes semantic options and target identity in cache keys', () => {
    const base = createForgeSemanticCacheKey(source).value;
    expect(createForgeSemanticCacheKey({ ...source, optimize: { hoistStatic: false } }).value).not.toBe(base);

    const react = createForgeTargetCacheKey({
      projectFingerprint: 'project',
      dependencyFingerprint: 'dependencies',
      targetId: 'react',
      targetVersion: '1',
      source,
    });
    expect(
      createForgeTargetCacheKey({
        projectFingerprint: 'project',
        dependencyFingerprint: 'dependencies',
        targetId: 'vue',
        targetVersion: '1',
        source,
      }),
    ).not.toBe(react);
    expect(
      createForgeTargetCacheKey({
        projectFingerprint: 'project',
        dependencyFingerprint: 'dependencies',
        targetId: 'react',
        targetVersion: '2',
        source,
      }),
    ).not.toBe(react);
  });
});
