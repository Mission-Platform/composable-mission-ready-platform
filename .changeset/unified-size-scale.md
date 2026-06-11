---
'@mission-platform/components': minor
'@mission-platform/icons': major
---

unify all component `size` props on the canonical `2xs`, `xs`, `sm`, `md`, `lg`, `xl` & `2xl` scale

Every `size`-bearing component (`BaseButton`, `BaseBadge`, `BaseTag`, `BaseSpinner`,
`BaseProgressBar`, `BaseAvatar`, `BaseSwitch`, `BaseInput`, `BaseTextarea`, `BaseSelect`,
`BaseMultiselect`, `BaseSearchInput`, `BaseDateInput`, `BaseTimeInput`, `BaseDateRangeInput`,
`BaseTimeRangeInput`, `BaseDateTimeRangeInput`, `BaseColorInput`, `BaseCalendar`, `BaseList`,
`BaseStatusIcon`, `BaseSidebar`, `BaseModal`) now accepts the full seven-step scale
`2xs | xs | sm | md | lg | xl | 2xl`, with `md` remaining the default. The component SCSS
is wired to the shared `--mp-size-*` tokens so every step is consistent across the library.
`BaseModal` additionally keeps its special `full` (near-fullscreen) value. The change is
additive for existing values (`sm`/`md`/`lg`/`xs`/`xl`/`full` still work), though the rendered
metrics of some steps are refined to match the token scale.

`@mission-platform/icons` `useIconSize` (and every icon's numeric `size` prop) now emits the
value in `rem` instead of `px`.

BREAKING CHANGE: a numeric icon `size` is now interpreted as pixels and converted to `rem`
(e.g. `size={32}` → `2rem` instead of `32px`, assuming a 16px root). Pass a named token
(`md`, `lg`, …) or an explicit unit string if you need different behaviour.
