---
"@mission-platform/components": minor
---

Give **every** component the canonical `2xs … 2xl` size scale via a uniform
`size` prop (`'2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'`), defaulting to
`'md'`.

- **New shared utility:** `src/components/size.module.scss` exposes
  `base-size--<step>` classes that set `font-size` to the matching
  `--mp-size-font-*` design token. Components without bespoke per-size styling now
  apply this class on their root so their text (and any `em`-relative box) scales
  with the requested size.
- **Widened existing scales:** the components that previously only offered a
  partial scale now cover the full `2xs … 2xl` range — `BaseIconButton`,
  `BaseHero`, `BaseMarkdownInput`, `BaseOtpInput`, `BasePagination`, `BaseQuote`,
  `BaseRangeInput`, `BaseRating`, `BaseSegmentControl`, and `BaseSlider` (each
  was `sm | md | lg`), plus `BaseFileInput` (previously a single `md`), which
  gains a working `size` prop.
- **New `size` prop** added to every component that previously had none (layout,
  navigation, overlay, feedback, data, media, form, and theme components).
- **Exceptions:** `BaseTypography`'s `size` is opt-in — left unset by default so
  the chosen `variant` keeps driving its font-size, only overriding it when
  explicitly set — and `BaseModal` keeps its extra non-canonical `'full'` value
  alongside the `2xs … 2xl` range.

All changes are additive (the new prop defaults to `'md'`) and the widened size
unions are supersets of the previous ones, so existing usages are unaffected.
