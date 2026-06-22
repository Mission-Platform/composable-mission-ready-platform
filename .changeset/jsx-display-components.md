---
'@mission-platform/components': minor
'@mission-platform/vite-plugin-jsx': minor
---

migrate the Components/Display components to write-once JSX and fix two compiler prop/name collisions

`@mission-platform/components` gains nine cross-framework `Components/Display`
components, authored once in the neutral JSX dialect and compiled straight to
both React and Vue:

- **Self-contained:** `BaseAvatar` (inline-styled image/initials/slot + presence
  dot), `BaseButtonGroup` (segmented `attached` group), `BaseIconButton`
  (icon-only button with required `label`).
- **Composing `BaseTypography`:** `BaseTag` (toned, removable), `BaseQuote`
  (blockquote + attribution), `BaseList` (ul/ol/dl from `items`), `BaseCard`
  (header/body/footer surface), `BaseTable` (sortable, hooks-driven), and
  `BaseCollapse` (native `<details>` disclosure).

Each ships its per-component folder (`.tsx`/`.module.scss`/`.stories.tsx`/
`.spec.ts`/`index.ts`), categorised `JSX Components/Display/<Name>` stories, and
cross-framework SSR specs. Vue-only features the neutral dialect cannot model
(icons, scoped slots, provide/inject, transitions) are substituted with
documented equivalents; `BaseAccordion`, `BaseCarousel`, and `BaseThemeToggle`
remain Vue-only in `@mission-platform/components`.

`@mission-platform/vite-plugin-jsx`'s Vue emitter no longer rewrites JSX
**attribute names** or **element tag names** when they collide with a
destructured prop. Previously a `src` prop turned `src={src}` into the invalid
`properties.src={properties.src}`, and a `caption` prop turned a `<caption>`
element into the invalid dynamic `createVNode(properties.caption, …)`; both now
keep the literal name and rewrite only the value. Regression tests cover both.
