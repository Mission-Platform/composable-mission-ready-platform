---
'@mission-platform/components': patch
---

match the `BaseMasonry` layout styles to the `@mission-platform/components` original

`BaseMasonry` now owns its `.base-masonry` rules in the co-located CSS Module —
the container box (`width` / `min-width`) and, crucially, the per-child
break-safety (`break-inside: avoid; margin-bottom: var(--mp-masonry-gap)`)
equivalent to the Vue component's `:slotted(*)` rule — while keeping the dynamic
multi-column properties inline. Default-slot children are now kept break-safe out
of the box on both the `./react` and `./vue` subpaths, exactly matching the
original component instead of relying on consumers to add their own class.
