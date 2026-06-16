---
'@mission-platform/tokens': minor
---

use rem instead of px for the radius, shadow and border-width token scales

The `radius.*`, `shadow.*` and `border-width.*` DTCG token values are now expressed
in **rem** (relative to the `14px` root font-size) instead of absolute px, so these
dimensions scale with the user's font size — matching the `spacing.*` and `size.*`
scales, which were already rem. The emitted values are visually equivalent (e.g.
`--mp-radius-md` is now `0.429rem` ≈ the previous `6px`, `--mp-border-width-thin` is
`0.071rem` ≈ `1px`, and the `--mp-shadow-*` offsets/blur/spread now match the existing
rem `--mp-size-shadow-*` mirror).

`breakpoint.*` intentionally stays in absolute px (a rem in a media query is relative
to the browser root, not `:root`), and `radius.full` keeps its `9999px` pill sentinel.
