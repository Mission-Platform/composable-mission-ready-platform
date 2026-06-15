---
'@mission-platform/components': patch
---

adopt the BaseStack layout primitive across existing components

Refactor `BaseFieldSet`, `BaseRadioGroup`, `BaseCheckbox`, `BaseSwitch`,
`BaseProgressBar`, and `BaseNumberStepper` to compose their internal
vertical/horizontal layouts with `BaseStack` (using the shared `2xs`–`2xl`
gap scale) instead of bespoke flexbox CSS. Public APIs, markup classes, and
behaviour are unchanged.
