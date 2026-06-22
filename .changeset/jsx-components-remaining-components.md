---
'@mission-platform/components': minor
---

Reach full parity with `@mission-platform/components` by migrating the final 15
components to write-once neutral JSX, compiling straight to both React and Vue:
the simple form inputs `BaseColorInput` and `BaseRangeInput` (its dual
pointer-drag thumbs substituted with two overlaid native `<input type="range">`);
the date/time pickers `BaseDateInput`, `BaseDateRangeInput`,
`BaseDateTimeRangeInput`, `BaseTimeInput`, and `BaseTimeRangeInput` (composing the
migrated `BaseCalendar` / scrollable time lists inside a teleported,
CSS-anchor-positioned popover — the `BasePopover` recipe replacing
`@floating-ui` + `useZIndex` — with a shared framework-agnostic `date-time.ts`
helper); the editors/viewers `BaseCodeBlock` (`highlight.js`) and
`BaseMarkdownInput` (`marked`), keeping the dep verbatim and injecting the HTML
via a `useRef` + `useEffect` `innerHTML` escape-hatch instead of `v-html`, plus
`BaseMonacoEditor`, mounted imperatively with a dynamic `import('monaco-editor')`
kept out of the synchronous module graph for SSG-safety; and the form
meta-components `BaseSchemaForm` (a static `switch` over a resolved `fields`
array composing the migrated inputs, replacing JSON-Schema + Ajv +
`<component :is>`), `BaseFormWizard`, `BaseFormBuilder` (native HTML5
drag-and-drop), and `BaseScheduler` (an agenda over a flat `events` array,
reusing `BaseDialog` for the event details). Each ships its per-folder
`.tsx`/`.module.scss`/`.stories.tsx`/cross-framework `.spec.ts`/`index.ts`, and
is re-exported on the `./react`, `./vue`, and Storyblok subpaths. Behaviours the
neutral dialect deliberately does not model (Ajv validation / JSON-Schema
generation, RFC 5545 recurrence expansion, scheduler grid collision layout, and
the harper/hunspell spell-check composables) stay framework-specific and are
documented per component in `llms.txt`.
