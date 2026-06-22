---
'@mission-platform/vite-plugin-jsx': minor
---

add a Storyblok target that emits blok configurations and framework blok wrappers

Alongside the React and Vue source generators, the plugin now projects the same
neutral `@mission-platform/jsx` components onto Storyblok via the new
`generateStoryblokBloks`. For every component it derives, from the props
contract, a Storyblok component object — string-literal unions (incl. local
`type` aliases) become `option` fields, `boolean`/`number`/`string` map to the
matching primitive field, `string | number` degrades to `text`, callbacks are
dropped, and the default slot / `MpChild` props become nestable `bloks` fields,
with JSDoc as the field `description` and `?? <literal>` / destructuring defaults
as `default_value` — plus a thin React `.tsx` / Vue `.vue` blok wrapper that
binds `blok.<field>` onto the built component, tags it editable
(`storyblokEditable` / `v-editable`), and renders `bloks` fields through
`StoryblokComponent`. It writes per-component `<name>.json`, the aggregate
`components.json`, the wrapper sources, and a wrapper entry barrel.

The per-framework emitters move from `src/compiler/` into a dedicated
`src/generators/` directory (`react.ts`, `vue.ts`, `storyblok.ts`), with the
shared parsing/discovery helpers remaining in `src/compiler/`.
