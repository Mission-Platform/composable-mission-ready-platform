---
'@mission-platform/storybook-framework': patch
'@mission-platform/rxjs': patch
---

fix Storybook rendering on non-Vue frameworks

The unified Storybook only registered a JSX transform for the Vue renderer, so
under React/Solid/Svelte/Web-Component the shared neutral `*.stories.tsx` were
compiled by Vite's core esbuild using the stories tsconfig's
`jsxImportSource: "vue"` — emitting Vue vnodes into the wrong runtime and
crashing every non-Vue renderer with `Objects are not valid as a React child`.

`createStorybookConfig` now registers the matching JSX transform per framework
(`@vitejs/plugin-react` for React; the `storybook-solidjs-vite` framework adapter
for Solid, replacing the generic `@storybook/html-vite` fallback that could not
mount Solid components), and drops a package's stories when that package ships no
build for the active framework (so `wysiwyg`/`breakpoints`, which build only Vue
and React, no longer break the Solid/Svelte/Web-Component preview with
`MISSING_EXPORT`). The `@mission-platform/rxjs` demo story now authors its markup
in JSX instead of a direct neutral `h(...)` call so it compiles to the active
framework.
