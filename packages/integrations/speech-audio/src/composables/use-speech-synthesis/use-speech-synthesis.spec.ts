import { describe, expect, it } from 'vitest';

import { useSpeechSynthesis } from './use-speech-synthesis';

describe('useSpeechSynthesis', () => {
  it('reports unsupported and no-ops when SpeechSynthesis is unavailable (SSR baseline)', () => {
    const original = globalThis.speechSynthesis;
    // @ts-expect-error — force the unsupported branch.
    delete globalThis.speechSynthesis;

    try {
      const controls = useSpeechSynthesis();

      expect(controls.isSupported).toBe(false);
      expect(controls.isSpeaking).toBe(false);
      expect(controls.isPaused).toBe(false);
      expect(controls.voices).toEqual([]);
      expect(() => {
        controls.speak('hello');
        controls.pause();
        controls.resume();
        controls.cancel();
      }).not.toThrow();
    } finally {
      if (original !== undefined) {
        globalThis.speechSynthesis = original;
      }
    }
  });
});
