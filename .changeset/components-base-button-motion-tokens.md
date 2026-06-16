---
'@mission-platform/components': patch
---

use the new motion, opacity and border-width tokens in base-button

`BaseButton` now composes the new `--mp-duration-*`/`--mp-easing-*`, `--mp-opacity-disabled` and `--mp-border-width-*` design tokens instead of the inline `150ms ease`, `opacity: 0.5` and `1px`/`2px` literals. The rendered output is unchanged (the tokens resolve to the same values); this is the first showcase consumer of the new token groups.
