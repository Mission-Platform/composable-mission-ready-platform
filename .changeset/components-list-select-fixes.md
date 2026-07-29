---
'@mission-platform/components': patch
---

fix list item keys and native select value binding

`BaseList` now assigns a stable `key` to every rendered term/detail/item node, and `BaseSelect` binds the native `<select>` to its model value (and keys the placeholder option) instead of setting per-option `selected` attributes.
