---
'@mission-platform/components': minor
---

Migrate the self-contained Tier 3 components to write-once neutral JSX,
compiling straight to both React and Vue: `BaseQrCode` (`Data Display`),
`BaseLocationInput` and `BaseCalendar` (`Forms`). Each ships its per-folder
`.tsx`/`.module.scss`/`.stories.tsx`/cross-framework `.spec.ts`/`index.ts` with
`JSX Components/<Category>/<Name>` stories. The framework-agnostic logic travels
verbatim onto both builds via co-located helpers — `qr-encode.ts` (the
dependency-free QR encoder) and `location.ts` (the DD/DM/DMS coordinate
conversion) — and `BaseCalendar`'s month grid is driven by `luxon` (added as a
dependency). Vue-only features the neutral dialect does not model are substituted
with documented equivalents: `computed` → `useMemo`, `ref` → `useState`,
`watch` → `useEffect`, `useId` → the shared `nextFieldId` `useRef` helper,
`@mission-platform/icons` chevrons → text glyphs, and `v-model`/emits → the
controlled `modelValue` + `onUpdateModelValue`/`onChange`/`onError` callback
props. The remaining Tier 3/4 components stay Vue-only in
`@mission-platform/components` because they need primitives the neutral dialect
does not model (Teleport/`@floating-ui` overlays and floating date/time pickers)
or heavy browser-only toolchains (`BaseMonacoEditor`, `BaseCodeBlock`,
`BaseMarkdownInput`, `BaseFormBuilder`, `BaseScheduler`, and the form
meta-components).
