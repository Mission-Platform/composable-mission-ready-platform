import { type MpRef, useEffect, useRef, useState } from '@mission-platform/forge';

// ─── Minimal Web Speech (recognition) typings ──────────────────────────────
//
// The SpeechRecognition side of the Web Speech API is not part of the standard
// DOM lib (browsers still ship it prefixed as `webkitSpeechRecognition`), so we
// declare the small surface we rely on here.

interface SpeechRecognitionAlternativeLike {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionResultListLike {
  readonly length: number;
  readonly [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionConstructor | undefined {
  if (globalThis.window === undefined) {
    return undefined;
  }

  const candidate = globalThis.window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return candidate.SpeechRecognition ?? candidate.webkitSpeechRecognition;
}

/** Options applied when starting a {@link useSpeechRecognition} session. */
export interface SpeechRecognitionOptions {
  /** BCP 47 language tag to recognize, e.g. `en-US`. Defaults to `en-US`. */
  lang?: string;
  /** Keep recognizing after the first result. Defaults to `false`. */
  continuous?: boolean;
  /** Emit interim (non-final) results as they are recognized. Defaults to `false`. */
  interimResults?: boolean;
  /** Maximum number of alternatives per result. Defaults to `1`. */
  maxAlternatives?: number;
}

/** Reactive state and controls returned by {@link useSpeechRecognition}. */
export interface SpeechRecognitionControls {
  /** Whether the browser exposes the SpeechRecognition API. */
  isSupported: boolean;
  /** Whether recognition is currently active. */
  isListening: boolean;
  /** The latest recognized transcript. */
  transcript: string;
  /** The most recent recognition error code, or `undefined`. */
  error: string | undefined;
  /** Start a recognition session with optional {@link SpeechRecognitionOptions}. */
  start: (options?: SpeechRecognitionOptions) => void;
  /** Stop the session, keeping any final result. */
  stop: () => void;
  /** Abort the session immediately, discarding results. */
  abort: () => void;
}

/**
 * Framework-neutral speech-to-text hook built on the browser's native
 * SpeechRecognition API (prefixed as `webkitSpeechRecognition` in some
 * browsers).
 *
 * SSR-safe: `isSupported` is `false` and every control is a no-op when the API
 * or DOM is unavailable.
 * Automatic cleanup: any active session is aborted on unmount.
 */
export function useSpeechRecognition(): SpeechRecognitionControls {
  const RecognitionConstructor = getSpeechRecognition();
  const isSupported = RecognitionConstructor !== undefined;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  // eslint-disable-next-line unicorn/no-useless-undefined
  const [error, setError] = useState<string | undefined>(undefined);
  const recognition: MpRef<SpeechRecognitionLike | undefined> = useRef<SpeechRecognitionLike | undefined>(undefined);

  const stop = (): void => {
    recognition.current?.stop();
  };

  const abort = (): void => {
    recognition.current?.abort();
  };

  const start = (options?: SpeechRecognitionOptions): void => {
    if (RecognitionConstructor === undefined) {
      return;
    }

    recognition.current?.abort();

    const instance = new RecognitionConstructor();
    instance.lang = options?.lang ?? 'en-US';
    instance.continuous = options?.continuous ?? false;
    instance.interimResults = options?.interimResults ?? false;
    instance.maxAlternatives = options?.maxAlternatives ?? 1;

    instance.addEventListener('start', () => {
      setIsListening(() => true);
      setError(undefined);
    });
    instance.addEventListener('end', () => {
      setIsListening(() => false);
    });
    instance.addEventListener('error', (event) => {
      setError(() => (event as SpeechRecognitionErrorEventLike).error);
    });
    instance.addEventListener('result', (event) => {
      const recognitionEvent = event as SpeechRecognitionEventLike;
      let text = '';
      for (let index = recognitionEvent.resultIndex; index < recognitionEvent.results.length; index += 1) {
        text += recognitionEvent.results[index][0].transcript;
      }
      setTranscript(() => text);
    });

    recognition.current = instance;
    instance.start();
  };

  useEffect(() => {
    return () => {
      recognition.current?.abort();
    };
  }, [recognition]);

  return { isSupported, isListening, transcript, error, start, stop, abort };
}
