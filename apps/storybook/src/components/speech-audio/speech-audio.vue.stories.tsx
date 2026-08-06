import { useMidi, useSound, useSpeechRecognition, useSpeechSynthesis } from '@mission-platform/speech-audio/vue';
import { defineComponent, ref } from 'vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

// ─── Shared styles ─────────────────────────────────────────────────────────

const panelStyle = 'font-family: system-ui, sans-serif; font-size: 14px; line-height: 1.6; max-width: 560px;';
const rowStyle = 'display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px;';
const buttonStyle =
  'padding: 6px 14px; border-radius: 6px; border: 1px solid #ccc; cursor: pointer; background: #1a73e8; color: #fff;';
const secondaryButtonStyle =
  'padding: 6px 14px; border-radius: 6px; border: 1px solid #ccc; cursor: pointer; background: #fff; color: #333;';
const inputStyle = 'padding: 6px 10px; border-radius: 6px; border: 1px solid #ccc; flex: 1 1 220px; min-width: 180px;';
const codeStyle =
  'font-family: monospace; background: #f5f5f5; border: 1px solid #eee; border-radius: 6px; padding: 8px 12px; display: block; white-space: pre-wrap; word-break: break-word;';

/** Small coloured pill showing a boolean/text status. */
const Badge = defineComponent({
  name: 'Badge',
  props: {
    active: { type: Boolean, default: false },
    label: { type: String, required: true },
  },
  setup(properties) {
    return () => (
      <span
        style={`display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-family: monospace; background: ${
          properties.active ? '#e6f4ea' : '#f1f3f4'
        }; color: ${properties.active ? '#137333' : '#5f6368'}; border: 1px solid ${
          properties.active ? '#a8dab5' : '#dadce0'
        };`}
      >
        {properties.label}
      </span>
    );
  },
});

/** A small "not supported in this browser" notice. */
const UnsupportedNotice = defineComponent({
  name: 'UnsupportedNotice',
  props: { api: { type: String, required: true } },
  setup(properties) {
    return () => (
      <p style="color: #b3261e; font-family: monospace; font-size: 13px;">
        This browser does not expose the <strong>{properties.api}</strong> API — the controls below are no-ops here.
      </p>
    );
  },
});

// ─── Demos ───────────────────────────────────────────────────────────────────

/** Text-to-speech demo driven by `useSpeechSynthesis`. */
const SpeechSynthesisDemo = defineComponent({
  name: 'SpeechSynthesisDemo',
  setup() {
    const controls = useSpeechSynthesis();
    const text = ref('Hello from the Mission Platform speech-audio composables.');
    const rate = ref(1);
    const pitch = ref(1);

    return () => (
      <div style={panelStyle}>
        {controls.isSupported ? undefined : <UnsupportedNotice api="SpeechSynthesis" />}
        <div style={rowStyle}>
          <Badge
            active={controls.isSupported}
            label={`isSupported: ${controls.isSupported}`}
          />
          <Badge
            active={controls.isSpeaking}
            label={`isSpeaking: ${controls.isSpeaking}`}
          />
          <Badge
            active={controls.isPaused}
            label={`isPaused: ${controls.isPaused}`}
          />
          <Badge
            active={controls.voices.length > 0}
            label={`voices: ${controls.voices.length}`}
          />
        </div>
        <div style={rowStyle}>
          <input
            style={inputStyle}
            value={text.value}
            onInput={(event) => {
              text.value = (event.target as HTMLInputElement).value;
            }}
          />
        </div>
        <div style={rowStyle}>
          <label style="font-family: monospace; font-size: 12px;">
            rate {rate.value.toFixed(1)}
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={rate.value}
              onInput={(event) => {
                rate.value = Number((event.target as HTMLInputElement).value);
              }}
            />
          </label>
          <label style="font-family: monospace; font-size: 12px;">
            pitch {pitch.value.toFixed(1)}
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={pitch.value}
              onInput={(event) => {
                pitch.value = Number((event.target as HTMLInputElement).value);
              }}
            />
          </label>
        </div>
        <div style={rowStyle}>
          <button
            style={buttonStyle}
            onClick={() => controls.speak(text.value, { rate: rate.value, pitch: pitch.value })}
          >
            speak()
          </button>
          <button
            style={secondaryButtonStyle}
            onClick={() => controls.pause()}
          >
            pause()
          </button>
          <button
            style={secondaryButtonStyle}
            onClick={() => controls.resume()}
          >
            resume()
          </button>
          <button
            style={secondaryButtonStyle}
            onClick={() => controls.cancel()}
          >
            cancel()
          </button>
        </div>
      </div>
    );
  },
});

/** Speech-to-text demo driven by `useSpeechRecognition`. */
const SpeechRecognitionDemo = defineComponent({
  name: 'SpeechRecognitionDemo',
  setup() {
    const controls = useSpeechRecognition();

    return () => (
      <div style={panelStyle}>
        {controls.isSupported ? undefined : <UnsupportedNotice api="SpeechRecognition" />}
        <div style={rowStyle}>
          <Badge
            active={controls.isSupported}
            label={`isSupported: ${controls.isSupported}`}
          />
          <Badge
            active={controls.isListening}
            label={`isListening: ${controls.isListening}`}
          />
          {controls.error === undefined ? undefined : (
            <Badge
              active={false}
              label={`error: ${controls.error}`}
            />
          )}
        </div>
        <div style={rowStyle}>
          <button
            style={buttonStyle}
            onClick={() => controls.start({ interimResults: true, continuous: true })}
          >
            start()
          </button>
          <button
            style={secondaryButtonStyle}
            onClick={() => controls.stop()}
          >
            stop()
          </button>
          <button
            style={secondaryButtonStyle}
            onClick={() => controls.abort()}
          >
            abort()
          </button>
        </div>
        <p style="font-family: monospace; font-size: 12px; color: #5f6368; margin-bottom: 4px;">transcript</p>
        <code style={codeStyle}>{controls.transcript || '—'}</code>
      </div>
    );
  },
});

/** Audio playback + tone synthesis demo driven by `useSound`. */
const SoundDemo = defineComponent({
  name: 'SoundDemo',
  setup() {
    // A short, freely-usable sample so `play()` has something to load.
    const controls = useSound('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
    const tones: { label: string; frequency: number }[] = [
      { label: 'C4', frequency: 261.63 },
      { label: 'E4', frequency: 329.63 },
      { label: 'G4', frequency: 392 },
      { label: 'C5', frequency: 523.25 },
    ];

    return () => (
      <div style={panelStyle}>
        {controls.isSupported ? undefined : <UnsupportedNotice api="Web Audio / HTMLAudioElement" />}
        <div style={rowStyle}>
          <Badge
            active={controls.isSupported}
            label={`isSupported: ${controls.isSupported}`}
          />
          <Badge
            active={controls.isPlaying}
            label={`isPlaying: ${controls.isPlaying}`}
          />
        </div>
        <p style="font-family: monospace; font-size: 12px; color: #5f6368; margin-bottom: 4px;">clip playback</p>
        <div style={rowStyle}>
          <button
            style={buttonStyle}
            onClick={() => controls.play()}
          >
            play()
          </button>
          <button
            style={secondaryButtonStyle}
            onClick={() => controls.stop()}
          >
            stop()
          </button>
        </div>
        <p style="font-family: monospace; font-size: 12px; color: #5f6368; margin-bottom: 4px;">
          tone synthesis — playTone(frequency)
        </p>
        <div style={rowStyle}>
          {tones.map((tone) => (
            <button
              key={tone.label}
              style={secondaryButtonStyle}
              onClick={() => controls.playTone(tone.frequency, 400)}
            >
              {tone.label}
            </button>
          ))}
        </div>
      </div>
    );
  },
});

/** Web MIDI access + note playback demo driven by `useMidi`. */
const MidiDemo = defineComponent({
  name: 'MidiDemo',
  setup() {
    const controls = useMidi();
    // Middle-octave notes (MIDI note numbers) for the note-trigger buttons.
    const notes: { label: string; note: number }[] = [
      { label: 'C4', note: 60 },
      { label: 'E4', note: 64 },
      { label: 'G4', note: 67 },
      { label: 'C5', note: 72 },
    ];

    return () => (
      <div style={panelStyle}>
        {controls.isSupported ? undefined : <UnsupportedNotice api="Web MIDI" />}
        <div style={rowStyle}>
          <Badge
            active={controls.isSupported}
            label={`isSupported: ${controls.isSupported}`}
          />
          <Badge
            active={controls.isConnected}
            label={`isConnected: ${controls.isConnected}`}
          />
          <Badge
            active={controls.inputs.length > 0}
            label={`inputs: ${controls.inputs.length}`}
          />
          <Badge
            active={controls.outputs.length > 0}
            label={`outputs: ${controls.outputs.length}`}
          />
          {controls.error === undefined ? undefined : (
            <Badge
              active={false}
              label={`error: ${controls.error}`}
            />
          )}
        </div>
        <div style={rowStyle}>
          <button
            style={buttonStyle}
            onClick={() => controls.requestAccess()}
          >
            requestAccess()
          </button>
        </div>
        <p style="font-family: monospace; font-size: 12px; color: #5f6368; margin-bottom: 4px;">
          playNote(note) — needs a connected MIDI output
        </p>
        <div style={rowStyle}>
          {notes.map((entry) => (
            <button
              key={entry.label}
              style={secondaryButtonStyle}
              onClick={() => controls.playNote(entry.note)}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>
    );
  },
});

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta = {
  title: 'Utilities/Speech & Audio',
  parameters: {
    docs: {
      description: {
        component: `
# Mission Platform Speech & Audio

The \`@mission-platform/speech-audio\` package ships framework-neutral write-once
composables for the browser's native speech and audio capabilities. Authored once
against \`@mission-platform/forge\`, they compile to React, Vue, Solid, Svelte, and
Web Components.

| Composable | Purpose |
|---|---|
| \`useSpeechSynthesis\` | Text-to-speech via the SpeechSynthesis API |
| \`useSpeechRecognition\` | Speech-to-text via the SpeechRecognition API |
| \`useSound\` | Audio-clip playback (\`HTMLAudioElement\`) + Web Audio tone synthesis |
| \`useMidi\` | Web MIDI access and note playback |

\`\`\`vue
<script setup lang="ts">
import { useSpeechSynthesis } from '@mission-platform/speech-audio/vue'
const { isSpeaking, speak, cancel } = useSpeechSynthesis()
</script>
\`\`\`

Every composable is SSR-safe: \`isSupported\` is \`false\` and the controls are
no-ops when the underlying browser API is unavailable, and each cleans up on
unmount. The stories below are interactive — grant microphone/MIDI permission
when prompted to exercise the live behaviour. Some browsers (and headless CI
snapshots) do not expose these APIs, so a "not supported" notice may appear.
        `,
      },
    },
  },
};

export default meta;

// ─── Stories ─────────────────────────────────────────────────────────────────

/** Text-to-speech: type a phrase and have the browser speak it. */
export const SpeechSynthesisStory: StoryObj = {
  name: 'useSpeechSynthesis — text-to-speech',
  render: () => ({
    components: { SpeechSynthesisDemo },
    template: '<SpeechSynthesisDemo />',
  }),
};

/** Speech-to-text: start listening and watch the live transcript. */
export const SpeechRecognitionStory: StoryObj = {
  name: 'useSpeechRecognition — speech-to-text',
  render: () => ({
    components: { SpeechRecognitionDemo },
    template: '<SpeechRecognitionDemo />',
  }),
};

/** Sound: play an audio clip or synthesize tones via the Web Audio API. */
export const SoundStory: StoryObj = {
  name: 'useSound — playback & tones',
  render: () => ({
    components: { SoundDemo },
    template: '<SoundDemo />',
  }),
};

/** MIDI: request access and trigger notes on a connected MIDI output. */
export const MidiStory: StoryObj = {
  name: 'useMidi — Web MIDI',
  render: () => ({
    components: { MidiDemo },
    template: '<MidiDemo />',
  }),
};
