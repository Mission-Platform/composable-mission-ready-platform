import { describe, expect, it, vi } from 'vitest';

import { useThree } from './use-three';

describe('useThree', () => {
  it('does nothing when canvas is unavailable (SSR baseline)', () => {
    const canvasReference = { current: undefined };
    const onReady = vi.fn();
    useThree(canvasReference, onReady);
    expect(onReady).not.toHaveBeenCalled();
  });
});
