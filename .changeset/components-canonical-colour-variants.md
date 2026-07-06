---
'@mission-platform/components': major
---

Give every display, feedback, and typography component the same canonical colour
set — `neutral`, `primary`, `secondary`, `tertiary`, `success`, `warning`,
`info`, `error`, and `critical` (plus a transparent `ghost` for the button-like
components).

- **Breaking:** the components that already shipped the set (`BaseBadge`,
  `BaseButton`, `BaseTag`, `BaseProgressBar`, `BaseSpinner`) renamed their
  `default` variant to `neutral` and `information` to `info`. `BaseIconButton`'s
  `danger` variant is renamed to `error`.
- **Buttons:** `BaseButton` and `BaseIconButton` gain a transparent, borderless
  `ghost` variant; `BaseIconButton` now exposes the full canonical set.
- **Feedback:** `BaseAlertBanner`, `BaseStatusIcon`, and `BaseToast` (and the
  `useToast` store) extend their intent/colour axis to the full canonical set;
  `BaseSkeleton` gains a `variant` colour.
- **Display:** `BaseCard`, `BaseAccordion`, `BaseCollapse`, `BaseAvatar`,
  `BaseButtonGroup`, `BaseCarousel`, `BaseCodeBlock`, and `BaseTable` gain a
  `variant` colour prop; `BaseList` and `BaseQuote` gain a `tone` colour prop
  (their existing `variant` is the structural style).
- **Typography:** `BaseTypography`'s `color` prop accepts the canonical semantic
  tones (`neutral`/`success`/`warning`/`info`/`error`/`critical`) alongside the
  existing text tokens.

For surface components the `neutral` tone keeps the plain/default appearance and
the coloured tones tint the surface, borders, dividers, or accents via the
matching `--mp-color-<family>-*` design tokens.
