import { describe, expect, it, vi } from 'vitest';

import { useMidi } from './use-midi';

const lifecycle = vi.hoisted(() => ({ cleanup: undefined as (() => void) | undefined }));
const noopResolve = (_access: MIDIAccess | PromiseLike<MIDIAccess>): void => {};

vi.mock('@mission-platform/forge', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mission-platform/forge')>();
  return {
    ...actual,
    useEffect: (effect: () => void | (() => void)): void => {
      lifecycle.cleanup = effect() ?? undefined;
    },
  };
});

function createAccess() {
  return {
    addEventListener: vi.fn(),
    inputs: new Map(),
    outputs: new Map(),
    removeEventListener: vi.fn(),
  } as unknown as MIDIAccess;
}

describe('useMidi lifecycle', () => {
  it('registers only one statechange listener across repeated access requests and removes it on unmount', async () => {
    const original = globalThis.navigator.requestMIDIAccess;
    const access = createAccess();
    globalThis.navigator.requestMIDIAccess = vi.fn().mockResolvedValue(access);

    try {
      const controls = useMidi();
      controls.requestAccess();
      controls.requestAccess();
      await vi.waitFor(() => expect(access.addEventListener).toHaveBeenCalledOnce());

      lifecycle.cleanup?.();

      expect(access.removeEventListener).toHaveBeenCalledWith('statechange', expect.any(Function));
      expect(access.removeEventListener).toHaveBeenCalledOnce();
    } finally {
      if (original === undefined) {
        // @ts-expect-error — restore the SSR-style absent API.
        delete globalThis.navigator.requestMIDIAccess;
      } else {
        globalThis.navigator.requestMIDIAccess = original;
      }
      lifecycle.cleanup = undefined;
    }
  });

  it('does not attach a listener when access resolves after unmount', async () => {
    const original = globalThis.navigator.requestMIDIAccess;
    let resolveAccess = noopResolve;
    const accessPromise = new Promise<MIDIAccess>((resolve) => {
      resolveAccess = resolve;
    });
    const access = createAccess();
    globalThis.navigator.requestMIDIAccess = vi.fn().mockReturnValue(accessPromise);

    try {
      const controls = useMidi();
      controls.requestAccess();
      lifecycle.cleanup?.();
      resolveAccess(access);
      await Promise.resolve();

      expect(access.addEventListener).not.toHaveBeenCalled();
    } finally {
      if (original === undefined) {
        // @ts-expect-error — restore the SSR-style absent API.
        delete globalThis.navigator.requestMIDIAccess;
      } else {
        globalThis.navigator.requestMIDIAccess = original;
      }
      lifecycle.cleanup = undefined;
    }
  });
});
