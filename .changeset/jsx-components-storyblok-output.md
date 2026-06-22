---
'@mission-platform/components': minor
---

build the Storyblok output alongside the Vue and React builds

The package now also projects its neutral components onto Storyblok via
`@mission-platform/vite-plugin-jsx`'s `generateStoryblokBloks`. Two new build
modes (`storyblok-vue`, `storyblok-react`) emit the framework blok wrappers into
`dist/storyblok/{vue,react}/` (exposed as the `./storyblok/react` and
`./storyblok/vue` subpaths), and the framework-agnostic blok configuration JSON
(`components.json` plus one `<component>.json` per component) is shipped under
`./storyblok/components.json`. `@storyblok/react` and `@storyblok/vue` are added
as optional peer dependencies.
