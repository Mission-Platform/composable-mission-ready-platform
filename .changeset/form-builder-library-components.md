---
'@mission-platform/components': patch
---

reuse the components and icons library across the form builder

- the form builder's inspector now uses `BaseTabs` for the Properties / Steps / Preview / Schema tabs instead of a bespoke `<nav>` of `<button>`s
- every action control (move up/down, duplicate, remove, add field/option/rule/step, add field to group) now renders a `BaseButton` with the matching `@mission-platform/icons` icon (`IconChevron`, `IconCopy`, `IconMove`, `IconTrash`, `IconPlus`) instead of raw `<button>`s and unicode glyphs
- `BaseTabs` now reacts to external `v-model` (`modelValue`) changes so it can be driven as a controlled input
- fix: `BaseTabs` now shows only the active tab's panel — inactive `BaseTabPanel`s are hidden with `v-show` (an inline `display: none` that reliably beats the scoped `.base-tabs__panel { display: flex }` rule), in addition to keeping the `[hidden]` attribute for accessibility
