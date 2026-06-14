---
'@mission-platform/components': minor
---

back BaseSelect and BaseMultiselect with a hidden native select for autofill

`BaseSelect` and `BaseMultiselect` now render a visually-hidden native `<select>` (a `<select multiple>` for `BaseMultiselect`) that mirrors the current value, so browsers and password/profile managers can autofill the control and submit its value in a native `<form>`. Both components gain `name` and `autocomplete` props that are forwarded to the hidden native select, and selections made via autofill update `v-model` just like choosing an option in the custom UI.
