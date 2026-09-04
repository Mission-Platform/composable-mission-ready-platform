import { describe, expect, it, vi } from 'vitest';

import { useSpeechRecognition } from './use-speech-recognition';

const lifecycle = vi.hoisted(() => ({ cleanup: undefined as (() => void) | undefined }));

vi.mock('@mission-platform/forge-jsx', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mission-platform/forge-jsx')>();
  return {
    ...actual,
    useEffect: (effect: () => void | (() => void)): void => {
      lifecycle.cleanup = effect() ?? undefined;
    },
  };
});

function throwOnStart(): void {
  throw new Error('start failed');
}

describe('useSpeechRecognition', () => {
  it('reports unsupported and no-ops when SpeechRecognition is unavailable (SSR baseline)', () => {
    const controls = useSpeechRecognition();

    expect(controls.isSupported).toBe(false);
    expect(controls.isListening).toBe(false);
    expect(controls.transcript).toBe('');
    expect(controls.error).toBeUndefined();
    expect(() => {
      controls.start();
      controls.stop();
      controls.abort();
    }).not.toThrow();
  });

  it('handles a synchronous start failure and aborts the failed instance during cleanup', () => {
    const originalWindow = globalThis.window;
    const recognitions: ThrowingSpeechRecognition[] = [];

    class ThrowingSpeechRecognition extends EventTarget {
      lang = '';
      continuous = false;
      interimResults = false;
      maxAlternatives = 1;
      start = vi.fn(throwOnStart);
      stop = vi.fn();
      abort = vi.fn();

      constructor() {
        super();
        recognitions.push(this);
      }
    }

    globalThis.window = { SpeechRecognition: ThrowingSpeechRecognition } as unknown as Window & typeof globalThis;

    try {
      const controls = useSpeechRecognition();

      expect(controls.isSupported).toBe(true);
      expect(() => controls.start()).not.toThrow();
      const recognition = recognitions[0];
      expect(recognition?.start).toHaveBeenCalledOnce();

      lifecycle.cleanup?.();

      expect(recognition?.abort).toHaveBeenCalledOnce();
    } finally {
      if (originalWindow === undefined) {
        // @ts-expect-error — restore the SSR-style absent API.
        delete globalThis.window;
      } else {
        globalThis.window = originalWindow;
      }
      lifecycle.cleanup = undefined;
    }
  });
});
