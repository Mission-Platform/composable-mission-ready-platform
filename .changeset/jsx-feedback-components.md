---
'@mission-platform/components': minor
---

migrate the Components/Feedback group to write-once JSX

Adds the complete `Components/Feedback` group, authored once in the neutral
`@mission-platform/jsx` dialect and compiled straight to both React and Vue by
`@mission-platform/vite-plugin-jsx`:

- `BaseSkeleton` — loading placeholder (line/circle/block shapes, optional
  shimmer, width/height overrides).
- `BaseSpinner` — indeterminate `role="status"` ring (tone/size + accessible
  label; the i18n default label becomes a plain `'Loading…'`).
- `BaseStatusIcon` — toned status indicator (icon SVGs substituted with
  `✓`/`⚠`/`✕`/`ℹ`/`–` glyphs; level type exported as `StatusIconLevel`).
- `BaseProgressBar` — determinate/indeterminate native `<progress>` track with
  an optional label row (composes `BaseTypography`).
- `BaseAlertBanner` — controlled inline notification banner (`modelValue` +
  `onUpdateModelValue`/`onDismiss` callbacks, `iconContent`/`actions` content
  props, glyph icons, `display: contents` host for visibility toggling).
- `BaseToast` — presentational toast item (`onDismiss` callback, `iconContent`
  content prop, glyph icon).

Each ships its per-component folder (`.tsx`/`.module.scss`/`.stories.tsx`/
`.spec.ts`/`index.ts`), categorised `JSX Components/Feedback/<Name>` stories, and
cross-framework SSR parity specs. Vue-only features the neutral dialect cannot
model (`@mission-platform/icons`, i18n, `v-model`/emits, named/`$slots`-presence
slots) are substituted with the documented equivalents (text glyphs, callback
props, content props); the `useToast` store / `BaseToastContainer` orchestration
is out of scope.
