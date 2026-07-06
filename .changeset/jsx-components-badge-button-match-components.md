---
'@mission-platform/components': minor
---

match the write-once `BaseBadge` and `BaseButton` styling to their `@mission-platform/components` sources: both now expose the same nine tone `variant`s and the canonical `2xs … 2xl` `size` scale driven by the shared design tokens. `BaseBadge` renders its label through the composed `BaseTypography` (caption, medium weight, inherited colour), and `BaseButton` gains focus-visible outlines, token-driven transitions, and a built-in accessible `loading` spinner (`loadingLabel` defaulting to `Loading…`), dropping the non-standard `ghost` variant and `badge` prop (the `ghost` button usages move to `tertiary`)
