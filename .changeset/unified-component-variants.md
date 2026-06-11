---
'@mission-platform/components': major
'@mission-platform/tokens': minor
---

unify component variants on `primary`, `secondary`, `tertiary`, `default`, `success`, `warning`, `information`, `error` & `critical`

All semantic-color components (`BaseButton`, `BaseBadge`, `BaseTag`, `BaseSpinner`,
`BaseProgressBar`, `BaseMenuItem`, `BaseNavbarItem`) now share one canonical
`variant` set. **Breaking:** the old per-component values were renamed —
`danger` → `error`, `info` → `information`, `neutral` → `default`, and the button's
`ghost` → `tertiary`. `default` keeps the neutral treatment, `tertiary` keeps the
ghost/transparent treatment, and `information` keeps the info treatment.

`@mission-platform/tokens` adds the backing semantic CSS-variable families
(`secondary`, `tertiary`, `default`, `information`, `critical`) for both the light
and dark themes, plus a new `critical` primitive colour scale.
