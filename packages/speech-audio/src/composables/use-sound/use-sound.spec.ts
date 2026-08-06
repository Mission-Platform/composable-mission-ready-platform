import { describe, expect, it } from 'vitest';

import { useSound } from './use-sound';

describe('useSound', () => {
  it('reports unsupported and no-ops when audio APIs are unavailable (SSR baseline)', () => {
    const originalAudio = globalThis.Audio;
    const originalContext = globalThis.AudioContext;
    // @ts-expect-error — force the unsupported branch.
    delete globalThis.Audio;
    // @ts-expect-error — force the unsupported branch.
    delete globalThis.AudioContext;

    try {
      const controls = useSound('/beep.mp3');

      expect(controls.isSupported).toBe(false);
      expect(controls.isPlaying).toBe(false);
      expect(() => {
        controls.play();
        controls.stop();
        controls.playTone(440);
      }).not.toThrow();
    } finally {
      if (originalAudio !== undefined) {
        globalThis.Audio = originalAudio;
      }
      if (originalContext !== undefined) {
        globalThis.AudioContext = originalContext;
      }
    }
  });

  it('can be constructed without a src', () => {
    const controls = useSound();
    expect(controls.isPlaying).toBe(false);
    expect(() => controls.play()).not.toThrow();
  });
});
