---
'@mission-platform/components': minor
---

migrate the remaining `Components/Data` components to write-once JSX

Adds the last two `Components/Data` components, authored once in the neutral
`@mission-platform/jsx` dialect and compiled straight to both React and Vue by
`@mission-platform/vite-plugin-jsx`. This completes the `Components/Data` group.

- `BaseVirtualTable` — a virtual-scrolling, sortable data table that windows the
  body rows beneath a sticky header, with click-to-sort columns (asc → desc →
  unsorted, firing `onSort`), `onRowClick`, an empty state, and a `footer` named
  slot. Like the original it uses ARIA `role="table"` divs (not native
  `<table>`) for cross-browser scroll behaviour; sort/scroll state uses the
  neutral hooks. The per-column scoped `cell-<key>` slots are replaced by each
  column's optional `render` formatter (consistent with the migrated
  `BaseTable`), the icons-package sort glyph becomes `▲`/`▼`/`↕`, and the
  `sort`/`rowClick` emits become `onSort`/`onRowClick` callback props.
- `BaseTreeView` — a recursive, accessible tree that renders every visible node
  with a built-in expand/collapse label (overridable via the scoped `label`
  slot, scope `{ node, depth }`), keyboard navigation, and `onSelect`/`onToggle`
  callbacks. It flattens the expanded tree into a single list (the neutral
  dialect models no recursive components), substitutes a `▸`/`▾` glyph for the
  icons chevron, and uses callback props for the SFC's `select`/`toggle` emits.

Each ships its per-component folder (`.tsx`/`.module.scss`/`.stories.tsx`/
`.spec.ts`/`index.ts`), categorised `JSX Components/Data/<Name>` stories, and
cross-framework SSR parity specs.
