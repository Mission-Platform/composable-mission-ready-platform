---
'@mission-platform/vite-plugin-jsx': minor
'@mission-platform/components': minor
---

type the Storyblok blok wrapper's `blok` prop precisely

The Storyblok target now derives a precise interface for each wrapper's `blok`
prop instead of the open `SbBlokData & Record<string, unknown>`. A new
`emitBlokDataType` builds `SbBlokData & { … }` from the component's analysed
schema — one member per field (`option` → string-literal union, `text` →
`string`, `number`, `boolean`, `bloks` → `SbBlokData[]`; non-optional props stay
required, a field-less component degrades to bare `SbBlokData`) — and it is used
in the generated Vue `defineProps`, the React `<Name>BlokProperties` interface,
and the synthesised wrapper-entry `index.d.ts`. `@mission-platform/components`
now ships that typed `index.d.ts` for its `./storyblok/{react,vue}` subpaths.
