---
'@mission-platform/components': patch
---

fix list item keys and native select value binding

`ForgeList` now assigns a stable `key` to every rendered term/detail/item node, and `ForgeSelect` binds the native `<select>` to its model value (and keys the placeholder option) instead of setting per-option `selected` attributes.
