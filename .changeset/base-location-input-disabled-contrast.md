---
'@mission-platform/components': patch
---

fix(components): keep BaseLocationInput legend readable when disabled

`BaseLocationInput`'s disabled state dimmed the whole `<fieldset>` with `opacity: 0.5`, which blended the legend label's primary text colour down to `#7c7c80` on the light surface (3.67:1, failing WCAG 2.1 SC 1.4.3). The disabled state now mirrors `BaseRadioGroup` — it uses `pointer-events: none` with the accessible `--mp-color-text-disabled` token (7.41:1) instead of opacity, so the legend label keeps its full-contrast primary colour while the control still reads as disabled.
