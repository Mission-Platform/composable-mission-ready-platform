import { type MpRef, useEffect, useRef, useState } from '@mission-platform/forge';

/** Reactive state and controls returned by {@link useSound}. */
export interface SoundControls {
  /** Whether the browser exposes an audio playback API. */
  isSupported: boolean;
  /** Whether the `source` clip is currently playing. */
  isPlaying: boolean;
  /** Play the configured `source` clip from the start. No-op when no `source` is set. */
  play: () => void;
  /** Stop the `source` clip and reset it to the start. */
  stop: () => void;
  /**
   * Synthesize and play a short tone via the Web Audio API.
   *
   * @param frequency Tone frequency in hertz.
   * @param durationMs Tone duration in milliseconds (default 200).
   * @param type Oscillator wave shape (default `sine`).
   */
  playTone: (frequency: number, durationMs?: number, type?: OscillatorType) => void;
}

/**
 * Framework-neutral sound playback hook. Plays an audio clip from `source` via
 * an `HTMLAudioElement` and can synthesize short tones via the Web Audio API.
 *
 * SSR-safe: `isSupported` is `false` and every control is a no-op when the
 * relevant browser API or DOM is unavailable.
 * Automatic cleanup: playback is stopped and any audio context is closed on
 * unmount.
 */
export function useSound(source?: string): SoundControls {
  const isSupported =
    globalThis.window !== undefined && (typeof Audio !== 'undefined' || typeof AudioContext !== 'undefined');

  const [isPlaying, setIsPlaying] = useState(false);
  const audio: MpRef<HTMLAudioElement | undefined> = useRef<HTMLAudioElement | undefined>(undefined);
  const context: MpRef<AudioContext | undefined> = useRef<AudioContext | undefined>(undefined);

  const ensureContext = (): AudioContext | undefined => {
    if (globalThis.window === undefined || typeof AudioContext === 'undefined') {
      return undefined;
    }
    context.current ??= new AudioContext();
    return context.current;
  };

  const play = (): void => {
    if (globalThis.window === undefined || typeof Audio === 'undefined' || source === undefined) {
      return;
    }

    let element = audio.current;
    if (element === undefined) {
      element = new Audio(source);
      element.addEventListener('ended', () => {
        setIsPlaying(() => false);
      });
      audio.current = element;
    } else if (element.src !== source) {
      element.src = source;
    }

    element.currentTime = 0;
    void element.play();
    setIsPlaying(() => true);
  };

  const stop = (): void => {
    const element = audio.current;
    if (element !== undefined) {
      element.pause();
      element.currentTime = 0;
    }
    setIsPlaying(() => false);
  };

  const playTone = (frequency: number, durationMs = 200, type: OscillatorType = 'sine'): void => {
    const audioContext = ensureContext();
    if (audioContext === undefined) {
      return;
    }

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + durationMs / 1000);
  };

  useEffect(() => {
    return () => {
      audio.current?.pause();
      void context.current?.close();
    };
  }, [audio, context]);

  return { isSupported, isPlaying, play, stop, playTone };
}
