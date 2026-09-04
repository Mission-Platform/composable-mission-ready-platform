# Changelog

## 1.0.2

### Patch Changes

- 7788642: Normalize generated changelog formatting.
- 7788642: Simplify browser audio control callbacks.
- Updated dependencies [355f413]
  - @mission-platform/forge-jsx@2.0.0

## 1.0.1

### Patch Changes

- c32bb83: centralize package documentation generation in the repository build
- 8a15dbc: add generated package API references and build-time documentation extraction
- Updated dependencies [c32bb83]
- Updated dependencies [f216404]
- Updated dependencies [89aab02]
- Updated dependencies [8a15dbc]
  - @mission-platform/forge-jsx@1.1.0

## 1.0.0

### Major Changes

- 0371781: remove the per-framework subpath exports in favour of `mp:<framework>` conditions

  The legacy `./vue`, `./react`, `./solid`, `./svelte` and `./web-components`
  subpath exports have been deleted from every framework-shipping package. The framework build is now selected **only** by
  the `mp:<framework>` custom export condition on the bare `.` entry, so there is exactly one specifier per package and it
  is impossible for an app to mix two framework builds by importing inconsistently.

  **Breaking.** Replace every framework subpath with the bare specifier and select the framework once, at the app level:

  ```diff
  -import { ForgeButton } from '@mission-platform/components/vue';
  -import { ForgeIconChevron } from '@mission-platform/icons/vue';
  +import { ForgeButton } from '@mission-platform/components';
  +import { ForgeIconChevron } from '@mission-platform/icons';
  ```

  ```ts
  // vite.config.ts
  export default defineFrameworkAppConfig({ framework: "vue" });
  ```

  ```jsonc
  // tsconfig.app.json
  { "compilerOptions": { "customConditions": ["mp:vue"] } }
  ```

  `@mission-platform/components` keeps its per-component deep imports, but the wildcard is now condition-aware and carries
  no framework segment:

  ```diff
  -import { ForgeBadge } from '@mission-platform/components/react/atoms/forge-badge/forge-badge';
  +import { ForgeBadge } from '@mission-platform/components/atoms/forge-badge/forge-badge';
  ```

  The `@mission-platform/forge-jsx` adapter subpaths (`/react`, `/vue`, `/solid`,
  `/web-components`, `/runtime`, `/jsx-globals`), the Storyblok wrappers (`/storyblok/react`, `/storyblok/vue`),
  `@mission-platform/router/redwood`,
  `@mission-platform/breakpoints/core` and every `…/styles` entry are unaffected.

  `@mission-platform/vite-plugin-forge` now emits bare `@mission-platform/*`
  specifiers into the generated per-framework sources (previously it rewrote them to the matching subpath), and passes the
  framework's `customConditions` to every declaration-emit path so the generated `.d.ts` files resolve sibling packages
  against the same build the bundler picks.

  `@mission-platform/vite-config` gains `framework` and `frameworkInclude` options on `defineVitestConfig`, so a package
  can run its compiled-build specs under a framework condition while leaving cross-framework parity specs resolving
  neutrally.

### Minor Changes

- d78e44f: add `@mission-platform/speech-audio` — framework-neutral browser speech & audio composables

  New write-once composables authored against the `@mission-platform/forge-jsx` neutral hooks and compiled to React, Vue, Solid, Svelte, and Web Components (with per-framework subpath exports).

  - **`useSpeechSynthesis`** — text-to-speech via the native SpeechSynthesis API (`speak`/`pause`/`resume`/`cancel`, available `voices`, `isSpeaking`/`isPaused` state).
  - **`useSpeechRecognition`** — speech-to-text via the native SpeechRecognition API (`webkitSpeechRecognition` fallback) with `start`/`stop`/`abort`, `transcript`, and `isListening`/`error` state.
  - **`useSound`** — audio clip playback via `HTMLAudioElement` plus Web Audio tone synthesis (`play`/`stop`/`playTone`).
  - **`useMidi`** — Web MIDI access, input/output enumeration, and note playback (`requestAccess`/`playNote`).

  All hooks are SSR-safe (`isSupported` is `false` and controls are no-ops when the browser API is unavailable) and clean up automatically on unmount.

### Patch Changes

- ac98203: normalize composable directories, package barrels, and colocated tests
- Updated dependencies [e2525a3]
- Updated dependencies [7a1b1a1]
- Updated dependencies [bd88e5e]
- Updated dependencies [0c0d5d7]
- Updated dependencies [ffa5129]
- Updated dependencies [3fb8ddb]
- Updated dependencies [7d95459]
- Updated dependencies [f67e304]
  - @mission-platform/forge-jsx@1.0.0

All notable changes to this project will be documented in this file.

## 0.1.0 (2026-08-06)

### Features

- Initial release of `@mission-platform/speech-audio`.
- Added `useSpeechSynthesis` (text-to-speech), `useSpeechRecognition` (speech-to-text), `useSound` (audio playback and
  tone generation), and `useMidi` (Web MIDI).
