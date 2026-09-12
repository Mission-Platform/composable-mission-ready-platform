import { describe, expect, it, vi } from 'vitest';

import { createForgeBuildSession } from './session.js';

import type { ForgeCompilerService } from './service.js';

function fakeService(): ForgeCompilerService & {
  prepare: ReturnType<typeof vi.fn>;
  report: ReturnType<typeof vi.fn>;
  invalidate: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
} {
  return {
    prepare: vi.fn((input) => ({ ...input, fingerprint: 'fixture' })),
    report: vi.fn(() => ({ artifacts: [], affectedFiles: [] })),
    invalidate: vi.fn((changedFiles: readonly string[]) => ({
      changedFiles,
      invalidatedFiles: changedFiles,
      invalidatedEntries: changedFiles.length,
    })),
    dispose: vi.fn(),
  } as unknown as ForgeCompilerService & {
    prepare: ReturnType<typeof vi.fn>;
    report: ReturnType<typeof vi.fn>;
    invalidate: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
  };
}

describe('Forge build session', () => {
  it('prepares and generates targets lazily while deduplicating concurrent work', async () => {
    const service = fakeService();
    let resolveGeneration: ((entry: string) => void) | undefined;
    const generate = vi.fn(() => new Promise<string>((resolve) => (resolveGeneration = resolve)));
    const session = createForgeBuildSession({ service });
    const target = {
      targetId: 'react',
      kind: 'component' as const,
      entryModule: '/workspace/src/components/index.ts',
      generate,
    };

    expect(service.prepare).not.toHaveBeenCalled();
    const firstPreparation = session.prepare({ rootDir: '/workspace', targets: [target] });
    await firstPreparation;
    expect(service.prepare).toHaveBeenCalledOnce();
    expect(generate).not.toHaveBeenCalled();

    const first = session.ensureTarget(target);
    const second = session.ensureTarget(target);
    resolveGeneration?.('/workspace/.forge/react.ts');
    await expect(first).resolves.toMatchObject({ targetId: 'react', entry: '/workspace/.forge/react.ts' });
    await expect(second).resolves.toMatchObject({ targetId: 'react', entry: '/workspace/.forge/react.ts' });
    await expect(session.ensureTarget(target)).resolves.toMatchObject({ cache: { hit: true } });
    expect(generate).toHaveBeenCalledOnce();
  });

  it('invalidates target results and disposes the service only if owned', async () => {
    const service = fakeService();
    const session = createForgeBuildSession({ service });
    const target = {
      targetId: 'vue',
      kind: 'hook' as const,
      entryModule: '/workspace/src/index.ts',
      generate: vi.fn(async () => '/workspace/.forge/vue.ts'),
    };

    await session.ensureTarget(target);
    expect(session.invalidate(['/workspace/src/helper.ts'])).toMatchObject({ invalidatedEntries: 1 });
    await session.ensureTarget(target);
    expect(target.generate).toHaveBeenCalledTimes(2);

    await Promise.all([session.dispose(), session.dispose()]);
    expect(service.dispose).not.toHaveBeenCalled();
    await expect(session.ensureTarget(target)).rejects.toThrow('disposed');
  });
});
