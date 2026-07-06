---
'@mission-platform/components': minor
---

Migrate the `Components/Navigation` group to write-once neutral JSX, compiling
straight to both React and Vue: `BasePagination`, `BaseSegmentControl`,
`BaseBreadcrumb`, `BaseMenuItem`, `BaseTabs`, `BaseVirtualTabs`, `BaseMenu`,
`BaseMenubar`, and `BaseNavbarItem`. Each ships its per-folder
`.tsx`/`.module.scss`/`.stories.tsx`/cross-framework `.spec.ts`/`index.ts` with
`JSX Components/Navigation/<Name>` stories. Vue-only features the neutral dialect
does not model are substituted with documented equivalents: `v-model`/emits →
controlled `modelValue` + callback props, `vue-router` `RouterLink` → `<a href>`,
`@mission-platform/icons` → text glyphs, the multi-file tab/menu sub-component
trees inlined, the `BaseDropdown` overlay → an inline absolutely-positioned
dropdown, and the menu/menubar/navbar-item open state via `useState` + `useEffect`
document listeners.
