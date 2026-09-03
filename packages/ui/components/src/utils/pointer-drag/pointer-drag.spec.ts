import { afterEach, describe, expect, it, vi } from 'vitest';

import { beginPointerDrag, clamp, rootFontSize } from './pointer-drag';

describe('pointer-drag helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('clamps values into an inclusive range', () => {
    expect(clamp(3, 0, 5)).toBe(3);
    expect(clamp(-2, 0, 5)).toBe(0);
    expect(clamp(9, 0, 5)).toBe(5);
  });

  it('reads the document root font size, defaulting to 16', () => {
    expect(rootFontSize()).toBeGreaterThan(0);

    vi.spyOn(globalThis, 'getComputedStyle').mockReturnValue({ fontSize: '20px' } as CSSStyleDeclaration);
    expect(rootFontSize()).toBe(20);

    vi.spyOn(globalThis, 'getComputedStyle').mockReturnValue({ fontSize: '0px' } as CSSStyleDeclaration);
    expect(rootFontSize()).toBe(16);
  });

  it('tracks pointer moves on window and disposes listeners on end', () => {
    const onMove = vi.fn();
    const onEnd = vi.fn();
    const addSpy = vi.spyOn(globalThis, 'addEventListener');
    const removeSpy = vi.spyOn(globalThis, 'removeEventListener');

    const dispose = beginPointerDrag({ onMove, onEnd });

    expect(addSpy).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('pointerup', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('pointercancel', expect.any(Function));

    const moveHandler = addSpy.mock.calls.find((call) => call[0] === 'pointermove')?.[1] as EventListener;
    const endHandler = addSpy.mock.calls.find((call) => call[0] === 'pointerup')?.[1] as EventListener;

    const moveEvent = new Event('pointermove') as PointerEvent;
    moveHandler(moveEvent);
    expect(onMove).toHaveBeenCalledWith(moveEvent);

    const endEvent = new Event('pointerup') as PointerEvent;
    endHandler(endEvent);
    expect(onEnd).toHaveBeenCalledWith(endEvent);
    expect(removeSpy).toHaveBeenCalledWith('pointermove', moveHandler);
    expect(removeSpy).toHaveBeenCalledWith('pointerup', endHandler);
    expect(removeSpy).toHaveBeenCalledWith('pointercancel', endHandler);

    // Disposing again is safe (listeners already removed).
    dispose();
  });

  it('returns a no-op disposer when window is unavailable', () => {
    const original = globalThis.window;
    // @ts-expect-error — simulate SSR
    delete globalThis.window;
    try {
      const dispose = beginPointerDrag({ onMove: () => {} });
      expect(() => dispose()).not.toThrow();
    } finally {
      globalThis.window = original;
    }
  });
});
