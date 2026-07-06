---
'@mission-platform/components': minor
---

migrate the Components/Media group to write-once cross-framework JSX

The complete `Components/Media` group is now authored once in the neutral JSX
dialect (`@mission-platform/jsx`) and compiled straight to both React and Vue by
`@mission-platform/vite-plugin-jsx`:

- `BaseResponsiveImage` — an art-directed, responsive `<picture>` (one `<source>`
  per `sources` entry plus a fallback `<img>`) with `srcset`/`sizes`, lazy
  loading, async decoding, a fixed `aspectRatio`, and `object-fit` control.
- `BaseResponsiveVideo` — a responsive `<video>` with format-specific sources, a
  poster, native controls, and the usual playback flags.
- `BaseBackgroundVideo` — a decorative full-bleed background `<video>` with
  optional foreground default-slot content and a scrim overlay, honouring
  `prefers-reduced-motion` via a reactive `matchMedia` query driven by the
  neutral hooks.

Each ships its per-component folder (`.tsx`/`.module.scss`/`.stories.tsx`/
`.spec.ts`/`index.ts`), categorised `JSX Components/Media/<Name>` stories, and a
cross-framework SSR parity spec. The native `load`/`error`/`play`/`pause`/`ended`
emits are exposed as `onLoad`/`onError`/`onPlay`/`onPause`/`onEnded` callback
props, consistent with the existing migration conventions.
