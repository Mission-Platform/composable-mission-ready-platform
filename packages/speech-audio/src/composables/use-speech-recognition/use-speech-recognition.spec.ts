import { describe, expect, it } from 'vitest';

import { useSpeechRecognition } from './use-speech-recognition';

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
});
