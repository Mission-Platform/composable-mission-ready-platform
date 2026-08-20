import { describe, expect, it, vi } from 'vitest';

import { forgeServiceLifecyclePlugin } from './build-integration';

import type { ForgeCompilerService } from './compiler/service';

function fakeService(): ForgeCompilerService & {
  invalidate: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
} {
  return {
    invalidate: vi.fn(() => ({ changedFiles: [], invalidatedFiles: [], invalidatedEntries: 0 })),
    dispose: vi.fn(),
  } as unknown as ForgeCompilerService & {
    invalidate: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
  };
}

function invokeHook(hook: unknown, receiver: object, ...args: unknown[]): void | Promise<unknown> {
  const handler =
    typeof hook === 'function'
      ? hook
      : hook !== null && typeof hook === 'object' && 'handler' in hook
        ? hook.handler
        : undefined;
  if (typeof handler !== 'function') return;
  return Reflect.apply(handler, receiver, args);
}

describe('Forge Vite compiler service lifecycle', () => {
  it('invalidates changed files and disposes an owned one-shot service', async () => {
    const service = fakeService();
    const plugin = forgeServiceLifecyclePlugin({ service, disposeService: true });

    await invokeHook(plugin.handleHotUpdate, plugin, { file: '/workspace/src/button.tsx' });
    await invokeHook(plugin.closeBundle, plugin);

    expect(service.invalidate).toHaveBeenCalledWith(['/workspace/src/button.tsx']);
    expect(service.dispose).toHaveBeenCalledOnce();
  });

  it('keeps an owned service alive across watch rebuilds', async () => {
    const service = fakeService();
    const plugin = forgeServiceLifecyclePlugin({ service, disposeService: true });

    await invokeHook(plugin.configResolved, plugin, { command: 'serve', server: { watch: {} } });
    await invokeHook(plugin.closeBundle, plugin);

    expect(service.dispose).not.toHaveBeenCalled();
  });
});
