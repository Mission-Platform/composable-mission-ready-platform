---
"@mission-platform/vite-plugin-tokens": minor
---

add vite plugin that generates the design-token code at build time

Introduces the `@mission-platform/vite-plugin-tokens` workspace, whose
`tokensPlugin` runs a self-contained custom generator during `vite build` (and
on dev-server start) — no external CLI is involved. Each non-theme `*.tokens.json`
DTCG source yields a matching self-contained `generated/scss/_<file>.scss` partial
(its `$`-variables, `--mp-*` custom properties that interpolate the matching local
`$`-variable, and `@property` registrations) — the colour palette and the
flattened composite typography are emitted through this same structural path. The
two theme sources are merged into one `generated/scss/_theme.scss` that emits
`:root { color-scheme: light dark; --mp-color-*: light-dark(<light>, <dark>) }`
with each value referencing a palette `var(--mp-color-*)`. Every source also
yields a nested `as const` `generated/ts/<file>.ts` module (colours emitted as
`oklab(...)` strings, aliases resolved). The aggregate `generated/_tokens.scss`
(SCSS `@forward` barrel, including the theme) and `generated/tokens.ts`
(TypeScript re-export barrel) are emitted alongside them. The generator is split
into focused modules (`dtcg.ts`, `generators/scss.ts`, `generators/typescript.ts`).
`@property` registrations use a typed `syntax` (with a local-`$var`
`initial-value`) for the literal `color`/`dimension`/`number`/`fontWeight`/`duration`
tokens and fall back to the universal `*` syntax (no `initial-value`) for
`var()`-referencing tokens (typography) and non-typeable literals (shadows, easing
curves, font-family stacks). The structural partials wrap both their `:root`
custom properties and their `@property` registrations in the `@layer mp.tokens`
cascade layer (the theme partial's `:root` is layered too), and each non-theme
source additionally emits a CSS-free `generated/scss/_<file>-vars.scss` (the
`$`-variables only) so internal SCSS can read a token's compile-time value without
pulling in its `:root`/`@property` CSS.
