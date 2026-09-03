import { describe, expect, it } from 'vitest';

import { useMidi } from './use-midi';

describe('useMidi', () => {
  it('reports unsupported and no-ops when the Web MIDI API is unavailable (SSR baseline)', () => {
    const original = globalThis.navigator.requestMIDIAccess;
    // @ts-expect-error — force the unsupported branch.
    delete globalThis.navigator.requestMIDIAccess;

    try {
      const controls = useMidi();

      expect(controls.isSupported).toBe(false);
      expect(controls.isConnected).toBe(false);
      expect(controls.inputs).toEqual([]);
      expect(controls.outputs).toEqual([]);
      expect(controls.error).toBeUndefined();
      expect(() => {
        controls.requestAccess();
        controls.playNote(60);
      }).not.toThrow();
    } finally {
      if (original !== undefined) {
        globalThis.navigator.requestMIDIAccess = original;
      }
    }
  });
});
