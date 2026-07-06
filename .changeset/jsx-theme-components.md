---
'@mission-platform/vite-plugin-jsx': minor
'@mission-platform/components': minor
---

migrate the Components/Theme group to the write-once components library

`@mission-platform/components` now ships the complete `Components/Theme`
group — `BaseThemeToggle`, `BaseThemeProvider`, and `BaseThemeComposer` —
authored once in the neutral JSX dialect and compiled to both React and Vue.
Because the neutral dialect has no `provide`/`inject` context primitive,
cross-component theme state is shared through a framework-agnostic observable
singleton store (`theme-store.ts`), and the composer is a controlled component
(`modelValue`/`onUpdateModelValue` in place of `v-model`).

`@mission-platform/vite-plugin-jsx` gains **shared helper module** support: a
neutral component can import a sibling plain `.ts`/`.tsx` helper (e.g. the theme
store); the two-stage compiler now distinguishes such helpers from sibling
components (so the Vue emitter keeps a named `./x` import instead of `./x.vue`)
and copies each referenced helper into both generated framework trees.
