import { useEffect, useState } from '@mission-platform/forge-jsx';

/** Per-utterance options applied to a {@link useSpeechSynthesis} `speak` call. */
export interface SpeakOptions {
  /** BCP 47 language tag, e.g. `en-US`. */
  lang?: string;
  /** A specific voice to use (see {@link SpeechSynthesisControls.voices}). */
  voice?: SpeechSynthesisVoice;
  /** Speaking pitch (0–2, default 1). */
  pitch?: number;
  /** Speaking rate (0.1–10, default 1). */
  rate?: number;
  /** Volume (0–1, default 1). */
  volume?: number;
}

/** Reactive state and controls returned by {@link useSpeechSynthesis}. */
export interface SpeechSynthesisControls {
  /** Whether the browser exposes the SpeechSynthesis API. */
  isSupported: boolean;
  /** Whether an utterance is currently being spoken. */
  isSpeaking: boolean;
  /** Whether speech is currently paused. */
  isPaused: boolean;
  /** The list of voices available to the synthesizer. */
  voices: SpeechSynthesisVoice[];
  /** Queue `text` to be spoken with optional per-utterance {@link SpeakOptions}. */
  speak: (text: string, options?: SpeakOptions) => void;
  /** Pause the current utterance. */
  pause: () => void;
  /** Resume a paused utterance. */
  resume: () => void;
  /** Cancel all queued and in-progress utterances. */
  cancel: () => void;
}

/**
 * Framework-neutral text-to-speech hook built on the browser's native
 * SpeechSynthesis API.
 *
 * SSR-safe: `isSupported` is `false` and every control is a no-op when the API
 * or DOM is unavailable.
 * Automatic cleanup: any in-progress speech is cancelled on unmount.
 */
export function useSpeechSynthesis(): SpeechSynthesisControls {
  const isSupported = globalThis.window !== undefined && globalThis.speechSynthesis !== undefined;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!isSupported) {
      return;
    }

    const synth = globalThis.speechSynthesis;
    const updateVoices = (): void => {
      setVoices(() => synth.getVoices());
    };

    updateVoices();
    synth.addEventListener('voiceschanged', updateVoices);

    return () => {
      synth.removeEventListener('voiceschanged', updateVoices);
      synth.cancel();
    };
  }, [isSupported]);

  const speak = (text: string, options?: SpeakOptions): void => {
    if (!isSupported) {
      return;
    }

    const synth = globalThis.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);

    if (options?.lang !== undefined) {
      utterance.lang = options.lang;
    }
    if (options?.voice !== undefined) {
      utterance.voice = options.voice;
    }
    if (options?.pitch !== undefined) {
      utterance.pitch = options.pitch;
    }
    if (options?.rate !== undefined) {
      utterance.rate = options.rate;
    }
    if (options?.volume !== undefined) {
      utterance.volume = options.volume;
    }

    utterance.addEventListener('start', () => {
      setIsSpeaking(() => true);
      setIsPaused(() => false);
    });
    utterance.addEventListener('pause', () => {
      setIsPaused(() => true);
    });
    utterance.addEventListener('resume', () => {
      setIsPaused(() => false);
    });
    utterance.addEventListener('end', () => {
      setIsSpeaking(() => false);
      setIsPaused(() => false);
    });
    utterance.addEventListener('error', () => {
      setIsSpeaking(() => false);
      setIsPaused(() => false);
    });

    synth.speak(utterance);
  };

  const pause = (): void => {
    if (isSupported) {
      globalThis.speechSynthesis.pause();
    }
  };

  const resume = (): void => {
    if (isSupported) {
      globalThis.speechSynthesis.resume();
    }
  };

  const cancel = (): void => {
    if (isSupported) {
      globalThis.speechSynthesis.cancel();
    }
  };

  return { isSupported, isSpeaking, isPaused, voices, speak, pause, resume, cancel };
}
