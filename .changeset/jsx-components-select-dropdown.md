---
'@mission-platform/components': minor
---

render BaseSelect and BaseMultiselect through the write-once BaseDropdown

`BaseSelect` and `BaseMultiselect` now render their floating listbox through the
write-once `BaseDropdown` (a `<Teleport>` panel anchored with CSS Anchor
Positioning) instead of an in-place, absolutely-positioned list. The combobox is
passed to the dropdown's `trigger` slot and the `<ul role="listbox">` becomes
its default slot, with the open state synced via `onUpdateOpen`. Because the
dropdown panel is mounted only while open, the listbox markup (`role="listbox"`)
is present only when the control is open; the option labels remain available in
the always-rendered hidden native `<select>`.
