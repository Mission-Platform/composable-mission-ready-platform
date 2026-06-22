---
'@mission-platform/tokens': minor
---

add the shared `size` and `a11y` SCSS partials

`@mission-platform/tokens` is now the canonical home of two shared stylesheets
previously copied into the component packages: `./scss/size`
(`src/scss/_size.scss` — the `base-size--<step>` `font-size` modifier classes
over the `--mp-size-font-*` scale, in `@layer mp.components`) and `./scss/a11y`
(`src/scss/_a11y.scss` — the global `prefers-reduced-motion` reset). The
write-once packages now `@use` these partials from their thin `size.module.scss`
/ `./styles` entries instead of duplicating the rules.
