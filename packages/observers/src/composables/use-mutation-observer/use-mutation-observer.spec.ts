import { describe, expect, it, vi } from 'vitest';

import { useMutationObserver } from './use-mutation-observer';

describe('useMutationObserver', () => {
  it('does nothing when MutationObserver is unavailable (SSR baseline)', () => {
    const callback = vi.fn();
    const target = { current: undefined };
    // @ts-expect-error
    const original = globalThis.MutationObserver;
    // @ts-expect-error
    delete globalThis.MutationObserver;

    try {
      useMutationObserver(target, callback);
      expect(callback).not.toHaveBeenCalled();
    } finally {
      globalThis.MutationObserver = original;
    }
  });
});
