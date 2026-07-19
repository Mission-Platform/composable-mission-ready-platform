---
'@mission-platform/components': minor
---

Make the write-once `BaseSelect` (`Components/Forms`) searchable and use it for
the `BasePhoneInput` country picker. By default the select trigger is now a text
field that filters the options as the user types — mirroring `BaseMultiselect` —
with a search-aware empty state (`No results for "…"`) and keyboard navigation
over the filtered set; a new `searchable` prop (default `true`) restores the
plain button trigger when set to `false`. The visually hidden native `<select>`,
`modelValue`/`onUpdateModelValue`/`onChange` contract, and styling are unchanged.
`BasePhoneInput` now renders its country dropdown through this searchable
`BaseSelect` (flag + name + dial code) instead of a raw native `<select>`, so a
region can be found by searching. Adds `Searchable`/`NonSearchable` stories and
cross-framework specs for the new behaviour.
