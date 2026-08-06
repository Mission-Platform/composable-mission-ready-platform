# @mission-platform/speech-audio

Framework-neutral browser speech & audio composables for Mission Platform. Authored once against the
`@mission-platform/forge` neutral hooks and compiled to Vue 3, React 18/19, Solid, Svelte 5, and Web Components.

## Hooks

- `useSpeechSynthesis()` — text-to-speech built on the native SpeechSynthesis API. Exposes `speak`, `pause`, `resume`,
  `cancel`, the available `voices`, and `isSpeaking` / `isPaused` state.
- `useSpeechRecognition()` — speech-to-text built on the native SpeechRecognition API (prefixed as
  `webkitSpeechRecognition` in some browsers). Exposes `start`, `stop`, `abort`, the latest `transcript`, and
  `isListening` / `error` state.
- `useSound(source?)` — plays an audio clip from `source` via an `HTMLAudioElement` and can synthesize short tones with
  `playTone(frequency, durationMs?, type?)` via the Web Audio API.
- `useMidi()` — Web MIDI access. Exposes `requestAccess`, the available `inputs` / `outputs`, `isConnected` / `error`
  state, and `playNote(note, velocity?, durationMs?, output?)`.

## Usage

```ts
import { useSpeechSynthesis } from '@mission-platform/speech-audio';

const speech = useSpeechSynthesis();
speech.speak('Hello, Mission Platform', { rate: 1.1 });
```

Framework-specific builds are available via subpath exports, e.g. `@mission-platform/speech-audio/vue` and
`@mission-platform/speech-audio/react`.

## SSR Safety

All hooks are SSR-safe. On the server (or in any environment where the underlying browser API is unavailable) the
`isSupported` flag is `false` and every control is a no-op.

## Cleanup

In-progress speech is cancelled, recognition sessions are aborted, audio playback is stopped, and audio contexts are
closed automatically when the component is unmounted.
