---
'@mission-platform/components': patch
---

fix(base-scheduler): compute accessible text colour using WCAG contrast ratio

Add colour-contrast utilities (hexToRgb, relativeLuminance, contrastRatio,
alphaBlend, accessibleTextColor) to BaseSchedulerEvent and BaseSchedulerMonthView
so that event-pill text automatically switches between dark (#1a1a1a) and light
(#ffffff) depending on the effective background colour, satisfying WCAG AAA
contrast requirements even when semi-transparent event colours are used.

Replace element-level opacity on cancelled/tentative events with alpha-blending
in JS so text contrast is always preserved. Add a slot button to
BaseSchedulerTimeGrid for click-to-create interactions.
