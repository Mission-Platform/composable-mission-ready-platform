---
'@mission-platform/speech-audio': minor
---

add `@mission-platform/speech-audio` — framework-neutral browser speech & audio composables

New write-once composables authored against the `@mission-platform/forge` neutral hooks and compiled to React, Vue, Solid, Svelte, and Web Components (with per-framework subpath exports).

- **`useSpeechSynthesis`** — text-to-speech via the native SpeechSynthesis API (`speak`/`pause`/`resume`/`cancel`, available `voices`, `isSpeaking`/`isPaused` state).
- **`useSpeechRecognition`** — speech-to-text via the native SpeechRecognition API (`webkitSpeechRecognition` fallback) with `start`/`stop`/`abort`, `transcript`, and `isListening`/`error` state.
- **`useSound`** — audio clip playback via `HTMLAudioElement` plus Web Audio tone synthesis (`play`/`stop`/`playTone`).
- **`useMidi`** — Web MIDI access, input/output enumeration, and note playback (`requestAccess`/`playNote`).

All hooks are SSR-safe (`isSupported` is `false` and controls are no-ops when the browser API is unavailable) and clean up automatically on unmount.
